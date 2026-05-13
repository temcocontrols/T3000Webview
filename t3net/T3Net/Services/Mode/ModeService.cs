using T3Net.Models.Contracts;
using T3Net.Data;

namespace T3Net.Services.Mode;

public sealed class ModeService : IModeService
{
    private readonly IConfiguration _configuration;
    private readonly IRuntimeStateRepository _runtimeStateRepository;
    private readonly ILogger<ModeService> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private RuntimeMode? _currentMode;

    public ModeService(
        IConfiguration configuration,
        IRuntimeStateRepository runtimeStateRepository,
        ILogger<ModeService> logger)
    {
        _configuration = configuration;
        _runtimeStateRepository = runtimeStateRepository;
        _logger = logger;
    }

    public async Task<RuntimeMode> GetCurrentModeAsync(CancellationToken ct)
    {
        if (_currentMode.HasValue)
        {
            return _currentMode.Value;
        }

        await _gate.WaitAsync(ct);
        try
        {
            if (_currentMode.HasValue)
            {
                return _currentMode.Value;
            }

            _currentMode = await _runtimeStateRepository.GetRuntimeModeAsync(ct) ?? ResolveConfiguredMode();
            return _currentMode.Value;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<ModePolicySnapshot> GetPolicySnapshotAsync(CancellationToken ct)
    {
        var mode = await GetCurrentModeAsync(ct);

        var snapshot = mode switch
        {
            RuntimeMode.Standalone => new ModePolicySnapshot(
                RuntimeMode.Standalone,
                PauseSamplingWhenCenterDbDown: false,
                AllowTrendFallbackToSqlite: true,
                TrendWriteTarget: "SQLite"
            ),
            RuntimeMode.CenterServer or RuntimeMode.CenterClient => new ModePolicySnapshot(
                mode,
                PauseSamplingWhenCenterDbDown: true,
                AllowTrendFallbackToSqlite: false,
                TrendWriteTarget: "MSSQL"
            ),
            _ => new ModePolicySnapshot(RuntimeMode.Standalone, false, true, "SQLite")
        };

        return snapshot;
    }

    public async Task<ModeTransitionResult> SwitchModeAsync(RuntimeMode targetMode, string actor, string? reason, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var from = _currentMode ?? await _runtimeStateRepository.GetRuntimeModeAsync(ct) ?? ResolveConfiguredMode();
            _currentMode = targetMode;

            await _runtimeStateRepository.SetRuntimeModeAsync(targetMode, actor, reason, ct);
            await _runtimeStateRepository.AppendAppLogAsync(
                "INFO",
                $"Runtime mode changed from {from} to {targetMode} by {actor}. Reason: {reason ?? "n/a"}",
                ct
            );

            _logger.LogInformation(
                "Runtime mode changed from {FromMode} to {ToMode} by {Actor}. Reason: {Reason}",
                from,
                targetMode,
                actor,
                reason ?? "n/a"
            );

            return new ModeTransitionResult(true, from, targetMode, null);
        }
        finally
        {
            _gate.Release();
        }
    }

    private RuntimeMode ResolveConfiguredMode()
    {
        var raw = _configuration["T3000:RuntimeMode"] ?? "Standalone";
        return Enum.TryParse<RuntimeMode>(raw, true, out var mode)
            ? mode
            : RuntimeMode.Standalone;
    }
}
