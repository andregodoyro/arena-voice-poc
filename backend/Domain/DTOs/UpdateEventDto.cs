namespace ArenaVoicePocBackend.Domain.DTOs;

public record UpdateEventBrandingDto
{
    public string? PrimaryColor { get; init; }
    public string? SecondaryColor { get; init; }
    public string? LogoUrl { get; init; }
    public string? Tagline { get; init; }
}

public record UpdateEventDto
{
    public string? Title { get; init; }
    public string? Description { get; init; }
    public DateTimeOffset? ScheduledDate { get; init; }
    public UpdateEventBrandingDto? Branding { get; init; }
}
