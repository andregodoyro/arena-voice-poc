namespace ArenaVoicePocBackend.DTOs;

public record BackupItemDto(
    string FileName,
    long SizeBytes,
    string SizeFormatted,
    DateTimeOffset CreatedAt,
    string Trigger,
    string Status,
    int? RoundNumber = null
);
