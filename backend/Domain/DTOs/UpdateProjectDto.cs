using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;

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
    /// <summary>URL do vídeo promocional (Phase 5C.4). String vazia preserva o valor existente.</summary>
    public string? VideoUrl { get; init; }
    public List<ProjectMediaItem>? MediaItems { get; init; }
    public ProjectStatus? Status { get; init; }
}
