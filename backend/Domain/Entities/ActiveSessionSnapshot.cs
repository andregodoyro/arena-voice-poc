using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

/// <summary>
/// Snapshot imutável extraído sob lock de memória para persistência segura
/// e isolada no PostgreSQL fora do lock principal (Snapshot Pattern - Milestone 4B).
/// </summary>
public record ActiveSessionSnapshot(
    int SingletonId,
    string? CurrentEventId,
    string? CurrentProjectId,
    PitchStage PitchStage,
    DateTimeOffset? PitchStageStartedAt,
    int CurrentStageDurationSeconds,
    bool IsPaused,
    DateTimeOffset? PausedAt,
    double TotalPausedSeconds,
    int[] TurnedChairs,
    bool RecoveredFromCrash,
    PitchStage? InterruptedStage,
    DateTimeOffset? RecoveredAt,
    DateTimeOffset? LastCheckpointAt,
    DateTimeOffset LastUpdated
);
