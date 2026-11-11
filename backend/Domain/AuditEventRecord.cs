using System.Text.Json;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Domain;

public record AuditEventRecord(
    string EventType,
    string AggregateType,
    string AggregateId,
    ActorType ActorType,
    string? ActorId = null,
    string? ActorName = null,
    DateTimeOffset? OccurredAt = null,
    string? ArenaEventId = null,
    string? ProjectId = null,
    string? RoundId = null,
    object? Payload = null,
    object? BeforeState = null,
    object? AfterState = null,
    bool Success = true,
    string? ErrorMessage = null,
    string? CorrelationId = null,
    string? SourceIp = null,
    object? Metadata = null,
    int EventVersion = 1
)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public AuditEvent ToEntity()
    {
        return new AuditEvent
        {
            EventVersion = EventVersion,
            EventType = EventType,
            AggregateType = AggregateType,
            AggregateId = AggregateId,
            ActorType = ActorType,
            ActorId = ActorId,
            ActorName = ActorName,
            OccurredAt = OccurredAt ?? DateTimeOffset.UtcNow,
            ArenaEventId = ArenaEventId,
            ProjectId = ProjectId,
            RoundId = RoundId,
            Payload = SerializeToJson(Payload) ?? "{}",
            BeforeState = SerializeToJson(BeforeState),
            AfterState = SerializeToJson(AfterState),
            Success = Success,
            ErrorMessage = ErrorMessage,
            CorrelationId = CorrelationId,
            SourceIp = SourceIp,
            Metadata = SerializeToJson(Metadata)
        };
    }

    private static string? SerializeToJson(object? value)
    {
        if (value == null) return null;
        if (value is string str) return str;
        try
        {
            return JsonSerializer.Serialize(value, JsonOptions);
        }
        catch
        {
            return value.ToString();
        }
    }
}
