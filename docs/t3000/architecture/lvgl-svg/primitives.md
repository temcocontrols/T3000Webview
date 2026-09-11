# LVGL 9.5 — SVG Renderer: measured primitive inventory (P0)

Companion to [plan.md](./plan.md).
**Measured, not estimated** — extracted from `project-editor/lvgl/**` on 2026-09-11.

- Widgets scanned: `src/lib/t3-eez-studio/project-editor/lvgl/widgets/*.tsx` — **41 files = 40 widgets + `Base.tsx`**
  (`Base.tsx:560` = the `LVGLWidget` base class). Registry count: `registerClass()` ×**40** in `widgets/index.ts`
- Style surface: `project-editor/lvgl/lvgl-constants.ts` → **115 distinct `LV_STYLE_*` constants**
- Property declarations: `project-editor/lvgl/style-catalog.tsx` → **114** declared properties; the single constant
  with no declared property is `LV_STYLE_OPA_LAYERED`
- Part vocabulary: `LVGL_PARTS_9` (`lvgl-constants.ts`) — the **v9** set. `LVGL_PARTS_8` differs (see §1)
- Nothing here changes existing code; this is the specification the new `svg/` folder must satisfy.

---

## 1. Widget × parts (measured)

Parts are the draw layers LVGL renders per object. Each part carries its own slice of the 115 style
properties, so the renderer emits **one SVG group per part**, not one element per widget.

| Widget | Parts | Widget | Parts |
|---|---|---|---|
| `Arc` | MAIN, INDICATOR, KNOB | `Menu` | MAIN |
| `Bar` | MAIN, INDICATOR | `MessageBox` | MAIN |
| `Button` | MAIN | `Meter` | MAIN, INDICATOR, ITEMS (+`TICKS` declared — v8-only, see note) |
| `ButtonMatrix` | MAIN, ITEMS | `Panel` | MAIN, SCROLLBAR |
| `Calendar` | MAIN, ITEMS | `QRCode` | MAIN |
| `Canvas` | MAIN | `Roller` | MAIN, SELECTED |
| `Chart` | MAIN, ITEMS, INDICATOR | `Scale` | MAIN, ITEMS, INDICATOR |
| `Checkbox` | MAIN, INDICATOR | `Screen` | MAIN, SCROLLBAR |
| `Colorwheel` | MAIN, KNOB | `Slider` | MAIN, INDICATOR, KNOB |
| `Dropdown` | MAIN, SELECTED | `Span` | MAIN |
| `Image` | MAIN | `Spinbox` | MAIN, SELECTED, CURSOR |
| `Imgbutton` | MAIN | `Spinner` | MAIN, INDICATOR |
| `Keyboard` | MAIN, ITEMS | `Switch` | MAIN, INDICATOR, KNOB |
| `Label` | MAIN | `Tab` | MAIN |
| `Led` | MAIN | `Table` | MAIN, ITEMS, SCROLLBAR |
| `Line` | MAIN | `Tabview` | MAIN |
| `List` | MAIN, SCROLLBAR | `TileView` | MAIN |
| `Lottie` | MAIN | `UserWidget` | MAIN, SCROLLBAR |
| `AnimationImage` | MAIN | `Window` | MAIN |
| `Container` | **dynamic** — `Container.tsx:114` `parts: (widget) => Object.keys(getLvglParts(widget))` (`getLvglParts` = `lvgl-versions.ts:877` → `LVGL_PARTS_9`) | `Textarea` | MAIN, SELECTED, CURSOR, SCROLLBAR, TEXTAREA_PLACEHOLDER |

**Distinct parts to render (LVGL 9):** `MAIN`, `SCROLLBAR`, `INDICATOR`, `KNOB`, `SELECTED`, `ITEMS`,
`CURSOR`, `TEXTAREA_PLACEHOLDER` (8) — plus `ANY` (`0x0f0000`), a query value that targets all parts and is
never itself a draw layer. Plus per-cell sub-parts for `ButtonMatrix`/`Table`/`Keyboard`/`Calendar`/`Scale`
(ITEMS layer).

