namespace ArenaVoicePocBackend.Domain.Entities;

public record TimerConfig
{
    public int PitchDurationSeconds { get; init; } = 180;
    public int QaDurationSeconds { get; init; } = 120;
    public int VotingDurationSeconds { get; init; } = 30;
    public bool LockoutEnabled { get; init; } = false;
}
