/**
 * LVGL 9 SVG renderer — selection overlay (P4).
 *
 * ADDITIVE: new file, and **pure**: it maps "which objects are selected" to a draw tree, so the
 * geometry is unit-testable and the component stays a thin adapter.
 *
 * The overlay is a sibling of `#content` (`<g id="overlay">`), so it paints above the scene and is
 * never touched by a scene patch. Its coordinates are page coordinates, which are also SVG user
 * coordinates (the root `viewBox` is `0 0 pageWidth pageHeight`), so an object's rect can be used
 * as-is — no transform maths, unlike the canvas path which would have to project through the
 * viewport transform.
 *
 * ## What it deliberately does *not* draw
 *
 * The interactive chrome — the drag hotspot, the resize handles and the marquee band — belongs to the
 * flow editor, not to this surface. The editor renders one `EezStudio_ComponentEnclosure` per widget
 * (from the model's own rects) plus an `EezStudio_FlowEditorSelection` overlay, and its mouse handlers
 * work against those regardless of which substrate paints the pixels: drag-move, resize, marquee,
 * snap lines and undo all apply to the SVG surface exactly as they do to the canvas one. Measured:
 * dragging a switch on this surface wrote `left/top` 196,48 → 221,60 into the model and produced one
 * "Changed (Left, Top)" undo step. Drawing a second, inert set of handles here promised a resize that
 * could never happen, because the editor's overlay sits above this group and takes the pointer first.
 *
 * So this draws the things that are this surface's own: a frame showing what the *scene* says is
 * selected (the anchor for the fidelity harness's per-object rows, and the visual truth while
 * debugging the renderer) and a hover preview. Both are pointer-transparent.
 */

import type { DrawNode } from "./svg-sink";
import type { SceneObject, SceneRect } from "./scene";

export interface SelectionOverlayStyle {
    /** Main outline colour. */
    outline?: string;
    /** Halo drawn under the outline, so the line reads on any background. */
    halo?: string;
    /** Handle fill. */
    handle?: string;
    /** Handle edge colour. */
    handleBorder?: string;
    /** Handle size in page units. */
    handleSize?: number;
    /** Outline stroke width in page units. */
    strokeWidth?: number;
}

type PaintStyle = Required<SelectionOverlayStyle>;

const DEFAULTS: PaintStyle = {
    outline: "#1e88e5",
    halo: "#ffffff",
    handle: "#ffffff",
    handleBorder: "#1e88e5",
    handleSize: 7,
    strokeWidth: 1,
};

/**
 * Interaction is handled by the scene and the editor, never by the overlay.
 *
 * The frame sits above the scene in document order, so every node it draws is pointer-transparent:
 * otherwise the first click would select and every later click would land on the overlay.
 */
const OVERLAY_STYLE = { "pointer-events": "none" } as const;

function box(
    key: string,
    area: SceneRect,
    stroke: string | undefined,
    width: number
): DrawNode {
    return {
        key,
        tag: "rect",
        attrs: {
            x: area.x,
            y: area.y,
            width: area.w,
            height: area.h,
            fill: "none",
            stroke,
            "stroke-width": width,
        },
        style: OVERLAY_STYLE,
    };
}

/**
 * Draw tree for the current selection.
 *
 * `objects` is the painted scene (the source of the exact areas LVGL resolved, including any part
 * offsets), `selectedPtrs` decides which of them are outlined. Objects the scene does not contain —
 * for example a widget that LVGL has not created — are skipped rather than guessed at.
 *
 * `hoverPtr` is optional: a light outline that previews what a click would select.
 */
export function renderSelectionOverlay(
    objects: SceneObject[],
    selectedPtrs: ReadonlySet<number>,
    options: SelectionOverlayStyle & { hoverPtr?: number } = {}
): DrawNode[] {
    const style = { ...DEFAULTS, ...options };
    const nodes: DrawNode[] = [];

    for (const object of objects) {
        const isSelected = selectedPtrs.has(object.ptr);
        const isHovered = !isSelected && options.hoverPtr === object.ptr;
        if (!isSelected && !isHovered) {
            continue;
        }

        // A hairline is invisible at 1:1 on a hi-dpi screen, so the frame is always drawn twice:
        // halo under, colour over.
        nodes.push(
            box(`sel-${object.ptr}-halo`, object.area, style.halo, style.strokeWidth * 2)
        );
        nodes.push(
            box(
                `sel-${object.ptr}-outline`,
                object.area,
                isSelected ? style.outline : style.handleBorder,
                style.strokeWidth
            )
        );
    }

    return nodes;
}
