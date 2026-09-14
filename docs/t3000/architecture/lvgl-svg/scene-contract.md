# LVGL SVG Renderer — Scene Contract

The exact data the WASM bridge hands to the SVG renderer, so the C side, the TypeScript renderer and the
fixtures agree on one definition.

Part of the [document set](./README.md).

---

## 1. Purpose

Define the exact data the WASM bridge hands to the SVG renderer, so the C side, the TS renderer and the
fidelity harness can be built independently and verified against a hand-written fixture
(`scene.json`) before any WASM rebuild.

## 2. Envelope

```ts
type Scene = {
  sceneVersion: 1;          // bump on breaking change; renderer refuses unknown majors
  width: number;            // page width  (LVGL display px)
  height: number;           // page height (LVGL display px)
  bgColor?: string;         // page/screen background, resolved
  rootPtr: number;          // lv_obj_t* of the screen object
  objects: SceneObject[];   // FLAT, parents before children, ascending index
};
```

Rules:

- **Flat, ordered.** Parents always precede their children; renderer nests via `parentPtr`.
- **Page-local coordinates**, pixels, integers, y-down, origin top-left (LVGL space). No transform applied.
- **No style inheritance in the payload** — every value is already **resolved** by LVGL for the object's
  current state/part (LVGL does theme + state resolution before painting).
- **Omit defaults.** Absent field = LVGL default/zero. Keeps payload small.
- **JSON, UTF-8**, no trailing NUL required. Text strings are JSON-escaped.

## 3. Object

```ts
type SceneObject = {
  ptr: number;              // lv_obj_t*  — identity + SVG node key
  parentPtr?: number;       // absent for the root screen (the wire sends 0)
  index: number;            // sibling z-order within the parent (lv_obj_get_index),
                            // NOT an app-level creation index
  name?: string;            // lvgl object name when set
  objId?: string;           // project widget objID  → emitted as data-objid
  type: string;             // sub_type: label|button|slider|... (declared in widgets/*.tsx)
  hidden?: boolean;
  opacity?: number;         // 0..1, already converted. ABSENT means LVGL's default for opacity,
                            // which is LV_OPA_COVER (1) — NOT 0. An explicit 0 is transparent.
                            // Renderers must use alphaOf(); treating absence as 0 erases every
                            // shape that simply did not set BG_OPA.

  area: { x: number; y: number; w: number; h: number };   // lv_obj_get_coords()
  radius?: number | { tl: number; tr: number; br: number; bl: number };
  clip?: { x: number; y: number; w: number; h: number; radius?: number };  // see §4 — from the
                            // dump's content box when the object is scrollable, else the model's
  transform?: { angle?: number; zoom?: number; pivotX?: number; pivotY?: number;
                scaleX?: number; scaleY?: number; skewX?: number; skewY?: number };
  scroll?: { x: number; y: number };

  parts: ScenePart[];       // one entry per rendered LVGL part (MAIN, INDICATOR, KNOB, ITEMS, ...)
};

type ScenePart = {
  // LVGL 9 part set (LVGL_PARTS_9). NOTE: TICKS exists only in LVGL_PARTS_8 — never emit it for 9.5;
  // v9 scale/ticks arrive as ITEMS (minor) and INDICATOR (major). See primitives §1.
  part: 'MAIN'|'SCROLLBAR'|'INDICATOR'|'KNOB'|'SELECTED'|'ITEMS'|'CURSOR'|'TEXTAREA_PLACEHOLDER';
  state: 'default'|'pressed'|'checked'|'focused'|'disabled'|'edited';
  area?: { x: number; y: number; w: number; h: number };  // when the part differs from the object
                            // (a scrollbar strip) — see §4; parts whose geometry LVGL computes at
                            // draw time are not emitted at all rather than drawn as the whole box
                            // (e.g. a scrollbar strip) — see §4
  bg?: { color?: string; opacity?: number;
         grad?: { color: string; stop: number; dir: string; opacity?: number } };
  bgImage?: { srcId: string; opacity?: number; recolor?: string; recolorOpacity?: number; tiled?: boolean };
  border?: { color?: string; opacity?: number; width?: number; side?: string; post?: boolean };
  outline?: { color?: string; opacity?: number; width?: number; pad?: number };
  shadow?: { color?: string; opacity?: number; width?: number; spread?: number; ofsX?: number; ofsY?: number };
  text?: { str: string; fontId: string; size: number; color?: string; opacity?: number;
           align?: string; letterSpace?: number; lineSpace?: number; decor?: string; overflow?: string };
  line?: { points: number[]; width?: number; color?: string; opacity?: number;
           dashWidth?: number; dashGap?: number; rounded?: boolean };
  arc?: { start: number; end: number; width?: number; color?: string; opacity?: number;
          rounded?: boolean; bgColor?: string; bgOpacity?: number };  // 0.1° units, LVGL  img?: { srcId: string; opacity?: number; recolor?: string; recolorOpacity?: number;
          rotation?: number; zoom?: number; pivotX?: number; pivotY?: number;
          // geometry from LVGL (the model cannot know the decoded bitmap size). Both are absent
          // together when LVGL reports no size (e.g. a LV_SYMBOL_* source is a font glyph).
          naturalWidth?: number; naturalHeight?: number;
          align?: string };   // LV_IMAGE_ALIGN_* name — CENTER, TOP_LEFT, TOP_MID, TOP_RIGHT,
                              // BOTTOM_LEFT, BOTTOM_MID, BOTTOM_RIGHT, LEFT_MID, RIGHT_MID,
                              // STRETCH, TILE, CONTAIN (see imageAlignName())
  blendMode?: string;
  colorFilter?: { color: string; opacity: number };
};
```

