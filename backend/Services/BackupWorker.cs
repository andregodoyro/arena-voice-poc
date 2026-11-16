using System.Threading.Channels;
using ArenaVoicePocBackend.Domain;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ArenaVoicePocBackend.Services;

public class BackupWorker : BackgroundService
{
    private readonly Channel<BackupRequest> _channel;
    private readonly IBackupOrchestrator _orchestrator;
    private readonly ILogger<BackupWorker> _logger;

    public BackupWorker(
        Channel<BackupRequest> channel,
        IBackupOrchestrator orchestrator,
        ILogger<BackupWorker> logger)
    {
        _channel = channel;
        _orchestrator = orchestrator;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 BackupWorker: Serviço assíncrono de orquestração de backups iniciado.");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                if (await _channel.Reader.WaitToReadAsync(stoppingToken))
                {
                    while (_channel.Reader.TryRead(out var request))
                    {
                        try
                        {
                            _logger.LogInformation("⚙️ Processando backup {BackupId} (Gatilho: {Trigger})...",
                                request.BackupId, request.TriggerType);

                            var result = await _orchestrator.ExecuteBackupAsync(request, stoppingToken);

                            if (result.Success)
                            {
                                _logger.LogInformation("✅ Backup {BackupId} concluído com sucesso. Arquivo: {FileName}",
                                    request.BackupId, result.FileName);
                            }
                            else
                            {
                                _logger.LogWarning("⚠️ Backup {BackupId} finalizou com erro: {Error}",
                                    request.BackupId, result.ErrorMessage);
                            }
                        }
                        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                        {
                            break;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "❌ BackupWorker: Falha ao executar backup {BackupId}.", request.BackupId);
                        }
                    }
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown gracioso
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ BackupWorker: Erro no loop de consumo de solicitações de backup.");
        }
        finally
        {
            _logger.LogInformation("🛑 BackupWorker: Serviço assíncrono de backups finalizado.");
        }
    }
}
