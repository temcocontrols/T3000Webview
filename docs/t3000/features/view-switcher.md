# Switching between Classic View and New View

> ## PARKED 2026-09-30 — nothing on this page runs today
>
> The automatic *Choose your view* chooser is the wrong shape for what T3000 actually needs. The agreed
> replacement is **explicit**: a **WEBVIEW** button in the T3000 app (Chrome icon) that opens the webview, and
> inside the webview a matching **WIN11** item in the menu system whose tooltip reads
> *"Back to the Windows T3000.exe"*. Both icons get hover tooltips.
>
> Everything below is therefore **commented out, not deleted** — the design and its measured history are kept
> for the successor and for anyone who has to reason about the old keys:
>
> | Disabled | Where |
> |---|---|
> | the startup decision / first-run redirect | `index.html` (inline script, inside an HTML comment) |
> | the in-page `hashchange` guard | `src/boot/react.tsx` (import + call) |
> | the `/t3000/ui-switch` route | `src/t3-react/app/App.tsx` (lazy import + `<Route>`) |
> | *Help Switch View* (both menu sets) | `src/t3-react/config/menuConfig.ts` |
> | the classic notice bar | already removed 2026-09-30 |
>
> Consequences today: `#/` always opens the **classic** app (nothing redirects, no question is asked), and
> `#/t3000/ui-switch` no longer has a route — it falls through to the `/t3000` shell. `src/shared/uiFlavor.ts`
> and `src/t3-react/features/ui-switch/pages/UiSwitchPage.tsx` are left in place, unreferenced, so restoring is
> an uncomment in the five places above. Stored `t3.ui.flavor` / `t3.ui.choiceDone` values become inert.
>
> The rest of this page describes the parked feature as built.

T3000 ships **one** WebView bundle that contains two interfaces. Which one loads is decided from the URL,
and the user's choice is remembered between launches.

| URL | View |
|---|---|
| `http://localhost:9103/` (or `#/`) | **Classic View** — the interface T3000 has always opened (the Vue/Quasar app) |
| `http://localhost:9103/#/t3000/` | **New View** — the modernized interface (Dashboard, Trend Logs, Design Hub, Designer) |
| `http://localhost:9103/#/t3000/ui-switch` | The **switcher page** — asks which view to use and explains how to change it later |

## What a user sees

1. **First launch** (nothing chosen yet): opening T3000 lands on the switcher page —
   *Choose your view* → **Classic View** or **New View** (marked *Preview*), with a
   *Don't ask me again* checkbox (ticked by default).
2. **After choosing with the box ticked**: T3000 opens that view directly, with no question.
3. **After choosing with the box unticked**: it opens the chosen view now, and asks again on the next launch.
4. **Changing later**: *Help Switch View* in the new view opens the switcher page. The classic view has **no
   banner** of its own (one was removed on 2026-09-30 at the user's request) — the switcher is reached there by
   URL: `http://localhost:9103/#/t3000/ui-switch`.
5. If the new interface ever gets in the way, the way back is always the same: *Help Switch View* →
   **Open Classic View**, or simply `http://localhost:9103/#/`.

The T3000 help/update flow is untouched — updating T3000 changes nothing about how the views are chosen.

## Where it lives in the code

| File | Role |
|---|---|
| `index.html` | The startup decision (inline script, runs before any bundle): a remembered `new` goes straight to `#/t3000/`; otherwise the classic app is left alone, except that a first run is sent to the switcher page **once per session**. |
| `src/shared/uiFlavor.ts` | The storage contract and navigation — `localStorage['t3.ui.flavor']` (`classic` / `new`), `sessionStorage['t3.ui.choiceDone']`, the three hashes, `gotoFlavor()` (hash change **plus** reload: which app is mounted is decided once, at boot) and `installUiFlavorHashGuard()`. |
| `src/boot/react.tsx` | Installs the hash guard — a boot file runs on every document, in both apps. |
| `src/t3-react/features/ui-switch/pages/UiSwitchPage.tsx` | The switcher page itself (React + Fluent UI), registered as a **bare** route — no menu bar, no device tree. |
| `src/t3-react/app/App.tsx` | The `/t3000/ui-switch` route. |
| `src/t3-react/config/menuConfig.ts` | *Help Switch View* (shared by the main app, Design Hub, the HVAC designer and the simulator menus, plus the EEZ menu set). |

Keys are duplicated in `index.html` and in `src/shared/uiFlavor.ts` (the startup script cannot import the TS
module) — **change them in both places.**

### Two enforcement points, one rule

The rule ("no remembered flavor **and** no choice this session → ask") is enforced twice, because the startup
script can only ever see a **document load**:

1. `index.html` — at load, before any bundle runs.
2. `installUiFlavorHashGuard()` — on `hashchange`, for **in-page** navigation to the classic root (typing `#/`,
   following a link, or the classic app's own *Home*). Without it, that navigation showed the classic app to a
   user who had never chosen anything, because nothing reloads the document to re-run the startup script.

The guard only ever intercepts the classic **root** — deep links such as `#/hvac/t2` or `#/t3000/…` are left
alone — and what it does there is the *same decision* the startup script makes (`resolveClassicRootRedirect()`),
so a reload and an in-page navigation can never disagree:

| Stored state | Where `#/` goes |
|---|---|
| remembered **New** | `#/t3000/` — identical to what a reload does |
| remembered **Classic** | the classic app, left alone |
| nothing remembered, already asked this session | the classic app, left alone (this is what stops *Open Classic View* bouncing back to the switcher) |
| nothing remembered, never asked | the switcher |

## Draft forum post

> **A new T3000 interface is available — try it, and switch back any time**
>
> When you update T3000 and open it as usual, you will now see a short question: **Choose your view**.
>
> - **Classic View** — the T3000 interface you already use. Nothing has changed about it.
> - **New View** *(Preview)* — the modernized interface, with the new Dashboard, Trend Logs, Design Hub and
>   the Designer for HVAC / LVGL / LCD graphics.
>
> Pick one and leave the *Don't ask me again* box ticked, and T3000 will open that view from then on. Both
> views control the same T3000 system — the same devices, points, programs and drawings — so you can switch
> whenever you like without losing anything.
>
> **To switch later:** in the New View, use *Help Switch View*. From the Classic View, open the switcher page
> at `http://localhost:9103/#/t3000/ui-switch`, or `http://localhost:9103/#/t3000/` for the New View directly —
> the classic UI itself carries no banner. To go back to the Classic View: *Help Switch View* →
> **Open Classic View**, or open `http://localhost:9103/#/`.
>
> The new interface is a preview: if something does not work the way you expect, switch back to the Classic
> View and tell us what happened — that is exactly the feedback we need before it becomes the default.
