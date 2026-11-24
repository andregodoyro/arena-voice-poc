using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ArenaVoicePocBackend.Services;

/// <summary>
/// Serviço de gerenciamento administrativo de usuários (Milestone 5I.1).
/// Responsável por todas as operações CRUD restritas ao painel Admin.
/// Registra auditoria de todas as operações críticas sem expor credenciais nos logs.
/// </summary>
public sealed class AdminUserService : IAdminUserService
{
    private readonly IDbContextFactory<ArenaDbContext>? _dbFactory;
    private readonly IAuditEventPublisher _audit;
    private readonly ILogger<AdminUserService> _logger;

    private const int MinPasswordLength = 8;

    public AdminUserService(
        IAuditEventPublisher audit,
        ILogger<AdminUserService> logger,
        IDbContextFactory<ArenaDbContext>? dbFactory = null)
    {
        _audit = audit;
        _logger = logger;
        _dbFactory = dbFactory;
    }

    public async Task<IReadOnlyList<AdminUserDto>> GetAllUsersAsync(CancellationToken ct = default)
    {
        if (_dbFactory == null)
            return [];

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var users = await db.Users
            .AsNoTracking()
            .OrderBy(u => u.CreatedAt)
            .ToListAsync(ct);

        return users.Select(MapDto).ToList();
    }

    public async Task<AdminUserDto?> GetUserByIdAsync(string userId, CancellationToken ct = default)
    {
        if (_dbFactory == null)
            return null;

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        return user == null ? null : MapDto(user);
    }

    public async Task<AdminUserOperationResult> CreateUserAsync(
        CreateUserDto dto, string actorId, string actorName, CancellationToken ct = default)
    {
        var (valid, validError) = ValidateCreateDto(dto);
        if (!valid)
            return new AdminUserOperationResult(false, ErrorMessage: validError);

        if (_dbFactory == null)
            return new AdminUserOperationResult(false, ErrorMessage: "Operação disponível apenas no modo PostgreSQL.");

        await using var db = await _dbFactory.CreateDbContextAsync(ct);

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var exists = await db.Users.AnyAsync(u => u.Email == normalizedEmail, ct);
        if (exists)
        {
            return new AdminUserOperationResult(false, Conflict: true,
                ErrorMessage: $"Já existe um usuário com o e-mail '{normalizedEmail}'.");
        }

        if (!Enum.TryParse<UserRole>(dto.Role, ignoreCase: true, out var role))
        {
            return new AdminUserOperationResult(false,
                ErrorMessage: $"Role inválida: '{dto.Role}'. Válidos: Admin, Operator, Viewer.");
        }

        var newUser = new User
        {
            Id = $"usr-{Guid.NewGuid():N}"[..20],
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 11),
            Role = role,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        db.Users.Add(newUser);
        await db.SaveChangesAsync(ct);

        _audit.TryPublish(new AuditEventRecord(
            EventType: "ADMIN_USER_CREATED",
            AggregateType: "User",
            AggregateId: newUser.Id,
            ActorType: ActorType.Operator,
            ActorId: actorId,
            ActorName: actorName,
            Success: true,
            Payload: new { email = newUser.Email, role = newUser.Role.ToString() }
        ));

        _logger.LogInformation("Admin {ActorName} criou usuário {Email} com role {Role}.",
            actorName, newUser.Email, newUser.Role);

        return new AdminUserOperationResult(true, User: MapDto(newUser));
    }

    public async Task<AdminUserOperationResult> UpdateUserAsync(
        string userId, UpdateUserDto dto, string actorId, string actorName, CancellationToken ct = default)
    {
        if (_dbFactory == null)
            return new AdminUserOperationResult(false, ErrorMessage: "Operação disponível apenas no modo PostgreSQL.");

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return new AdminUserOperationResult(false, NotFound: true, ErrorMessage: "Usuário não encontrado.");

        var changes = new List<string>();

        if (!string.IsNullOrWhiteSpace(dto.Name) && dto.Name.Trim() != user.Name)
        {
            if (dto.Name.Trim().Length < 2 || dto.Name.Trim().Length > 150)
                return new AdminUserOperationResult(false, ErrorMessage: "O nome deve ter entre 2 e 150 caracteres.");
            user.Name = dto.Name.Trim();
            changes.Add("name");
        }

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            if (normalizedEmail != user.Email)
            {
                var conflict = await db.Users.AnyAsync(u => u.Email == normalizedEmail && u.Id != userId, ct);
                if (conflict)
                    return new AdminUserOperationResult(false, Conflict: true,
                        ErrorMessage: $"E-mail '{normalizedEmail}' já está em uso por outro usuário.");
                user.Email = normalizedEmail;
                changes.Add("email");
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            if (!Enum.TryParse<UserRole>(dto.Role, ignoreCase: true, out var newRole))
                return new AdminUserOperationResult(false, ErrorMessage: $"Role inválida: '{dto.Role}'.");
            if (newRole != user.Role)
            {
                user.Role = newRole;
                changes.Add($"role→{newRole}");
            }
        }

        if (dto.IsActive.HasValue && dto.IsActive.Value != user.IsActive)
        {
            user.IsActive = dto.IsActive.Value;
            changes.Add(user.IsActive ? "activated" : "deactivated");
        }

        if (changes.Count == 0)
            return new AdminUserOperationResult(true, User: MapDto(user));

        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        _audit.TryPublish(new AuditEventRecord(
            EventType: "ADMIN_USER_UPDATED",
            AggregateType: "User",
            AggregateId: userId,
            ActorType: ActorType.Operator,
            ActorId: actorId,
            ActorName: actorName,
            Success: true,
            Payload: new { changes }
        ));

        return new AdminUserOperationResult(true, User: MapDto(user));
    }

