# LVGL SVG Renderer — Rendering Design

Part of the [design set](./README.md). Status: **design, no code yet**.
Additive-only: all of this lives in the **new** `project-editor/lvgl/svg/` folder.

---

## 1. Modules

| Module | Responsibility |
|---|---|
| `scene.ts` | Types for the dumped scene (mirrors the [scene contract](./scene-contract.md)) |
| `scene-dump.ts` | WASM binding + scratch buffer (see [wasm bridge](./wasm-bridge.md)) |
| `svg-sink.ts` | Owns the `<svg>` root, `<defs>` registry, node pool, patching and teardown |
| `svg-renderer.ts` | Scene → SVG elements: the style-property/part renderer |
| `svg-diff.ts` | Dev-only fidelity harness (see [fidelity doc](./fidelity-harness.md)) |

**Renderer model:** *style properties over parts*, not per-widget code. The 8 LVGL-9 parts
(`MAIN`, `SCROLLBAR`, `INDICATOR`, `KNOB`, `SELECTED`, `ITEMS`, `CURSOR`, `TEXTAREA_PLACEHOLDER`) and the ~45
directly-mappable properties in the [primitives doc](./primitives.md) are the whole
drawing surface. Unknown widget types still render from their parts.

## 2. Data flow (one frame)

```
sink.update(scene)
  ├─ reconcile object list by `ptr` (add / update / remove)
  ├─ for each object → <g data-ptr data-objid data-type>
  │     ├─ per ScenePart (z-order as dumped) → primitives
  │     └─ children appended into their parent's <g>
  ├─ defs: get-or-create clipPath / filter / gradient by deterministic id
  └─ write back attribute deltas only (no full rebuild)
overlay group (selection handles, marquee, guides) is always last → on top
```

## 3. DOM contract

```html
<svg viewBox="0 0 W H" class="lvgl-svg">
  <defs>…clipPaths, filters, gradients, patterns (deterministic ids)…</defs>
  <g id="content">
    <g data-ptr="…" data-objid="…" data-type="panel">
      <g data-part="MAIN">  <rect/> <text/>  </g>
      <g data-part="INDICATOR">…</g>
    </g>
  </g>
  <g id="overlay">
    …editor affordances (P4)…
    <g id="notice"><text/>…</g>   <!-- only while a failure is being reported -->
  </g>
</svg>
```

(The implementation groups the defs as `<g id="defs">` rather than `<defs>`: a `clipPath`/gradient/filter is
never rendered directly, only referenced by id, so its container element does not matter — and using a plain
group keeps the imperative patcher in charge of children in both cases.)

- `data-ptr` — patch key (identity across frames).
- `data-objid` — project widget objID → selection/hit-testing maps straight back to the model.
- `data-part` — enables per-part debugging and the fidelity scorecard.
- `pointer-events`: only `MAIN` and `INDICATOR`/`KNOB` receive pointer events; decorative parts are inert.
- Deterministic def ids (hash of the parameter tuple) keep the DOM stable across frames, so `defs` is
  never rebuilt when nothing changed.
