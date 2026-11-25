using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ArenaVoicePocBackend.Configuration;
using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ArenaVoicePocBackend.Services;

public sealed class AuthService : IAuthService
{
    private readonly AuthOptions _options;
    private readonly IDbContextFactory<ArenaDbContext>? _dbFactory;
    private readonly IAuditEventPublisher _auditPublisher;
    private readonly ILogger<AuthService> _logger;
    private readonly byte[] _jwtKeyBytes;

    // Fallback para modo ARENA_STORAGE=memory
    private readonly ConcurrentDictionary<string, User> _memoryUsers = new(StringComparer.OrdinalIgnoreCase);

    // Rate-limiting por chave (IP + email) para proteção contra força bruta
    private sealed record FailedAttemptInfo(int Count, DateTimeOffset WindowStart, DateTimeOffset? LockedUntil);
    private readonly ConcurrentDictionary<string, FailedAttemptInfo> _failedAttempts = new();

    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(5);

    public AuthService(
        IOptions<AuthOptions> options,
        IAuditEventPublisher auditPublisher,
        ILogger<AuthService> logger,
        IDbContextFactory<ArenaDbContext>? dbFactory = null)
    {
        _options = options.Value;
        _auditPublisher = auditPublisher;
        _logger = logger;
        _dbFactory = dbFactory;

        var resolvedSecret = ResolveJwtSecret(_options);
        _jwtKeyBytes = Encoding.UTF8.GetBytes(resolvedSecret);
    }

    public const string LocalDevFallbackJwtSecret = "ArenaVoice-LocalDev-Fallback-JWT-Secret-Key-2026-MustBeAtLeast32Bytes!";

    public static bool IsUsingFallbackJwtSecret(AuthOptions options)
    {
        var secret = Environment.GetEnvironmentVariable("JWT_SECRET")
                  ?? Environment.GetEnvironmentVariable("ArenaAuth__JwtSecret")
                  ?? options.JwtSecret;

        return string.IsNullOrWhiteSpace(secret) || secret.Length < 32 || secret == LocalDevFallbackJwtSecret;
    }

    public static string ResolveJwtSecret(AuthOptions options)
    {
        var secret = Environment.GetEnvironmentVariable("JWT_SECRET")
                  ?? Environment.GetEnvironmentVariable("ArenaAuth__JwtSecret")
                  ?? options.JwtSecret;

        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
        {
            // Fallback determinístico exclusivo para ambiente local de desenvolvimento
            secret = LocalDevFallbackJwtSecret;
        }

        return secret;
    }

    public bool IsDeviceKeyRequired()
    {
        var key = ResolveDeviceApiKey();
        return _options.RequireDeviceKey || !string.IsNullOrWhiteSpace(key);
    }

    public bool ValidateDeviceKey(string? providedKey)
    {
        var expected = ResolveDeviceApiKey();
        if (string.IsNullOrWhiteSpace(expected))
        {
            return !_options.RequireDeviceKey;
        }

        if (string.IsNullOrWhiteSpace(providedKey))
        {
            return false;
        }

        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var providedBytes = Encoding.UTF8.GetBytes(providedKey.Trim());
        return expectedBytes.Length == providedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
    }

    private string ResolveDeviceApiKey()
    {
        return Environment.GetEnvironmentVariable("ARENA_DEVICE_API_KEY")
            ?? Environment.GetEnvironmentVariable("ArenaAuth__DeviceApiKey")
            ?? _options.DeviceApiKey;
    }

