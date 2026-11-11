using System.Text.Json;
using ArenaVoicePocBackend.Domain.Entities;

namespace ArenaVoicePocBackend.DTOs;

public record AuditEventDto(
    long Id,
    int EventVersion,
    string EventType,
    string AggregateType,
    string AggregateId,
    string ActorType,
    string? ActorId,
    string? ActorName,
    DateTimeOffset OccurredAt,
    string? ArenaEventId,
    string? ProjectId,
    string? RoundId,
    JsonElement? Payload,
    JsonElement? BeforeState,
    JsonElement? AfterState,
    bool Success,
    string? ErrorMessage,
    string? CorrelationId,
    string? SourceIp,
    JsonElement? Metadata
)
{
    public static AuditEventDto FromEntity(AuditEvent entity)
    {
        return new AuditEventDto(
            entity.Id,
            entity.EventVersion,
            entity.EventType,
            entity.AggregateType,
            entity.AggregateId,
            entity.ActorType.ToString(),
            entity.ActorId,
            entity.ActorName,
            entity.OccurredAt,
            entity.ArenaEventId,
            entity.ProjectId,
            entity.RoundId,
            ParseJson(entity.Payload),
            ParseJson(entity.BeforeState),
            ParseJson(entity.AfterState),
            entity.Success,
            entity.ErrorMessage,
            entity.CorrelationId,
            entity.SourceIp,
            ParseJson(entity.Metadata)
        );
    }

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
        catch
        {
            return null;
        }
    }
}
