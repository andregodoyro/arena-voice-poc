using ArenaVoicePocBackend.Domain.DTOs;
using ArenaVoicePocBackend.Domain.Entities;
using ArenaVoicePocBackend.Domain.Enums;
using ArenaVoicePocBackend.Hubs;
using ArenaVoicePocBackend.Services;
using Microsoft.AspNetCore.SignalR;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

// ConfiguraÃ§Ã£o de host e porta (permite sobrescrita por variÃ¡veis de ambiente)
var hostEnv = Environment.GetEnvironmentVariable("BACKEND_HOST") ?? "0.0.0.0";
var portEnv = Environment.GetEnvironmentVariable("BACKEND_PORT");
var port = int.TryParse(portEnv, out var p) ? p : 5000;

builder.WebHost.ConfigureKestrel(options =>
{
    var bindAddress = hostEnv == "127.0.0.1" || hostEnv == "localhost" ? IPAddress.Loopback : IPAddress.Any;
    options.Listen(bindAddress, port);
});

// ConfiguraÃ§Ã£o CORS permissiva para desenvolvimento local
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
builder.Services.AddSingleton<IArenaProjectStore, ArenaProjectStore>();

var app = builder.Build();

app.UseCors();

// Estado em memÃ³ria simples para a POC (sem banco de dados)
var chairStates = new Dictionary<int, bool>
{
    { 1, false }, { 2, false }, { 3, false }, { 4, false }, { 5, false }
};

// =========================================================================
// 1. ENDPOINT PRINCIPAL: POST /api/chair-press
// CompatÃ­vel com { "chairId": 1 } e tambÃ©m { "seatNumber": 1 }
// =========================================================================
app.MapPost("/api/chair-press", async (ChairPressRequest request, HttpContext http, IHubContext<ArenaPocHub> hubContext) =>
{
    int id = request.GetEffectiveChairId();

    // ValidaÃ§Ã£o de seguranÃ§a: o Arena Voice possui 5 cadeiras (1 a 5)
    if (id < 1 || id > 5)
    {
        return Results.BadRequest(new
        {
            error = "chairId invÃ¡lido. Deve ser um nÃºmero entre 1 e 5.",
            received = id
        });
    }

    var clientIp = http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
    var timestamp = DateTimeOffset.UtcNow;
    var horaFormatada = timestamp.ToLocalTime().ToString("HH:mm:ss.fff");

    // Atualiza estado em memÃ³ria
    chairStates[id] = true;

    Console.WriteLine($"\n=======================================================");
    Console.WriteLine($"[HARDWARE / HTTP] CADEIRA #{id} ACIONADA!");
    Console.WriteLine($" Origem IP:  {clientIp}");
    Console.WriteLine($" HorÃ¡rio:    {horaFormatada}");
    Console.WriteLine($"=======================================================");

    // Dispara evento em tempo real via SignalR para o Voice Studio 3D
    await hubContext.Clients.All.SendAsync("ChairTurned", new
    {
        chairId = id,
        timestamp = timestamp,
        source = "HTTP_API"
    });

    // Evento retrocompatÃ­vel
    await hubContext.Clients.All.SendAsync("ChairSupported", new
    {
        seatNumber = id,
        chairId = id
    });

    return Results.Ok(new
    {
        accepted = true,
        chairId = id,
        message = $"Cadeira #{id} virada com sucesso no Voice Studio 3D",
        serverTime = horaFormatada
    });
});

// Alias retrocompatÃ­vel com o repositÃ³rio teste: POST /api/support
app.MapPost("/api/support", async (ChairPressRequest request, HttpContext http, IHubContext<ArenaPocHub> hubContext) =>
{
    int id = request.GetEffectiveChairId();
    if (id < 1 || id > 5)
    {
        return Results.BadRequest(new { error = "seatNumber deve estar entre 1 e 5." });
    }

    chairStates[id] = true;
    var timestamp = DateTimeOffset.UtcNow;

    Console.WriteLine($"[HTTP /api/support] Cadeira #{id} apoiada!");

    await hubContext.Clients.All.SendAsync("ChairTurned", new { chairId = id, timestamp, source = "HTTP_SUPPORT" });
    await hubContext.Clients.All.SendAsync("ChairSupported", new { seatNumber = id, chairId = id });

    return Results.Ok(new { accepted = true, seatNumber = id, chairId = id });
});

// =========================================================================
// 2. ENDPOINTS AUXILIARES DE DIAGNÃ“STICO E RESET
// =========================================================================

// GET /api/state â€” Retorna o estado atual das 5 cadeiras e o contexto de evento/projeto
app.MapGet("/api/state", (IArenaProjectStore store) => Results.Ok(new
{
    chairs = chairStates,
    activeCount = chairStates.Count(c => c.Value),
    currentEvent = store.GetCurrentEvent(),
    currentProject = store.GetCurrentProject()
}));

