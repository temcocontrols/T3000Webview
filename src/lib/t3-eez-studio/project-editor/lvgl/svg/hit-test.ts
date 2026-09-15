/**
 * LVGL 9 SVG renderer — pointer hit-testing (P4).
 *
 * ADDITIVE: new file, and deliberately **pure**: it takes a DOM element and returns plain data, so
 * the selection semantics can be unit-tested without a browser or an editor.
 *
 * The SVG surface renders one `<g data-ptr="<lvgl ptr>" data-objid="<project objID>">` per LVGL
 * object, so hit-testing is the browser's own: whatever element the pointer landed on, walking up to
 * the nearest annotated group identifies the object. No coordinate maths, no LVGL round-trip — which
 * is the advantage the DOM substrate has over the canvas (where widgets have no DOM presence at all,
 * so there is nothing to click).
 *
 * Turning the hit into a selection is the caller's job, because that needs the editor's document and
 * view state (see `LVGLSvgPage`).
 */

/** The subset of a pointer event this module cares about. */
export interface PointerModifiers {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
}

/** What a click should do to the selection. */
export type SelectionAction =
    /** Plain click on an object: it becomes the only selection. */
    | "replace"
    /** Modifier click on an unselected object: add it to the selection. */
    | "add"
    /** Modifier click on an already-selected object: remove it from the selection. */
    | "toggle"
    /** Click on empty space: clear the selection. */
    | "clear";

/** What the pointer landed on. */
export interface PointerHit {
    /** LVGL object pointer, when the group carried `data-ptr`. */
    ptr?: number;
    /** Project widget objID, when the group carried `data-objid`. */
    objId?: string;
}

/** True when the event carries a modifier that makes the click additive. */
export function isAdditiveClick(modifiers: PointerModifiers): boolean {
    return !!(modifiers.ctrlKey || modifiers.metaKey || modifiers.shiftKey);
}

/**
 * Decide what the click means.
 *
 * Additive clicks toggle, which is what every editor does: ctrl-clicking something already selected
 * removes it, so a user can build a selection and correct it without starting over.
 */
export function selectionAction(
    modifiers: PointerModifiers,
    alreadySelected: boolean
): SelectionAction {
    if (!isAdditiveClick(modifiers)) {
        return "replace";
    }
    return alreadySelected ? "toggle" : "add";
}

/**
 * Walk up from the element under the pointer to the nearest object group.
 *
 * Everything in the scene lives inside such a group (parts are plain shapes, not annotations), so
 * `closest` is enough. Returns `undefined` for the background, the overlay, or nothing at all —
 * which the caller reads as "click on empty space".
 */
export function hitTestElement(
    element: Element | null | undefined
): PointerHit | undefined {
    if (!element || typeof element.closest !== "function") {
        return undefined;
    }
    const node = element.closest("[data-ptr]");
    if (!node) {
        return undefined;
    }
    const rawPtr = node.getAttribute("data-ptr");
    const parsed = rawPtr != null && rawPtr !== "" ? Number(rawPtr) : NaN;
    const objId = node.getAttribute("data-objid") || undefined;
    const ptr = Number.isFinite(parsed) ? parsed : undefined;
    if (ptr === undefined && objId === undefined) {
        return undefined;
    }
    return { ptr, objId };
}

/**
 * The selection after applying an action, as ids. Kept pure so the caller only has to map ids to
 * adapters and hand them to the existing `viewState`.
 *
 * `current` is the list of already-selected object ids; `id` is the clicked object (`undefined` for a
 * click on empty space, which clears).
 */
export function nextSelection(
    action: SelectionAction,
    current: string[],
    id: string | undefined
): string[] {
    switch (action) {
        case "clear":
            return [];
        case "replace":
            return id ? [id] : [];
        case "add":
            return id && current.indexOf(id) === -1 ? [...current, id] : [...current];
        case "toggle":
            return id
                ? current.indexOf(id) === -1
                    ? [...current, id]
                    : current.filter(selected => selected !== id)
                : [...current];
    }
}
