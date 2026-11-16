namespace ArenaVoicePocBackend.Domain;

public record BackupRequest(
    string BackupId,
    string TriggerType,
    DateTimeOffset RequestedAt,
    string? ActorId = null,
    string? ActorName = null,
    string? SourceIp = null,
    int? RoundNumber = null,
    string? CorrelationId = null
);
