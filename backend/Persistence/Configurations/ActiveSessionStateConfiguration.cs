using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class ActiveSessionStateConfiguration : IEntityTypeConfiguration<ActiveSessionState>
{
    public void Configure(EntityTypeBuilder<ActiveSessionState> builder)
    {
        builder.ToTable("active_session_state", t =>
        {
            t.HasCheckConstraint("ck_singleton_id", "singleton_id = 1");
            t.HasCheckConstraint("ck_pitch_stage", "pitch_stage BETWEEN 0 AND 5");
        });

        // Chave primária singleton (garante no máximo 1 linha na tabela de sessão)
        builder.HasKey(s => s.SingletonId);
        builder.Property(s => s.SingletonId).HasColumnName("singleton_id").HasDefaultValue(1);

        builder.Property(s => s.CurrentEventId).HasColumnName("current_event_id").HasMaxLength(64);
        builder.Property(s => s.CurrentProjectId).HasColumnName("current_project_id").HasMaxLength(64);

        builder.Property(s => s.PitchStage).HasColumnName("pitch_stage").HasConversion<int>().IsRequired();
        builder.Property(s => s.PitchStageStartedAt).HasColumnName("pitch_stage_started_at");
        builder.Property(s => s.CurrentStageDurationSeconds).HasColumnName("current_stage_duration_seconds").IsRequired();
        builder.Property(s => s.IsPaused).HasColumnName("is_paused").IsRequired();
        builder.Property(s => s.PausedAt).HasColumnName("paused_at");
        builder.Property(s => s.TotalPausedSeconds).HasColumnName("total_paused_seconds").IsRequired();
        builder.Property(s => s.LastUpdated).HasColumnName("last_updated").IsRequired();

        // Foreign keys opcionais apontando para evento e projeto atuais (ON DELETE SET NULL)
        builder.HasOne<Event>()
            .WithMany()
            .HasForeignKey(s => s.CurrentEventId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(s => s.CurrentProjectId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
