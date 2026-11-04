using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.DTOs;

public record CreateEventDto
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset? ScheduledDate { get; init; }
    public EventStatus? Status { get; init; }
    public UpdateEventBrandingDto? Branding { get; init; }
}
