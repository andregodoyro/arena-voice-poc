using System.Text.RegularExpressions;
using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.ValueObjects;
using ArenaVoicePocBackend.Hubs;
using ArenaVoicePocBackend.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ArenaVoicePocBackend.Services;

public class SoundLibraryService : ISoundLibraryService
{
    private static readonly Regex KeyRegex = new("^[a-z0-9][a-z0-9-_]{1,98}$", RegexOptions.Compiled);
    private static readonly HashSet<string> ValidBuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "SFX", "Ambient", "Music"
    };
    private static readonly HashSet<string> ValidCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "ui", "stage", "music", "celebration"
    };
    private static readonly HashSet<string> ValidEventKeys = new(StringComparer.Ordinal)
    {
        "ui.click",
        "ui.hover",
        "ui.error",
        "ui.audio_unlock",
        "stage.standby_enter",
        "stage.presentation_enter",
        "stage.transition_whoosh",
        "stage.voting_open",
        "stage.voting_tick",
        "stage.voting_tick_critical",
        "stage.voting_close",
        "stage.chair_turn",
        "stage.chair_turn_1",
        "stage.chair_turn_2",
        "stage.chair_turn_3",
        "stage.chair_turn_4",
        "stage.chair_support",
        "stage.chair_reset",
        "stage.ability_activate",
        "stage.result_approved",
        "stage.result_eliminated",
        "stage.celebration",
        "stage.applause",
        "stage.crowd_cheer",
        "music.idle_loop",
        "music.voting_tension_loop",
        "music.celebration_loop",
        "music.stop"
    };

    private readonly ArenaDbContext _db;
    private readonly IAuditEventPublisher _auditPublisher;
    private readonly IHubContext<ArenaPocHub> _hubContext;
    private readonly ILogger<SoundLibraryService> _logger;

    public SoundLibraryService(
        ArenaDbContext db,
        IAuditEventPublisher auditPublisher,
        IHubContext<ArenaPocHub> hubContext,
        ILogger<SoundLibraryService> logger)
    {
        _db = db;
        _auditPublisher = auditPublisher;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task EnsureSeededAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var existingKeys = await _db.SoundLibrary
            .AsNoTracking()
            .Select(x => x.Key)
            .ToListAsync(cancellationToken);
        var existingKeySet = new HashSet<string>(existingKeys, StringComparer.Ordinal);

        var seedItems = GetSeedItems(now);
        var toInsert = seedItems.Where(x => !existingKeySet.Contains(x.Key)).ToList();
        if (toInsert.Count > 0)
        {
            _db.SoundLibrary.AddRange(toInsert);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var itemsByKey = await _db.SoundLibrary
            .AsNoTracking()
            .ToDictionaryAsync(x => x.Key, x => x.Id, StringComparer.Ordinal, cancellationToken);

        var existingMappings = await _db.SoundEventMappings
            .AsNoTracking()
            .Select(x => new { x.EventKey, x.SoundLibraryItemId })
            .ToListAsync(cancellationToken);
        var existingMappingSet = existingMappings
            .Select(x => (x.EventKey, x.SoundLibraryItemId))
            .ToHashSet();

        var seedMappings = GetSeedMappings(itemsByKey, now)
            .Where(m => !existingMappingSet.Contains((m.EventKey, m.SoundLibraryItemId)))
            .ToList();

        if (seedMappings.Count > 0)
        {
            _db.SoundEventMappings.AddRange(seedMappings);
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<IReadOnlyList<SoundLibraryItemDto>> GetLibraryAsync(
        bool includeDisabled = true,
        CancellationToken cancellationToken = default)
    {
        var query = _db.SoundLibrary.AsNoTracking();
        if (!includeDisabled)
        {
            query = query.Where(x => x.IsEnabled);
        }

        var items = await query
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return items.Select(ToDto).ToList();
    }

    public async Task<SoundLibraryItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await _db.SoundLibrary
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return item is null ? null : ToDto(item);
    }

    public async Task<SoundLibraryItemDto> CreateItemAsync(
        CreateSoundLibraryItemDto dto,
        ActorInfo actor,
        CancellationToken cancellationToken = default)
    {
        var normalizedKey = (dto.Key ?? string.Empty).Trim().ToLowerInvariant();
        if (!KeyRegex.IsMatch(normalizedKey))
        {
            throw new ArgumentException("Key inválida. Use apenas letras minúsculas, números, '-' e '_' (2 a 100 caracteres).");
        }

        var exists = await _db.SoundLibrary
            .AsNoTracking()
            .AnyAsync(x => x.Key == normalizedKey, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Já existe um som cadastrado com a key '{normalizedKey}'.");
        }

        var normalizedBus = NormalizeAndValidateBus(dto.Bus);
        var normalizedCategory = NormalizeAndValidateCategory(dto.Category);
        var normalizedUrl = ValidateAndNormalizeUrl(dto.Url);
        ValidateTimingAndVolume(dto.DefaultVolume, dto.OffsetSeconds, dto.DurationSeconds);

        var name = (dto.Name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 150)
        {
            throw new ArgumentException("Nome do som é obrigatório e deve ter até 150 caracteres.");
        }

        var now = DateTimeOffset.UtcNow;
        var entity = new SoundLibraryItem
        {
            Id = Guid.NewGuid(),
            Key = normalizedKey,
            Name = name,
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Category = normalizedCategory,
            Url = normalizedUrl,
            Bus = normalizedBus,
            DefaultVolume = dto.DefaultVolume,
            IsLoop = dto.IsLoop,
            OffsetSeconds = dto.OffsetSeconds,
            DurationSeconds = dto.DurationSeconds,
            PackName = string.IsNullOrWhiteSpace(dto.PackName) ? "default" : dto.PackName.Trim(),
            IsBuiltIn = false,
            IsEnabled = dto.IsEnabled,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.SoundLibrary.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        await PublishAuditAsync("SOUND_LIBRARY_CREATED", entity.Id.ToString(), actor, new
        {
            entity.Key,
            entity.Name,
            entity.Bus,
            entity.Category,
            entity.Url
        });

        await NotifyAudioConfigUpdatedAsync("library_created", entity.Key);

        return ToDto(entity);
    }

    public async Task<SoundLibraryItemDto?> UpdateItemAsync(
        Guid id,
        UpdateSoundLibraryItemDto dto,
        ActorInfo actor,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.SoundLibrary.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var normalizedBus = NormalizeAndValidateBus(dto.Bus);
        var normalizedCategory = NormalizeAndValidateCategory(dto.Category);
        var normalizedUrl = ValidateAndNormalizeUrl(dto.Url);
        ValidateTimingAndVolume(dto.DefaultVolume, dto.OffsetSeconds, dto.DurationSeconds);

        var name = (dto.Name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 150)
        {
            throw new ArgumentException("Nome do som é obrigatório e deve ter até 150 caracteres.");
        }

        entity.Name = name;
        entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        entity.Category = normalizedCategory;
        entity.Url = normalizedUrl;
        entity.Bus = normalizedBus;
        entity.DefaultVolume = dto.DefaultVolume;
        entity.IsLoop = dto.IsLoop;
        entity.OffsetSeconds = dto.OffsetSeconds;
        entity.DurationSeconds = dto.DurationSeconds;
        entity.PackName = string.IsNullOrWhiteSpace(dto.PackName) ? "default" : dto.PackName.Trim();
        entity.IsEnabled = dto.IsEnabled;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await PublishAuditAsync("SOUND_LIBRARY_UPDATED", entity.Id.ToString(), actor, new
        {
            entity.Key,
            entity.Name,
            entity.Bus,
            entity.Category,
            entity.IsEnabled
        });

        await NotifyAudioConfigUpdatedAsync("library_updated", entity.Key);

        return ToDto(entity);
    }

    public async Task<(bool Found, bool Deactivated, SoundLibraryItemDto? Item)> DeleteItemAsync(
        Guid id,
        ActorInfo actor,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.SoundLibrary.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return (false, false, null);
        }

        // Desativação segura: preserva integridade referencial e histórico/mappings existentes.
        entity.IsEnabled = false;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        var mappings = await _db.SoundEventMappings
            .Where(m => m.SoundLibraryItemId == id && m.Enabled)
            .ToListAsync(cancellationToken);
        foreach (var mapping in mappings)
        {
            mapping.Enabled = false;
            mapping.UpdatedAt = entity.UpdatedAt;
        }

        await _db.SaveChangesAsync(cancellationToken);

        await PublishAuditAsync("SOUND_LIBRARY_DEACTIVATED", entity.Id.ToString(), actor, new
        {
            entity.Key,
            DisabledMappingsCount = mappings.Count
        });

        await NotifyAudioConfigUpdatedAsync("library_deactivated", entity.Key);

        return (true, true, ToDto(entity));
    }

    public async Task<IReadOnlyList<SoundEventMappingDto>> GetMappingsAsync(CancellationToken cancellationToken = default)
    {
        var mappings = await _db.SoundEventMappings
            .AsNoTracking()
            .Include(m => m.SoundLibraryItem)
            .OrderBy(m => m.EventKey)
            .ThenBy(m => m.LayerOrder)
            .ToListAsync(cancellationToken);

        return mappings
            .Where(m => m.SoundLibraryItem is not null)
            .Select(m => new SoundEventMappingDto(
                m.Id,
                m.EventKey,
                m.SoundLibraryItemId,
                m.SoundLibraryItem!.Key,
                m.SoundLibraryItem.Name,
                m.SoundLibraryItem.Url,
                m.SoundLibraryItem.Bus,
                m.SoundLibraryItem.DefaultVolume,
                m.SoundLibraryItem.IsLoop,
                m.SoundLibraryItem.OffsetSeconds,
                m.SoundLibraryItem.DurationSeconds,
                m.SoundLibraryItem.IsEnabled,
                m.LayerOrder,
                m.Enabled,
                m.VolumeOverride,
                m.UpdatedAt))
            .ToList();
    }

    public async Task<IReadOnlyList<SoundEventMappingDto>> UpdateMappingsAsync(
        UpdateSoundEventMappingsRequest request,
        ActorInfo actor,
        CancellationToken cancellationToken = default)
    {
        if (request.Mappings is null || request.Mappings.Count == 0)
        {
            throw new ArgumentException("A lista de mappings não pode ser vazia.");
        }

        var seenPairs = new HashSet<(string EventKey, Guid SoundLibraryItemId)>();
        foreach (var item in request.Mappings)
        {
            var eventKey = (item.EventKey ?? string.Empty).Trim();
            if (!ValidEventKeys.Contains(eventKey))
            {
                throw new ArgumentException($"Evento desconhecido: '{item.EventKey}'.");
            }

            if (item.VolumeOverride is < 0 or > 1)
            {
                throw new ArgumentException($"VolumeOverride inválido para '{eventKey}'. Deve estar entre 0 e 1.");
            }

            if (item.LayerOrder < 0)
            {
                throw new ArgumentException($"LayerOrder inválido para '{eventKey}'. Deve ser >= 0.");
            }

            if (!seenPairs.Add((eventKey, item.SoundLibraryItemId)))
            {
                throw new ArgumentException($"Mapping duplicado no payload para evento '{eventKey}' e som '{item.SoundLibraryItemId}'.");
            }
        }

        var soundIds = request.Mappings.Select(m => m.SoundLibraryItemId).Distinct().ToList();
        var soundsById = await _db.SoundLibrary
            .AsNoTracking()
            .Where(s => soundIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        foreach (var item in request.Mappings)
        {
            if (!soundsById.TryGetValue(item.SoundLibraryItemId, out var sound))
            {
                throw new ArgumentException($"Som '{item.SoundLibraryItemId}' não encontrado na biblioteca.");
            }

            if (item.Enabled && !sound.IsEnabled)
            {
                throw new InvalidOperationException($"Não é possível ativar mapping para o som desabilitado '{sound.Key}'.");
            }
        }

        var now = DateTimeOffset.UtcNow;
        var existingMappings = await _db.SoundEventMappings.ToListAsync(cancellationToken);
        var existingByPair = existingMappings.ToDictionary(m => (m.EventKey, m.SoundLibraryItemId));

        foreach (var item in request.Mappings)
        {
            var key = (item.EventKey.Trim(), item.SoundLibraryItemId);
            if (existingByPair.TryGetValue(key, out var existing))
            {
                existing.LayerOrder = item.LayerOrder;
                existing.Enabled = item.Enabled;
                existing.VolumeOverride = item.VolumeOverride;
                existing.UpdatedAt = now;
            }
            else
            {
                _db.SoundEventMappings.Add(new SoundEventMapping
                {
                    Id = Guid.NewGuid(),
                    EventKey = key.Item1,
                    SoundLibraryItemId = key.Item2,
                    LayerOrder = item.LayerOrder,
                    Enabled = item.Enabled,
                    VolumeOverride = item.VolumeOverride,
                    UpdatedAt = now
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        await PublishAuditAsync("SOUND_MAPPINGS_UPDATED", "sound_event_mappings", actor, new
        {
            UpdatedCount = request.Mappings.Count
        });

        await NotifyAudioConfigUpdatedAsync("mappings_updated", null);

        return await GetMappingsAsync(cancellationToken);
    }

    private static string NormalizeAndValidateBus(string? bus)
    {
        var trimmed = (bus ?? string.Empty).Trim();
        var match = ValidBuses.FirstOrDefault(b => string.Equals(b, trimmed, StringComparison.OrdinalIgnoreCase));
        if (match is null)
        {
            throw new ArgumentException("Bus inválido. Valores permitidos: SFX, Ambient, Music.");
        }
        return match;
    }

    private static string NormalizeAndValidateCategory(string? category)
    {
        var trimmed = (category ?? string.Empty).Trim().ToLowerInvariant();
        if (!ValidCategories.Contains(trimmed))
        {
            throw new ArgumentException("Categoria inválida. Valores permitidos: ui, stage, music, celebration.");
        }
        return trimmed;
    }

    private static string ValidateAndNormalizeUrl(string? url)
    {
        var trimmed = (url ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed) || trimmed.Length > 300)
        {
            throw new ArgumentException("URL de áudio inválida.");
        }

        if (!trimmed.StartsWith("/audio/", StringComparison.Ordinal) ||
            trimmed.Contains("..", StringComparison.Ordinal) ||
            trimmed.Contains('\\', StringComparison.Ordinal) ||
            trimmed.Contains("://", StringComparison.Ordinal))
        {
            throw new ArgumentException("URL de áudio deve ser um path relativo seguro iniciado por '/audio/'.");
        }

        return trimmed;
    }

    private static void ValidateTimingAndVolume(double defaultVolume, double offsetSeconds, double? durationSeconds)
    {
        if (double.IsNaN(defaultVolume) || defaultVolume < 0 || defaultVolume > 1)
        {
            throw new ArgumentException("DefaultVolume deve estar entre 0 e 1.");
        }

        if (double.IsNaN(offsetSeconds) || offsetSeconds < 0)
        {
            throw new ArgumentException("OffsetSeconds não pode ser negativo.");
        }

        if (durationSeconds.HasValue && (double.IsNaN(durationSeconds.Value) || durationSeconds.Value <= 0))
        {
            throw new ArgumentException("DurationSeconds deve ser maior que zero quando informado.");
        }
    }

    private async Task PublishAuditAsync(string eventType, string entityId, ActorInfo actor, object details)
    {
        try
        {
            await _auditPublisher.PublishAsync(new AuditEventRecord(
                EventType: eventType,
                AggregateType: "AudioConfig",
                AggregateId: entityId,
                ActorType: actor.Type,
                ActorId: actor.ActorId,
                ActorName: actor.ActorName,
                Payload: details));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha não-bloqueante ao registrar auditoria {EventType} para {EntityId}.", eventType, entityId);
        }
    }

    private async Task NotifyAudioConfigUpdatedAsync(string changeType, string? key)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("AudioConfigUpdated", new
            {
                changeType,
                key,
                timestamp = DateTimeOffset.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha não-bloqueante ao emitir SignalR AudioConfigUpdated ({ChangeType}).", changeType);
        }
    }

    private static SoundLibraryItemDto ToDto(SoundLibraryItem item) =>
        new(
            item.Id,
            item.Key,
            item.Name,
            item.Description,
            item.Category,
            item.Url,
            item.Bus,
            item.DefaultVolume,
            item.IsLoop,
            item.OffsetSeconds,
            item.DurationSeconds,
            item.PackName,
            item.IsBuiltIn,
            item.IsEnabled,
            item.CreatedAt,
            item.UpdatedAt);

    private static List<SoundLibraryItem> GetSeedItems(DateTimeOffset now) =>
    [
        new() { Id = Guid.NewGuid(), Key = "ui-sci-fi-click", Name = "UI Sci-Fi Click", Description = "Micro-clique futurista para botões do Cockpit", Category = "ui", Url = "/audio/ui/ui-sci-fi-click.mp3", Bus = "SFX", DefaultVolume = 0.65, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 0.25, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "ui-hover-tick", Name = "UI Hover Tick", Description = "Tick sutil de hover/seleção", Category = "ui", Url = "/audio/ui/ui-hover-tick.mp3", Bus = "SFX", DefaultVolume = 0.45, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 0.15, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "ui-error-pop", Name = "UI Error Pop", Description = "Alerta leve para ação bloqueada ou erro de validação", Category = "ui", Url = "/audio/ui/ui-error-pop.mp3", Bus = "SFX", DefaultVolume = 0.7, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 0.4, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "chair-bass-whoosh", Name = "Chair Bass Whoosh", Description = "Whoosh grave cinematográfico para virada de cadeira", Category = "stage", Url = "/audio/stage/chair-bass-whoosh.mp3", Bus = "SFX", DefaultVolume = 0.9, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 1.8, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "braam-impact-dark", Name = "Braam Impact Dark", Description = "Impacto dramático de encerramento/revelação", Category = "stage", Url = "/audio/stage/braam-impact-dark.mp3", Bus = "SFX", DefaultVolume = 0.85, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 2.4, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "ability-sci-fi-shift", Name = "Ability Sci-Fi Shift", Description = "Efeito futurista para habilidades especiais/jokers", Category = "stage", Url = "/audio/stage/ability-sci-fi-shift.mp3", Bus = "SFX", DefaultVolume = 0.8, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 1.5, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "transition-dreamy", Name = "Transition Dreamy", Description = "Transição suave entre estados do palco", Category = "stage", Url = "/audio/stage/transition-dreamy.mp3", Bus = "SFX", DefaultVolume = 0.75, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 2.0, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "victory-fanfare", Name = "Victory Fanfare", Description = "Fanfarra épica de aprovação", Category = "celebration", Url = "/audio/celebration/victory-fanfare.mp3", Bus = "SFX", DefaultVolume = 0.9, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 4.0, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "applause-stage", Name = "Applause Stage", Description = "Aplausos de plateia em arena", Category = "celebration", Url = "/audio/celebration/applause-stage.mp3", Bus = "Ambient", DefaultVolume = 0.7, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 4.5, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "crowd-cheer", Name = "Crowd Cheer", Description = "Torcida vibrante em momentos de virada ou vitória", Category = "celebration", Url = "/audio/celebration/crowd-cheer.mp3", Bus = "Ambient", DefaultVolume = 0.75, IsLoop = false, OffsetSeconds = 0, DurationSeconds = 3.5, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "idle-keep-moving", Name = "Idle Keep Moving", Description = "Trilha ambiente futurista para standby e intervalo", Category = "music", Url = "/audio/music/idle-keep-moving.mp3", Bus = "Music", DefaultVolume = 0.45, IsLoop = true, OffsetSeconds = 0, DurationSeconds = null, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now },
        new() { Id = Guid.NewGuid(), Key = "voting-tension-loop", Name = "Voting Tension Loop", Description = "Loop de tensão contínua durante janela de votação", Category = "music", Url = "/audio/music/voting-tension-loop.mp3", Bus = "Music", DefaultVolume = 0.5, IsLoop = true, OffsetSeconds = 0, DurationSeconds = null, PackName = "default", IsBuiltIn = true, IsEnabled = true, CreatedAt = now, UpdatedAt = now }
    ];

    private static List<SoundEventMapping> GetSeedMappings(
        IReadOnlyDictionary<string, Guid> itemsByKey,
        DateTimeOffset now)
    {
        var specs = new (string EventKey, string SoundKey, int LayerOrder, double? VolumeOverride)[]
        {
            ("ui.click", "ui-sci-fi-click", 0, null),
            ("ui.hover", "ui-hover-tick", 0, null),
            ("ui.error", "ui-error-pop", 0, null),
            ("stage.standby_enter", "transition-dreamy", 0, null),
            ("stage.presentation_enter", "transition-dreamy", 0, null),
            ("stage.transition_whoosh", "chair-bass-whoosh", 0, null),
            ("stage.voting_open", "braam-impact-dark", 0, null),
            ("stage.voting_close", "braam-impact-dark", 0, null),
            ("stage.chair_turn", "chair-bass-whoosh", 0, null),
            ("stage.chair_turn_1", "chair-bass-whoosh", 0, null),
            ("stage.chair_turn_2", "chair-bass-whoosh", 0, null),
            ("stage.chair_turn_3", "chair-bass-whoosh", 0, null),
            ("stage.chair_turn_4", "chair-bass-whoosh", 0, null),
            ("stage.chair_support", "applause-stage", 0, 0.55),
            ("stage.ability_activate", "ability-sci-fi-shift", 0, null),
            ("stage.result_approved", "victory-fanfare", 0, null),
            ("stage.result_approved", "crowd-cheer", 1, 0.7),
            ("stage.result_eliminated", "braam-impact-dark", 0, 0.75),
            ("stage.celebration", "victory-fanfare", 0, null),
            ("stage.celebration", "applause-stage", 1, 0.65),
            ("stage.applause", "applause-stage", 0, null),
            ("stage.crowd_cheer", "crowd-cheer", 0, null),
            ("music.idle_loop", "idle-keep-moving", 0, null),
            ("music.voting_tension_loop", "voting-tension-loop", 0, null),
            ("music.celebration_loop", "idle-keep-moving", 0, 0.55)
        };

        var result = new List<SoundEventMapping>();
        foreach (var (eventKey, soundKey, layerOrder, volumeOverride) in specs)
        {
            if (itemsByKey.TryGetValue(soundKey, out var soundId))
            {
                result.Add(new SoundEventMapping
                {
                    Id = Guid.NewGuid(),
                    EventKey = eventKey,
                    SoundLibraryItemId = soundId,
                    LayerOrder = layerOrder,
                    Enabled = true,
                    VolumeOverride = volumeOverride,
                    UpdatedAt = now
                });
            }
        }
        return result;
    }
}
