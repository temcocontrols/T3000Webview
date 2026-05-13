using T3Net.Models.Contracts;

namespace T3Net.Services.Device;

/// <summary>
/// Placeholder bridge provider for legacy FFI paths.
/// Implementation intentionally minimal until FFI contract is finalized.
/// </summary>
public sealed class LegacyFfiProvider : IDeviceProvider
{
    private readonly ILogger<LegacyFfiProvider> _logger;

    public LegacyFfiProvider(ILogger<LegacyFfiProvider> logger)
    {
        _logger = logger;
    }

    public Task<IReadOnlyList<DeviceIdentity>> DiscoverDevicesAsync(CancellationToken ct)
    {
        _logger.LogWarning("LegacyFfiProvider.DiscoverDevicesAsync is not implemented yet.");
        return Task.FromResult<IReadOnlyList<DeviceIdentity>>(Array.Empty<DeviceIdentity>());
    }

    public Task<IReadOnlyList<DevicePoint>> ReadPointsAsync(DeviceReadRequest request, CancellationToken ct)
    {
        _logger.LogWarning("LegacyFfiProvider.ReadPointsAsync is not implemented yet for {DeviceId}.", request.DeviceId);
        return Task.FromResult<IReadOnlyList<DevicePoint>>(Array.Empty<DevicePoint>());
    }

    public Task<IReadOnlyList<TrendSample>> ReadTrendSamplesAsync(TrendReadRequest request, CancellationToken ct)
    {
        _logger.LogWarning("LegacyFfiProvider.ReadTrendSamplesAsync is not implemented yet for {DeviceId}.", request.DeviceId);
        return Task.FromResult<IReadOnlyList<TrendSample>>(Array.Empty<TrendSample>());
    }

    public Task<WriteResult> WritePointsAsync(DeviceWriteRequest request, CancellationToken ct)
    {
        _logger.LogWarning("LegacyFfiProvider.WritePointsAsync is not implemented yet for {DeviceId}.", request.DeviceId);
        return Task.FromResult(new WriteResult(false, "Legacy FFI provider write is not implemented"));
    }

    public Task<DeviceConnectivityStatus> ProbeAsync(string deviceId, CancellationToken ct)
    {
        _logger.LogWarning("LegacyFfiProvider.ProbeAsync is not implemented yet for {DeviceId}.", deviceId);
        return Task.FromResult(new DeviceConnectivityStatus(deviceId, false, DateTimeOffset.UtcNow, "Not implemented"));
    }
}
