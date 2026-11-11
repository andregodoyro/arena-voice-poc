using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditEventsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    event_version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    event_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    aggregate_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    aggregate_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    actor_type = table.Column<int>(type: "integer", nullable: false),
                    actor_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    actor_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    arena_event_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    project_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    round_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    payload = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}"),
                    before_state = table.Column<string>(type: "jsonb", nullable: true),
                    after_state = table.Column<string>(type: "jsonb", nullable: true),
                    success = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    correlation_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    source_ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_events", x => x.id);
                    table.CheckConstraint("ck_audit_actor_type", "actor_type BETWEEN 0 AND 5");
                    table.CheckConstraint("ck_audit_event_version", "event_version >= 1");
                });

            migrationBuilder.CreateIndex(
                name: "idx_audit_actor_type",
                table: "audit_events",
                column: "actor_type");

            migrationBuilder.CreateIndex(
                name: "idx_audit_aggregate",
                table: "audit_events",
                columns: new[] { "aggregate_type", "aggregate_id" });

            migrationBuilder.CreateIndex(
                name: "idx_audit_arena_event_id",
                table: "audit_events",
                column: "arena_event_id");

            migrationBuilder.CreateIndex(
                name: "idx_audit_event_type",
                table: "audit_events",
                column: "event_type");

            migrationBuilder.CreateIndex(
                name: "idx_audit_occurred_at",
                table: "audit_events",
                column: "occurred_at");

            migrationBuilder.CreateIndex(
                name: "idx_audit_project_id",
                table: "audit_events",
                column: "project_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_events");
        }
    }
}
