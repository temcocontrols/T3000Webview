# T3Net Service Modernization Blueprint

Date: 2026-05-13
Status: Working design reference

## Purpose

This document captures a clear before/after architecture for moving from the current T3000-hosted Rust runtime to a standalone Windows Service backend (T3Net), with practical migration steps.

## 1) Current Architecture (As-Is)

Today, runtime availability depends on the T3000 desktop process.

```text
┌──────────────────────────────┐
│ User opens T3000 Desktop App │
│ (C++ process)                │
└──────────────┬───────────────┘
               │ hosts
               ▼
      ┌──────────────────────┐
      │ Rust DLL in-process  │
      │ - HTTP API (9103)    │
      │ - WS socket (9104)   │
      │ - serves web assets  │
      └──────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │ Browser opens UI     │
      │ and calls Rust API   │
      └──────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │ Rust FFI call into   │
      │ C++ HandleWebViewMsg │
      └──────────┬───────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │ C++ BACnet/Device IO │
      └──────────────────────┘
```

Key limitation:
- If T3000 desktop closes, backend path is disrupted.

## 2) Target Architecture (Recommended)

Use a service-first design with clear boundaries.

```text
                ┌──────────────────────────┐
                │      Browser UI          │
                │  React + SignalR client  │
                └─────────────┬────────────┘
                              │ HTTP + SignalR
                              ▼
┌──────────────────────────────────────────────────────────┐
│                 Platform API Service (.NET)             │
│ - REST endpoints                                        │
│ - SignalR hub                                           │
│ - Dashboard, mode rules, health, logs                   │
│ - Serves static website files                           │
└──────────────┬───────────────────────────────┬──────────┘
               │                               │
               │ commands/queries              │ reads/writes
               ▼                               ▼
┌──────────────────────────────┐      ┌──────────────────────────────┐
│  Protocol Gateway Service    │      │ Data Layer                   │
│  - BACnet polling workers    │      │ - SQLite (standalone)        │
│  - device retries/timeouts   │      │ - MSSQL (center mode)        │
│  - point normalization        │      │ - app logs + sync metrics    │
└──────────────┬───────────────┘      └──────────────────────────────┘
               │
               ▼
      ┌──────────────────────┐
      │ Real BACnet Devices  │
      └──────────────────────┘
```

Why this target:
- No dependency on desktop T3000 process lifetime.
- Better fault isolation and clearer operational status.
- Easier long-term scaling and maintenance.

## 3) End-to-End Request Sequence

```text
User opens Dashboard
   │
   ▼
UI calls API: GET /devices
   │
   ▼
Platform API checks cache/state
   │
   ├─ if fresh -> return data
   │
   └─ if stale -> ask Gateway for refresh
                    │
                    ▼
               Gateway polls BACnet device
                    │
                    ▼
               Gateway returns normalized points
                    │
                    ▼
Platform API writes DB + updates status
                    │
                    ▼
Platform API emits SignalR event "DeviceUpdated"
                    │
                    ▼
UI updates cards/charts in real time
```

## 4) Data Mode Rules (Standalone vs Center DB)

```text
Mode = Standalone
  Basic data + high-volume trend samples -> SQLite

Mode = Center DB
  High-volume trend samples -> MSSQL only
  Basic config/logs -> MSSQL (optional local diagnostic mirror)

If Center DB is down while in Center mode:
  - pause sampling writes
  - show warning/alarm
  - do not silently write trend samples to SQLite
  - allow manual switch back to standalone by user action
```

Rationale:
- Prevent split data histories across different databases.

## 5) Startup Flow After Migration

```text
Windows boots
   │
   ▼
T3Net Windows Service auto-starts
   │
   ├─ starts API host
   ├─ serves website
   ├─ starts SignalR
   ├─ starts polling workers
   └─ loads mode/config and health checks
   │
   ▼
User opens browser -> system works even if T3000 desktop is not open
```

## 6) Communication Strategy Options

Option A: Single .NET service with direct BACnet
- Fastest operational simplification.
- Good first production milestone.

Option B: Platform API + Protocol Gateway (recommended)
- Better separation of concerns and resilience.
- Strong long-term architecture.

Option C: Event-driven (broker)
- Most scalable, highest operational complexity.
- Better as a later phase.

## 7) Recommended Libraries

Core:
- ASP.NET Core (API + static files)
- SignalR (push updates)
- Dapper or EF Core for data access
- Microsoft.Data.Sqlite
- Microsoft.Data.SqlClient

Protocol:
- BACnet library (C# BACnet stack, vendored if needed)
- Keep FluentModbus for Modbus use cases

Background processing:
- BackgroundService + PeriodicTimer

## 8) Migration Plan

Phase 1: Service shell
- Host UI + API + SignalR in T3Net.
- Keep existing contracts stable.

Phase 2: Adapter abstraction
- Add IDeviceProvider with two implementations:
  - LegacyFfiProvider
  - NativeBacnetProvider

Phase 3: Native BACnet path
- Move polling and normalization to NativeBacnetProvider.
- Keep FFI only as fallback.

Phase 4: Cutover
- Make NativeBacnetProvider default.
- Remove hard dependency on desktop T3000 runtime.

## 9) Practical Acceptance Criteria

- Browser can load UI/API without launching T3000 desktop app.
- Device online/offline status is based on polling freshness thresholds.
- Last successful sync and last attempted sync are displayed separately.
- In Center DB mode, MSSQL outage pauses sampling and raises warning.
- No silent trend sample fallback to SQLite in Center mode.

## 10) Related Existing References

- Existing architecture draft:
  - docs/t3000/architecture/service-decoupling-design-v2.md

- Current Rust runtime startup and service behavior:
  - api/src/lib.rs
  - api/src/server.rs
  - api/src/t3_socket/server.rs

- Current .NET service scaffold:
  - t3net/T3Net/Program.cs
  - t3net/T3Net/T3Net.csproj
