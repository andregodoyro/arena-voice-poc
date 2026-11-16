using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class EventJuryAssignmentConfiguration : IEntityTypeConfiguration<EventJuryAssignment>
{
    public void Configure(EntityTypeBuilder<EventJuryAssignment> builder)
    {
        builder.ToTable("event_jury_assignments", t =>
        {
            t.HasCheckConstraint("ck_chair_id", "chair_id BETWEEN 1 AND 5");
        });

        // Chave primária composta: EventId + ChairId (1 jurado por cadeira no evento)
        builder.HasKey(a => new { a.EventId, a.ChairId });

        builder.Property(a => a.EventId).HasColumnName("event_id").HasMaxLength(64).IsRequired();
        builder.Property(a => a.ChairId).HasColumnName("chair_id").IsRequired();
        builder.Property(a => a.JudgeId).HasColumnName("judge_id").HasMaxLength(64).IsRequired();
        builder.Property(a => a.AssignedAt).HasColumnName("assigned_at").IsRequired();

        // Relacionamento com Judge (FK -> judges.id)
        builder.HasOne(a => a.Judge)
            .WithMany()
            .HasForeignKey(a => a.JudgeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.JudgeId).HasDatabaseName("idx_jury_assignments_judge_id");
    }
}
