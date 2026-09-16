/**
 * LVGL 9 SVG renderer — WASM scene-dump binding (P1).
 *
 * ADDITIVE: new file. Bridges `lvglDumpScene` (new C function in
 * `studio-wasm-libs/lvgl-runtime/common/src/svg_scene_dump.cpp`) to the Scene contract.
 *
 * The boundary is deliberate:
 *   - the C side owns **layout + chrome**: the object tree, areas, scroll/hidden and, per LVGL
 *     part, the resolved style values (bg / gradient / border / outline / shadow / radius /
 *     opacity / arc / line);
 *   - this module owns the **model**: it maps the compact wire format onto the Scene contract and
 *     merges in what only the EEZ widget tree knows — `type`, `objId`, `name`, label text and
 *     image sources (and, optionally, clip/transform).
 *
 * Wire vs Scene (see docs/t3000/architecture/lvgl-svg/scene-contract.md §4):
 *   | layer | format |
 *   |---|---|
 *   | wire  | colours `0xRRGGBB` ints, enums as LVGL ints, opacities 0..255, short keys |
 *   | Scene | colours `#rrggbb` strings, enums as names, opacities 0..1 |
 *
 * Typings are local to this module (cast from the runtime's `wasm` object) so no shared type
 * package has to change.
 */

import type {
    Scene,
    SceneBg,
    SceneBgImage,
    SceneButtonMatrix,
    SceneButtonStyle,
    SceneClip,
    SceneGradient,
    SceneImage,
    SceneObject,
    ScenePart,
    ScenePartName,
    ScenePartStyle,
    SceneRect,
    SceneText,
    SceneTransform,
} from "./scene";
import { SCENE_VERSION } from "./scene";
import { imageNaturalSize } from "./image-size";

/**
 * Wire part **slot** → name.
 *
 * The `p` field is the SLOT number (index into `svgParts[]` in svg_scene_dump.cpp), not the LVGL
 * part value: the slots are 0..7 in the order MAIN, SCROLLBAR, INDICATOR, KNOB, SELECTED, ITEMS,
 * CURSOR, TEXTAREA_PLACEHOLDER. Slot 7 is `LV_PART_CUSTOM_FIRST`, which LVGL_PARTS_9 aliases to
 * TEXTAREA_PLACEHOLDER. `TICKS` has no slot: it exists only in LVGL 8.
 */
export const WIRE_PART_NAMES: Record<number, ScenePartName> = {
    0: "MAIN",
    1: "SCROLLBAR",
    2: "INDICATOR",
    3: "KNOB",
    4: "SELECTED",
    5: "ITEMS",
    6: "CURSOR",
    7: "TEXTAREA_PLACEHOLDER",
};

/**
 * Parts that are never rendered.
 *
 * LVGL's own draw path never paints these from an object's box — a list, roller, dropdown, table or
 * textarea draws its selection, its items and its text cursor from geometry it keeps privately, so
 * they cannot be reconstructed from a dump. The default theme nevertheless styles them on every
 * object (SELECTED with a solid Material-blue background), which is why a part that carries no area
 * and is drawn as the object's box turns into a phantom shape — a blue rectangle over the object.
 *
 * `svg_scene_dump.cpp` already withholds them; dropping them here as well keeps an older runtime
 * from painting them and keeps the renderer's contract independent of the wire producer.
 */
export const NEVER_DRAWN_PART_NAMES: readonly ScenePartName[] = ["SELECTED", "ITEMS", "CURSOR"];

/**
 * LVGL paints parts in a widget-specific order: the background first, then the widget's own
 * layers, with the scrollbar on top. The wire arrives in part-index order, which is right for
 * sliders/switches/bars but not for tables or textareas, so the renderer's z-order is fixed here
 * in one place rather than by the C emission order.
 */
export const PART_PAINT_ORDER: ScenePartName[] = [
    "MAIN",
    "ITEMS",
    "INDICATOR",
    "TEXTAREA_PLACEHOLDER",
    "SELECTED",
    "KNOB",
    "CURSOR",
    "SCROLLBAR",
];

// ---------------------------------------------------------------------------------------
// wire types (produced by svg_scene_dump.cpp)
// ---------------------------------------------------------------------------------------

interface WireRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface WirePart {
    /** part index — see WIRE_PART_NAMES */
    p: number;
    /** Emitted only when the part does not fill the object's box (e.g. a scrollbar strip). */
    area?: WireRect;
    bgColor?: number;
    bgOpa?: number;
    gradDir?: number;
    gradColor?: number;
    gradOpa?: number;
    gradStop?: number;
    /** Where the gradient STARTS (LVGL's `bg_main_stop`, default 0) and at what opacity. */
    bgMainStop?: number;
    bgMainOpa?: number;
    /**
     * The codepoint of a SYMBOL background image (`bg_image_src`), e.g. the tick the theme puts on a
     * checked checkbox's marker. Emitted instead of a bitmap because a symbol is a font glyph.
     */
    bgSymbol?: string;
    borderWidth?: number;
    borderColor?: number;
    borderOpa?: number;
    borderSide?: number;
    borderPost?: number;
    outlineWidth?: number;
    outlineColor?: number;
    outlineOpa?: number;
    outlinePad?: number;
    shadowWidth?: number;
    shadowColor?: number;
    shadowOpa?: number;
    shadowSpread?: number;
    shadowOfsX?: number;
    shadowOfsY?: number;
    arcWidth?: number;
    arcColor?: number;
    arcOpa?: number;
    arcRounded?: number;
    /** Indicator sweep in 0.1° units, emitted for arc widgets (0 is a real angle, not "unset"). */
    arcStart?: number;
    arcEnd?: number;
    /** MAIN-part sweep of an arc widget: the track, in the same 0.1° units. */
    arcBgStart?: number;
    arcBgEnd?: number;
    /** The arc's ring, as lv_arc.c computes it: centre, radius (MAIN pads applied) and inset. */
    arcCx?: number;
    arcCy?: number;
    arcR?: number;
    arcInset?: number;
    lineWidth?: number;
    lineColor?: number;
    lineOpa?: number;
    radius?: number;
    opa?: number;
    textColor?: number;
    textOpa?: number;
    fontSize?: number;
    /** LV_TEXT_ALIGN_* of this part — the alignment LVGL draws the string with. */
    textAlign?: number;
}

