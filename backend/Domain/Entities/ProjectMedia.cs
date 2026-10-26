namespace ArenaVoicePocBackend.Domain.Entities;

public record ProjectMedia
{
    public string LogoUrl { get; init; } = string.Empty;
    public string CoverImageUrl { get; init; } = string.Empty;
}