    public async Task EnsureSeedUsersAsync(CancellationToken cancellationToken = default)
    {
        var adminEmail = (Environment.GetEnvironmentVariable("ARENA_ADMIN_EMAIL") ?? _options.SeedAdminEmail).Trim().ToLowerInvariant();
        var adminPass = Environment.GetEnvironmentVariable("ARENA_ADMIN_PASSWORD") ?? _options.SeedAdminPassword;
        var adminName = Environment.GetEnvironmentVariable("ARENA_ADMIN_NAME") ?? _options.SeedAdminName;

        var seedList = new List<(string Id, string Name, string Email, string Password, UserRole Role)>
        {
            ("usr-admin-01", adminName, adminEmail, adminPass, UserRole.Admin),
            ("usr-operator-01", "Operador Mesa Técnica", "operator@arenavoice.local", Environment.GetEnvironmentVariable("ARENA_OPERATOR_PASSWORD") ?? "ArenaOperator@2026", UserRole.Operator),
            ("usr-viewer-01", "Visualizador Palco", "viewer@arenavoice.local", Environment.GetEnvironmentVariable("ARENA_VIEWER_PASSWORD") ?? "ArenaViewer@2026", UserRole.Viewer)
        };

        if (_dbFactory == null)
        {
            foreach (var item in seedList)
            {
                _memoryUsers.TryAdd(item.Email, new User
                {
                    Id = item.Id,
                    Name = item.Name,
                    Email = item.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(item.Password, workFactor: 11),
                    Role = item.Role,
                    IsActive = true
                });
            }
            _logger.LogInformation("ℹ️ AuthService: Seed de usuários inicializado em memória ({Count} perfis).", _memoryUsers.Count);
            return;
        }

        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var added = 0;

        foreach (var item in seedList)
        {
            var exists = await db.Users.AnyAsync(u => u.Email == item.Email, cancellationToken);
            if (!exists)
            {
                db.Users.Add(new User
                {
                    Id = item.Id,
                    Name = item.Name,
                    Email = item.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(item.Password, workFactor: 11),
                    Role = item.Role,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
                added++;
            }
        }

        if (added > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("✅ AuthService: {Count} usuário(s) iniciais semeados no PostgreSQL.", added);
        }
    }

    public async Task<AuthOperationResult> AuthenticateAsync(string email, string password, string? sourceIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return new AuthOperationResult(false, IsUnauthorized: true, ErrorMessage: "E-mail e senha são obrigatórios.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var rateKey = $"{sourceIp ?? "unknown"}:{normalizedEmail}";

        if (IsLockedOut(rateKey, out var retryAfterSeconds))
        {
            _auditPublisher.TryPublish(new AuditEventRecord(
                EventType: "USER_LOGIN_FAILED",
                AggregateType: "User",
                AggregateId: normalizedEmail,
                ActorType: ActorType.System,
                ActorName: normalizedEmail,
                Success: false,
                ErrorMessage: "Bloqueio temporário por excesso de tentativas.",
                SourceIp: sourceIp,
                Payload: new { reason = "RATE_LIMITED", retryAfterSeconds }
            ));

            return new AuthOperationResult(
                false,
                IsRateLimited: true,
                ErrorMessage: $"Muitas tentativas inválidas. Aguarde {Math.Max(1, retryAfterSeconds / 60)} minuto(s) e tente novamente."
            );
        }

        User? user;
        if (_dbFactory == null)
        {
            _memoryUsers.TryGetValue(normalizedEmail, out user);
        }
        else
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);
        }

        if (user == null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            RegisterFailure(rateKey);
            _auditPublisher.TryPublish(new AuditEventRecord(
                EventType: "USER_LOGIN_FAILED",
                AggregateType: "User",
                AggregateId: user?.Id ?? normalizedEmail,
                ActorType: ActorType.Operator,
                ActorId: user?.Id,
                ActorName: normalizedEmail,
                Success: false,
                ErrorMessage: user == null || !user.IsActive ? "Usuário inexistente ou inativo." : "Senha incorreta.",
                SourceIp: sourceIp
            ));

            return new AuthOperationResult(false, IsUnauthorized: true, ErrorMessage: "Credenciais inválidas.");
        }

        ClearFailures(rateKey);
        var response = await IssueTokensAsync(user, cancellationToken);

        _auditPublisher.TryPublish(new AuditEventRecord(
            EventType: "USER_LOGIN",
            AggregateType: "User",
            AggregateId: user.Id,
            ActorType: ActorType.Operator,
            ActorId: user.Id,
            ActorName: user.Name,
            Success: true,
            SourceIp: sourceIp,
            Payload: new { email = user.Email, role = user.Role.ToString() }
        ));

        return new AuthOperationResult(true, Data: response);
    }

    public async Task<AuthOperationResult> RefreshAsync(string refreshToken, string? sourceIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return new AuthOperationResult(false, IsUnauthorized: true, ErrorMessage: "Refresh token ausente.");
        }

        var tokenHash = ComputeSha256(refreshToken.Trim());
        var now = DateTimeOffset.UtcNow;

        User? user;
        if (_dbFactory == null)
        {
            user = _memoryUsers.Values.FirstOrDefault(u =>
                u.IsActive &&
                u.RefreshTokenHash == tokenHash &&
                u.RefreshTokenExpiresAt.HasValue &&
                u.RefreshTokenExpiresAt.Value > now);
        }
        else
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            user = await db.Users.FirstOrDefaultAsync(u =>
                u.IsActive &&
                u.RefreshTokenHash == tokenHash &&
                u.RefreshTokenExpiresAt != null &&
                u.RefreshTokenExpiresAt > now, cancellationToken);
        }

        if (user == null)
        {
            return new AuthOperationResult(false, IsUnauthorized: true, ErrorMessage: "Sessão expirada ou refresh token inválido.");
        }

        var response = await IssueTokensAsync(user, cancellationToken);

        _auditPublisher.TryPublish(new AuditEventRecord(
            EventType: "TOKEN_REFRESHED",
            AggregateType: "User",
            AggregateId: user.Id,
            ActorType: ActorType.Operator,
            ActorId: user.Id,
            ActorName: user.Name,
            Success: true,
            SourceIp: sourceIp
        ));