interface WireObject {
    ptr: number;
    parentPtr?: number;
    index?: number;
    area: WireRect;
    parts: WirePart[];
    hidden?: boolean;
    scroll?: { x: number; y: number };
    /** Content box of a scrollable object — the region LVGL clips its children to. */
    clipChildren?: boolean;
    /** Content box LVGL draws this object's text in. Absent = the object's own box. */
    textArea?: WireRect;
    /** The string LVGL is drawing now (runtime text, or a textarea's placeholder). */
    liveText?: string;
    /** The slot that draws `liveText` — see WIRE_PART_NAMES (0 = MAIN, 7 = TEXTAREA_PLACEHOLDER). */
    liveTextPart?: number;
    /** Natural size + inner alignment, emitted for image widgets. */
    imgW?: number;
    imgH?: number;
    imgAlign?: number;
    /** The cells a button matrix draws itself — see SceneButtonMatrix. */
    btnm?: WireButtonMatrix;
}

/** One cell of a button matrix, as `svg_scene_dump.cpp` emits it. */
interface WireButtonCell {
    x: number;
    y: number;
    w: number;
    h: number;
    /** LV_STATE_* bitmask the cell is drawn with. */
    s: number;
    /** The cell's string; absent when the cell draws none. */
    txt?: string;
    /** The box LVGL centred the text in, present together with `txt`. */
    tx?: number;
    ty?: number;
    tw?: number;
    th?: number;
}

interface WireButtonMatrix {
    cells: WireButtonCell[];
    /** The ITEMS-part style of each state the cells use; no `p` — a cell style is not a part. */
    styles: WireCellStyle[];
}

/** A cell style block: a part's style fields plus the state they were resolved for. */
type WireCellStyle = Omit<WirePart, "p"> & { state: number };

export interface WireScene {
    sceneVersion: number;
    width: number;
    height: number;
    bgColor?: number;
    rootPtr: number;
    objects: WireObject[];
}

// ---------------------------------------------------------------------------------------
// widget model enrichment
// ---------------------------------------------------------------------------------------

/**
 * What the EEZ widget tree can add that the LVGL dump cannot know.
 * Returning `undefined` for a `ptr` is normal (e.g. LVGL-internal objects such as a tabview's
 * burrowed tab bar) — such objects are still rendered, just without `type`/`objId`.
 */
export interface SceneWidgetInfo {
    objId?: string;
    type?: string;
    name?: string;
    /** Widget-level visibility flag; ORed with LVGL's own hidden flag. */
    hidden?: boolean;
    /**
     * A textarea's placeholder string. LVGL draws it (in place of the text) whenever the textarea's
     * text is empty, and the string lives only in the widget model — the dump cannot see it.
     *
     * (There was a `parts?: ScenePartName[]` field here, meant to drop parts a widget does not declare.
     * Nothing ever populated it, so the filter never fired, and the hazard it guarded against — a
     * theme-inherited part painted as the object's whole box — is prevented in the dump instead: a
     * part is emitted only once its box is known, and the slots LVGL never draws from an object's box
     * are dropped outright. See `clip` below for the one place where the model still wins.)
     */
    placeholder?: string;
    /** The widget's own text, styling included. */
    text?: SceneText;
    img?: SceneImage;
    /** Widgets that clip their content (containers, lists, tabview pages). */
    clip?: SceneClip;
    transform?: SceneTransform;
}

export type SceneWidgetLookup = (ptr: number) => SceneWidgetInfo | undefined;

// ---------------------------------------------------------------------------------------
// wire → Scene
// ---------------------------------------------------------------------------------------

function hexColor(value: number | undefined): string | undefined {
    if (value == null) {
        return undefined;
    }
    return "#" + (value & 0x00ffffff).toString(16).padStart(6, "0");
}

/** LVGL opacity is 0..255; the Scene carries 0..1. */
function alpha(value: number | undefined): number | undefined {
    if (value == null) {
        return undefined;
    }
    return Math.min(1, Math.max(0, value / 255));
}

/**
 * Whether a string carries an `LV_SYMBOL_*` glyph (LVGL renders those from a private-use range).
 *
 * Kept as the test the renderer's symbol handling is described against: the SVG DOES draw them now —
 * `fontFamilyOf()` falls back to the bundled Font Awesome face for exactly these codepoints — so
 * there is no reason left to drop a live string that contains one. It used to be dropped here, which
 * is why a calendar's month arrows (and every icon button) came out empty.
 */
export function hasPrivateUseGlyph(value: string): boolean {
    return /[\uE000-\uF8FF]/.test(value);
}

