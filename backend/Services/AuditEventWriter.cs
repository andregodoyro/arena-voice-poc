using System.Threading.Channels;
using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ArenaVoicePocBackend.Services;

public class AuditEventWriter : BackgroundService
{
    private readonly Channel<AuditEventRecord> _channel;
    private readonly IDbContextFactory<ArenaDbContext>? _contextFactory;
    private readonly ILogger<AuditEventWriter> _logger;

    private const int BatchSize = 50;
    private static readonly TimeSpan FlushInterval = TimeSpan.FromMilliseconds(200);

    public AuditEventWriter(
        Channel<AuditEventRecord> channel,
        ILogger<AuditEventWriter> logger,
        IDbContextFactory<ArenaDbContext>? contextFactory = null)
    {
        _channel = channel;
        _logger = logger;
        _contextFactory = contextFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 AuditEventWriter: Serviço de escrita assíncrona de auditoria iniciado.");

        var batch = new List<AuditEventRecord>(BatchSize);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                timeoutCts.CancelAfter(FlushInterval);

                try
                {
                    while (batch.Count < BatchSize && await _channel.Reader.WaitToReadAsync(timeoutCts.Token))
                    {
                        while (batch.Count < BatchSize && _channel.Reader.TryRead(out var record))
                        {
                            batch.Add(record);
                        }
                    }
                }
                catch (OperationCanceledException) when (!stoppingToken.IsCancellationRequested)
                {
                    // Timeout normal do FlushInterval atingido — prossegue para persistir o que acumulou no lote
                }

                if (batch.Count > 0)
                {
                    await PersistBatchAsync(batch, stoppingToken);
                    batch.Clear();
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown solicitado
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ AuditEventWriter: Exceção inesperada no loop de consumo de eventos de auditoria.");
        }
        finally
        {
            // Drena itens remanescentes no canal durante encerramento gracioso
            await DrainRemainingAsync();
            _logger.LogInformation("🛑 AuditEventWriter: Serviço de escrita assíncrona finalizado.");
        }
    }

    private async Task PersistBatchAsync(List<AuditEventRecord> batch, CancellationToken ct)
    {
        if (_contextFactory == null)
        {
            _logger.LogDebug("ℹ️ AuditEventWriter: Modo sem DbContextFactory (volátil). {Count} eventos descartados do buffer.", batch.Count);
            return;
        }

        try
        {
            await using var context = await _contextFactory.CreateDbContextAsync(ct);
            var entities = batch.Select(b => b.ToEntity()).ToList();

            context.AuditEvents.AddRange(entities);
            await context.SaveChangesAsync(ct);

            _logger.LogDebug("💾 AuditEventWriter: Lote de {Count} eventos de auditoria persistido no PostgreSQL.", batch.Count);
        }
        catch (Exception ex)
        {
            _logger.LogCritical(
                ex,
                "❌ AuditEventWriter: Falha ao persistir lote de {Count} eventos de auditoria no PostgreSQL.",
                batch.Count
            );
        }
    }

    private async Task DrainRemainingAsync()
    {
        var remainingBatch = new List<AuditEventRecord>();
        while (_channel.Reader.TryRead(out var record))
        {
            remainingBatch.Add(record);
            if (remainingBatch.Count >= BatchSize)
            {
                await PersistBatchAsync(remainingBatch, CancellationToken.None);
                remainingBatch.Clear();
            }
        }

        if (remainingBatch.Count > 0)
        {
            await PersistBatchAsync(remainingBatch, CancellationToken.None);
        }
    }
}
