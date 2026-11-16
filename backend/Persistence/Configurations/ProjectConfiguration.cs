using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("projects", t =>
        {
            t.HasCheckConstraint("ck_project_status", "status BETWEEN 0 AND 3");
        });

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id").HasMaxLength(64);

        builder.Property(p => p.EventId).HasColumnName("event_id").HasMaxLength(64).IsRequired();
        builder.Property(p => p.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(p => p.PitchLeader).HasColumnName("pitch_leader").HasMaxLength(150).IsRequired();
        builder.Property(p => p.Track).HasColumnName("track").HasMaxLength(100).IsRequired();
        builder.Property(p => p.Description).HasColumnName("description").HasColumnType("text").IsRequired();
        builder.Property(p => p.OrderIndex).HasColumnName("order_index").IsRequired();
        builder.Property(p => p.Status).HasColumnName("status").HasConversion<int>().IsRequired();
        builder.Property(p => p.PresentationStartedAt).HasColumnName("presentation_started_at");
        builder.Property(p => p.PresentationEndedAt).HasColumnName("presentation_ended_at");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at").IsRequired();

        // Owned Type: ProjectMedia
        builder.OwnsOne(p => p.Media, m =>
        {
            m.Property(x => x.LogoUrl).HasColumnName("logo_url").HasMaxLength(500).IsRequired();
            m.Property(x => x.CoverImageUrl).HasColumnName("cover_image_url").HasMaxLength(500).IsRequired();
        });

        // Índices
        builder.HasIndex(p => p.EventId).HasDatabaseName("idx_projects_event_id");
        builder.HasIndex(p => new { p.EventId, p.OrderIndex }).HasDatabaseName("idx_projects_event_order");
    }
}
