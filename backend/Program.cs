using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.Hubs;
using ArenaVoicePocBackend.Persistence;
using ArenaVoicePocBackend.Persistence.Options;
using ArenaVoicePocBackend.Persistence.Startup;
using ArenaVoicePocBackend.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

// Configuração de host e porta (permite sobrescrita por variáveis de ambiente)
var hostEnv = Environment.GetEnvironmentVariable("BACKEND_HOST") ?? "0.0.0.0";
var portEnv = Environment.GetEnvironmentVariable("BACKEND_PORT");
var port = int.TryParse(portEnv, out var p) ? p : 5000;

builder.WebHost.ConfigureKestrel(options =>
{
    var bindAddress = hostEnv == "127.0.0.1" || hostEnv == "localhost" ? IPAddress.Loopback : IPAddress.Any;
    options.Listen(bindAddress, port);
});

// Configuração CORS permissiva para desenvolvimento local
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddSignalR();

// =========================================================================
// CONFIGURAÇÃO DE PERSISTÊNCIA & REGISTRO CONDICIONAL DE SERVIÇOS (MILESTONE 4A)
// =========================================================================
var persistenceSection = builder.Configuration.GetSection(ArenaPersistenceOptions.SectionName);
builder.Services.Configure<ArenaPersistenceOptions>(persistenceSection);

var persistenceOptions = persistenceSection.Get<ArenaPersistenceOptions>() ?? new ArenaPersistenceOptions();
var storageEngineEnv = Environment.GetEnvironmentVariable("ARENA_STORAGE_ENGINE") ?? Environment.GetEnvironmentVariable("ARENA_STORAGE");
var effectiveStorageEngine = !string.IsNullOrWhiteSpace(storageEngineEnv)
    ? storageEngineEnv
    : persistenceOptions.StorageEngine;

if (string.Equals(effectiveStorageEngine, "memory", StringComparison.OrdinalIgnoreCase))
{
    // Modo de Compatibilidade: Memória Volátil pura (sem dependência de banco de dados)
    builder.Services.AddSingleton<IArenaProjectStore, ArenaProjectStore>();
}
else
{
    // Modo Oficial: PostgreSQL Portable via EF Core 10 + Npgsql
    builder.Services.AddPooledDbContextFactory<ArenaDbContext>(opt =>
    {
        opt.UseNpgsql(persistenceOptions.ConnectionString, npgsqlOpt =>
        {
            npgsqlOpt.CommandTimeout(persistenceOptions.CommandTimeoutSeconds);
        });

        if (persistenceOptions.EnableSensitiveDataLogging)
        {
            opt.EnableSensitiveDataLogging();
        }
    });

    builder.Services.AddScoped(sp => sp.GetRequiredService<IDbContextFactory<ArenaDbContext>>().CreateDbContext());
    builder.Services.AddSingleton<IArenaProjectStore, PostgresArenaProjectStore>();
}

var app = builder.Build();

// Validação de inicialização e aplicação automática de migrações no boot
var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseStartup");
DatabaseStartupValidator.ValidateAndMigrate(app.Services, logger);

app.UseCors();

// =========================================================================
// 1. ENDPOINTS PRINCIPAIS DE CADEIRA: LOCKOUT AUTORITATIVO & HARDWARE BRIDGE
// Compatível com { "chairId": 1 } e também { "seatNumber": 1 }
// =========================================================================
app.MapPost("/api/chair-press", async (ChairPressRequest request, HttpContext http, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    int id = request.GetEffectiveChairId();
    var clientIp = http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
    var timestamp = DateTimeOffset.UtcNow;
    var horaFormatada = timestamp.ToLocalTime().ToString("HH:mm:ss.fff");

    var result = store.TryTurnChair(id, "HTTP_API");

    if (result.IsInvalidChair)
    {
        return Results.BadRequest(new
        {
            error = result.ErrorMessage ?? "chairId inválido. Deve ser um número entre 1 e 5.",
            received = id
        });
    }

    if (result.IsLocked)
    {
        var pitchState = store.GetPitchState();
        return Results.Conflict(new
        {
            accepted = false,
            error = result.ErrorMessage,
            currentStage = pitchState.StageName,
            isVotingAllowed = false,
            chairId = id
        });
    }

    Console.WriteLine($"\n=======================================================");
    Console.WriteLine($"[HARDWARE / HTTP] CADEIRA #{id} ACIONADA!");
    Console.WriteLine($" Origem IP:  {clientIp}");
    Console.WriteLine($" Horário:    {horaFormatada}");
    Console.WriteLine($" Já virada:  {result.AlreadyTurned}");
    Console.WriteLine($"=======================================================");

    if (!result.AlreadyTurned)
    {
        // Dispara evento em tempo real via SignalR para o Voice Studio 3D
        await hubContext.Clients.All.SendAsync("ChairTurned", new
        {
            chairId = id,
            timestamp = timestamp,
            source = "HTTP_API"
        });

        // Evento retrocompatível
        await hubContext.Clients.All.SendAsync("ChairSupported", new
        {
            seatNumber = id,
            chairId = id
        });
    }

    return Results.Ok(new
    {
        accepted = true,
        chairId = id,
        alreadyTurned = result.AlreadyTurned,
        activeCount = result.ActiveCount,
        message = $"Cadeira #{id} virada com sucesso no Voice Studio 3D",
        serverTime = horaFormatada
    });
});

