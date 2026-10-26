namespace ArenaVoicePocBackend.Domain.Entities;

public record ActiveContext
{
    public string? CurrentEventId { get; init; }
    public string? CurrentProjectId { get; init; }
    public DateTimeOffset LastUpdated { get; init; } = DateTimeOffset.UtcNow;
}
