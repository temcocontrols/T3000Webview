# LVGL SVG Renderer — Decisions & Additive Contract

Part of the [design set](./README.md). Status: **design, awaiting 4 answers**.
This is the sign-off document: nothing in P1+ starts until §1 is answered.

---

## 1. Open decisions

### D1 — Run mode: does SVG cover it?

| | Context |
|---|---|
| Today | Design mode uses `LVGLPageEditorRuntime`; non-active pages `LVGLNonActivePageViewerRuntime`; **run mode** uses `LVGLPageViewerRuntime` via `flow/runtime/wasm-runtime.tsx:302` |
| Options | **(a)** SVG for design + non-active; run mode stays canvas. **(b)** SVG everywhere including run. |
| Recommendation | **(a)** — Flow execution drives animations/transitions/state changes at frame rate; keeping pixels there preserves behavioural truth, and it is the smaller surface to prove. |
| If wrong | Later extension to `LVGLPageViewerRuntime` is additive (another subclass); no rework of P1–P3. |
| Impact on design | `§7 What stays on the canvas` in the [runtime doc](./runtime-integration.md#7-what-stays-on-the-canvas) |

### D2 — Procedural widgets (`Chart`, `QRCode`, `Colorwheel`, `Lottie`, `Canvas`)

| | Context |
|---|---|
| Problem | These draw through LVGL callbacks, not style properties, so a style dump cannot represent them |
| Options | **(a)** canvas island per widget inside the SVG tree. **(b)** hook LVGL 9's draw dispatch and emit primitives (deeper C work, exact). **(c)** exclude them from the SVG surface for now (they render on canvas in the pixel-preview only). |
| Recommendation | **(a)** for the first iteration, then reconsider **(b)** if T3 fidelity becomes a requirement. 31 of 40 widgets are T1 and unaffected. |
| If wrong | (a)→(b) is contained in the renderer + one new C hook; no change to the scene contract |
| Impact | [primitives doc §2.4](./primitives.md), [fidelity doc §4](./fidelity-harness.md#4-thresholds) |

### D3 — Text fidelity approach

| | Context |
|---|---|
| Options | **(a)** `<text>` with the same TTFs (`@font-face`) — fast, close. **(b)** glyph outlines as `<path>` — exact, heavier, needs glyph access. |
| Recommendation | **(a)** first; escalate **per font** only where the scorecard demands it (hybrid). Fonts are the single biggest source of pixel delta, so this should be measured before optimising. |
| If wrong | Escalation is per-font and additive (a glyph-outline emitter in the new `svg/` folder) |
| Impact | [rendering doc §6](./rendering.md#6-text) |

### D4 — How to switch the surface

| | Options |
|---|---|
| **(a) Flagged branch** (recommended) | one conditional at `features/page/page.tsx:930`, flag default OFF; per-user, A/B-able, readable |
| **(b) Config-only alias swap** | zero source edits, but global (no flag), and the choice is invisible in the diff |

Recommendation: **(a)** — the flagged branch is a single line and the flag makes rollback trivial.

## 2. Additive contract (the rule for this work)

**Will NOT be modified:**

- `project-editor/lvgl/page-runtime.ts` (subclassed, not edited)
- `project-editor/lvgl/Page.tsx` (kept as-is; the new component is separate)
- `project-editor/lvgl/widgets/**` (40 widget editors — no changes needed; parts/properties already declared)
- `project-editor/build/firmware-loader.ts`, `device-import.ts`, `device-rest-client.ts`
- `project-editor/project/ui/Wizard.tsx`, `home/**`, `EezStudioApp.tsx`
- `api/src/eez_studio/**` (Rust), the `.eez-project` schema
- `eez-studio-types` (typings are local to the new module)
- Docs navigation (`docStructure.ts`, `dispatch.rs`) unless asked

**New only:**

- `studio-wasm-libs/lvgl-runtime/common/src/studio_api.cpp` → **new functions appended** (no existing function
  edited; chosen over a new `.cpp` precisely because a new file would require editing the CMake source list)
- No artifact in this repo needs replacing for P1: the LVGL runtime is built externally and served from
  `eez-studio-wasm/wasm/lvgl/<ver>/`; nothing under `project-editor/flow/runtime/wasm/` is the LVGL artifact
- `project-editor/lvgl/svg/**` (new folder: flag, scene types, dump binding, sink, renderer, context proxy, runtime subclasses, component, diff harness, fixtures)

**Exactly one existing editor site:** `features/page/page.tsx:930` — flagged branch, default OFF.

**Guarantees**

1. With the flag OFF the editor behaves **byte-identically** to today.
2. **No deletions**: the canvas path, all runtime classes, all widget code and all docs remain.
3. **No format changes**: `.eez-project` is untouched, so projects stay interchangeable with the device tooling.
4. Other LVGL versions (8.4.0–9.4.0) are untouched and keep the canvas path.
5. If the WASM dump function is missing, the renderer disables itself and falls back — no crash.

## 3. What must not change (build integrity)

- `api/target/` — never edited, never copied into.
- Vite pinned to `2.9.18` via `overrides`; `vitest` nested on Vite 5.
- Alias order: `eez-studio-shared/util-electron` **before** `eez-studio-shared` (`quasar.config.js:97-106`).
- `src/boot/eez-polyfill.ts` must remain the first Quasar boot file.
- No `npm install` inside `src/lib/t3-eez-studio/**`.
- WASM changes only via `studio-wasm-libs` → `build-all.bat` → `api/build.rs`.

## 4. Sequencing & status

| Phase | Output | Gate |
|---|---|---|
| **P0** | [primitives inventory](./primitives.md) — measured | ✅ done |
| **Design** | this set (README + 9 documents) | ⏳ awaiting D1–D4 |
| **P1** | bridge functions + `scene-dump.ts` | dump correct for a fixture; no regression |
| **P2** | `scene.ts` + `svg-sink.ts` + `svg-renderer.ts` against `scene.json` fixtures | unit tests pass without WASM |
| **P3** | component + proxy context + subclass + flagged branch | flag OFF ⇒ identical |
| **P4** | selection/hit-testing/overlay | interaction parity checklist |
| **P5** | fidelity harness scorecard | T1 thresholds met |
| **P6** | default ON for 9.5 design mode | run mode + other versions unaffected |

## 5. Sign-off

| Item | Owner | Answer |
|---|---|---|
| D1 run mode | product/eng | ☐ (a) recommend · ☐ (b) |
| D2 T3 widgets | product/eng | ☐ (a) recommend · ☐ (b) · ☐ (c) |
| D3 text | eng | ☐ (a) recommend first · ☐ (b) |
| D4 touch point | eng | ☐ (a) recommend · ☐ (b) |
| Proceed to P1 | product/eng | ☐ |
