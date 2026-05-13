# T3Net Service Modernization Blueprint - Part 3 (Sequences and Contracts)

Date: 2026-05-13
Status: Implementation-ready contract draft

## Scope

This part provides:
- ASCII sequence diagrams for critical runtime scenarios
- Concrete JSON contracts for API and SignalR
- Error payload conventions
- Suggested status code and event naming rules

Related:
- docs/t3000/architecture/t3net-service-modernization-blueprint.md
- docs/t3000/architecture/t3net-service-modernization-blueprint-part2.md

## 1) Sequence: Service Startup

```text
Participant Legend:
UI = Browser UI
API = Platform API Service
GW = Protocol Gateway/Provider
DB = SQLite or MSSQL
HUB = SignalR Hub

Windows Service Manager -> API : start service
API -> API : load config + mode
API -> DB  : connect and validate
API -> GW  : initialize provider
API -> API : start workers (polling, health, heartbeat)
API -> HUB : online state ready
UI  -> API : GET /api/v1/health/summary
API -> UI  : 200 health snapshot
UI  -> HUB : subscribe health/sync/device channels
HUB -> UI  : HealthSnapshotUpdated (initial push)
```

## 2) Sequence: Manual Device Refresh

```text
UI  -> API : POST /api/v1/devices/{id}/points/read
API -> GW  : ReadPoints(request)
GW  -> Device : BACnet read (targeted)
Device -> GW  : values
GW  -> API : normalized points
API -> DB  : upsert points
API -> HUB : DeviceUpdated event
API -> UI  : 200 response with points
HUB -> UI  : DeviceUpdated push (same cycle)
```

## 3) Sequence: Scheduled Sync Cycle

```text
PollingWorker -> API(metrics) : BeginCycle(cycleId)
PollingWorker -> GW : DiscoverDevices (if due)
PollingWorker -> GW : ReadPoints batches by plan
GW -> Device : BACnet reads
Device -> GW : values
GW -> PollingWorker : normalized batches
PollingWorker -> DB : write basic points
PollingWorker -> DB : write trend samples (mode policy)
PollingWorker -> API(metrics) : RecordDeviceResult
PollingWorker -> API(metrics) : CompleteCycle
PollingWorker -> HUB : SyncCycleUpdated + TrendSamplesUpdated
HUB -> UI : push updated status/charts
```

## 4) Sequence: Mode Switch (Standalone -> CenterServer)

```text
UI  -> API : POST /api/v1/mode/switch { targetMode }
API -> DB(config) : validate and persist mode transition
API -> DB(center) : test MSSQL connectivity
alt center DB reachable
  API -> API : activate center policy
  API -> HUB : ModeChanged
  API -> UI  : 200 success
else center DB unreachable
  API -> API : reject transition
  API -> HUB : AlertRaised (DB down)
  API -> UI  : 409 with reason
end
```

## 5) Sequence: Center DB Outage Handling

```text
HealthWorker -> DB(center) : connectivity probe
DB(center) -> HealthWorker : failure
HealthWorker -> API(mode) : mark center db unhealthy
API(mode) -> PollingWorker : pause trend writes
API -> HUB : AlertRaised + HealthSnapshotUpdated
HUB -> UI  : warning banner and status card update
UI  -> API : GET /api/v1/health/detail
API -> UI  : center db unhealthy, samplingPaused=true
```

## 6) Sequence: Recovery (Center DB Restored)

```text
HealthWorker -> DB(center) : connectivity probe
DB(center) -> HealthWorker : success
HealthWorker -> API(mode) : mark center db healthy
API(mode) -> PollingWorker : resume trend writes
API -> HUB : AlertCleared + HealthSnapshotUpdated
HUB -> UI  : banner cleared, status normal
```

## 7) API Contract Examples

## 7.1 GET /api/v1/mode

Response 200:

```json
{
  "mode": "CenterServer",
  "policy": {
    "writeTrendTo": "MSSQL",
    "writeBasicTo": "MSSQL",
    "allowTrendFallbackToSqlite": false,
    "pauseSamplingWhenCenterDbDown": true
  },
  "centerDb": {
    "configured": true,
    "healthy": true,
    "server": "192.168.1.10",
    "database": "T3000_Center"
  },
  "updatedAtUtc": "2026-05-13T14:30:10Z"
}
```

## 7.2 POST /api/v1/mode/switch

Request:

```json
{
  "targetMode": "CenterServer",
  "reason": "Enable shared database",
  "actor": "admin"
}
```

Success 200:

```json
{
  "success": true,
  "fromMode": "Standalone",
  "toMode": "CenterServer",
  "appliedAtUtc": "2026-05-13T14:31:01Z",
  "warnings": []
}
```

Failure 409:

```json
{
  "success": false,
  "error": {
    "code": "CENTER_DB_UNREACHABLE",
    "message": "Center DB connectivity test failed",
    "details": {
      "server": "192.168.1.10",
      "database": "T3000_Center",
      "timeoutMs": 5000
    }
  }
}
```

## 7.3 GET /api/v1/health/summary

Response 200:

