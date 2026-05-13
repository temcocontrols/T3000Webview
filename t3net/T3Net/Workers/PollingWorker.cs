using T3Net.Models.Contracts;
using T3Net.Data;
using T3Net.Services.Device;
using T3Net.Services.Mode;

namespace T3Net.Workers;

/// <summary>
/// Polling scaffold for periodic device reads. Replace placeholders with real plan and persistence logic.
/// </summary>
public sealed class PollingWorker : BackgroundService
{
    private readonly ILogger<PollingWorker> _logger;
    private readonly IModeService _modeService;
    private readonly IDeviceProvider _deviceProvider;
    private readonly IRuntimeStateRepository _runtimeStateRepository;

    public PollingWorker(
        ILogger<PollingWorker> logger,
        IModeService modeService,
        IDeviceProvider deviceProvider,
        IRuntimeStateRepository runtimeStateRepository)
    {
        _logger = logger;
        _modeService = modeService;
        _deviceProvider = deviceProvider;
        _runtimeStateRepository = runtimeStateRepository;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _runtimeStateRepository.AppendAppLogAsync("INFO", "Polling worker started", stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                var mode = await _modeService.GetCurrentModeAsync(stoppingToken);
                var policy = await _modeService.GetPolicySnapshotAsync(stoppingToken);

                _logger.LogDebug(
                    "Polling tick. Mode={Mode}, TrendWriteTarget={TrendWriteTarget}, PauseOnCenterDown={PauseOnCenterDown}",
                    mode,
                    policy.TrendWriteTarget,
                    policy.PauseSamplingWhenCenterDbDown
                );

                var devices = await _deviceProvider.DiscoverDevicesAsync(stoppingToken);
                _logger.LogDebug("Discovered {Count} devices in polling scaffold.", devices.Count);

                // TODO: build polling plan and persist results.
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown path.
            }
            catch (Exception ex)
            {
                await _runtimeStateRepository.AppendAppLogAsync("ERROR", $"Polling worker cycle failed: {ex.Message}", stoppingToken);
                _logger.LogError(ex, "Polling worker cycle failed.");
            }
        }

        await _runtimeStateRepository.AppendAppLogAsync("INFO", "Polling worker stopped", CancellationToken.None);
    }
}
