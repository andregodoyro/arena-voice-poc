using ArenaVoicePocBackend.Domain;

namespace ArenaVoicePocBackend.Services;

public interface IAuditEventPublisher
{
    void Publish(AuditEventRecord record);
    ValueTask PublishAsync(AuditEventRecord record, CancellationToken ct = default);
    bool TryPublish(AuditEventRecord record);
}
