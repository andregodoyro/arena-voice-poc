using ArenaVoicePocBackend.Domain.Entities;

namespace ArenaVoicePocBackend.Domain.DTOs;

public record RoundDto(
    string Id,
    string EventId,
    string ProjectId,
    string ProjectTitle,
    string PitchLeader,
    string Track,
    DateTimeOffset StartedAt,
    DateTimeOffset EndedAt,
    double DurationSeconds,
    double EffectiveDurationSeconds,
    string LastStageReached,
    int LastStageCode,
    IReadOnlyList<int> TurnedChairs,
    int TurnedChairCount,
    int TotalChairs,
    TimerConfig TimerConfig,
    double TotalPausedSeconds,
    DateTimeOffset ArchivedAt,
    string Result,
    int ResultCode,
    string ApprovalMode,
    int ApprovalModeCode,
    string? Notes
)
{
    public static RoundDto FromEntity(Round r) => new(
        r.Id,
        r.EventId,
        r.ProjectId,
        r.ProjectTitle,
        r.PitchLeader,
        r.Track,
        r.StartedAt,
        r.EndedAt,
        r.DurationSeconds,
        r.EffectiveDurationSeconds,
        r.LastStageReached.ToString(),
        (int)r.LastStageReached,
        r.TurnedChairs,
        r.TurnedChairCount,
        r.TotalChairs,
        r.TimerConfig,
        r.TotalPausedSeconds,
        r.ArchivedAt,
        r.Result.ToString(),
        (int)r.Result,
        r.ApprovalMode.ToString(),
        (int)r.ApprovalMode,
        r.Notes
    );
}
