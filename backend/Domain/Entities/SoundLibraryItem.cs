namespace ArenaVoicePocBackend.Domain.Entities;

public class SoundLibraryItem
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Bus { get; set; } = "SFX";
    public double DefaultVolume { get; set; } = 0.8;
    public bool IsLoop { get; set; }
    public double OffsetSeconds { get; set; }
    public double? DurationSeconds { get; set; }
    public string PackName { get; set; } = "default";
    public bool IsBuiltIn { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<SoundEventMapping> EventMappings { get; set; } = new List<SoundEventMapping>();
}
