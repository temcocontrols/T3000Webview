# LVGL SVG Renderer

Architecture and reference documentation for the SVG rendering surface of the LVGL 9.5 page editor.

**Subject.** The design-time rendering surface of LVGL pages. `LVGLPage` renders the LVGL WASM
framebuffer into a `<canvas>`; the SVG surface renders the same LVGL object tree as DOM elements
(`<svg class="lvgl-svg">` + `<g data-ptr>…`) from a scene dump taken from the running LVGL instance.

**Out of scope.** The canvas surface is not removed; it remains the pixel-truth reference for the
fidelity harness, the renderer for run/flow mode, and the fallback for every LVGL version other than
9.5.

---

## Document index

| Document | Contents |
|---|---|
| [architecture](./architecture.md) | Entry paths, the single rendering choke point, module inventory, integration seams, constraints |
| [primitives](./primitives.md) | Measured inventory: 40 widgets, the LVGL 9 part set, `LV_STYLE_*` categorisation, T1–T3 tiers |
| [scene-contract](./scene-contract.md) | The dump payload: envelope, object, parts, field→bridge mapping, buffer protocol |
| [wasm-bridge](./wasm-bridge.md) | C functions, encoding rules, JS binding, build and propagation, performance budget |
| [rendering](./rendering.md) | `svg/` modules, DOM contract, draw order, property→SVG rules, text, images, update strategy |
| [runtime-integration](./runtime-integration.md) | Proxy-context seam, subclassing, lifecycle, repaint policy, failure modes |
| [editor-integration](./editor-integration.md) | Component contract, feature flag, the single pre-existing edit site, hit-testing, overlay, zoom/pan |
| [fidelity-harness](./fidelity-harness.md) | Canvas-as-oracle comparison, metrics, thresholds, scorecard, measured results |
| [invariants](./invariants.md) | Scope boundaries, the additive contract, build integrity rules, behaviour guarantees |

---

## Module map

```
studio-wasm-libs/lvgl-runtime/common/src/svg_scene_dump.cpp   C: lvglDumpScene / lvglCountObjects
studio-wasm-libs/build-lvgl-95.bat                            9.5-only build script

src/lib/t3-eez-studio/project-editor/lvgl/svg/
    scene.ts                 Scene types + parseScene / walkScene / alphaOf / zoomOf / degreesOf
    svg-renderer.ts          pure Scene -> draw tree (style-over-parts, not per-widget)
    svg-sink.ts              owns <svg>, #defs, #content, #overlay; patching, notice, selection group
    scene-dump.ts            lvglDumpScene binding, wire->Scene mapping, widget-model merge
    svg-context.ts           createSvgContext(): the proxy 2D context (frame hook, optional mirror)
    page-runtime-svg.ts      runtime subclasses + SvgPaintPipeline
    paint-policy.ts          pure: when to dump the scene, when to touch the DOM
    hit-test.ts              pure: pointer target -> object; click -> selection intent
    overlay.ts               pure: selection frame + handle draw tree
    feature-flag.ts          surface switch + development switches (svg / svgDiff / svgStats)
    runtime-artifacts.ts     artifact URLs, byte-level inspection, cache refresh
    runtime-cache-guard.ts   per-tab cache key for the runtime artifacts
    svg-diff.ts              pure fidelity metrics (pixel diff, ink mask, box overhang, verdicts, scorecard)
    svg-diff-harness.ts      browser capture of both surfaces + scorecard rows
    LVGLSvgPage.tsx          React host for the surface
    index.ts                 barrel
```

Tests: `test/vitest/__tests__/lvgl-svg-*.test.ts` cover the pure modules; `lvgl-svg-captured.test.ts`
replays a real dump frozen by `scripts/lvgl-svg-dump-smoke.mjs` (`test/vitest/fixtures/lvgl-svg/`).

---

## Data flow (one frame)

```
LVGL object tree (WASM)
   │  lvglDumpScene(root, out, outLen)            C, bounds-checked JSON
   ▼
wire JSON ──► parseSceneDump() ──► Scene          scene-dump.ts
                 │  + widget-model merge (text string, image source)
                 ▼
          renderScene(scene) -> { roots, defs }    svg-renderer.ts      (pure)
                 ▼
          SvgSink.update()                         svg-sink.ts          (keyed DOM patching)
                 ▼
          <svg class="lvgl-svg">  #defs | #content | #overlay
```

Frame trigger: the base runtime blits the LVGL framebuffer through `ctx`; the proxy context converts
that call into a paint callback. Repaint timing is specified in
[runtime-integration](./runtime-integration.md); the DOM contract is in
[rendering](./rendering.md).

---

## Invariants

1. **The surface is rendered from LVGL's resolved state.** Layout, colours, fonts and part geometry come
   from the scene dump; nothing is re-derived in TypeScript.
2. **Only the frame output is replaced.** The base runtime classes still boot WASM, build the widget tree
   and run their own loops; the SVG runtimes subclass them and are used by the existing `instanceof`
   checks.
3. **A missing, stale or malformed scene dump never crashes the editor.** The surface reports the cause,
   keeps the last painted scene, and the canvas path stays available. Nothing outside the SVG surface
   depends on the dump.
4. **Text strings and image sources come from the widget model; everything else comes from LVGL.**
5. **The surface switch is reversible at runtime** and is only consulted after the LVGL version gate.
6. **`renderScene` is pure data.** No DOM access, no WASM calls, no observable reads — which is what
   allows the renderer to be tested without a browser.
7. **The SVG nodes are the only place LVGL objects have DOM presence**, which is what makes DOM-based
   hit-testing, selection overlay and the fidelity harness possible.
