using ArenaVoicePocBackend.DTOs;

namespace ArenaVoicePocBackend.Services;

public interface IAuditQueryService
{
    Task<PagedResult<AuditEventDto>> QueryAsync(AuditQueryFilter filter, CancellationToken ct = default);
    Task<AuditEventDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<PagedResult<AuditEventDto>> GetByProjectIdAsync(string projectId, AuditQueryFilter filter, CancellationToken ct = default);
    Task<PagedResult<AuditEventDto>> GetByArenaEventIdAsync(string arenaEventId, AuditQueryFilter filter, CancellationToken ct = default);
    Task<PagedResult<AuditEventDto>> GetSessionTimelineAsync(AuditQueryFilter filter, CancellationToken ct = default);
}

public class AuditQueryFilter
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? EventType { get; set; }
    public string? AggregateType { get; set; }
    public string? ActorType { get; set; }
    public DateTimeOffset? From { get; set; }
    public DateTimeOffset? To { get; set; }
    public bool IncludeTechnical { get; set; } = false;

    /// <summary>
    /// Eventos técnicos / de infraestrutura ocultados por padrão na timeline (ADR-022).
    /// </summary>
    public static readonly HashSet<string> TechnicalEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "RecoveryCheckpointCreated",
        "ActiveSessionUpdated"
    };

    public const int MaxPageSize = 250;
    public const int DefaultPageSize = 50;

    public void Normalize()
    {
        if (Page < 1) Page = 1;
        if (PageSize < 1) PageSize = DefaultPageSize;
        if (PageSize > MaxPageSize) PageSize = MaxPageSize;
    }
}
