using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class RoundHistoryConfiguration : IEntityTypeConfiguration<Round>
{
    public void Configure(EntityTypeBuilder<Round> builder)
    {
        builder.ToTable("round_history_entries", t =>
        {
            t.HasCheckConstraint("ck_round_result", "result BETWEEN 0 AND 3");
            t.HasCheckConstraint("ck_round_approval_mode", "approval_mode BETWEEN 0 AND 3");
            t.HasCheckConstraint("ck_round_last_stage", "last_stage_reached BETWEEN 0 AND 5");
        });

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id").HasMaxLength(64);

        builder.Property(r => r.EventId).HasColumnName("event_id").HasMaxLength(64).IsRequired();
        builder.Property(r => r.ProjectId).HasColumnName("project_id").HasMaxLength(64).IsRequired();
        builder.Property(r => r.ProjectTitle).HasColumnName("project_title").HasMaxLength(200).IsRequired();
        builder.Property(r => r.PitchLeader).HasColumnName("pitch_leader").HasMaxLength(150).IsRequired();
        builder.Property(r => r.Track).HasColumnName("track").HasMaxLength(100).IsRequired();

        builder.Property(r => r.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(r => r.EndedAt).HasColumnName("ended_at").IsRequired();
        builder.Property(r => r.DurationSeconds).HasColumnName("duration_seconds").IsRequired();
        builder.Property(r => r.EffectiveDurationSeconds).HasColumnName("effective_duration_seconds").IsRequired();
        builder.Property(r => r.LastStageReached).HasColumnName("last_stage_reached").HasConversion<int>().IsRequired();

        // PostgreSQL Array nativo (int[])
        builder.Property(r => r.TurnedChairs)
            .HasColumnName("turned_chairs")
            .HasColumnType("int[]")
            .IsRequired();

        builder.Property(r => r.TurnedChairCount).HasColumnName("turned_chair_count").IsRequired();
        builder.Property(r => r.TotalChairs).HasColumnName("total_chairs").HasDefaultValue(5).IsRequired();
        builder.Property(r => r.TotalPausedSeconds).HasColumnName("total_paused_seconds").IsRequired();
        builder.Property(r => r.ArchivedAt).HasColumnName("archived_at").IsRequired();

        builder.Property(r => r.Result).HasColumnName("result").HasConversion<int>().IsRequired();
        builder.Property(r => r.ApprovalMode).HasColumnName("approval_mode").HasConversion<int>().IsRequired();

        // PostgreSQL JSONB: Snapshot imutável de TimerConfig
        builder.OwnsOne(r => r.TimerConfig, tc =>
        {
            tc.ToJson("timer_config_snapshot");
        });

        builder.Property(r => r.Notes).HasColumnName("notes").HasColumnType("text");

        // Propriedades reservadas para extensões futuras das Fases 6 e 8 (não mapeadas no schema 4A)
        builder.Ignore(r => r.JudgeScores);
        builder.Ignore(r => r.Scorecards);

        // Relacionamentos com Event e Project (FKs de integridade com ON DELETE CASCADE)
        builder.HasOne<Event>()
            .WithMany()
            .HasForeignKey(r => r.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(r => r.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // Índices de consulta rápida do histórico
        builder.HasIndex(r => r.EventId).HasDatabaseName("idx_round_history_event_id");
        builder.HasIndex(r => r.ProjectId).HasDatabaseName("idx_round_history_project_id");
        builder.HasIndex(r => r.ArchivedAt).HasDatabaseName("idx_round_history_archived_at");
    }
}
