# T3Net Service Modernization Blueprint - Part 2 (Implementation Design)

Date: 2026-05-13
Status: Draft for implementation

## Scope

This document defines the implementation-level design for T3Net migration:
- Service boundaries and module layout
- Core interfaces and class responsibilities
- Worker orchestration
- API and SignalR contracts
- Database schema contracts for logs and health
- Ordered implementation plan

Related documents:
- docs/t3000/architecture/t3net-service-modernization-blueprint.md
- docs/t3000/architecture/service-decoupling-design-v2.md

## 1) Proposed Project Structure (T3Net)

```text
t3net/T3Net/
  Controllers/
    DeviceController.cs
    TrendController.cs
    ModeController.cs
    HealthController.cs
    AdminController.cs
  Hubs/
    T3000Hub.cs
  Services/
    Device/
      IDeviceProvider.cs
      NativeBacnetProvider.cs
      LegacyFfiProvider.cs
      DeviceProviderRouter.cs
    Polling/
      PollingOrchestrator.cs
      PollingPlanBuilder.cs
      DevicePollingService.cs
      TrendSamplingService.cs
    Data/
      IDataWriteService.cs
      DataWriteService.cs
      ISyncMetricsService.cs
      SyncMetricsService.cs
      IModeService.cs
      ModeService.cs
    Health/
      IHealthSnapshotService.cs
      HealthSnapshotService.cs
      AlertService.cs
  Repositories/
    IAppLogRepository.cs
    AppLogRepository.cs
    ISyncSummaryRepository.cs
    SyncSummaryRepository.cs
    IDeviceRepository.cs
    DeviceRepository.cs
    ITrendRepository.cs
    TrendRepository.cs
  Models/
    Contracts/
      DeviceDtos.cs
      TrendDtos.cs
      ModeDtos.cs
      HealthDtos.cs
      EventDtos.cs
    Domain/
      DevicePoint.cs
      TrendSample.cs
      PollingPlan.cs
      SyncCycleResult.cs
  Workers/
    StartupWorker.cs
    PollingWorker.cs
    HealthWorker.cs
    RegistryHeartbeatWorker.cs
  Data/
    SqliteConnectionFactory.cs
    MssqlConnectionFactory.cs
  Program.cs
  appsettings.json
```

## 2) Core Interface Contracts

## 2.1 Device provider abstraction

```csharp
public interface IDeviceProvider
{
    Task<IReadOnlyList<DeviceIdentity>> DiscoverDevicesAsync(CancellationToken ct);
    Task<IReadOnlyList<DevicePoint>> ReadPointsAsync(DeviceReadRequest request, CancellationToken ct);
    Task<IReadOnlyList<TrendSample>> ReadTrendSamplesAsync(TrendReadRequest request, CancellationToken ct);
    Task<WriteResult> WritePointsAsync(DeviceWriteRequest request, CancellationToken ct);
    Task<DeviceConnectivityStatus> ProbeAsync(string deviceKey, CancellationToken ct);
}
```

Implementations:
- NativeBacnetProvider: direct BACnet communication (target).
- LegacyFfiProvider: temporary bridge using existing FFI-compatible path.

Router:
- DeviceProviderRouter chooses implementation from config (DeviceAdapterMode).

## 2.2 Mode service

```csharp
public interface IModeService
{
    Task<RuntimeMode> GetCurrentModeAsync(CancellationToken ct);
    Task<ModeTransitionResult> SwitchModeAsync(RuntimeMode target, string actor, CancellationToken ct);
    Task<ModePolicySnapshot> GetPolicySnapshotAsync(CancellationToken ct);
}
```

RuntimeMode:
- Standalone
- CenterServer
- CenterClient

Policy requirements:
- In Center modes, trend sample writes require healthy MSSQL.
- If MSSQL down in Center mode, sampling pauses and alert is emitted.

## 2.3 Write and metrics services

