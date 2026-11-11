using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain.Entities;

public class AuditEvent
{
    public long Id { get; set; }
    public int EventVersion { get; set; } = 1;
    public string EventType { get; set; } = string.Empty;
    public string AggregateType { get; set; } = string.Empty;
    public string AggregateId { get; set; } = string.Empty;
    public ActorType ActorType { get; set; } = ActorType.Operator;
    public string? ActorId { get; set; }
    public string? ActorName { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public string? ArenaEventId { get; set; }
    public string? ProjectId { get; set; }
    public string? RoundId { get; set; }
    public string Payload { get; set; } = "{}";
    public string? BeforeState { get; set; }
    public string? AfterState { get; set; }
    public bool Success { get; set; } = true;
    public string? ErrorMessage { get; set; }
    public string? CorrelationId { get; set; }
    public string? SourceIp { get; set; }
    public string? Metadata { get; set; }
}
