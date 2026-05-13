using T3Net.Models.Contracts;

namespace T3Net.Data;

public interface IRuntimeStateRepository
{
    Task<RuntimeMode?> GetRuntimeModeAsync(CancellationToken ct);
    Task SetRuntimeModeAsync(RuntimeMode mode, string actor, string? reason, CancellationToken ct);
    Task AppendAppLogAsync(string level, string message, CancellationToken ct);
}
