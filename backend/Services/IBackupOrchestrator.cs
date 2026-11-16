using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.DTOs;

namespace ArenaVoicePocBackend.Services;

public record BackupExecutionResult(
    bool Success,
    string BackupId,
    string? FileName = null,
    string? FilePath = null,
    long SizeBytes = 0,
    TimeSpan Duration = default,
    string? ErrorMessage = null
);

public interface IBackupOrchestrator
{
    /// <summary>
    /// Enfileira uma solicitação de backup no canal assíncrono (não-bloqueante).
    /// </summary>
    ValueTask EnqueueBackupAsync(BackupRequest request, CancellationToken ct = default);

    /// <summary>
    /// Executa o pg_dump em processo separado (invocado pelo BackupWorker).
    /// </summary>
    Task<BackupExecutionResult> ExecuteBackupAsync(BackupRequest request, CancellationToken ct = default);

    /// <summary>
    /// Lista os backups existentes diretamente a partir do filesystem (fonte da verdade).
    /// </summary>
    IReadOnlyList<BackupItemDto> GetAvailableBackups();
}
