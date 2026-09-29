# Switching between Classic View and New View

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
4. **Changing later**: *Help ▸ Switch View* in the new view; the notice bar at the top of the classic home
   page in the classic view. Both open the same switcher page.
5. If the new interface ever gets in the way, the way back is always the same: the notice bar / Help menu
   entry, or simply `http://localhost:9103/#/`.

The T3000 help/update flow is untouched — updating T3000 changes nothing about how the views are chosen.

## Where it lives in the code

| File | Role |
|---|---|
| `index.html` | The startup decision (inline script, runs before any bundle): a remembered `new` goes straight to `#/t3000/`; otherwise the classic app is left alone, except that a first run is sent to the switcher page **once per session**. |
| `src/shared/uiFlavor.ts` | The storage contract and navigation — `localStorage['t3.ui.flavor']` (`classic` / `new`), `sessionStorage['t3.ui.choiceDone']`, the three hashes, and `gotoFlavor()` (hash change **plus** reload: which app is mounted is decided once, at boot). |
| `src/t3-react/features/ui-switch/pages/UiSwitchPage.tsx` | The switcher page itself (React + Fluent UI), registered as a **bare** route — no menu bar, no device tree. |
| `src/t3-react/app/App.tsx` | The `/t3000/ui-switch` route. |
| `src/t3-react/config/menuConfig.ts` | *Help ▸ Switch View* (shared by the main app, Design Hub, the HVAC designer and the simulator menus, plus the EEZ menu set). |
| `src/t3-vue/pages/HvacDrawer/IndexPage.vue` | The notice bar on the classic home page — the entry point for a customer who never leaves the classic view. |

Keys are duplicated in `index.html` and in `IndexPage.vue` (neither can import the TS module) — **change them
in all three places.**

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
> **To switch later:** in the New View, use *Help ▸ Switch View*. In the Classic View, click **Try New View**
> in the bar at the top of the screen, or open `http://localhost:9103/#/t3000/` directly. To go back to the
> Classic View: *Help ▸ Switch View* → **Open Classic View**, or open `http://localhost:9103/#/`.
>
> The new interface is a preview: if something does not work the way you expect, switch back to the Classic
> View and tell us what happened — that is exactly the feedback we need before it becomes the default.