## 4. Field → source (all existing bridge exports)

| Scene field | Bridge call | Notes |
|---|---|---|
| `area` | `lv_obj_get_coords` | no new style code |
| `clip` | `lv_obj_get_content_coords`, gated on `LV_OBJ_FLAG_SCROLLABLE` | emitted as `"clip":{x,y,w,h}`. This is the box LVGL clips children to — without it a scrolled container's children spill. `radius` is taken from MAIN so a rounded container clips rounded. The widget model may supply a clip when the dump has none; the dump wins when both exist |
| `bg.color`, `border.color`, `outline.color`, `shadow.color`, `text.color`, `line.color`, `arc.color` | `lvglObjGetStylePropColor(obj, part, state, prop)` | **already exported** |
| widths / radii / opacity / spacing / offsets | `lvglObjGetStylePropNum(obj, part, state, prop)` | **already exported** |
| `text.fontId`, `size` | `lvglObjGetStylePropBuiltInFont` / `...FontAddr` | **already exported** |
| `img.srcId`, `bgImage.srcId` | **widget model, not the dump** — `LVGLImageWidget.image` / `LVGLImgbuttonWidget.imageReleased` hold an *asset name*, resolved to the bitmap's data URI through `project._assets.maps.name.getAllObjectsOfType("bitmaps")` (the same map `preloadImages()` uses) | no C work. The dump never emits image sources, so a missing merge silently produces **no `<image>` at all** — that was a real bug, not a fidelity gap |
| `text.str` | `lv_label_get_text` / span text | new reader, same file |
| `img.naturalWidth`, `img.naturalHeight` | `lv_image_get_src_width` / `lv_image_get_src_height` | emitted as `imgW`/`imgH`, only when both > 0 |
| `img.align` | `lv_image_get_align` | emitted as `imgAlign`, the raw `LV_IMAGE_ALIGN_*` value; `imageAlignName()` maps it, because the enum order is not alphabetical and `10` has no public name |
| `arc.start/end` | `lv_arc_get_angle_start` / `lv_arc_get_angle_end` for `lv_arc_class`; a full-circle default otherwise | `start` may legitimately be 0, so the angles are emitted even when zero |
| part `area` | `lv_obj_get_scrollbar_area` | emitted only for parts that do not fill the object's box. A part's geometry is otherwise assumed to be the object's box, so a part without an area must not be emitted unless it really fills it |
| `SCROLLBAR`, arc `KNOB` | deliberately not emitted | LVGL decides their geometry at draw time (scrollbar mode and content size; the arc's rotation, mode and knob offset). A part that cannot be placed would be painted as the whole box, which is visible as a phantom shape — see [wasm bridge §3](./wasm-bridge.md#3-encoding-decisions) |
| `objId`, `index` | TS side knows objID (`widgets/Base.tsx:1524 lvglCreate`); `index` from the dump order | no C work |
| `name` | `getLvglObjectNameFromIndex` is `static const char *` (`flow.cpp:618`) — **not** exported and not visible from `studio_api.cpp`. Reach it via the Flow hooks (`flow.cpp:707`, `:748`) or add a small reader | optional; `objId` is the identity the editor needs |

**Colour format — two layers, do not conflate them:**

| Layer | Format | Where |
|---|---|---|
| WASM wire | raw `uint32` from `lvglObjGetStylePropColor` | `lvglDumpScene` → `scene-dump.ts` |
| Scene | `#rrggbb` string | everything the renderer sees |

`scene-dump.ts` performs the conversion once, reusing the existing TS helpers (`lvgl/page-runtime.ts`
`parseColor` :613, `getColorNum` :629, `getThemedColorInProject` :576), so LVGL's byte order and theme
resolution stay defined in one place and the renderer never has to know about them.

## 5. Buffer protocol

```c
// returns bytes written (>= 0), or -(required size) when outLen is too small
EM_PORT_API(int32_t) lvglDumpScene(lv_obj_t *root, char *out, int32_t outLen);
```

- Caller owns the buffer; the dump performs **no allocation** and no heap churn.
- Renderer keeps one scratch buffer, grows on `-(required)` and retries once.
- Dump is **read-only** with respect to LVGL state.

## 6. Robustness

| Case | Behaviour |
|---|---|
| Buffer too small | return `-(required)`; caller grows and retries once, then gives up for that frame |
| Unknown widget type | `type` still emitted; renderer falls back to `MAIN` rect + text if present |
| Unmappable property | field omitted; renderer draws without it (never throws) |
| Dump error | negative return → renderer keeps the previous scene, logs once, does not break the rAF loop |
| Unknown `sceneVersion` | renderer logs and falls back to the canvas path |

## 7. Fixtures (hand-written, no WASM needed)

`scene.json` fixtures mirror §3 exactly so `svg-renderer.ts` can be developed and unit-tested before the
C bridge exists: `text.json`, `boxes.json`, `indicators.json`, `media.json`, `dashboard.json`.
They double as the input for the fidelity harness harness review
([fidelity doc](./fidelity-harness.md)).