/**
 * LVGL font metrics that a line height cannot express.
 *
 * The dump can only report a font's `line_height` — the sole size LVGL exposes — but a browser needs
 * the font's NOMINAL pixel size, and the two differ by 8-14% (52 -> 48, 44 -> 40, 16 -> 14). Text
 * sized by the line height is therefore too large before placement is even considered. `baseline` is
 * LVGL's ascent (`line_height - base_line`): the distance from the top of the text box to the first
 * line's baseline, which is what LVGL positions glyphs against.
 *
 * Read from the generated fonts in `lvgl/src/font/lv_font_montserrat_*.c` (v9.5.0).
 */
const LVGL_MONTSERRAT_BY_LINE_HEIGHT: Record<number, { size: number; baseline: number }> = {
    10: { size: 8, baseline: 8 },
    11: { size: 10, baseline: 9 },
    15: { size: 12, baseline: 12 },
    16: { size: 14, baseline: 13 },
    18: { size: 16, baseline: 15 },
    21: { size: 18, baseline: 17 },
    22: { size: 20, baseline: 18 },
    24: { size: 22, baseline: 20 },
    27: { size: 24, baseline: 22 },
    29: { size: 26, baseline: 24 },
    30: { size: 28, baseline: 25 },
    33: { size: 30, baseline: 27 },
    35: { size: 32, baseline: 29 },
    38: { size: 34, baseline: 31 },
    40: { size: 36, baseline: 33 },
    41: { size: 38, baseline: 34 },
    44: { size: 40, baseline: 36 },
    46: { size: 42, baseline: 38 },
    49: { size: 44, baseline: 40 },
    50: { size: 46, baseline: 41 },
    52: { size: 48, baseline: 43 },
};

/**
 * A font LVGL exposes only as a line height. An unknown font (a project-supplied one) keeps the raw
 * value and falls back to the renderer's approximation for the baseline.
 */
export function lvglTextMetrics(lineHeight: number | undefined): {
    size?: number;
    baseline?: number;
} {
    if (lineHeight == null) {
        return {};
    }
    const known = LVGL_MONTSERRAT_BY_LINE_HEIGHT[lineHeight];
    return known ? { size: known.size, baseline: known.baseline } : { size: lineHeight };
}

/** LV_GRAD_DIR_* → the Scene's direction name (see lv_grad.h). */
function gradDirName(value: number | undefined): string | undefined {
    switch (value) {
        case 1:
            return "BOTTOM"; // VER: top → bottom
        case 2:
            return "RIGHT"; // HOR: left → right
        case 3:
            return "BOTTOM_RIGHT"; // LINEAR
        case 4:
            return "RADIAL_CENTER";
        default:
            return undefined;
    }
}

/**
 * LV_IMAGE_ALIGN_* → name.
 *
 * The enum order is NOT alphabetical (BOTTOM_* come before LEFT_MID/RIGHT_MID, and 10 is an
 * internal marker), so the mapping is explicit rather than derived.
 */
export function imageAlignName(value: number | undefined): string | undefined {
    switch (value) {
        case 0:
            // LV_IMAGE_ALIGN_DEFAULT behaves as CENTER.
            return "CENTER";
        case 1:
            return "TOP_LEFT";
        case 2:
            return "TOP_MID";
        case 3:
            return "TOP_RIGHT";
        case 4:
            return "BOTTOM_LEFT";
        case 5:
            return "BOTTOM_MID";
        case 6:
            return "BOTTOM_RIGHT";
        case 7:
            return "LEFT_MID";
        case 8:
            return "RIGHT_MID";
        case 9:
            return "CENTER";
        case 11:
            return "STRETCH";
        case 12:
            return "TILE";
        case 13:
            return "CONTAIN";
        default:
            return undefined; // 10 is _LV_IMAGE_ALIGN_AUTO_TRANSFORM, a marker rather than an align
    }
}

/** LV_BORDER_SIDE_* bitmask → the Scene's "TOP|LEFT" style name. */
export function borderSideName(mask: number | undefined): string | undefined {
    if (mask == null) {
        return undefined;
    }
    if (mask === 0) {
        return "NONE";
    }
    if ((mask & 0x0f) === 0x0f) {
        return mask & 0x10 ? "FULL|INTERNAL" : "FULL";
    }
    const names: string[] = [];
    if (mask & 0x02) {
        names.push("TOP");
    }
    if (mask & 0x08) {
        names.push("RIGHT");
    }
    if (mask & 0x01) {
        names.push("BOTTOM");
    }
    if (mask & 0x04) {
        names.push("LEFT");
    }
    if (mask & 0x10) {
        names.push("INTERNAL");
    }
    return names.length > 0 ? names.join("|") : "NONE";
}

/**
 * LV_TEXT_ALIGN_* → the Scene's horizontal alignment name.
 *
 * The enum is AUTO, LEFT, CENTER, RIGHT — AUTO is 0 and means "the base direction's leading edge",
 * which for this app (LTR) is LEFT. The renderer resolves AUTO that way; the name is kept so the
 * wire is not lying about what LVGL reported.
 */
export function textAlignName(
    value: number | undefined
): "AUTO" | "LEFT" | "CENTER" | "RIGHT" | undefined {
    switch (value) {
        case 0:
            return "AUTO";
        case 1:
            return "LEFT";
        case 2:
            return "CENTER";
        case 3:
            return "RIGHT";
        default:
            return undefined;
    }
}

