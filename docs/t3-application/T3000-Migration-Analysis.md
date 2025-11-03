## T3000 → WebView Migration Analysis

Date: 2025-11-03
Branch: feature/new-ui

This document captures a first-pass, actionable analysis and migration plan to move the legacy MFC-based T3000 C++ application into the WebView / web stack used by this repository. It is intentionally pragmatic and phased so the team can deliver incremental value while preserving the existing UI and workflows.

## Short contract
- Inputs: existing T3000 C++ codebase (T3000-Source/T3000), current WebView frontend (Quasar/Vue), and Rust API used by the project.
- Outputs: a phased migration roadmap, UI component mapping, prioritized feature list, risks and mitigation, and a concrete next-step checklist.
- Success criteria: ability to run existing features via the new WebView frontend with preserved layouts and feature parity, in phased releases.

## Executive summary
- The legacy codebase is large (300+ C++ files) and organized around MFC views/dialogs, a central main frame, device communication (BACnet, Modbus, proprietary), and local SQLite databases.
- Recommended approach: incremental migration in phases (Discovery → Reusable services → UI porting → Protocol adapters → Hardening & rollout). Keep the Rust API and SQLite partitioning strategy where it makes sense; replace MFC UI with Vue/Quasar components mounted inside WebView2 (desktop) or in a browser.

## High-level architecture (current vs target)
- Current: MFC app (C++), many dialog classes, device communication stacks, SQLite DB files, WebView embedded component in C++ (some webview glue already exists in `BacnetWebView.cpp`).
- Target: Vue 3 + Quasar (frontend) served inside WebView2 for desktop shell; Rust backend (existing `t3_webview_api`) augmented with HTTP/IPC or FFI bridge for device-level services; SQLite remains as the data store, accessed through Rust service layer to keep single writer and to reuse partition monitoring.

## What I found so far (quick inventory)
- Main entry points: `MainFrm.cpp`, `T3000.cpp`, `T3000View.cpp` — manage app lifecycle and central views.
- UI artifacts: 100+ dialog/view classes (resource identifiers in `resource.h`). Examples: `BacnetInput.cpp`, `BacnetOutput.cpp`, `TrendLogView.cpp`, `GraphicView.cpp`, `Tstat*` files, `ProgramEditor` directory.
- Protocols: BACnet (many `Bacnet*` files), Modbus (e.g., `modbus_read_write.cpp`), custom serial/IP logic (socket code present in `global_function.cpp` and `MySocket.cpp`).
- Storage: SQLite databases under `T3000-Source/Database/` and many DB helper calls (using `CppSQLite3` wrappers).
- Web integration hints: `BacnetWebView.cpp` provides a bridge/window for the webview approach.

## Recommended technology stack
- Frontend: Vue 3 + TypeScript + Quasar (already used). ECharts for charts (already present).
- Desktop host: WebView2 (Windows) for native-like experience; continue to support pure web access if desired.
- Backend: Rust (existing `t3_webview_api`) exposing services via either:
  - Local HTTP (127.0.0.1) REST/JSON endpoints for the web UI, or
  - WebSocket/IPC for push notifications (monitor updates), or
  - Keep FFI for tightly-coupled behaviors where necessary.
- Database: SQLite accessed exclusively by the Rust service (avoid multi-process concurrent writers). Keep partition monitor logic already added in Rust.
- Build/test: Vitest for frontend tests, Rust unit tests for backend logic (already used in repository tests).

## UI mapping strategy (preserve layout)
- Each MFC dialog → Vue component with 1:1 layout mapping where feasible.
- For large form-views (e.g., `T3000View`, `GraphicView`, `TrendLogView`), create container components that replicate the MFC arrangement (toolbars, splitters, tree + content panes).
- Reuse existing icons/bitmaps from `T3000-Source/T3000` resources where licensing allows; export assets into `src/assets/`.
- Use Quasar layouts, QSplitter, and QTable to replicate MFC controls.
- For custom drawing (graphics screens), port the drawing logic to Canvas/SVG and reuse structured JSON representations of the graphic objects (the legacy code has JSON usage in `BacnetScreen.cpp`/`BacnetScreenEdit.cpp`).

## Data & protocol mapping
- Move all direct DB access from C++ into the Rust service layer which will provide typed APIs to the UI. This centralizes locking, WAL/SHM cleanup, and partition handling.
- Device protocols (BACnet/Modbus) should be wrapped by Rust adapters where practical. If existing C++ BACnet code is reliable and proven, keep it running as a separate native service and provide an adapter (HTTP/IPC) to the Rust API during an interim period.
- Preserve database schema and table names; the Rust layer can reuse `CppSQLite3`-equivalent crates or call into existing SQLite via FFI if needed.

## Phased migration plan (recommended)
- Phase 0 — Discovery (1–2 sprints)
  - Complete full inventory of dialogs, views, and source files.
  - Identify high-priority features and hot paths (TrendLog, Monitor, Program Editor, BACnet settings).
  - Produce UI component mapping spreadsheet (file/class → proposed component path).

