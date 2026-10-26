namespace ArenaVoicePocBackend.Domain.DTOs;

public record UpdateProjectDto
{
    public string? Title { get; init; }
    public string? PitchLeader { get; init; }
    public string? Track { get; init; }
    public string? Description { get; init; }
    public int? OrderIndex { get; init; }
    public string? LogoUrl { get; init; }
    public string? CoverImageUrl { get; init; }
}
