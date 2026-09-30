# Designer — theme and CSS

Decision D5: **T3000 Fluent tokens own the theme.** Fluent UI (`@fluentui/react-components@^9.47.0`) is the
one library for the shell and every panel it draws. This document is the concrete plan.

---

## 1. Where the theme comes from

| Thing | Where | State |
|---|---|---|
| `FluentProvider` | `src/t3-react/app/App.tsx:220` | `theme={theme === 'light' ? webLightTheme : webDarkTheme}` |
| The theme value | `App.tsx:204` | `const [theme] = React.useState<'light' \| 'dark'>('light')` — **hardcoded light**, no setter, **dark is not reachable** |
| T3000 brand tokens | `src/t3-react/app/config/theme.ts:38` | `t3000Theme = createLightTheme(t3000BrandColors)` — **defined but never passed to `FluentProvider`** |
| T3000 theme store | `src/t3-react/theme/ThemeProvider.tsx` | `useTheme()` → `{ theme, themeName, setTheme }`; `ThemeName = 'azure' \| 'light' \| 'dark'`; writes `--t3-*` CSS variables on `document.documentElement` (`:60-77`) |
| Fluent `tokens` | imported from `@fluentui/react-components` | used by `tstat10-simulator` etc. |
| `--t3-*` variables | `var(--t3-color-header-background)` etc. | used by `Header.tsx:142-160`, `MinimalLayout.tsx:31`, `DesignMenuBar.tsx:60-68` |
| `ThemeSelector` | `theme/ThemeSelector.tsx:38` | **commented out** in the header (`Header.tsx:1006`) |

**Consequence for the design.** "Fluent tokens are the theme" is achievable and cheap; "light/dark follows
the T3000 theme switch" is **not wired**. So:

- The shell and all its chrome use `tokens.*` only.
- The EEZ bridge maps its variables onto **Fluent tokens expressed as CSS custom properties**, so the
  bridge is automatically correct the day dark mode is wired — no second pass needed for it.
- **Wiring dark mode itself is out of scope** (it is a T3000-wide change: `App.tsx:204` + the unused
  `t3000Theme` + `ThemeSelector`). An open question, not a Designer task.

---

## 2. Shell chrome: literal → token

These are the only literal colours in the code the shell takes over
(`features/hvac-designer/pages/HvacDesignerPage.tsx:27-83`, plus `HvacDrawingArea.module.css`).

| Literal | Where | Token |
|---|---|---|
| `#e1e1e1` | `leftPanel.borderRight` (`:48`), `messageBar.borderTop` (`:61`) | `tokens.colorNeutralStroke2` |
| `#fafafa` | `leftPanel.backgroundColor` (`:49`) | `tokens.colorNeutralBackground2` |
| `#f5f5f5` | `drawingArea.backgroundColor` (`:54`) | `tokens.colorNeutralBackground3` |
| `#ffffff` | `messageBar.backgroundColor` (`:62`) | `tokens.colorNeutralBackground1` |
| `115px` | `leftPanel.width` (`:47`) | `RegionSpec.width.default` — **not** a token, a layout constant (persisted per document kind) |
| `TopToolbar` internals | `TopToolbar.tsx` (60 px bar) | `tokens.colorNeutralBackground1`, `colorNeutralStroke2`, `colorNeutralForeground1/2`, `colorBrandForeground1`; keep `minHeight: 60px` |

New shell styles (all `makeStyles` + `tokens.*`):