> **`TICKS` is not an LVGL 9 part.** `LVGL_PARTS_8` defines `TICKS: 0x060000`, but `LVGL_PARTS_9` drops it and
> shifts `CURSOR` down to `0x060000`. `Meter.tsx:1302` still declares
> `parts: ["MAIN", "TICKS", "INDICATOR", "ITEMS"]` — a v8-era list, stale for 9.5 — whereas the v9 `Scale`
> widget correctly renders **minor ticks on `ITEMS`** and **major ticks on `INDICATOR`** (`Scale.tsx:82-88`,
> applied at `:1644` and `:1724`). The renderer must take its part vocabulary from LVGL 9 itself (or from the
> dump), **never** from the `parts:` declarations.

---

## 2. The 115 style properties → SVG strategy

### 2.1 Direct SVG mapping (~45) — the renderer's core

| LVGL property | SVG |
|---|---|
| `BG_COLOR`, `BG_OPA`, `BG_MAIN_OPA`, `BG_MAIN_STOP` | `fill`, `fill-opacity` |
| `BG_GRAD`, `BG_GRAD_COLOR`, `BG_GRAD_DIR`, `BG_GRAD_OPA`, `BG_GRAD_STOP` | `<linearGradient>` / `<radialGradient>` |
| `RADIUS`, `CLIP_CORNER` | `rx`/`ry`, `clipPath` |
| `BORDER_COLOR`, `BORDER_OPA`, `BORDER_WIDTH`, `BORDER_SIDE`, `BORDER_POST` | `stroke`, `stroke-opacity`, `stroke-width` (inside-edge path; `BORDER_SIDE` selects edges) |
| `OUTLINE_COLOR`, `OUTLINE_OPA`, `OUTLINE_WIDTH`, `OUTLINE_PAD` | second stroke, offset by `OUTLINE_PAD` |
| `SHADOW_COLOR`, `SHADOW_OPA`, `SHADOW_WIDTH`, `SHADOW_SPREAD`, `SHADOW_OFS_X`, `SHADOW_OFS_Y` | `<filter>` (or duplicated offset shape) |
| `OPA`, `OPA_LAYERED` | `opacity` (`OPA_LAYERED` is a valid LVGL style but has **no** declared property in `style-catalog.tsx` — render it only if the dump emits it) |
| `TEXT_COLOR`, `TEXT_OPA`, `TEXT_FONT`, `TEXT_ALIGN`, `TEXT_LETTER_SPACE`, `TEXT_LINE_SPACE` | `<text>` + attrs / letter-spacing |
| `LINE_COLOR`, `LINE_OPA`, `LINE_WIDTH`, `LINE_DASH_GAP`, `LINE_DASH_WIDTH`, `LINE_ROUNDED` | `stroke`, `stroke-width`, `stroke-dasharray`, `stroke-linecap` |
| `ARC_COLOR`, `ARC_OPA`, `ARC_WIDTH`, `ARC_ROUNDED` | arc `<path>` stroke + round caps |
| `IMG_OPA`, `IMG_RECOLOR`, `IMG_RECOLOR_OPA` | `<image>` `opacity` + recolor `<filter>` |
| `TRANSFORM_ANGLE`, `TRANSFORM_ROTATION`, `TRANSFORM_ZOOM`, `TRANSFORM_SCALE_X/Y`, `TRANSFORM_SKEW_X/Y`, `TRANSFORM_PIVOT_X/Y`, `TRANSFORM_WIDTH/HEIGHT` | `<g transform>` + transform-origin |
| `TRANSLATE_X`, `TRANSLATE_Y` | `<g transform="translate()">` |

### 2.2 Layout-only — no SVG mapping needed (~35)

LVGL computes these before painting; the renderer consumes the **resulting coordinates** from the scene dump.

`WIDTH`, `HEIGHT`, `MIN_WIDTH`, `MAX_WIDTH`, `MIN_HEIGHT`, `MAX_HEIGHT`, `X`, `Y`, `LENGTH`, `ALIGN`,
`LAYOUT`, `BASE_DIR`, `RADIAL_OFFSET`, `PAD_RADIAL`,
`FLEX_FLOW`, `FLEX_GROW`, `FLEX_MAIN_PLACE`, `FLEX_CROSS_PLACE`, `FLEX_TRACK_PLACE`,
`GRID_COLUMN_DSC_ARRAY`, `GRID_ROW_DSC_ARRAY`, `GRID_COLUMN_ALIGN`, `GRID_ROW_ALIGN`,
`GRID_CELL_COLUMN_POS`, `GRID_CELL_COLUMN_SPAN`, `GRID_CELL_ROW_POS`, `GRID_CELL_ROW_SPAN`,
`GRID_CELL_X_ALIGN`, `GRID_CELL_Y_ALIGN`,
`PAD_TOP`, `PAD_BOTTOM`, `PAD_LEFT`, `PAD_RIGHT`, `PAD_ROW`, `PAD_COLUMN`,
`MARGIN_TOP`, `MARGIN_BOTTOM`, `MARGIN_LEFT`, `MARGIN_RIGHT`