function wirePartToScene(wire: WirePart): ScenePart | undefined {    const name = WIRE_PART_NAMES[wire.p];
    if (!name) {
        return undefined; // e.g. CUSTOM1 with no Scene equivalent
    }
    if (NEVER_DRAWN_PART_NAMES.includes(name)) {
        return undefined;
    }
    const part: ScenePart = { part: name, state: "default" };

    if (wire.area) {
        part.area = { ...wire.area };
    }
    if (wire.radius != null) {
        part.radius = wire.radius;
    }
    if (wire.opa != null) {
        part.opacity = alpha(wire.opa);
    }

    if (wire.bgColor != null || wire.gradDir != null) {
        const bg: SceneBg = {};
        const color = hexColor(wire.bgColor);
        if (color) {
            bg.color = color;
        }
        const opacity = alpha(wire.bgOpa);
        if (opacity != null) {
            bg.opacity = opacity;
        }
        const dir = gradDirName(wire.gradDir);
        if (dir) {
            const grad: SceneGradient = {
                color: hexColor(wire.gradColor) ?? "#000000",
                stop: wire.gradStop ?? 255,
                dir,
            };
            const gradOpacity = alpha(wire.gradOpa);
            if (gradOpacity != null) {
                grad.opacity = gradOpacity;
            }
            /*
             * LVGL draws the ramp from `bg_color` to `bg_grad_color` between `bg_main_stop` and
             * `bg_grad_stop` — so the START of the ramp is the background colour, and these are its
             * position and opacity (defaults 0 and opaque).
             */
            if (wire.bgMainStop != null && wire.bgMainStop !== 0) {
                grad.fromStop = wire.bgMainStop;
            }
            const fromOpacity = alpha(wire.bgMainOpa);
            if (fromOpacity != null && fromOpacity < 1) {
                grad.fromOpacity = fromOpacity;
            }
            bg.grad = grad;
        }
        part.bg = bg;
    }

    if (wire.borderWidth != null) {
        part.border = {
            color: hexColor(wire.borderColor),
            opacity: alpha(wire.borderOpa),
            width: wire.borderWidth,
            side: borderSideName(wire.borderSide),
            post: wire.borderPost ? true : undefined,
        };
    }

    /*
     * A SYMBOL background image — the theme's `bg_image_src = LV_SYMBOL_OK` on a checked checkbox's
     * marker. It is a font glyph, not a bitmap, so it carries no `srcId`; the part's text style (set
     * below) is what gives it its colour and size, exactly as lv_obj_draw.c does.
     */
    if (wire.bgSymbol) {
        const bgImage: SceneBgImage = { srcId: "", symbol: wire.bgSymbol };
        /*
         * A symbol is drawn as a GLYPH, in the part's own text font and text colour — LVGL hands the
         * symbol to the label draw path — so the dump emits the text styling next to the codepoint
         * and it is carried here. Without it the renderer fell back to the part's box for the size
         * and to black for the colour: a calendar's month arrows came out black, 28 px tall, on a
         * white-on-blue button.
         */
        const symbolMetrics = lvglTextMetrics(wire.fontSize);
        const symbolColor = hexColor(wire.textColor);
        const symbolText: SceneText = { str: wire.bgSymbol };
        if (symbolColor) {
            symbolText.color = symbolColor;
        }
        const symbolOpacity = alpha(wire.textOpa);
        if (symbolOpacity != null) {
            symbolText.opacity = symbolOpacity;
        }
        if (symbolMetrics.size != null) {
            symbolText.size = symbolMetrics.size;
        }
        if (symbolMetrics.baseline != null) {
            symbolText.baseline = symbolMetrics.baseline;
        }
        bgImage.text = symbolText;
        part.bgImage = bgImage;
    }

    if (wire.outlineWidth != null) {
        part.outline = {
            color: hexColor(wire.outlineColor),
            opacity: alpha(wire.outlineOpa),
            width: wire.outlineWidth,
            pad: wire.outlinePad ?? 0,
        };
    }

    if (wire.shadowWidth != null) {
        part.shadow = {
            color: hexColor(wire.shadowColor),
            opacity: alpha(wire.shadowOpa),
            width: wire.shadowWidth,
            spread: wire.shadowSpread ?? 0,
            ofsX: wire.shadowOfsX ?? 0,
            ofsY: wire.shadowOfsY ?? 0,
        };
    }

    // An arc/line width alone is not enough to draw: start/end and possibly the source image come
    // from the widget model, which merges them in below.
    //
    // An arc widget splits across two parts: MAIN is the track (an `arc_color` drawn between
    // `arcBgStart`/`arcBgEnd`) and INDICATOR is the value sweep (between `arcStart`/`arcEnd`). A part
    // that carries only the track must not also become a value arc, or the track would be painted
    // twice — once in the track colour and once in the value colour.
    if (wire.arcWidth != null) {
        const isTrack = name === "MAIN";
        part.arc = {
            start: isTrack ? undefined : wire.arcStart ?? 0,
            end: isTrack ? undefined : wire.arcEnd ?? 3600,
            width: wire.arcWidth,
            color: isTrack ? undefined : hexColor(wire.arcColor),
            opacity: isTrack ? undefined : alpha(wire.arcOpa),
            rounded: wire.arcRounded ? true : undefined,
            bgColor: isTrack ? hexColor(wire.arcColor) : undefined,
            bgOpacity: isTrack ? alpha(wire.arcOpa) : undefined,
            bgWidth: isTrack ? wire.arcWidth : undefined,
            bgStart: isTrack ? wire.arcBgStart ?? 0 : undefined,
            bgEnd: isTrack ? wire.arcBgEnd ?? 3600 : undefined,
            /*
             * The ring itself. Both parts carry it, so the track and the value sweep cannot drift
             * onto different circles — LVGL draws the indicator at `radius - inset`.
             */
            centerX: wire.arcCx,
            centerY: wire.arcCy,
            radius: wire.arcR,
            inset: isTrack ? undefined : wire.arcInset,
        };
    }

    if (wire.lineWidth != null) {
        part.line = {
            points: [],
            width: wire.lineWidth,
            color: hexColor(wire.lineColor),
            opacity: alpha(wire.lineOpa),
        };
    }

    return part;
}

