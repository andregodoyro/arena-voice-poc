using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

public class Project
{
    public string Id { get; set; } = string.Empty;
    public string EventId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string PitchLeader { get; set; } = string.Empty;
    public string Track { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Pending;
    public ProjectMedia Media { get; set; } = new();
    public DateTimeOffset? PresentationStartedAt { get; set; }
    public DateTimeOffset? PresentationEndedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
