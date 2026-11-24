using System.Security.Claims;
using System.Text;
using ArenaVoicePocBackend.Configuration;
using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace ArenaVoicePocBackend.Services;

/// <summary>
/// Extensões modulares de Segurança, Autenticação JWT, RBAC e Autenticação de Hardware ESP32 (Milestone 5H).
/// </summary>
public static class EndpointSecurityExtensions
{
    public const string PolicyAdminOnly = "AdminOnly";
    public const string PolicyOperatorOrAdmin = "OperatorOrAdmin";
    public const string PolicyAuthenticatedAny = "AuthenticatedAny";

    public static IServiceCollection AddArenaAuthenticationAndAuthorization(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var authSection = configuration.GetSection(AuthOptions.SectionName);
        services.Configure<AuthOptions>(authSection);

        var authOptions = authSection.Get<AuthOptions>() ?? new AuthOptions();
        var jwtSecret = AuthService.ResolveJwtSecret(authOptions);
        var keyBytes = Encoding.UTF8.GetBytes(jwtSecret);

        services.AddSingleton<IAuthService, AuthService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = authOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = authOptions.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    RoleClaimType = ClaimTypes.Role
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) &&
                            (path.StartsWithSegments("/hubs/arena-poc") || path.StartsWithSegments("/arenaHub")))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    },
                    OnChallenge = context =>
                    {
                        var authService = context.HttpContext.RequestServices.GetService<IAuthService>();
                        var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString();
                        authService?.RecordUnauthorizedAttempt(
                            context.Request.Path,
                            context.Request.Method,
                            ip,
                            reason: "Token JWT ausente ou inválido (401).");
                        return Task.CompletedTask;
                    },
                    OnForbidden = context =>
                    {
                        var authService = context.HttpContext.RequestServices.GetService<IAuthService>();
                        var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString();
                        var actorId = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        authService?.RecordUnauthorizedAttempt(
                            context.Request.Path,
                            context.Request.Method,
                            ip,
                            actorId: actorId,
                            reason: "Perfil sem permissão suficiente (403).");
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicyAdminOnly, policy =>
                policy.RequireAuthenticatedUser().RequireRole(nameof(UserRole.Admin)));

            options.AddPolicy(PolicyOperatorOrAdmin, policy =>
                policy.RequireAuthenticatedUser().RequireRole(nameof(UserRole.Admin), nameof(UserRole.Operator)));

            options.AddPolicy(PolicyAuthenticatedAny, policy =>
                policy.RequireAuthenticatedUser());
        });

        return services;
    }

    public static WebApplication MapArenaAuthEndpoints(this WebApplication app)
    {
        app.MapPost("/api/auth/login", async (LoginRequestDto dto, HttpContext http, IAuthService authService, CancellationToken ct) =>
        {
            var ip = http.Connection.RemoteIpAddress?.ToString();
            var result = await authService.AuthenticateAsync(dto.Email, dto.Password, ip, ct);

            if (result.IsRateLimited)
            {
                return Results.Json(new { error = result.ErrorMessage }, statusCode: StatusCodes.Status429TooManyRequests);
            }

            if (!result.Success || result.Data == null)
            {
                return Results.Json(new { error = result.ErrorMessage ?? "Credenciais inválidas." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            return Results.Ok(result.Data);
        }).AllowAnonymous();

        app.MapPost("/api/auth/refresh", async (RefreshRequestDto dto, HttpContext http, IAuthService authService, CancellationToken ct) =>
        {
            var ip = http.Connection.RemoteIpAddress?.ToString();
            var result = await authService.RefreshAsync(dto.RefreshToken, ip, ct);

            if (!result.Success || result.Data == null)
            {
                return Results.Json(new { error = result.ErrorMessage ?? "Refresh token inválido." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            return Results.Ok(result.Data);
        }).AllowAnonymous();

        app.MapPost("/api/auth/logout", async (HttpContext http, IAuthService authService, CancellationToken ct) =>
        {
            var userId = http.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var ip = http.Connection.RemoteIpAddress?.ToString();
            if (!string.IsNullOrWhiteSpace(userId))
            {
                await authService.LogoutAsync(userId, ip, ct);
            }
            return Results.Ok(new { loggedOut = true });
        }).RequireAuthorization(PolicyAuthenticatedAny);

        app.MapGet("/api/auth/me", async (HttpContext http, IAuthService authService, CancellationToken ct) =>
        {
            var userId = http.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return Results.Unauthorized();
            }

            var profile = await authService.GetProfileAsync(userId, ct);
            return profile == null ? Results.Unauthorized() : Results.Ok(profile);
        }).RequireAuthorization(PolicyAuthenticatedAny);

        return app;
    }

    /// <summary>
    /// Valida acesso independente de dispositivos ESP32 (via X-Device-Key) ou Operador/Admin autenticado via JWT.
    /// </summary>
    public static bool IsHardwareOrOperatorAuthorized(HttpContext http, IAuthService authService)
    {
        if (http.User.Identity?.IsAuthenticated == true &&
            (http.User.IsInRole(nameof(UserRole.Admin)) || http.User.IsInRole(nameof(UserRole.Operator))))
        {
            return true;
        }

        var providedDeviceKey = http.Request.Headers["X-Device-Key"].FirstOrDefault();
        if (authService.ValidateDeviceKey(providedDeviceKey))
        {
            return true;
        }

        var ip = http.Connection.RemoteIpAddress?.ToString();
        authService.RecordUnauthorizedAttempt(
            http.Request.Path,
            http.Request.Method,
            ip,
            reason: "Chave de dispositivo ESP32 (X-Device-Key) ou JWT Operator/Admin inválido.");

        return false;
    }
}
