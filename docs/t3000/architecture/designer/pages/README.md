# Designer — page-by-page design

The main design set says **how** the unified editor is built ([`../design.md`](../design.md),
[`../interfaces.md`](../interfaces.md), [`../phases/`](../phases/)). This folder says **what changes on each
page/screen** — every route in the app, every area of the new shell, and every panel the HVAC, LVGL and LCD
documents put inside it.

| Document | Covers | Pages/panels |
|---|---|---|
| [`app-routes.md`](./app-routes.md) | every route in the app + impact classification + the chrome each layout gives | **43 routes** |
| [`designer-shell-areas.md`](./designer-shell-areas.md) | the shell itself: top bar, left, canvas, right, status, dock + all its states and dialogs | 6 areas + 9 states |
| [`hvac-document.md`](./hvac-document.md) | the HVAC drawing document, panel by panel (incl. the real engine property surface) | 7 panels |
| [`lvgl-document.md`](./lvgl-document.md) | the LVGL/EEZ document, panel by panel (all 30 factory panels + 11 editor types) | 30 panels |
| [`lcd-document.md`](./lcd-document.md) | the LCD/simulator document (P5) | 6 areas |
| [`design-hub.md`](./design-hub.md) | the Design Hub family — the main entry point into the designer pages | 2 pages + 11 dialogs/panels |

## How to read the change marks

Every page/panel block carries a **status** and a **change list**:

| Mark | Meaning |
|---|---|
| `UNCHANGED` | no code change; the page keeps working exactly as today |
| `LINK-ONLY` | no code change inside the page; its links/data resolve to the new route through the shared registry |
| `MOD` | this file changes |
| `NEW` | new file |
| `MOVED` | the code moves (extracted) rather than being rewritten |
| `RETIRED` | the code stops being reachable from that route (after P4) |
| `FIX-OPPORTUNITY` | a pre-existing defect found while designing, worth fixing in the same pass |

## Three cross-cutting findings that shape every page

1. **`MinimalLayout` gives a page a 32 px menu bar and nothing else** (`layout/MinimalLayout.tsx:37, 69`;
   `100vh − 33px` of content, no padding). The three designer routes live there, so the shell must supply
   its own top bar, status bar and panel chrome — it cannot reuse `PageHeader` (rendered only by
   `MainLayout.tsx:203`).
2. **`#page-header-actions` exists only under `MainLayout`** (`PageHeader.tsx:198`). Any page that portals
   into it silently loses that UI under `MinimalLayout`. `Tstat10SimulatorPage.tsx:298-330` **does** portal
   the Design/View toggle there and has no fallback → *that toggle does not render today*. This is a
   `FIX-OPPORTUNITY` the Designer shell resolves by design (the shell owns its top bar).
3. **The EEZ panel set is bigger and differently arranged than "left = navigation, right = properties"**:
   the *left border* holds Texts/Scpi/Instrument-commands/IEXT/Changes, the *root left column* holds
   Pages/Widgets/Actions + Palette + Widgets Structure, the *root right tabset* holds Properties (and the
   Palette when the user setting moves it there), and the *right border* holds
   Styles/Fonts/Bitmaps/Themes/LVGL-groups/Breakpoints/Variables. See [`lvgl-document.md`](./lvgl-document.md) §2.
   (The earlier per-phase docs are corrected by that document.)
