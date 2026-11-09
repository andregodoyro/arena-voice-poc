using System.Collections.Concurrent;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;

namespace ArenaVoicePocBackend.Services;

public class ArenaProjectStore : IArenaProjectStore
{
    private readonly ConcurrentDictionary<string, Event> _events = new();
    private readonly ConcurrentDictionary<string, Project> _projects = new();
    private readonly object _contextLock = new();

    // Cadeiras físicas da Arena (1 a 5) — Thread-safe
    private readonly ConcurrentDictionary<int, bool> _chairStates = new(new[]
    {
        KeyValuePair.Create(1, false),
        KeyValuePair.Create(2, false),
        KeyValuePair.Create(3, false),
        KeyValuePair.Create(4, false),
        KeyValuePair.Create(5, false)
    });

    private string? _currentEventId;
    private string? _currentProjectId;
    private PitchStage _pitchStage = PitchStage.Waiting;
    private DateTimeOffset? _pitchStageStartedAt = DateTimeOffset.UtcNow;
    private int _stageDurationSeconds = 0;
    private bool _isTimerPaused = false;
    private DateTimeOffset? _timerPausedAt = null;
    private double _totalPausedSeconds = 0.0;
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
                PitchStage = _pitchStage,
                PitchStageStartedAt = _pitchStageStartedAt,
                CurrentStageDurationSeconds = _stageDurationSeconds,
                IsPaused = _isTimerPaused,
                PausedAt = _timerPausedAt,
                TotalPausedSeconds = _totalPausedSeconds,
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

