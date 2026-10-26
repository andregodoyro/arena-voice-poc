using System.Collections.Concurrent;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Services;

public class ArenaProjectStore : IArenaProjectStore
{
    private readonly ConcurrentDictionary<string, Event> _events = new();
    private readonly ConcurrentDictionary<string, Project> _projects = new();
    private readonly object _contextLock = new();

    private string? _currentEventId;
    private string? _currentProjectId;
    private DateTimeOffset _lastUpdated = DateTimeOffset.UtcNow;

    public ArenaProjectStore()
    {
        SeedInitialData();
    }

    public ActiveContext GetActiveContext()
    {
        lock (_contextLock)
        {
            return new ActiveContext
            {
                CurrentEventId = _currentEventId,
                CurrentProjectId = _currentProjectId,
                LastUpdated = _lastUpdated
            };
        }
    }

    public Event? GetCurrentEvent()
    {
        lock (_contextLock)
        {
            return _currentEventId != null && _events.TryGetValue(_currentEventId, out var evt)
                ? evt
                : null;
        }
    }

    public Project? GetCurrentProject()
    {
        lock (_contextLock)
        {
            return _currentProjectId != null && _projects.TryGetValue(_currentProjectId, out var proj)
                ? proj
                : null;
        }
    }

    public bool SetCurrentEvent(string eventId)
    {
        if (!_events.ContainsKey(eventId)) return false;

        lock (_contextLock)
        {
            _currentEventId = eventId;
            _lastUpdated = DateTimeOffset.UtcNow;

            // Se o projeto atual não pertence ao novo evento, desvincula
            if (_currentProjectId != null && _projects.TryGetValue(_currentProjectId, out var currentProj))
            {
                if (currentProj.EventId != eventId)
                {
                    _currentProjectId = null;
                }
            }
        }
        return true;
    }

    public bool SetCurrentProject(string? projectId)
    {
        if (projectId == null)
        {
            lock (_contextLock)
            {
                if (_currentProjectId != null && _projects.TryGetValue(_currentProjectId, out var prev))
                {
                    if (prev.Status == ProjectStatus.Current)
                        prev.Status = ProjectStatus.Pending;
                }
                _currentProjectId = null;
                _lastUpdated = DateTimeOffset.UtcNow;
            }
            return true;
        }

        if (!_projects.TryGetValue(projectId, out var nextProject)) return false;

        lock (_contextLock)
        {
            foreach (var p in _projects.Values.Where(p => p.EventId == nextProject.EventId))
            {
                if (p.Id == projectId)
                {
                    p.Status = ProjectStatus.Current;
                    p.PresentationStartedAt ??= DateTimeOffset.UtcNow;
                }
                else if (p.Status == ProjectStatus.Current)
                {
                    p.Status = ProjectStatus.Completed;
                    p.PresentationEndedAt ??= DateTimeOffset.UtcNow;
                }
            }

            _currentProjectId = projectId;
            _currentEventId = nextProject.EventId;
            _lastUpdated = DateTimeOffset.UtcNow;
        }
        return true;
    }

    public IReadOnlyList<Event> GetAllEvents() =>
        _events.Values.OrderByDescending(e => e.ScheduledDate).ToList();

    public Event? GetEventById(string eventId) =>
        _events.TryGetValue(eventId, out var evt) ? evt : null;

    public Event AddEvent(Event evt)
    {
        if (string.IsNullOrWhiteSpace(evt.Id))
            evt.Id = $"evt-{Guid.NewGuid():N}"[..12];

        evt.CreatedAt = DateTimeOffset.UtcNow;
        evt.UpdatedAt = DateTimeOffset.UtcNow;
        _events[evt.Id] = evt;
        return evt;
    }

    public bool UpdateEvent(Event evt)
    {
        if (!_events.ContainsKey(evt.Id)) return false;
        evt.UpdatedAt = DateTimeOffset.UtcNow;
        _events[evt.Id] = evt;
        return true;
    }

    public bool DeleteEvent(string eventId)
    {
        var removed = _events.TryRemove(eventId, out _);
        if (removed)
        {
            var related = _projects.Values.Where(p => p.EventId == eventId).Select(p => p.Id).ToList();
            foreach (var pid in related)
            {
                _projects.TryRemove(pid, out _);
            }

            lock (_contextLock)
            {
                if (_currentEventId == eventId)
                {
                    _currentEventId = null;
                    _currentProjectId = null;
                    _lastUpdated = DateTimeOffset.UtcNow;
                }
            }
        }
        return removed;
    }

    public IReadOnlyList<Project> GetProjectsByEvent(string eventId) =>
        _projects.Values
            .Where(p => p.EventId == eventId)
            .OrderBy(p => p.OrderIndex)
            .ToList();

    public Project? GetProjectById(string projectId) =>
        _projects.TryGetValue(projectId, out var proj) ? proj : null;

