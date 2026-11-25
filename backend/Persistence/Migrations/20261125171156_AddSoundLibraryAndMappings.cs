using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSoundLibraryAndMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sound_library",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    url = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    bus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    default_volume = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.80000000000000004),
                    is_loop = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    offset_seconds = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    duration_seconds = table.Column<double>(type: "double precision", nullable: true),
                    pack_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "default"),
                    is_built_in = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sound_library", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sound_event_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    sound_library_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    layer_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    volume_override = table.Column<double>(type: "double precision", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sound_event_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_sound_event_mappings_sound_library_sound_library_item_id",
                        column: x => x.sound_library_item_id,
                        principalTable: "sound_library",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_sound_event_mappings_event_key",
                table: "sound_event_mappings",
                column: "event_key");

            migrationBuilder.CreateIndex(
                name: "ix_sound_event_mappings_event_sound_unique",
                table: "sound_event_mappings",
                columns: new[] { "event_key", "sound_library_item_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sound_event_mappings_sound_library_item_id",
                table: "sound_event_mappings",
                column: "sound_library_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_sound_library_bus",
                table: "sound_library",
                column: "bus");

            migrationBuilder.CreateIndex(
                name: "ix_sound_library_category",
                table: "sound_library",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "ix_sound_library_is_enabled",
                table: "sound_library",
                column: "is_enabled");

            migrationBuilder.CreateIndex(
                name: "ix_sound_library_key",
                table: "sound_library",
                column: "key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sound_event_mappings");

            migrationBuilder.DropTable(
                name: "sound_library");
        }
    }
}
