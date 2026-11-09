using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

public record Round
{
    public string Id { get; init; } = Guid.NewGuid().ToString("N")[..8];
    public string EventId { get; init; } = string.Empty;
    public string ProjectId { get; init; } = string.Empty;
    public string ProjectTitle { get; init; } = string.Empty;
    public string PitchLeader { get; init; } = string.Empty;
    public string Track { get; init; } = string.Empty;
    public DateTimeOffset StartedAt { get; init; }
    public DateTimeOffset EndedAt { get; init; }
    public double DurationSeconds { get; init; }
    public double EffectiveDurationSeconds { get; init; }
    public PitchStage LastStageReached { get; init; } = PitchStage.Waiting;
    public IReadOnlyList<int> TurnedChairs { get; init; } = Array.Empty<int>();
    public int TurnedChairCount { get; init; }
    public int TotalChairs { get; init; } = 5;
    public TimerConfig TimerConfig { get; init; } = new();
    public double TotalPausedSeconds { get; init; }
    public DateTimeOffset ArchivedAt { get; init; } = DateTimeOffset.UtcNow;
    public RoundResult Result { get; init; } = RoundResult.Inconclusive;
    public RoundApprovalMode ApprovalMode { get; init; } = RoundApprovalMode.None;

    // Capacidade reservada para extensão futura (3E Jurados & 3F Scorecards)
    public string? Notes { get; init; }
    public IReadOnlyList<object>? JudgeScores { get; init; } = null;
    public IReadOnlyList<object>? Scorecards { get; init; } = null;
}
