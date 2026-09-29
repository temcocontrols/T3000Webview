/**
 * Which T3000 "view" the user chose — the shared contract between the **classic** Vue app (`/#/`) and the
 * **new** React app (`/#/t3000/…`).
 *
 * Why `localStorage`: the two views are served from one bundle. The classic Vue app boots first, and the
 * React app is only mounted when the hash starts with `/t3000` (see `src/shared/routes.ts` → `getActiveApp`,
 * and `src/boot/react.tsx`), so the choice has to survive a full document reload and be readable from
 * either side.
 *
 * ## Storage contract
 *
 * Mirrored by the inline redirect in `index.html` — that runs before the bundle and cannot import TS, so
 * **changing a key here means changing it there too**.
 *
 *   `localStorage['t3.ui.flavor']`       `'classic' | 'new'` — written only when the user ticks
 *                                        *Don't ask me again*; the startup redirect then honours it with
 *                                        no question asked.
 *   `sessionStorage['t3.ui.choiceDone']` `'1'` — written on **every** choice, so an unticked *remember*
 *                                        asks again on the next launch instead of looping within one
 *                                        session (choose → `/` → asked again → …).
 *
 * Nothing here imports Vue or React: the classic app's future *Help ▸ Switch View* entry can use it as-is.
 */

export type UiFlavor = "classic" | "new";

export const UI_FLAVOR_STORAGE_KEY = "t3.ui.flavor";
export const UI_FLAVOR_SESSION_KEY = "t3.ui.choiceDone";

/** The classic (Vue) app — what T3000 has always opened. */
export const CLASSIC_VIEW_HASH = "#/";

/** The new (React) app. */
export const NEW_VIEW_HASH = "#/t3000/";

/**
 * The switcher page itself. It lives **inside the React app** (bare route, no layout) because `#/t3000/…`
 * is what makes `getActiveApp()` report `react` — the Vue side therefore needs no page of its own.
 */
export const SWITCH_VIEW_HASH = "#/t3000/ui-switch";

/** The remembered choice, or `null` when the user never ticked "Don't ask me again". */
export function readUiFlavor(): UiFlavor | null {
    try {
        const value = localStorage.getItem(UI_FLAVOR_STORAGE_KEY);
        return value === "classic" || value === "new" ? value : null;
    } catch {
        return null;
    }
}

export function writeUiFlavor(flavor: UiFlavor): void {
    try {
        localStorage.setItem(UI_FLAVOR_STORAGE_KEY, flavor);
    } catch {
        /* private mode / storage disabled — the choice simply is not remembered */
    }
}

export function clearUiFlavor(): void {
    try {
        localStorage.removeItem(UI_FLAVOR_STORAGE_KEY);
    } catch {
        /* nothing to do */
    }
}

/** Called on every choice, remembered or not (see the contract above). */
export function markChoiceMadeThisSession(): void {
    try {
        sessionStorage.setItem(UI_FLAVOR_SESSION_KEY, "1");
    } catch {
        /* nothing to do */
    }
}

export function hasChosenThisSession(): boolean {
    try {
        return sessionStorage.getItem(UI_FLAVOR_SESSION_KEY) === "1";
    } catch {
        return false;
    }
}

export function hashOf(flavor: UiFlavor): string {
    return flavor === "new" ? NEW_VIEW_HASH : CLASSIC_VIEW_HASH;
}

/** The base the two views share, for showing the addresses on the switcher page. */
export function viewBaseUrl(): string {
    if (typeof window === "undefined") {
        return "";
    }
    return `${window.location.origin}${window.location.pathname}`;
}

/**
 * Switch views.
 *
 * The URL is rewritten with **`history.replaceState` and then the document reloads** — neither a plain hash
 * change nor a hash change plus a reload. Both of those are wrong, and each was measured on this app:
 *
 *  · a plain hash change makes the Vue router lazy-import `ReactContainer.vue` and mount React in place, but
 *    the React mount point is a **module-level singleton** (`isInitialized` in `src/boot/react.tsx` is set
 *    once and never reset), so switching back and forth inside one document leaves the new view **blank**;
 *  · setting the hash and reloading straight away starts that same lazy import and then tears the document
 *    down mid-flight, which surfaces as
 *    *"TypeError: error loading dynamically imported module: …/ReactContainer.vue"* plus the router's
 *    "Avoided redundant navigation to current location".
 *
 * `replaceState` fires no event either router listens to, so nothing loads until the reload — after which the
 * boot in `src/boot/react.tsx` / `src/shared/routes.ts` mounts the right app from a clean module state.
 */
export function gotoFlavor(flavor: UiFlavor): void {
    switchView(hashOf(flavor));
}

/** Rewrite the hash without firing a navigation, then reload into it. See `gotoFlavor`. */
export function switchView(hash: string): void {
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}${hash}`);
    window.location.reload();
}
