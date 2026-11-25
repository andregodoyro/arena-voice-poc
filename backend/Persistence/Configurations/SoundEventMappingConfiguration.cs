using ArenaVoicePocBackend.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArenaVoicePocBackend.Persistence.Configurations;

public class SoundEventMappingConfiguration : IEntityTypeConfiguration<SoundEventMapping>
{
    public void Configure(EntityTypeBuilder<SoundEventMapping> builder)
    {
        builder.ToTable("sound_event_mappings");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.EventKey).HasColumnName("event_key").HasMaxLength(100).IsRequired();
        builder.Property(x => x.SoundLibraryItemId).HasColumnName("sound_library_item_id").IsRequired();
        builder.Property(x => x.LayerOrder).HasColumnName("layer_order").HasDefaultValue(0);
        builder.Property(x => x.Enabled).HasColumnName("enabled").HasDefaultValue(true);
        builder.Property(x => x.VolumeOverride).HasColumnName("volume_override");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(x => x.EventKey).HasDatabaseName("ix_sound_event_mappings_event_key");
        builder.HasIndex(x => new { x.EventKey, x.SoundLibraryItemId })
            .IsUnique()
            .HasDatabaseName("ix_sound_event_mappings_event_sound_unique");

        builder.HasOne(x => x.SoundLibraryItem)
            .WithMany(x => x.EventMappings)
            .HasForeignKey(x => x.SoundLibraryItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
