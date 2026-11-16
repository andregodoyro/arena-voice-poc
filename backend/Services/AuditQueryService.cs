using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.DTOs;
using ArenaVoicePocBackend.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ArenaVoicePocBackend.Services;

/// <summary>
/// Serviço de consulta de auditoria — camada de leitura (CQRS leve).
/// Completamente separado do pipeline de escrita (AuditEventPublisher / AuditEventWriter).
/// Implementa ADR-022: segregação de visibilidade (eventos técnicos ocultados por padrão).
/// </summary>
public class AuditQueryService : IAuditQueryService
{
    private readonly IDbContextFactory<ArenaDbContext> _dbFactory;

    public AuditQueryService(IDbContextFactory<ArenaDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<PagedResult<AuditEventDto>> QueryAsync(AuditQueryFilter filter, CancellationToken ct = default)
    {
        filter.Normalize();
        await using var db = await _dbFactory.CreateDbContextAsync(ct);

        var query = db.AuditEvents.AsNoTracking().AsQueryable();
        query = ApplyFilters(query, filter);
        query = ApplyTechnicalFilter(query, filter);

        return await ExecutePagedQueryAsync(query, filter, ct);
    }

    public async Task<AuditEventDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(ct);
        var entity = await db.AuditEvents.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);
        return entity != null ? AuditEventDto.FromEntity(entity) : null;
    }

    public async Task<PagedResult<AuditEventDto>> GetByProjectIdAsync(string projectId, AuditQueryFilter filter, CancellationToken ct = default)
    {
        filter.Normalize();
        await using var db = await _dbFactory.CreateDbContextAsync(ct);

        var query = db.AuditEvents.AsNoTracking()
            .Where(e => e.ProjectId == projectId || e.AggregateId == projectId);

        query = ApplyFilters(query, filter);
        query = ApplyTechnicalFilter(query, filter);

        return await ExecutePagedQueryAsync(query, filter, ct);
    }

    public async Task<PagedResult<AuditEventDto>> GetByArenaEventIdAsync(string arenaEventId, AuditQueryFilter filter, CancellationToken ct = default)
    {
        filter.Normalize();
        await using var db = await _dbFactory.CreateDbContextAsync(ct);

        var query = db.AuditEvents.AsNoTracking()
            .Where(e => e.ArenaEventId == arenaEventId || e.AggregateId == arenaEventId);

        query = ApplyFilters(query, filter);
        query = ApplyTechnicalFilter(query, filter);

        return await ExecutePagedQueryAsync(query, filter, ct);
    }

    public async Task<PagedResult<AuditEventDto>> GetSessionTimelineAsync(AuditQueryFilter filter, CancellationToken ct = default)
    {
        filter.Normalize();
        await using var db = await _dbFactory.CreateDbContextAsync(ct);

        var query = db.AuditEvents.AsNoTracking()
            .Where(e => e.AggregateType == "Session");

        query = ApplyFilters(query, filter);
        // Para session, não aplicar filtro técnico — Session é o domínio técnico por natureza
        // O consumidor opta explicitamente por consultar /api/audit/session

        return await ExecutePagedQueryAsync(query, filter, ct);
    }

    // ========================================================================
    // FILTROS COMUNS
    // ========================================================================

    private static IQueryable<AuditEvent> ApplyFilters(IQueryable<AuditEvent> query, AuditQueryFilter filter)
    {
        if (!string.IsNullOrWhiteSpace(filter.EventType))
        {
            query = query.Where(e => e.EventType == filter.EventType);
        }

        if (!string.IsNullOrWhiteSpace(filter.AggregateType))
        {
            query = query.Where(e => e.AggregateType == filter.AggregateType);
        }

        if (!string.IsNullOrWhiteSpace(filter.ActorType))
        {
            if (Enum.TryParse<Domain.Enums.ActorType>(filter.ActorType, ignoreCase: true, out var actorEnum))
            {
                query = query.Where(e => e.ActorType == actorEnum);
            }
        }

        if (filter.From.HasValue)
        {
            query = query.Where(e => e.OccurredAt >= filter.From.Value);
        }

        if (filter.To.HasValue)
        {
            query = query.Where(e => e.OccurredAt <= filter.To.Value);
        }

        return query;
    }

    /// <summary>
    /// ADR-022: Oculta eventos técnicos (RecoveryCheckpointCreated, ActiveSessionUpdated)
    /// por padrão, a menos que includeTechnical=true ou o filtro explícito solicite um tipo técnico.
    /// </summary>
    private static IQueryable<AuditEvent> ApplyTechnicalFilter(IQueryable<AuditEvent> query, AuditQueryFilter filter)
    {
        if (filter.IncludeTechnical) return query;

        // Se o filtro explícito solicita um tipo técnico específico, respeitar a intenção do consumidor
        if (!string.IsNullOrWhiteSpace(filter.EventType) &&
            AuditQueryFilter.TechnicalEventTypes.Contains(filter.EventType))
        {
            return query;
        }

        // Ocultação padrão
        query = query.Where(e =>
            e.EventType != "RecoveryCheckpointCreated" &&
            e.EventType != "ActiveSessionUpdated");

        return query;
    }

    // ========================================================================
    // PAGINAÇÃO
    // ========================================================================

    private static async Task<PagedResult<AuditEventDto>> ExecutePagedQueryAsync(
        IQueryable<AuditEvent> query, AuditQueryFilter filter, CancellationToken ct)
    {
        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(e => e.OccurredAt)
            .ThenByDescending(e => e.Id)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(ct);

        var totalPages = totalCount > 0
            ? (int)Math.Ceiling((double)totalCount / filter.PageSize)
            : 0;

        return new PagedResult<AuditEventDto>(
            items.Select(AuditEventDto.FromEntity).ToList(),
            filter.Page,
            filter.PageSize,
            totalCount,
            totalPages
        );
    }
}
