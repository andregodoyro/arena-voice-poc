using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class SoundLibraryItemConfiguration : IEntityTypeConfiguration<SoundLibraryItem>
{
    public void Configure(EntityTypeBuilder<SoundLibraryItem> builder)
    {
        builder.ToTable("sound_library");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Key).HasColumnName("key").HasMaxLength(100).IsRequired();
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
        builder.Property(x => x.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
        builder.Property(x => x.Url).HasColumnName("url").HasMaxLength(300).IsRequired();
        builder.Property(x => x.Bus).HasColumnName("bus").HasMaxLength(20).IsRequired();
        builder.Property(x => x.DefaultVolume).HasColumnName("default_volume").HasDefaultValue(0.8);
        builder.Property(x => x.IsLoop).HasColumnName("is_loop").HasDefaultValue(false);
        builder.Property(x => x.OffsetSeconds).HasColumnName("offset_seconds").HasDefaultValue(0.0);
        builder.Property(x => x.DurationSeconds).HasColumnName("duration_seconds");
        builder.Property(x => x.PackName).HasColumnName("pack_name").HasMaxLength(100).HasDefaultValue("default").IsRequired();
        builder.Property(x => x.IsBuiltIn).HasColumnName("is_built_in").HasDefaultValue(false);
        builder.Property(x => x.IsEnabled).HasColumnName("is_enabled").HasDefaultValue(true);
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(x => x.Key).IsUnique().HasDatabaseName("ix_sound_library_key");
        builder.HasIndex(x => x.Category).HasDatabaseName("ix_sound_library_category");
        builder.HasIndex(x => x.Bus).HasDatabaseName("ix_sound_library_bus");
        builder.HasIndex(x => x.IsEnabled).HasDatabaseName("ix_sound_library_is_enabled");
    }
}
