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
 * Two details matter for it to feel like an editor rather than a debug drawing:
 *
 * - **It must not swallow clicks.** The overlay is above the scene in document order, so every node
 *   it draws sets `pointer-events: none` — otherwise the first click would select and every later
 *   click would land on the overlay.
 * - **It must read on any background.** A single stroke disappears over matching colours, so the
 *   outline is a dark line over a light halo (and vice versa in dark theme).
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

const DEFAULTS: Required<SelectionOverlayStyle> = {
    outline: "#1e88e5",
    halo: "#ffffff",
    handle: "#ffffff",
    handleBorder: "#1e88e5",
    handleSize: 7,
    strokeWidth: 1,
};

/** Interaction is handled by the scene and the editor, never by the overlay. */
const OVERLAY_STYLE = { "pointer-events": "none" } as const;

/** Corners and edge midpoints — the standard eight-handle frame. */
function handlePositions(area: SceneRect): Array<{ x: number; y: number }> {
    const midX = area.x + area.w / 2;
    const midY = area.y + area.h / 2;
    const right = area.x + area.w;
    const bottom = area.y + area.h;
    return [
        { x: area.x, y: area.y },
        { x: midX, y: area.y },
        { x: right, y: area.y },
        { x: right, y: midY },
        { x: right, y: bottom },
        { x: midX, y: bottom },
        { x: area.x, y: bottom },
        { x: area.x, y: midY },
    ];
}

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

        if (!isSelected) {
            // Hover is a preview only — no handles, so it never looks interactive.
            continue;
        }

        const half = style.handleSize / 2;
        handlePositions(object.area).forEach((position, index) => {
            nodes.push({
                key: `sel-${object.ptr}-handle-${index}`,
                tag: "rect",
                attrs: {
                    x: position.x - half,
                    y: position.y - half,
                    width: style.handleSize,
                    height: style.handleSize,
                    fill: style.handle,
                    stroke: style.handleBorder,
                    "stroke-width": style.strokeWidth,
                },
                style: OVERLAY_STYLE,
            });
        });
    }

    return nodes;
}
