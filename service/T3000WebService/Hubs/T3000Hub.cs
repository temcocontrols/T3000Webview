using Microsoft.AspNetCore.SignalR;

namespace T3000WebService.Hubs;

/// <summary>
/// Main SignalR hub — replaces the tungstenite WebSocket server on :9104.
/// Clients connect to ws://localhost:9200/ws
/// Methods here will mirror the existing WS message types from the Rust server.
/// </summary>
public class T3000Hub : Hub
{
    private readonly ILogger<T3000Hub> _logger;

    public T3000Hub(ILogger<T3000Hub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // ── Example: client calls this to subscribe to device point updates ───────
    public async Task SubscribeToDevice(string deviceId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"device:{deviceId}");
        _logger.LogInformation("Client {ConnectionId} subscribed to device {DeviceId}",
            Context.ConnectionId, deviceId);
    }

    public async Task UnsubscribeFromDevice(string deviceId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"device:{deviceId}");
    }

    // Server-to-client push: call from background services
    // await _hub.Clients.Group($"device:{deviceId}").SendAsync("PointUpdate", data);
}
