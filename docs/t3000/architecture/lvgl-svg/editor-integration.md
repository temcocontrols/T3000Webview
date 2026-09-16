# LVGL SVG Renderer — Editor Integration

The surface component, its feature flag, the single pre-existing edit site, and the editing behaviour the
surface provides (hit-testing, selection overlay, and the editor's gestures that work over it).

Part of the [document set](./README.md). One flagged branch exists in pre-existing code
([§3](#3-the-single-pre-existing-edit-site)); everything else is new files.

---

## 1. Component (`svg/LVGLSvgPage.tsx`)

Same contract as the existing `lvgl/Page.tsx` so it is a drop-in alternative. **It must have the same shape as
that component — a thinner one would silently lose behaviour:**

```ts
export const LVGLSvgPage = observer(
    class LVGLSvgPage extends React.Component<{ page: Page; flowContext: IFlowContext }> {
        static contextType = ProjectContext;   // required: decides editor vs non-active runtime
        declare context: React.ContextType<typeof ProjectContext>;
    }
);
```

| Requirement | Why (existing `lvgl/Page.tsx`) |
|---|---|
| `observer` + observable reads in `render()` | `:67-68` reads `settings.general.lvglVersion` / `darkTheme` every render — that is what makes the canvas react to those settings |
| `static contextType = ProjectContext` + `this.context.runtime` | `:31` picks `LVGLNonActivePageViewerRuntime` (non-active page of a running project) **vs** `LVGLPageEditorRuntime` |
| Both runtime constructor forms | editor `(page, ctx, flowContext)` `:35-38`; non-active `(page, width, height, ctx)` `:28-33` |

Behaviour, mirroring `LVGLPage` (`lvgl/Page.tsx:15-125`):

| Lifecycle | Action |
|---|---|
| `componentDidMount` | create `SvgSink(<svg ref>)`, `SceneDump(wasm)`, `LVGLSvgPageEditorRuntime(page, proxyCtx, flowContext)`, then `runtime.mount()` |
| `componentDidUpdate` | `unmount()` + re-create (identical to the existing component's behaviour, so page switches behave the same) |
| `componentWillUnmount` | `runtime.unmount()` (deferred like the existing one) + sink teardown |
| `render` | `<svg viewBox="0 0 {w} {h}" class="lvgl-svg">` with `<g id="content">` and `<g id="overlay">`; reapplies the canvas's display decorations as CSS on the `<svg>` — `imageRendering: pixelated` when `flowContext.viewState.transform.scale > 2`, and (only when `!(page && page.isUsedAsUserWidget)`) `border-radius` from `circularDisplay` / `displayBorderRadius`, a `1px solid` border coloured `#444`/`#eee` by theme, and `transform: translate(-1px,-1px)` (`lvgl/Page.tsx:82-124`) |

Display size comes from the runtime getters `displayWidth` / `displayHeight` (`page-runtime.ts:760, 768`) —
no new source of truth.

## 2. Feature flag (`svg/feature-flag.ts`)

```ts
export function isSvgRendererEnabled(projectStore?): boolean
```

Precedence (first match wins):

1. URL `?svg=1` / `?svg=0` — per-session override, read from the query whether it appears in
   `location.search` or inside the hash (`EezStudioApp.tsx:215-219` reads its own parameters the same way).
2. `localStorage["t3.lvgl.svgRenderer"]` = `"1"` / `"0"`.
3. Default: **enabled** for the supported LVGL version; the version gate is applied by the caller before the
   flag is consulted.

The flag is not a project-settings field: that would change the `.eez-project` schema, which is shared with
the device/firmware tooling. Keeping the choice out of the project file also allows one project to be opened
with or without the SVG surface.

## 3. Pre-existing edit sites

| Site | Change | With the flag off |
|---|---|---|
| `project-editor/features/page/page.tsx` — `<LVGLPage page={this} flowContext={flowContext} />` inside the `isLVGL` branch (`:923-931`) | the branch also checks the LVGL version and renders `<LVGLSvgPage …/>` instead | identical code path |
| `eez-studio-ui/_stylesheets/app.less` — a `@font-face` for `LVGL Symbols` next to Montserrat | the face LVGL's `LV_SYMBOL_*` glyphs are drawn from (`FontAwesome5-Solid+Brands+Regular.woff`, already in that folder). Without it a symbol was invisible — a calendar's month arrows, every icon-only button | unused |

This is unavoidable: `LVGLPage` is imported directly at `page.tsx:73`, and there is no registry
indirection for the page component — unlike the runtime, which *is* registered through
`project-editor-create.tsx:227`.

The alternative, a build-time Vite/barrel alias resolving `project-editor/lvgl/Page` to the new component,
needs no source edit but is global (no per-user override) and hides the choice from a reader of the branch.

## 4. Selection & hit-testing

- Every object group carries `data-ptr` and `data-objid` (see [rendering §3](./rendering.md#3-dom-contract)),
  so a DOM `pointerdown` maps directly to the project widget.
- Hit-testing uses the browser's own SVG hit-testing rather than manual geometry: the pointer event's
  target is walked up to the nearest annotated group (`hit-test.ts`), so no coordinate arithmetic and no
  LVGL round-trip is involved. When the DOM hit yields nothing usable — a widget part with no fill has no
  hit area of its own — the topmost *painted, widget-owned* scene object whose box contains the point is
  used instead, so clicking anywhere inside a widget selects it, as on the canvas path.
- Selection goes through the existing editor model. The integration points are
  `flow/editor/{context.tsx,flow-document.tsx,editor.tsx,bounding-rects.ts}`:
  `document.findObjectById(getId(widget))` produces the adapter and `viewState.selectObject` /
  `selectObjects` / `deselectAllObjects` apply it, so undo/redo, the property panel, the widgets tree and
  modifier handling behave exactly as they do elsewhere in the editor.
- The selected objects' rectangles are taken from the scene (`area`), which is also the coordinate space of
the `<svg>` viewBox — no projection through the viewport transform is needed.
- Because SVG nodes are real elements, per-object boxes can also be read back from the DOM
  (`getBBox()`), which is what the fidelity harness uses for its `boxOffsetPx` comparison — and what
  forced that comparison to be an *overhang* test ("ink outside the box"), since `getBBox()` reports the
  ink extent while the scene `area` is the layout box.
- **LVGL pointers are not stable across edits.** The editor tears the LVGL page down and builds it again
  whenever the model changes, so every pointer in the scene — `rootPtr` included — is new afterwards. The
  pointer → widget index is therefore rebuilt whenever the scene arrives with a new root, and re-tried
  while a rebuild keeps changing how much of the scene it maps (the runtime assigns `_lvglObj` as it
  creates widgets, so a rebuild can land mid-assignment). Nothing that maps a pointer to a widget can
  cache across an edit: measured, one trusted drag moved the screen pointer from `4552104` to `4557240`,
  and a resize left two of four objects unmapped until the retry (see §7).

## 5. Overlay (`<g id="overlay">`)

Drawn **after** `#content`, so it is always on top — and every node it draws is `pointer-events: none`, so
clicks reach the scene and the editor rather than this group:

| Affordance | Source | Interactive |
|---|---|---|
| Selection frame (halo under, outline over) per selected object | scene object `area` | no — inert |
| Hover preview (light outline) | scene object `area` | no — inert |
| Failure notice (`<g id="notice">`) | `SvgSink.showNotice()` — a short message shown when the surface cannot paint, and the only overlay content that exists independently of a selection (see [runtime integration §7a](./runtime-integration.md#7a-failure-modes-why-the-surface-can-be-blank-and-what-it-does-about-it)) | no — inert |

**What it deliberately does not draw: the interactive chrome.** The drag hotspot, the resize handles and the
rubber-band band belong to the flow editor — `EezStudio_FlowEditorSelection` (with `…_Draggable`,
`…_ResizeHandle` squares and `…_RubberBend`) plus one `EezStudio_ComponentEnclosure` per widget — which it
renders *above* this surface from the model's own rectangles, and whose `MouseHandler`s do the work. Measured
on a live page: 8 resize handles appear for a px-sized panel, and dragging one wrote the model exactly as it
does on the canvas path (§7). Drawing a second, inert set of handles here would have promised a resize that
could never happen, because the editor's overlay takes the pointer first.

This is the piece that later becomes the **shared overlay for the HVAC merge** — an SVG overlay works above
either substrate, which is exactly why the SVG direction was chosen.

## 6. Zoom / pan

Wrap `#content` in `<g transform="translate(tx,ty) scale(k)">` driven by the existing view transform
(`flowContext.viewState.transform`). Improvement over the canvas path: the existing component switches to
`imageRendering: "pixelated"` above 2× zoom (`lvgl/Page.tsx:88-92`) — SVG stays crisp at any zoom.

## 7. Interaction behaviour

Measured on a live page with **trusted** pointer input (`page.mouse`, i.e. real browser events) — the only
way these can be verified, because synthetic `PointerEvent`s do not reach React's handlers and their failed
`setPointerCapture` leaves a stuck drag overlay swallowing all input.

| Interaction | Verified result |
|---|---|
| Click select | a plain click selected the label under the pointer (`selected: ["65"]`, `selectedPtrs: [4552744]`) and framed it at the model rect the click point implies (`192,262 96×16`) |
| Multi-select | Ctrl+click added a second label: `selected: ["55","65"]`, and the property panel switched to "Multiple objects selected" with the align tools — the same outcome a marquee produces |
| Drag move | the model's `left/top` went `192,262 → 228,272` for a +36,+10 pointer drag, with **exactly one** undo step: `Changed (Left, Top): … Screen / Children / Label [label2]` |
| Resize | dragging the editor's south handle (`EezStudio_FlowEditorSelection_ResizeHandle`, 8 of them for a px-sized panel) down 30 px wrote `height: 320 → 350`, undo label `Changed (Height): … Screen / Children / Panel` |
| Undo / redo | Ctrl+Z put the rectangle back, Ctrl+Y re-applied it |
| Zoom | zoom dropdown 100 % → 200 % → 400 %: the surface's client box goes `480×320 → 960×640 → 1920×1280` with the same painted objects and nodes, i.e. it scales as vectors rather than being resampled |
| Pan | a drag on the canvas background translates the surface (measured left edge `471 → 276`) |
| Marquee | **not startable on this page.** A drag in the free canvas area is handled as a *pan* (the surface moved; no `…_RubberBend` element ever appeared) even though the editor's `RubberBandSelectionMouseHandler` exists and `createMouseHandler()` falls through to it. That choice is made by the editor from the drag target and is identical on the canvas path, so it is not a property of this surface; multi-object selection is reachable with Ctrl+click. The LVGL screen enclosure covering the display is what removes the "empty space" a marquee would start from. |

Ownership in one line: **the editor owns the gestures, the surface owns the pixels.** The surface's only
pointer behaviour is click-select, and it delegates the result to
`viewState.selectObjects` / `deselectAllObjects` so history, the property panel and the widgets tree stay in
sync without a second selection model.

Two consequences worth knowing when debugging this surface:

- **The editor's chrome wins wherever it covers the surface.** A click inside a *selected* object's area hits
  `EezStudio_FlowEditorSelection_BoundingRect`, not the `<svg>`, so the editor decides what happens —
  measured both ways on the same point: with the panel selected, Ctrl+click there toggled the panel off; with
  nothing selected, the same click reached the surface and added the label. Click-select applies where that
  chrome is not in the way, and once it has run the frame it draws stays inert (§5).
- **Pointers do not survive an edit** (§4): the pointer → widget index is rebuilt on a new LVGL tree, and
  re-tried while the rebuild keeps changing coverage. Measured failing without it: a drag left the frame on
  nothing and a later click selected nothing; measured working with it: coverage stayed complete across a
  drag, a second drag and a resize, and clicking another widget after each edit still selected it.

Other constraints the surface must respect:

- Z-order changes and property-panel edits repaint the surface: repaint is polled on the frame heartbeat and
  the DOM is only patched when the dumped scene changes ([rendering §8](./rendering.md)).
- Undo/redo replays visual state, because selection and edits go through the editor's own history.
- Switching pages tears the surface down cleanly: the runtime is unmounted, the sink clears `#content`, the
  notice and selection groups are removed, and the scratch buffer is freed.
- Zoom and pan are unchanged: the `<svg>` sits inside the container that already applies the view transform,
  and its `viewBox` is in page units, so the surface stays crisp instead of being resampled.

## 8. Out of scope

- Run mode (`LVGLPageViewerRuntime`) — renders on the canvas; see
  [invariants §1.1](./invariants.md#11-run-mode-renders-on-the-canvas).
- LVGL versions other than 9.5.
- Changing any existing editor behaviour, chrome, menus or project format.
- Removing the canvas path — it stays as the pixel-preview oracle.