// POST /api/reset â€” Reseta todas as cadeiras e notifica o Voice Studio
app.MapPost("/api/reset", async (IHubContext<ArenaPocHub> hubContext) =>
{
    foreach (var key in chairStates.Keys.ToList())
    {
        chairStates[key] = false;
    }

    Console.WriteLine("[POC] Todas as cadeiras foram resetadas pelo operador.");
    await hubContext.Clients.All.SendAsync("ChairsReset");

    return Results.Ok(new { message = "Todas as cadeiras foram resetadas.", chairs = chairStates });
});

// GET /api/status â€” Health check rÃ¡pido
app.MapGet("/api/status", () => Results.Ok(new
{
    status = "ONLINE",
    service = "Arena Voice POC Minimal Bridge",
    port = port,
    timestamp = DateTimeOffset.UtcNow
}));

// =========================================================================
// 3. EVENT & PROJECT MANAGEMENT ENDPOINTS (Milestone 2B)
// =========================================================================

// GET /api/events/current â€” ObtÃ©m os detalhes e branding do evento atualmente ativo
app.MapGet("/api/events/current", (IArenaProjectStore store) =>
{
    var currentEvent = store.GetCurrentEvent();
    return currentEvent != null
        ? Results.Ok(currentEvent)
        : Results.NotFound(new { error = "Nenhum evento ativo encontrado." });
});

// PUT /api/events/current â€” Atualiza metadados ou branding do evento ativo
// NOTA ARQUITETURAL: No futuro este endpoint poderÃ¡ evoluir para rotas especializadas
// (ex: PUT /api/events/current e PUT /api/events/current/branding).
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
            return Results.BadRequest(new { error = "O tÃ­tulo deve ter entre 3 e 150 caracteres." });
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
            return Results.BadRequest(new { error = "primaryColor deve ser uma cor hexadecimal vÃ¡lida (ex: #d90429)." });
        if (!hexRegex.IsMatch(secondary))
            return Results.BadRequest(new { error = "secondaryColor deve ser uma cor hexadecimal vÃ¡lida (ex: #ffd166)." });

        currentEvent.Branding = new BrandingConfig
        {
            PrimaryColor = primary,
            SecondaryColor = secondary,
            LogoUrl = dto.Branding.LogoUrl ?? currentEvent.Branding.LogoUrl,
            Tagline = dto.Branding.Tagline ?? currentEvent.Branding.Tagline
        };
        brandingChanged = true;
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


// =========================================================================
// 3A. EVENT LIFECYCLE & CATALOG MANAGEMENT ENDPOINTS (Milestone 3A)
// =========================================================================

// GET /api/events — Lista todos os eventos com filtro opcional por status (?status=draft|ready|active|finished|archived)
app.MapGet("/api/events", (IArenaProjectStore store, string? status) =>
{
    EventStatus? filter = null;
    if (!string.IsNullOrWhiteSpace(status))
    {
        if (Enum.TryParse<EventStatus>(status, ignoreCase: true, out var parsed))
        {
            filter = parsed;
        }
    }
    var events = store.GetAllEvents(filter);
    return Results.Ok(events);
});

// GET /api/events/{id} — Obtém detalhes de um evento específico por ID
app.MapGet("/api/events/{id}", (string id, IArenaProjectStore store) =>
{
    var evt = store.GetEventById(id);
    return evt != null
        ? Results.Ok(evt)
        : Results.NotFound(new { error = "Evento não encontrado.", id });
});

// POST /api/events — Cria novo evento no catálogo
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
        }
    };

    var created = store.AddEvent(newEvent);
    return Results.Created($"/api/events/{created.Id}", created);
});

