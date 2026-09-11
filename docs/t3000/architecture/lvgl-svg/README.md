# LVGL SVG Renderer — design set

**Scope:** Tstat11 / LVGL **9.5** editor — replace the design-time *canvas* rendering surface with *SVG*.
**Branch:** `feature/lvgl-svg-renderer`
**Status:** design complete and code-verified; **4 decisions pending** before P1 code.
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

## Next step

**P2 can start immediately** (hand-written `scene.json` fixtures, no WASM rebuild, unit-testable).
**P1** (the 3 C functions in `studio-wasm-libs` + 9.5 rebuild) follows independently.