```ts
const useStyles = makeStyles({
    root:   { display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" },
    body:   { display: "flex", flex: 1, minHeight: 0, overflow: "hidden" },
    panel:  { display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden",
              backgroundColor: tokens.colorNeutralBackground1 },
    panelBorderLeft:  { borderLeft:  `1px solid ${tokens.colorNeutralStroke2}` },
    panelBorderRight: { borderRight: `1px solid ${tokens.colorNeutralStroke2}` },
    tabStrip: { display: "flex", alignItems: "stretch", flexShrink: 0,
                borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
                backgroundColor: tokens.colorNeutralBackground2 },
    tab:      { padding: "4px 10px", fontSize: tokens.fontSizeBase200, cursor: "default" },
    tabActive:{ backgroundColor: tokens.colorNeutralBackground1,
                boxShadow: `inset 0 -2px 0 ${tokens.colorBrandForeground1}` },
    canvas:   { flex: 1, minWidth: 0, minHeight: 0, position: "relative", overflow: "hidden",
                backgroundColor: tokens.colorNeutralBackground3 },
    splitter: { width: "4px", flexShrink: 0, cursor: "col-resize",
                backgroundColor: tokens.colorNeutralStroke3,
                ":hover": { backgroundColor: tokens.colorBrandBackground } },
    status:   { flexShrink: 0, minHeight: "24px", borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
                backgroundColor: tokens.colorNeutralBackground2, fontSize: tokens.fontSizeBase200 }
});
```

**Size contract** (repo convention, see `theme-and-css.md` §1 and `features/tstat10-simulator/pages/Tstat10SimulatorPage.tsx:26,38`):
`height: '100%'` + `flex: 1` + `minHeight: 0`. **Not** `calc(100vh - Xpx)`. `MinimalLayout`
(`layout/MinimalLayout.tsx:37,69`) already gives `flex: 1` to `<Outlet />` under a ~32 px menu bar.

**Don't portal the top bar.** `features/tstat10-simulator` portals its mode toggles into
`#page-header-actions` (`Tstat10SimulatorPage.tsx:298-302`), an element created only by
`PageHeader.tsx:198`, which is rendered only by `MainLayout`. Designer routes live under `MinimalLayout`,
so that target is `null` there. The shell draws its own top bar.

---

## 3. The EEZ side: the variable bridge

> The 23 variables below read `var(--eez-*, <original literal>)`
> (`_stylesheets/vars.less`) and `documents/lvgl/lvgl-theme-bridge.css` maps each property to a Fluent token
> under the shell host (`.t3-designer[data-doc-kind^="lvgl"]`, added by `DesignerShell`). The literals are the
> fallbacks, so an un-bridged surface — a portalled dropdown, a non-designer host — is byte-identical to before.
>
> `--eez-border: #e0e0e0` (Fluent `colorNeutralStroke2`) where the old literal was `#e2e2e2`, so the
> bridge is genuinely in effect; exactly one `.t3-designer` element; toolbar, three regions and editor
> unchanged; no console errors.

### 3.1 Why a bridge is needed at all

`vars.less` (`src/lib/t3-eez-studio/eez-studio-ui/_stylesheets/vars.less`, 113 lines, 88 variables) is
**LESS**, i.e. compiled at build time into literal values — a runtime theme cannot reach it. It is imported
globally by `main.less:1` ← `EezStudioApp.tsx:60`.

Only 4 of its variables are runtime-switchable (`--bs-body-bg`, `--bs-body-color`,
`--bs-tertiary-bg` at `:1,2,6,97`) and the `--eez-*` dark properties are defined and consumed **only**
inside `main-dark-runtime.less:5-14` (a file that is not part of the web entry).

### 3.2 The bridge: LESS value → CSS custom property

A LESS variable whose value is `var(--x)` compiles to `color: var(--x)` verbatim, which makes the whole
EEZ stylesheet themeable **without rewriting a single rule** by pointing its variables at custom properties
and defining those properties on the EEZ wrapper from Fluent tokens.

```less
// vars.less — before / after (13 of the 88 vars are shown; the full list is §3.3)
-@borderColor: #e2e2e2;
+@borderColor: var(--eez-border-color);
```

