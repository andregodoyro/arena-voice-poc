using System.Collections.Concurrent;
using ArenaVoicePocBackend.Domain;
using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ArenaVoicePocBackend.Services;

public class PostgresArenaProjectStore : IArenaProjectStore
{
    private readonly IDbContextFactory<ArenaDbContext> _contextFactory;
    private readonly IAuditEventPublisher? _auditPublisher;
    private readonly object _contextLock = new();
    private readonly object _dbPersistenceLock = new();

    // -------------------------------------------------------------------------
    // HOT-CACHE EM MEMÓRIA (Milestone 4B: Sincronizado via Snapshot Pattern)
    // -------------------------------------------------------------------------
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

    // Metadados operacionais de Crash Recovery (Milestone 4B)
    private bool _recoveredFromCrash = false;
    private PitchStage? _interruptedStage = null;
    private DateTimeOffset? _recoveredAt = null;
    private DateTimeOffset? _lastCheckpointAt = null;

    private bool _isCurrentRoundArchived = false;
    private bool _hasReachedVoting = false;
    private DateTimeOffset? _currentRoundStartedAt = DateTimeOffset.UtcNow;

    public PostgresArenaProjectStore(
        IDbContextFactory<ArenaDbContext> contextFactory,
        IAuditEventPublisher? auditPublisher = null)
    {
        _contextFactory = contextFactory;
        _auditPublisher = auditPublisher;
        InitializeAndSeedDatabase();
        RehydrateSessionState();
    }

    // =========================================================================
    // SNAPSHOT PATTERN: PERSISTÊNCIA FORA DO LOCK PRINCIPAL (Milestone 4B.2)
    // =========================================================================
    private ActiveSessionSnapshot CreateSnapshotUnderLock()
    {
        int[] turnedChairs = _chairStates
            .Where(kvp => kvp.Value)
            .Select(kvp => kvp.Key)
            .OrderBy(c => c)
            .ToArray();

        return new ActiveSessionSnapshot(
            SingletonId: 1,
            CurrentEventId: _currentEventId,
            CurrentProjectId: _currentProjectId,
            PitchStage: _pitchStage,
            PitchStageStartedAt: _pitchStageStartedAt,
            CurrentStageDurationSeconds: _stageDurationSeconds,
            IsPaused: _isTimerPaused,
            PausedAt: _timerPausedAt,
            TotalPausedSeconds: _totalPausedSeconds,
            TurnedChairs: turnedChairs,
            RecoveredFromCrash: _recoveredFromCrash,
            InterruptedStage: _interruptedStage,
            RecoveredAt: _recoveredAt,
            LastCheckpointAt: _lastCheckpointAt,
            LastUpdated: _lastUpdated
        );
    }

