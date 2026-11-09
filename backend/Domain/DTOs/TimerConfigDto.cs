namespace ArenaVoicePocBackend.Domain.DTOs;

public record TimerConfigDto
{
    public int? PitchDurationSeconds { get; init; }
    public int? QaDurationSeconds { get; init; }
    public int? VotingDurationSeconds { get; init; }
    public bool? LockoutEnabled { get; init; }
}

public record AdjustPitchTimerDto
{
    public int Seconds { get; init; }
}
