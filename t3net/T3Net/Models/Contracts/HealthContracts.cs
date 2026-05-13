namespace T3Net.Models.Contracts;

public sealed record HealthSnapshot(
    string Service,
    string Status,
    DateTimeOffset TimeUtc,
    RuntimeMode RuntimeMode,
    string TrendWriteTarget,
    bool PauseSamplingWhenCenterDbDown
);