        var res = SelectProject(projectId);
        return res.Success;
    }

    public SelectProjectResult SelectProject(string projectId)
    {
        if (!_projects.TryGetValue(projectId, out var nextProject))
        {
            return new SelectProjectResult(false, null, null, "Projeto não encontrado.");
        }

        lock (_contextLock)
        {
            if (_currentEventId != null && nextProject.EventId != _currentEventId)
            {
                return new SelectProjectResult(false, null, null, "O projeto não pertence ao evento ativo.");
            }

            // Idempotência: se já é o projeto ativo, retorna sucesso e reinicializa pitch para Waiting
            if (_currentProjectId == projectId)
            {
                _pitchStage = PitchStage.Waiting;
                _pitchStageStartedAt = DateTimeOffset.UtcNow;
                _stageDurationSeconds = 0;
                _isTimerPaused = false;
                _timerPausedAt = null;
                _totalPausedSeconds = 0.0;
                ResetChairs();
                _lastUpdated = DateTimeOffset.UtcNow;
                return new SelectProjectResult(true, nextProject, null);
            }

            Project? prevProject = null;

            // Conclui projeto anterior, se houver
            if (_currentProjectId != null && _projects.TryGetValue(_currentProjectId, out var prev))
            {
                if (prev.Status == ProjectStatus.Current)
                {
                    prev.Status = ProjectStatus.Completed;
                    prev.PresentationEndedAt ??= DateTimeOffset.UtcNow;
                    prev.UpdatedAt = DateTimeOffset.UtcNow;
                    prevProject = prev;
                }
            }

            // Atualiza status do novo projeto
            nextProject.Status = ProjectStatus.Current;
            nextProject.PresentationStartedAt ??= DateTimeOffset.UtcNow;
            nextProject.UpdatedAt = DateTimeOffset.UtcNow;

            _currentProjectId = projectId;
            _currentEventId = nextProject.EventId;
            _pitchStage = PitchStage.Waiting;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;
            _stageDurationSeconds = 0;
            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            ResetChairs();
            _lastUpdated = DateTimeOffset.UtcNow;

            return new SelectProjectResult(true, nextProject, prevProject);
        }
    }

    public IReadOnlyList<Event> GetAllEvents(EventStatus? statusFilter = null)
    {
        var query = _events.Values.AsEnumerable();
        if (statusFilter.HasValue)
        {
            query = query.Where(e => e.Status == statusFilter.Value);
        }
        return query.OrderByDescending(e => e.ScheduledDate).ToList();
    }

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

    public ActivateEventResult ActivateEvent(string eventId, EventStatus previousEventStatus = EventStatus.Ready)
    {
        if (!_events.TryGetValue(eventId, out var targetEvent))
        {
            return new ActivateEventResult(false, null, null, "Evento não encontrado.");
        }

        lock (_contextLock)
        {
            if (_currentEventId == eventId && targetEvent.Status == EventStatus.Active)
            {
                return new ActivateEventResult(true, targetEvent, null);
            }

            Event? prevEvent = null;
            if (_currentEventId != null && _events.TryGetValue(_currentEventId, out var prev))
            {
                if (prev.Id != eventId)
                {
                    prev.Status = previousEventStatus;
                    prev.UpdatedAt = DateTimeOffset.UtcNow;
                    prevEvent = prev;
                }
            }

            targetEvent.Status = EventStatus.Active;
            targetEvent.UpdatedAt = DateTimeOffset.UtcNow;

            _currentEventId = targetEvent.Id;
            _currentProjectId = null;
            _pitchStage = PitchStage.Waiting;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;
            _stageDurationSeconds = 0;
            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            ResetChairs();
            _lastUpdated = DateTimeOffset.UtcNow;

            return new ActivateEventResult(true, targetEvent, prevEvent);
        }
    }

    public Event? FinishEvent(string eventId)
    {
        if (!_events.TryGetValue(eventId, out var evt))
        {
            return null;
        }

        lock (_contextLock)
        {
            evt.Status = EventStatus.Finished;
            evt.UpdatedAt = DateTimeOffset.UtcNow;
            _lastUpdated = DateTimeOffset.UtcNow;
            return evt;
        }
    }

    public ArchiveEventResult ArchiveEvent(string eventId)
    {
        if (!_events.TryGetValue(eventId, out var evt))
        {
            return new ArchiveEventResult(false, null, false, "Evento não encontrado.");
        }

        lock (_contextLock)
        {
            if (_currentEventId == eventId)
            {
                return new ArchiveEventResult(false, null, true, "Não é possível arquivar o evento atualmente ativo na arena. Ative outro evento antes de arquivar.");
            }

            evt.Status = EventStatus.Archived;
            evt.UpdatedAt = DateTimeOffset.UtcNow;
            return new ArchiveEventResult(true, evt, false);
        }
    }

    public Event? DuplicateEvent(string eventId)
    {
        if (!_events.TryGetValue(eventId, out var source))
        {
            return null;
        }

        var clonedId = $"evt-{Guid.NewGuid():N}"[..12];
        var cloned = new Event
        {
            Id = clonedId,
            Title = $"{source.Title} (Cópia)",
            Description = source.Description,
            ScheduledDate = source.ScheduledDate.AddDays(7),
            Status = EventStatus.Draft,
            Branding = new BrandingConfig
            {
                PrimaryColor = source.Branding.PrimaryColor,
                SecondaryColor = source.Branding.SecondaryColor,
                LogoUrl = source.Branding.LogoUrl,
                Tagline = source.Branding.Tagline
            },
            Timers = new TimerConfig
            {
                PitchDurationSeconds = source.Timers.PitchDurationSeconds,
                QaDurationSeconds = source.Timers.QaDurationSeconds,
                VotingDurationSeconds = source.Timers.VotingDurationSeconds,
                LockoutEnabled = source.Timers.LockoutEnabled
            },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _events[cloned.Id] = cloned;
        return cloned;
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
                    _pitchStage = PitchStage.Waiting;
                    _pitchStageStartedAt = DateTimeOffset.UtcNow;
                    _stageDurationSeconds = 0;
                    _isTimerPaused = false;
                    _timerPausedAt = null;
                    _totalPausedSeconds = 0.0;
                    ResetChairs();
                    _lastUpdated = DateTimeOffset.UtcNow;
                }
            }
        }
        return removed;
    }

    public IReadOnlyList<Project> GetProjectsByEvent(string eventId, bool includeCompleted = false)
    {
        var query = _projects.Values.Where(p => p.EventId == eventId);
        if (!includeCompleted)
        {
            query = query.Where(p => p.Status != ProjectStatus.Completed);
        }
        return query.OrderBy(p => p.OrderIndex).ToList();
    }

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

    public DeleteProjectResult DeleteProject(string projectId)
    {
        lock (_contextLock)
        {
            if (_currentProjectId == projectId)
            {
                return new DeleteProjectResult(Success: false, IsActiveProject: true, NotFound: false);
            }
        }

        var removed = _projects.TryRemove(projectId, out _);
        if (!removed)
        {
            return new DeleteProjectResult(Success: false, IsActiveProject: false, NotFound: true);
        }

        return new DeleteProjectResult(Success: true, IsActiveProject: false, NotFound: false);
    }

    public PitchStateDto GetPitchState()
    {
        lock (_contextLock)
        {
            var now = DateTimeOffset.UtcNow;
            double elapsed;
            if (_pitchStageStartedAt.HasValue)
            {
                if (_isTimerPaused && _timerPausedAt.HasValue)
                {
                    elapsed = Math.Max(0.0, (_timerPausedAt.Value - _pitchStageStartedAt.Value).TotalSeconds - _totalPausedSeconds);
                }
                else
                {
                    elapsed = Math.Max(0.0, (now - _pitchStageStartedAt.Value).TotalSeconds - _totalPausedSeconds);
                }
            }
            else
            {
                elapsed = 0.0;
            }

            double remaining = _stageDurationSeconds > 0
                ? Math.Max(0.0, _stageDurationSeconds - elapsed)
                : 0.0;

            bool isExpired = _stageDurationSeconds > 0 && remaining <= 0.0;

            var currentEvent = GetCurrentEvent();
            bool lockoutActive = currentEvent?.Timers?.LockoutEnabled ?? false;
            bool isVotingAllowed = !lockoutActive || (_pitchStage == PitchStage.VotingOpen && !_isTimerPaused);

            var allowed = GetAllowedTransitions(_pitchStage);

            return new PitchStateDto(
                _currentProjectId,
                _pitchStage,
                _pitchStage.ToString(),
                (int)_pitchStage,
                _pitchStageStartedAt,
                Math.Round(elapsed, 1),
                _stageDurationSeconds,
                Math.Round(remaining, 1),
                _isTimerPaused,
                isExpired,
                isVotingAllowed,
                allowed
            );
        }
    }

    public PitchTransitionResult TransitionPitch(PitchStage targetStage)
    {
        lock (_contextLock)
        {
            if (string.IsNullOrEmpty(_currentProjectId))
            {
                return new PitchTransitionResult(
                    Success: false,
                    PreviousStage: _pitchStage,
                    CurrentStage: _pitchStage,
                    StartedAt: _pitchStageStartedAt,
                    ErrorMessage: "Nenhum projeto ativo selecionado no momento.",
                    NoActiveProject: true
                );
            }

            if (_pitchStage == PitchStage.Finished)
            {
                return new PitchTransitionResult(
                    Success: false,
                    PreviousStage: _pitchStage,
                    CurrentStage: _pitchStage,
                    StartedAt: _pitchStageStartedAt,
                    ErrorMessage: "A apresentação já está no estado Finished (terminal). Selecione o próximo projeto para iniciar nova rodada.",
                    IsInvalidTransition: true
                );
            }

            if (!IsValidTransition(_pitchStage, targetStage))
            {
                return new PitchTransitionResult(
                    Success: false,
                    PreviousStage: _pitchStage,
                    CurrentStage: _pitchStage,
                    StartedAt: _pitchStageStartedAt,
                    ErrorMessage: $"Transição inválida de '{_pitchStage}' para '{targetStage}'.",
                    IsInvalidTransition: true
                );
            }

            var prev = _pitchStage;
            _pitchStage = targetStage;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;

            // Determina a duração alocada com base no TimerConfig do evento ativo
            var currentEvent = GetCurrentEvent();
            var timerConfig = currentEvent?.Timers ?? new TimerConfig();
            _stageDurationSeconds = targetStage switch
            {
                PitchStage.PitchRunning => timerConfig.PitchDurationSeconds,
                PitchStage.QA => timerConfig.QaDurationSeconds,
                PitchStage.VotingOpen => timerConfig.VotingDurationSeconds,
                _ => 0
            };

            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            _lastUpdated = DateTimeOffset.UtcNow;

            if (targetStage == PitchStage.Finished && _currentProjectId != null && _projects.TryGetValue(_currentProjectId, out var project))
            {
                project.Status = ProjectStatus.Completed;
                project.PresentationEndedAt ??= DateTimeOffset.UtcNow;
                project.UpdatedAt = DateTimeOffset.UtcNow;
            }

            return new PitchTransitionResult(
                Success: true,
                PreviousStage: prev,
                CurrentStage: _pitchStage,
                StartedAt: _pitchStageStartedAt
            );
        }
    }

    public PitchResetResult ResetPitch()
    {
        lock (_contextLock)
        {
            _pitchStage = PitchStage.Waiting;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;
            _stageDurationSeconds = 0;
            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            ResetChairs();
            _lastUpdated = DateTimeOffset.UtcNow;

            return new PitchResetResult(
                Success: true,
                CurrentStage: _pitchStage,
                StartedAt: _pitchStageStartedAt.Value,
                ProjectId: _currentProjectId
            );
        }
    }

    public PitchTimerActionResult PausePitchTimer()
    {
        lock (_contextLock)
        {
            if (_pitchStage == PitchStage.Waiting || _pitchStage == PitchStage.Finished)
            {
                return new PitchTimerActionResult(false, _isTimerPaused, _timerPausedAt, 0, _stageDurationSeconds,
                    $"Não é possível pausar cronômetro no estágio '{_pitchStage}'.");
            }

            if (_isTimerPaused)
            {
                var currentState = GetPitchState();
                return new PitchTimerActionResult(true, _isTimerPaused, _timerPausedAt, currentState.RemainingSeconds, _stageDurationSeconds);
            }

            _isTimerPaused = true;
            _timerPausedAt = DateTimeOffset.UtcNow;
            _lastUpdated = DateTimeOffset.UtcNow;

            var state = GetPitchState();
            return new PitchTimerActionResult(true, true, _timerPausedAt, state.RemainingSeconds, _stageDurationSeconds);
        }
    }

    public PitchTimerActionResult ResumePitchTimer()
    {
        lock (_contextLock)
        {
            if (!_isTimerPaused)
            {
                var currentState = GetPitchState();
                return new PitchTimerActionResult(true, false, null, currentState.RemainingSeconds, _stageDurationSeconds);
            }

            if (_timerPausedAt.HasValue)
            {
                var pauseDelta = (DateTimeOffset.UtcNow - _timerPausedAt.Value).TotalSeconds;
                _totalPausedSeconds += Math.Max(0.0, pauseDelta);
            }

            _isTimerPaused = false;
            _timerPausedAt = null;
            _lastUpdated = DateTimeOffset.UtcNow;

            var state = GetPitchState();
            return new PitchTimerActionResult(true, false, null, state.RemainingSeconds, _stageDurationSeconds);
        }
    }

    public PitchTimerActionResult AdjustPitchTimer(int addSeconds)
    {
        lock (_contextLock)
        {
            if (_pitchStage == PitchStage.Waiting || _pitchStage == PitchStage.Finished)
            {
                return new PitchTimerActionResult(false, _isTimerPaused, _timerPausedAt, 0, _stageDurationSeconds,
                    $"Não é possível ajustar tempo no estágio '{_pitchStage}'.");
            }

            _stageDurationSeconds = Math.Max(0, _stageDurationSeconds + addSeconds);
            _lastUpdated = DateTimeOffset.UtcNow;

            var state = GetPitchState();
            return new PitchTimerActionResult(true, _isTimerPaused, _timerPausedAt, state.RemainingSeconds, _stageDurationSeconds);
        }
    }

    // =========================================================================
    // CADEIRAS & LOCKOUT AUTORITATIVO (Milestone 3C)
    // =========================================================================

    public ChairPressResult TryTurnChair(int chairId, string source)
    {
        lock (_contextLock)
        {
            if (chairId < 1 || chairId > 5)
            {
                return new ChairPressResult(
                    Success: false,
                    IsLocked: false,
                    IsInvalidChair: true,
                    AlreadyTurned: false,
                    ChairId: chairId,
                    ActiveCount: GetActiveChairCount(),
                    ErrorMessage: $"chairId inválido: {chairId}. Deve ser um número entre 1 e 5."
                );
            }

            var currentEvent = GetCurrentEvent();
            bool lockoutActive = currentEvent?.Timers?.LockoutEnabled ?? false;

            if (lockoutActive && (_pitchStage != PitchStage.VotingOpen || _isTimerPaused))
            {
                var reason = _isTimerPaused
                    ? "Votação temporariamente suspensa (cronômetro pausado)."
                    : $"Votação bloqueada: o estágio atual é '{_pitchStage}' (votos permitidos exclusivamente em 'VotingOpen').";

                return new ChairPressResult(
                    Success: false,
                    IsLocked: true,
                    IsInvalidChair: false,
                    AlreadyTurned: _chairStates.TryGetValue(chairId, out var turned) && turned,
                    ChairId: chairId,
                    ActiveCount: GetActiveChairCount(),
                    ErrorMessage: reason
                );
            }

            bool wasAlready = _chairStates.TryGetValue(chairId, out var current) && current;
            _chairStates[chairId] = true;
            _lastUpdated = DateTimeOffset.UtcNow;

            return new ChairPressResult(
                Success: true,
                IsLocked: false,
                IsInvalidChair: false,
                AlreadyTurned: wasAlready,
                ChairId: chairId,
                ActiveCount: GetActiveChairCount()
            );
        }
    }

    public void ResetChairs()
    {
        foreach (var key in _chairStates.Keys)
        {
            _chairStates[key] = false;
        }
    }

    public IReadOnlyDictionary<int, bool> GetChairStates() => _chairStates;

    public int GetActiveChairCount() => _chairStates.Values.Count(c => c);

    private static IReadOnlyList<string> GetAllowedTransitions(PitchStage stage) => stage switch
    {
        PitchStage.Waiting => new[] { nameof(PitchStage.PitchRunning) },
        PitchStage.PitchRunning => new[] { nameof(PitchStage.QA), nameof(PitchStage.VotingOpen), nameof(PitchStage.Waiting) },
        PitchStage.QA => new[] { nameof(PitchStage.VotingOpen), nameof(PitchStage.PitchRunning) },
        PitchStage.VotingOpen => new[] { nameof(PitchStage.VotingClosed), nameof(PitchStage.QA) },
        PitchStage.VotingClosed => new[] { nameof(PitchStage.Finished), nameof(PitchStage.VotingOpen) },
        PitchStage.Finished => Array.Empty<string>(),
        _ => Array.Empty<string>()
    };

    private static bool IsValidTransition(PitchStage from, PitchStage to) => (from, to) switch
    {
        (PitchStage.Waiting, PitchStage.PitchRunning) => true,
        (PitchStage.PitchRunning, PitchStage.QA) => true,
        (PitchStage.PitchRunning, PitchStage.VotingOpen) => true,
        (PitchStage.PitchRunning, PitchStage.Waiting) => true,
        (PitchStage.QA, PitchStage.VotingOpen) => true,
        (PitchStage.QA, PitchStage.PitchRunning) => true,
        (PitchStage.VotingOpen, PitchStage.VotingClosed) => true,
        (PitchStage.VotingOpen, PitchStage.QA) => true,
        (PitchStage.VotingClosed, PitchStage.Finished) => true,
        (PitchStage.VotingClosed, PitchStage.VotingOpen) => true,
        _ => false
    };

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
            },
            Timers = new TimerConfig
            {
                PitchDurationSeconds = 180,
                QaDurationSeconds = 120,
                VotingDurationSeconds = 30,
                LockoutEnabled = false // Mantém compatibilidade livre para suítes legadas do Marco 1/2
            }
        };
        _events[defaultEvent.Id] = defaultEvent;
        _currentEventId = defaultEvent.Id;

        // Catálogo e governança de eventos (Milestone 3A & 3C)
        var readyEvent = new Event
        {
            Id = "evt-hackathon-ferrolab",
            Title = "Hackathon FerroLab",
            Description = "Maratona de inovação tecnológica focada em inteligência artificial e automação industrial.",
            ScheduledDate = DateTimeOffset.UtcNow.AddDays(7),
            Status = EventStatus.Ready,
            Branding = new BrandingConfig
            {
                PrimaryColor = "#00b4d8",
                SecondaryColor = "#ffb703",
                LogoUrl = "/samples/ferrolab-logo.png",
                Tagline = "Forjando o futuro da indústria com inteligência artificial."
            },
            Timers = new TimerConfig
            {
                PitchDurationSeconds = 180,
                QaDurationSeconds = 120,
                VotingDurationSeconds = 30,
                LockoutEnabled = true // Evento moderno 3C com Lockout estrito
            }
        };
        _events[readyEvent.Id] = readyEvent;

        var draftEvent = new Event
        {
            Id = "evt-startup-challenge",
            Title = "Startup Challenge 2027",
            Description = "Competição de novos modelos de negócio e aceleração de venture capital.",
            ScheduledDate = DateTimeOffset.UtcNow.AddDays(21),
            Status = EventStatus.Draft,
            Branding = new BrandingConfig
            {
                PrimaryColor = "#7209b7",
                SecondaryColor = "#4cc9f0",
                LogoUrl = "/samples/challenge-logo.png",
                Tagline = "A próxima geração de unicórnios começa aqui."
            },
            Timers = new TimerConfig
            {
                PitchDurationSeconds = 180,
                QaDurationSeconds = 120,
                VotingDurationSeconds = 30,
                LockoutEnabled = true
            }
        };
        _events[draftEvent.Id] = draftEvent;

        var archivedEvent = new Event
        {
            Id = "evt-innovation-summit-2025",
            Title = "Innovation Summit 2025",
            Description = "Edição anterior do summit executivo de liderança e pitches corporativos.",
            ScheduledDate = DateTimeOffset.UtcNow.AddDays(-180),
            Status = EventStatus.Archived,
            Branding = new BrandingConfig
            {
                PrimaryColor = "#2b2d42",
                SecondaryColor = "#8d99ae",
                LogoUrl = "/samples/summit-logo.png",
                Tagline = "Histórico oficial dos pitches homologados."
            },
            Timers = new TimerConfig
            {
                PitchDurationSeconds = 180,
                QaDurationSeconds = 120,
                VotingDurationSeconds = 30,
                LockoutEnabled = true
            }
        };
        _events[archivedEvent.Id] = archivedEvent;

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
