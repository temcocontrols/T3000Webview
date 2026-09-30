# P4 — route consolidation

Goal: `/t3000/designer/:kind/:id?` becomes the only designer route; the old URLs become redirects that
preserve every parameter, and every link builder in the app points at the new route.

Files: [`../change-map.md`](../change-map.md) §P4.

---

## 1. Route map

| Old | New | Notes |
|---|---|---|
| `/t3000/hvac-designer` | `/t3000/designer/hvac-schematic` | |
| `/t3000/hvac-designer/:graphicId` | `/t3000/designer/hvac-schematic/:graphicId` | path param moves into `:id` |
| `/t3000/eez` | `/t3000/designer/lvgl-9-5` | `kind` refined to `lvgl-flow-9-5` when `?type=`/the project says "with Flow" |
| `/t3000/eez?open=<path>` | `/t3000/designer/lvgl-9-5?open=<path>` | **`open` stays a query param** (Q7 allows `:id` too; both are accepted) |
| `/t3000/eez?new=…&name=…&location=…&createDirectory=…` | same params, new path | the wizard hand-off is unchanged |
| `/t3000/eez?examples=1&folder=…&type=…` | same params, new path | |
| `/t3000/tstat10-simulator` | `/t3000/designer/lcd-ui` | P5 |

**Every query parameter is copied verbatim**, because two features read the raw location text:
`svg`, `svg=0`, `svgDiff=1|all`, `svgStats=1` (`svg/feature-flag.ts:28-113` reads `search + hash`) and the
runtime cache guard's per-tab stamp (`runtime-cache-guard.ts:47-70`, `sessionStorage["t3.lvgl.runtimeStamp"]`).
Dropping or reordering them would silently disable the fidelity harness or force a WASM re-download.

## 2. Redirect implementation

`HashRouter` means the query lives inside the hash (`EezStudioApp.tsx:183-186`), and `useLocation().search`
exposes it — so a redirect is three lines:

```tsx
// app/redirects.tsx
import { Navigate, useLocation, useParams } from "react-router-dom";

const qs = (search: string) => search || "";        // already includes "?"

export const LegacyHvac = () => {
    const { graphicId } = useParams<{ graphicId?: string }>();
    const { search } = useLocation();
    return <Navigate replace to={`/t3000/designer/hvac-schematic${graphicId ? `/${graphicId}` : ""}${qs(search)}`} />;
};

export const LegacyEez = () => {
    const { search } = useLocation();
    return <Navigate replace to={`/t3000/designer/lvgl-9-5${qs(search)}`} />;
};

export const LegacySimulator = () => <Navigate replace to="/t3000/designer/lcd-ui" />;
```

`replace` avoids a redirect hop in history.

**Cold loads work too:** `home/settings.tsx:371` does `window.location.href = "/#/t3000/eez"` (a full page
load) — the redirect handles it; the literal is still updated to avoid the double load (R15).

## 3. The three traps

### T1 — menu-set prefix collision (R4)

```ts
// config/menuConfig.ts:1429-1434 — today
if (pathname.startsWith('/t3000/design')) return designHubMenuConfig;      // :1430  ← catches /t3000/designer!
if (pathname.startsWith('/t3000/hvac-designer')) return hvacMenuConfig;    // :1431
if (pathname.startsWith('/t3000/eez')) return eezMenuConfig;               // :1432
if (pathname.startsWith('/t3000/tstat10-simulator')) return simulatorMenuConfig; // :1433
```

Fix — and make the choice **by document kind**, not by path prefix:

```ts
export function getMenusForPath(pathname: string): MenuItem[] {
    const designer = matchDesigner(pathname);                 // "/t3000/designer/<kind>/…" → kind | undefined
    if (designer) return getMenusForKind(designer);           // P1 ships hvac only; P2 adds lvgl kinds
    if (pathname.startsWith('/t3000/design')) return designHubMenuConfig;
    …
}
export function getMenusForKind(kind: DocumentKind): MenuItem[] {
    switch (kind) {
        case "hvac-schematic": return hvacMenuConfig;
        case "lvgl-9-5":
        case "lvgl-flow-9-5":  return eezMenuConfig;
        case "lcd-ui":         return simulatorMenuConfig;
    }
}
```

The legacy prefixes can stay (they are dead once the redirects are in, and harmless).

### T2 — the second route table (R5)

