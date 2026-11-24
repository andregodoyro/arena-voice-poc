using ArenaVoicePocBackend.Domain.DTOs;

namespace ArenaVoicePocBackend.Services;

public sealed record AuthOperationResult(
    bool Success,
    AuthResponseDto? Data = null,
    bool IsRateLimited = false,
    bool IsUnauthorized = false,
    string? ErrorMessage = null
);

public interface IAuthService
{
    Task EnsureSeedUsersAsync(CancellationToken cancellationToken = default);
    Task<AuthOperationResult> AuthenticateAsync(string email, string password, string? sourceIp, CancellationToken cancellationToken = default);
    Task<AuthOperationResult> RefreshAsync(string refreshToken, string? sourceIp, CancellationToken cancellationToken = default);
    Task LogoutAsync(string userId, string? sourceIp, CancellationToken cancellationToken = default);
    Task<UserProfileDto?> GetProfileAsync(string userId, CancellationToken cancellationToken = default);
    bool ValidateDeviceKey(string? providedKey);
    bool IsDeviceKeyRequired();
    void RecordUnauthorizedAttempt(string path, string method, string? sourceIp, string? actorId = null, string? reason = null);
}
