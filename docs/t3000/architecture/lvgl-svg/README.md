# LVGL SVG Renderer — design set

**Scope:** Tstat11 / LVGL **9.5** editor — replace the design-time *canvas* rendering surface with *SVG*.
**Branch:** `feature/lvgl-svg-renderer`
**Status:** **P1, P2 and P3 are built.** The renderer, the WASM scene dump, the proxy context, the runtime
subclasses and the flag-gated component all exist; 94 unit tests plus an 18-check WASM smoke test pass. The
only edit to a pre-existing source file is the single flagged branch in `features/page/page.tsx`. Flag default
is **OFF**, so the canvas path is what runs unless it is switched on.

Remaining: **P4** (selection/hit-testing), **P5** (fidelity scorecard), **P6** (default on for 9.5).
D1–D4 are still formally open but the working defaults (D1a, D2a, D3a, D4a) are what is implemented.
**Non-goal:** removing canvas from the product — it stays as the pixel-truth preview and run/flow renderer.

> **Hard rule: additive only.**
> New files, new functions, new classes. No deletions, no refactors. The single existing editor site that
> would change is `features/page/page.tsx:930` (one flag-gated branch, default **OFF** → byte-identical
> behaviour). See [decisions §2](./decisions.md) for the full contract.

---

## Index

| Doc | Contents |
|---|---|
| [plan](./plan.md) | verified create/import flows, the single canvas choke point, architecture, phases P0–P6, risks, guardrails |
| [primitives](./primitives.md) | **measured** P0 — 40 widgets, the LVGL-9 part set (+`ANY`), all 115 `LV_STYLE_*` constants categorised, T1–T3 tiers |
| [scene-contract](./scene-contract.md) | the dump payload: envelope, object, parts, field→bridge mapping, buffer protocol, fixtures |
| [wasm-bridge](./wasm-bridge.md) | new C functions, encoding decisions, JS binding, build, perf budget, P1 checklist |
| [rendering](./rendering.md) | `svg/` modules, DOM contract, draw order, property→SVG rules, text, images, update strategy |
| [runtime-integration](./runtime-integration.md) | the proxy-context seam, subclassing, lifecycle, dirty tracking, what stays on canvas |
| [editor-integration](./editor-integration.md) | component contract, flag, the one touch point, selection/hit-testing, overlay, zoom/pan |
| [fidelity-harness](./fidelity-harness.md) | canvas-as-oracle comparison, metrics, thresholds, scorecard, fixtures, invocation |
| [decisions](./decisions.md) | D1–D4, additive contract, build integrity, sequencing, sign-off |

## Read in this order

1. [plan](./plan.md) — why the work is small (one choke point) and what happens when.
2. [primitives](./primitives.md) — the measured surface area (the renderer is style-over-parts, not per-widget).
3. [decisions](./decisions.md) — answer D1–D4 to unblock.
4. [wasm-bridge](./wasm-bridge.md) + [rendering](./rendering.md) — the two build streams (P1 and P2).

## Key verified facts

- The **page editor runtime's** entire canvas use is 3 calls (`fillStyle`+`fillRect`, `putImageData`,
  `clearRect`), so a **proxy 2-D context** hooks the frame with **zero** method overrides and **zero** edits to
  `page-runtime.ts`.
- New WASM functions **auto-export** (`EM_PORT_API` = `EMSCRIPTEN_KEEPALIVE`), so no export-list edit.
- **No artifact in this repo** needs replacing for P1 — the LVGL runtime is built externally and served from
  `eez-studio-wasm/wasm/lvgl/<ver>/`.
- 31 of 40 widgets are pure style→SVG (T1); 5 are procedural (T3) and are decision D2.
- Design mode has **two** canvas surfaces: the page surface (`features/page/page.tsx:930` — the SVG target)
  and the **styles-editor preview** (`LVGLStylesEditorRuntime`, `page-runtime.ts:1777`) which stays on canvas
  (see [runtime integration §1](./runtime-integration.md#1-the-seam-verified)).

## Status

P0 (inventory) → P1 (bridge) → P2 (renderer) → P3 (integration) are **built and verified**, plus the first
fidelity pass (object clipping + image natural size/alignment) and a hardening pass for the stale-cached-WASM
failure that could leave the surface blank. Verified live against a real 13-page device project imported from
a T3-LB controller: text, images at their true size and scrolled containers all draw.
P4 (selection/hit-testing), P5 (fidelity scorecard) and P6 (default ON for 9.5 design mode) are outstanding —
see [decisions §4](./decisions.md#4-sequencing--status).

## Next step

**P4** — selection / hit-testing / overlay, so the SVG surface is editable, not just readable. The scene
already labels every group with `data-ptr` / `data-objid` / `data-type`, which is what the overlay needs.