- `#notice` is the only overlay content emitted before P4: a short message shown when the surface cannot
  paint (see [runtime integration §7a](./runtime-integration.md#7a-failure-modes-why-the-surface-can-be-blank-and-what-it-does-about-it)).
  It lives in `#overlay` so a scene patch can never erase it, and `clearNotice()`/`teardown()` remove it.

## 4. Draw order

Per object, LVGL paints in this order; the renderer mirrors it (P2 verifies against the canvas):

1. `shadow`
2. `bg` (fill + gradient)
3. `bgImage`
4. `border`
5. `outline`
6. content: `text` and/or `img`/`line`/`arc`/`ITEMS`
7. widget-specific layers (`INDICATOR`, `KNOB`, `CURSOR`, `SELECTED`, `SCROLLBAR`, `ITEMS`,
   `TEXTAREA_PLACEHOLDER`) — `TICKS` is not an LVGL 9 part; v9 ticks are `ITEMS` (minor) / `INDICATOR` (major),
   see [primitives §1](./primitives.md)

Within a part: shape → text → image.

## 5. Property → SVG rules

| LVGL | SVG | Notes |
|---|---|---|
| `BG_COLOR` + `BG_OPA` | `fill`, `fill-opacity` | final alpha = `opa/255 × bg_opa/255` |
| `BG_GRAD*` | `<linearGradient>` / `<radialGradient>` | direction enum → `x1/y1/x2/y2`; `BG_GRAD_STOP` → gradient stop |
| `BG_IMG_SRC` (+`TILED`, `RECOLOR`, `OPA`) | `<pattern>` or `<image>` scaled to area | tiling approximate (documented T-approximation) |
| `RADIUS`, `CLIP_CORNER` | `rx`/`ry` = uniform; per-corner → `<path>` | LVGL radius is uniform + `CLIP_CORNER` for per-corner |
| `BORDER_COLOR/OPA/WIDTH/SIDE/POST` | stroked rect inset by `width/2`; `SIDE` bitmask → path per edge | LVGL borders are drawn **inside** the bounds |
| `OUTLINE_*` | second stroke, inset by `OUTLINE_PAD` | drawn after border |
| `SHADOW_*` | `<feDropShadow>` (`dx`,`dy`, `stdDeviation=width/2`) + spread via stroke | spread has no exact SVG analogue |
| `OPA`, `OPA_LAYERED` | group `opacity` | |
| `TRANSFORM_*` | `<g transform="translate(px,py) rotate(a) scale(k) translate(-px,-py)">` | pivot from `TRANSFORM_PIVOT_*` |
| `TRANSLATE_*` | same `<g>` transform list | |
| widget `scroll` | child group `translate(-x,-y)` + `clipPath` | |
| object `clip` | `clip-path` on the object `<g>` | source: dump `clip` (content box of a scrollable object) with the widget model as override; rounded when MAIN has a radius |
| `LINE_*` | `<polyline>`/`<path>` + `stroke-dasharray`, `stroke-linecap` | |
| `ARC_*` | `<path>` arc stroke; `ARC_ROUNDED` → `stroke-linecap:round` | angles in LVGL 0.1° units. **Implemented detail:** the LVGL point at θ is `(cx + r·cosθ, cy − r·sinθ)`, i.e. the SVG point at φ = −θ — so the *sweep magnitude* comes from the LVGL delta while `sweep-flag` is **0** (the negative SVG angle direction). Deriving either from SVG angles instead draws the long way round whenever `start` ≠ 0 |
| `IMG_*` | `<image>` sized by natural size × scale and placed by `IMG_ALIGN`; recolor via `<filter><feColorMatrix>` | see §7 — geometry from the dump, source from the model |
| `BLEND_MODE`, `COLOR_FILTER_*` | CSS `mix-blend-mode` / filter | **approximate** — tracked in the scorecard |

## 6. Text

1. **Font mapping.** LVGL built-ins (`lv_font_montserrat_*`) map to bundled web fonts of the same family;
   `size` comes from the scene. Project fonts (custom TTF) are registered as `@font-face` from the project's
   font data (same source the WASM side loads via `_lvglLoadFont`/`lvglCreateFreeTypeFont`).
2. **Layout.** `TEXT_ALIGN` → `text-anchor` + `x`; `long_mode` → single line / wrap / scroll (scroll is a
   transform + clip); `LETTER_SPACE`/`LINE_SPACE` → `letter-spacing` / `dy` per line.
3. **Overflow** → `clipPath` on the text group.
4. **Decor** (`TEXT_DECOR`) → `text-decoration` where supported, else an explicit `<line>`.
5. **Baseline.** LVGL positions text by ascent; the renderer computes per-line `y` from `size` + `ascent`
   using the same font metrics table (fallback constant if metrics are unavailable).

*Decision D3 (plan §7):* same-TTF `<text>` first (fast, close); per-glyph `<path>` outlines only if the
fidelity scorecard demands it for specific fonts.

## 7. Images

- Source: project bitmaps are already `data:image/png;base64,…` (import path keeps PNG) → straight into
  `<image href>`; no conversion layer needed.
- **Source and geometry come from different places.** The dump deliberately never emits pixels; the widget
  model holds the asset *name*, which the editor resolves to a data URI (`project._assets.maps.name` →
  `bitmaps` → `entry.object.image`). LVGL owns the *geometry* (`imgW`/`imgH`/`imgAlign`), because only the
  running LVGL knows the decoded bitmap size. `wireToScene` merges the two.
- **Placement** (`imagePlacement()`), in order of preference:

  | Dump state | Box emitted | `preserveAspectRatio` |
  |---|---|---|
  | `imgW`/`imgH` present, align not STRETCH/TILE | natural size × scale, positioned by align | `none` |
  | `imgW`/`imgH` present, align `STRETCH`/`TILE` | the widget box (scale ignored) | `none` |
  | no `imgW`/`imgH` (font symbol source, or older build) | the widget box | `xMidYMid meet` (legacy, never distorted) |

- **Alignment** maps `LV_IMAGE_ALIGN_*` → name with an explicit table (`imageAlignName()`), because the enum
  order is *not* alphabetical (`BOTTOM_*` precede `LEFT_MID`/`RIGHT_MID`) and `10` is an internal
  `AUTO_TRANSFORM` marker with no public name. The x and y axes are tested separately: `TOP_MID`/`BOTTOM_MID`
  centre only horizontally, `LEFT_MID`/`RIGHT_MID` centre only vertically.
- **No double scaling.** When the box is known, the scale lives in `width`/`height` and the transform is
  rotation-only; only the legacy unknown-size path keeps `scale()` about the pivot.
- **Overflow** → a `<g clip-path>` around the image when the placed box exceeds the widget (LVGL clips an
  image to its widget). Well-sized icons produce no clip def.
- `recolor` + opacity → `<feColorMatrix>` on the specific image (one filter per distinct recolor/opacity
  pair, cached in `defs`).
- Animated images / Lottie: **T3 decision** (canvas island or frame stepping) — out of P2.
- *Known gap:* a `LV_SYMBOL_*` source is a font glyph in LVGL, so `lv_image_get_src_width/height` reports 0
  and the natural path cannot apply. Those images fall back to filling the widget box.

## 8. Update strategy & performance

| Mode | Strategy |
|---|---|
| Design-time (idle) | re-dump + patch **on scene change only** (MobX reaction on the page model / widget props) |
| Design-time (editing drag) | patch on change; no per-frame dump |
| Animation / run mode | throttled re-dump (≤ 30 Hz) — see runtime-integration doc; run mode may stay canvas |

Rules: never rebuild `defs` unless a parameter changes; never recreate a node whose attributes are equal
(compare before write); batch attribute writes in one pass; no layout reads during patching.

Targets: ≤ 4 ms/doc change for a 30-object page; DOM node count ≈ 3–6 per part.

## 9. Dev-only modes

| Mode | Purpose |
|---|---|
| `?svgOutline=1` | stroke every part + show `data-ptr/objid` labels — visual debug |
| `?svgDiff=1` | run the fidelity harness against the canvas reference |
| `?svgStats=1` | log node count, patch count, dump ms per change |

## 10. Unit tests (no WASM needed)

`svg-renderer.ts` is pure: `scene → SVG`. Tests load the hand-written `scene.json` fixtures from the
[scene contract](./scene-contract.md) and assert
the produced structure (elements, attributes, defs) — runnable under the existing vitest setup, since no
browser/WASM is required.
