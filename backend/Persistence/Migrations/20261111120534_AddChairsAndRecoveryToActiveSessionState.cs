using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArenaVoicePocBackend.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChairsAndRecoveryToActiveSessionState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_round_result",
                table: "round_history_entries");

            migrationBuilder.AddColumn<int>(
                name: "interrupted_stage",
                table: "active_session_state",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "last_checkpoint_at",
                table: "active_session_state",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "recovered_at",
                table: "active_session_state",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "recovered_from_crash",
                table: "active_session_state",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int[]>(
                name: "turned_chairs",
                table: "active_session_state",
                type: "int[]",
                nullable: false,
                defaultValue: new int[0]);

            migrationBuilder.AddCheckConstraint(
                name: "ck_round_result",
                table: "round_history_entries",
                sql: "result BETWEEN 0 AND 3");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_round_result",
                table: "round_history_entries");

            migrationBuilder.DropColumn(
                name: "interrupted_stage",
                table: "active_session_state");

            migrationBuilder.DropColumn(
                name: "last_checkpoint_at",
                table: "active_session_state");

            migrationBuilder.DropColumn(
                name: "recovered_at",
                table: "active_session_state");

            migrationBuilder.DropColumn(
                name: "recovered_from_crash",
                table: "active_session_state");

            migrationBuilder.DropColumn(
                name: "turned_chairs",
                table: "active_session_state");

            migrationBuilder.AddCheckConstraint(
                name: "ck_round_result",
                table: "round_history_entries",
                sql: "result BETWEEN 0 AND 2");
        }
    }
}
