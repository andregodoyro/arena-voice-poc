namespace ArenaVoicePocBackend.Domain.Entities;

public record BrandingConfig
{
    public string PrimaryColor { get; init; } = "#d90429";
    public string SecondaryColor { get; init; } = "#ffd166";
    public string LogoUrl { get; init; } = string.Empty;
    public string Tagline { get; init; } = string.Empty;
}
