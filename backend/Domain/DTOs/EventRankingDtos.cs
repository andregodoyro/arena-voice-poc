using ArenaVoicePocBackend.Domain.Entities;

namespace ArenaVoicePocBackend.Domain.DTOs;

public sealed record EventRankedResultItemDto(
    int Rank,
    string RoundId,
    string ProjectId,
    string ProjectTitle,
    string PitchLeader,
    string Track,
    int TurnedChairCount,
    int TotalChairs,
    IReadOnlyList<int> TurnedChairs,
    string Result,
    string ApprovalMode,
    double EffectiveDurationSeconds,
    DateTimeOffset ArchivedAt,
    ProjectMedia? Media
);

public sealed record EventResultsResponseDto(
    string EventId,
    string EventTitle,
    string EventStatus,
    int TotalEvaluatedProjects,
    DateTimeOffset ComputedAt,
    IReadOnlyList<EventRankedResultItemDto> Rankings
);
