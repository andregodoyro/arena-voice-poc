using ArenaVoicePocBackend.Domain.Entities;

namespace ArenaVoicePocBackend.Services;

public record SelectProjectResult(bool Success, Project? CurrentProject, Project? PreviousProject, string? ErrorMessage = null);

public record DeleteProjectResult(bool Success, bool IsActiveProject, bool NotFound);

public interface IArenaProjectStore
{
    // Contexto de Sessão Ativa
    ActiveContext GetActiveContext();
    Event? GetCurrentEvent();
    Project? GetCurrentProject();
    bool SetCurrentEvent(string eventId);
    bool SetCurrentProject(string? projectId);
    SelectProjectResult SelectProject(string projectId);

    // Eventos
    IReadOnlyList<Event> GetAllEvents();
    Event? GetEventById(string eventId);
    Event AddEvent(Event evt);
    bool UpdateEvent(Event evt);
    bool DeleteEvent(string eventId);

    // Projetos
    IReadOnlyList<Project> GetProjectsByEvent(string eventId, bool includeCompleted = false);
    Project? GetProjectById(string projectId);
    Project AddProject(Project project);
    bool UpdateProject(Project project);
    DeleteProjectResult DeleteProject(string projectId);
}