// Alias retrocompatível: POST /api/support
app.MapPost("/api/support", async (ChairPressRequest request, HttpContext http, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    int id = request.GetEffectiveChairId();
    var clientIp = http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
    var timestamp = DateTimeOffset.UtcNow;
    var horaFormatada = timestamp.ToLocalTime().ToString("HH:mm:ss.fff");

    var result = store.TryTurnChair(id, "HTTP_SUPPORT");

    if (result.IsInvalidChair)
    {
        return Results.BadRequest(new { error = "seatNumber deve estar entre 1 e 5." });
    }

    if (result.IsLocked)
    {
        var pitchState = store.GetPitchState();
        return Results.Conflict(new
        {
            accepted = false,
            error = result.ErrorMessage,
            currentStage = pitchState.StageName,
            isVotingAllowed = false,
            seatNumber = id,
            chairId = id
        });
    }

    Console.WriteLine($"[HTTP /api/support] Cadeira #{id} apoiada!");

    if (!result.AlreadyTurned)
    {
        await hubContext.Clients.All.SendAsync("ChairTurned", new { chairId = id, timestamp, source = "HTTP_SUPPORT" });
        await hubContext.Clients.All.SendAsync("ChairSupported", new { seatNumber = id, chairId = id });
    }

    return Results.Ok(new
    {
        accepted = true,
        seatNumber = id,
        chairId = id,
        alreadyTurned = result.AlreadyTurned,
        activeCount = result.ActiveCount
    });
});

// =========================================================================
// 2. ENDPOINTS AUXILIARES DE DIAGNÓSTICO E RESET
// =========================================================================

// GET /api/state — Retorna o estado atual das 5 cadeiras e o contexto de evento/projeto/timers/banca
app.MapGet("/api/state", (IArenaProjectStore store) =>
{
    var activeContext = store.GetActiveContext();
    var jury = activeContext.CurrentEventId != null
        ? store.GetEventJury(activeContext.CurrentEventId)
        : Array.Empty<EventJuryAssignment>();

    return Results.Ok(new
    {
        chairs = store.GetChairStates(),
        activeCount = store.GetActiveChairCount(),
        currentEvent = store.GetCurrentEvent(),
        currentProject = store.GetCurrentProject(),
        pitchState = store.GetPitchState(),
        jury = jury
    });
});

// POST /api/reset — Reseta todas as cadeiras e notifica o Voice Studio
app.MapPost("/api/reset", async (IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    store.ResetChairs();
    Console.WriteLine("[POC] Todas as cadeiras foram resetadas pelo operador.");
    await hubContext.Clients.All.SendAsync("ChairsReset");

    return Results.Ok(new { message = "Todas as cadeiras foram resetadas.", chairs = store.GetChairStates() });
});

// GET /api/status — Health check rápido
app.MapGet("/api/status", () => Results.Ok(new
{
    status = "ONLINE",
    service = "Arena Voice POC Minimal Bridge",
    port = port,
    timestamp = DateTimeOffset.UtcNow
}));

// =========================================================================
// 3. EVENT & PROJECT MANAGEMENT ENDPOINTS (Milestone 2B, 3A & 3C)
// =========================================================================

// GET /api/events/current — Obtém os detalhes, branding e timers do evento ativo
app.MapGet("/api/events/current", (IArenaProjectStore store) =>
{
    var currentEvent = store.GetCurrentEvent();
    return currentEvent != null
        ? Results.Ok(currentEvent)
        : Results.NotFound(new { error = "Nenhum evento ativo encontrado." });
});