        return new AuthOperationResult(true, Data: response);
    }

    public async Task LogoutAsync(string userId, string? sourceIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;

        string? userName = null;
        if (_dbFactory == null)
        {
            var user = _memoryUsers.Values.FirstOrDefault(u => u.Id == userId);
            if (user != null)
            {
                user.RefreshTokenHash = null;
                user.RefreshTokenExpiresAt = null;
                user.UpdatedAt = DateTimeOffset.UtcNow;
                userName = user.Name;
            }
        }
        else
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            if (user != null)
            {
                user.RefreshTokenHash = null;
                user.RefreshTokenExpiresAt = null;
                user.UpdatedAt = DateTimeOffset.UtcNow;
                userName = user.Name;
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        _auditPublisher.TryPublish(new AuditEventRecord(
            EventType: "USER_LOGOUT",
            AggregateType: "User",
            AggregateId: userId,
            ActorType: ActorType.Operator,
            ActorId: userId,
            ActorName: userName ?? userId,
            Success: true,
            SourceIp: sourceIp
        ));
    }

    public async Task<UserProfileDto?> GetProfileAsync(string userId, CancellationToken cancellationToken = default)
    {
        User? user;
        if (_dbFactory == null)
        {
            user = _memoryUsers.Values.FirstOrDefault(u => u.Id == userId && u.IsActive);
        }
        else
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, cancellationToken);
        }

        return user == null ? null : MapProfile(user);
    }

    public void RecordUnauthorizedAttempt(string path, string method, string? sourceIp, string? actorId = null, string? reason = null)
    {
        _auditPublisher.TryPublish(new AuditEventRecord(
            EventType: "UNAUTHORIZED_ACCESS_ATTEMPT",
            AggregateType: "Security",
            AggregateId: path,
            ActorType: ActorType.System,
            ActorId: actorId,
            ActorName: actorId ?? "Anonymous",
            Success: false,
            ErrorMessage: reason ?? "Acesso negado pela política de autorização.",
            SourceIp: sourceIp,
            Payload: new { method, path }
        ));
    }

    private async Task<AuthResponseDto> IssueTokensAsync(User user, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(Math.Max(15, _options.AccessTokenExpirationMinutes));
        var refreshRaw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var refreshHash = ComputeSha256(refreshRaw);
        var refreshExpiresAt = now.AddDays(Math.Max(1, _options.RefreshTokenExpirationDays));

        if (_dbFactory == null)
        {
            user.RefreshTokenHash = refreshHash;
            user.RefreshTokenExpiresAt = refreshExpiresAt;
            user.LastLoginAt = now;
            user.UpdatedAt = now;
        }
        else
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            var tracked = await db.Users.FirstAsync(u => u.Id == user.Id, cancellationToken);
            tracked.RefreshTokenHash = refreshHash;
            tracked.RefreshTokenExpiresAt = refreshExpiresAt;
            tracked.LastLoginAt = now;
            tracked.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            user = tracked;
        }

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("role", user.Role.ToString())
        };

        var creds = new SigningCredentials(new SymmetricSecurityKey(_jwtKeyBytes), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: creds
        );

        var jwt = new JwtSecurityTokenHandler().WriteToken(token);
        return new AuthResponseDto(jwt, refreshRaw, expiresAt, MapProfile(user));
    }

    private bool IsLockedOut(string key, out int retryAfterSeconds)
    {
        retryAfterSeconds = 0;
        if (!_failedAttempts.TryGetValue(key, out var info)) return false;

        var now = DateTimeOffset.UtcNow;
        if (info.LockedUntil.HasValue)
        {
            if (info.LockedUntil.Value > now)
            {
                retryAfterSeconds = (int)Math.Ceiling((info.LockedUntil.Value - now).TotalSeconds);
                return true;
            }
            _failedAttempts.TryRemove(key, out _);
            return false;
        }

        if (now - info.WindowStart > FailureWindow)
        {
            _failedAttempts.TryRemove(key, out _);
        }

        return false;
    }

    private void RegisterFailure(string key)
    {
        var now = DateTimeOffset.UtcNow;
        _failedAttempts.AddOrUpdate(
            key,
            _ => new FailedAttemptInfo(1, now, null),
            (_, existing) =>
            {
                if (now - existing.WindowStart > FailureWindow)
                {
                    return new FailedAttemptInfo(1, now, null);
                }
                var nextCount = existing.Count + 1;
                DateTimeOffset? lockedUntil = nextCount >= MaxFailedAttempts ? now.Add(LockoutDuration) : null;
                return new FailedAttemptInfo(nextCount, existing.WindowStart, lockedUntil);
            });
    }

    private void ClearFailures(string key) => _failedAttempts.TryRemove(key, out _);

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static UserProfileDto MapProfile(User u) =>
        new(u.Id, u.Name, u.Email, u.Role.ToString(), u.IsActive, u.LastLoginAt);
}