    private void PersistSnapshot(ActiveSessionSnapshot snapshot)
    {
        lock (_dbPersistenceLock)
        {
            using var context = _contextFactory.CreateDbContext();
            var entity = context.ActiveSessionState.FirstOrDefault(s => s.SingletonId == snapshot.SingletonId);
            var now = DateTimeOffset.UtcNow;

            if (entity == null)
            {
                entity = new ActiveSessionState
                {
                    SingletonId = snapshot.SingletonId,
                    CurrentEventId = snapshot.CurrentEventId,
                    CurrentProjectId = snapshot.CurrentProjectId,
                    PitchStage = snapshot.PitchStage,
                    PitchStageStartedAt = snapshot.PitchStageStartedAt,
                    CurrentStageDurationSeconds = snapshot.CurrentStageDurationSeconds,
                    IsPaused = snapshot.IsPaused,
                    PausedAt = snapshot.PausedAt,
                    TotalPausedSeconds = snapshot.TotalPausedSeconds,
                    TurnedChairs = snapshot.TurnedChairs,
                    RecoveredFromCrash = snapshot.RecoveredFromCrash,
                    InterruptedStage = snapshot.InterruptedStage,
                    RecoveredAt = snapshot.RecoveredAt,
                    LastCheckpointAt = now,
                    LastUpdated = snapshot.LastUpdated
                };
                context.ActiveSessionState.Add(entity);
            }
            else
            {
                entity.CurrentEventId = snapshot.CurrentEventId;
                entity.CurrentProjectId = snapshot.CurrentProjectId;
                entity.PitchStage = snapshot.PitchStage;
                entity.PitchStageStartedAt = snapshot.PitchStageStartedAt;
                entity.CurrentStageDurationSeconds = snapshot.CurrentStageDurationSeconds;
                entity.IsPaused = snapshot.IsPaused;
                entity.PausedAt = snapshot.PausedAt;
                entity.TotalPausedSeconds = snapshot.TotalPausedSeconds;
                entity.TurnedChairs = snapshot.TurnedChairs;
                entity.RecoveredFromCrash = snapshot.RecoveredFromCrash;
                entity.InterruptedStage = snapshot.InterruptedStage;
                entity.RecoveredAt = snapshot.RecoveredAt;
                entity.LastCheckpointAt = now;
                entity.LastUpdated = snapshot.LastUpdated;
            }

            context.SaveChanges();

            // Atualiza timestamp de checkpoint no Hot-Cache em memória
            lock (_contextLock)
            {
                _lastCheckpointAt = now;
            }

            // Publica evento de auditoria de snapshot / checkpoint operacional (Milestone 4C.3)
            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "RecoveryCheckpointCreated",
                AggregateType: "Session",
                AggregateId: snapshot.SingletonId.ToString(),
                ActorType: ActorType.System,
                ArenaEventId: snapshot.CurrentEventId,
                ProjectId: snapshot.CurrentProjectId,
                Payload: new
                {
                    lastCheckpointAt = now,
                    stage = snapshot.PitchStage.ToString(),
                    isPaused = snapshot.IsPaused,
                    turnedChairs = snapshot.TurnedChairs
                },
                EventVersion: 1
            ));
        }
    }

    // =========================================================================
    // REHYDRATION ENGINE: BOOT & RESTAURAÇÃO DE CONTEXTO (Milestone 4B.3)
    // =========================================================================
    private void RehydrateSessionState()
    {
        lock (_dbPersistenceLock)
        {
            using var context = _contextFactory.CreateDbContext();
            var session = context.ActiveSessionState.AsNoTracking().FirstOrDefault(s => s.SingletonId == 1);

            if (session == null)
            {
                // Primeira execução: cria a tupla singleton com o evento ativo padrão
                ActiveSessionSnapshot initialSnapshot;
                lock (_contextLock)
                {
                    initialSnapshot = CreateSnapshotUnderLock();
                }
                PersistSnapshot(initialSnapshot);
                return;
            }

            ActiveSessionSnapshot? postRecoverySnapshot = null;

            lock (_contextLock)
            {
                // 1. Restaura contexto de Evento e Projeto
                if (!string.IsNullOrEmpty(session.CurrentEventId) && context.Events.Any(e => e.Id == session.CurrentEventId))
                {
                    _currentEventId = session.CurrentEventId;
                }

                if (!string.IsNullOrEmpty(session.CurrentProjectId) && context.Projects.Any(p => p.Id == session.CurrentProjectId))
                {
                    _currentProjectId = session.CurrentProjectId;
                }

                // 2. Detecção de Sessão Interrompida por Falha (Crash Recovery - Milestone 4B.4)
                bool isInterrupted = (session.PitchStage == PitchStage.PitchRunning ||
                                      session.PitchStage == PitchStage.QA ||
                                      session.PitchStage == PitchStage.VotingOpen)
                                     && !session.IsPaused;

                var now = DateTimeOffset.UtcNow;

                if (isInterrupted)
                {
                    // Crash detectado com pitch em andamento sem pausa prévia:
                    // Congela tempo restante exatamente no ponto do último checkpoint
                    double elapsedAtCrash = 0.0;
                    if (session.PitchStageStartedAt.HasValue)
                    {
                        var referenceTime = session.LastCheckpointAt ?? session.LastUpdated;
                        elapsedAtCrash = Math.Max(0.0, (referenceTime - session.PitchStageStartedAt.Value).TotalSeconds - session.TotalPausedSeconds);
                    }

                    _pitchStage = session.PitchStage;
                    _pitchStageStartedAt = session.PitchStageStartedAt;
                    _stageDurationSeconds = session.CurrentStageDurationSeconds;
                    _isTimerPaused = true;
                    _timerPausedAt = now;

                    // Ajusta _totalPausedSeconds para que CalculateRemainingSeconds() retorne exatamente o tempo que restava
                    if (_pitchStageStartedAt.HasValue)
                    {
                        _totalPausedSeconds = Math.Max(0.0, (now - _pitchStageStartedAt.Value).TotalSeconds - elapsedAtCrash);
                    }
                    else
                    {
                        _totalPausedSeconds = session.TotalPausedSeconds;
                    }

                    _lastUpdated = now;

                    // Metadados oficiais de Crash Recovery
                    _recoveredFromCrash = true;
                    _interruptedStage = session.PitchStage;
                    _recoveredAt = now;
                    _lastCheckpointAt = now;

                    // Marca para persistir o novo estado congelado no banco
                    postRecoverySnapshot = CreateSnapshotUnderLock();
                }
                else
                {
                    // Sessão limpa, já pausada ou em Waiting/Finished
                    _pitchStage = session.PitchStage;
                    _pitchStageStartedAt = session.PitchStageStartedAt;
                    _stageDurationSeconds = session.CurrentStageDurationSeconds;
                    _isTimerPaused = session.IsPaused;
                    _timerPausedAt = session.PausedAt;
                    _totalPausedSeconds = session.TotalPausedSeconds;
                    _lastUpdated = session.LastUpdated;

                    _recoveredFromCrash = session.RecoveredFromCrash;
                    _interruptedStage = session.InterruptedStage;
                    _recoveredAt = session.RecoveredAt;
                    _lastCheckpointAt = session.LastCheckpointAt;
                }

                // 3. Restaura Estado das Cadeiras Físicas (turned_chairs)
                for (int i = 1; i <= 5; i++)
                {
                    _chairStates[i] = false;
                }

                if (session.TurnedChairs != null && session.TurnedChairs.Length > 0)
                {
                    foreach (var chairId in session.TurnedChairs)
                    {
                        if (chairId >= 1 && chairId <= 5)
                        {
                            _chairStates[chairId] = true;
                        }
                    }
                }
            }

            // Se houve intervenção de recovery, persiste o novo estado Paused fora do lock
            if (postRecoverySnapshot != null)
            {
                PersistSnapshot(postRecoverySnapshot);
            }
        }
    }

    // =========================================================================
    // 1. INICIALIZAÇÃO E SEED DO BANCO POSTGRESQL
    // =========================================================================
    private void InitializeAndSeedDatabase()
    {
        using var context = _contextFactory.CreateDbContext();

        if (!context.Events.Any())
        {
            var defaultEvent = new Event
            {
                Id = "evt-demo-day-2026",
                Title = "Demo Day Inovação 2026",
                Description = "Apresentação dos projetos finalistas do programa de aceleração e inovação aberta.",
                ScheduledDate = new DateTimeOffset(2026, 10, 30, 22, 0, 0, TimeSpan.Zero),
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
                    LockoutEnabled = false
                }
            };

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
                    LockoutEnabled = true
                }
            };

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

            context.Events.AddRange(defaultEvent, readyEvent, draftEvent, archivedEvent);

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

            context.Projects.AddRange(projects);

            var judges = new[]
            {
                new Judge
                {
                    Id = "judge-camila-01",
                    Name = "Camila Farani",
                    Company = "G2 Capital",
                    Role = "Shark Investor & Chairwoman",
                    AvatarUrl = "/samples/judges/camila.png",
                    Bio = "Investidora-anjo, fundadora da G2 Capital e referência nacional em venture capital e aceleração.",
                    Expertise = new[] { "Venture Capital", "SaaS", "Fintech" },
                    SocialUrl = "https://linkedin.com/in/camilafarani",
                    Email = "camila@g2capital.com.br",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new Judge
                {
                    Id = "judge-kepler-02",
                    Name = "João Kepler",
                    Company = "Bossanova Investimentos",
                    Role = "Managing Partner",
                    AvatarUrl = "/samples/judges/kepler.png",
                    Bio = "Referência em investimento-anjo e startups early stage na América Latina, autor e conselheiro.",
                    Expertise = new[] { "Early Stage", "Anjo", "Growth" },
                    SocialUrl = "https://linkedin.com/in/joaokepler",
                    Email = "kepler@bossanova.com.br",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new Judge
                {
                    Id = "judge-paula-03",
                    Name = "Paula Bellizia",
                    Company = "Global Tech Ventures",
                    Role = "VP de Operações LatAm",
                    AvatarUrl = "/samples/judges/paula.png",
                    Bio = "Líder executiva com trajetória destacada na expansão global de plataformas de tecnologia.",
                    Expertise = new[] { "Operações", "Tech", "Escala" },
                    SocialUrl = "https://linkedin.com/in/paulabellizia",
                    Email = "paula@gtv.com",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new Judge
                {
                    Id = "judge-carlos-04",
                    Name = "Carlos Wizard",
                    Company = "Sforza Holding",
                    Role = "Fundador & Investor",
                    AvatarUrl = "/samples/judges/carlos.png",
                    Bio = "Empreendedor serial e investidor de private equity com foco em modelos de escala e canais.",
                    Expertise = new[] { "Franquias", "Consumo", "M&A" },
                    SocialUrl = "https://linkedin.com/in/carloswizardmartins",
                    Email = "carlos@sforza.com.br",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                new Judge
                {
                    Id = "judge-marina-05",
                    Name = "Marina Silva Rocha",
                    Company = "InovAtiva Ventures",
                    Role = "Diretora de Inovação Aberta",
                    AvatarUrl = "/samples/judges/marina.png",
                    Bio = "Especialista em corporate venture e conexão de ecossistemas de impacto sustentável e IA.",
                    Expertise = new[] { "ESG", "GovTech", "Open Innovation" },
                    SocialUrl = "https://linkedin.com/in/marinarochainov",
                    Email = "marina@inovativalab.org",
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                }
            };

            context.Judges.AddRange(judges);

            var juryAssignments = new List<EventJuryAssignment>
            {
                new() { EventId = defaultEvent.Id, ChairId = 1, JudgeId = judges[0].Id, AssignedAt = DateTimeOffset.UtcNow },
                new() { EventId = defaultEvent.Id, ChairId = 2, JudgeId = judges[1].Id, AssignedAt = DateTimeOffset.UtcNow },
                new() { EventId = defaultEvent.Id, ChairId = 3, JudgeId = judges[2].Id, AssignedAt = DateTimeOffset.UtcNow },
                new() { EventId = defaultEvent.Id, ChairId = 4, JudgeId = judges[3].Id, AssignedAt = DateTimeOffset.UtcNow },
                new() { EventId = defaultEvent.Id, ChairId = 5, JudgeId = judges[4].Id, AssignedAt = DateTimeOffset.UtcNow }
            };

            context.EventJuryAssignments.AddRange(juryAssignments);
            context.SaveChanges();
        }

        // Define contexto inicial em memória para o evento e projeto ativos
        var activeEvent = context.Events.AsNoTracking().FirstOrDefault(e => e.Status == EventStatus.Active);
        if (activeEvent != null)
        {
            _currentEventId = activeEvent.Id;
            var currentProj = context.Projects.AsNoTracking().FirstOrDefault(p => p.EventId == activeEvent.Id && p.Status == ProjectStatus.Current);
            _currentProjectId = currentProj?.Id ?? context.Projects.AsNoTracking().Where(p => p.EventId == activeEvent.Id).OrderBy(p => p.OrderIndex).FirstOrDefault()?.Id;
        }
    }

    // =========================================================================
    // 2. CONTEXTO DE SESSÃO ATIVA (Em Memória no 4A)
    // =========================================================================
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
                RecoveredFromCrash = _recoveredFromCrash,
                InterruptedStage = _interruptedStage,
                RecoveredAt = _recoveredAt,
                LastCheckpointAt = _lastCheckpointAt,
                LastUpdated = _lastUpdated
            };
        }
    }

    public Event? GetCurrentEvent()
    {
        lock (_contextLock)
        {
            if (_currentEventId == null) return null;
            using var context = _contextFactory.CreateDbContext();
            return context.Events.AsNoTracking().FirstOrDefault(e => e.Id == _currentEventId);
        }
    }

    public Project? GetCurrentProject()
    {
        lock (_contextLock)
        {
            if (_currentProjectId == null) return null;
            using var context = _contextFactory.CreateDbContext();
            return context.Projects.AsNoTracking().FirstOrDefault(p => p.Id == _currentProjectId);
        }
    }

    public bool SetCurrentEvent(string eventId)
    {
        using var context = _contextFactory.CreateDbContext();
        var exists = context.Events.Any(e => e.Id == eventId);
        if (!exists) return false;

        ActiveSessionSnapshot snapshot;
        lock (_contextLock)
        {
            _currentEventId = eventId;
            _lastUpdated = DateTimeOffset.UtcNow;

            if (_currentProjectId != null)
            {
                var proj = context.Projects.AsNoTracking().FirstOrDefault(p => p.Id == _currentProjectId);
                if (proj == null || proj.EventId != eventId)
                {
                    _currentProjectId = null;
                }
            }

            snapshot = CreateSnapshotUnderLock();
        }

        PersistSnapshot(snapshot);

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ActiveSessionUpdated",
            AggregateType: "Session",
            AggregateId: "singleton-1",
            ActorType: ActorType.Operator,
            ArenaEventId: eventId,
            ProjectId: _currentProjectId,
            Payload: new { currentEventId = eventId, currentProjectId = _currentProjectId },
            AfterState: new { eventId = eventId, projectId = _currentProjectId },
            EventVersion: 1
        ));

        return true;
    }

    public bool SetCurrentProject(string? projectId)
    {
        if (projectId == null)
        {
            ActiveSessionSnapshot nullSnapshot;
            lock (_contextLock)
            {
                _currentProjectId = null;
                _lastUpdated = DateTimeOffset.UtcNow;
                nullSnapshot = CreateSnapshotUnderLock();
            }
            PersistSnapshot(nullSnapshot);

            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "ActiveSessionUpdated",
                AggregateType: "Session",
                AggregateId: "singleton-1",
                ActorType: ActorType.Operator,
                ArenaEventId: _currentEventId,
                ProjectId: null,
                Payload: new { currentEventId = _currentEventId, currentProjectId = (string?)null },
                EventVersion: 1
            ));

            return true;
        }

        using var context = _contextFactory.CreateDbContext();
        var proj = context.Projects.AsNoTracking().FirstOrDefault(p => p.Id == projectId);
        if (proj == null) return false;

        ActiveSessionSnapshot snapshot;
        lock (_contextLock)
        {
            if (_currentEventId != null && proj.EventId != _currentEventId) return false;
            _currentProjectId = projectId;
            _lastUpdated = DateTimeOffset.UtcNow;
            snapshot = CreateSnapshotUnderLock();
        }

        PersistSnapshot(snapshot);

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ActiveSessionUpdated",
            AggregateType: "Session",
            AggregateId: "singleton-1",
            ActorType: ActorType.Operator,
            ArenaEventId: _currentEventId,
            ProjectId: projectId,
            Payload: new { currentEventId = _currentEventId, currentProjectId = projectId },
            AfterState: new { eventId = _currentEventId, projectId = projectId },
            EventVersion: 1
        ));

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ProjectActivated",
            AggregateType: "Project",
            AggregateId: projectId,
            ArenaEventId: _currentEventId,
            ProjectId: projectId,
            ActorType: ActorType.Operator,
            Payload: new { projectId = projectId, title = proj.Title },
            AfterState: new { status = "Current" },
            EventVersion: 1
        ));

        return true;
    }

    public SelectProjectResult SelectProject(string projectId)
    {
        using var context = _contextFactory.CreateDbContext();
        var newProj = context.Projects.FirstOrDefault(p => p.Id == projectId);
        if (newProj == null)
        {
            return new SelectProjectResult(false, null, null, $"Projeto com ID '{projectId}' não encontrado.");
        }

        Round? archivedRound = null;
        ActiveSessionSnapshot snapshot;
        Project? previousProj = null;

        lock (_contextLock)
        {
            if (_currentEventId != null && newProj.EventId != _currentEventId)
            {
                return new SelectProjectResult(false, null, null, $"Projeto '{projectId}' pertence a outro evento.");
            }

            // Arquiva a rodada anterior caso estivesse em andamento
            if (_currentProjectId != null && _currentProjectId != projectId && !_isCurrentRoundArchived)
            {
                archivedRound = ArchiveCurrentRoundInternal(context, "Mudança de Projeto no Palco");
            }

            if (_currentProjectId != null)
            {
                previousProj = context.Projects.FirstOrDefault(p => p.Id == _currentProjectId);
                if (previousProj != null && previousProj.Id != projectId)
                {
                    previousProj.Status = ProjectStatus.Completed;
                    previousProj.PresentationEndedAt = DateTimeOffset.UtcNow;
                    previousProj.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }

            newProj.Status = ProjectStatus.Current;
            newProj.PresentationStartedAt = DateTimeOffset.UtcNow;
            newProj.UpdatedAt = DateTimeOffset.UtcNow;

            context.SaveChanges();

            _currentProjectId = projectId;
            _pitchStage = PitchStage.Waiting;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;
            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            _isCurrentRoundArchived = false;
            _hasReachedVoting = false;
            _currentRoundStartedAt = DateTimeOffset.UtcNow;
            _lastUpdated = DateTimeOffset.UtcNow;

            ResetChairsInternal();
            snapshot = CreateSnapshotUnderLock();
        }

        PersistSnapshot(snapshot);

        if (previousProj != null && previousProj.Id != projectId)
        {
            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "ProjectCompleted",
                AggregateType: "Project",
                AggregateId: previousProj.Id,
                ArenaEventId: _currentEventId,
                ProjectId: previousProj.Id,
                ActorType: ActorType.System,
                Payload: new { projectId = previousProj.Id, title = previousProj.Title, reason = "Mudança de Projeto no Palco" },
                BeforeState: new { status = "Current" },
                AfterState: new { status = "Completed" },
                EventVersion: 1
            ));
        }

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ProjectActivated",
            AggregateType: "Project",
            AggregateId: projectId,
            ArenaEventId: _currentEventId,
            ProjectId: projectId,
            ActorType: ActorType.Operator,
            Payload: new { projectId = projectId, title = newProj.Title, previousProjectId = previousProj?.Id },
            AfterState: new { status = "Current" },
            EventVersion: 1
        ));

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ActiveSessionUpdated",
            AggregateType: "Session",
            AggregateId: "singleton-1",
            ActorType: ActorType.Operator,
            ArenaEventId: _currentEventId,
            ProjectId: projectId,
            Payload: new { currentEventId = _currentEventId, currentProjectId = projectId, stage = "Waiting" },
            EventVersion: 1
        ));

        return new SelectProjectResult(true, newProj, previousProj, null, archivedRound);
    }

    // =========================================================================
    // 3. EVENTOS (CRUD & GOVERNANÇA 100% PERSISTIDO)
    // =========================================================================
    public IReadOnlyList<Event> GetAllEvents(EventStatus? statusFilter = null)
    {
        using var context = _contextFactory.CreateDbContext();
        var query = context.Events.AsNoTracking();
        if (statusFilter.HasValue)
        {
            query = query.Where(e => e.Status == statusFilter.Value);
        }
        return query.OrderByDescending(e => e.ScheduledDate).ToList();
    }

    public Event? GetEventById(string eventId)
    {
        using var context = _contextFactory.CreateDbContext();
        return context.Events.AsNoTracking().FirstOrDefault(e => e.Id == eventId);
    }

    public Event AddEvent(Event evt)
    {
        using var context = _contextFactory.CreateDbContext();
        if (string.IsNullOrWhiteSpace(evt.Id))
            evt.Id = $"evt-{Guid.NewGuid():N}"[..12];
        evt.ScheduledDate = evt.ScheduledDate.ToUniversalTime();
        evt.CreatedAt = DateTimeOffset.UtcNow;
        evt.UpdatedAt = DateTimeOffset.UtcNow;
        context.Events.Add(evt);
        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "EventCreated",
            AggregateType: "Event",
            AggregateId: evt.Id,
            ArenaEventId: evt.Id,
            ActorType: ActorType.Operator,
            Payload: new { title = evt.Title, status = evt.Status.ToString(), scheduledDate = evt.ScheduledDate },
            AfterState: new { status = evt.Status.ToString() },
            EventVersion: 1
        ));

        return evt;
    }

    public bool UpdateEvent(Event evt)
    {
        using var context = _contextFactory.CreateDbContext();
        var existing = context.Events.FirstOrDefault(e => e.Id == evt.Id);
        if (existing == null) return false;

        var beforeState = new { title = existing.Title, status = existing.Status.ToString() };

        existing.Title = evt.Title;
        existing.Description = evt.Description;
        existing.ScheduledDate = evt.ScheduledDate.ToUniversalTime();
        existing.Status = evt.Status;
        existing.Branding = evt.Branding;
        existing.Timers = evt.Timers;
        existing.UpdatedAt = DateTimeOffset.UtcNow;

        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "EventUpdated",
            AggregateType: "Event",
            AggregateId: evt.Id,
            ArenaEventId: evt.Id,
            ActorType: ActorType.Operator,
            Payload: new { title = evt.Title, status = evt.Status.ToString() },
            BeforeState: beforeState,
            AfterState: new { title = evt.Title, status = evt.Status.ToString() },
            EventVersion: 1
        ));

        return true;
    }

    public bool DeleteEvent(string eventId)
    {
        lock (_contextLock)
        {
            if (_currentEventId == eventId) return false;
        }

        using var context = _contextFactory.CreateDbContext();
        var existing = context.Events.FirstOrDefault(e => e.Id == eventId);
        if (existing == null) return false;

        var beforeState = new { title = existing.Title, status = existing.Status.ToString() };

        context.Events.Remove(existing);
        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "EventDeleted",
            AggregateType: "Event",
            AggregateId: eventId,
            ArenaEventId: eventId,
            ActorType: ActorType.Operator,
            Payload: new { title = existing.Title },
            BeforeState: beforeState,
            EventVersion: 1
        ));

        return true;
    }

    public ActivateEventResult ActivateEvent(string eventId, EventStatus previousEventStatus = EventStatus.Ready)
    {
        using var context = _contextFactory.CreateDbContext();
        var targetEvent = context.Events.FirstOrDefault(e => e.Id == eventId);
        if (targetEvent == null)
        {
            return new ActivateEventResult(false, null, null, $"Evento '{eventId}' não encontrado.");
        }

        if (targetEvent.Status == EventStatus.Active)
        {
            return new ActivateEventResult(true, targetEvent, null);
        }

        Event? previousActiveEvent = null;
        var activeEvents = context.Events.Where(e => e.Status == EventStatus.Active).ToList();
        foreach (var act in activeEvents)
        {
            act.Status = previousEventStatus;
            act.UpdatedAt = DateTimeOffset.UtcNow;
            previousActiveEvent = act;
        }

        targetEvent.Status = EventStatus.Active;
        targetEvent.UpdatedAt = DateTimeOffset.UtcNow;

        context.SaveChanges();

        ActiveSessionSnapshot snapshot;
        lock (_contextLock)
        {
            _currentEventId = targetEvent.Id;
            var firstProject = context.Projects.AsNoTracking()
                .Where(p => p.EventId == targetEvent.Id)
                .OrderBy(p => p.OrderIndex)
                .FirstOrDefault();
            _currentProjectId = firstProject?.Id;
            _pitchStage = PitchStage.Waiting;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;
            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            _isCurrentRoundArchived = false;
            _lastUpdated = DateTimeOffset.UtcNow;

            ResetChairsInternal();
            snapshot = CreateSnapshotUnderLock();
        }

        PersistSnapshot(snapshot);

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "EventActivated",
            AggregateType: "Event",
            AggregateId: targetEvent.Id,
            ArenaEventId: targetEvent.Id,
            ActorType: ActorType.Operator,
            Payload: new { eventId = targetEvent.Id, title = targetEvent.Title, previousEventId = previousActiveEvent?.Id },
            BeforeState: new { activeEventId = previousActiveEvent?.Id },
            AfterState: new { activeEventId = targetEvent.Id },
            EventVersion: 1
        ));

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ActiveSessionUpdated",
            AggregateType: "Session",
            AggregateId: "singleton-1",
            ActorType: ActorType.Operator,
            ArenaEventId: targetEvent.Id,
            ProjectId: _currentProjectId,
            Payload: new { currentEventId = targetEvent.Id, currentProjectId = _currentProjectId, stage = "Waiting" },
            EventVersion: 1
        ));

        return new ActivateEventResult(true, targetEvent, previousActiveEvent);
    }

    public Event? FinishEvent(string eventId)
    {
        using var context = _contextFactory.CreateDbContext();
        var target = context.Events.FirstOrDefault(e => e.Id == eventId);
        if (target == null) return null;

        target.Status = EventStatus.Finished;
        target.UpdatedAt = DateTimeOffset.UtcNow;
        context.SaveChanges();

        ActiveSessionSnapshot? snapshotToPersist = null;
        lock (_contextLock)
        {
            if (_currentEventId == eventId)
            {
                if (!_isCurrentRoundArchived && _currentProjectId != null)
                {
                    ArchiveCurrentRoundInternal(context, "Encerramento do Evento");
                }
                _currentEventId = null;
                _currentProjectId = null;
                _pitchStage = PitchStage.Waiting;
                _lastUpdated = DateTimeOffset.UtcNow;
                ResetChairsInternal();
                snapshotToPersist = CreateSnapshotUnderLock();
            }
        }

        if (snapshotToPersist != null)
        {
            PersistSnapshot(snapshotToPersist);
        }

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "EventUpdated",
            AggregateType: "Event",
            AggregateId: eventId,
            ArenaEventId: eventId,
            ActorType: ActorType.Operator,
            Payload: new { title = target.Title, status = "Finished" },
            AfterState: new { status = "Finished" },
            EventVersion: 1
        ));

        return target;
    }

    public ArchiveEventResult ArchiveEvent(string eventId)
    {
        using var context = _contextFactory.CreateDbContext();
        var target = context.Events.FirstOrDefault(e => e.Id == eventId);
        if (target == null)
        {
            return new ArchiveEventResult(false, null, false, $"Evento '{eventId}' não encontrado.");
        }

        lock (_contextLock)
        {
            if (_currentEventId == eventId)
            {
                return new ArchiveEventResult(false, target, true, "Não é permitido arquivar o evento ativo no palco.");
            }
        }

        target.Status = EventStatus.Archived;
        target.UpdatedAt = DateTimeOffset.UtcNow;
        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "EventArchived",
            AggregateType: "Event",
            AggregateId: eventId,
            ArenaEventId: eventId,
            ActorType: ActorType.Operator,
            Payload: new { title = target.Title },
            BeforeState: new { status = "Finished" },
            AfterState: new { status = "Archived" },
            EventVersion: 1
        ));

        return new ArchiveEventResult(true, target, false);
    }

    public Event? DuplicateEvent(string eventId)
    {
        using var context = _contextFactory.CreateDbContext();
        var source = context.Events.AsNoTracking().FirstOrDefault(e => e.Id == eventId);
        if (source == null) return null;

        var newEvent = new Event
        {
            Id = $"evt-{Guid.NewGuid().ToString("N")[..8]}",
            Title = $"{source.Title} (Cópia)",
            Description = source.Description,
            ScheduledDate = source.ScheduledDate.AddDays(7),
            Status = EventStatus.Draft,
            Branding = source.Branding,
            Timers = source.Timers,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        context.Events.Add(newEvent);

        // Duplica também os projetos associados em status Pending
        var sourceProjects = context.Projects.AsNoTracking().Where(p => p.EventId == eventId).OrderBy(p => p.OrderIndex).ToList();
        foreach (var proj in sourceProjects)
        {
            var newProj = new Project
            {
                Id = $"proj-{Guid.NewGuid().ToString("N")[..8]}",
                EventId = newEvent.Id,
                Title = proj.Title,
                PitchLeader = proj.PitchLeader,
                Track = proj.Track,
                Description = proj.Description,
                OrderIndex = proj.OrderIndex,
                Status = ProjectStatus.Pending,
                Media = proj.Media,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            context.Projects.Add(newProj);
        }

        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "EventCreated",
            AggregateType: "Event",
            AggregateId: newEvent.Id,
            ArenaEventId: newEvent.Id,
            ActorType: ActorType.Operator,
            Payload: new { title = newEvent.Title, status = newEvent.Status.ToString(), sourceEventId = eventId },
            AfterState: new { status = newEvent.Status.ToString() },
            EventVersion: 1
        ));

        return newEvent;
    }

    // =========================================================================
    // 4. PROJETOS (CRUD & CONSULTA 100% PERSISTIDO)
    // =========================================================================
    public IReadOnlyList<Project> GetProjectsByEvent(string eventId, bool includeCompleted = false)
    {
        using var context = _contextFactory.CreateDbContext();
        var query = context.Projects.AsNoTracking().Where(p => p.EventId == eventId);
        if (!includeCompleted)
        {
            query = query.Where(p => p.Status != ProjectStatus.Completed);
        }
        return query.OrderBy(p => p.OrderIndex).ToList();
    }

    public Project? GetProjectById(string projectId)
    {
        using var context = _contextFactory.CreateDbContext();
        return context.Projects.AsNoTracking().FirstOrDefault(p => p.Id == projectId);
    }

    public Project AddProject(Project project)
    {
        using var context = _contextFactory.CreateDbContext();
        if (string.IsNullOrWhiteSpace(project.Id))
            project.Id = $"proj-{Guid.NewGuid():N}"[..12];
        project.CreatedAt = DateTimeOffset.UtcNow;
        project.UpdatedAt = DateTimeOffset.UtcNow;
        context.Projects.Add(project);
        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ProjectCreated",
            AggregateType: "Project",
            AggregateId: project.Id,
            ArenaEventId: project.EventId,
            ProjectId: project.Id,
            ActorType: ActorType.Operator,
            Payload: new { title = project.Title, track = project.Track, pitchLeader = project.PitchLeader, eventId = project.EventId },
            AfterState: new { status = project.Status.ToString() },
            EventVersion: 1
        ));

        return project;
    }

    public bool UpdateProject(Project project)
    {
        using var context = _contextFactory.CreateDbContext();
        var existing = context.Projects.FirstOrDefault(p => p.Id == project.Id);
        if (existing == null) return false;

        var beforeState = new { title = existing.Title, status = existing.Status.ToString() };

        existing.Title = project.Title;
        existing.PitchLeader = project.PitchLeader;
        existing.Track = project.Track;
        existing.Description = project.Description;
        existing.OrderIndex = project.OrderIndex;
        existing.Status = project.Status;
        existing.Media = project.Media;
        existing.UpdatedAt = DateTimeOffset.UtcNow;

        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ProjectUpdated",
            AggregateType: "Project",
            AggregateId: project.Id,
            ArenaEventId: project.EventId,
            ProjectId: project.Id,
            ActorType: ActorType.Operator,
            Payload: new { title = project.Title, track = project.Track, pitchLeader = project.PitchLeader, status = project.Status.ToString() },
            BeforeState: beforeState,
            AfterState: new { title = project.Title, status = project.Status.ToString() },
            EventVersion: 1
        ));

        return true;
    }

    public DeleteProjectResult DeleteProject(string projectId)
    {
        lock (_contextLock)
        {
            if (_currentProjectId == projectId)
            {
                return new DeleteProjectResult(false, true, false);
            }
        }

        using var context = _contextFactory.CreateDbContext();
        var existing = context.Projects.FirstOrDefault(p => p.Id == projectId);
        if (existing == null)
        {
            return new DeleteProjectResult(false, false, true);
        }

        var beforeState = new { title = existing.Title, eventId = existing.EventId, status = existing.Status.ToString() };
        context.Projects.Remove(existing);
        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ProjectDeleted",
            AggregateType: "Project",
            AggregateId: projectId,
            ArenaEventId: existing.EventId,
            ProjectId: projectId,
            ActorType: ActorType.Operator,
            Payload: new { title = existing.Title, eventId = existing.EventId },
            BeforeState: beforeState,
            EventVersion: 1
        ));

        return new DeleteProjectResult(true, false, false);
    }

    // =========================================================================
    // 5. JURADOS & ALOCAÇÃO DE BANCA (100% PERSISTIDO)
    // =========================================================================
    public IReadOnlyList<Judge> GetAllJudges(bool includeInactive = false)
    {
        using var context = _contextFactory.CreateDbContext();
        var query = context.Judges.AsNoTracking();
        if (!includeInactive)
        {
            query = query.Where(j => j.IsActive);
        }
        return query.OrderBy(j => j.Name).ToList();
    }

    public Judge? GetJudgeById(string judgeId)
    {
        using var context = _contextFactory.CreateDbContext();
        return context.Judges.AsNoTracking().FirstOrDefault(j => j.Id == judgeId);
    }

    public Judge AddJudge(Judge judge)
    {
        using var context = _contextFactory.CreateDbContext();
        if (string.IsNullOrWhiteSpace(judge.Id))
            judge.Id = $"judge-{Guid.NewGuid().ToString("N")[..8]}";
        judge.CreatedAt = DateTimeOffset.UtcNow;
        judge.UpdatedAt = DateTimeOffset.UtcNow;
        context.Judges.Add(judge);
        context.SaveChanges();
        return judge;
    }

    public bool UpdateJudge(Judge judge)
    {
        using var context = _contextFactory.CreateDbContext();
        var existing = context.Judges.FirstOrDefault(j => j.Id == judge.Id);
        if (existing == null) return false;

        existing.Name = judge.Name;
        existing.Company = judge.Company;
        existing.Role = judge.Role;
        existing.AvatarUrl = judge.AvatarUrl;
        existing.Bio = judge.Bio;
        existing.Expertise = judge.Expertise;
        existing.SocialUrl = judge.SocialUrl;
        existing.IsActive = judge.IsActive;
        existing.Email = judge.Email;
        existing.UpdatedAt = DateTimeOffset.UtcNow;

        context.SaveChanges();
        return true;
    }

    public DeleteJudgeResult DeleteJudge(string judgeId)
    {
        using var context = _contextFactory.CreateDbContext();
        var judge = context.Judges.FirstOrDefault(j => j.Id == judgeId);
        if (judge == null)
        {
            return new DeleteJudgeResult(false, false, true, $"Jurado '{judgeId}' não encontrado.");
        }

        // Verifica se o jurado está alocado ao evento ativo
        lock (_contextLock)
        {
            if (_currentEventId != null)
            {
                var isAssignedToActive = context.EventJuryAssignments
                    .Any(a => a.EventId == _currentEventId && a.JudgeId == judgeId);
                if (isAssignedToActive)
                {
                    return new DeleteJudgeResult(false, true, false, "Não é permitido excluir um jurado alocado à banca do evento ativo.");
                }
            }
        }

        // Exclusão lógica para preservar histórico referencial
        judge.IsActive = false;
        judge.UpdatedAt = DateTimeOffset.UtcNow;
        context.SaveChanges();

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "JudgeUnassigned",
            AggregateType: "Judge",
            AggregateId: judgeId,
            ActorType: ActorType.Operator,
            Payload: new { judgeId = judgeId, name = judge.Name, reason = "Deactivated" },
            BeforeState: new { isActive = true },
            AfterState: new { isActive = false },
            EventVersion: 1
        ));

        return new DeleteJudgeResult(true, false, false);
    }

    public IReadOnlyList<EventJuryAssignment> GetEventJury(string eventId)
    {
        using var context = _contextFactory.CreateDbContext();
        return context.EventJuryAssignments
            .Include(a => a.Judge)
            .AsNoTracking()
            .Where(a => a.EventId == eventId)
            .OrderBy(a => a.ChairId)
            .ToList();
    }

    public AssignEventJuryResult AssignEventJury(string eventId, IReadOnlyList<JuryAssignmentItemDto> assignments)
    {
        using var context = _contextFactory.CreateDbContext();
        var evt = context.Events.FirstOrDefault(e => e.Id == eventId);
        if (evt == null)
        {
            return new AssignEventJuryResult(false, null, $"Evento '{eventId}' não encontrado.");
        }

        // Valida duplicidade de jurados ou de cadeiras
        var chairIds = new HashSet<int>();
        var judgeIds = new HashSet<string>();

        foreach (var item in assignments)
        {
            if (item.ChairId < 1 || item.ChairId > 5)
            {
                return new AssignEventJuryResult(false, null, $"Cadeira {item.ChairId} inválida. Cadeiras devem estar entre 1 e 5.");
            }
            if (!chairIds.Add(item.ChairId))
            {
                return new AssignEventJuryResult(false, null, $"Cadeira {item.ChairId} duplicada na alocação.");
            }
            if (!judgeIds.Add(item.JudgeId))
            {
                return new AssignEventJuryResult(false, null, $"Jurado '{item.JudgeId}' alocado em mais de uma cadeira.");
            }
            if (!context.Judges.Any(j => j.Id == item.JudgeId && j.IsActive))
            {
                return new AssignEventJuryResult(false, null, $"Jurado '{item.JudgeId}' não encontrado ou inativo.");
            }
        }

        // Limpa alocações anteriores e insere as novas
        var previousAssignments = context.EventJuryAssignments.Where(a => a.EventId == eventId).ToList();
        context.EventJuryAssignments.RemoveRange(previousAssignments);

        var newAssignments = assignments.Select(a => new EventJuryAssignment
        {
            EventId = eventId,
            ChairId = a.ChairId,
            JudgeId = a.JudgeId,
            AssignedAt = DateTimeOffset.UtcNow
        }).ToList();

        context.EventJuryAssignments.AddRange(newAssignments);
        context.SaveChanges();

        if (previousAssignments.Count > 0)
        {
            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "JudgeUnassigned",
                AggregateType: "Jury",
                AggregateId: eventId,
                ArenaEventId: eventId,
                ActorType: ActorType.Operator,
                Payload: new { eventId = eventId, unassignedCount = previousAssignments.Count },
                EventVersion: 1
            ));
        }

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "JudgeAssigned",
            AggregateType: "Jury",
            AggregateId: eventId,
            ArenaEventId: eventId,
            ActorType: ActorType.Operator,
            Payload: new
            {
                eventId = eventId,
                assignedCount = newAssignments.Count,
                assignments = assignments.Select(a => new { chairId = a.ChairId, judgeId = a.JudgeId }).ToArray()
            },
            AfterState: new { assignedCount = newAssignments.Count },
            EventVersion: 1
        ));

        var hydrated = context.EventJuryAssignments
            .Include(a => a.Judge)
            .AsNoTracking()
            .Where(a => a.EventId == eventId)
            .OrderBy(a => a.ChairId)
            .ToList();

        return new AssignEventJuryResult(true, hydrated);
    }

    // =========================================================================
    // 6. HISTÓRICO DE RODADAS (100% PERSISTIDO)
    // =========================================================================
    public IReadOnlyList<Round> GetRoundHistory(string? eventId = null)
    {
        using var context = _contextFactory.CreateDbContext();
        var query = context.RoundHistoryEntries.AsNoTracking();
        if (!string.IsNullOrEmpty(eventId))
        {
            query = query.Where(r => r.EventId == eventId);
        }
        return query.OrderByDescending(r => r.ArchivedAt).ToList();
    }

    public Round? GetRoundById(string roundId)
    {
        using var context = _contextFactory.CreateDbContext();
        return context.RoundHistoryEntries.AsNoTracking().FirstOrDefault(r => r.Id == roundId);
    }

    public Round? GetLastRound()
    {
        using var context = _contextFactory.CreateDbContext();
        return context.RoundHistoryEntries.AsNoTracking().OrderByDescending(r => r.ArchivedAt).FirstOrDefault();
    }

    public Round? ArchiveCurrentRound(string reason = "Manual")
    {
        lock (_contextLock)
        {
            if (_isCurrentRoundArchived) return null;
            using var context = _contextFactory.CreateDbContext();
            var round = ArchiveCurrentRoundInternal(context, reason);
            context.SaveChanges();
            return round;
        }
    }

    private Round? ArchiveCurrentRoundInternal(ArenaDbContext context, string reason)
    {
        if (_currentProjectId == null || _currentEventId == null) return null;

        var project = context.Projects.AsNoTracking().FirstOrDefault(p => p.Id == _currentProjectId);
        var currentEvent = context.Events.AsNoTracking().FirstOrDefault(e => e.Id == _currentEventId);

        var turnedChairs = _chairStates.Where(kvp => kvp.Value).Select(kvp => kvp.Key).OrderBy(c => c).ToList();
        var turnedCount = turnedChairs.Count;

        // Result Engine
        RoundResult result;
        RoundApprovalMode approvalMode;

        if (!_hasReachedVoting && _pitchStage != PitchStage.VotingOpen && _pitchStage != PitchStage.VotingClosed && _pitchStage != PitchStage.Finished)
        {
            result = RoundResult.Inconclusive;
            approvalMode = RoundApprovalMode.None;
        }
        else
        {
            if (turnedCount == 5)
            {
                result = RoundResult.Approved;
                approvalMode = RoundApprovalMode.Unanimous;
            }
            else if (turnedCount >= 3)
            {
                result = RoundResult.Approved;
                approvalMode = RoundApprovalMode.Majority;
            }
            else if (turnedCount > 0)
            {
                result = RoundResult.Rejected;
                approvalMode = RoundApprovalMode.Minority;
            }
            else
            {
                result = RoundResult.Rejected;
                approvalMode = RoundApprovalMode.None;
            }
        }

        var startedAt = _currentRoundStartedAt ?? DateTimeOffset.UtcNow;
        var endedAt = DateTimeOffset.UtcNow;
        var duration = Math.Max(0, (endedAt - startedAt).TotalSeconds);
        var effectiveDuration = Math.Max(0, duration - _totalPausedSeconds);

        var round = new Round
        {
            Id = Guid.NewGuid().ToString("N")[..8],
            EventId = _currentEventId,
            ProjectId = _currentProjectId,
            ProjectTitle = project?.Title ?? "Projeto Desconhecido",
            PitchLeader = project?.PitchLeader ?? "Líder Não Informado",
            Track = project?.Track ?? "Geral",
            StartedAt = startedAt,
            EndedAt = endedAt,
            DurationSeconds = Math.Round(duration, 2),
            EffectiveDurationSeconds = Math.Round(effectiveDuration, 2),
            LastStageReached = _pitchStage,
            TurnedChairs = turnedChairs,
            TurnedChairCount = turnedCount,
            TotalChairs = 5,
            TimerConfig = currentEvent?.Timers ?? new TimerConfig(),
            TotalPausedSeconds = Math.Round(_totalPausedSeconds, 2),
            ArchivedAt = DateTimeOffset.UtcNow,
            Result = result,
            ApprovalMode = approvalMode,
            Notes = $"Arquivado automaticamente: {reason}"
        };

        context.RoundHistoryEntries.Add(round);
        _isCurrentRoundArchived = true;
        return round;
    }

    // =========================================================================
    // 7. PITCH LIFECYCLE & TIMERS (Mantidos em Memória no 4A; Escopo de 4B)
    // =========================================================================
    public PitchStateDto GetPitchState()
    {
        lock (_contextLock)
        {
            double elapsed = 0.0;
            if (_pitchStageStartedAt.HasValue && _pitchStage != PitchStage.Waiting)
            {
                var now = _isTimerPaused && _timerPausedAt.HasValue ? _timerPausedAt.Value : DateTimeOffset.UtcNow;
                elapsed = Math.Max(0, (now - _pitchStageStartedAt.Value).TotalSeconds - _totalPausedSeconds);
            }

            var remaining = Math.Max(0, _stageDurationSeconds - elapsed);
            var isExpired = _stageDurationSeconds > 0 && remaining <= 0;
            var isVotingAllowed = _pitchStage == PitchStage.VotingOpen && !_isTimerPaused && !isExpired;

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
                GetAllowedTransitions(_pitchStage),
                _recoveredFromCrash,
                _interruptedStage,
                _recoveredAt,
                _lastCheckpointAt
            );
        }
    }

    public PitchTransitionResult TransitionPitch(PitchStage targetStage)
    {
        Round? archivedRound = null;
        ActiveSessionSnapshot? snapshotToPersist = null;
        PitchStage previousStage;

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

            previousStage = _pitchStage;
            _pitchStage = targetStage;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;
            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            _lastUpdated = DateTimeOffset.UtcNow;

            using var context = _contextFactory.CreateDbContext();
            var currentEvent = context.Events.AsNoTracking().FirstOrDefault(e => e.Id == _currentEventId);
            var timers = currentEvent?.Timers ?? new TimerConfig();

            _stageDurationSeconds = targetStage switch
            {
                PitchStage.PitchRunning => timers.PitchDurationSeconds,
                PitchStage.QA => timers.QaDurationSeconds,
                PitchStage.VotingOpen => timers.VotingDurationSeconds,
                _ => 0
            };

            if (targetStage == PitchStage.VotingOpen)
            {
                _hasReachedVoting = true;
            }

            if (targetStage == PitchStage.Finished)
            {
                var project = context.Projects.FirstOrDefault(p => p.Id == _currentProjectId);
                if (project != null)
                {
                    project.Status = ProjectStatus.Completed;
                    project.PresentationEndedAt ??= DateTimeOffset.UtcNow;
                    project.UpdatedAt = DateTimeOffset.UtcNow;
                }

                if (!_isCurrentRoundArchived)
                {
                    archivedRound = ArchiveCurrentRoundInternal(context, "Finished");
                }
                context.SaveChanges();
            }

            snapshotToPersist = CreateSnapshotUnderLock();
        }

        if (snapshotToPersist != null)
        {
            PersistSnapshot(snapshotToPersist);
        }

        // Instrumentação do ciclo de vida do Pitch (Milestone 4C.3)
        if (_pitchStage == PitchStage.PitchRunning)
        {
            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "PitchStarted",
                AggregateType: "Pitch",
                AggregateId: _currentProjectId ?? "session",
                ArenaEventId: _currentEventId,
                ProjectId: _currentProjectId,
                ActorType: ActorType.Operator,
                Payload: new { stage = "PitchRunning", durationSeconds = _stageDurationSeconds, previousStage = previousStage.ToString() },
                BeforeState: new { stage = previousStage.ToString() },
                AfterState: new { stage = "PitchRunning" },
                EventVersion: 1
            ));
        }
        else if (_pitchStage == PitchStage.Finished)
        {
            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "PitchCompleted",
                AggregateType: "Pitch",
                AggregateId: _currentProjectId ?? "session",
                ArenaEventId: _currentEventId,
                ProjectId: _currentProjectId,
                ActorType: ActorType.Operator,
                Payload: new { stage = "Finished", previousStage = previousStage.ToString(), roundArchived = (archivedRound != null) },
                BeforeState: new { stage = previousStage.ToString() },
                AfterState: new { stage = "Finished" },
                EventVersion: 1
            ));

            if (!string.IsNullOrEmpty(_currentProjectId))
            {
                _auditPublisher?.Publish(new AuditEventRecord(
                    EventType: "ProjectCompleted",
                    AggregateType: "Project",
                    AggregateId: _currentProjectId,
                    ArenaEventId: _currentEventId,
                    ProjectId: _currentProjectId,
                    ActorType: ActorType.System,
                    Payload: new { projectId = _currentProjectId, completedAt = DateTimeOffset.UtcNow },
                    BeforeState: new { status = "Current" },
                    AfterState: new { status = "Completed" },
                    EventVersion: 1
                ));
            }
        }
        else
        {
            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "PitchTransitioned",
                AggregateType: "Pitch",
                AggregateId: _currentProjectId ?? "session",
                ArenaEventId: _currentEventId,
                ProjectId: _currentProjectId,
                ActorType: ActorType.Operator,
                Payload: new { from = previousStage.ToString(), to = _pitchStage.ToString(), durationSeconds = _stageDurationSeconds },
                BeforeState: new { stage = previousStage.ToString() },
                AfterState: new { stage = _pitchStage.ToString() },
                EventVersion: 1
            ));
        }

        return new PitchTransitionResult(true, previousStage, _pitchStage, _pitchStageStartedAt, null, ArchivedRound: archivedRound);
    }

    public PitchResetResult ResetPitch()
    {
        ActiveSessionSnapshot snapshot;
        PitchResetResult result;

        lock (_contextLock)
        {
            _pitchStage = PitchStage.Waiting;
            _pitchStageStartedAt = DateTimeOffset.UtcNow;
            _stageDurationSeconds = 0;
            _isTimerPaused = false;
            _timerPausedAt = null;
            _totalPausedSeconds = 0.0;
            _lastUpdated = DateTimeOffset.UtcNow;
            _hasReachedVoting = false;
            _isCurrentRoundArchived = false;

            // Limpa metadados de recovery ao resetar
            _recoveredFromCrash = false;
            _interruptedStage = null;
            _recoveredAt = null;

            ResetChairsInternal();
            snapshot = CreateSnapshotUnderLock();

            result = new PitchResetResult(true, _pitchStage, _pitchStageStartedAt.Value, _currentProjectId);
        }

        PersistSnapshot(snapshot);

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ActiveSessionUpdated",
            AggregateType: "Session",
            AggregateId: "singleton-1",
            ArenaEventId: _currentEventId,
            ProjectId: _currentProjectId,
            ActorType: ActorType.Operator,
            Payload: new { action = "ResetPitch", stage = "Waiting", projectId = _currentProjectId },
            AfterState: new { stage = "Waiting" },
            EventVersion: 1
        ));

        return result;
    }

    public PitchTimerActionResult PausePitchTimer()
    {
        ActiveSessionSnapshot? snapshotToPersist = null;
        PitchTimerActionResult result;

        lock (_contextLock)
        {
            if (_pitchStage == PitchStage.Waiting || _pitchStage == PitchStage.Finished)
            {
                return new PitchTimerActionResult(false, _isTimerPaused, _timerPausedAt, 0, _stageDurationSeconds, "Não é possível pausar um estágio inativo.");
            }
            if (_isTimerPaused)
            {
                return new PitchTimerActionResult(true, true, _timerPausedAt, CalculateRemainingSeconds(), _stageDurationSeconds);
            }

            _isTimerPaused = true;
            _timerPausedAt = DateTimeOffset.UtcNow;
            _lastUpdated = DateTimeOffset.UtcNow;

            snapshotToPersist = CreateSnapshotUnderLock();
            result = new PitchTimerActionResult(true, true, _timerPausedAt, CalculateRemainingSeconds(), _stageDurationSeconds);
        }

        if (snapshotToPersist != null)
        {
            PersistSnapshot(snapshotToPersist);

            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "PitchPaused",
                AggregateType: "Pitch",
                AggregateId: _currentProjectId ?? "session",
                ArenaEventId: _currentEventId,
                ProjectId: _currentProjectId,
                ActorType: ActorType.Operator,
                Payload: new
                {
                    stage = _pitchStage.ToString(),
                    remainingSeconds = result.RemainingSeconds,
                    pausedAt = _timerPausedAt
                },
                BeforeState: new { paused = false },
                AfterState: new { paused = true },
                EventVersion: 1
            ));
        }

        return result;
    }

    public PitchTimerActionResult ResumePitchTimer()
    {
        ActiveSessionSnapshot? snapshotToPersist = null;
        PitchTimerActionResult result;
        double pauseDuration = 0.0;

        lock (_contextLock)
        {
            if (!_isTimerPaused || !_timerPausedAt.HasValue)
            {
                return new PitchTimerActionResult(true, false, null, CalculateRemainingSeconds(), _stageDurationSeconds);
            }

            pauseDuration = (DateTimeOffset.UtcNow - _timerPausedAt.Value).TotalSeconds;
            _totalPausedSeconds += Math.Max(0, pauseDuration);
            _isTimerPaused = false;
            _timerPausedAt = null;
            _lastUpdated = DateTimeOffset.UtcNow;

            snapshotToPersist = CreateSnapshotUnderLock();
            result = new PitchTimerActionResult(true, false, null, CalculateRemainingSeconds(), _stageDurationSeconds);
        }

        if (snapshotToPersist != null)
        {
            PersistSnapshot(snapshotToPersist);

            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "PitchResumed",
                AggregateType: "Pitch",
                AggregateId: _currentProjectId ?? "session",
                ArenaEventId: _currentEventId,
                ProjectId: _currentProjectId,
                ActorType: ActorType.Operator,
                Payload: new
                {
                    stage = _pitchStage.ToString(),
                    remainingSeconds = result.RemainingSeconds,
                    pauseDurationSeconds = Math.Round(pauseDuration, 2)
                },
                BeforeState: new { paused = true },
                AfterState: new { paused = false },
                EventVersion: 1
            ));
        }

        return result;
    }

    public PitchTimerActionResult AdjustPitchTimer(int addSeconds)
    {
        ActiveSessionSnapshot snapshot;
        PitchTimerActionResult result;

        lock (_contextLock)
        {
            _stageDurationSeconds = Math.Max(0, _stageDurationSeconds + addSeconds);
            _lastUpdated = DateTimeOffset.UtcNow;

            snapshot = CreateSnapshotUnderLock();
            result = new PitchTimerActionResult(true, _isTimerPaused, _timerPausedAt, CalculateRemainingSeconds(), _stageDurationSeconds);
        }

        PersistSnapshot(snapshot);

        if (result.RemainingSeconds <= 0 && _stageDurationSeconds > 0)
        {
            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "PitchExpired",
                AggregateType: "Pitch",
                AggregateId: _currentProjectId ?? "session",
                ArenaEventId: _currentEventId,
                ProjectId: _currentProjectId,
                ActorType: ActorType.Operator,
                Payload: new { stage = _pitchStage.ToString(), deltaSeconds = addSeconds, remainingSeconds = result.RemainingSeconds },
                EventVersion: 1
            ));
        }

        return result;
    }

    private double CalculateRemainingSeconds()
    {
        if (!_pitchStageStartedAt.HasValue || _stageDurationSeconds <= 0) return 0.0;
        var now = _isTimerPaused && _timerPausedAt.HasValue ? _timerPausedAt.Value : DateTimeOffset.UtcNow;
        var elapsed = Math.Max(0, (now - _pitchStageStartedAt.Value).TotalSeconds - _totalPausedSeconds);
        return Math.Max(0, _stageDurationSeconds - elapsed);
    }

    private static IReadOnlyList<string> GetAllowedTransitions(PitchStage current) => current switch
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

    // =========================================================================
    // 8. CADEIRAS DA ARENA & LOCKOUT (Persistência Fora do Lock Principal)
    // =========================================================================
    public ChairPressResult TryTurnChair(int chairId, string source)
    {
        if (chairId < 1 || chairId > 5)
        {
            return new ChairPressResult(false, false, true, false, chairId, GetActiveChairCount(), "Cadeira inválida.");
        }

        using var context = _contextFactory.CreateDbContext();
        var currentEvent = context.Events.AsNoTracking().FirstOrDefault(e => e.Id == _currentEventId);
        var lockoutEnabled = currentEvent?.Timers.LockoutEnabled ?? false;

        ActiveSessionSnapshot? snapshotToPersist = null;
        ChairPressResult result;

        lock (_contextLock)
        {
            if (lockoutEnabled)
            {
                var remaining = CalculateRemainingSeconds();
                var isExpired = _stageDurationSeconds > 0 && remaining <= 0;
                var isVotingAllowed = _pitchStage == PitchStage.VotingOpen && !_isTimerPaused && !isExpired;

                if (!isVotingAllowed)
                {
                    return new ChairPressResult(false, true, false, false, chairId, GetActiveChairCount(), "Votação bloqueada (Lockout ativo).");
                }
            }

            if (_chairStates[chairId])
            {
                return new ChairPressResult(false, false, false, true, chairId, GetActiveChairCount(), "Cadeira já acionada.");
            }

            _chairStates[chairId] = true;
            _lastUpdated = DateTimeOffset.UtcNow;

            snapshotToPersist = CreateSnapshotUnderLock();
            result = new ChairPressResult(true, false, false, false, chairId, GetActiveChairCount());
        }

        if (snapshotToPersist != null)
        {
            PersistSnapshot(snapshotToPersist);
        }

        if (result.Success)
        {
            var actorType = (source ?? "").ToLowerInvariant() switch
            {
                var s when s.Contains("esp32") => ActorType.ESP32,
                var s when s.Contains("voicestudio") => ActorType.VoiceStudio,
                _ => ActorType.Operator
            };

            _auditPublisher?.Publish(new AuditEventRecord(
                EventType: "ChairPressed",
                AggregateType: "Chair",
                AggregateId: chairId.ToString(),
                ArenaEventId: _currentEventId,
                ProjectId: _currentProjectId,
                ActorType: actorType,
                ActorName: actorType == ActorType.ESP32 ? $"ESP32 Chair {chairId}" : (actorType == ActorType.VoiceStudio ? "VoiceStudio Panel" : "Operator"),
                Payload: new
                {
                    chairId = chairId,
                    source = source,
                    activeCount = result.ActiveCount,
                    stage = _pitchStage.ToString()
                },
                BeforeState: new { turned = false },
                AfterState: new { turned = true },
                EventVersion: 1
            ));
        }

        return result;
    }

    private void ResetChairsInternal()
    {
        for (int i = 1; i <= 5; i++)
        {
            _chairStates[i] = false;
        }
        _lastUpdated = DateTimeOffset.UtcNow;
    }

    public void ResetChairs()
    {
        ActiveSessionSnapshot snapshot;
        int activeBefore = 0;
        lock (_contextLock)
        {
            activeBefore = GetActiveChairCount();
            ResetChairsInternal();
            snapshot = CreateSnapshotUnderLock();
        }

        PersistSnapshot(snapshot);

        _auditPublisher?.Publish(new AuditEventRecord(
            EventType: "ChairReset",
            AggregateType: "Chair",
            AggregateId: "all",
            ArenaEventId: _currentEventId,
            ProjectId: _currentProjectId,
            ActorType: ActorType.Operator,
            Payload: new { resetCount = 5, activeBefore = activeBefore },
            BeforeState: new { activeCount = activeBefore },
            AfterState: new { activeCount = 0 },
            EventVersion: 1
        ));
    }

    public IReadOnlyDictionary<int, bool> GetChairStates() => _chairStates;

    public int GetActiveChairCount() => _chairStates.Values.Count(v => v);
}