```css
/* lvgl-theme-bridge.css — scoped to the document host, never :root */
.t3-designer[data-doc-kind^="lvgl"] {
    --eez-background:      var(--colorNeutralBackground1);     /* Fluent token */
    --eez-text:            var(--colorNeutralForeground1);
    --eez-section-bg:      var(--colorNeutralBackground2);
    --eez-border:          var(--colorNeutralStroke2);
    --eez-border-dark:     var(--colorNeutralStroke1);
    --eez-panel-header:    var(--colorNeutralBackground3);
    --eez-selection-bg:    var(--colorBrandBackground);
    --eez-selection-fg:    var(--colorNeutralForegroundOnBrand);
    --eez-hover-bg:        var(--colorNeutralBackground1Hover);
    --eez-scroll-track:    var(--colorNeutralBackground3);
    --eez-scroll-thumb:    var(--colorNeutralStroke1);
    --eez-error:           var(--colorPaletteRedForeground1);
    --eez-warning-bg:      var(--colorPaletteYellowBackground1);
    --eez-focus-bg:        var(--colorBrandBackground2);
    --eez-active-tab-bg:   var(--colorNeutralBackground1);
    --eez-splitter-bg:     var(--colorNeutralBackground3);
    --eez-splitter-border: var(--colorNeutralStroke2);
    --eez-component-bg:    var(--colorNeutralBackground1);
    --eez-connection-line: var(--colorNeutralStroke1);
}
```

Fluent `tokens` are themselves CSS custom properties (`--colorNeutralStroke2`, …) emitted by
`FluentProvider`, so the bridge is one layer of indirection and follows the provider theme automatically.

### 3.3 Variables to bridge (the ones that actually paint the workbench)

| `vars.less` | Line | → custom property | Fluent token |
|---|---|---|---|
| `@backgroundColor` | 1 | `--eez-background` | `colorNeutralBackground1` |
| `@textColor` | 2 | `--eez-text` | `colorNeutralForeground1` |
| `@sectionBackgroundColor` | 3 | `--eez-section-bg` | `colorNeutralBackground2` |
| `@borderColor` | 4 | `--eez-border` | `colorNeutralStroke2` |
| `@darkBorderColor` | 5 | `--eez-border-dark` | `colorNeutralStroke1` |
| `@panelHeaderColor` | 6 | `--eez-panel-header` | `colorNeutralBackground3` |
| `@selectionBackgroundColor` | 7 | `--eez-selection-bg` | `colorBrandBackground` |
| `@selectionColor` | 8 | `--eez-selection-fg` | `colorNeutralForegroundOnBrand` |
| `@lightSelectionBackgroundColor` | 9 | `--eez-selection-bg-light` | `colorBrandBackground2` |
| `@tableBorderColor` | 11 | `--eez-table-border` | `colorNeutralStroke2` |
| `@nonFocusedSelectionBackgroundColor` | 12 | `--eez-selection-bg-inactive` | `colorNeutralBackground3` |
| `@nonFocusedSelectionColor` | 13 | `--eez-selection-fg-inactive` | `colorNeutralForeground1` |
| `@hoverBackgroundColor` | 14 | `--eez-hover-bg` | `colorNeutralBackground1Hover` |
| `@hoverColor` | 15 | `--eez-hover-fg` | `colorNeutralForeground1` |
| `@scrollTrackColor` | 16 | `--eez-scroll-track` | `colorNeutralBackground3` |
| `@scrollThumbColor` | 17 | `--eez-scroll-thumb` | `colorNeutralStroke1` |
| `@darkTextColor` | 18 | `--eez-text-secondary` | `colorNeutralForeground2` |
| `@focusBackgroundColor` | 19 | `--eez-focus-bg` | `colorBrandBackground2` |
| `@errorColor` | 26 | `--eez-error` | `colorPaletteRedForeground1` |
| `@warningBackgroundColor` | 27 | `--eez-warning-bg` | `colorPaletteYellowBackground1` |
| `@warningColor` | 28 | `--eez-warning-fg` | `colorNeutralForeground1` |
| `@connectionLineColor` | 30 | `--eez-connection-line` | `colorNeutralStroke1` |
| `@activeTabBackgroundColor` | 37 | `--eez-active-tab-bg` | `colorNeutralBackground1` |
| `@splitterBackgroundColor` | 45 | `--eez-splitter-bg` | `colorNeutralBackground3` |
| `@splitterBorderColor` | 46 | `--eez-splitter-border` | `colorNeutralStroke2` |
| `@splitterHoverColor` | 47 | `--eez-splitter-hover` | `colorNeutralStroke1Hover` |
| `@panelBorderColor` | 50 | `--eez-panel-border` | `colorNeutralStroke2` |
| `@buttonColor` | 51 | `--eez-button-fg` | `colorNeutralForeground1` |
| `@componentBackgroundColor` | 55 | `--eez-component-bg` | `colorNeutralBackground1` |
| `@componentBorder` | 56 | `--eez-component-border` | `colorNeutralStroke2` |
| `@formControlBorderColor` | 99 | `--eez-form-border` | `colorNeutralStroke1` |
| `@inErrorBackgroundColor` | 107 | `--eez-in-error-bg` | `colorPaletteRedBackground1` |
| `@tipBoxBackgroundColor` / `Border` | 110/111 | `--eez-tip-bg` / `--eez-tip-border` | `colorPaletteGreenBackground1` / `colorPaletteGreenBorder1` |

