using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.ValueObjects;

namespace ArenaVoicePocBackend.Services;

public interface ISoundLibraryService
{
    Task EnsureSeededAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SoundLibraryItemDto>> GetLibraryAsync(bool includeDisabled = true, CancellationToken cancellationToken = default);
    Task<SoundLibraryItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SoundLibraryItemDto> CreateItemAsync(CreateSoundLibraryItemDto dto, ActorInfo actor, CancellationToken cancellationToken = default);
    Task<SoundLibraryItemDto?> UpdateItemAsync(Guid id, UpdateSoundLibraryItemDto dto, ActorInfo actor, CancellationToken cancellationToken = default);
    Task<(bool Found, bool Deactivated, SoundLibraryItemDto? Item)> DeleteItemAsync(Guid id, ActorInfo actor, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SoundEventMappingDto>> GetMappingsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SoundEventMappingDto>> UpdateMappingsAsync(UpdateSoundEventMappingsRequest request, ActorInfo actor, CancellationToken cancellationToken = default);
}