/**
 * Does this part actually carry anything to draw?
 *
 * Exported because the fidelity harness needs the same answer: an object whose parts all come back
 * empty paints nothing of its own — its box is covered by another widget that draws it (a textarea's
 * internal label is the measured case) — so there is nothing to compare and the pixels in its box
 * belong to that widget's row.
 */
export function partHasDrawing(part: ScenePart): boolean {
    if (part.bg && (part.bg.color || part.bg.grad)) {
        return true;
    }
    if (part.bgImage) {
        return true;
    }
    if (part.border && part.border.width) {
        return true;
    }
    if (part.outline && part.outline.width) {
        return true;
    }
    if (part.shadow && part.shadow.width) {
        return true;
    }
    if (part.arc && part.arc.width) {
        return true;
    }
    if (part.line && part.line.width && part.line.points.length >= 4) {
        return true;
    }
    if (part.img) {
        return true;
    }
    return !!(part.text && part.text.str);
}

/**
 * Map a button matrix's cells and per-state styles onto the Scene.
 *
 * The styles borrow the part conversion: a cell's appearance is the ITEMS part resolved for the
 * cell's own state, and every field it carries means exactly what it means on a part. Presenting the
 * block as MAIN for that call is what gets past the slot/name mapping — the name it comes back with
 * is dropped, because a cell is not a part of the object (which is also why `ITEMS` never reaches a
 * Scene part: see NEVER_DRAWN_PART_NAMES).
 */
function wireButtonMatrixToScene(wire: WireButtonMatrix): SceneButtonMatrix {
    const styles: SceneButtonStyle[] = [];
    for (const wireStyle of wire.styles ?? []) {
        const style = wireStyleToScene(wireStyle);
        /*
         * The cell's text styling rides on the same style block. It is not set by
         * `wirePartToScene` (a part gets its text from the widget model, which a cell has none of),
         * so it is read here from the same fields the dump emits for a part.
         */
        const metrics = lvglTextMetrics(wireStyle.fontSize);
        const color = hexColor(wireStyle.textColor);
        const textAlign = textAlignName(wireStyle.textAlign);
        const opacity = alpha(wireStyle.textOpa);
        if (color || opacity != null || metrics.size != null || textAlign) {
            const text: SceneText = { str: "" };
            if (color) text.color = color;
            if (opacity != null) text.opacity = opacity;
            if (metrics.size != null) text.size = metrics.size;
            if (metrics.baseline != null) text.baseline = metrics.baseline;
            if (textAlign) text.textAlign = textAlign;
            style.text = text;
        }
        styles.push({ state: wireStyle.state, style });
    }

    return {
        cells: wire.cells.map(cell => {
            const textArea =
                cell.txt != null && cell.tw != null && cell.th != null
                    ? { x: cell.tx ?? 0, y: cell.ty ?? 0, w: cell.tw, h: cell.th }
                    : undefined;
            return {
                area: { x: cell.x, y: cell.y, w: cell.w, h: cell.h },
                textArea,
                text: cell.txt,
                state: cell.s ?? 0,
            };
        }),
        styles,
    };
}

/**
 * The style fields of a wire style block, without a part name.
 *
 * Used for a button matrix cell, whose style LVGL resolves per cell state rather than for a part of
 * the object.
 */
function wireStyleToScene(wire: Omit<WirePart, "p">): ScenePartStyle {
    const part = wirePartToScene({ ...wire, p: 0 } as WirePart);
    const style: ScenePartStyle = { ...(part as ScenePartStyle | undefined) };
    delete (style as { part?: unknown }).part;
    delete (style as { state?: unknown }).state;
    delete (style as { area?: unknown }).area;
    return style;
}

/**
 * Map a wire dump onto the Scene contract, merging in whatever the widget model knows.
 *
 * Content (`text`, `img`) and any declared `parts` are attached to the widget's MAIN part, which
 * is where LVGL draws them for every widget in this editor.
 */
