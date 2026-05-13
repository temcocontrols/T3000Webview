# T3Net Service Modernization Blueprint - Part 4 (Delivery Plan)

Date: 2026-05-13
Status: Execution plan draft

## Scope

This part turns the architecture into a practical delivery plan:
- sprint breakdown
- owner roles
- quality gates
- risks and mitigations
- release and rollback strategy

Related:
- docs/t3000/architecture/t3net-service-modernization-blueprint.md
- docs/t3000/architecture/t3net-service-modernization-blueprint-part2.md
- docs/t3000/architecture/t3net-service-modernization-blueprint-part3.md

## 1) Program Timeline (10 Weeks)

```text
Week:   1 2 | 3 4 | 5 6 | 7 8 | 9 10
        -----+-----+-----+-----+------
Track A  Foundations + Contracts
Track B        Mode Engine + DB Schemas
Track C              Polling + Metrics
Track D                    Provider Migration
Track E                          Cutover + Hardening
```

Milestones:
- M1 (end week 2): API and SignalR contract freeze
- M2 (end week 4): Mode switch and DB policy behavior complete
- M3 (end week 6): Polling loop and sync summaries stable
- M4 (end week 8): Native provider parity validated
- M5 (end week 10): Production rollout readiness

## 2) Sprint-by-Sprint Plan

## Sprint 1 (Weeks 1-2): Foundation and Contracts

Goals:
- establish service baseline and stable interfaces

Deliverables:
- v1 controller routes scaffold
- SignalR event names and payload freeze
- error envelope middleware
- initial health endpoints
- contract sample payload files

Acceptance:
- API smoke tests pass
- UI can consume mocked v1 endpoints
- no breaking changes in agreed contract set

## Sprint 2 (Weeks 3-4): Mode Engine and Database Policies

Goals:
- implement mode behavior and strict center DB policy

Deliverables:
- mode service with transition rules
- APP_LOG, SYNC_CYCLE_SUMMARY, DEVICE_SYNC_SUMMARY schema scripts
- center DB probe and pause-on-down logic
- dashboard health payload parity

Acceptance:
- mode switch success/failure paths work
- center DB outage produces warning and sampling pause
- no silent trend fallback to sqlite in center mode

## Sprint 3 (Weeks 5-6): Polling and Sync Metrics

Goals:
- make periodic sync reliable and observable

Deliverables:
- polling worker and plan builder
- sync metrics service wired to repositories
- DeviceUpdated and SyncCycleUpdated events
- first load tests with multiple charts/windows

Acceptance:
- stable cycle execution over 24h test
- summary tables populated each cycle
- offline detection threshold behavior validated

## Sprint 4 (Weeks 7-8): Provider Migration and Parity

Goals:
- introduce native protocol provider with side-by-side validation

Deliverables:
- LegacyFfiProvider adapter (if required)
- NativeBacnetProvider initial implementation
- provider router feature flag
- parity report pipeline (legacy vs native sampled compare)

Acceptance:
- parity report above agreed threshold
- no critical data regressions on key points/trends
- controlled fallback via feature flag available

## Sprint 5 (Weeks 9-10): Cutover and Hardening

Goals:
- finalize production deployment path

Deliverables:
- windows service install scripts and recovery settings
- operational runbook and alert playbook
- rollback guide and feature flag strategy
- release candidate verification checklist

Acceptance:
- reboot auto-start validated
- production-like soak test completed
- rollback drill successful

## 3) Workstream Ownership Model

Recommended roles:
- Backend lead: API, workers, mode service
- Protocol lead: native BACnet provider and device QA
- Data lead: schema, repository, retention policy
- Frontend lead: dashboard cards, event wiring, UX status states
- QA lead: parity tests, soak tests, outage simulation
- DevOps lead: service packaging, install, recovery, monitoring

RACI summary:
- contract definitions: backend lead (A), frontend lead (C)
- mode policy: backend lead (A), data lead (R)
- provider parity: protocol lead (A), QA lead (R)
- release gate: QA lead (A), devops lead (R)

## 4) Environment and Test Matrix

Environments:
- DEV: local sqlite, mock provider, optional local BACnet simulator
- INT: shared mssql + real device subset
- STAGE: production-like network and load
- PROD: phased rollout

Test matrix:
- functional: endpoints, mode switch, dashboard cards
- reliability: 24h and 72h soak tests
- outage: mssql down, provider timeout, network jitter
- scale: multiple charts and concurrent clients
- recovery: service restart, reboot, DB reconnection

## 5) Quality Gates

Gate G1 (Contract Gate):
- all v1 endpoints and SignalR payloads versioned and documented
- frontend compatibility confirmed

Gate G2 (Mode Integrity Gate):
- center mode outage behavior verified
- no forbidden fallback behavior

Gate G3 (Sync Reliability Gate):
- cycle completion rate and error budgets acceptable
- summary metrics complete

Gate G4 (Parity Gate):
- native provider parity meets agreed threshold
- known deltas documented and accepted

Gate G5 (Release Gate):
- rollback plan validated
- on-call runbook signed off

## 6) Metrics and Success Criteria

Core SLO candidates:
- API availability: >= 99.9%
- sync cycle success: >= 99.0%
- p95 device read latency: target by device class
- SignalR push delay p95: <= 2s
- center mode data policy violations: 0

Operational KPIs:
- mean time to detect center DB outage
- mean time to recovery after DB restore
- number of mode transition failures
- dashboard data freshness compliance

## 7) Risk Register

Risk R1: BACnet library behavior mismatch
- Impact: high
- Mitigation: parity tests, feature-flag fallback, staged rollout

Risk R2: center DB instability causes prolonged pause
- Impact: high
- Mitigation: clear alarms, operator runbook, mode switch tooling

Risk R3: contract drift between backend and frontend
- Impact: medium
- Mitigation: schema snapshots and CI contract tests

Risk R4: high concurrency chart usage causes overload
- Impact: medium
- Mitigation: read throttling, targeted reads, cycle scheduling limits

Risk R5: deployment/startup failures on customer PCs
- Impact: high
- Mitigation: signed installer, preflight checks, service recovery config

## 8) Rollout Strategy

Phase 0: internal pilot
- small device set, daily review

Phase 1: limited customer beta
- 1-2 sites, observe for 1-2 weeks

Phase 2: staged production rollout
- wave deployment by customer group

Phase 3: default new installs
- native provider default, legacy fallback disabled by default

## 9) Rollback Strategy

Technical rollback controls:
- feature flag: switch provider from Native to Legacy
- mode lock: enforce standalone temporarily if center DB unstable
- release rollback: previous service package reinstall

Rollback triggers:
- parity breach beyond threshold
- repeated sync cycle failures
- sustained dashboard staleness beyond SLA

Rollback checklist:
1. announce incident and freeze rollouts
2. flip provider flag to legacy
3. verify key endpoints and sync cycle health
4. collect incident logs and cycle summaries
5. decide hotfix vs full rollback package

## 10) Deliverables Checklist

Documentation:
- architecture parts 1-4
- operator runbook
- troubleshooting guide
- release notes template

Code artifacts:
- mode service
- workers
- provider router
- repositories and schema scripts
- health and diagnostics endpoints

Validation artifacts:
- contract test report
- parity report
- soak test report
- outage and recovery drill report

## 11) Immediate Next Actions (1 Week)

1. Freeze v1 API and SignalR payloads from Part 3.
2. Implement APP_LOG and sync summary tables in both DB backends.
3. Implement mode switch endpoint and center DB probe.
4. Add health summary endpoint with explicit samplingPaused signal.
5. Define parity test dataset and acceptance threshold.