### 3.4 Variables that must stay literal

| Variable | Line | Why |
|---|---|---|
| `@splitterSize: 8px` | 48 | used as a **length in LESS context**; `var()` there is fragile — keep literal (the shell's own splitter uses its own constant) |
| `@componentShadow`, `@componentBodyShadow`, `@modalDialogDropdownShadow` | 94, 95, 113 | shadow shorthand — `var()` works, but keep literal to avoid re-evaluating layout |
| `@sessionHistoryItem*Background` | 81-88 | `linear-gradient(...)` mixing functions — keep literal |
| `@calendarMonthDayLevel*{BackgroundColor,Color}` (10) | 59-68 | contrast pairs tuned together; semantic, not chrome |
| `@dragSource*`, `@dropTarget*`, `@dropPlaceColor` | 21-25 | drag affordances; brand-specific, not tokens |
| `@*HistoryItemBackgroundColor` (7) | 70-80 | data-visualisation palette |
| `@trixToolbarColor`, `@readOnlyListItem`, `@pageTimeline*RowColor` | 31, 43, 101, 102 | fine as-is |

Rule of thumb: **bridge chrome** (backgrounds, borders, text, selection, focus, scroll) and leave
**semantics** (data colours, drag affordances, shadows) alone. Result: ~33 of 88 variables.

### 3.5 Dark mode inside EEZ

`settingsController.switchTheme(value)` (`home/settings.tsx:255-259`) → `onThemeSwitched()` (`:260-290`)
does three things to the **document**: sets `html[data-bs-theme]`, toggles `html.theme-dark`, and injects a
`flexlayout-dark.css` `<link>` (`:272-286`). `html`-level mutation from inside a hosted document is exactly
what the shell must not allow.

Plan (P2):
1. Remove the `Switch Theme` menu item (`menuConfig.ts:1364`) and its dispatch chain
   (`Header.tsx:681-682` → `EezStudioApp.tsx:43` → `home/main.tsx:73-75`), or map it to the T3000
   `useTheme().setTheme`.
2. Keep `settingsController.isDarkTheme` as a read-only mirror of the T3000 theme; `onThemeSwitched()`
   stops touching `html` (the bridge in §3.2 handles colour).
3. Leave the settings dialog toggle (`settings.tsx:1284`) visible only if step 1 kept the mapping.

---

## 4. Scoping EEZ's global CSS

> **Investigated, deliberately not changed (P2.8).** The tempting "safe" change — overriding
> `#EezStudio_Content`'s `position: absolute` (`app.less:129`) so it does not depend on a positioned ancestor
> — breaks the layout: with `position: relative; width/height: 100%` the element
> collapses to **2 px** (1082×772 → 1082×2), and the editor lives inside it, so the canvas area collapses too.
> The rule is load-bearing and resolves against `DesignerShell`'s canvas host, which must stay
> `position: relative`.
>
> Scoping `*`, `body` and the `input…` rules is not mechanical either: EEZ renders dropdowns, dialogs and
> toasts through portals that leave the subtree, so scoping would strip those popups of their styling. It needs
> visual QA of every popup. The findings live next to the properties in `lvgl-theme-bridge.css`.

`app.less` is imported globally (`EezStudioApp.tsx:60` → `main.less:2`). These selectors leak into any
document rendered in the same page:

| Line | Selector | Effect | Fix |
|---|---|---|---|
| 52 | `*` | `user-select: none` **document-wide** | move under `.t3-designer[data-doc-kind^="lvgl"] *` |
| 64 | `body` | `overflow: hidden; font-size: .8rem` | move to the host wrapper |
| 74 | `body, .btn, .form-control, .form-select, .jsPanel .jsPanel-content` | `font-size: .8rem` | scope the non-`.btn` part; `.btn`-family stays (Bootstrap classes only exist inside EEZ) |
| 79, 83, 89, 94, 98 | `input.error`, `input[type="color"]`, `input[readonly]`, `input::-webkit…`, `input::placeholder` | element selectors — hit HVAC inputs too | scope under the EEZ wrapper |
| 129 | `#EezStudio_Content` | `position: absolute; left/top: 0; width/height: 100%` | **must change**: the shell's canvas slot is a flex child, not a full-page overlay. Scope to `position: relative; width: 100%; height: 100%` inside the slot |
| 140 | `#EezStudio_Content > div:first-child` | `border-top` | keep, but only inside the slot |
| 144 | `#EezStudio_ModalContent` | full-screen fixed overlay, `z-index: 1000` | keep (dialogs are page-level) but check `z-index` against the shell's chrome |
| 545 | `*:focus` | universal outline | scope |
| 1421-1490 | `.flexlayout__tabset`, `.flexlayout__tab`, `.flexlayout__tab_button*`, … | would restyle **any** FlexLayout instance | prefix with the EEZ wrapper; only EEZ uses FlexLayout, so this is future-proofing |
| 1515 | `.EezStudio_Component_Documentation` + nested `*` (`:1517-1519`) | scoped already | — |

Everything from `:168` on is `.EezStudio_*`-prefixed and therefore already namespaced. The bootstrap import
and `.modal`, `.popover`, `.input-group`, `.btn-group`, `.dropdown-menu`, `.progress`, `.form-text`,
`.form-switch`, `.collapsing`, `.accordion-*` overrides (`:56-1510`) are Bootstrap classes that only exist
inside EEZ markup — leave them, but verify no HVAC markup uses them (grep: the HVAC folder uses Fluent and
CSS modules, so it does not).

**Verification:** with an HVAC document open in the shell, check
(a) text is selectable, (b) the page scrolls/does not scroll as before, (c) font sizes match the pre-change
screenshot pixel-for-pixel, (d) `document.documentElement.classList` has no `theme-dark`.

---

## 5. Invariants of the theme work

- No literal colour in `features/designer/**` (grep for `#` + 3/6 hex).
- `features/designer/**` imports `tokens` from `@fluentui/react-components` only — no `--t3-*` reads (those are
  for the app chrome above the shell).
- The EEZ bridge is a **single** CSS file, and no rule is rewritten in `app.less` other than the scoping in §4.
  §4's own `#EezStudio_Content` override is **not** applied: it collapses the surface to 2 px (`1082×772 →
  1082×2`), because the rule is load-bearing for the element the editor lives inside.
- The bridge is token-driven, observable on any token: overriding `--colorNeutralStroke2` moves `--eez-border`
  (`#e0e0e0` from the token, against the old literal `#e2e2e2`).
- With an HVAC document open, nothing from §4 is in effect.
