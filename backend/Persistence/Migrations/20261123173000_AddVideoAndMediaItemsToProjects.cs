using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoAndMediaItemsToProjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "video_url",
                table: "projects",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "media_items",
                table: "projects",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "video_url",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "media_items",
                table: "projects");
        }
    }
}
