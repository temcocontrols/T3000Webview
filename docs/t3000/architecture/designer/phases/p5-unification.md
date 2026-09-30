# P5 — optional unification

Everything here is optional. P1–P4 already deliver "one editor, same structure, per-type content".
P5 removes the last duplication: two toolbars become one, and the LCD designer joins the same shell.

Files: [`../change-map.md`](../change-map.md) §P5.

---

## 1. Shared command bus

> **Implemented, with one deliberate omission.** `commands/CommandBus.tsx` (register/get/all/
> subscribe/revision), `commands/viewportCommands.ts` (one factory both documents use),
> `components/ShellCommandBar.tsx` (rendered by `ShellTopBar`), plus the two adapters
> `documents/hvac/hvacViewport.ts` and `documents/lvgl/eezViewport.ts`. The duplication-removal edits
> live in those two adapters.
>
> **Keyboard shortcuts are wired, and the ownership rule is the whole design.** The engines keep their own
> bindings — `KeyboardOpt.ts:67-85` (undo/redo/save/reset on `window.onkeydown`, `Doc/T3Opt.ts`) and EEZ's
> flow-editor `ctrlKey` handling — so the shell installs a **capture-phase** listener and, only for keys it
> can actually carry out, calls `preventDefault()` + `stopPropagation()`. A claimed key therefore never
> reaches the engine (no double-fire); an unclaimed one is left completely alone, which is what keeps
> HVAC's `Ctrl+B` redo and `Ctrl+S` save working. `hooks/useDesignerShortcuts.ts` maps `Ctrl+Z/Shift+Z/Y` to
> `ShellLayout.history`, `Ctrl+S` to the bus's `save`, and `Ctrl+=`/`-`/`0` to the bus's zoom commands.
> Measured per key with a `window.onkeydown` spy plus a bubble-phase listener: claimed keys are seen by
> neither, `Ctrl+B`/`Ctrl+S` by
> both, and two `Ctrl+=` presses move the zoom exactly two ladder steps.
>
> Two rules that came out of building it:
> - **`undo`/`redo` stay on `ShellLayout.history`.** They are already a single shell affordance; registering
>   them on the bus as well would draw two identical pairs. `COMMAND_BAR_ORDER` still lists them, so a
>   future document that has no `history` can register them and the bar picks them up in place.
> - **A capability is the *presence* of the adapter property, never its value.** Both adapters answer with
>   getters, and `undefined` means "this engine is not initialised yet", not "this engine has no rulers".
>   Testing the value dropped HVAC's toggles for the whole session (measured: 4 commands instead of 6),
>   because the command list is built once; `enabled()` now answers "engine ready?" instead.

Today each engine renders its own toolbar: HVAC's `TopToolbar` (`features/hvac-designer/components/toolbar/TopToolbar.tsx`,
60 px, polls `T3Gv.docUtil` every 300 ms for zoom/rulers/grid) and EEZ's `Toolbar.tsx`
(`project-editor/project/ui/Toolbar.tsx:131-146`, Fluent tokens, `minHeight: 40px`, reads `undoManager` and
`editorsStore.activeEditor.state` at `:181, 189`).

Design:

```tsx
// features/designer/commands/CommandBus.tsx
const CommandContext = createContext<CommandBus | undefined>(undefined);

export interface CommandBus {
    register(commands: Command[]): () => void;
    get(id: CommandId): Command | undefined;
    subscribe(fn: () => void): () => void;     // enabled/label changes
}
```

- The adapter registers its commands in `mount()` (`interfaces.md` §3.3) and unregisters in the disposer.
- `ShellCommandBar` renders the intersection: `undo redo | save | zoomOut zoomFit zoomIn | rulers grid`.
- `ShellTopBar` renders `ShellCommandBar` followed by `layout.top.content` (engine-specific extras).
- Keyboard shortcuts move to the shell (`Ctrl+Z/Y/S`, `Ctrl +/-/0`), routed through the bus, so they work
  identically for both document types.

Enabled/label sources (already available, no new engine API):

