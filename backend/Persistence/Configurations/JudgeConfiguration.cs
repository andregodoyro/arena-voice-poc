using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class JudgeConfiguration : IEntityTypeConfiguration<Judge>
{
    public void Configure(EntityTypeBuilder<Judge> builder)
    {
        builder.ToTable("judges");

        builder.HasKey(j => j.Id);
        builder.Property(j => j.Id).HasColumnName("id").HasMaxLength(64);

        builder.Property(j => j.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(j => j.Company).HasColumnName("company").HasMaxLength(150).IsRequired();
        builder.Property(j => j.Role).HasColumnName("role").HasMaxLength(150).IsRequired();
        builder.Property(j => j.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(500).IsRequired();
        builder.Property(j => j.Bio).HasColumnName("bio").HasColumnType("text");

        // PostgreSQL Array nativo (text[])
        builder.Property(j => j.Expertise)
            .HasColumnName("expertise")
            .HasColumnType("text[]");

        builder.Property(j => j.SocialUrl).HasColumnName("social_url").HasMaxLength(500);
        builder.Property(j => j.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(j => j.Email).HasColumnName("email").HasMaxLength(200);
        builder.Property(j => j.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(j => j.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(j => j.Name).HasDatabaseName("idx_judges_name");
        builder.HasIndex(j => j.IsActive).HasDatabaseName("idx_judges_is_active");
    }
}
