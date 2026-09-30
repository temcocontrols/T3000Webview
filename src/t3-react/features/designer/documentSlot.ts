/**
 * Designer — the document slot (the bridge between the layout and the open document).
 *
 * The areas of the designer (top / left / middle / right / bottom / status) are owned by
 * `layout/DesignerLayout.tsx`, which is a **route-level layout**: it exists before, and independently
 * of, whichever document is open. The *content* of those areas is decided by the document mounted in
 * the middle area, so the two directions are separated in time:
 *
 *   document → layout   `publishDesignerDocument()` — the document's `LayoutSpec` + title + status.
 *   layout   → document `useDesignerFrameReady()`   — "the areas exist now, you may touch the DOM".
 *
 * Both are published/consumed through this store rather than props, because a route layout cannot
 * pass props to its `<Outlet/>`.
 *
 * Two rules this module exists to enforce:
 *
 *  1. **Publishing happens in a layout effect.** React flushes layout effects before painting, so the
 *     layout re-renders the areas in the same frame — opening an LCD after an HVAC never paints the
 *     HVAC panels for a moment.
 *  2. **An entry is rejected when its key does not match the route.** A document that is being
 *     replaced (kind change) keeps its old entry for one render; the layout compares keys, so stale
 *     panels can never be drawn from another document.
 *
 * Documents that must resolve DOM (engine containers, portal targets) gate on `useDesignerFrameReady`:
 * the areas are committed one pass *after* the document mounts, and only the layout knows when.
 */
import { useSyncExternalStore } from "react";
import type { DocumentAdapter, DocumentRuntime } from "./DocumentAdapter";
import type { DocumentKind } from "./kinds";

export interface DesignerDocumentEntry {
    /** Route identity: `${kind}` or `${kind}:${id}` — see `designerDocumentKey`. */
    key: string;
    adapter: DocumentAdapter;
    runtime: DocumentRuntime;
}

/** The single place that mints a document key. `documentKey(kind)` and `documentKey(kind, id)`. */
export function designerDocumentKey(kind: DocumentKind, id?: string): string {
    return id ? `${kind}:${id}` : kind;
}

/* ------------------------------------------------------------------ document entry */

let entry: DesignerDocumentEntry | null = null;
const entryListeners = new Set<() => void>();

/**
 * Would these two entries draw the same frame?
 *
 * `DesignerLayout` re-renders the middle area — and therefore the document inside it — whenever the
 * slot changes, and a document that re-renders (a poll, a status tick) hands over a **new `runtime`
 * object** every time. Publishing that would re-render the document, which hands over another new
 * object … i.e. an unbounded layout ⇄ document loop, which is exactly how this store was first
 * broken (`Maximum update depth exceeded`, or worse: a frame that never receives the document).
 *
 * So only a change the layout can actually draw is published: the same `layout` object, the same
 * title/subtitle/dirty flag, the same status scalars, and the same *presence* of a loading or error
 * state — a fresh element identity for those is not a change worth a frame.
 */
function drawsTheSame(a: DesignerDocumentEntry | null, b: DesignerDocumentEntry | null): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if (a.key !== b.key || a.adapter !== b.adapter) {
        return false;
    }
    if (a.runtime === b.runtime) {
        return true;
    }

    const left = a.runtime;
    const right = b.runtime;
    if (left.layout !== right.layout) {
        return false;
    }
    if (left.title !== right.title || left.subtitle !== right.subtitle || left.modified !== right.modified) {
        return false;
    }
    if (!!left.loading !== !!right.loading || !!left.error !== !!right.error) {
        return false;
    }

    const sl = left.status;
    const sr = right.status;
    if (sl === sr) {
        return true;
    }
    if (!sl || !sr) {
        return !sl && !sr;
    }
    return (
        sl.name === sr.name &&
        sl.coords === sr.coords &&
        sl.size === sr.size &&
        sl.zoom === sr.zoom &&
        sl.saved === sr.saved &&
        sl.errors === sr.errors &&
        sl.warnings === sr.warnings &&
        sl.message === sr.message
    );
}

/**
 * Publishes the document's layout. Entries that would draw the same frame are dropped (see
 * `drawsTheSame`), so a document cannot re-render the layout by re-rendering itself.
 */
export function publishDesignerDocument(next: DesignerDocumentEntry | null): void {
    if (drawsTheSame(entry, next)) {
        return;
    }
    entry = next;
    entryListeners.forEach((listener) => listener());
}

export function subscribeDesignerDocument(listener: () => void): () => void {
    entryListeners.add(listener);
    return () => {
        entryListeners.delete(listener);
    };
}

export function getDesignerDocument(): DesignerDocumentEntry | null {
    return entry;
}

/** The entry published by the document that is mounted right now (null before it publishes). */
export function useDesignerDocument(): DesignerDocumentEntry | null {
    return useSyncExternalStore(subscribeDesignerDocument, getDesignerDocument, getDesignerDocument);
}

/** Test/secondary helper: is this key the one currently published? */
export function isDesignerDocumentPublished(key: string): boolean {
    return entry?.key === key;
}

/**
 * Clears the slot **only if it still holds this document's entry**.
 *
 * Called from a document's unmount cleanup. A plain "publish null" would be wrong twice over: it
 * would clear the entry of the document that is replacing this one (a kind switch publishes the new
 * entry before the old one's teardown runs), and — because the layout's tree shape must not change
 * with the slot — an empty slot would remount the whole frame, engine included.
 */
export function releaseDesignerDocument(key: string): void {
    if (entry?.key !== key) {
        return;
    }
    entry = null;
    entryListeners.forEach((listener) => listener());
}

/* ------------------------------------------------------------------ frame readiness */

let frameReadyKey: string | null = null;
const readyListeners = new Set<() => void>();

/**
 * Called by the layout once it has committed the areas for `key` (null when there are none). The
 * document may then read/measure the frame's DOM — `#svg-area`-style engine containers and portal
 * targets live there.
 */
export function setDesignerFrameReady(key: string | null): void {
    if (frameReadyKey === key) {
        return;
    }
    frameReadyKey = key;
    readyListeners.forEach((listener) => listener());
}

export function subscribeDesignerFrameReady(listener: () => void): () => void {
    readyListeners.add(listener);
    return () => {
        readyListeners.delete(listener);
    };
}

export function isDesignerFrameReady(key: string): boolean {
    return frameReadyKey === key;
}

/**
 * True once the designer's areas have been committed for this document.
 *
 * Guards that depend on it (HVAC's engine container ids, the LCD page's portal targets) must re-run
 * when it flips; it deliberately returns a boolean, so it is a stable `useSyncExternalStore`
 * snapshot.
 */
export function useDesignerFrameReady(key: string): boolean {
    return useSyncExternalStore(
        subscribeDesignerFrameReady,
        () => frameReadyKey === key,
        () => false
    );
}