```csharp
public interface IDataWriteService
{
    Task<WriteBatchResult> WriteBasicPointsAsync(IReadOnlyList<DevicePoint> points, CancellationToken ct);
    Task<WriteBatchResult> WriteTrendSamplesAsync(IReadOnlyList<TrendSample> samples, CancellationToken ct);
}

public interface ISyncMetricsService
{
    Task BeginCycleAsync(Guid cycleId, DateTimeOffset startedAt, CancellationToken ct);
    Task CompleteCycleAsync(SyncCycleResult result, CancellationToken ct);
    Task RecordDeviceResultAsync(DeviceSyncResult result, CancellationToken ct);
}
```

## 3) Worker Design

## 3.1 StartupWorker

Responsibilities:
- Validate DB connectivity based on mode.
- Warm up provider and pre-load device registry.
- Emit startup APP_LOG entries.

Output:
- Initial health snapshot
- Initial mode banner state

## 3.2 PollingWorker

Loop:
1. Get mode policy snapshot.
2. If center mode and MSSQL unhealthy -> pause trend sampling and log warning.
3. Discover devices on configured cadence.
4. Poll point groups by plan.
5. Write data via IDataWriteService.
6. Record cycle summaries and push SignalR updates.

## 3.3 HealthWorker

Cadence:
- every 10-30 seconds (configurable)

Checks:
- provider reachability
- DB status
- queue depths
- last successful poll times

Pushes:
- HealthSnapshotUpdated event to SignalR

## 3.4 RegistryHeartbeatWorker

For center mode dashboards:
- update server/client heartbeat state
- maintain active client list and stale-client pruning

## 4) API Contracts (v1)

## 4.1 Devices

- GET /api/v1/devices
  - returns device list with connectivity and freshness fields

- GET /api/v1/devices/{deviceId}/points
  - query: group=input|output|variable|all
  - optional freshness window

- POST /api/v1/devices/{deviceId}/points/read
  - force read specific point ids

## 4.2 Trend

- GET /api/v1/trends/samples
  - query: deviceId, start, end, metric, interval

- POST /api/v1/trends/sync/trigger
  - trigger immediate sync cycle

## 4.3 Mode and health

- GET /api/v1/mode
- POST /api/v1/mode/switch
  - body: targetMode, reason

- GET /api/v1/health/summary
- GET /api/v1/health/detail

## 4.4 Logs and diagnostics

- GET /api/v1/logs/app
  - query: level, category, from, to, deviceSerial

- GET /api/v1/sync/cycles
- GET /api/v1/sync/devices

## 5) SignalR Event Contracts

Hub route:
- /ws (existing style) or /hub/t3000 (preferred explicit route)

Server -> client events:
- DeviceUpdated
- TrendSamplesUpdated
- ModeChanged
- HealthSnapshotUpdated
- SyncCycleUpdated
- AlertRaised

Client -> server methods:
- SubscribeToDevice(deviceId)
- UnsubscribeFromDevice(deviceId)
- SubscribeToHealth()
- SubscribeToSyncStatus()

## 6) Database Contract (Operational)

## 6.1 APP_LOG

Purpose:
- unified operational log across standalone and center modes

Columns:
- id (bigint identity)
- event_time_utc (datetime2)
- level (varchar 16)
- category (varchar 32)
- event_code (varchar 64)
- source (varchar 64)
- actor (varchar 64, nullable)
- device_serial (varchar 32, nullable)
- message (nvarchar 1024)
- details_json (nvarchar(max), nullable)

Index suggestions:
- (event_time_utc desc)
- (category, event_time_utc desc)
- (device_serial, event_time_utc desc)

## 6.2 SYNC_CYCLE_SUMMARY

Columns:
- cycle_id (uniqueidentifier pk)
- started_at_utc
- finished_at_utc
- duration_ms
- mode
- devices_total
- devices_success
- devices_failed
- points_written
- trend_samples_written
- status
- notes

