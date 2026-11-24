using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasColumnName("id").HasMaxLength(64);

        builder.Property(u => u.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(u => u.Email).HasColumnName("email").HasMaxLength(200).IsRequired();
        builder.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(200).IsRequired();
        builder.Property(u => u.Role)
            .HasColumnName("role")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();
        builder.Property(u => u.IsActive).HasColumnName("is_active").IsRequired().HasDefaultValue(true);
        builder.Property(u => u.RefreshTokenHash).HasColumnName("refresh_token_hash").HasMaxLength(128);
        builder.Property(u => u.RefreshTokenExpiresAt).HasColumnName("refresh_token_expires_at");
        builder.Property(u => u.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(u => u.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(u => u.LastLoginAt).HasColumnName("last_login_at");

        builder.HasIndex(u => u.Email).IsUnique().HasDatabaseName("idx_users_email");
        builder.HasIndex(u => u.Role).HasDatabaseName("idx_users_role");
        builder.HasIndex(u => u.IsActive).HasDatabaseName("idx_users_is_active");
    }
}
