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
builder.Services.AddSingleton<IArenaProjectStore, ArenaProjectStore>();

var app = builder.Build();

app.UseCors();

// Estado em memória simples para a POC (sem banco de dados)
var chairStates = new Dictionary<int, bool>
{
    { 1, false }, { 2, false }, { 3, false }, { 4, false }, { 5, false }
};

// =========================================================================
// 1. ENDPOINT PRINCIPAL: POST /api/chair-press
// Compatível com { "chairId": 1 } e também { "seatNumber": 1 }
// =========================================================================
app.MapPost("/api/chair-press", async (ChairPressRequest request, HttpContext http, IHubContext<ArenaPocHub> hubContext) =>
{
    int id = request.GetEffectiveChairId();

    // Validação de segurança: o Arena Voice possui 5 cadeiras (1 a 5)
    if (id < 1 || id > 5)
    {
        return Results.BadRequest(new
        {
            error = "chairId inválido. Deve ser um número entre 1 e 5.",
            received = id
        });
    }

    var clientIp = http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";
    var timestamp = DateTimeOffset.UtcNow;
    var horaFormatada = timestamp.ToLocalTime().ToString("HH:mm:ss.fff");

    // Atualiza estado em memória
    chairStates[id] = true;

    Console.WriteLine($"\n=======================================================");
    Console.WriteLine($"[HARDWARE / HTTP] CADEIRA #{id} ACIONADA!");
    Console.WriteLine($" Origem IP:  {clientIp}");
    Console.WriteLine($" Horário:    {horaFormatada}");
    Console.WriteLine($"=======================================================");

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

    return Results.Ok(new
    {
        accepted = true,
        chairId = id,
        message = $"Cadeira #{id} virada com sucesso no Voice Studio 3D",
        serverTime = horaFormatada
    });
});

// Alias retrocompatível com o repositório teste: POST /api/support
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
// 2. ENDPOINTS AUXILIARES DE DIAGNÓSTICO E RESET
// =========================================================================

// GET /api/state — Retorna o estado atual das 5 cadeiras e o contexto de evento/projeto
app.MapGet("/api/state", (IArenaProjectStore store) => Results.Ok(new
{
    chairs = chairStates,
    activeCount = chairStates.Count(c => c.Value),
    currentEvent = store.GetCurrentEvent(),
    currentProject = store.GetCurrentProject()
}));

// POST /api/reset — Reseta todas as cadeiras e notifica o Voice Studio
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

// GET /api/status — Health check rápido
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

// GET /api/events/current — Obtém os detalhes e branding do evento atualmente ativo
app.MapGet("/api/events/current", (IArenaProjectStore store) =>
{
    var currentEvent = store.GetCurrentEvent();
    return currentEvent != null
        ? Results.Ok(currentEvent)
        : Results.NotFound(new { error = "Nenhum evento ativo encontrado." });
});

// PUT /api/events/current — Atualiza metadados ou branding do evento ativo
// NOTA ARQUITETURAL: No futuro este endpoint poderá evoluir para rotas especializadas
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

// GET /api/projects — Lista projetos do evento (suporta ?includeCompleted=true|false e ?eventId=...)
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

// POST /api/projects — Cria novo projeto vinculado ao evento ativo
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

// DELETE /api/projects/{id} — Remove um projeto (409 Conflict se for o projeto ativo)
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

// POST /api/projects/{id}/select — Seleciona projeto ativo com idempotência e transição atômica
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

    // Se houve mudança de projeto, transmite SignalR CurrentProjectChanged
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
