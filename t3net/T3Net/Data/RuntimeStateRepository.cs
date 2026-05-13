using Dapper;
using T3Net.Models.Contracts;

namespace T3Net.Data;

public sealed class RuntimeStateRepository : IRuntimeStateRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly ILogger<RuntimeStateRepository> _logger;
    private readonly SemaphoreSlim _schemaGate = new(1, 1);
    private bool _schemaReady;

    public RuntimeStateRepository(IDbConnectionFactory db, ILogger<RuntimeStateRepository> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<RuntimeMode?> GetRuntimeModeAsync(CancellationToken ct)
    {
        await EnsureSchemaAsync(ct);

        using var conn = _db.CreateConnection();
        var value = await conn.ExecuteScalarAsync<string?>(
            new CommandDefinition(
                "SELECT StateValue FROM T3NET_RUNTIME_STATE WHERE StateKey = @Key LIMIT 1",
                new { Key = "RuntimeMode" },
                cancellationToken: ct
            )
        );

        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return Enum.TryParse<RuntimeMode>(value, true, out var mode)
            ? mode
            : null;
    }

    public async Task SetRuntimeModeAsync(RuntimeMode mode, string actor, string? reason, CancellationToken ct)
    {
        await EnsureSchemaAsync(ct);

        using var conn = _db.CreateConnection();
        const string sql = @"
INSERT INTO T3NET_RUNTIME_STATE(StateKey, StateValue, UpdatedAtUtc, UpdatedBy, Reason)
VALUES(@StateKey, @StateValue, @UpdatedAtUtc, @UpdatedBy, @Reason)
ON CONFLICT(StateKey) DO UPDATE SET
    StateValue = excluded.StateValue,
    UpdatedAtUtc = excluded.UpdatedAtUtc,
    UpdatedBy = excluded.UpdatedBy,
    Reason = excluded.Reason;";

        await conn.ExecuteAsync(new CommandDefinition(
            sql,
            new
            {
                StateKey = "RuntimeMode",
                StateValue = mode.ToString(),
                UpdatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedBy = actor,
                Reason = reason
            },
            cancellationToken: ct
        ));
    }

    public async Task AppendAppLogAsync(string level, string message, CancellationToken ct)
    {
        await EnsureSchemaAsync(ct);

        using var conn = _db.CreateConnection();
        const string sql = @"
INSERT INTO APP_LOG(Level, Message, CreatedAtUtc)
VALUES(@Level, @Message, @CreatedAtUtc);";

        try
        {
            await conn.ExecuteAsync(new CommandDefinition(
                sql,
                new
                {
                    Level = level,
                    Message = message,
                    CreatedAtUtc = DateTimeOffset.UtcNow
                },
                cancellationToken: ct
            ));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "APP_LOG write failed. Level={Level}, Message={Message}", level, message);
        }
    }

    private async Task EnsureSchemaAsync(CancellationToken ct)
    {
        if (_schemaReady)
        {
            return;
        }

        await _schemaGate.WaitAsync(ct);
        try
        {
            if (_schemaReady)
            {
                return;
            }

            using var conn = _db.CreateConnection();
            const string createState = @"
CREATE TABLE IF NOT EXISTS T3NET_RUNTIME_STATE (
    StateKey TEXT PRIMARY KEY,
    StateValue TEXT NOT NULL,
    UpdatedAtUtc TEXT NOT NULL,
    UpdatedBy TEXT NULL,
    Reason TEXT NULL
);";

            const string createAppLog = @"
CREATE TABLE IF NOT EXISTS APP_LOG (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Level TEXT NOT NULL,
    Message TEXT NOT NULL,
    CreatedAtUtc TEXT NOT NULL
);";

            await conn.ExecuteAsync(new CommandDefinition(createState, cancellationToken: ct));
            await conn.ExecuteAsync(new CommandDefinition(createAppLog, cancellationToken: ct));
            _schemaReady = true;
        }
        finally
        {
            _schemaGate.Release();
        }
    }
}