### 2.3 Behaviour — not a static render concern (5)

`ANIM`, `ANIM_DURATION`, `ANIM_SPEED`, `ANIM_TIME`, `TRANSITION`
→ design mode ignores them; run/animation uses a throttled re-dump (plan §6).

### 2.4 Approximate or requires a decision (7)

| Property / widget | Issue | Option |
|---|---|---|
| `BG_IMG_SRC`, `BG_IMG_TILED`, `BG_IMG_RECOLOR(_OPA)` | image as background, tiling | `<pattern>` fill; approximate tiling |
| `BLEND_MODE` | non-normal blend modes | CSS `mix-blend-mode` (partial parity) |
| `COLOR_FILTER_DSC`, `COLOR_FILTER_OPA` | LVGL colour filters | `<filter>` approximation |
| `BG_DITHER_MODE` | dithering | ignore (no visual intent) |
| `TEXT_DECOR` | underline/strikethrough | `text-decoration` or explicit `<line>` |
| `ARC_IMG_SRC` | image masked to an arc | `<image>` + arc `clipPath` |
| `Canvas` widget | arbitrary draw callbacks | canvas island or draw-layer dump |

---

## 3. Per-widget difficulty (from §1 + §2)

| Tier | Widgets | Notes |
|---|---|---|
| **T1 — primitives** | `Label`, `Span`, `Panel`, `Container`, `Screen`, `Window`, `MessageBox`, `Menu`, `List`, `Button`, `Imgbutton`, `Image`, `Led`, `Line`, `Checkbox`, `Switch`, `Slider`, `Bar`, `Arc`, `Dropdown`, `Roller`, `Textarea`, `Spinbox`, `Tab`, `Tabview`, `Table`, `TileView`, `Keyboard`, `ButtonMatrix`, `Calendar`, `UserWidget` | rect/path/text/image + parts — the bulk of the work is style→SVG fidelity |
| **T2 — layered/animated** | `Spinner`, `AnimationImage`, `Scale`, `Meter` | parts + animation frames; `AnimationImage` needs frame stepping |
| **T3 — procedural** | `Chart`, `QRCode`, `Colorwheel`, `Lottie`, `Canvas` | drawn by callbacks → canvas island or draw-layer hook |

**P0 conclusion:** 31 of 40 widgets are T1 (pure style→SVG). T3 is 5 widgets and is the §7 decision in the plan.

---

## 4. Fixtures and the fidelity gate (P5 input)

Fixture pages to add (new files, dev-only), chosen to cover the tiers:

1. **Text** — labels with several fonts, sizes, letter/line spacing, overflow.
2. **Boxes** — panels with radius, border sides, outline, shadow, gradient.
3. **Indicators** — slider/switch/checkbox/bar/arc across default/pressed/checked states.
4. **Media** — images at scale/rotation/recolour, plus one animated image.
5. **Dashboard** — mixed page with 20+ objects and nesting (real-world stress).

Diff method (new code, `svg/svg-diff.ts`): render the same page twice — canvas (existing runtime) and SVG
(new) — rasterise the SVG, compare per-pixel + per-object bounding boxes, and print a per-widget scorecard.
Gate: T1 widgets must match; T2/T3 documented deltas.

---

## 5. What this changes in the plan

- The SVG renderer is a **style-property renderer over parts**, not a per-widget renderer:
  8 parts × the property groups in §2.1 is the whole drawing model.
- `widgets/*.tsx` needs **no changes** — the parts/properties metadata already exists there and in
  `style-catalog.tsx`; the dump surfaces the resolved values.
- 31/40 widgets are T1, so P2 can land a useful surface before the T3 decision is settled.
