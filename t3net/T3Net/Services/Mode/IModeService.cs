using T3Net.Models.Contracts;

namespace T3Net.Services.Mode;

public interface IModeService
{
    Task<RuntimeMode> GetCurrentModeAsync(CancellationToken ct);
    Task<ModePolicySnapshot> GetPolicySnapshotAsync(CancellationToken ct);
    Task<ModeTransitionResult> SwitchModeAsync(RuntimeMode targetMode, string actor, string? reason, CancellationToken ct);
}