| Command | HVAC | LVGL |
|---|---|---|
| undo/redo | engine action manager (**verify in P1b**, R11) | `undoManager.canUndo/canRedo/undoDescription` (`Toolbar.tsx:288-309`) |
| save | `DataOpt.SaveToLocalStorage` / `useDrawing().saveDrawing` | `projectStore.save()` (`store/index.ts:791`), `isModified` (`:948`) |
| zoom | `docUtil.GetZoomFactor/SetZoomFactor` (`DocUtil.ts:907/841`) | `viewState.transform.scale` |
| rulers/grid | `docConfig.showRulers/showGrid` + `UpdateRulerVisibility/UpdateGridVisibility` (`DocUtil.ts:1193/1566`) | none for LVGL → the commands are absent and the shell hides them |

Verification: one strip drives both engines; a shortcut works in both; HVAC's own toolbar can then be
reduced to drawing tools only (or removed).

## 2. `ViewportAdapter` in the shell

Already specified in [`../interfaces.md`](../interfaces.md) §4 and implemented per adapter in P1/P2. P5 only
adds shell-side controls (zoom % dropdown, fit button, rulers/grid toggles) that call the adapter, replacing
the engine toolbars' own controls. The status bar's zoom item becomes a control instead of text.

## 3. The LCD document (`kind: lcd-ui`)

`features/tstat10-simulator` is already the closest thing to a Designer document — a Fluent-`tokens` 3-panel
designer with a design/view mode (`pages/Tstat10SimulatorPage.tsx:26, 38, 336-470`; panels
`WidgetToolbox` 170 px, `PageTabs` 140 px, canvas, `PropertiesPanel` 240 px).

Adapter:

```tsx
export const lcdAdapter: DocumentAdapter = {
    kind: "lcd-ui",
    engine: "simulator",
    mount: () => { /* nothing: the page is pure React over useDesignerState() */ },
    useLayout: () => ({
        left:   { id: "left", tabs: [{ id: "toolbox", label: "Widgets", content: () => <WidgetToolbox/> }],
                  activeTabId: "toolbox", width: { default: 170, min: 140, max: 260 } },
        canvas: { node: <DesignCanvas/> },
        right:  { id: "right", tabs: [{ id: "properties", label: "Properties", content: () => <PropertiesPanel/> }],
                  activeTabId: "properties", width: { default: 240, min: 200, max: 340 } },
        top:    { content: <ModeToggles/> }   // design/view — NOT portalled (see theme-and-css.md §2)
    }),
    commands: lcdCommands
};
```

Then: register `lcd-ui`, redirect `/t3000/tstat10-simulator` (`App.tsx:504-510`, `routes.ts:305-311` keeping
`windowId: 17`), update the mobile nav (`t3-mobile/layout/SideNavContent.tsx:155`).

Two known frictions to fix while wrapping it:
1. The mode toggles currently portal into `#page-header-actions` (`Tstat10SimulatorPage.tsx:298-302`), which
   does not exist under `MinimalLayout` — they never render today. The adapter puts them in `top.content`.
2. `PageTabs` is a second left column (140 px). Map it to `RegionSpec.secondary` (built in P2.3) to keep the
   visual result identical to today.

## 4. Optional extras (only if asked)

| Item | Note |
|---|---|
| Breadcrumb / title integration | `layout/PageHeader.tsx` is rendered only by `MainLayout`; its `:137, 140` entries are dead. Either wire `PageHeader` into the shell or delete them |
| `REFRESHABLE_PATHS` (`Header.tsx:125-132`) | add designer routes so the toolbar's refresh button does something sensible |
| Unsaved-changes guard | see P4 §5 |
| Remember last document per kind | `localStorage`, "Resume last document" entry in the Hub |

## 5. Verification

- One toolbar drives both engines with correct enabled states.
- Shortcuts (`Ctrl+Z/Y/S`, `Ctrl +/-/0`) behave per document type.
- The LCD document is visually and behaviourally identical to `tstat10-simulator` today, including the
  design/view switch, and `/t3000/tstat10-simulator` redirects.
- `npx vitest run lvgl-svg designer-shell` green; `?svgDiff=1` unchanged (0 failing rows).
