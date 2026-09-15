/**
 * LVGL 9 SVG renderer — Scene → SVG draw tree (pure).
 *
 * ADDITIVE: new file.
 *
 * This module is **pure**: it takes a Scene and returns a `RenderOutput` (plain objects).
 * It never touches the DOM, so it is unit-testable without a browser, and it never reads
 * LVGL/WASM — layout truth comes from the scene dump.
 *
 * Model: *style properties over parts*, not per-widget code. Every widget is drawn from its
 * declared parts (MAIN, SCROLLBAR, INDICATOR, KNOB, SELECTED, ITEMS, CURSOR,
 * TEXTAREA_PLACEHOLDER), so an unknown widget type still renders correctly.
 *
 * Draw order per part mirrors LVGL (see docs .../rendering.md §4):
 *   shadow → bg → bgImage → border → outline → content(text/img/line/arc) → post-border
 * Within a part: shape → text → image.
 *
 * KNOWN P2 GAPS (deliberate, tracked in the fidelity scorecard):
 *   - No automatic text wrap/ellipsis: metrics are unavailable without a layout round-trip.
 *     Explicit '\n' lines are honoured.
 *   - Shadow `spread` has no exact SVG analogue (feDropShadow + stroke approximation).
 *   - `blendMode` and `colorFilter` are approximations.
 *   - Animated/procedural widgets (T2/T3) are out of scope until decision D2.
 */

import type { DefNode, DrawNode, RenderOutput } from "./svg-sink";
import type {
    Scene,
    SceneArc,
    SceneBgImage,
    SceneBorder,
    SceneGradient,
    SceneImage,
    SceneLine,
    SceneObject,
    SceneOutline,
    ScenePart,
    SceneRadius,
    SceneRect,
    SceneShadow,
    SceneText,
} from "./scene";
import { alphaOf, degreesOf, zoomOf } from "./scene";

// ---------------------------------------------------------------------------------------
// deterministic def ids
// ---------------------------------------------------------------------------------------

function hashString(input: string): string {
    // FNV-1a, 32-bit — small, stable, and dependency-free.
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(36);
}

/** Collects <defs> entries once per frame, de-duplicated by content. */
class DefCollector {
    private readonly byId = new Map<string, DefNode>();
    /** Same content requested twice in one frame reuses the earlier id. */
    private readonly bySignature = new Map<string, string>();
    /** Existing ids from the previous frame, so ids stay stable across frames. */
    private readonly previousIds = new Set<string>();

    beginFrame(): void {
        this.byId.clear();
        for (const id of this.bySignature.values()) {
            this.previousIds.add(id);
        }
        this.bySignature.clear();
    }

    /** Register a def; returns its `url(#id)` reference. */
    url(kind: string, params: unknown, build: (id: string) => DefNode): string {
        const signature = kind + "|" + JSON.stringify(params);
        let id = this.bySignature.get(signature);
        if (id === undefined) {
            id = "lvgl-" + kind + "-" + hashString(signature);
            this.bySignature.set(signature, id);
            const def = build(id);
            def.id = id;
            this.byId.set(id, def);
            this.previousIds.add(id);
        }
        return `url(#${id})`;
    }

    toArray(): DefNode[] {
        return Array.from(this.byId.values());
    }
}

// ---------------------------------------------------------------------------------------
// geometry helpers
// ---------------------------------------------------------------------------------------

function inset(area: SceneRect, by: number): SceneRect {
    return {
        x: area.x + by,
        y: area.y + by,
        w: Math.max(0, area.w - by * 2),
        h: Math.max(0, area.h - by * 2),
    };
}

function expand(area: SceneRect, by: number): SceneRect {
    return { x: area.x - by, y: area.y - by, w: area.w + by * 2, h: area.h + by * 2 };
}

function radiusCorners(
    radius: SceneRadius | undefined,
    area: SceneRect
): { tl: number; tr: number; br: number; bl: number } {
    const max = Math.max(0, Math.min(area.w, area.h) / 2);
    const clamp = (value: number) => Math.max(0, Math.min(max, value));
    if (radius == null) {
        return { tl: 0, tr: 0, br: 0, bl: 0 };
    }
    if (typeof radius === "number") {
        const r = clamp(radius);
        return { tl: r, tr: r, br: r, bl: r };
    }
    return {
        tl: clamp(radius.tl),
        tr: clamp(radius.tr),
        br: clamp(radius.br),
        bl: clamp(radius.bl),
    };
}