`app/router/routes.ts` is hand-maintained metadata (`path`, `element`, `title`, `windowId`, `shortcut`,
`requiresDevice`, `:115-122`) and is **not** used for rendering — `App.tsx` never imports it. Its only live
consumer is `Header.tsx:108, 814`:

```ts
const route = t3000Routes.find((r) => r.windowId === item.windowId);
if (route) navigate(route.path);
```

So `routes.ts` must gain the designer entries and lose/redirect the old ones:
`:327` (`/t3000/hvac-designer`) and `:306` (`/t3000/tstat10-simulator`, keep `windowId: 17`). This table has
already drifted (no `/t3000/eez`, no `/t3000/design`) — add the missing entries and a
comment in each file pointing at the other.

### T3 — there is no catch-all route

`App.tsx:621` is a comment (`{/* Fallback route */}`), so any unmatched hash renders an empty frame. The
shell already handles an unknown `:kind` (P1/R6). In P4 also add a real fallback inside `/t3000`:

```tsx
<Route path="/t3000/*" element={<Navigate replace to="/t3000" />} />
```

(Mind the ordering: it must come **after** the specific branches.)

## 4. Link sites to update

Full list with line numbers in [`../change-map.md`](../change-map.md) §P4. Grouped by shape:

| Group | Files | Change |
|---|---|---|
| Route registry | `design-hub/drawingTypes.ts:17, 66, 78, 91` | `openPath` → new routes (single source; everything else follows) |
| URL builders | `designHubService.ts:97, 365, 487, 516, 595, 657`; `projectCatalog.ts:75, 95` | `/t3000/hvac-designer/${id}` → `/t3000/designer/hvac-schematic/${id}` |
| Dialogs | `LvglCreateDialog.tsx:189, 273`; `EezExampleCreateDialog.tsx:100`; `NewTypeDialog.tsx:39, 49, 70, 113`; `NewDrawingDialog.tsx:141` | literals → new paths (the last one already resolves through `openPath`) |
| Menus / nav | `DesignMenuBar.tsx:114`; `Header.tsx:583`; `settings.tsx:371`; `menuConfig.ts` (`getMenusForPath`) | new paths + kind-based menus |
| Consumers of `openPath` | `ProjectCard.tsx:100`, `ActivityPanel.tsx:74`, `ProjectDetailPage.tsx:375`, `ImportDialog.tsx:44`, `TemplatesSection.tsx:22`, `CommandPalette.tsx:51, 61`, `DesignHubPage.tsx:107-110`, `designHubStore.ts:104`, `types.ts:16, 54` | **no change** — they follow the registry |
| Docs / manual | `docs/t3000/design-hub/README.md:15-17, 20, 106`; `docs/t3000/t3-eez-studio/manual/01-overview.md:70`, `06-reference-and-faq.md:46-48`; `docs/t3000/architecture/lvgl-svg/{architecture,editor-integration}.md` | update the route tables |
| Tests | `test/vitest/__tests__/lvgl-svg-wire.test.ts:1245-1369` | rename the pinned `#/t3000/eez…` strings and add new-route equivalents (they pass either way — the flag reader is location-based) |

## 5. Unsaved changes on navigate

Today: no guard — navigating away simply unmounts, and the HVAC engine autosaves + `DataOpt.SaveToLocalStorage`,
while the LVGL project keeps its `projectStore.isModified` state in memory/file. P4 must **keep** that
behaviour (Q6 default) and document it. If a guard is wanted later, it is one place: the shell's navigate
path (`MountContext.navigate`), using `adapter.commands.get("save")` + a `MessageBar` prompt.

## 6. Verification

Run this redirect matrix — 9 rows — plus:

- after each redirect, the menu bar shows the right set (HVAC menus for an HVAC document);
- `?svg=1&svgDiff=1` survives and the harness still reports 0 failing rows;
- the Design Hub's create/import/template/duplicate/recent paths all land on the right document;
- the wizard create (`?new=&name=&location=`) and the example create (`?examples=1&type=`) work end to end;
- `/#/t3000/eez` typed manually and loaded cold redirects;
- a bogus path under `/t3000/designer/` shows the shell's "unknown document" state, and a bogus path under
  `/t3000/` redirects to `/t3000`.

## 7. Rollback

One commit revert restores both routes (nothing else depends on the rename; the new routes work in both
states because they were added in P1/P2). Optional one-release kill switch: `localStorage["t3.designer.enabled"] === "0"`
→ the legacy routes render the legacy pages (see `risks.md` §2).
