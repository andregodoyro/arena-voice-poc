using ArenaVoicePocBackend.Domain.Entities;

namespace ArenaVoicePocBackend.Services;

public interface IArenaProjectStore
{
    // Contexto de Sessão Ativa
    ActiveContext GetActiveContext();
    Event? GetCurrentEvent();
    Project? GetCurrentProject();
    bool SetCurrentEvent(string eventId);
    bool SetCurrentProject(string? projectId);

    // Eventos
    IReadOnlyList<Event> GetAllEvents();
    Event? GetEventById(string eventId);
    Event AddEvent(Event evt);
    bool UpdateEvent(Event evt);
    bool DeleteEvent(string eventId);

    // Projetos
    IReadOnlyList<Project> GetProjectsByEvent(string eventId);
    Project? GetProjectById(string projectId);
    Project AddProject(Project project);
    bool UpdateProject(Project project);
    bool DeleteProject(string projectId);
}