function isUniform(corners: { tl: number; tr: number; br: number; bl: number }): boolean {
    return (
        corners.tl === corners.tr &&
        corners.tr === corners.br &&
        corners.br === corners.bl
    );
}

/** SVG path for a rounded rectangle with independent corner radii. */
function roundedRectPath(area: SceneRect, radius: SceneRadius | undefined): string {
    const { x, y, w, h } = area;
    const { tl, tr, br, bl } = radiusCorners(radius, area);
    return [
        `M${x + tl} ${y}`,
        `H${x + w - tr}`,
        tr ? `A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : "",
        `V${y + h - br}`,
        br ? `A${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : "",
        `H${x + bl}`,
        bl ? `A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : "",
        `V${y + tl}`,
        tl ? `A${tl} ${tl} 0 0 1 ${x + tl} ${y}` : "",
        "Z",
    ]
        .filter(Boolean)
        .join(" ");
}

/**
 * Shape for a rectangle: a plain <rect rx/ry> when the radius is uniform (cheaper to patch),
 * otherwise a <path> so per-corner radii survive.
 */
function rectShape(
    key: string,
    area: SceneRect,
    radius: SceneRadius | undefined,
    attrs: Record<string, string | number | undefined>
): DrawNode {
    const corners = radiusCorners(radius, area);
    if (isUniform(corners)) {
        return {
            key,
            tag: "rect",
            attrs: {
                x: area.x,
                y: area.y,
                width: area.w,
                height: area.h,
                rx: corners.tl || undefined,
                ry: corners.tl || undefined,
                ...attrs,
            },
        };
    }
    return {
        key,
        tag: "path",
        attrs: { d: roundedRectPath(area, radius), ...attrs },
    };
}

function borderSides(side: string | undefined): {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
} {
    // LVGL BORDER_SIDE is a bitmask: NONE/BOTTOM/TOP/LEFT/RIGHT/FULL/INTERNAL. INTERNAL means
    // "draw separators between cells" (matrix-like widgets), which this renderer does not emit —
    // so INTERNAL on its own yields no outer border, while FULL|INTERNAL still draws the frame.
    const value = (side ?? "FULL").toUpperCase();
    if (value === "NONE" || value === "INTERNAL") {
        return { top: false, bottom: false, left: false, right: false };
    }
    if (value === "" || value.indexOf("FULL") !== -1) {
        return { top: true, bottom: true, left: true, right: true };
    }
    return {
        top: value.indexOf("TOP") !== -1,
        bottom: value.indexOf("BOTTOM") !== -1,
        left: value.indexOf("LEFT") !== -1,
        right: value.indexOf("RIGHT") !== -1,
    };
}

function arcPath(
    cx: number,
    cy: number,
    r: number,
    lvglStart: number,
    lvglEnd: number
): string | undefined {
    // LVGL: 0.1° units, 0° at 3 o'clock, and the arc runs from `start` to `end` in the
    // increasing-angle (visually counter-clockwise) direction.
    //
    // Converting to SVG: the point at LVGL angle θ is (cx + r·cosθ, cy − r·sinθ), which is the
    // same as the SVG point at φ = −θ. So increasing LVGL angle means *decreasing* SVG angle,
    // and SVG's sweep-flag must therefore be 0 (negative angle direction). The sweep magnitude
    // is the LVGL delta — computing it in SVG space instead would take the long way round
    // whenever start ≠ 0.
    let sweepTenths = lvglEnd - lvglStart;
    while (sweepTenths <= 0) {
        sweepTenths += 3600;
    }
    sweepTenths = sweepTenths % 3600;
    if (sweepTenths < 0.1) {
        return undefined;
    }
    const sweepDegrees = sweepTenths / 10;

    const rad = (deg: number) => (deg * Math.PI) / 180;
    const startSvg = -lvglStart / 10;
    const endSvg = -lvglEnd / 10;
    const x0 = cx + r * Math.cos(rad(startSvg));
    const y0 = cy + r * Math.sin(rad(startSvg));
    const x1 = cx + r * Math.cos(rad(endSvg));
    const y1 = cy + r * Math.sin(rad(endSvg));
    const largeArc = sweepDegrees > 180 ? 1 : 0;
    return `M${x0} ${y0} A${r} ${r} 0 ${largeArc} 0 ${x1} ${y1}`;
}

function fullCirclePath(cx: number, cy: number, r: number): string {
    return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function fontFamilyOf(fontId: string | undefined): string {
    if (!fontId) {
        return "Montserrat, sans-serif";
    }
    // LVGL built-ins look like lv_font_montserrat_14 / lv_font_unscii_8.
    const builtin = /^lv_font_(?:montserrat|source_han_sans|unscii)/.test(fontId);
    if (builtin) {
        if (fontId.indexOf("unscii") !== -1) {
            return "'unscii', monospace";
        }
        return "Montserrat, sans-serif";
    }
    return `'${fontId}', sans-serif`;
}

function gradientDirection(dir: string | undefined): {
    kind: "linear" | "radial";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
} {
    const value = (dir ?? "BOTTOM").toUpperCase();
    if (value.indexOf("RADIAL") !== -1) {
        return { kind: "radial", x1: 0, y1: 0, x2: 0, y2: 0 };
    }
    switch (value) {
        case "TOP":
            return { kind: "linear", x1: 0, y1: 1, x2: 0, y2: 0 };
        case "LEFT":
            return { kind: "linear", x1: 1, y1: 0, x2: 0, y2: 0 };
        case "RIGHT":
            return { kind: "linear", x1: 0, y1: 0, x2: 1, y2: 0 };
        case "TOP_LEFT":
            return { kind: "linear", x1: 1, y1: 1, x2: 0, y2: 0 };
        case "TOP_RIGHT":
            return { kind: "linear", x1: 0, y1: 1, x2: 1, y2: 0 };
        case "BOTTOM_LEFT":
            return { kind: "linear", x1: 1, y1: 0, x2: 0, y2: 1 };
        case "BOTTOM_RIGHT":
            return { kind: "linear", x1: 0, y1: 0, x2: 1, y2: 1 };
        case "BOTTOM":
        default:
            return { kind: "linear", x1: 0, y1: 0, x2: 0, y2: 1 };
    }
}

// ---------------------------------------------------------------------------------------
// def builders
// ---------------------------------------------------------------------------------------

function gradientFill(
    defs: DefCollector,
    grad: SceneGradient,
    baseOpacity: number
): string {
    const geometry = gradientDirection(grad.dir);
    return defs.url(
        geometry.kind === "radial" ? "rgrad" : "lingrad",
        {
            c: grad.color,
            s: grad.stop,
            d: grad.dir,
            o: grad.opacity,
            b: baseOpacity,
        },
        id => ({
            id,
            tag: geometry.kind === "radial" ? "radialGradient" : "linearGradient",
            attrs:
                geometry.kind === "radial"
                    ? { cx: "50%", cy: "50%", r: "50%" }
                    : {
                          x1: geometry.x1,
                          y1: geometry.y1,
                          x2: geometry.x2,
                          y2: geometry.y2,
                      },
            children: [
                {
                    id: id + "-a",
                    tag: "stop",
                    attrs: { offset: 0, "stop-color": grad.color, "stop-opacity": 0 },
                },
                {
                    id: id + "-b",
                    tag: "stop",
                    attrs: {
                        offset: Math.max(0, Math.min(1, grad.stop / 255)),
                        "stop-color": grad.color,
                        "stop-opacity": alphaOf(grad.opacity ?? 1) * baseOpacity,
                    },
                },
            ],
        })
    );
}

function shadowFilter(defs: DefCollector, shadow: SceneShadow): string {
    const blur = Math.max(0, (shadow.width ?? 0) / 2);
    return defs.url(
        "shadow",
        {
            c: shadow.color,
            o: shadow.opacity,
            w: shadow.width,
            s: shadow.spread,
            x: shadow.ofsX,
            y: shadow.ofsY,
        },
        id => ({
            id,
            tag: "filter",
            // LVGL's shadow box is generous; -50%/200% keeps it unclipped.
            attrs: { x: "-50%", y: "-50%", width: "200%", height: "200%" },
            children: [
                {
                    id: id + "-ds",
                    tag: "feDropShadow",
                    attrs: {
                        dx: shadow.ofsX ?? 0,
                        dy: shadow.ofsY ?? 0,
                        stdDeviation: blur,
                        "flood-color": shadow.color ?? "#000000",
                        "flood-opacity": alphaOf(shadow.opacity),
                    },
                },
            ],
        })
    );
}

function recolorFilter(
    defs: DefCollector,
    color: string,
    opacity: number | undefined
): string {
    return defs.url("recolor", { c: color, o: opacity }, id => ({
        id,
        tag: "filter",
        attrs: { x: "0%", y: "0%", width: "100%", height: "100%" },
        children: [
            {
                id: id + "-src",
                tag: "feFlood",
                attrs: {
                    "flood-color": color,
                    "flood-opacity": alphaOf(opacity),
                },
            },
            {
                id: id + "-comp",
                tag: "feComposite",
                attrs: { in2: "SourceGraphic", operator: "in" },
            },
        ],
    }));
}

// ---------------------------------------------------------------------------------------
// part rendering
// ---------------------------------------------------------------------------------------

function renderText(
    key: string,
    text: SceneText,
    area: SceneRect
): DrawNode | undefined {
    if (text.str === undefined || text.str === null) {
        return undefined;
    }
    const size = text.size && text.size > 0 ? text.size : 14;
    const lines = String(text.str).split("\n");
    const lineSpace = text.lineSpace ?? 0;
    const lineHeight = size + lineSpace;
    const align = (text.align ?? "LEFT").toUpperCase();
    const ascent = size * 0.8; // approximation; font metrics arrive with D3 escalation

    let anchor = "start";
    let x = area.x;
    if (align.indexOf("RIGHT") !== -1) {
        anchor = "end";
        x = area.x + area.w;
    } else if (align.indexOf("CENTER") !== -1 || align.indexOf("MID") !== -1) {
        anchor = "middle";
        x = area.x + area.w / 2;
    }

    const blockHeight = lines.length * lineHeight - lineSpace;
    let firstBaseline = area.y + ascent;
    if (align.indexOf("BOTTOM") !== -1) {
        firstBaseline = area.y + area.h - (blockHeight - ascent);
    } else if (
        align.indexOf("CENTER") !== -1 ||
        align.indexOf("MID") !== -1
    ) {
        firstBaseline = area.y + (area.h - blockHeight) / 2 + ascent;
    }

    const attrs: Record<string, string | number | undefined> = {
        x,
        "font-family": fontFamilyOf(text.fontId),
        "font-size": size,
        "text-anchor": anchor,
        fill: text.color ?? "#000000",
        "fill-opacity": alphaOf(text.opacity),
        "dominant-baseline": "alphabetic",
    };
    if (text.letterSpace) {
        attrs["letter-spacing"] = text.letterSpace;
    }

    let decoration = "";
    const decor = (text.decor ?? "").toUpperCase();
    if (decor.indexOf("UNDERLINE") !== -1) {
        decoration = "underline";
    } else if (decor.indexOf("STRIKETHROUGH") !== -1) {
        decoration = "line-through";
    }

    const node: DrawNode = {
        key,
        tag: "text",
        attrs,
        style: decoration ? { "text-decoration": decoration } : undefined,
        children: lines.map((line, index) => ({
            key: `${key}-l${index}`,
            tag: "tspan",
            attrs: { x, y: firstBaseline + index * lineHeight },
            text: line,
        })),
    };

    // Overflow clipping needs a clipPath the caller registers; handled by renderPart.
    return node;
}

/**
 * How the bitmap is placed inside the widget box.
 *
 * - `natural` — LVGL drew it at its source size (times scale), positioned by the inner alignment.
 * - `fill`    — STRETCH: the widget box is the destination rectangle, whatever the source size.
 * - `unknown` — no source geometry available; keep the historical behaviour (fill the box, let
 *               the transform scale it) so older dumps render exactly as before.
 */
type ImagePlacementMode = "natural" | "fill" | "unknown";

/**
 * Where LVGL would draw the bitmap: at its natural size (times zoom), placed inside the widget by
 * the inner alignment. Returns the box to emit plus how it was derived.
 */
function imagePlacement(
    img: SceneImage,
    area: SceneRect,
    zoom: number
): { x: number; y: number; w: number; h: number; mode: ImagePlacementMode } {
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
        return { x: area.x, y: area.y, w: area.w, h: area.h, mode: "unknown" };
    }
    const align = (img.align ?? "CENTER").toUpperCase();
    if (align === "STRETCH" || align === "TILE") {
        // STRETCH fills the box and ignores the scale; TILE is approximated by filling it too
        // (see KNOWN P2 GAPS — a real tiling needs a <pattern>, which is reserved for bgImage).
        return { x: area.x, y: area.y, w: area.w, h: area.h, mode: "fill" };
    }
    const w = naturalWidth * zoom;
    const h = naturalHeight * zoom;
    let x: number;
    let y: number;
    // Test the axes separately: TOP_MID/BOTTOM_MID contain "MID" for x but are NOT vertically
    // centred, and LEFT_MID/RIGHT_MID contain "MID" for y but are not horizontally centred.
    if (align.indexOf("RIGHT") !== -1) {
        x = area.x + area.w - w;
    } else if (align.indexOf("LEFT") !== -1) {
        x = area.x;
    } else {
        x = area.x + (area.w - w) / 2;
    }
    if (align.indexOf("BOTTOM") !== -1) {
        y = area.y + area.h - h;
    } else if (align.indexOf("TOP") !== -1) {
        y = area.y;
    } else {
        y = area.y + (area.h - h) / 2;
    }
    return { x, y, w, h, mode: "natural" };
}

function renderImage(
    key: string,
    img: SceneImage,
    area: SceneRect,
    defs: DefCollector
): DrawNode | undefined {
    if (!img.srcId) {
        return undefined;
    }
    const zoom = zoomOf(img.zoom);
    const place = imagePlacement(img, area, zoom);
    const attrs: Record<string, string | number | undefined> = {
        href: img.srcId,
        x: place.x,
        y: place.y,
        width: place.w,
        height: place.h,
        // Once the box is known, the box IS the answer — never letterbox it into itself. Only the
        // legacy unknown-size path keeps `meet` so a bitmap without geometry is not distorted.
        preserveAspectRatio: place.mode === "unknown" ? "xMidYMid meet" : "none",
        opacity: alphaOf(img.opacity),
    };
    if (img.recolor) {
        attrs.filter = recolorFilter(defs, img.recolor, img.recolorOpacity);
    }
    let node: DrawNode = { key, tag: "image", attrs };

    const angle = degreesOf(img.rotation);
    // For a known box the zoom is already in width/height (STRETCH ignores it entirely), so the
    // transform only rotates. The unknown-size path keeps the historical scale-about-pivot.
    const transformZoom = place.mode === "unknown" ? zoom : 1;
    if (angle !== 0 || transformZoom !== 1) {
        const pivotX = img.pivotX ?? area.x + area.w / 2;
        const pivotY = img.pivotY ?? area.y + area.h / 2;
        node = {
            key,
            tag: "g",
            attrs: {
                transform: [
                    `translate(${pivotX} ${pivotY})`,
                    angle !== 0 ? `rotate(${angle})` : "",
                    transformZoom !== 1 ? `scale(${transformZoom})` : "",
                    `translate(${-pivotX} ${-pivotY})`,
                ]
                    .filter(Boolean)
                    .join(" "),
            },
            children: [node],
        };
    }

    // LVGL clips an image to its widget, so a bitmap larger than the box must not spill.
    const overflows =
        place.x < area.x ||
        place.y < area.y ||
        place.x + place.w > area.x + area.w ||
        place.y + place.h > area.y + area.h;
    if (overflows) {
        // The clip rectangle is the widget box, not the bitmap — that is exactly what LVGL does.
        const clip = defs.url("imgclip", area, id => ({
            id,
            tag: "clipPath",
            children: [clipShapeChild(id + "-rect", area, undefined)],
        }));
        return {
            key: `${key}-clip`,
            tag: "g",
            attrs: { "clip-path": clip },
            children: [node],
        };
    }
    return node;
}

function renderLine(key: string, line: SceneLine): DrawNode | undefined {
    const pts = line.points ?? [];
    if (pts.length < 4) {
        return undefined;
    }
    const pairs: string[] = [];
    for (let i = 0; i + 1 < pts.length; i += 2) {
        pairs.push(`${pts[i]},${pts[i + 1]}`);
    }
    // Closed when the last point equals the first — LVGL lines behave that way.
    const closed =
        pts.length >= 6 &&
        pts[0] === pts[pts.length - 2] &&
        pts[1] === pts[pts.length - 1];
    const attrs: Record<string, string | number | undefined> = {
        points: pairs.join(" "),
        fill: "none",
        stroke: line.color ?? "currentColor",
        "stroke-opacity": alphaOf(line.opacity),
        "stroke-width": line.width ?? 1,
        "stroke-linejoin": line.rounded ? "round" : "miter",
        "stroke-linecap": line.rounded ? "round" : "butt",
    };
    const dash = [line.dashWidth ?? 0, line.dashGap ?? 0];
    if (dash[0] > 0 || dash[1] > 0) {
        attrs["stroke-dasharray"] = dash.join(" ");
    }
    return { key, tag: closed ? "polygon" : "polyline", attrs };
}

function renderArc(key: string, arc: SceneArc, area: SceneRect): DrawNode[] {
    const width = arc.width ?? arc.bgWidth ?? 1;
    const radius = Math.max(0, (Math.min(area.w, area.h) - width) / 2);
    const cx = area.x + area.w / 2;
    const cy = area.y + area.h / 2;
    const nodes: DrawNode[] = [];

    if (arc.bgColor) {
        // The track is its own sweep: a default-themed arc runs 270 degrees, not a full circle.
        const track =
            arcPath(cx, cy, radius, arc.bgStart ?? 0, arc.bgEnd ?? 3600) ?? fullCirclePath(cx, cy, radius);
        nodes.push({
            key: `${key}-track`,
            tag: "path",
            attrs: {
                d: track,
                fill: "none",
                stroke: arc.bgColor,
                "stroke-opacity": alphaOf(arc.bgOpacity),
                "stroke-width": arc.bgWidth ?? width,
            },
        });
    }

    if (arc.start == null || arc.end == null) {
        // Track-only part (an arc's MAIN): there is no value sweep to draw.
        return nodes;
    }

    let d = arcPath(cx, cy, radius, arc.start, arc.end);
    if (!d) {
        // A full 360° arc has no distinct endpoints; fall back to a circle.
        d = fullCirclePath(cx, cy, radius);
    }
    nodes.push({
        key: `${key}-value`,
        tag: "path",
        attrs: {
            d,
            fill: "none",
            stroke: arc.color ?? "currentColor",
            "stroke-opacity": alphaOf(arc.opacity),
            "stroke-width": width,
            "stroke-linecap": arc.rounded ? "round" : "butt",
        },
    });
    return nodes;
}

function renderBgImage(
    key: string,
    bgImage: SceneBgImage,
    area: SceneRect,
    defs: DefCollector
): DrawNode | undefined {
    if (!bgImage.srcId) {
        return undefined;
    }
    if (bgImage.tiled) {
        const patternId = defs.url(
            "pattern",
            { src: bgImage.srcId, w: area.w, h: area.h },
            id => ({
                id,
                tag: "pattern",
                attrs: {
                    patternUnits: "userSpaceOnUse",
                    x: area.x,
                    y: area.y,
                    width: area.w,
                    height: area.h,
                },
                children: [
                    {
                        id: id + "-img",
                        tag: "image",
                        attrs: {
                            href: bgImage.srcId,
                            x: area.x,
                            y: area.y,
                            width: area.w,
                            height: area.h,
                        },
                    },
                ],
            })
        );
        return rectShape(key, area, undefined, { fill: patternId });
    }
    return renderImage(
        key,
        {
            srcId: bgImage.srcId,
            opacity: bgImage.opacity,
            recolor: bgImage.recolor,
            recolorOpacity: bgImage.recolorOpacity,
        },
        area,
        defs
    );
}

function renderBorder(
    key: string,
    border: SceneBorder,
    area: SceneRect,
    radius: SceneRadius | undefined
): DrawNode | undefined {
    const width = border.width ?? 0;
    if (width <= 0 || !border.color) {
        return undefined;
    }
    const sides = borderSides(border.side);
    if (!sides.top && !sides.bottom && !sides.left && !sides.right) {
        return undefined;
    }
    // LVGL draws borders INSIDE the bounds: inset by half the stroke width.
    const box = inset(area, width / 2);
    const attrs: Record<string, string | number | undefined> = {
        fill: "none",
        stroke: border.color,
        "stroke-opacity": alphaOf(border.opacity),
        "stroke-width": width,
    };

    if (sides.top && sides.bottom && sides.left && sides.right) {
        return rectShape(key, box, radius, attrs);
    }

    const segments: string[] = [];
    if (sides.top) {
        segments.push(`M${box.x} ${box.y} H${box.x + box.w}`);
    }
    if (sides.right) {
        segments.push(`M${box.x + box.w} ${box.y} V${box.y + box.h}`);
    }
    if (sides.bottom) {
        segments.push(
            `M${box.x + box.w} ${box.y + box.h} H${box.x}`
        );
    }
    if (sides.left) {
        segments.push(`M${box.x} ${box.y + box.h} V${box.y}`);
    }
    return { key, tag: "path", attrs: { d: segments.join(" "), ...attrs } };
}

function renderOutline(
    key: string,
    outline: SceneOutline,
    area: SceneRect,
    radius: SceneRadius | undefined
): DrawNode | undefined {
    const width = outline.width ?? 0;
    if (width <= 0 || !outline.color) {
        return undefined;
    }
    const pad = outline.pad ?? 0;
    // Outline sits outside the border box, inset by half its own stroke width.
    const box = inset(expand(area, pad), -width / 2);
    return rectShape(key, box, radius, {
        fill: "none",
        stroke: outline.color,
        "stroke-opacity": alphaOf(outline.opacity),
        "stroke-width": width,
    });
}

function renderPart(
    obj: SceneObject,
    part: ScenePart,
    defs: DefCollector
): DrawNode[] {
    const key = `p${obj.ptr}-${part.part}`;
    const area = part.area ?? obj.area;
    const radius = part.radius ?? obj.radius;
    const nodes: DrawNode[] = [];
    const partScale =
        part.blendMode && part.blendMode.toUpperCase() !== "NORMAL"
            ? { "mix-blend-mode": part.blendMode.toLowerCase() }
            : undefined;

    let shape: DrawNode | undefined;

    // 1. bg (shadow is attached to the bg shape, as LVGL draws it behind the background)
    if (part.bg && (part.bg.color || part.bg.grad)) {
        const fill = part.bg.color ?? "#000000";
        const fillOpacity = alphaOf(part.bg.opacity);
        const attrs: Record<string, string | number | undefined> = {
            fill: part.bg.grad
                ? gradientFill(defs, part.bg.grad, fillOpacity)
                : fill,
            "fill-opacity": part.bg.grad ? undefined : fillOpacity,
        };
        if (part.shadow && (part.shadow.width ?? 0) > 0) {
            attrs.filter = shadowFilter(defs, part.shadow);
        }
        shape = rectShape(`${key}-bg`, area, radius, attrs);
        if (partScale) {
            shape.style = { ...(shape.style ?? {}), ...partScale };
        }
        nodes.push(shape);
    } else if (part.shadow && (part.shadow.width ?? 0) > 0) {
        // A shadow with no background still shows in LVGL.
        nodes.push(
            rectShape(`${key}-shadow`, area, radius, {
                fill: shadowFilter(defs, part.shadow),
            })
        );
    }

    // 2. background image
    if (part.bgImage) {
        const node = renderBgImage(`${key}-bgimg`, part.bgImage, area, defs);
        if (node) {
            nodes.push(node);
        }
    }

    // 3. border (unless `post`, which draws after content)
    const border = part.border
        ? renderBorder(`${key}-border`, part.border, area, radius)
        : undefined;
    if (border && !part.border?.post) {
        nodes.push(border);
    }

    // 4. outline
    if (part.outline) {
        const outline = renderOutline(`${key}-outline`, part.outline, area, radius);
        if (outline) {
            nodes.push(outline);
        }
    }

    // 5. content
    const content: DrawNode[] = [];
    if (part.arc) {
        content.push(...renderArc(`${key}-arc`, part.arc, area));
    }
    if (part.line) {
        const line = renderLine(`${key}-line`, part.line);
        if (line) {
            content.push(line);
        }
    }
    if (part.text) {
        const text = renderText(`${key}-text`, part.text, area);
        if (text) {
            if (needsTextClip(part.text)) {
                text.attrs = {
                    ...(text.attrs ?? {}),
                    "clip-path": defs.url(
                        "textclip",
                        { x: area.x, y: area.y, w: area.w, h: area.h, r: radius },
                        id => ({
                            id,
                            tag: "clipPath",
                            children: [
                                clipShapeChild(id + "-shape", area, radius),
                            ],
                        })
                    ),
                };
            }
            content.push(text);
        }
    }
    if (part.img) {
        const img = renderImage(`${key}-img`, part.img, area, defs);
        if (img) {
            content.push(img);
        }
    }
    nodes.push(...content);

    // 6. post-border
    if (border && part.border?.post) {
        nodes.push(border);
    }

    // 7. colour-filter approximation (topmost overlay of the same shape)
    if (part.colorFilter && part.colorFilter.color) {
        nodes.push(
            rectShape(`${key}-cf`, area, radius, {
                fill: part.colorFilter.color,
                "fill-opacity": alphaOf(part.colorFilter.opacity) * 0.5,
                "pointer-events": "none",
            })
        );
    }

    // 8. part opacity (LV_STYLE_OPA) applies to the whole part layer, so it needs a group: it
    // multiplies everything drawn for this part, including the text and the border.
    if (part.opacity != null && part.opacity < 1) {
        return [
            {
                key: `${key}-layer`,
                tag: "g",
                attrs: { opacity: alphaOf(part.opacity) },
                children: nodes,
            },
        ];
    }

    return nodes;
}

function needsTextClip(text: SceneText): boolean {
    if (!text.overflow) {
        return false;
    }
    const value = text.overflow.toUpperCase();
    return value.indexOf("CLIP") !== -1 || value.indexOf("ELLIPSIS") !== -1;
}

/** The single shape inside a <clipPath> — a <rect> when the radius is uniform, else a path. */
function clipShapeChild(
    id: string,
    area: SceneRect,
    radius: SceneRadius | undefined
): DefNode {
    const corners = radiusCorners(radius, area);
    return isUniform(corners)
        ? {
              id,
              tag: "rect",
              attrs: {
                  x: area.x,
                  y: area.y,
                  width: area.w,
                  height: area.h,
                  rx: corners.tl || undefined,
              },
          }
        : { id, tag: "path", attrs: { d: roundedRectPath(area, radius) } };
}

// ---------------------------------------------------------------------------------------
// object / scene rendering
// ---------------------------------------------------------------------------------------

function objectTransform(obj: SceneObject): string | undefined {
    const parts: string[] = [];
    const scroll = obj.scroll;
    if (scroll && (scroll.x !== 0 || scroll.y !== 0)) {
        parts.push(`translate(${-scroll.x} ${-scroll.y})`);
    }
    const t = obj.transform;
    if (t) {
        const angle = degreesOf(t.angle);
        const zoom = zoomOf(t.zoom);
        const scaleX = t.scaleX != null ? zoomOf(t.scaleX) : zoom;
        const scaleY = t.scaleY != null ? zoomOf(t.scaleY) : zoom;
        const skewX = degreesOf(t.skewX);
        const skewY = degreesOf(t.skewY);
        if (angle !== 0 || scaleX !== 1 || scaleY !== 1 || skewX !== 0 || skewY !== 0) {
            const pivotX = t.pivotX ?? obj.area.x + obj.area.w / 2;
            const pivotY = t.pivotY ?? obj.area.y + obj.area.h / 2;
            parts.push(`translate(${pivotX} ${pivotY})`);
            if (angle !== 0) {
                parts.push(`rotate(${angle})`);
            }
            if (scaleX !== 1 || scaleY !== 1) {
                parts.push(`scale(${scaleX} ${scaleY})`);
            }
            if (skewX !== 0 || skewY !== 0) {
                parts.push(`skewX(${skewX})`, `skewY(${skewY})`);
            }
            parts.push(`translate(${-pivotX} ${-pivotY})`);
        }
    }
    return parts.length > 0 ? parts.join(" ") : undefined;
}

function renderObject(obj: SceneObject, defs: DefCollector): DrawNode {
    const attrs: Record<string, string | number | undefined> = {
        "data-ptr": obj.ptr,
        "data-type": obj.type,
        transform: objectTransform(obj),
    };
    if (obj.objId) {
        attrs["data-objid"] = obj.objId;
    }
    if (obj.name) {
        attrs["data-name"] = obj.name;
    }
    const opacity = obj.opacity != null ? alphaOf(obj.opacity) : undefined;
    if (opacity != null && opacity < 1) {
        attrs.opacity = opacity;
    }
    if (obj.clip) {
        const clip = obj.clip;
        attrs["clip-path"] = defs.url(
            "clip",
            { x: clip.x, y: clip.y, w: clip.w, h: clip.h, r: clip.radius },
            id => ({
                id,
                tag: "clipPath",
                children: [
                    clipShapeChild(id + "-shape", clip, clip.radius),
                ],
            })
        );
    }

    const children: DrawNode[] = [];
    for (const part of obj.parts) {
        children.push(...renderPart(obj, part, defs));
    }
    return { key: `o${obj.ptr}`, tag: "g", attrs, children };
}

/**
 * Render a whole scene.
 *
 * Hidden objects (and their subtrees) are not emitted: LVGL does not paint them either, and
 * the editor keeps its own visibility affordances in the overlay group.
 */
export function renderScene(scene: Scene): RenderOutput {
    const defs = new DefCollector();
    defs.beginFrame();

    const byPtr = new Map<number, SceneObject>();
    for (const obj of scene.objects) {
        byPtr.set(obj.ptr, obj);
    }

    const hidden = new Set<number>();
    const nodeByPtr = new Map<number, DrawNode>();
    const roots: DrawNode[] = [];

    // Scene.objects is flat with parents before children, so one pass nests everything.
    for (const obj of scene.objects) {
        const parentPtr = obj.parentPtr;
        const parent =
            parentPtr != null && !hidden.has(parentPtr)
                ? nodeByPtr.get(parentPtr)
                : undefined;
        const reachable = parentPtr == null || parent != null;
        if (obj.hidden || !reachable) {
            hidden.add(obj.ptr);
            continue;
        }
        const node = renderObject(obj, defs);
        nodeByPtr.set(obj.ptr, node);
        if (parent) {
            parent.children = parent.children ?? [];
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    return { roots, defs: defs.toArray() };
}
