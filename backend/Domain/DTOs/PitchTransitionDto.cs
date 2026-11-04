namespace ArenaVoicePocBackend.Domain.DTOs;

public record PitchTransitionDto
{
    public string TargetStage { get; init; } = string.Empty;
}
