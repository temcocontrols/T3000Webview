using T3Net.Models.Contracts;

namespace T3Net.Services.Device;

public interface IDeviceProvider
{
    Task<IReadOnlyList<DeviceIdentity>> DiscoverDevicesAsync(CancellationToken ct);
    Task<IReadOnlyList<DevicePoint>> ReadPointsAsync(DeviceReadRequest request, CancellationToken ct);
    Task<IReadOnlyList<TrendSample>> ReadTrendSamplesAsync(TrendReadRequest request, CancellationToken ct);
    Task<WriteResult> WritePointsAsync(DeviceWriteRequest request, CancellationToken ct);
    Task<DeviceConnectivityStatus> ProbeAsync(string deviceId, CancellationToken ct);
}
