using ArenaVoicePocBackend.Domain.Entities;

namespace ArenaVoicePocBackend.Domain.DTOs;

public record CreateJudgeDto(
    string Name,
    string Company,
    string Role,
    string AvatarUrl,
    string? Bio = null,
    string[]? Expertise = null,
    string? SocialUrl = null,
    bool? IsActive = true,
    string? Email = null
);

public record UpdateJudgeDto(
    string? Name = null,
    string? Company = null,
    string? Role = null,
    string? AvatarUrl = null,
    string? Bio = null,
    string[]? Expertise = null,
    string? SocialUrl = null,
    bool? IsActive = null,
    string? Email = null
);

public record JuryAssignmentItemDto(
    int ChairId,
    string JudgeId
);

public record AssignEventJuryDto(
    IReadOnlyList<JuryAssignmentItemDto> Assignments
);

public record EventJuryMemberDto(
    int ChairId,
    Judge Judge,
    DateTimeOffset AssignedAt
);

public record EventJuryDto(
    string EventId,
    IReadOnlyList<EventJuryMemberDto> Jury
);
