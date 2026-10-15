using Microsoft.AspNetCore.SignalR;

namespace ArenaVoicePocBackend.Hubs;

/// <summary>
/// Hub SignalR para propagação de eventos do jogo/hardware em tempo real para o Voice Studio 3D.
/// </summary>
public class ArenaPocHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"[SignalR] Cliente conectado: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"[SignalR] Cliente desconectado: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}