    public async Task<AdminUserOperationResult> ActivateUserAsync(
        string userId, string actorId, string actorName, CancellationToken ct = default)
    {
        if (_dbFactory == null)
            return new AdminUserOperationResult(false, ErrorMessage: "Operação disponível apenas no modo PostgreSQL.");

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return new AdminUserOperationResult(false, NotFound: true, ErrorMessage: "Usuário não encontrado.");

        user.IsActive = true;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        _audit.TryPublish(new AuditEventRecord(
            EventType: "ADMIN_USER_ACTIVATED",
            AggregateType: "User",
            AggregateId: userId,
            ActorType: ActorType.Operator,
            ActorId: actorId,
            ActorName: actorName,
            Success: true,
            Payload: new { email = user.Email }
        ));

        return new AdminUserOperationResult(true, User: MapDto(user));
    }

    public async Task<AdminUserOperationResult> DeactivateUserAsync(
        string userId, string actorId, string actorName, CancellationToken ct = default)
    {
        if (_dbFactory == null)
            return new AdminUserOperationResult(false, ErrorMessage: "Operação disponível apenas no modo PostgreSQL.");

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return new AdminUserOperationResult(false, NotFound: true, ErrorMessage: "Usuário não encontrado.");

        // Proteção: não permitir desativar o próprio usuário pelo painel
        if (user.Id == actorId)
            return new AdminUserOperationResult(false, Forbidden: true,
                ErrorMessage: "Não é permitido desativar a própria conta pelo painel.");

        user.IsActive = false;
        user.RefreshTokenHash = null;
        user.RefreshTokenExpiresAt = null;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        _audit.TryPublish(new AuditEventRecord(
            EventType: "ADMIN_USER_DEACTIVATED",
            AggregateType: "User",
            AggregateId: userId,
            ActorType: ActorType.Operator,
            ActorId: actorId,
            ActorName: actorName,
            Success: true,
            Payload: new { email = user.Email }
        ));

        return new AdminUserOperationResult(true, User: MapDto(user));
    }

    public async Task<AdminUserOperationResult> ResetPasswordAsync(
        string userId, string newPassword, string actorId, string actorName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < MinPasswordLength)
            return new AdminUserOperationResult(false,
                ErrorMessage: $"A nova senha deve ter no mínimo {MinPasswordLength} caracteres.");

        if (_dbFactory == null)
            return new AdminUserOperationResult(false, ErrorMessage: "Operação disponível apenas no modo PostgreSQL.");

        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return new AdminUserOperationResult(false, NotFound: true, ErrorMessage: "Usuário não encontrado.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 11);
        // Invalidar sessões ativas ao redefinir senha
        user.RefreshTokenHash = null;
        user.RefreshTokenExpiresAt = null;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        _audit.TryPublish(new AuditEventRecord(
            EventType: "ADMIN_USER_PASSWORD_RESET",
            AggregateType: "User",
            AggregateId: userId,
            ActorType: ActorType.Operator,
            ActorId: actorId,
            ActorName: actorName,
            Success: true,
            // Nunca logar senha — apenas e-mail alvo
            Payload: new { email = user.Email, sessionsInvalidated = true }
        ));

        _logger.LogInformation("Admin {ActorName} redefiniu senha de {Email}. Sessões invalidadas.",
            actorName, user.Email);

        return new AdminUserOperationResult(true, User: MapDto(user));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static AdminUserDto MapDto(User u) =>
        new(u.Id, u.Name, u.Email, u.Role.ToString(), u.IsActive, u.CreatedAt, u.UpdatedAt, u.LastLoginAt);

    private static (bool Valid, string? Error) ValidateCreateDto(CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Trim().Length < 2 || dto.Name.Trim().Length > 150)
            return (false, "O nome é obrigatório e deve ter entre 2 e 150 caracteres.");

        if (string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@'))
            return (false, "O e-mail é obrigatório e deve ser válido.");

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < MinPasswordLength)
            return (false, $"A senha deve ter no mínimo {MinPasswordLength} caracteres.");

        if (string.IsNullOrWhiteSpace(dto.Role))
            return (false, "O papel (role) é obrigatório.");

        return (true, null);
    }
}

