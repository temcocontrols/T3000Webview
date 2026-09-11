# LVGL SVG Renderer — Editor Integration Design

Part of the [design set](./README.md). Status: **design, no code yet**.
Additive-only: one flagged branch in existing code (§3); everything else is new files.

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

1. URL `?svg=1` / `?svg=0` — per-session override for testing (survives the HashRouter query handling used
   elsewhere in this app, e.g. `EezStudioApp.tsx:215-219`).
2. `localStorage["t3.lvgl.svgRenderer"]` = `"1"` / `"0"`.
3. Default **OFF**.

**Deliberately not** a project-settings field: that would change the `.eez-project` schema, which is shared
with the device/firmware tooling. Keeping the flag out of the project file also means the same project can
be opened with or without SVG.

## 3. The single touch point

| Site | Change | Flag OFF |
|---|---|---|
| `project-editor/features/page/page.tsx:930` — `<LVGLPage page={this} flowContext={flowContext} />` inside the `isLVGL` branch (`:923-931`) | `isSvgRendererEnabled() ? <LVGLSvgPage …/> : <LVGLPage …/>` | code path identical to today |

Why unavoidable: `LVGLPage` is imported directly at `page.tsx:73`; there is no registry indirection for the
page component (unlike the runtime, which *is* registered via `project-editor-create.tsx:227`).

**Alternative with zero source edits:** a Vite/barrel alias so `project-editor/lvgl/Page` resolves to the new
component. Config-only, but **global** (no per-user flag, no A/B on one machine) and it hides the choice from
readers. Recommendation: the flagged branch (decision D4).

## 4. Selection & hit-testing

- Every object group carries `data-objid` (see [rendering design](./rendering.md#3-dom-contract)),
  so a DOM `click`/`pointerdown` maps straight to the project widget.
- Hit-testing uses the browser's own SVG hit-testing (no manual geometry): only `MAIN` and interactive parts
  receive pointer events.
- Selection actions reuse the existing editor selection model and actions. **P4 target (located):**
  `project-editor/flow/editor/context.tsx`, `mouse-handler.tsx`, `flow-document.tsx`, `editor.tsx`,
  `bounding-rects.ts` — route SVG pointer events into the same path, so undo/redo, multi-select modifiers,
  keyboard shortcuts and property-panel sync keep working unchanged. `bounding-rects.ts` is a candidate to
  reuse for the overlay geometry.
- Because SVG nodes are real elements, selection rectangles and per-object overlays can be derived from the
  DOM rather than from a model round-trip (an advantage over the canvas path).

## 5. Overlay (`<g id="overlay">`)

Drawn **after** `#content`, so it is always on top:

| Affordance | Source |
|---|---|
| Selection outline + handles | selected objects' `area` (scene) or node `getBBox()` |
| Marquee | pointer drag in empty space |
| Guides / rulers / snap lines | existing editor behaviour, re-expressed as SVG |

This is the piece that later becomes the **shared overlay for the HVAC merge** — an SVG overlay works above
either substrate, which is exactly why the SVG direction was chosen.

## 6. Zoom / pan

Wrap `#content` in `<g transform="translate(tx,ty) scale(k)">` driven by the existing view transform
(`flowContext.viewState.transform`). Improvement over the canvas path: the existing component switches to
`imageRendering: "pixelated"` above 2× zoom (`lvgl/Page.tsx:88-92`) — SVG stays crisp at any zoom.

## 7. Interaction parity checklist (P4 acceptance)

- [ ] Click select, ctrl/shift multi-select, click-empty deselect
- [ ] Drag move, nudge with arrows, resize, rotate (where supported today)
- [ ] Z-order operations reflect immediately
- [ ] Property panel edits repaint the surface
- [ ] Undo/redo replays visual state correctly
- [ ] Page switch while selected → clean teardown, no orphan nodes
- [ ] Zoom/pan identical bounds/behaviour to canvas mode

## 8. Out of scope (deliberately)

- Run mode (`LVGLPageViewerRuntime`) — decision D1.
- LVGL versions other than 9.5.
- Changing any existing editor behaviour, chrome, menus or project format.
- Removing the canvas path — it stays as the pixel-preview oracle.
