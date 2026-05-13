using T3Net.Models.Contracts;

namespace T3Net.Services.Device;

/// <summary>
/// Native BACnet provider scaffold. Use this provider as the long-term target.
/// </summary>
public sealed class NativeBacnetProvider : IDeviceProvider
{
    private readonly ILogger<NativeBacnetProvider> _logger;

    public NativeBacnetProvider(ILogger<NativeBacnetProvider> logger)
    {
        _logger = logger;
    }

    public Task<IReadOnlyList<DeviceIdentity>> DiscoverDevicesAsync(CancellationToken ct)
    {
        _logger.LogInformation("NativeBacnetProvider discovery scaffold called.");
        return Task.FromResult<IReadOnlyList<DeviceIdentity>>(Array.Empty<DeviceIdentity>());
    }

    public Task<IReadOnlyList<DevicePoint>> ReadPointsAsync(DeviceReadRequest request, CancellationToken ct)
    {
        _logger.LogInformation("NativeBacnetProvider read scaffold called for {DeviceId}/{EntryType}.", request.DeviceId, request.EntryType);
        return Task.FromResult<IReadOnlyList<DevicePoint>>(Array.Empty<DevicePoint>());
    }

    public Task<IReadOnlyList<TrendSample>> ReadTrendSamplesAsync(TrendReadRequest request, CancellationToken ct)
    {
        _logger.LogInformation("NativeBacnetProvider trend read scaffold called for {DeviceId}.", request.DeviceId);
        return Task.FromResult<IReadOnlyList<TrendSample>>(Array.Empty<TrendSample>());
    }

    public Task<WriteResult> WritePointsAsync(DeviceWriteRequest request, CancellationToken ct)
    {
        _logger.LogInformation("NativeBacnetProvider write scaffold called for {DeviceId}/{EntryType}.", request.DeviceId, request.EntryType);
        return Task.FromResult(new WriteResult(false, "Native BACnet provider write scaffold only"));
    }

    public Task<DeviceConnectivityStatus> ProbeAsync(string deviceId, CancellationToken ct)
    {
        return Task.FromResult(new DeviceConnectivityStatus(deviceId, true, DateTimeOffset.UtcNow, null));
    }
}
