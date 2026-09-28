/**
 * Designer / LVGL — what the current URL asks EEZ to do.
 *
 * PURE MODULE: no React, no DOM, no engine imports (safe to unit test).
 *
 * WHY THIS EXISTS. While the workspace boots, "a project is on its way" and "the designer was opened
 * with nothing to open" look identical from inside the document: neither has a `ProjectStore` yet, so
 * the shell has no panels to render and collapses to a bare title bar — which reads as *"the editor and
 * the panels are gone"*. Telling the two apart is what lets the document stay honest about the wait.
 *
 * Its first consumer was the placeholder regions' label ("Loading project…" vs "No project open").
 * Those labels were removed on 2026-09-24 — the shell shows one `Loading…`, and the five repeated texts
 * made a single wait look like several — so today the document does not call this module at all: the
 * rules below are kept as the written-down contract of what a designer URL asks EEZ to do, and are
 * pinned by `test/vitest/__tests__/designer-lvgl-project-query.test.ts`.
 *
 * The check mirrors `EezStudioApp`'s own hand-off parsing (`app/EezStudioApp.tsx:186-190`: a create
 * needs `new`/`examples=1` *and* a `name`+`location`; an open needs `open`). Keep the two in step.
 *
 * NOTE: the query lives *inside* the hash (`#/t3000/designer/lvgl-9-5?open=…`), so this reads the raw
 * URL text rather than `location.search` — the same trap `EezStudioApp` documents for itself.
 */

/** The query string of a URL or hash; `""` when there is none. */
export function queryOf(href: string): string {
    const at = href.indexOf("?");
    return at >= 0 ? href.slice(at + 1) : "";
}

/** True when the URL asks EEZ to open or create a project (so one is expected to appear). */
export function expectsProject(href: string): boolean {
    const params = new URLSearchParams(queryOf(href));

    const isCreate =
        !!params.get("name") &&
        !!params.get("location") &&
        (!!params.get("new") || params.get("examples") === "1");

    return isCreate || !!params.get("open");
}

/** `expectsProject` for the live page; `false` when there is no window (SSR/tests). */
export function expectsProjectHere(): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    // Hash first (the app's own URLs), then the plain query for anything serving the query directly.
    return expectsProject(window.location.hash || window.location.search);
}
