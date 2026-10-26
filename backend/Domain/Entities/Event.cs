using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

public class Event
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset ScheduledDate { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Draft;
    public BrandingConfig Branding { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