// PUT /api/events/current — Atualiza metadados, branding ou timers do evento ativo
app.MapPut("/api/events/current", async (UpdateEventDto dto, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var currentEvent = store.GetCurrentEvent();
    if (currentEvent == null)
    {
        return Results.NotFound(new { error = "Nenhum evento ativo encontrado." });
    }

    if (!string.IsNullOrWhiteSpace(dto.Title))
    {
        if (dto.Title.Trim().Length < 3 || dto.Title.Trim().Length > 150)
            return Results.BadRequest(new { error = "O título deve ter entre 3 e 150 caracteres." });
        currentEvent.Title = dto.Title.Trim();
    }

    if (dto.Description != null)
    {
        currentEvent.Description = dto.Description.Trim();
    }

    if (dto.ScheduledDate.HasValue)
    {
        currentEvent.ScheduledDate = dto.ScheduledDate.Value;
    }

    bool brandingChanged = false;
    if (dto.Branding != null)
    {
        var hexRegex = new Regex(@"^#([A-Fa-f0-9]{6})$");
        var primary = dto.Branding.PrimaryColor ?? currentEvent.Branding.PrimaryColor;
        var secondary = dto.Branding.SecondaryColor ?? currentEvent.Branding.SecondaryColor;

        if (!hexRegex.IsMatch(primary))
            return Results.BadRequest(new { error = "primaryColor deve ser uma cor hexadecimal válida (ex: #d90429)." });
        if (!hexRegex.IsMatch(secondary))
            return Results.BadRequest(new { error = "secondaryColor deve ser uma cor hexadecimal válida (ex: #ffd166)." });

        currentEvent.Branding = new BrandingConfig
        {
            PrimaryColor = primary,
            SecondaryColor = secondary,
            LogoUrl = dto.Branding.LogoUrl ?? currentEvent.Branding.LogoUrl,
            Tagline = dto.Branding.Tagline ?? currentEvent.Branding.Tagline
        };
        brandingChanged = true;
    }

    if (dto.Timers != null)
    {
        currentEvent.Timers = new TimerConfig
        {
            PitchDurationSeconds = dto.Timers.PitchDurationSeconds.HasValue && dto.Timers.PitchDurationSeconds > 0
                ? dto.Timers.PitchDurationSeconds.Value
                : currentEvent.Timers.PitchDurationSeconds,
            QaDurationSeconds = dto.Timers.QaDurationSeconds.HasValue && dto.Timers.QaDurationSeconds > 0
                ? dto.Timers.QaDurationSeconds.Value
                : currentEvent.Timers.QaDurationSeconds,
            VotingDurationSeconds = dto.Timers.VotingDurationSeconds.HasValue && dto.Timers.VotingDurationSeconds > 0
                ? dto.Timers.VotingDurationSeconds.Value
                : currentEvent.Timers.VotingDurationSeconds,
            LockoutEnabled = dto.Timers.LockoutEnabled ?? currentEvent.Timers.LockoutEnabled
        };
    }

    store.UpdateEvent(currentEvent);

    if (brandingChanged)
    {
        await hubContext.Clients.All.SendAsync("EventBrandingUpdated", new
        {
            eventId = currentEvent.Id,
            branding = currentEvent.Branding,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(currentEvent);
});

// GET /api/events — Lista todos os eventos com filtro opcional por status
app.MapGet("/api/events", (IArenaProjectStore store, string? status) =>
{
    EventStatus? filter = null;
    if (!string.IsNullOrWhiteSpace(status))
    {
        if (Enum.TryParse<EventStatus>(status, ignoreCase: true, out var parsed))
        {
            filter = parsed;
        }
        else
        {
            return Results.BadRequest(new
            {
                error = $"Status inválido: '{status}'. Valores permitidos: Draft, Ready, Active, Finished, Archived.",
                allowed = Enum.GetNames<EventStatus>()
            });
        }
    }

    var events = store.GetAllEvents(filter);
    return Results.Ok(events);
});

// GET /api/events/{id} — Detalhes de um evento específico
app.MapGet("/api/events/{id}", (string id, IArenaProjectStore store) =>
{
    var evt = store.GetEventById(id);
    return evt != null
        ? Results.Ok(evt)
        : Results.NotFound(new { error = "Evento não encontrado.", id });
});

// POST /api/events — Cria novo evento
app.MapPost("/api/events", (CreateEventDto dto, IArenaProjectStore store) =>
{
    if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length < 3 || dto.Title.Trim().Length > 150)
    {
        return Results.BadRequest(new { error = "O título é obrigatório e deve ter entre 3 e 150 caracteres." });
    }

    var hexRegex = new Regex(@"^#([A-Fa-f0-9]{6})$");
    var primary = dto.Branding?.PrimaryColor ?? "#d90429";
    var secondary = dto.Branding?.SecondaryColor ?? "#ffd166";

    if (!hexRegex.IsMatch(primary))
        return Results.BadRequest(new { error = "primaryColor deve ser uma cor hexadecimal válida (ex: #d90429)." });
    if (!hexRegex.IsMatch(secondary))
        return Results.BadRequest(new { error = "secondaryColor deve ser uma cor hexadecimal válida (ex: #ffd166)." });

    var newEvent = new Event
    {
        Title = dto.Title.Trim(),
        Description = dto.Description?.Trim() ?? string.Empty,
        ScheduledDate = dto.ScheduledDate ?? DateTimeOffset.UtcNow.AddDays(7),
        Status = dto.Status ?? EventStatus.Draft,
        Branding = new BrandingConfig
        {
            PrimaryColor = primary,
            SecondaryColor = secondary,
            LogoUrl = dto.Branding?.LogoUrl?.Trim() ?? "/branding/event-logo.png",
            Tagline = dto.Branding?.Tagline?.Trim() ?? "O palco onde as melhores ideias conquistam as cadeiras."
        },
        Timers = new TimerConfig
        {
            PitchDurationSeconds = dto.Timers?.PitchDurationSeconds ?? 180,
            QaDurationSeconds = dto.Timers?.QaDurationSeconds ?? 120,
            VotingDurationSeconds = dto.Timers?.VotingDurationSeconds ?? 30,
            LockoutEnabled = dto.Timers?.LockoutEnabled ?? true
        }
    };

    var created = store.AddEvent(newEvent);
    return Results.Created($"/api/events/{created.Id}", created);
});

// PUT /api/events/{id} — Atualiza evento específico
app.MapPut("/api/events/{id}", async (string id, UpdateEventDto dto, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var evt = store.GetEventById(id);
    if (evt == null)
    {
        return Results.NotFound(new { error = "Evento não encontrado.", id });
    }

    if (!string.IsNullOrWhiteSpace(dto.Title))
    {
        if (dto.Title.Trim().Length < 3 || dto.Title.Trim().Length > 150)
            return Results.BadRequest(new { error = "O título deve ter entre 3 e 150 caracteres." });
        evt.Title = dto.Title.Trim();
    }

    if (dto.Description != null)
    {
        evt.Description = dto.Description.Trim();
    }

    if (dto.ScheduledDate.HasValue)
    {
        evt.ScheduledDate = dto.ScheduledDate.Value;
    }

    if (dto.Status.HasValue)
    {
        if (dto.Status.Value == EventStatus.Active && evt.Status != EventStatus.Active)
        {
            return Results.BadRequest(new
            {
                error = "Não é permitido promover um evento para 'Active' via PUT. Use POST /api/events/{id}/activate para ativação atômica."
            });
        }
        if (evt.Status != EventStatus.Active)
        {
            evt.Status = dto.Status.Value;
        }
    }

    bool brandingChanged = false;
    if (dto.Branding != null)
    {
        var hexRegex = new Regex(@"^#([A-Fa-f0-9]{6})$");
        var primary = dto.Branding.PrimaryColor ?? evt.Branding.PrimaryColor;
        var secondary = dto.Branding.SecondaryColor ?? evt.Branding.SecondaryColor;

        if (!hexRegex.IsMatch(primary))
            return Results.BadRequest(new { error = "primaryColor deve ser uma cor hexadecimal válida (ex: #d90429)." });
        if (!hexRegex.IsMatch(secondary))
            return Results.BadRequest(new { error = "secondaryColor deve ser uma cor hexadecimal válida (ex: #ffd166)." });

        evt.Branding = new BrandingConfig
        {
            PrimaryColor = primary,
            SecondaryColor = secondary,
            LogoUrl = dto.Branding.LogoUrl ?? evt.Branding.LogoUrl,
            Tagline = dto.Branding.Tagline ?? evt.Branding.Tagline
        };
        brandingChanged = true;
    }

    if (dto.Timers != null)
    {
        evt.Timers = new TimerConfig
        {
            PitchDurationSeconds = dto.Timers.PitchDurationSeconds.HasValue && dto.Timers.PitchDurationSeconds > 0
                ? dto.Timers.PitchDurationSeconds.Value
                : evt.Timers.PitchDurationSeconds,
            QaDurationSeconds = dto.Timers.QaDurationSeconds.HasValue && dto.Timers.QaDurationSeconds > 0
                ? dto.Timers.QaDurationSeconds.Value
                : evt.Timers.QaDurationSeconds,
            VotingDurationSeconds = dto.Timers.VotingDurationSeconds.HasValue && dto.Timers.VotingDurationSeconds > 0
                ? dto.Timers.VotingDurationSeconds.Value
                : evt.Timers.VotingDurationSeconds,
            LockoutEnabled = dto.Timers.LockoutEnabled ?? evt.Timers.LockoutEnabled
        };
    }

    store.UpdateEvent(evt);

    var activeContext = store.GetActiveContext();
    if (activeContext.CurrentEventId == id && brandingChanged)
    {
        await hubContext.Clients.All.SendAsync("EventBrandingUpdated", new
        {
            eventId = evt.Id,
            branding = evt.Branding,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(evt);
});

// POST /api/events/{id}/activate — Ativação atômica de evento
app.MapPost("/api/events/{id}/activate", async (string id, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var result = store.ActivateEvent(id);
    if (!result.Success)
    {
        return Results.NotFound(new { error = result.ErrorMessage, id });
    }

    await hubContext.Clients.All.SendAsync("ActiveEventChanged", new
    {
        @event = result.ActivatedEvent,
        previousEventId = result.PreviousEvent?.Id,
        timestamp = DateTimeOffset.UtcNow
    });

    return Results.Ok(new
    {
        success = true,
        activatedEvent = result.ActivatedEvent,
        previousEvent = result.PreviousEvent
    });
});

// POST /api/events/{id}/finish — Encerra formalmente o evento
app.MapPost("/api/events/{id}/finish", (string id, IArenaProjectStore store) =>
{
    var finished = store.FinishEvent(id);
    return finished != null
        ? Results.Ok(new { success = true, finishedEvent = finished })
        : Results.NotFound(new { error = "Evento não encontrado.", id });
});

// POST /api/events/{id}/archive — Arquiva evento inativo
app.MapPost("/api/events/{id}/archive", (string id, IArenaProjectStore store) =>
{
    var result = store.ArchiveEvent(id);
    if (!result.Success)
    {
        if (result.IsActiveEvent)
        {
            return Results.Conflict(new { error = result.ErrorMessage, id });
        }
        return Results.NotFound(new { error = result.ErrorMessage, id });
    }

    return Results.Ok(new { success = true, archivedEvent = result.ArchivedEvent });
});

// POST /api/events/{id}/duplicate — Duplica evento existente como Draft
app.MapPost("/api/events/{id}/duplicate", (string id, IArenaProjectStore store) =>
{
    var duplicated = store.DuplicateEvent(id);
    if (duplicated == null)
    {
        return Results.NotFound(new { error = "Evento de origem não encontrado.", id });
    }

    return Results.Created($"/api/events/{duplicated.Id}", duplicated);
});

// =========================================================================
// GESTÃO DE JURADOS & BANCA DO EVENTO (Milestone 3E)
// =========================================================================

// GET /api/judges — Catálogo global de jurados
app.MapGet("/api/judges", (IArenaProjectStore store, bool? includeInactive) =>
{
    var judges = store.GetAllJudges(includeInactive ?? false);
    return Results.Ok(judges);
});

// GET /api/judges/{id} — Detalhes de um jurado específico
app.MapGet("/api/judges/{id}", (string id, IArenaProjectStore store) =>
{
    var judge = store.GetJudgeById(id);
    return judge != null
        ? Results.Ok(judge)
        : Results.NotFound(new { error = "Jurado não encontrado.", id });
});

// POST /api/judges — Cadastra novo jurado no catálogo
app.MapPost("/api/judges", (CreateJudgeDto dto, IArenaProjectStore store) =>
{
    if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Trim().Length < 3 || dto.Name.Trim().Length > 100)
    {
        return Results.BadRequest(new { error = "O nome do jurado é obrigatório e deve ter entre 3 e 100 caracteres." });
    }
    if (string.IsNullOrWhiteSpace(dto.Company) || dto.Company.Trim().Length < 2)
    {
        return Results.BadRequest(new { error = "A empresa/organização é obrigatória." });
    }
    if (string.IsNullOrWhiteSpace(dto.Role) || dto.Role.Trim().Length < 2)
    {
        return Results.BadRequest(new { error = "O cargo do jurado é obrigatório." });
    }
    if (string.IsNullOrWhiteSpace(dto.AvatarUrl))
    {
        return Results.BadRequest(new { error = "A URL do avatar/foto é obrigatória." });
    }

    var newJudge = new Judge
    {
        Name = dto.Name.Trim(),
        Company = dto.Company.Trim(),
        Role = dto.Role.Trim(),
        AvatarUrl = dto.AvatarUrl.Trim(),
        Bio = dto.Bio?.Trim(),
        Expertise = dto.Expertise,
        SocialUrl = dto.SocialUrl?.Trim(),
        IsActive = dto.IsActive ?? true,
        Email = dto.Email?.Trim()
    };

    var created = store.AddJudge(newJudge);
    return Results.Created($"/api/judges/{created.Id}", created);
});

// PUT /api/judges/{id} — Atualiza dados cadastrais de um jurado
app.MapPut("/api/judges/{id}", (string id, UpdateJudgeDto dto, IArenaProjectStore store) =>
{
    var existing = store.GetJudgeById(id);
    if (existing == null)
    {
        return Results.NotFound(new { error = "Jurado não encontrado.", id });
    }

    if (!string.IsNullOrWhiteSpace(dto.Name))
    {
        if (dto.Name.Trim().Length < 3 || dto.Name.Trim().Length > 100)
            return Results.BadRequest(new { error = "O nome do jurado deve ter entre 3 e 100 caracteres." });
        existing.Name = dto.Name.Trim();
    }

    if (!string.IsNullOrWhiteSpace(dto.Company))
    {
        existing.Company = dto.Company.Trim();
    }

    if (!string.IsNullOrWhiteSpace(dto.Role))
    {
        existing.Role = dto.Role.Trim();
    }

    if (!string.IsNullOrWhiteSpace(dto.AvatarUrl))
    {
        existing.AvatarUrl = dto.AvatarUrl.Trim();
    }

    if (dto.Bio != null)
    {
        existing.Bio = dto.Bio.Trim();
    }

    if (dto.Expertise != null)
    {
        existing.Expertise = dto.Expertise;
    }

    if (dto.SocialUrl != null)
    {
        existing.SocialUrl = dto.SocialUrl.Trim();
    }

    if (dto.IsActive.HasValue)
    {
        existing.IsActive = dto.IsActive.Value;
    }

    if (dto.Email != null)
    {
        existing.Email = dto.Email.Trim();
    }

    store.UpdateJudge(existing);
    return Results.Ok(existing);
});

// DELETE /api/judges/{id} — Remove jurado com proteção contra exclusão de membros da banca ativa
app.MapDelete("/api/judges/{id}", (string id, IArenaProjectStore store) =>
{
    var result = store.DeleteJudge(id);
    if (result.NotFound)
    {
        return Results.NotFound(new { error = result.ErrorMessage, id });
    }
    if (result.IsAssignedToActiveEvent)
    {
        return Results.Conflict(new { error = result.ErrorMessage, id });
    }

    return Results.Ok(new { success = true, id, message = "Jurado removido com sucesso." });
});

// GET /api/events/{id}/jury — Obtém a composição da banca do evento
app.MapGet("/api/events/{id}/jury", (string id, IArenaProjectStore store) =>
{
    var evt = store.GetEventById(id);
    if (evt == null)
    {
        return Results.NotFound(new { error = "Evento não encontrado.", id });
    }

    var jury = store.GetEventJury(id);
    return Results.Ok(new EventJuryDto(id, jury.Select(j => new EventJuryMemberDto(j.ChairId, j.Judge!, j.AssignedAt)).ToList()));
});

// PUT /api/events/{id}/jury — Aloca ou atualiza a banca do evento
app.MapPut("/api/events/{id}/jury", async (string id, AssignEventJuryDto dto, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var evt = store.GetEventById(id);
    if (evt == null)
    {
        return Results.NotFound(new { error = "Evento não encontrado.", id });
    }

    var result = store.AssignEventJury(id, dto.Assignments ?? Array.Empty<JuryAssignmentItemDto>());
    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.ErrorMessage, id });
    }

    var activeContext = store.GetActiveContext();
    if (activeContext.CurrentEventId == id)
    {
        await hubContext.Clients.All.SendAsync("EventJuryUpdated", new
        {
            eventId = id,
            jury = result.Jury,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(new EventJuryDto(id, result.Jury!.Select(j => new EventJuryMemberDto(j.ChairId, j.Judge!, j.AssignedAt)).ToList()));
});

// GET /api/projects — Lista projetos do evento
app.MapGet("/api/projects", (IArenaProjectStore store, string? eventId, bool? includeCompleted) =>
{
    var targetEventId = eventId ?? store.GetActiveContext().CurrentEventId;
    if (string.IsNullOrEmpty(targetEventId))
    {
        return Results.Ok(Array.Empty<Project>());
    }

    var projects = store.GetProjectsByEvent(targetEventId, includeCompleted ?? false);
    return Results.Ok(projects);
});

// GET /api/projects/{id} — Obtém detalhes de um projeto específico
app.MapGet("/api/projects/{id}", (string id, IArenaProjectStore store) =>
{
    var project = store.GetProjectById(id);
    return project != null
        ? Results.Ok(project)
        : Results.NotFound(new { error = "Projeto não encontrado.", id });
});

// POST /api/projects — Cria novo projeto
app.MapPost("/api/projects", (CreateProjectDto dto, IArenaProjectStore store) =>
{
    var currentEvent = store.GetCurrentEvent();
    if (currentEvent == null)
    {
        return Results.NotFound(new { error = "Nenhum evento ativo para associar o projeto." });
    }

    if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length < 3 || dto.Title.Trim().Length > 120)
    {
        return Results.BadRequest(new { error = "O campo title é obrigatório e deve ter entre 3 e 120 caracteres." });
    }

    if (string.IsNullOrWhiteSpace(dto.PitchLeader) || dto.PitchLeader.Trim().Length < 2 || dto.PitchLeader.Trim().Length > 100)
    {
        return Results.BadRequest(new { error = "O campo pitchLeader é obrigatório e deve ter entre 2 e 100 caracteres." });
    }

    if (string.IsNullOrWhiteSpace(dto.Track) || dto.Track.Trim().Length < 2 || dto.Track.Trim().Length > 50)
    {
        return Results.BadRequest(new { error = "O campo track é obrigatório e deve ter entre 2 e 50 caracteres." });
    }

    var existingProjects = store.GetProjectsByEvent(currentEvent.Id, includeCompleted: true);
    var nextOrderIndex = dto.OrderIndex is > 0
        ? dto.OrderIndex.Value
        : (existingProjects.Count > 0 ? existingProjects.Max(p => p.OrderIndex) + 1 : 1);

    var project = new Project
    {
        EventId = currentEvent.Id,
        Title = dto.Title.Trim(),
        PitchLeader = dto.PitchLeader.Trim(),
        Track = dto.Track.Trim(),
        Description = dto.Description?.Trim() ?? string.Empty,
        OrderIndex = nextOrderIndex,
        Status = ProjectStatus.Pending,
        Media = new ProjectMedia
        {
            LogoUrl = dto.LogoUrl?.Trim() ?? string.Empty,
            CoverImageUrl = dto.CoverImageUrl?.Trim() ?? string.Empty
        }
    };

    var created = store.AddProject(project);
    return Results.Created($"/api/projects/{created.Id}", created);
});

// PUT /api/projects/{id} — Atualiza dados de um projeto existente
app.MapPut("/api/projects/{id}", async (string id, UpdateProjectDto dto, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var project = store.GetProjectById(id);
    if (project == null)
    {
        return Results.NotFound(new { error = "Projeto não encontrado.", id });
    }

    if (!string.IsNullOrWhiteSpace(dto.Title))
    {
        if (dto.Title.Trim().Length < 3 || dto.Title.Trim().Length > 120)
            return Results.BadRequest(new { error = "O campo title deve ter entre 3 e 120 caracteres." });
        project.Title = dto.Title.Trim();
    }

    if (!string.IsNullOrWhiteSpace(dto.PitchLeader))
    {
        if (dto.PitchLeader.Trim().Length < 2 || dto.PitchLeader.Trim().Length > 100)
            return Results.BadRequest(new { error = "O campo pitchLeader deve ter entre 2 e 100 caracteres." });
        project.PitchLeader = dto.PitchLeader.Trim();
    }

    if (!string.IsNullOrWhiteSpace(dto.Track))
    {
        if (dto.Track.Trim().Length < 2 || dto.Track.Trim().Length > 50)
            return Results.BadRequest(new { error = "O campo track deve ter entre 2 e 50 caracteres." });
        project.Track = dto.Track.Trim();
    }

    if (dto.Description != null)
    {
        project.Description = dto.Description.Trim();
    }

    if (dto.OrderIndex is > 0)
    {
        project.OrderIndex = dto.OrderIndex.Value;
    }

    if (dto.LogoUrl != null || dto.CoverImageUrl != null)
    {
        project.Media = new ProjectMedia
        {
            LogoUrl = dto.LogoUrl?.Trim() ?? project.Media.LogoUrl,
            CoverImageUrl = dto.CoverImageUrl?.Trim() ?? project.Media.CoverImageUrl
        };
    }

    if (dto.Status.HasValue)
    {
        project.Status = dto.Status.Value;
    }

    store.UpdateProject(project);

    var activeContext = store.GetActiveContext();
    if (activeContext.CurrentProjectId == id)
    {
        await hubContext.Clients.All.SendAsync("CurrentProjectChanged", new
        {
            project = project,
            previousProjectId = (string?)null,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(project);
});

// DELETE /api/projects/{id} — Remove um projeto
app.MapDelete("/api/projects/{id}", (string id, IArenaProjectStore store) =>
{
    var deleteResult = store.DeleteProject(id);
    if (deleteResult.IsActiveProject)
    {
        return Results.Conflict(new { error = "Cannot delete the currently active project." });
    }

    if (deleteResult.NotFound)
    {
        return Results.NotFound(new { error = "Projeto não encontrado.", id });
    }

    return Results.Ok(new { message = "Projeto removido com sucesso.", id });
});

// POST /api/projects/{id}/select — Seleciona projeto ativo
app.MapPost("/api/projects/{id}/select", async (string id, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var result = store.SelectProject(id);
    if (!result.Success)
    {
        if (result.ErrorMessage?.Contains("não pertence ao evento ativo") == true)
        {
            return Results.BadRequest(new { error = result.ErrorMessage, id });
        }
        return Results.NotFound(new { error = result.ErrorMessage ?? "Projeto não encontrado.", id });
    }

    if (result.PreviousProject != null || result.CurrentProject != null)
    {
        await hubContext.Clients.All.SendAsync("CurrentProjectChanged", new
        {
            project = result.CurrentProject,
            previousProjectId = result.PreviousProject?.Id,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    // Notifica arquivamento de rodada anterior (se arquivada durante troca de projeto)
    if (result.ArchivedRound != null)
    {
        await hubContext.Clients.All.SendAsync("RoundArchived", new
        {
            round = RoundDto.FromEntity(result.ArchivedRound),
            timestamp = DateTimeOffset.UtcNow
        });
    }

    // Notifica reset de cadeiras
    await hubContext.Clients.All.SendAsync("ChairsReset");

    var activePitch = store.GetPitchState();
    await hubContext.Clients.All.SendAsync("PitchStageChanged", new
    {
        projectId = result.CurrentProject?.Id,
        previousStage = (string?)null,
        currentStage = activePitch.StageName,
        stage = activePitch.StageName,
        stageCode = activePitch.StageCode,
        stageStartedAt = activePitch.StageStartedAt,
        durationSeconds = activePitch.DurationSeconds,
        remainingSeconds = activePitch.RemainingSeconds,
        isPaused = activePitch.IsPaused,
        isExpired = activePitch.IsExpired,
        isVotingAllowed = activePitch.IsVotingAllowed,
        timestamp = DateTimeOffset.UtcNow
    });

    return Results.Ok(new
    {
        success = true,
        currentProject = result.CurrentProject,
        previousProject = result.PreviousProject,
        activeContext = store.GetActiveContext()
    });
});

// =========================================================================
// 4. PITCH LIFECYCLE & TIMERS ENGINE (MILESTONE 3B & 3C)
// =========================================================================

// GET /api/pitch/state — Retorna estado atual da máquina de estados do pitch e timers
app.MapGet("/api/pitch/state", (IArenaProjectStore store) =>
{
    return Results.Ok(store.GetPitchState());
});

// POST /api/pitch/transition — Endpoint canônico de transição de estágio
app.MapPost("/api/pitch/transition", async (PitchTransitionDto dto, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var raw = dto?.TargetStage ?? string.Empty;
    var normalized = raw.Trim().Replace("&", "").Replace(" ", "").ToLowerInvariant();

    PitchStage targetStage;
    if (normalized == "waiting" || normalized == "0")
        targetStage = PitchStage.Waiting;
    else if (normalized == "pitchrunning" || normalized == "running" || normalized == "pitch" || normalized == "1")
        targetStage = PitchStage.PitchRunning;
    else if (normalized == "qa" || normalized == "qanda" || normalized == "2")
        targetStage = PitchStage.QA;
    else if (normalized == "votingopen" || normalized == "voting_open" || normalized == "voteopen" || normalized == "3")
        targetStage = PitchStage.VotingOpen;
    else if (normalized == "votingclosed" || normalized == "voting_closed" || normalized == "voteclosed" || normalized == "4")
        targetStage = PitchStage.VotingClosed;
    else if (normalized == "finished" || normalized == "complete" || normalized == "completed" || normalized == "5")
        targetStage = PitchStage.Finished;
    else
    {
        return Results.UnprocessableEntity(new
        {
            error = $"Estágio de transição desconhecido ou inválido: '{raw}'.",
            allowedStages = Enum.GetNames<PitchStage>()
        });
    }

    var result = store.TransitionPitch(targetStage);
    if (!result.Success)
    {
        if (result.NoActiveProject)
        {
            return Results.BadRequest(new { error = result.ErrorMessage });
        }
        if (result.IsInvalidTransition)
        {
            return Results.UnprocessableEntity(new
            {
                error = result.ErrorMessage,
                currentStage = result.CurrentStage.ToString(),
                targetStage = targetStage.ToString()
            });
        }
        return Results.BadRequest(new { error = result.ErrorMessage });
    }

    var state = store.GetPitchState();

    // Transmite evento canônico SignalR PitchStageChanged enriquecido com timers
    await hubContext.Clients.All.SendAsync("PitchStageChanged", new
    {
        projectId = state.ProjectId,
        previousStage = result.PreviousStage.ToString(),
        currentStage = result.CurrentStage.ToString(),
        stage = result.CurrentStage.ToString(),
        stageCode = (int)result.CurrentStage,
        stageStartedAt = result.StartedAt,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isPaused = state.IsPaused,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed,
        timestamp = DateTimeOffset.UtcNow
    });

    // Se a rodada foi arquivada ao atingir Finished, emite evento SignalR RoundArchived
    if (result.ArchivedRound != null)
    {
        await hubContext.Clients.All.SendAsync("RoundArchived", new
        {
            round = RoundDto.FromEntity(result.ArchivedRound),
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(new
    {
        success = true,
        previousStage = result.PreviousStage.ToString(),
        currentStage = result.CurrentStage.ToString(),
        stageCode = (int)result.CurrentStage,
        stageStartedAt = result.StartedAt,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isPaused = state.IsPaused,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed,
        allowedTransitions = state.AllowedTransitions,
        archivedRound = result.ArchivedRound != null ? RoundDto.FromEntity(result.ArchivedRound) : null
    });
});

// POST /api/pitch/reset — Reseta cadeiras e retorna estágio para Waiting mantendo projeto
app.MapPost("/api/pitch/reset", async (IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var resetResult = store.ResetPitch();

    await hubContext.Clients.All.SendAsync("ChairsReset");
    await hubContext.Clients.All.SendAsync("PitchStageChanged", new
    {
        projectId = resetResult.ProjectId,
        previousStage = (string?)null,
        currentStage = resetResult.CurrentStage.ToString(),
        stage = resetResult.CurrentStage.ToString(),
        stageCode = (int)resetResult.CurrentStage,
        stageStartedAt = resetResult.StartedAt,
        durationSeconds = 0,
        remainingSeconds = 0.0,
        isPaused = false,
        isExpired = false,
        isVotingAllowed = false,
        source = "RESET",
        timestamp = DateTimeOffset.UtcNow
    });

    return Results.Ok(new
    {
        success = true,
        stage = resetResult.CurrentStage.ToString(),
        stageCode = (int)resetResult.CurrentStage,
        stageStartedAt = resetResult.StartedAt,
        durationSeconds = 0,
        remainingSeconds = 0.0,
        isPaused = false,
        isExpired = false,
        isVotingAllowed = false,
        projectId = resetResult.ProjectId,
        chairs = store.GetChairStates()
    });
});

// POST /api/pitch/timer/pause — Pausa o cronômetro do estágio ativo
app.MapPost("/api/pitch/timer/pause", async (IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var result = store.PausePitchTimer();
    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.ErrorMessage });
    }

    var state = store.GetPitchState();
    await hubContext.Clients.All.SendAsync("PitchTimerUpdated", new
    {
        projectId = state.ProjectId,
        stage = state.StageName,
        stageCode = state.StageCode,
        isPaused = true,
        pausedAt = result.PausedAt,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed,
        timestamp = DateTimeOffset.UtcNow
    });

    return Results.Ok(new
    {
        success = true,
        isPaused = true,
        pausedAt = result.PausedAt,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed
    });
});

// POST /api/pitch/timer/resume — Retoma a contagem do estágio ativo
app.MapPost("/api/pitch/timer/resume", async (IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var result = store.ResumePitchTimer();
    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.ErrorMessage });
    }

    var state = store.GetPitchState();
    await hubContext.Clients.All.SendAsync("PitchTimerUpdated", new
    {
        projectId = state.ProjectId,
        stage = state.StageName,
        stageCode = state.StageCode,
        isPaused = false,
        pausedAt = (DateTimeOffset?)null,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed,
        timestamp = DateTimeOffset.UtcNow
    });

    return Results.Ok(new
    {
        success = true,
        isPaused = false,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed
    });
});

// POST /api/pitch/timer/adjust — Ajusta a duração alocada da rodada (+30s, +60s, +120s)
app.MapPost("/api/pitch/timer/adjust", async (AdjustPitchTimerDto dto, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    if (dto.Seconds == 0)
    {
        return Results.BadRequest(new { error = "O valor de 'seconds' para ajuste deve ser diferente de zero." });
    }

    var result = store.AdjustPitchTimer(dto.Seconds);
    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.ErrorMessage });
    }

    var state = store.GetPitchState();
    await hubContext.Clients.All.SendAsync("PitchTimerUpdated", new
    {
        projectId = state.ProjectId,
        stage = state.StageName,
        stageCode = state.StageCode,
        isPaused = state.IsPaused,
        addedSeconds = dto.Seconds,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed,
        timestamp = DateTimeOffset.UtcNow
    });

    return Results.Ok(new
    {
        success = true,
        addedSeconds = dto.Seconds,
        durationSeconds = state.DurationSeconds,
        remainingSeconds = state.RemainingSeconds,
        isPaused = state.IsPaused,
        isExpired = state.IsExpired,
        isVotingAllowed = state.IsVotingAllowed
    });
});

// =========================================================================
// 5. ROUND HISTORY & RESULT ENGINE (MILESTONE 3D)
// =========================================================================

// GET /api/rounds — Lista histórico de rodadas com filtro opcional por eventId
app.MapGet("/api/rounds", (IArenaProjectStore store, string? eventId) =>
{
    var rounds = store.GetRoundHistory(eventId);
    var dtos = rounds.Select(RoundDto.FromEntity).ToList();
    return Results.Ok(dtos);
});

// GET /api/rounds/last — Obtém a última rodada arquivada
app.MapGet("/api/rounds/last", (IArenaProjectStore store) =>
{
    var last = store.GetLastRound();
    if (last == null)
    {
        return Results.NotFound(new { error = "Nenhuma rodada arquivada até o momento." });
    }
    return Results.Ok(RoundDto.FromEntity(last));
});

// GET /api/rounds/{id} — Obtém detalhes de uma rodada específica por ID
app.MapGet("/api/rounds/{id}", (string id, IArenaProjectStore store) =>
{
    var round = store.GetRoundById(id);
    if (round == null)
    {
        return Results.NotFound(new { error = "Rodada não encontrada.", id });
    }
    return Results.Ok(RoundDto.FromEntity(round));
});

// POST /api/rounds/archive — Força o arquivamento manual da rodada ativa
app.MapPost("/api/rounds/archive", async (IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var archived = store.ArchiveCurrentRound("ManualApi");
    if (archived == null)
    {
        return Results.Conflict(new { error = "Não há rodada elegível para arquivamento ou a rodada já foi arquivada." });
    }

    var dto = RoundDto.FromEntity(archived);
    await hubContext.Clients.All.SendAsync("RoundArchived", new
    {
        round = dto,
        timestamp = DateTimeOffset.UtcNow
    });

    return Results.Ok(dto);
});

// =========================================================================
// 6. MAPEAMENTO DO HUB SIGNALR
// =========================================================================
app.MapHub<ArenaPocHub>("/hubs/arena-poc");
app.MapHub<ArenaPocHub>("/arenaHub"); // Rota retrocompatível

// Exibição dos IPs locais no console para facilitar configuração do ESP32
Console.WriteLine("=============================================================");
Console.WriteLine("        ARENA VOICE POC — MINIMAL EVENT BRIDGE              ");
Console.WriteLine("=============================================================");
Console.WriteLine($" Escutando em: http://{hostEnv}:{port}");
Console.WriteLine(" Endpoints disponíveis:");
Console.WriteLine($"   POST http://<IP_DO_PC>:{port}/api/chair-press  (Recebe ESP32)");
Console.WriteLine($"   POST http://<IP_DO_PC>:{port}/api/support      (Retrocompatível)");
Console.WriteLine($"   POST http://localhost:{port}/api/reset        (Reset cadeiras)");
Console.WriteLine($"   GET  http://localhost:{port}/api/state        (Estado atual)");
Console.WriteLine($"   GET  http://localhost:{port}/api/status       (Health check)");
Console.WriteLine(" Hubs SignalR:");
Console.WriteLine($"   WS   http://localhost:{port}/hubs/arena-poc   (Voice Studio)");
Console.WriteLine($"   WS   http://localhost:{port}/arenaHub         (Retrocompatível)");
Console.WriteLine("-------------------------------------------------------------");
Console.WriteLine(" Endereços IP locais desta máquina detectados:");
try
{
    var host = Dns.GetHostEntry(Dns.GetHostName());
    foreach (var ip in host.AddressList.Where(a => a.AddressFamily == AddressFamily.InterNetwork))
    {
        Console.WriteLine($"   -> IPv4: {ip}  (Use este IP no sketch do ESP32 se estiver no mesmo Wi-Fi)");
    }
}
catch { }
Console.WriteLine("=============================================================\n");

app.Run();

// Modelo do payload aceito
public record ChairPressRequest(int? ChairId, int? SeatNumber)
{
    public int GetEffectiveChairId() => ChairId ?? SeatNumber ?? 0;
}