export function wireToScene(
    wire: WireScene,
    lookup?: SceneWidgetLookup
): Scene {
    const objects: SceneObject[] = [];

    for (const raw of wire.objects) {
        const info = lookup ? lookup(raw.ptr) : undefined;

        const candidates = raw.parts
            .map(wirePartToScene)
            .filter((part): part is ScenePart => !!part);

        const order = (name: ScenePartName) => {
            const index = PART_PAINT_ORDER.indexOf(name);
            return index === -1 ? PART_PAINT_ORDER.length : index;
        };
        candidates.sort((a, b) => order(a.part) - order(b.part));

        const main = candidates.find(part => part.part === "MAIN");
        const wireMain = raw.parts.find(part => part.p === 0);
        const wirePlaceholder = raw.parts.find(part => part.p === 7);
        /*
         * The dump's string is what LVGL is drawing NOW: the Flow runtime writes label and textarea
         * text at run time, and an empty textarea draws its placeholder instead. Neither is in the
         * widget model, which only holds the design-time value — so the canvas and the SVG disagreed
         * for every runtime-assigned string. The model stays the fallback (an older runtime emits no
         * live text).
         *
         * A string made of `LV_SYMBOL_*` glyphs is drawn too: the renderer resolves those codepoints
         * through the bundled Font Awesome face (see `fontFamilyOf`).
         */
        const liveText = raw.liveText || undefined;
        const liveTextPart = raw.liveTextPart ?? 0;
        /*
         * A textarea draws its text through an internal label child — `ta->label =
         * lv_label_create(obj)`, which the dump emits as its own object with the content box the
         * text belongs in. Drawing the model's string on the textarea as well painted it twice, a
         * few pixels apart (measured: two `10:20 AM` nodes in the SVG), so MAIN stays text-free for
         * textareas and the placeholder part (7) carries the only string a textarea owns.
         */
        const isTextarea = info?.type === "textarea";

        if (main) {
            const modelText = info?.text;
            const liveMain = liveTextPart === 0 ? liveText : undefined;
            if (!isTextarea && (modelText || liveMain)) {
                const text: SceneText = { ...(modelText ?? { str: "" }) };
                if (liveMain) {
                    text.str = liveMain;
                }
                if (text.color == null && wireMain?.textColor != null) {
                    text.color = hexColor(wireMain.textColor);
                }
                if (text.opacity == null) {
                    text.opacity = alpha(wireMain?.textOpa);
                }
                if (text.textAlign == null) {
                    const align = textAlignName(wireMain?.textAlign);
                    if (align) {
                        text.textAlign = align;
                    }
                }
                const metrics = lvglTextMetrics(wireMain?.fontSize);
                if (text.size == null && metrics.size != null) {
                    text.size = metrics.size;
                }
                if (metrics.baseline != null) {
                    text.baseline = metrics.baseline;
                }
                main.text = text;
            }
            /*
             * Textarea placeholder.
             *
             * LVGL draws a textarea's TEXT when it has one and its PLACEHOLDER when it does not —
             * with the TEXTAREA_PLACEHOLDER part, which the default theme greys
             * (`lv_palette_darken(GREY, 2)`) rather than using MAIN's colour. The live string wins
             * when the runtime supplies it; the widget model's placeholder is the fallback.
             *
             * Without this every empty textarea rendered as nothing at all. On `home_screen` that
             * was the measured temperature, its unit, the setpoint and the humidity value — 1776 px
             * of `#616161`, the single largest source of whole-surface delta.
             */
            const placeholderPart = candidates.find(
                part => part.part === "TEXTAREA_PLACEHOLDER"
            );
            /*
             * Which string, if any, the placeholder part draws:
             *  - the runtime reported a placeholder (part 7) -> that string;
             *  - the runtime reported a textarea's TEXT (part 0) -> nothing at all, because a
             *    textarea only shows its placeholder while it has no text;
             *  - the runtime reported nothing (older build) -> the widget model's placeholder.
             */
            let placeholderStr: string | undefined;
            if (liveTextPart === 7) {
                placeholderStr = liveText;
            } else if (isTextarea) {
                placeholderStr = raw.liveText == null ? info?.placeholder : undefined;
            } else if (!info?.text?.str) {
                placeholderStr = info?.placeholder;
            }
            if (placeholderPart && placeholderStr) {
                const metrics = lvglTextMetrics(wirePlaceholder?.fontSize);
                /*
                 * The placeholder's alignment comes from the TEXTAREA_PLACEHOLDER part, not from the
                 * textarea's MAIN part — LVGL draws it with `lv_obj_init_draw_label_dsc(obj,
                 * LV_PART_TEXTAREA_PLACEHOLDER, ...)` and that descriptor's align is what positions
                 * the string inside the internal label's box.
                 */
                placeholderPart.text = {
                    str: placeholderStr,
                    color: hexColor(wirePlaceholder?.textColor),
                    opacity: alpha(wirePlaceholder?.textOpa),
                    size: metrics.size,
                    baseline: metrics.baseline,
                    textAlign: textAlignName(wirePlaceholder?.textAlign),
                };
            }
            if (info?.img) {
                const img = { ...info.img };
                // Natural size + alignment come from LVGL (it owns the drawing geometry); the
                // source comes from the widget model.
                if (raw.imgW && raw.imgH) {
                    img.naturalWidth = raw.imgW;
                    img.naturalHeight = raw.imgH;
                    const align = imageAlignName(raw.imgAlign);
                    // 10 is an internal marker that resolves to no public name; keep the model's.
                    if (align) {
                        img.align = align;
                    }
                } else {
                    /*
                     * A widget that owns a bitmap the dump cannot describe. The wire carries the
                     * geometry only for an `lv_image` object (`lv_image_get_src_width`), so a widget
                     * drawing its bitmap as a `bg_image_src` — an imgbutton — arrives with no size at
                     * all, and the renderer then letterboxed the bitmap into the widget's box: LVGL
                     * does not do that. It draws a bitmap at its SOURCE size, placed inside the box.
                     * Measured on `home_screen`'s imgbutton, a 38x60 PNG in a 35x60 box:
                     *
                     * | placement | differing px |
                     * |---|---|
                     * | letterboxed into the box (what it did) | 128 |
                     * | stretched across the box | 22 |
                     * | natural size, centred | 6 |
                     * | **natural size, top-left** | **0** |
                     *
                     * The size therefore comes from the bitmap's own header (`imageNaturalSize`), and
                     * the alignment from LVGL's rule for a background image, which is where a widget's
                     * own bitmap lands: top-left of the box. Everything else keeps the renderer's
                     * existing default, so a widget type this has not been measured on is unchanged.
                     */
                    const natural = imageNaturalSize(img.srcId);
                    if (natural) {
                        img.naturalWidth = natural.width;
                        img.naturalHeight = natural.height;
                        if (info.type === "imgbutton") {
                            img.align = "TOP_LEFT";
                        }
                    }
                }
                main.img = img;
            }
        }

        /*
         * The wire cannot tell "this part is used" from "this part inherited a theme default": the
         * theme gives every part a text colour and font, so slots like CURSOR or
         * TEXTAREA_PLACEHOLDER come back looking non-empty for every object. Keep MAIN always (it is
         * where the object's own box lives) and drop the rest unless they carry something drawable.
         */
        const drawable = candidates.filter(part =>
            part.part === "MAIN" ? true : partHasDrawing(part)
        );

        const area: SceneRect = { ...raw.area };
        const object: SceneObject = {
            ptr: raw.ptr,
            parentPtr: raw.parentPtr ? raw.parentPtr : undefined,
            index:
                typeof raw.index === "number" && raw.index >= 0
                    ? raw.index
                    : objects.length,
            type: info?.type ?? "object",
            area,
            /*
             * Where LVGL draws the text: its content box, not the object's box. The theme pads most
             * widgets even when the widget model declares no padding, so without this every text run
             * sits a few pixels high and left of the canvas's.
             */
            textArea: raw.textArea ? { ...raw.textArea } : undefined,
            parts: drawable,
        };
        if (info?.objId) {
            object.objId = info.objId;
        }
        if (info?.name) {
            object.name = info.name;
        }
        /*
         * A button matrix's cells. They belong to the object that draws them, so they ride on it
         * rather than becoming objects of their own — LVGL draws them from the map, and there is no
         * child object behind any of them.
         */
        if (raw.btnm && raw.btnm.cells && raw.btnm.cells.length > 0) {
            object.buttonMatrix = wireButtonMatrixToScene(raw.btnm);
        }
        if (raw.hidden || info?.hidden) {
            object.hidden = true;
        }
        if (raw.scroll && (raw.scroll.x !== 0 || raw.scroll.y !== 0)) {
            object.scroll = { ...raw.scroll };
        }
        /*
         * Clipping.
         *
         * LVGL clips an object's children to the OBJECT'S OWN BOX — `lv_refr.c` intersects the
         * parent layer with `obj->coords` for every object without LV_OBJ_FLAG_OVERFLOW_VISIBLE, and
         * that is the same box whether or not the object can scroll. The runtime therefore reports
         * only *whether* children are clipped, and the box is the object's own area.
         *
         * This used to be the object's CONTENT box, which is smaller: on `schedule_screen` the
         * canvas drew a table row's labels at y = 252..264 inside a panel whose content box ends at
         * y = 254, so every one of them was erased from the SVG. It also used to round the clip with
         * the MAIN radius, which nothing asks for — LVGL only does that when `clip_corner` is set.
         *
         * The widget model may declare its own clip (an editor-side hint) and keeps priority when
         * the runtime says nothing.
         */
        if (raw.clipChildren) {
            object.clip = { ...area };
        } else if (info?.clip) {
            object.clip = { ...info.clip };
        }
        if (info?.transform) {
            object.transform = { ...info.transform };
        }
        // Lift a uniform MAIN radius to the object so parts without their own radius inherit it.
        if (main && main.radius != null && object.radius == null) {
            object.radius = main.radius;
        }

        objects.push(object);
    }

    return {
        sceneVersion: SCENE_VERSION,
        width: wire.width,
        height: wire.height,
        bgColor: hexColor(wire.bgColor),
        rootPtr: wire.rootPtr,
        objects,
    };
}

