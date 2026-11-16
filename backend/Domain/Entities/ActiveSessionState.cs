using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

public class ActiveSessionState
{
    public int SingletonId { get; set; } = 1;
    public string? CurrentEventId { get; set; }
    public string? CurrentProjectId { get; set; }
    public PitchStage PitchStage { get; set; } = PitchStage.Waiting;
    public DateTimeOffset? PitchStageStartedAt { get; set; }
    public int CurrentStageDurationSeconds { get; set; } = 0;
    public bool IsPaused { get; set; } = false;
    public DateTimeOffset? PausedAt { get; set; }
    public double TotalPausedSeconds { get; set; } = 0.0;

    // Milestone 4B: Estado das 5 cadeiras físicas da Arena
    public int[] TurnedChairs { get; set; } = Array.Empty<int>();

    // Milestone 4B: Metadados operacionais de Crash Recovery
    public bool RecoveredFromCrash { get; set; } = false;
    public PitchStage? InterruptedStage { get; set; }
    public DateTimeOffset? RecoveredAt { get; set; }

    // Milestone 4B: Metadados operacionais de auditoria de snapshot
    public DateTimeOffset? LastCheckpointAt { get; set; }

    public DateTimeOffset LastUpdated { get; set; } = DateTimeOffset.UtcNow;
}
