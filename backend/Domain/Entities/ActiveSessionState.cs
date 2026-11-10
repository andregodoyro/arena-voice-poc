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
    public DateTimeOffset LastUpdated { get; set; } = DateTimeOffset.UtcNow;
}
