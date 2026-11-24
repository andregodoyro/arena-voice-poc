using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.DTOs;

public sealed record LoginRequestDto(string Email, string Password);

public sealed record RefreshRequestDto(string RefreshToken);

public sealed record UserProfileDto(
    string Id,
    string Name,
    string Email,
    string Role,
    bool IsActive,
    DateTimeOffset? LastLoginAt
);

public sealed record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAt,
    UserProfileDto User
);
