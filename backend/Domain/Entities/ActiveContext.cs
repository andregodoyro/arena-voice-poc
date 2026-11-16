using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

public record ActiveContext
{
    public string? CurrentEventId { get; init; }
    public string? CurrentProjectId { get; init; }
    public PitchStage PitchStage { get; init; } = PitchStage.Waiting;
    public DateTimeOffset? PitchStageStartedAt { get; init; }
    public int CurrentStageDurationSeconds { get; init; } = 0;
    public bool IsPaused { get; init; } = false;
    public DateTimeOffset? PausedAt { get; init; }
    public double TotalPausedSeconds { get; init; } = 0.0;
    public bool IsVotingAllowed => PitchStage == PitchStage.VotingOpen && !IsPaused;

    // Metadados operacionais de Crash Recovery (Milestone 4B)
    public bool RecoveredFromCrash { get; init; } = false;
    public PitchStage? InterruptedStage { get; init; }
    public DateTimeOffset? RecoveredAt { get; init; }
    public DateTimeOffset? LastCheckpointAt { get; init; }

    public DateTimeOffset LastUpdated { get; init; } = DateTimeOffset.UtcNow;
}