- Phase 1 — Infrastructure & Services (2–4 sprints)
  - Harden the Rust API: ensure endpoints for listing buildings, reading/writing device points, trend queries, user auth, settings.
  - Centralize DB access in Rust; enforce single-writer model and reuse partition cleanup.
  - Add local HTTP endpoints + WebSocket push for monitor updates.
  - Add integration tests between Rust and existing DB.

- Phase 2 — Shell + Core UI (2–6 sprints)
  - Implement the main shell (tree view, top toolbars, status bar) in Vue/Quasar.
  - Port `T3000View`, `TrendLogView`, and `GraphicView` as priority features.
  - Wire UI to Rust endpoints.

- Phase 3 — Feature migration (iterative, per-subsystem)
  - Prioritize subsystems (Trend/Monitor, BACnet, Tstat, Program Editor, Scheduling, Alarm logs).
  - For each subsystem: port UI, wire CRUD to Rust, port any light business logic (safely) to Rust.
  - Keep the native C++ process as a compatibility adapter until full migration.

- Phase 4 — Hardening & Cutover
  - Move remaining C++ services to Rust or wrap as microservices.
  - Perform performance testing, security audit (local DB locking, auth, network exposure), and QA.
  - Plan rollout with feature toggles and ability to revert to native app for critical operations.

## Prioritization suggestions
- Phase 1 priority: TrendLog/Monitor pages (display and charting), Building/Device tree, Device read/write operations.
- Phase 2 priority: Program Editor (complex), Graphic screens (medium–high), BACnet settings dialogs (high for users).

## Risks and mitigations
- Risk: Concurrency on SQLite (WAL/SHM) between native and new processes. Mitigation: Single writer service (Rust) and make web UI call Rust endpoints only.
- Risk: Rewriting complex drawing logic (graphics screen). Mitigation: Serialize existing graphics to JSON and render in Canvas; reuse existing JSON parsing code where available.
- Risk: BACnet/Modbus correctness: device behavior depends on precise timing and protocol handling. Mitigation: Keep C++ protocol stacks running behind an adapter during migration; incrementally port to Rust with protocol tests.
- Risk: Feature creep and scope growth. Mitigation: Preserve feature parity only; consider deferring low-use dialogs to later phases.

## Estimation (very coarse)
- Discovery/Scaffolding: 2–4 developer-weeks
- Core services (Rust + DB centralization): 6–12 dev-weeks
- Shell and first UI features (tree, TrendLog, Monitor): 8–16 dev-weeks
- Per major subsystem (BACnet, ProgramEditor, Graphics): 4–12 dev-weeks each depending on complexity
- Total rough: many person-months; expect multi-quarter project for full parity by a small team.

## Testing strategy
- Unit tests for Rust services (existing tests present in repo) — expand coverage for DB and communication adapters.
- End-to-end integration tests using the existing test database (`tests/test_database.db`) and automated UI tests (Playwright) for critical flows.
- Performance testing for trend queries and chart rendering.

## Low-risk adjacent improvements (proactive)
- Generate an automated inventory CSV listing all `*.cpp` and `*.h` under `T3000-Source/T3000` with classification by folder and guessed subsystem. (I can produce this next.)
- Add `docs/t3-application/COMPONENT-MAPPING.csv` to track per-file migration progress.
- Seed top-level Vue shell pages and a placeholder `T3000-shell` route in `src/pages/` so design work can start in parallel.

## Next steps (immediate)
1. Run a file inventory pass and produce a per-file mapping CSV. (I can generate this now.)
2. Create `docs/t3-application/COMPONENT-MAPPING.csv` and populate with initial entries for high-value dialogs (TrendLog, GraphicView, Bacnet* files).
3. Implement Rust service endpoints for building/device tree and trend queries (small API to test end-to-end).
4. Implement a minimal Vue shell page with a static tree and TrendLog chart wired to a mock endpoint to validate layout.

## Files created/edited
- `docs/t3-application/T3000-Migration-Analysis.md` — this file (planning & roadmap).

## How I verified initial analysis
- Scanned `T3000-Source/T3000` headers and key sources (`MainFrm.cpp`, `T3000.cpp`, `T3000View.cpp`, `resource.h`, `global_define.h`) to identify structure, resources, and dialog IDs.

## Closing summary
This is a pragmatic, phased migration plan aimed at preserving the existing UI and workflows while moving functionality into a maintainable web stack. If you want, I will now:
- Option A: Generate the detailed file inventory CSV (per-file classification and suggested component name). This is the logical next step and will make planning and assignment concrete.
- Option B: Start implementing the minimal Rust HTTP endpoints and a skeleton Vue shell to validate end-to-end wiring.

Please tell me which option to run next (A or B), or if you want me to proceed with both in order. If you pick A I will create `COMPONENT-MAPPING.csv` with an initial mapping of the highest-value files first.
