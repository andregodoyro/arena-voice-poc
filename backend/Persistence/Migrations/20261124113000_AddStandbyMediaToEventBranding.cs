using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStandbyMediaToEventBranding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "cover_image_url",
                table: "events",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "video_url",
                table: "events",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "media_mode",
                table: "events",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "auto");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "cover_image_url",
                table: "events");

            migrationBuilder.DropColumn(
                name: "video_url",
                table: "events");

            migrationBuilder.DropColumn(
                name: "media_mode",
                table: "events");
        }
    }
}
