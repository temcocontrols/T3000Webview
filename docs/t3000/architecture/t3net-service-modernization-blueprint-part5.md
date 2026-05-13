# T3Net Service Modernization Blueprint - Part 5 (Execution Board)

Date: 2026-05-13
Status: Execution-ready

## Scope

This part converts architecture and delivery planning into an implementation board:
- task list by sprint
- dependencies
- effort estimates (S/M/L)
- Definition of Done (DoD)
- review and demo checkpoints

Related:
- docs/t3000/architecture/t3net-service-modernization-blueprint.md
- docs/t3000/architecture/t3net-service-modernization-blueprint-part2.md
- docs/t3000/architecture/t3net-service-modernization-blueprint-part3.md
- docs/t3000/architecture/t3net-service-modernization-blueprint-part4.md

## 1) Effort Scale

- S: 0.5 to 1.5 dev-days
- M: 2 to 4 dev-days
- L: 5 to 10 dev-days

## 2) Dependency Graph (High-Level)

```text
A1 Contracts Freeze
  ├─> A2 API Skeleton
  ├─> A3 SignalR Event Contracts
  └─> A4 Error Envelope Middleware

B1 DB Schema Scripts (APP_LOG + SYNC summaries)
  ├─> B2 Repository Layer
  └─> B3 Health/Logs Endpoints

C1 Mode Service
  ├─> C2 Mode Switch API
  ├─> C3 Center DB Probe
  └─> C4 Pause-on-DB-Down Enforcement

D1 Polling Worker Base
  ├─> D2 Polling Plan Builder
  ├─> D3 Sync Metrics Writer
  └─> D4 SignalR Push Integration

E1 Provider Router
  ├─> E2 LegacyFfiProvider
  ├─> E3 NativeBacnetProvider
  └─> E4 Parity Test Harness

F1 Windows Service Packaging
  ├─> F2 Install/Recovery Scripts
  ├─> F3 Soak Test
  └─> F4 Rollback Drill
```

## 3) Sprint Board

## Sprint 1 (Foundation and Contracts)

### Tasks

1. A1 - Freeze v1 API + SignalR contracts
- Effort: M
- Owner: Backend + Frontend
- Dependencies: none
- Deliverables:
  - contract markdown and JSON samples
  - accepted field list for dashboard

2. A2 - Implement controller skeletons and route map
- Effort: S
- Owner: Backend
- Dependencies: A1
- Deliverables:
  - HealthController, ModeController, DeviceController, TrendController, AdminController stubs

3. A3 - Wire SignalR event names and channel subscriptions
- Effort: S
- Owner: Backend + Frontend
- Dependencies: A1
- Deliverables:
  - event constants and basic publish/subscribe flow

4. A4 - Add standard error envelope middleware
- Effort: S
- Owner: Backend
- Dependencies: A1
- Deliverables:
  - uniform error payload with code/message/details/traceId/timeUtc

### Sprint 1 DoD

- all v1 endpoints compile and respond with placeholder data
- SignalR channels connect and receive sample events
- error envelope applied to all non-2xx responses

## Sprint 2 (Data Foundation and Mode Policy)

### Tasks

1. B1 - Create schema scripts for APP_LOG, SYNC_CYCLE_SUMMARY, DEVICE_SYNC_SUMMARY
- Effort: M
- Owner: Data
- Dependencies: A1

2. B2 - Implement repositories (log/sync/device/trend)
- Effort: M
- Owner: Backend + Data
- Dependencies: B1

3. C1 - Implement ModeService with strict policy model
- Effort: M
- Owner: Backend
- Dependencies: A1

4. C2 - Implement mode switch API
- Effort: S
- Owner: Backend
- Dependencies: C1

5. C3 - Implement center DB probe and transition validation
- Effort: M
- Owner: Backend + Data
- Dependencies: C1

6. C4 - Enforce pause-on-center-db-down behavior
- Effort: M
- Owner: Backend
- Dependencies: C1, C3

### Sprint 2 DoD

- mode transitions work for success and rejection paths
- center DB outage produces warning and sets samplingPaused=true
- no trend fallback writes to sqlite while in center mode

