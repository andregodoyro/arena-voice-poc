using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

public record ActiveContext
{
    public string? CurrentEventId { get; init; }
    public string? CurrentProjectId { get; init; }
    public PitchStage PitchStage { get; init; } = PitchStage.Waiting;
    public DateTimeOffset? PitchStageStartedAt { get; init; }
    public DateTimeOffset LastUpdated { get; init; } = DateTimeOffset.UtcNow;
}
