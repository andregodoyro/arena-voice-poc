namespace ArenaVoicePocBackend.Domain.Entities;

public class SoundEventMapping
{
    public Guid Id { get; set; }
    public string EventKey { get; set; } = string.Empty;
    public Guid SoundLibraryItemId { get; set; }
    public int LayerOrder { get; set; }
    public bool Enabled { get; set; } = true;
    public double? VolumeOverride { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public SoundLibraryItem? SoundLibraryItem { get; set; }
}