    public Project AddProject(Project project)
    {
        if (string.IsNullOrWhiteSpace(project.Id))
            project.Id = $"proj-{Guid.NewGuid():N}"[..12];

        project.CreatedAt = DateTimeOffset.UtcNow;
        project.UpdatedAt = DateTimeOffset.UtcNow;
        _projects[project.Id] = project;
        return project;
    }

    public bool UpdateProject(Project project)
    {
        if (!_projects.ContainsKey(project.Id)) return false;
        project.UpdatedAt = DateTimeOffset.UtcNow;
        _projects[project.Id] = project;
        return true;
    }

    public bool DeleteProject(string projectId)
    {
        var removed = _projects.TryRemove(projectId, out _);
        if (removed)
        {
            lock (_contextLock)
            {
                if (_currentProjectId == projectId)
                {
                    _currentProjectId = null;
                    _lastUpdated = DateTimeOffset.UtcNow;
                }
            }
        }
        return removed;
    }

    private void SeedInitialData()
    {
        var defaultEvent = new Event
        {
            Id = "evt-demo-day-2026",
            Title = "Demo Day Inovação 2026",
            Description = "Apresentação dos projetos finalistas do programa de aceleração e inovação aberta.",
            ScheduledDate = new DateTimeOffset(2026, 10, 30, 19, 0, 0, TimeSpan.FromHours(-3)),
            Status = EventStatus.Active,
            Branding = new BrandingConfig
            {
                PrimaryColor = "#d90429",
                SecondaryColor = "#ffd166",
                LogoUrl = "/branding/event-logo.png",
                Tagline = "O palco onde as melhores ideias conquistam as cadeiras."
            }
        };
        _events[defaultEvent.Id] = defaultEvent;
        _currentEventId = defaultEvent.Id;

        var projects = new[]
        {
            new Project
            {
                Id = "proj-neurosync-01",
                EventId = defaultEvent.Id,
                Title = "NeuroSync AI",
                PitchLeader = "Dra. Helena Prado",
                Track = "Healthtech",
                Description = "Plataforma de inteligência artificial aplicada à tele-reabilitação neurológica com sensores IoT vestíveis.",
                OrderIndex = 1,
                Status = ProjectStatus.Current,
                PresentationStartedAt = DateTimeOffset.UtcNow,
                Media = new ProjectMedia
                {
                    LogoUrl = "/samples/neurosync-logo.png",
                    CoverImageUrl = "/samples/neurosync-cover.png"
                }
            },
            new Project
            {
                Id = "proj-ecolog-02",
                EventId = defaultEvent.Id,
                Title = "EcoLog",
                PitchLeader = "Lucas Rocha",
                Track = "Sustentabilidade",
                Description = "Rastreabilidade de cadeias de suprimentos verdes com validação de créditos de carbono em tempo real.",
                OrderIndex = 2,
                Status = ProjectStatus.Pending,
                Media = new ProjectMedia
                {
                    LogoUrl = "/samples/ecolog-logo.png",
                    CoverImageUrl = "/samples/ecolog-cover.png"
                }
            },
            new Project
            {
                Id = "proj-finflow-03",
                EventId = defaultEvent.Id,
                Title = "FinFlow",
                PitchLeader = "Ana Beatriz Silva",
                Track = "Fintech",
                Description = "Motor preditivo de liquidez e fluxo de caixa para PMEs via Open Finance e conciliação bancária autônoma.",
                OrderIndex = 3,
                Status = ProjectStatus.Pending,
                Media = new ProjectMedia
                {
                    LogoUrl = "/samples/finflow-logo.png",
                    CoverImageUrl = "/samples/finflow-cover.png"
                }
            },
            new Project
            {
                Id = "proj-agrosmart-04",
                EventId = defaultEvent.Id,
                Title = "AgroSmart",
                PitchLeader = "Rafael Mendes",
                Track = "Agrotech",
                Description = "Monitoramento autônomo de lavouras e irrigação inteligente com sensores de baixa potência e visão computacional.",
                OrderIndex = 4,
                Status = ProjectStatus.Pending,
                Media = new ProjectMedia
                {
                    LogoUrl = "/samples/agrosmart-logo.png",
                    CoverImageUrl = "/samples/agrosmart-cover.png"
                }
            },
            new Project
            {
                Id = "proj-cybershield-05",
                EventId = defaultEvent.Id,
                Title = "CyberShield",
                PitchLeader = "Mariana Costa",
                Track = "Cibersegurança",
                Description = "Detecção proativa de ameaças e resposta automatizada a incidentes para infraestruturas críticas em nuvem.",
                OrderIndex = 5,
                Status = ProjectStatus.Pending,
                Media = new ProjectMedia
                {
                    LogoUrl = "/samples/cybershield-logo.png",
                    CoverImageUrl = "/samples/cybershield-cover.png"
                }
            }
        };

        foreach (var project in projects)
        {
            _projects[project.Id] = project;
        }

        _currentProjectId = "proj-neurosync-01";
        _lastUpdated = DateTimeOffset.UtcNow;
    }
}