/** Validate + convert a raw dump string. Returns `undefined` when the payload is unusable. */
export function parseSceneDump(
    text: string,
    lookup?: SceneWidgetLookup
): Scene | undefined {
    try {
        const raw = JSON.parse(text) as WireScene;
        if (!raw || raw.sceneVersion !== SCENE_VERSION || !Array.isArray(raw.objects)) {
            return undefined;
        }
        return wireToScene(raw, lookup);
    } catch {
        return undefined;
    }
}

// ---------------------------------------------------------------------------------------
// the binding
// ---------------------------------------------------------------------------------------

/** The subset of the Emscripten module this binding needs (typed locally, no shared typings). */
export interface SceneDumpWasm {
    _lvglDumpScene: (root: number, out: number, outLen: number) => number;
    _lvglCountObjects?: (root: number) => number;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
    /** Present when the runtime exports it; otherwise HEAPU8 is used. */
    UTF8ToString?: (ptr: number) => string;
    HEAPU8?: Uint8Array;
}

const INITIAL_SCRATCH = 4096;
const MAX_ATTEMPTS = 4;

/**
 * Calls `lvglDumpScene` into a scratch buffer that is allocated once and grown on demand, so a
 * repaint never allocates per frame.
 *
 * Everything is guarded: if the runtime was built without the dump function (any LVGL version
 * other than 9.5, or a stale artifact), `isAvailable()` is false and `dump()` returns undefined,
 * which is what lets the caller fall back to the canvas path instead of crashing.
 */
