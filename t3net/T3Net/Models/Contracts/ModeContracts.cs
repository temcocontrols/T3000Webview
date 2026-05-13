namespace T3Net.Models.Contracts;

public enum RuntimeMode
{
    Standalone = 0,
    CenterServer = 1,
    CenterClient = 2
}

public sealed record ModePolicySnapshot(
    RuntimeMode Mode,
    bool PauseSamplingWhenCenterDbDown,
    bool AllowTrendFallbackToSqlite,
    string TrendWriteTarget
);

public sealed record ModeTransitionResult(
    bool Success,
    RuntimeMode FromMode,
    RuntimeMode ToMode,
    string? Message
);
