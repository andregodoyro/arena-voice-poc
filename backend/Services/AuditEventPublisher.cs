using System.Threading.Channels;
using ArenaVoicePocBackend.Domain;
using Microsoft.Extensions.Logging;

namespace ArenaVoicePocBackend.Services;

public class AuditEventPublisher : IAuditEventPublisher
{
    private readonly Channel<AuditEventRecord> _channel;
    private readonly ILogger<AuditEventPublisher> _logger;

    public AuditEventPublisher(Channel<AuditEventRecord> channel, ILogger<AuditEventPublisher> logger)
    {
        _channel = channel;
        _logger = logger;
    }

    public void Publish(AuditEventRecord record)
    {
        if (_channel.Writer.TryWrite(record))
        {
            return;
        }

        // Back-pressure: buffer cheio (10.000 itens pendentes). Não descarta silenciosamente!
        _logger.LogWarning(
            "⚠️ AuditEventPublisher: Buffer do canal atingiu capacidade máxima (10.000). Executando espera delimitada para evento {EventType}...",
            record.EventType
        );

        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));
            var writeTask = _channel.Writer.WriteAsync(record, cts.Token).AsTask();
            writeTask.GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            _logger.LogCritical(
                ex,
                "❌ AuditEventPublisher: FALHA CRÍTICA DE BUFFER — Evento {EventType} do aggregate {AggregateType}:{AggregateId} não pôde ser enfileirado.",
                record.EventType,
                record.AggregateType,
                record.AggregateId
            );
        }
    }

    public async ValueTask PublishAsync(AuditEventRecord record, CancellationToken ct = default)
    {
        await _channel.Writer.WriteAsync(record, ct);
    }

    public bool TryPublish(AuditEventRecord record)
    {
        return _channel.Writer.TryWrite(record);
    }
}