export class SceneDump {
    private scratchPtr = 0;
    private scratchLen = 0;
    /** Kept so dispose() can free the buffer after the provider stops returning a module. */
    private lastWasm: SceneDumpWasm | undefined;

    /**
     * `resolveWasm` is a provider rather than a value because the runtime creates its WASM module
     * inside `mount()` — after this object is constructed.
     */
    constructor(private readonly resolveWasm: () => SceneDumpWasm | undefined) {}

    private wasm(): SceneDumpWasm | undefined {
        const wasm = this.resolveWasm();
        if (wasm) {
            this.lastWasm = wasm;
        }
        return wasm;
    }

    isAvailable(): boolean {
        const wasm = this.wasm();
        return (
            !!wasm &&
            typeof wasm._lvglDumpScene === "function" &&
            typeof wasm._malloc === "function" &&
            typeof wasm._free === "function"
        );
    }

    /**
     * Why the dump is (un)usable — the distinction matters because the remedies differ:
     *
     * - `"no-module"`   the runtime has not created its WASM module yet. Normal during mount; wait.
     * - `"not-booted"`  the module exists but its exports are not assigned yet. Normal; wait.
     * - `"no-dump"`     the module is booted (its other wasm exports like `_malloc` are present) but
     *                   `_lvglDumpScene` is missing. That is never a timing artefact: it means the
     *                   loaded `.wasm` predates the scene dump, which in practice is a **stale
     *                   cached artifact** (the glue JS is always fetched fresh, the binary is not).
     *                   See `runtime-artifacts.ts`.
     * - `"ok"`
     *
     * The booted check deliberately keys off `_malloc` rather than the dump itself: a module whose
     * exports are half-assigned would otherwise be misreported as a stale build and trigger a
     * pointless 2.2 MB refresh.
     */
    diagnose(): "no-module" | "not-booted" | "no-dump" | "ok" {
        const wasm = this.wasm();
        if (!wasm) {
            return "no-module";
        }
        if (typeof wasm._malloc !== "function") {
            return "not-booted";
        }
        if (typeof wasm._lvglDumpScene !== "function") {
            return "no-dump";
        }
        return "ok";
    }

    /** Number of objects in a subtree, or -1 when the runtime has no counter. */
    countObjects(rootPtr: number): number {
        const wasm = this.wasm();
        if (!wasm || typeof wasm._lvglCountObjects !== "function") {
            return -1;
        }
        return wasm._lvglCountObjects(rootPtr);
    }

    /** Raw Scene JSON, or `undefined` when unavailable or the dump failed. */
    dump(rootPtr: number): string | undefined {
        const wasm = this.wasm();
        if (
            !wasm ||
            typeof wasm._lvglDumpScene !== "function" ||
            typeof wasm._malloc !== "function" ||
            typeof wasm._free !== "function"
        ) {
            return undefined;
        }

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            if (!this.ensureScratch(wasm, INITIAL_SCRATCH)) {
                return undefined;
            }
            const result = wasm._lvglDumpScene(rootPtr, this.scratchPtr, this.scratchLen);
            if (result >= 0) {
                return this.readString(wasm, this.scratchPtr);
            }
            // -(requiredSize + 1): grow once to exactly what the dump needs, then retry.
            const required = -result;
            if (required <= this.scratchLen) {
                return undefined; // would loop forever; treat as a hard failure
            }
            wasm._free(this.scratchPtr);
            this.scratchPtr = 0;
            if (!this.ensureScratch(wasm, required + 1)) {
                return undefined;
            }
        }
        return undefined;
    }

    /** Convenience: dump + map + enrich in one call. */
    dumpScene(rootPtr: number, lookup?: SceneWidgetLookup): Scene | undefined {
        const text = this.dump(rootPtr);
        return text === undefined ? undefined : parseSceneDump(text, lookup);
    }

    /** Release the scratch buffer (component unmount). Safe to call twice. */
    dispose(): void {
        const wasm = this.lastWasm ?? this.resolveWasm();
        if (wasm && this.scratchPtr) {
            wasm._free(this.scratchPtr);
        }
        this.scratchPtr = 0;
        this.scratchLen = 0;
        this.lastWasm = undefined;
    }

    private ensureScratch(wasm: SceneDumpWasm, size: number): boolean {
        if (this.scratchPtr && this.scratchLen >= size) {
            return true;
        }
        if (this.scratchPtr) {
            wasm._free(this.scratchPtr);
            this.scratchPtr = 0;
        }
        this.scratchLen = size;
        this.scratchPtr = wasm._malloc(size);
        if (!this.scratchPtr) {
            this.scratchLen = 0;
            return false;
        }
        return true;
    }

    private readString(wasm: SceneDumpWasm, ptr: number): string | undefined {
        if (typeof wasm.UTF8ToString === "function") {
            return wasm.UTF8ToString(ptr);
        }
        if (wasm.HEAPU8) {
            const heap = wasm.HEAPU8;
            let end = ptr;
            while (end < heap.length && heap[end] !== 0) {
                end++;
            }
            return new TextDecoder().decode(heap.subarray(ptr, end));
        }
        return undefined;
    }
}
