/**
 * P4 tests: pointer hit-testing, selection semantics, and the selection overlay.
 *
 * All three modules are pure, so the interaction contract is pinned here rather than in the browser.
 * What the *editor* does with those clicks — drag, resize, marquee, undo — is described in
 * `docs/t3000/architecture/lvgl-svg/editor-integration.md` §7 and covered by the live checks recorded
 * there, because it lives outside this surface.
 */

import { describe, expect, it } from "vitest";
import {
    hitTestElement,
    isAdditiveClick,
    nextSelection,
    selectionAction,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/hit-test";
import { renderSelectionOverlay } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/overlay";
import type { SceneObject } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";

const SVG_NS = "http://www.w3.org/2000/svg";

/** `<svg><g data-ptr data-objid><rect/></g></svg>` — the shape the renderer emits. */
function buildSceneDom(ptr: number, objId: string) {
    const svg = document.createElementNS(SVG_NS, "svg");
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("data-ptr", String(ptr));
    group.setAttribute("data-objid", objId);
    group.setAttribute("data-type", "label");
    const shape = document.createElementNS(SVG_NS, "rect");
    const text = document.createElementNS(SVG_NS, "text");
    const tspan = document.createElementNS(SVG_NS, "tspan");
    text.appendChild(tspan);
    group.appendChild(shape);
    group.appendChild(text);
    svg.appendChild(group);
    document.body.appendChild(svg);
    return { svg, group, shape, tspan };
}

describe("hit-test — resolving the pointer target", () => {
    it("resolves a part shape to its object group", () => {
        const { shape } = buildSceneDom(1234, "label1");
        expect(hitTestElement(shape)).toEqual({ ptr: 1234, objId: "label1" });
    });

    it("resolves a text tspan nested inside the part to the same object", () => {
        // Text lives in <text><tspan>, so the pointer usually lands two levels below the group.
        const { tspan } = buildSceneDom(99, "label2");
        expect(hitTestElement(tspan)).toEqual({ ptr: 99, objId: "label2" });
    });

    it("resolves the group itself", () => {
        const { group } = buildSceneDom(7, "panel1");
        expect(hitTestElement(group)).toEqual({ ptr: 7, objId: "panel1" });
    });

    it("returns undefined for the surface background and for nothing", () => {
        const { svg } = buildSceneDom(1, "a");
        expect(hitTestElement(svg)).toBeUndefined();
        expect(hitTestElement(null)).toBeUndefined();
        expect(hitTestElement(undefined)).toBeUndefined();
    });

    it("still reports the object when only the objID is present", () => {
        const svg = document.createElementNS(SVG_NS, "svg");
        const group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("data-ptr", "5");
        group.setAttribute("data-objid", "onlyId");
        svg.appendChild(group);
        expect(hitTestElement(group)).toEqual({ ptr: 5, objId: "onlyId" });
    });
});

describe("hit-test — what a click means", () => {
    it("treats a plain click as a replacement", () => {
        expect(selectionAction({}, false)).toBe("replace");
        expect(selectionAction({}, true)).toBe("replace");
    });

    it("treats ctrl/meta/shift as additive", () => {
        expect(isAdditiveClick({ ctrlKey: true })).toBe(true);
        expect(isAdditiveClick({ metaKey: true })).toBe(true);
        expect(isAdditiveClick({ shiftKey: true })).toBe(true);
        expect(isAdditiveClick({})).toBe(false);
        // Adding to a selection...
        expect(selectionAction({ ctrlKey: true }, false)).toBe("add");
        // ...and correcting one: modifier on an already-selected object removes it.
        expect(selectionAction({ ctrlKey: true }, true)).toBe("toggle");
        expect(selectionAction({ shiftKey: true }, true)).toBe("toggle");
    });
});

describe("hit-test — the resulting selection", () => {
    it("plain click selects only the clicked object", () => {
        expect(nextSelection("replace", ["b"], "a")).toEqual(["a"]);
    });

    it("modifier click adds without disturbing the rest", () => {
        expect(nextSelection("add", ["b", "c"], "a")).toEqual(["b", "c", "a"]);
        // Adding something already there is a no-op, not a duplicate.
        expect(nextSelection("add", ["a"], "a")).toEqual(["a"]);
    });

    it("modifier click on a selected object removes it", () => {
        expect(nextSelection("toggle", ["a", "b"], "a")).toEqual(["b"]);
        expect(nextSelection("toggle", ["a", "b"], "c")).toEqual(["a", "b", "c"]);
    });

    it("empty-space click clears the selection", () => {
        expect(nextSelection("clear", ["a", "b"], undefined)).toEqual([]);
    });

    it("never mutates the array it is given", () => {
        const current = ["a"];
        nextSelection("add", current, "b");
        nextSelection("toggle", current, "a");
        nextSelection("clear", current, undefined);
        expect(current).toEqual(["a"]);
    });
});

const OBJECTS: SceneObject[] = [
    {
        ptr: 1,
        index: 0,
        type: "screen",
        area: { x: 0, y: 0, w: 480, h: 320 },
        parts: [],
    },
    {
        ptr: 2,
        index: 1,
        type: "label",
        area: { x: 10, y: 20, w: 100, h: 30 },
        parts: [],
    },
];

describe("overlay — selection frame", () => {
    it("draws nothing when nothing is selected", () => {
        expect(renderSelectionOverlay(OBJECTS, new Set())).toEqual([]);
    });

    it("frames the selected object", () => {
        const nodes = renderSelectionOverlay(OBJECTS, new Set([2]));
        expect(nodes.map(n => n.key)).toEqual(["sel-2-halo", "sel-2-outline"]);
    });

    it("uses the scene area verbatim", () => {
        const [halo, outline] = renderSelectionOverlay(OBJECTS, new Set([2]));
        expect(halo.attrs!.x).toBe(10);
        expect(halo.attrs!.y).toBe(20);
        expect(halo.attrs!.width).toBe(100);
        expect(outline.attrs!.height).toBe(30);
        expect(outline.attrs!.fill).toBe("none");
    });

    it("never swallows clicks", () => {
        /*
         * The frame sits above the scene in document order, so every node it draws must be
         * pointer-transparent — otherwise the first click would select and every later click would land
         * on the overlay.
         *
         * The interactive chrome (drag hotspot, resize handles, marquee band, snap lines) is the flow
         * editor's, not this file's: `EezStudio_FlowEditorSelection` draws it above this surface, which
         * is why dragging, resizing, marquee-selecting and undoing on the SVG behave exactly as they do
         * on the canvas. Drawing a second set of handles here would promise a resize that can never
         * happen, because the editor's layer takes the pointer first.
         */
        const nodes = renderSelectionOverlay(OBJECTS, new Set([1, 2]), { hoverPtr: 1 });
        expect(nodes.length).toBeGreaterThan(0);
        for (const node of nodes) {
            expect(node.style!["pointer-events"]).toBe("none");
            // Not even a cursor hint: the editor decides what is grabbable where.
            expect(node.style?.cursor).toBeUndefined();
        }
    });

    it("frames every selected object", () => {
        const keys = renderSelectionOverlay(OBJECTS, new Set([1, 2])).map(n => n.key);
        expect(keys).toContain("sel-1-outline");
        expect(keys).toContain("sel-2-outline");
    });

    it("skips objects the scene does not contain rather than guessing", () => {
        // A selected widget LVGL never created has no area, so nothing can be drawn for it.
        expect(renderSelectionOverlay(OBJECTS, new Set([999]))).toEqual([]);
    });

    it("shows a hover preview without handles", () => {
        const nodes = renderSelectionOverlay(OBJECTS, new Set(), { hoverPtr: 2 });
        expect(nodes.map(n => n.key)).toEqual(["sel-2-halo", "sel-2-outline"]);
    });

    it("does not draw a hover frame for an already-selected object", () => {
        const nodes = renderSelectionOverlay(OBJECTS, new Set([2]), { hoverPtr: 2 });
        // One frame, not an extra hover pair.
        expect(nodes).toHaveLength(2);
    });
});
