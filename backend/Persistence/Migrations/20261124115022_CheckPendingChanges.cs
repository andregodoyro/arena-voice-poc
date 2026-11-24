using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CheckPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Executa com IF EXISTS para garantir idempotência caso a coluna fantasma nunca tenha sido criada no banco físico
            migrationBuilder.Sql("ALTER TABLE events DROP COLUMN IF EXISTS media_items;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