## Sprint 3 (Polling and Operational Telemetry)

### Tasks

1. D1 - Implement polling worker base loop
- Effort: M
- Owner: Backend
- Dependencies: C1, B2

2. D2 - Implement polling plan builder (cadence + grouping)
- Effort: M
- Owner: Backend + Protocol
- Dependencies: D1

3. D3 - Implement sync cycle metrics writer
- Effort: S
- Owner: Backend + Data
- Dependencies: B2, D1

4. B3 - Implement health/log endpoints from real repositories
- Effort: S
- Owner: Backend
- Dependencies: B2

5. D4 - Emit DeviceUpdated and SyncCycleUpdated events
- Effort: S
- Owner: Backend + Frontend
- Dependencies: D1, A3

### Sprint 3 DoD

- 24h run without worker crashes
- each cycle writes summary rows
- health endpoints reflect real DB and sampling state

## Sprint 4 (Provider Migration and Parity)

### Tasks

1. E1 - Implement provider router and feature flag
- Effort: S
- Owner: Backend
- Dependencies: A1

2. E2 - Implement LegacyFfiProvider bridge
- Effort: M
- Owner: Protocol + Backend
- Dependencies: E1

3. E3 - Implement NativeBacnetProvider (MVP)
- Effort: L
- Owner: Protocol
- Dependencies: E1

4. E4 - Build parity harness and report output
- Effort: M
- Owner: QA + Protocol
- Dependencies: E2, E3

### Sprint 4 DoD

- provider can be switched by config without redeploy
- parity report generated for selected devices/points
- known deltas documented with severity classification

## Sprint 5 (Cutover, Hardening, and Release)

### Tasks

1. F1 - Package as Windows Service and deployment profile
- Effort: M
- Owner: DevOps
- Dependencies: D1, C1

2. F2 - Install/recovery scripts and service restart policy
- Effort: M
- Owner: DevOps
- Dependencies: F1

3. F3 - 72h soak test in stage
- Effort: M
- Owner: QA
- Dependencies: F1, E3

4. F4 - Rollback drill (flag + package rollback)
- Effort: S
- Owner: DevOps + QA
- Dependencies: F2

5. R1 - Production readiness review
- Effort: S
- Owner: Leads
- Dependencies: F3, F4

### Sprint 5 DoD

- reboot auto-start verified
- outage/recovery behavior validated
- rollback completed successfully in drill
- readiness sign-off recorded

## 4) Definition of Done (Global)

A task is done only when all are true:
- implementation merged with tests
- docs updated (contract and behavior)
- telemetry/logging added for critical path
- failure modes tested (at least one negative case)
- demo recorded or shown to stakeholders

## 5) Demo Checklist by Sprint

Sprint 1 demo:
- health endpoint returns structured payload
- frontend can subscribe and receive a sample event

Sprint 2 demo:
- mode switch success and reject (center db down) shown live
- samplingPaused visible in health summary

Sprint 3 demo:
- scheduled sync writes summaries and pushes updates
- offline threshold behavior visible in dashboard

Sprint 4 demo:
- run same read set with legacy and native providers
- show parity report and discrepancy list

Sprint 5 demo:
- service survives reboot and auto-recovers
- rollback trigger path works end-to-end

## 6) Backlog Safety Buffer

Reserve 15 to 20 percent capacity each sprint for:
- integration surprises with real devices
- data shape mismatches with legacy behavior
- dashboard UX corrections after stakeholder review

## 7) Suggested Jira/Epics Mapping

Epic A: Contracts and Service Foundation
- A1, A2, A3, A4

Epic B: Data and Mode Integrity
- B1, B2, C1, C2, C3, C4

Epic C: Polling and Observability
- D1, D2, D3, B3, D4

Epic D: Provider Migration
- E1, E2, E3, E4

Epic E: Release Hardening
- F1, F2, F3, F4, R1

## 8) Immediate Start List (Next 3 Days)

Day 1:
- finalize A1 contract freeze
- scaffold A2 controllers

Day 2:
- implement A4 error envelope
- prepare B1 schema scripts

Day 3:
- implement C1 mode service skeleton
- add C2 endpoint and placeholder transition logic