```json
{
  "service": {
    "status": "Healthy",
    "version": "1.0.0",
    "uptimeSec": 18342
  },
  "database": {
    "mode": "CenterServer",
    "sqlite": { "status": "Healthy", "path": "D:/.../t3000.db" },
    "mssql": { "status": "Healthy", "server": "192.168.1.10", "db": "T3000_Center" }
  },
  "sampling": {
    "paused": false,
    "lastAttemptUtc": "2026-05-13T14:30:00Z",
    "lastSuccessUtc": "2026-05-13T14:30:00Z",
    "cycleIntervalSec": 300
  },
  "devices": {
    "total": 12,
    "online": 10,
    "offline": 2,
    "offlineThresholdSec": 900
  }
}
```

## 7.4 POST /api/v1/devices/{deviceId}/points/read

Request:

```json
{
  "entryType": "inputs",
  "indices": [0, 1, 2],
  "forceRead": true
}
```

Response 200:

```json
{
  "deviceId": "237219",
  "readAtUtc": "2026-05-13T14:33:22Z",
  "points": [
    { "index": 0, "name": "IN1", "value": 72.5, "unit": "F", "quality": "Good" },
    { "index": 1, "name": "IN2", "value": 71.9, "unit": "F", "quality": "Good" },
    { "index": 2, "name": "IN3", "value": 0, "unit": "OnOff", "quality": "Good" }
  ]
}
```

## 7.5 GET /api/v1/sync/cycles

Response 200:

```json
{
  "items": [
    {
      "cycleId": "4e6e4b02-09fd-4c80-9a7c-f16d2259f06e",
      "startedAtUtc": "2026-05-13T14:30:00Z",
      "finishedAtUtc": "2026-05-13T14:30:04Z",
      "durationMs": 4210,
      "devicesTotal": 12,
      "devicesSuccess": 11,
      "devicesFailed": 1,
      "trendSamplesWritten": 834,
      "status": "PartialSuccess"
    }
  ],
  "total": 1
}
```

## 8) SignalR Contract Examples

## 8.1 DeviceUpdated

Event name:
- DeviceUpdated

Payload:

```json
{
  "deviceId": "237219",
  "updatedAtUtc": "2026-05-13T14:33:22Z",
  "entryType": "inputs",
  "points": [
    { "index": 0, "value": 72.5, "quality": "Good" },
    { "index": 1, "value": 71.9, "quality": "Good" }
  ]
}
```

## 8.2 TrendSamplesUpdated

Event name:
- TrendSamplesUpdated

Payload:

```json
{
  "deviceId": "237219",
  "series": "IN1",
  "window": {
    "startUtc": "2026-05-13T14:00:00Z",
    "endUtc": "2026-05-13T14:35:00Z"
  },
  "samplesAppended": 12,
  "source": "ScheduledSync"
}
```

## 8.3 ModeChanged

Event name:
- ModeChanged

Payload:

```json
{
  "fromMode": "Standalone",
  "toMode": "CenterServer",
  "appliedAtUtc": "2026-05-13T14:31:01Z",
  "actor": "admin"
}
```

## 8.4 HealthSnapshotUpdated

Event name:
- HealthSnapshotUpdated

Payload:

```json
{
  "database": {
    "mssql": "Unhealthy"
  },
  "sampling": {
    "paused": true,
    "reason": "Center DB unreachable"
  },
  "devices": {
    "offline": 2,
    "offlineThresholdSec": 900
  },
  "updatedAtUtc": "2026-05-13T14:40:05Z"
}
```

## 8.5 AlertRaised

Event name:
- AlertRaised

Payload:

```json
{
  "severity": "Warning",
  "category": "Database",
  "code": "CENTER_DB_UNREACHABLE",
  "message": "Sampling paused because center DB is unreachable",
  "raisedAtUtc": "2026-05-13T14:40:05Z"
}
```

## 9) Standard Error Envelope

All non-2xx API responses should follow:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "traceId": "00-...",
    "timeUtc": "2026-05-13T14:41:00Z"
  }
}
```

Suggested codes:
- CENTER_DB_UNREACHABLE
- MODE_TRANSITION_REJECTED
- DEVICE_READ_TIMEOUT
- DEVICE_NOT_FOUND
- VALIDATION_FAILED
- INTERNAL_ERROR

## 10) HTTP Status Guidance

- 200: success
- 202: accepted async trigger
- 400: validation failure
- 404: target not found
- 409: conflict (invalid mode transition, center db unavailable)
- 503: service unavailable (provider unavailable)
- 500: internal unhandled error

## 11) Naming Conventions

API:
- use /api/v1
- nouns for resources
- action endpoints only when needed (for trigger/read-now)

Events:
- PascalCase
- past-tense state/event style: DeviceUpdated, ModeChanged

Timestamps:
- always UTC ISO-8601 with Z suffix

## 12) Contract Validation Checklist

Before implementation freeze:
- Confirm all fields needed by dashboard cards exist.
- Confirm offline definition is consistent across API and UI.
- Confirm center DB outage behavior is visible in both API and SignalR.
- Confirm trend window query shape supports current chart usage.
- Confirm mode-switch API supports required audit fields (actor, reason).