## 6.3 DEVICE_SYNC_SUMMARY

Columns:
- id (bigint identity)
- cycle_id (fk)
- device_serial
- started_at_utc
- finished_at_utc
- duration_ms
- points_read
- trend_samples_read
- write_status
- error_code
- error_message

## 7) Mode-Specific Write Rules (Strict)

## 7.1 Standalone mode

- Basic points -> SQLite
- Trend samples -> SQLite
- APP_LOG -> SQLite

## 7.2 Center modes

- Basic points -> MSSQL (optional local mirror for diagnostics only)
- Trend samples -> MSSQL only
- APP_LOG -> MSSQL (optional minimal local fallback log for break-glass)

If MSSQL down in center modes:
- pause trend sampling writes
- emit AlertRaised + APP_LOG warning
- keep reading optional or reduce read load based on config
- do not silently persist trend samples into SQLite

## 8) Recommended Library Stack

Core:
- ASP.NET Core + Kestrel
- SignalR
- Dapper
- Microsoft.Data.Sqlite
- Microsoft.Data.SqlClient

Background and health:
- HostedService/BackgroundService
- PeriodicTimer
- Microsoft.Extensions.Diagnostics.HealthChecks

Protocol:
- BACnet stack (C# implementation, vendored if package maturity is uncertain)
- Keep FluentModbus for Modbus use cases

Serialization and resilience:
- System.Text.Json
- Polly (optional for retry policies)

## 9) Implementation Sequence (Actionable)

Stage 0: Baseline
1. Keep current Program + Hub running.
2. Add versioned /api/v1 base and HealthController skeleton.

Stage 1: Contracts and storage
1. Add Models/Contracts DTOs.
2. Create APP_LOG, SYNC_CYCLE_SUMMARY, DEVICE_SYNC_SUMMARY migration scripts.
3. Implement repositories and basic endpoints for logs and health.

Stage 2: Mode engine
1. Implement IModeService + transition guardrails.
2. Add /api/v1/mode endpoints.
3. Add mode-aware health badges in API payloads.

Stage 3: Polling orchestration
1. Implement PollingPlanBuilder and PollingOrchestrator.
2. Add PollingWorker with no-op provider for dry-run.
3. Wire ISyncMetricsService and SignalR events.

Stage 4: Provider migration
1. Implement LegacyFfiProvider (bridge mode) if needed for parity tests.
2. Implement NativeBacnetProvider and side-by-side compare results.
3. Switch default to NativeBacnetProvider after acceptance tests.

Stage 5: Cutover and hardening
1. Enable Windows Service deployment profile.
2. Verify reboot auto-start, failure recovery, and dashboard accuracy.
3. Document rollback steps and feature flags.

## 10) Acceptance Checklist

Functional:
- UI loads without launching T3000 desktop app.
- Device list and point reads succeed via service path.
- Real-time updates delivered via SignalR.

Data integrity:
- Center mode does not write trend samples to SQLite when MSSQL is down.
- Sync cycle summaries always record start/finish and status.

Observability:
- APP_LOG has startup, mode switch, DB failures, polling errors, and recovery events.
- Health endpoint and dashboard values are consistent with DB state.

## 11) Risks and Mitigations

Risk: BACnet stack behavior differs from legacy C++ behavior.
- Mitigation: dual-provider parity test window with sampled comparison reports.

Risk: false offline statuses.
- Mitigation: derive offline from explicit polling freshness threshold, not UI session state.

Risk: high load from concurrent chart windows.
- Mitigation: separate scheduled bulk sync from targeted on-demand reads, plus per-device read throttling.

## 12) Next Deliverable (Part 3)

Part 3 should include:
- Sequence diagrams for top 6 scenarios:
  - startup
  - manual refresh
  - scheduled sync
  - mode switch
  - MSSQL outage
  - recovery
- Concrete JSON payload examples for all /api/v1 endpoints and SignalR events.
