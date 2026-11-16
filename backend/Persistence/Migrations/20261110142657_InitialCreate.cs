using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "events",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    scheduled_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    primary_color = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: false),
                    secondary_color = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: false),
                    logo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    tagline = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    pitch_duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    qa_duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    voting_duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    lockout_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_events", x => x.id);
                    table.CheckConstraint("ck_event_status", "status BETWEEN 0 AND 4");
                });

            migrationBuilder.CreateTable(
                name: "judges",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    company = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    role = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    avatar_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    bio = table.Column<string>(type: "text", nullable: true),
                    expertise = table.Column<string[]>(type: "text[]", nullable: true),
                    social_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_judges", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    event_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    pitch_leader = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    track = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    logo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    cover_image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    presentation_started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    presentation_ended_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.id);
                    table.CheckConstraint("ck_project_status", "status BETWEEN 0 AND 3");
                    table.ForeignKey(
                        name: "FK_projects_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "event_jury_assignments",
                columns: table => new
                {
                    event_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    chair_id = table.Column<int>(type: "integer", nullable: false),
                    judge_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    assigned_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_jury_assignments", x => new { x.event_id, x.chair_id });
                    table.CheckConstraint("ck_chair_id", "chair_id BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_event_jury_assignments_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_event_jury_assignments_judges_judge_id",
                        column: x => x.judge_id,
                        principalTable: "judges",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "active_session_state",
                columns: table => new
                {
                    singleton_id = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    current_event_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    current_project_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    pitch_stage = table.Column<int>(type: "integer", nullable: false),
                    pitch_stage_started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    current_stage_duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    is_paused = table.Column<bool>(type: "boolean", nullable: false),
                    paused_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    total_paused_seconds = table.Column<double>(type: "double precision", nullable: false),
                    last_updated = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_active_session_state", x => x.singleton_id);
                    table.CheckConstraint("ck_pitch_stage", "pitch_stage BETWEEN 0 AND 5");
                    table.CheckConstraint("ck_singleton_id", "singleton_id = 1");
                    table.ForeignKey(
                        name: "FK_active_session_state_events_current_event_id",
                        column: x => x.current_event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_active_session_state_projects_current_project_id",
                        column: x => x.current_project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "round_history_entries",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    event_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    project_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    project_title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    pitch_leader = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    track = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    duration_seconds = table.Column<double>(type: "double precision", nullable: false),
                    effective_duration_seconds = table.Column<double>(type: "double precision", nullable: false),
                    last_stage_reached = table.Column<int>(type: "integer", nullable: false),
                    turned_chairs = table.Column<int[]>(type: "int[]", nullable: false),
                    turned_chair_count = table.Column<int>(type: "integer", nullable: false),
                    total_chairs = table.Column<int>(type: "integer", nullable: false, defaultValue: 5),
                    total_paused_seconds = table.Column<double>(type: "double precision", nullable: false),
                    archived_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    result = table.Column<int>(type: "integer", nullable: false),
                    approval_mode = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    timer_config_snapshot = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_round_history_entries", x => x.id);
                    table.CheckConstraint("ck_round_approval_mode", "approval_mode BETWEEN 0 AND 3");
                    table.CheckConstraint("ck_round_last_stage", "last_stage_reached BETWEEN 0 AND 5");
                    table.CheckConstraint("ck_round_result", "result BETWEEN 0 AND 2");
                    table.ForeignKey(
                        name: "FK_round_history_entries_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_round_history_entries_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_active_session_state_current_event_id",
                table: "active_session_state",
                column: "current_event_id");

            migrationBuilder.CreateIndex(
                name: "IX_active_session_state_current_project_id",
                table: "active_session_state",
                column: "current_project_id");

            migrationBuilder.CreateIndex(
                name: "idx_jury_assignments_judge_id",
                table: "event_jury_assignments",
                column: "judge_id");

            migrationBuilder.CreateIndex(
                name: "idx_judges_is_active",
                table: "judges",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "idx_judges_name",
                table: "judges",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "idx_projects_event_id",
                table: "projects",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "idx_projects_event_order",
                table: "projects",
                columns: new[] { "event_id", "order_index" });

            migrationBuilder.CreateIndex(
                name: "idx_round_history_archived_at",
                table: "round_history_entries",
                column: "archived_at");

            migrationBuilder.CreateIndex(
                name: "idx_round_history_event_id",
                table: "round_history_entries",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "idx_round_history_project_id",
                table: "round_history_entries",
                column: "project_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "active_session_state");

            migrationBuilder.DropTable(
                name: "event_jury_assignments");

            migrationBuilder.DropTable(
                name: "round_history_entries");

            migrationBuilder.DropTable(
                name: "judges");

            migrationBuilder.DropTable(
                name: "projects");

            migrationBuilder.DropTable(
                name: "events");
        }
    }
}
