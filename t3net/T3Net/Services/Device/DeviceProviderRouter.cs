using T3Net.Models.Contracts;

namespace T3Net.Services.Device;

/// <summary>
/// Routes device calls to the configured provider implementation.
/// Config key: T3000:DeviceAdapterMode = NativeBacnet | LegacyFfi
/// </summary>
public sealed class DeviceProviderRouter : IDeviceProvider
{
    private readonly IConfiguration _configuration;
    private readonly NativeBacnetProvider _native;
    private readonly LegacyFfiProvider _legacy;

    public DeviceProviderRouter(
        IConfiguration configuration,
        NativeBacnetProvider native,
        LegacyFfiProvider legacy)
    {
        _configuration = configuration;
        _native = native;
        _legacy = legacy;
    }

    private IDeviceProvider CurrentProvider
    {
        get
        {
            var mode = _configuration["T3000:DeviceAdapterMode"] ?? "NativeBacnet";
            return mode.Equals("LegacyFfi", StringComparison.OrdinalIgnoreCase) ? _legacy : _native;
        }
    }

    public Task<IReadOnlyList<DeviceIdentity>> DiscoverDevicesAsync(CancellationToken ct)
        => CurrentProvider.DiscoverDevicesAsync(ct);

    public Task<IReadOnlyList<DevicePoint>> ReadPointsAsync(DeviceReadRequest request, CancellationToken ct)
        => CurrentProvider.ReadPointsAsync(request, ct);

    public Task<IReadOnlyList<TrendSample>> ReadTrendSamplesAsync(TrendReadRequest request, CancellationToken ct)
        => CurrentProvider.ReadTrendSamplesAsync(request, ct);

    public Task<WriteResult> WritePointsAsync(DeviceWriteRequest request, CancellationToken ct)
        => CurrentProvider.WritePointsAsync(request, ct);

    public Task<DeviceConnectivityStatus> ProbeAsync(string deviceId, CancellationToken ct)
        => CurrentProvider.ProbeAsync(deviceId, ct);
}
