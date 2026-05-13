using Microsoft.AspNetCore.SignalR;
using T3Net.Data;
using T3Net.Hubs;
using T3Net.Models.Contracts;
using T3Net.Services.Mode;

namespace T3Net.Workers;

/// <summary>
/// Health scaffold worker. Publishes periodic runtime diagnostics into logs.
/// </summary>
public sealed class HealthWorker : BackgroundService
{
    private readonly ILogger<HealthWorker> _logger;
    private readonly IModeService _modeService;
    private readonly IRuntimeStateRepository _runtimeStateRepository;
    private readonly IHubContext<T3000Hub> _hubContext;

    public HealthWorker(
        ILogger<HealthWorker> logger,
        IModeService modeService,
        IRuntimeStateRepository runtimeStateRepository,
        IHubContext<T3000Hub> hubContext)
    {
        _logger = logger;
        _modeService = modeService;
        _runtimeStateRepository = runtimeStateRepository;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _runtimeStateRepository.AppendAppLogAsync("INFO", "Health worker started", stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                var mode = await _modeService.GetCurrentModeAsync(stoppingToken);
                var policy = await _modeService.GetPolicySnapshotAsync(stoppingToken);
                var snapshot = new HealthSnapshot(
                    Service: "T3Net",
                    Status: "Healthy",
                    TimeUtc: DateTimeOffset.UtcNow,
                    RuntimeMode: mode,
                    TrendWriteTarget: policy.TrendWriteTarget,
                    PauseSamplingWhenCenterDbDown: policy.PauseSamplingWhenCenterDbDown
                );

                await _hubContext.Clients.All.SendAsync("HealthSnapshotUpdated", snapshot, stoppingToken);
                _logger.LogDebug("Health tick. RuntimeMode={Mode}, UtcNow={UtcNow}", mode, snapshot.TimeUtc);
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown path.
            }
            catch (Exception ex)
            {
                await _runtimeStateRepository.AppendAppLogAsync("ERROR", $"Health worker cycle failed: {ex.Message}", stoppingToken);
                _logger.LogError(ex, "Health worker cycle failed.");
            }
        }

        await _runtimeStateRepository.AppendAppLogAsync("INFO", "Health worker stopped", CancellationToken.None);
    }
}