// PUT /api/events/{id} — Atualiza dados, branding ou status de um evento específico
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
            return Results.BadRequest(new { error = "Para ativar um evento na arena, utilize o endpoint específico POST /api/events/{id}/activate." });
        }
        evt.Status = dto.Status.Value;
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

    store.UpdateEvent(evt);

    // Se o evento editado for o ativo no palco, propaga atualizações
    var currentActive = store.GetCurrentEvent();
    if (currentActive?.Id == id)
    {
        if (brandingChanged)
        {
            await hubContext.Clients.All.SendAsync("EventBrandingUpdated", new
            {
                eventId = evt.Id,
                branding = evt.Branding,
                timestamp = DateTimeOffset.UtcNow
            });
        }
        await hubContext.Clients.All.SendAsync("ActiveEventChanged", new
        {
            @event = evt,
            previousEventId = (string?)null,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(evt);
});

// POST /api/events/{id}/activate — Ativa um evento como o evento corrente na arena física (evento anterior volta para Ready)
app.MapPost("/api/events/{id}/activate", async (string id, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var result = store.ActivateEvent(id, EventStatus.Ready);
    if (!result.Success)
    {
        return Results.NotFound(new { error = result.ErrorMessage ?? "Evento não encontrado.", id });
    }

    // Neutraliza o estado físico das 5 cadeiras da arena
    foreach (var key in chairStates.Keys.ToList())
    {
        chairStates[key] = false;
    }

    var timestamp = DateTimeOffset.UtcNow;

    // Emite notificações SignalR em tempo real
    await hubContext.Clients.All.SendAsync("ActiveEventChanged", new
    {
        @event = result.ActivatedEvent,
        previousEventId = result.PreviousEvent?.Id,
        timestamp
    });

    if (result.ActivatedEvent?.Branding != null)
    {
        await hubContext.Clients.All.SendAsync("EventBrandingUpdated", new
        {
            eventId = result.ActivatedEvent.Id,
            branding = result.ActivatedEvent.Branding,
            timestamp
        });
    }

    // Notifica reset das cadeiras para a nova rodada
    await hubContext.Clients.All.SendAsync("ChairsReset");

    // Notifica que o projeto no palco foi resetado para a nova fila
    await hubContext.Clients.All.SendAsync("CurrentProjectChanged", new
    {
        project = (Project?)null,
        previousProjectId = (string?)null,
        timestamp
    });

    return Results.Ok(new
    {
        success = true,
        activatedEvent = result.ActivatedEvent,
        previousEvent = result.PreviousEvent,
        activeContext = store.GetActiveContext(),
        message = $"Evento '{result.ActivatedEvent?.Title}' ativado com sucesso na arena."
    });
});

// POST /api/events/{id}/finish — Encerra formalmente um evento (ação explícita de encerramento)
app.MapPost("/api/events/{id}/finish", async (string id, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var finished = store.FinishEvent(id);
    if (finished == null)
    {
        return Results.NotFound(new { error = "Evento não encontrado.", id });
    }

    var currentActive = store.GetCurrentEvent();
    if (currentActive?.Id == id)
    {
        await hubContext.Clients.All.SendAsync("ActiveEventChanged", new
        {
            @event = finished,
            previousEventId = (string?)null,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(new
    {
        success = true,
        finishedEvent = finished,
        message = $"Evento '{finished.Title}' encerrado com sucesso."
    });
});

// POST /api/events/{id}/archive — Arquiva um evento histórico (409 Conflict se for o ativo)
app.MapPost("/api/events/{id}/archive", (string id, IArenaProjectStore store) =>
{
    var result = store.ArchiveEvent(id);
    if (result.IsActiveEvent)
    {
        return Results.Conflict(new { error = result.ErrorMessage, id });
    }
    if (!result.Success)
    {
        return Results.NotFound(new { error = result.ErrorMessage ?? "Evento não encontrado.", id });
    }

    return Results.Ok(new
    {
        success = true,
        archivedEvent = result.ArchivedEvent,
        message = $"Evento '{result.ArchivedEvent?.Title}' arquivado com sucesso."
    });
});

// POST /api/events/{id}/duplicate — Clona um evento para novo ciclo mantendo branding e metadados
app.MapPost("/api/events/{id}/duplicate", (string id, IArenaProjectStore store) =>
{
    var duplicated = store.DuplicateEvent(id);
    if (duplicated == null)
    {
        return Results.NotFound(new { error = "Evento de origem não encontrado.", id });
    }

    return Results.Created($"/api/events/{duplicated.Id}", duplicated);
});

// GET /api/projects â€” Lista projetos do evento (suporta ?includeCompleted=true|false e ?eventId=...)
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

// GET /api/projects/{id} â€” ObtÃ©m detalhes de um projeto especÃ­fico
app.MapGet("/api/projects/{id}", (string id, IArenaProjectStore store) =>
{
    var project = store.GetProjectById(id);
    return project != null
        ? Results.Ok(project)
        : Results.NotFound(new { error = "Projeto nÃ£o encontrado.", id });
});

// POST /api/projects â€” Cria novo projeto vinculado ao evento ativo
app.MapPost("/api/projects", (CreateProjectDto dto, IArenaProjectStore store) =>
{
    var currentEvent = store.GetCurrentEvent();
    if (currentEvent == null)
    {
        return Results.NotFound(new { error = "Nenhum evento ativo para associar o projeto." });
    }

    if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length < 3 || dto.Title.Trim().Length > 120)
    {
        return Results.BadRequest(new { error = "O campo title Ã© obrigatÃ³rio e deve ter entre 3 e 120 caracteres." });
    }

    if (string.IsNullOrWhiteSpace(dto.PitchLeader) || dto.PitchLeader.Trim().Length < 2 || dto.PitchLeader.Trim().Length > 100)
    {
        return Results.BadRequest(new { error = "O campo pitchLeader Ã© obrigatÃ³rio e deve ter entre 2 e 100 caracteres." });
    }

    if (string.IsNullOrWhiteSpace(dto.Track) || dto.Track.Trim().Length < 2 || dto.Track.Trim().Length > 50)
    {
        return Results.BadRequest(new { error = "O campo track Ã© obrigatÃ³rio e deve ter entre 2 e 50 caracteres." });
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

// PUT /api/projects/{id} â€” Atualiza dados de um projeto existente
app.MapPut("/api/projects/{id}", async (string id, UpdateProjectDto dto, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var project = store.GetProjectById(id);
    if (project == null)
    {
        return Results.NotFound(new { error = "Projeto nÃ£o encontrado.", id });
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

    store.UpdateProject(project);

    // Se o projeto editado for o ativo no palco, emite CurrentProjectChanged
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

// DELETE /api/projects/{id} â€” Remove um projeto (409 Conflict se for o projeto ativo)
app.MapDelete("/api/projects/{id}", (string id, IArenaProjectStore store) =>
{
    var deleteResult = store.DeleteProject(id);
    if (deleteResult.IsActiveProject)
    {
        return Results.Conflict(new { error = "Cannot delete the currently active project." });
    }

    if (deleteResult.NotFound)
    {
        return Results.NotFound(new { error = "Projeto nÃ£o encontrado.", id });
    }

    return Results.Ok(new { message = "Projeto removido com sucesso.", id });
});

// POST /api/projects/{id}/select â€” Seleciona projeto ativo com idempotÃªncia e transiÃ§Ã£o atÃ´mica
app.MapPost("/api/projects/{id}/select", async (string id, IArenaProjectStore store, IHubContext<ArenaPocHub> hubContext) =>
{
    var result = store.SelectProject(id);
    if (!result.Success)
    {
        if (result.ErrorMessage?.Contains("nÃ£o pertence ao evento ativo") == true)
        {
            return Results.BadRequest(new { error = result.ErrorMessage, id });
        }
        return Results.NotFound(new { error = result.ErrorMessage ?? "Projeto nÃ£o encontrado.", id });
    }

    // Se houve mudanÃ§a de projeto, transmite SignalR CurrentProjectChanged
    if (result.PreviousProject != null || result.CurrentProject != null)
    {
        await hubContext.Clients.All.SendAsync("CurrentProjectChanged", new
        {
            project = result.CurrentProject,
            previousProjectId = result.PreviousProject?.Id,
            timestamp = DateTimeOffset.UtcNow
        });
    }

    return Results.Ok(new
    {
        success = true,
        currentProject = result.CurrentProject,
        previousProject = result.PreviousProject,
        activeContext = store.GetActiveContext()
    });
});

// =========================================================================
// 4. MAPEAMENTO DO HUB SIGNALR
// =========================================================================
app.MapHub<ArenaPocHub>("/hubs/arena-poc");
app.MapHub<ArenaPocHub>("/arenaHub"); // Rota retrocompatÃ­vel

// ExibiÃ§Ã£o dos IPs locais no console para facilitar configuraÃ§Ã£o do ESP32
Console.WriteLine("=============================================================");
Console.WriteLine("        ARENA VOICE POC â€” MINIMAL EVENT BRIDGE              ");
Console.WriteLine("=============================================================");
Console.WriteLine($" Escutando em: http://{hostEnv}:{port}");
Console.WriteLine(" Endpoints disponÃ­veis:");
Console.WriteLine($"   POST http://<IP_DO_PC>:{port}/api/chair-press  (Recebe ESP32)");
Console.WriteLine($"   POST http://<IP_DO_PC>:{port}/api/support      (RetrocompatÃ­vel)");
Console.WriteLine($"   POST http://localhost:{port}/api/reset        (Reset cadeiras)");
Console.WriteLine($"   GET  http://localhost:{port}/api/state        (Estado atual)");
Console.WriteLine($"   GET  http://localhost:{port}/api/status       (Health check)");
Console.WriteLine(" Hubs SignalR:");
Console.WriteLine($"   WS   http://localhost:{port}/hubs/arena-poc   (Voice Studio)");
Console.WriteLine($"   WS   http://localhost:{port}/arenaHub         (RetrocompatÃ­vel)");
Console.WriteLine("-------------------------------------------------------------");
Console.WriteLine(" EndereÃ§os IP locais desta mÃ¡quina detectados:");
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
