using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Services;

public record SelectProjectResult(
    bool Success,
    Project? CurrentProject,
    Project? PreviousProject,
    string? ErrorMessage = null,
    Round? ArchivedRound = null
);

public record DeleteProjectResult(bool Success, bool IsActiveProject, bool NotFound);

public record ActivateEventResult(bool Success, Event? ActivatedEvent, Event? PreviousEvent, string? ErrorMessage = null);

public record ArchiveEventResult(bool Success, Event? ArchivedEvent, bool IsActiveEvent, string? ErrorMessage = null);

public record PitchTransitionResult(
    bool Success,
    PitchStage PreviousStage,
    PitchStage CurrentStage,
    DateTimeOffset? StartedAt,
    string? ErrorMessage = null,
    bool IsInvalidTransition = false,
    bool NoActiveProject = false,
    Round? ArchivedRound = null
);

public record PitchResetResult(
    bool Success,
    PitchStage CurrentStage,
    DateTimeOffset StartedAt,
    string? ProjectId
);

public record PitchTimerActionResult(
    bool Success,
    bool IsPaused,
    DateTimeOffset? PausedAt,
    double RemainingSeconds,
    int DurationSeconds,
    string? ErrorMessage = null
);

public record ChairPressResult(
    bool Success,
    bool IsLocked,
    bool IsInvalidChair,
    bool AlreadyTurned,
    int ChairId,
    int ActiveCount,
    string? ErrorMessage = null
);

public record PitchStateDto(
    string? ProjectId,
    PitchStage Stage,
    string StageName,
    int StageCode,
    DateTimeOffset? StageStartedAt,
    double ElapsedSeconds,
    int DurationSeconds,
    double RemainingSeconds,
    bool IsPaused,
    bool IsExpired,
    bool IsVotingAllowed,
    IReadOnlyList<string> AllowedTransitions
);

public record DeleteJudgeResult(
    bool Success,
    bool IsAssignedToActiveEvent,
    bool NotFound,
    string? ErrorMessage = null
);

public record AssignEventJuryResult(
    bool Success,
    IReadOnlyList<EventJuryAssignment>? Jury = null,
    string? ErrorMessage = null
);

public interface IArenaProjectStore
{
    // Contexto de Sessão Ativa
    ActiveContext GetActiveContext();
    Event? GetCurrentEvent();
    Project? GetCurrentProject();
    bool SetCurrentEvent(string eventId);
    bool SetCurrentProject(string? projectId);
    SelectProjectResult SelectProject(string projectId);

    // Eventos e Ciclo de Vida (Milestone 3A & 3C)
    IReadOnlyList<Event> GetAllEvents(EventStatus? statusFilter = null);
    Event? GetEventById(string eventId);
    Event AddEvent(Event evt);
    bool UpdateEvent(Event evt);
    bool DeleteEvent(string eventId);
    ActivateEventResult ActivateEvent(string eventId, EventStatus previousEventStatus = EventStatus.Ready);
    Event? FinishEvent(string eventId);
    ArchiveEventResult ArchiveEvent(string eventId);
    Event? DuplicateEvent(string eventId);

    // Pitch Lifecycle & Timers (Milestone 3B & 3C)
    PitchStateDto GetPitchState();
    PitchTransitionResult TransitionPitch(PitchStage targetStage);
    PitchResetResult ResetPitch();
    PitchTimerActionResult PausePitchTimer();
    PitchTimerActionResult ResumePitchTimer();
    PitchTimerActionResult AdjustPitchTimer(int addSeconds);

    // Cadeiras da Arena & Lockout (Milestone 3C)
    ChairPressResult TryTurnChair(int chairId, string source);
    void ResetChairs();
    IReadOnlyDictionary<int, bool> GetChairStates();
    int GetActiveChairCount();

    // Histórico de Rodadas (Milestone 3D)
    IReadOnlyList<Round> GetRoundHistory(string? eventId = null);
    Round? GetRoundById(string roundId);
    Round? GetLastRound();
    Round? ArchiveCurrentRound(string reason = "Manual");

    // Catálogo Global de Jurados & Alocação de Banca (Milestone 3E)
    IReadOnlyList<Judge> GetAllJudges(bool includeInactive = false);
    Judge? GetJudgeById(string judgeId);
    Judge AddJudge(Judge judge);
    bool UpdateJudge(Judge judge);
    DeleteJudgeResult DeleteJudge(string judgeId);
    IReadOnlyList<EventJuryAssignment> GetEventJury(string eventId);
    AssignEventJuryResult AssignEventJury(string eventId, IReadOnlyList<ArenaVoicePocBackend.Domain.DTOs.JuryAssignmentItemDto> assignments);

    // Projetos
    IReadOnlyList<Project> GetProjectsByEvent(string eventId, bool includeCompleted = false);
    Project? GetProjectById(string projectId);
    Project AddProject(Project project);
    bool UpdateProject(Project project);
    DeleteProjectResult DeleteProject(string projectId);
}
