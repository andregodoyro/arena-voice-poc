using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Services;

public record SelectProjectResult(bool Success, Project? CurrentProject, Project? PreviousProject, string? ErrorMessage = null);

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
    bool NoActiveProject = false
);

public record PitchResetResult(
    bool Success,
    PitchStage CurrentStage,
    DateTimeOffset StartedAt,
    string? ProjectId
);

public record PitchStateDto(
    string? ProjectId,
    PitchStage Stage,
    string StageName,
    int StageCode,
    DateTimeOffset? StageStartedAt,
    double ElapsedSeconds,
    IReadOnlyList<string> AllowedTransitions
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

    // Eventos e Ciclo de Vida (Milestone 3A)
    IReadOnlyList<Event> GetAllEvents(EventStatus? statusFilter = null);
    Event? GetEventById(string eventId);
    Event AddEvent(Event evt);
    bool UpdateEvent(Event evt);
    bool DeleteEvent(string eventId);
    ActivateEventResult ActivateEvent(string eventId, EventStatus previousEventStatus = EventStatus.Ready);
    Event? FinishEvent(string eventId);
    ArchiveEventResult ArchiveEvent(string eventId);
    Event? DuplicateEvent(string eventId);

    // Pitch Lifecycle (Milestone 3B)
    PitchStateDto GetPitchState();
    PitchTransitionResult TransitionPitch(PitchStage targetStage);
    PitchResetResult ResetPitch();

    // Projetos
    IReadOnlyList<Project> GetProjectsByEvent(string eventId, bool includeCompleted = false);
    Project? GetProjectById(string projectId);
    Project AddProject(Project project);
    bool UpdateProject(Project project);
    DeleteProjectResult DeleteProject(string projectId);
}
