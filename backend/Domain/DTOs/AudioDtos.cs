namespace ArenaVoicePocBackend.Domain.DTOs;

public sealed record SoundLibraryItemDto(
    Guid Id,
    string Key,
    string Name,
    string? Description,
    string Category,
    string Url,
    string Bus,
    double DefaultVolume,
    bool IsLoop,
    double OffsetSeconds,
    double? DurationSeconds,
    string PackName,
    bool IsBuiltIn,
    bool IsEnabled,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CreateSoundLibraryItemDto(
    string Key,
    string Name,
    string? Description,
    string Category,
    string Url,
    string Bus,
    double DefaultVolume = 0.8,
    bool IsLoop = false,
    double OffsetSeconds = 0,
    double? DurationSeconds = null,
    string PackName = "default",
    bool IsEnabled = true);

public sealed record UpdateSoundLibraryItemDto(
    string Name,
    string? Description,
    string Category,
    string Url,
    string Bus,
    double DefaultVolume,
    bool IsLoop,
    double OffsetSeconds,
    double? DurationSeconds,
    string PackName,
    bool IsEnabled);

public sealed record SoundEventMappingDto(
    Guid Id,
    string EventKey,
    Guid SoundLibraryItemId,
    string SoundKey,
    string SoundName,
    string SoundUrl,
    string SoundBus,
    double SoundDefaultVolume,
    bool SoundIsLoop,
    double SoundOffsetSeconds,
    double? SoundDurationSeconds,
    bool SoundIsEnabled,
    int LayerOrder,
    bool Enabled,
    double? VolumeOverride,
    DateTimeOffset UpdatedAt);

public sealed record UpdateSoundEventMappingItemDto(
    string EventKey,
    Guid SoundLibraryItemId,
    int LayerOrder = 0,
    bool Enabled = true,
    double? VolumeOverride = null);

public sealed record UpdateSoundEventMappingsRequest(
    IReadOnlyList<UpdateSoundEventMappingItemDto> Mappings);
