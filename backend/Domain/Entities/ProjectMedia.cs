namespace ArenaVoicePocBackend.Domain.Entities;

public record ProjectMediaItem
{
    public string Id { get; init; } = Guid.NewGuid().ToString("N")[..8];
    public string Type { get; init; } = "image"; // "image" | "video"
    public string Url { get; init; } = string.Empty;
    public int Order { get; init; } = 0;
}

public record ProjectMedia
{
    public string LogoUrl { get; init; } = string.Empty;
    public string CoverImageUrl { get; init; } = string.Empty;
    public List<ProjectMediaItem> Items { get; init; } = new();
}
