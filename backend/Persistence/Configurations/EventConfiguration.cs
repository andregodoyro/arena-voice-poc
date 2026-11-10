using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("events", t =>
        {
            t.HasCheckConstraint("ck_event_status", "status BETWEEN 0 AND 4");
        });

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id").HasMaxLength(64);

        builder.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(e => e.Description).HasColumnName("description").HasColumnType("text").IsRequired();
        builder.Property(e => e.ScheduledDate).HasColumnName("scheduled_date").IsRequired();
        builder.Property(e => e.Status).HasColumnName("status").HasConversion<int>().IsRequired();
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

        // Owned Type: BrandingConfig
        builder.OwnsOne(e => e.Branding, b =>
        {
            b.Property(p => p.PrimaryColor).HasColumnName("primary_color").HasMaxLength(9).IsRequired();
            b.Property(p => p.SecondaryColor).HasColumnName("secondary_color").HasMaxLength(9).IsRequired();
            b.Property(p => p.LogoUrl).HasColumnName("logo_url").HasMaxLength(500).IsRequired();
            b.Property(p => p.Tagline).HasColumnName("tagline").HasMaxLength(200).IsRequired();
        });

        // Owned Type: TimerConfig
        builder.OwnsOne(e => e.Timers, t =>
        {
            t.Property(p => p.PitchDurationSeconds).HasColumnName("pitch_duration_seconds").IsRequired();
            t.Property(p => p.QaDurationSeconds).HasColumnName("qa_duration_seconds").IsRequired();
            t.Property(p => p.VotingDurationSeconds).HasColumnName("voting_duration_seconds").IsRequired();
            t.Property(p => p.LockoutEnabled).HasColumnName("lockout_enabled").IsRequired();
        });

        // Relacionamentos 1:N
        builder.HasMany<Project>()
            .WithOne()
            .HasForeignKey(p => p.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany<EventJuryAssignment>()
            .WithOne()
            .HasForeignKey(a => a.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
