using ArenaVoicePocBackend.Hubs;
using Microsoft.AspNetCore.SignalR;
using System.Net;
using System.Net.Sockets;

var builder = WebApplication.CreateBuilder(args);

// Configuração de bind em todas as interfaces de rede locais (0.0.0.0:5000)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Listen(IPAddress.Any, 5000);
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

// GET /api/state — Retorna o estado atual das 5 cadeiras
app.MapGet("/api/state", () => Results.Ok(new
{
    chairs = chairStates,
    activeCount = chairStates.Count(c => c.Value)
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
    port = 5000,
    timestamp = DateTimeOffset.UtcNow
}));

// =========================================================================
// 3. MAPEAMENTO DO HUB SIGNALR
// =========================================================================
app.MapHub<ArenaPocHub>("/hubs/arena-poc");
app.MapHub<ArenaPocHub>("/arenaHub"); // Rota retrocompatível

// Exibição dos IPs locais no console para facilitar configuração do ESP32
Console.WriteLine("=============================================================");
Console.WriteLine("        ARENA VOICE POC — MINIMAL EVENT BRIDGE              ");
Console.WriteLine("=============================================================");
Console.WriteLine(" Escutando em: http://0.0.0.0:5000");
Console.WriteLine(" Endpoints disponíveis:");
Console.WriteLine("   POST http://<IP_DO_PC>:5000/api/chair-press  (Recebe ESP32)");
Console.WriteLine("   POST http://<IP_DO_PC>:5000/api/support      (Retrocompatível)");
Console.WriteLine("   POST http://localhost:5000/api/reset        (Reset cadeiras)");
Console.WriteLine("   GET  http://localhost:5000/api/state        (Estado atual)");
Console.WriteLine("   GET  http://localhost:5000/api/status       (Health check)");
Console.WriteLine(" Hubs SignalR:");
Console.WriteLine("   WS   http://localhost:5000/hubs/arena-poc   (Voice Studio)");
Console.WriteLine("   WS   http://localhost:5000/arenaHub         (Retrocompatível)");
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
