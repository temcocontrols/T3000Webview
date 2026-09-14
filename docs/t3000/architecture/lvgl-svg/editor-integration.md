# LVGL SVG Renderer — Editor Integration

The surface component, its feature flag, the single pre-existing edit site, and the editing behaviour the
surface provides (hit-testing, selection overlay, zoom/pan).

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

## 3. The single pre-existing edit site

| Site | Change | With the flag off |
|---|---|---|
| `project-editor/features/page/page.tsx` — `<LVGLPage page={this} flowContext={flowContext} />` inside the `isLVGL` branch (`:923-931`) | the branch also checks the LVGL version and renders `<LVGLSvgPage …/>` instead | identical code path |

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
  LVGL round-trip is involved.
- Selection goes through the existing editor model. The integration points are
  `flow/editor/{context.tsx,flow-document.tsx,editor.tsx,bounding-rects.ts}`:
  `document.findObjectById(getId(widget))` produces the adapter and `viewState.selectObject` /
  `selectObjects` / `deselectAllObjects` apply it, so undo/redo, the property panel, the widgets tree and
  modifier handling behave exactly as they do elsewhere in the editor.
- The selected objects' rectangles are taken from the scene (`area`), which is also the coordinate space of
the `<svg>` viewBox — no projection through the viewport transform is needed.
- Because SVG nodes are real elements, per-object boxes can also be read back from the DOM
  (`getBBox()`), which is what the fidelity harness uses for its `bboxIoU` comparison.

## 5. Overlay (`<g id="overlay">`)

Drawn **after** `#content`, so it is always on top:

| Affordance | Source |
|---|---|
| Selection outline + handles | selected objects' `area` (scene) or node `getBBox()` |
| Marquee | pointer drag in empty space |
| Guides / rulers / snap lines | existing editor behaviour, re-expressed as SVG |
| Failure notice (`<g id="notice">`) | `SvgSink.showNotice()` — a short message shown when the surface cannot paint, and the only overlay content that exists independently of a selection (see [runtime integration §7a](./runtime-integration.md#7a-failure-modes-why-the-surface-can-be-blank-and-what-it-does-about-it)) |

This is the piece that later becomes the **shared overlay for the HVAC merge** — an SVG overlay works above
either substrate, which is exactly why the SVG direction was chosen.

## 6. Zoom / pan

Wrap `#content` in `<g transform="translate(tx,ty) scale(k)">` driven by the existing view transform
(`flowContext.viewState.transform`). Improvement over the canvas path: the existing component switches to
`imageRendering: "pixelated"` above 2× zoom (`lvgl/Page.tsx:88-92`) — SVG stays crisp at any zoom.

## 7. Interaction behaviour

Behaviour the surface provides, and the constraints it must respect:

- Click selects; ctrl/meta/shift click adds to or removes from the selection; a click on empty space clears
  it (`hit-test.ts`).
- Move, resize and rotate are performed through the property panel and the widgets tree. The surface does
  not implement drag handles — the canvas path has no such interaction either, so there is no parity gap.
  The `data-ptr`/`data-objid` attributes are in place if drag handling is added later, since the editor's
  own mouse handlers resolve their target from `[data-eez-flow-object-id]` attributes.
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
