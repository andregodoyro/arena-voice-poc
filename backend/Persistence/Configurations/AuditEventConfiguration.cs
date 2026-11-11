using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("audit_events", t =>
        {
            t.HasCheckConstraint("ck_audit_event_version", "event_version >= 1");
            t.HasCheckConstraint("ck_audit_actor_type", "actor_type BETWEEN 0 AND 5");
        });

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id").ValueGeneratedOnAdd();

        builder.Property(a => a.EventVersion)
            .HasColumnName("event_version")
            .HasDefaultValue(1)
            .IsRequired();

        builder.Property(a => a.EventType)
            .HasColumnName("event_type")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(a => a.AggregateType)
            .HasColumnName("aggregate_type")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(a => a.AggregateId)
            .HasColumnName("aggregate_id")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(a => a.ActorType)
            .HasColumnName("actor_type")
            .HasConversion<int>()
            .IsRequired();

        builder.Property(a => a.ActorId)
            .HasColumnName("actor_id")
            .HasMaxLength(100);

        builder.Property(a => a.ActorName)
            .HasColumnName("actor_name")
            .HasMaxLength(200);

        builder.Property(a => a.OccurredAt)
            .HasColumnName("occurred_at")
            .IsRequired();

        builder.Property(a => a.ArenaEventId)
            .HasColumnName("arena_event_id")
            .HasMaxLength(100);

        builder.Property(a => a.ProjectId)
            .HasColumnName("project_id")
            .HasMaxLength(100);

        builder.Property(a => a.RoundId)
            .HasColumnName("round_id")
            .HasMaxLength(50);

        builder.Property(a => a.Payload)
            .HasColumnName("payload")
            .HasColumnType("jsonb")
            .HasDefaultValue("{}")
            .IsRequired();

        builder.Property(a => a.BeforeState)
            .HasColumnName("before_state")
            .HasColumnType("jsonb");

        builder.Property(a => a.AfterState)
            .HasColumnName("after_state")
            .HasColumnType("jsonb");

        builder.Property(a => a.Success)
            .HasColumnName("success")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(a => a.ErrorMessage)
            .HasColumnName("error_message")
            .HasColumnType("text");

        builder.Property(a => a.CorrelationId)
            .HasColumnName("correlation_id")
            .HasMaxLength(100);

        builder.Property(a => a.SourceIp)
            .HasColumnName("source_ip")
            .HasMaxLength(45);

        builder.Property(a => a.Metadata)
            .HasColumnName("metadata")
            .HasColumnType("jsonb");

        // Índices operacionais
        builder.HasIndex(a => a.ArenaEventId).HasDatabaseName("idx_audit_arena_event_id");
        builder.HasIndex(a => a.ProjectId).HasDatabaseName("idx_audit_project_id");
        builder.HasIndex(a => a.EventType).HasDatabaseName("idx_audit_event_type");
        builder.HasIndex(a => a.OccurredAt).HasDatabaseName("idx_audit_occurred_at");
        builder.HasIndex(a => a.ActorType).HasDatabaseName("idx_audit_actor_type");
        builder.HasIndex(a => new { a.AggregateType, a.AggregateId }).HasDatabaseName("idx_audit_aggregate");
    }
}
