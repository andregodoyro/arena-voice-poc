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
    public string LogoUrl       { get; init; } = string.Empty;
    public string CoverImageUrl { get; init; } = string.Empty;
    /// <summary>
    /// URL do vídeo promocional do projeto (mp4 / webm).
    /// Exibido no Hero LED Wall durante o estado PitchRunning (Phase 5C.4).
    /// </summary>
    public string VideoUrl      { get; init; } = string.Empty;
    public List<ProjectMediaItem> Items { get; init; } = new();
}
