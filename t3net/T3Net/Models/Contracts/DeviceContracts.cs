namespace T3Net.Models.Contracts;

public sealed record DeviceIdentity(
    string DeviceId,
    string? SerialNumber,
    string? DisplayName,
    string? IpAddress
);

public sealed record DevicePoint(
    string DeviceId,
    string EntryType,
    int Index,
    double? Value,
    string? Unit,
    string Quality,
    DateTimeOffset ReadAtUtc
);

public sealed record TrendSample(
    string DeviceId,
    string Series,
    DateTimeOffset TimestampUtc,
    double Value
);

public sealed record DeviceReadRequest(
    string DeviceId,
    string EntryType,
    IReadOnlyList<int> Indices,
    bool ForceRead
);

public sealed record DeviceWriteRequest(
    string DeviceId,
    string EntryType,
    IReadOnlyList<DevicePoint> Points
);

public sealed record TrendReadRequest(
    string DeviceId,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc,
    string? Series
);

public sealed record WriteResult(bool Success, string? Message);

public sealed record DeviceConnectivityStatus(
    string DeviceId,
    bool IsOnline,
    DateTimeOffset CheckedAtUtc,
    string? Reason
);
