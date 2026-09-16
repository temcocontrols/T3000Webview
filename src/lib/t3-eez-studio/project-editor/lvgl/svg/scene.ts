/**
 * LVGL 9 SVG renderer — Scene contract (types + validation).
 *
 * ADDITIVE: this is a new file. Nothing in the existing editor is modified.
 * See docs/t3000/architecture/lvgl-svg/scene-contract.md for the design.
 *
 * This module is deliberately **dependency-free** (no EEZ Studio imports, no DOM, no WASM,
 * no MobX) so the renderer can be unit-tested against hand-written fixtures.
 *
 * ---------------------------------------------------------------------------------------
 * CONVENTIONS (do not change without bumping SCENE_VERSION)
 *
 * Colours are `#rrggbb` strings. The WASM bridge transfers raw uint32 (cheaper for C) and
 * `scene-dump.ts` converts to `#rrggbb` using the editor's existing colour helpers, so the
 * LVGL byte order stays defined in exactly one place.
 *
 * Coordinates are page-local pixels, integers, y-down, origin top-left. No transform is
 * applied to them — `transform` / `scroll` are carried separately (see SceneObject).
 *
 * "Absent means LVGL default", NOT zero. This matters for opacity: LVGL's default opa is
 * LV_OPA_COVER (fully opaque), so an absent opacity is 1, not 0. Use `alphaOf()`.
 * ---------------------------------------------------------------------------------------
 */

/** Bump on any breaking change to the shapes below; the renderer refuses unknown majors. */
export const SCENE_VERSION = 1;

/**
 * LVGL 9 part names (LVGL_PARTS_9).
 *
 * NOTE: `TICKS` exists only in LVGL_PARTS_8 and must never appear on a 9.5 scene. In LVGL 9
 * ticks are painted through ITEMS (minor) and INDICATOR (major).
 */
export type ScenePartName =
    | "MAIN"
    | "SCROLLBAR"
    | "INDICATOR"
    | "KNOB"
    | "SELECTED"
    | "ITEMS"
    | "CURSOR"
    | "TEXTAREA_PLACEHOLDER";

export const SCENE_PART_NAMES: readonly ScenePartName[] = [
    "MAIN",
    "SCROLLBAR",
    "INDICATOR",
    "KNOB",
    "SELECTED",
    "ITEMS",
    "CURSOR",
    "TEXTAREA_PLACEHOLDER",
];

export type ScenePartState =
    | "default"
    | "pressed"
    | "checked"
    | "focused"
    | "disabled"
    | "edited";

export interface SceneRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Uniform when a number; per-corner when an object (LVGL CLIP_CORNER). */
export type SceneRadius =
    | number
    | { tl: number; tr: number; br: number; bl: number };

export interface SceneGradient {
    /** The colour the ramp ENDS at — LVGL's `bg_grad_color`. */
    color: string;
    /** 0..255 (LVGL stop), matching LV_STYLE_BG_GRAD_STOP. */
    stop: number;
    /** LVGL direction enum name, e.g. "TOP", "BOTTOM_LEFT", "RADIAL_CENTER". */
    dir: string;
    /** Opacity of the ramp's end (LVGL's `bg_grad_opa`); absent = opaque. */
    opacity?: number;
    /**
     * Where the ramp STARTS, 0..255 — LVGL's `bg_main_stop`, default 0.
     *
     * The colour there is the background's own `color`, because LVGL ramps from `bg_color` to
     * `bg_grad_color`. Drawing it as a fade of `bg_grad_color` alone loses the start colour
     * entirely (measured on a gradient-filled button: 74% of its box differed).
     */
    fromStop?: number;
    /** Opacity of the ramp's start (LVGL's `bg_main_opa`); absent = opaque. */
    fromOpacity?: number;
}

export interface SceneBg {
    color?: string;
    opacity?: number;
    grad?: SceneGradient;
}

export interface SceneBgImage {
    srcId: string;
    opacity?: number;
    recolor?: string;
    recolorOpacity?: number;
    tiled?: boolean;
    /**
     * The bitmap's natural (source) size — see `SceneImage.naturalWidth`. A background image is drawn
     * at its source size like any other bitmap, so the renderer needs it too; a dump that does not
     * carry it leaves the renderer to read it from the source itself (`imageNaturalSize`).
     */
    naturalWidth?: number;
    naturalHeight?: number;
    /** Where the bitmap sits in the part's box; a background image defaults to `TOP_LEFT`. */
    align?: string;
    /**
     * The codepoint of an LVGL SYMBOL background image (`bg_image_src = LV_SYMBOL_OK`), set instead
     * of `srcId` when the source is a font glyph rather than a bitmap.
     *
     * The default theme draws a checked checkbox's tick this way, in the part's own text font and
     * text colour, so it has to travel as a glyph: the renderer draws it as a vector path where it
     * knows the shape, and as a text run (through the symbol font) where it does not.
     */
    symbol?: string;
    /**
     * The text style the symbol is drawn with — the part's text colour, font and size.
     *
     * LVGL hands a symbol `bg_image_src` to the label draw path (`lv_obj_draw.c`), so it is painted
     * with the part's TEXT styling, which the dump therefore emits next to the codepoint. It cannot
     * be read from `part.text`: a part with a symbol background image usually has no text of its
     * own, and putting the symbol there would draw it a second time. Measured without it, the
     * calendar's month arrows came out black at the button's box size (28 px) instead of white at
     * the font size.
     */
    text?: SceneText;
}

/** `side` is LVGL's BORDER_SIDE bitmask name, e.g. "TOP|LEFT"; `post` draws after content. */
export interface SceneBorder {
    color?: string;
    opacity?: number;
    width?: number;
    side?: string;
    post?: boolean;
}

export interface SceneOutline {
    color?: string;
    opacity?: number;
    width?: number;
    pad?: number;
}

export interface SceneShadow {
    color?: string;
    opacity?: number;
    width?: number;
    spread?: number;
    ofsX?: number;
    ofsY?: number;
}

export interface SceneText {
    str: string;
    /** LVGL font tag or project font id; also used as the SVG font-family. */
    fontId?: string;
    /** Nominal font size in px (LVGL's line height is converted, see `lvglTextMetrics`). */
    size?: number;
    /**
     * Distance from the top of the text box to the first line's baseline, as LVGL computes it
     * (`line_height - base_line`). Absent = approximate it from `size`.
     */
    baseline?: number;
    color?: string;
    opacity?: number;
    /** LVGL TEXT_ALIGN name, e.g. "CENTER", "TOP_LEFT". Drives BOTH axes when `textAlign` is absent. */
    align?: string;
    /**
     * LVGL's resolved `text_align` for this string, as the runtime reported it.
     *
     * Horizontal ONLY: LVGL never moves a line box vertically, the first line's baseline is always
     * `box.y + baseline`. It is separate from `align` because the model's `align` may name both axes
     * ("BOTTOM_RIGHT") while this is exactly what `lv_obj_init_draw_label_dsc()` read
     * (`draw_dsc->align`) before drawing.
     *
     * It matters whenever the model does not know: a textarea's placeholder is drawn with the
     * TEXTAREA_PLACEHOLDER part's alignment, which the theme/model need not agree on — measured on
     * `network_config`, the canvas centred "168" (x = 253) while the SVG had it at the box's edge
     * (x = 241).
     */
    textAlign?: "AUTO" | "LEFT" | "CENTER" | "RIGHT";
    letterSpace?: number;
    lineSpace?: number;
    /** LVGL TEXT_DECOR name, e.g. "UNDERLINE", "STRIKETHROUGH". */
    decor?: string;
    /** LVGL label long mode / overflow: "CLIP", "ELLIPSIS", "SCROLL", ... */
    overflow?: string;
}

/** `points` is a flat [x0,y0,x1,y1,...] list in page-local pixels. */
export interface SceneLine {
    points: number[];
    width?: number;
    color?: string;
    opacity?: number;
    dashWidth?: number;
    dashGap?: number;
    rounded?: boolean;
}

/** Angles are LVGL tenths of a degree (0.1°), 0° at 3 o'clock, counter-clockwise positive. */
export interface SceneArc {
    /**
     * The value sweep, in LVGL tenths of a degree. Absent on a part that only carries the track.
     */
    start?: number;
    end?: number;
    width?: number;
    color?: string;
    opacity?: number;
    rounded?: boolean;
    /**
     * The ring this arc is drawn on, as `lv_arc.c` computes it.
     *
     * `get_center()` insets the object's box by the MAIN pads, so the centre is not the box's centre
     * and the radius is not `min(w, h) / 2`. `inset` is how far inside the ring the INDICATOR is drawn
     * (`get_indicator_max_pad()`); the track ignores it. Absent = derive both from the box, which is
     * what a hand-built scene has to do (it has no pads to apply).
     */
    centerX?: number;
    centerY?: number;
    radius?: number;
    inset?: number;
    /**
     * The track, which LVGL draws from the arc's MAIN part between `bg_angle_start/end` — a
     * default-themed arc is a 270 degree track, not a full ring. `bgStart`/`bgEnd` are in the same
     * tenths-of-a-degree units as `start`/`end`, and a full circle is 0..3600.
     */
    bgColor?: string;
    bgOpacity?: number;
    bgWidth?: number;
    bgStart?: number;
    bgEnd?: number;
}

export interface SceneImage {
    /** `data:image/png;base64,...` or a URL — straight into <image href>. */
    srcId: string;
    opacity?: number;
    recolor?: string;
    recolorOpacity?: number;
    /** LVGL tenths of a degree. */
    rotation?: number;
    /** 256 = 1× (LVGL zoom units). */
    zoom?: number;
    pivotX?: number;
    pivotY?: number;
    /**
     * The bitmap's natural (source) size in px. When present the renderer draws the bitmap at this
     * size placed by `align`, instead of stretching it across the widget box — LVGL draws an image
     * at its source size, so without this any bitmap that is not exactly the box size looks wrong.
     */
    naturalWidth?: number;
    naturalHeight?: number;
    /** LVGL inner alignment: CENTER, TOP_LEFT, TOP_MID, … STRETCH, TILE, CONTAIN. */
    align?: string;
}

export interface SceneColorFilter {
    color: string;
    opacity: number;
}

export interface SceneTransform {
    /** LVGL tenths of a degree. */
    angle?: number;
    /** 256 = 1×. */
    zoom?: number;
    pivotX?: number;
    pivotY?: number;
    /** 256 = 1×. */
    scaleX?: number;
    scaleY?: number;
    /** 256 = 1×. */
    skewX?: number;
    skewY?: number;
}

export type SceneClip = SceneRect & { radius?: number };

export interface SceneScroll {
    x: number;
    y: number;
}

export interface ScenePart {
    part: ScenePartName;
    state?: ScenePartState;    /** Only when the part's box differs from the object's area. */
    area?: SceneRect;
    /** LVGL styles radius per part, so a part may override the object's radius. */
    radius?: SceneRadius;
    /** LV_STYLE_OPA for this part (0..1). Absent = opaque; applied to the whole part layer. */
    opacity?: number;
    bg?: SceneBg;
    bgImage?: SceneBgImage;
    border?: SceneBorder;
    outline?: SceneOutline;
    shadow?: SceneShadow;
    text?: SceneText;
    line?: SceneLine;
    arc?: SceneArc;
    img?: SceneImage;
    blendMode?: string;
    colorFilter?: SceneColorFilter;
}

/**
 * Everything a part carries except its identity: the style fields, which a cell of a button matrix
 * uses without being a part of the object. See `SceneButtonMatrix`.
 */
export type ScenePartStyle = Omit<ScenePart, "part" | "state" | "area">;

/**
 * One cell of an LVGL button matrix.
 *
 * A button matrix draws its own content: `lv_buttonmatrix.c` walks its map and paints a rect and a
 * text per button, from geometry and per-button styles it keeps privately. None of it is reachable
 * from a per-part dump — the map is built at run time (the calendar generates its day grid from the
 * shown month) and the cells are not children — so the dump emits them (see `svg_scene_dump.cpp`).
 * Without that, a calendar rendered as an empty card in the SVG while the canvas showed the month.
 */
export interface SceneButtonCell {
    /** The button's box, in page coordinates. */
    area: SceneRect;
    /**
     * The box LVGL centres this cell's text in — the text's own measured size, shifted into the
     * middle of the cell by the widget. Absent when the cell carries no text.
     */
    textArea?: SceneRect;
    /** The string this cell draws. */
    text?: string;
    /**
     * The LV_STATE_* bitmask the cell is drawn with (0 = DEFAULT, plus CHECKED / DISABLED / PRESSED
     * / …). A cell's appearance is its state's: `styles` holds one entry per state in use.
     */
    state: number;
}

/** A cell's appearance, as LVGL resolved it for one cell state. */
export interface SceneButtonStyle {
    /** The LV_STATE_* bitmask this style was resolved for. */
    state: number;
    style: ScenePartStyle;
}

/**
 * The cells of a button matrix, and the cell style of each state they are drawn with.
 *
 * `lv_calendar` is the case that made this necessary: its day grid IS a button matrix, so an entire
 * calendar was invisible until its cells were emitted.
 */
export interface SceneButtonMatrix {
    cells: SceneButtonCell[];
    styles: SceneButtonStyle[];
}

export interface SceneObject {
    /** lv_obj_t* — stable identity, used as the SVG patch key. */
    ptr: number;
    /** Absent for the root screen. */
    parentPtr?: number;
    /** LVGL creation index (stable within a page). */
    index: number;
    name?: string;
    /** Project widget objID, emitted as `data-objid` for selection/hit-testing. */
    objId?: string;
    /** Declared sub_type, e.g. "label" | "button" | "slider". */
    type: string;
    hidden?: boolean;
    opacity?: number;
    /** lv_obj_get_coords() */
    area: SceneRect;
    /**
     * Where LVGL draws this object's text — its content box, i.e. `area` inset by border and
     * padding. Absent = the object is not padded, so the text uses `area`.
     */
    textArea?: SceneRect;
    radius?: SceneRadius;
    /**
     * The box this object's CHILDREN are clipped to.
     *
     * LVGL clips children to the object's own coords (`lv_refr.c`: `obj_coords = &obj->coords`
     * unless the object has LV_OBJ_FLAG_OVERFLOW_VISIBLE), so a scene merged from the runtime sets
     * this to the object's own area while the object's own drawing is left alone. A caller that
     * builds a scene by hand may set any box.
     */
    clip?: SceneClip;
    transform?: SceneTransform;
    scroll?: SceneScroll;
    /**
     * The cells this object draws itself, when it is a button matrix (a calendar is one).
     *
     * They are not parts: LVGL resolves their boxes and styles per cell, from the map, so they are
     * carried separately and painted after the object's own parts.
     */
    buttonMatrix?: SceneButtonMatrix;
    /** Flat, parents before children, ascending index. */
    parts: ScenePart[];
}

export interface Scene {
    sceneVersion: number;
    /** Page width in LVGL display px. */
    width: number;
    /** Page height in LVGL display px. */
    height: number;
    /** Resolved page/screen background. */
    bgColor?: string;
    /** lv_obj_t* of the screen object. */
    rootPtr: number;
    objects: SceneObject[];
}

// ---------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------

export class SceneParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SceneParseError";
    }
}

/**
 * LVGL opacity → SVG unit alpha.
 *
 * The scene carries 0..1. An absent value means "LVGL default", which for opacity is
 * LV_OPA_COVER — i.e. fully opaque — NOT transparent. An explicit 0 still means transparent.
 */
export function alphaOf(value: number | undefined): number {
    if (value == null) {
        return 1;
    }
    if (!Number.isFinite(value)) {
        return 1;
    }
    return Math.min(1, Math.max(0, value));
}

/** LVGL zoom units (256 = 1×) → scale factor. */
export function zoomOf(value: number | undefined): number {
    if (value == null || !Number.isFinite(value) || value === 0) {
        return 1;
    }
    return value / 256;
}

/** LVGL tenths of a degree → degrees. */
export function degreesOf(value: number | undefined): number {
    if (value == null || !Number.isFinite(value)) {
        return 0;
    }
    return value / 10;
}

export function isScenePartName(value: unknown): value is ScenePartName {
    return (
        typeof value === "string" &&
        (SCENE_PART_NAMES as readonly string[]).indexOf(value) !== -1
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function requireNumber(
    container: Record<string, unknown>,
    key: string,
    where: string
): number {
    const value = container[key];
    if (!isFiniteNumber(value)) {
        throw new SceneParseError(`${where}: "${key}" must be a finite number`);
    }
    return value;
}

function requireRect(value: unknown, where: string): SceneRect {
    if (!isRecord(value)) {
        throw new SceneParseError(`${where} must be an object {x,y,w,h}`);
    }
    return {
        x: requireNumber(value, "x", where),
        y: requireNumber(value, "y", where),
        w: requireNumber(value, "w", where),
        h: requireNumber(value, "h", where),
    };
}

function parsePart(value: unknown, where: string): ScenePart {
    if (!isRecord(value)) {
        throw new SceneParseError(`${where} must be an object`);
    }
    const part = value.part;
    if (!isScenePartName(part)) {
        // A v8 scene would arrive here with TICKS; fail loudly rather than draw nothing.
        throw new SceneParseError(
            `${where}: unknown part "${String(
                part
            )}" (LVGL 9 parts only: ${SCENE_PART_NAMES.join(", ")})`
        );
    }
    const parsed: ScenePart = { part };
    if (value.state != null) {
        parsed.state = value.state as ScenePartState;
    }
    if (value.area != null) {
        parsed.area = requireRect(value.area, `${where}.area`);
    }
    // The remaining fields are presentation data consumed leniently by the renderer; only
    // `part` and any present `area` need to be structurally valid for the sink to be safe.
    const passthrough = [
        "radius",
        "opacity",
        "bg",
        "bgImage",
        "border",
        "outline",
        "shadow",
        "text",
        "line",
        "arc",
        "img",
        "blendMode",
        "colorFilter",
    ] as const;
    for (const key of passthrough) {
        if (value[key] != null) {
            (parsed as unknown as Record<string, unknown>)[key] = value[key];
        }
    }
    return parsed;
}

function parseObject(value: unknown, where: string): SceneObject {
    if (!isRecord(value)) {
        throw new SceneParseError(`${where} must be an object`);
    }
    const type = value.type;
    if (typeof type !== "string" || type.length === 0) {
        throw new SceneParseError(`${where}: "type" must be a non-empty string`);
    }
    const parts = value.parts;
    if (!Array.isArray(parts)) {
        throw new SceneParseError(`${where}: "parts" must be an array`);
    }
    return {
        ptr: requireNumber(value, "ptr", where),
        parentPtr: isFiniteNumber(value.parentPtr)
            ? (value.parentPtr as number)
            : undefined,
        index: requireNumber(value, "index", where),
        name: typeof value.name === "string" ? value.name : undefined,
        objId: typeof value.objId === "string" ? value.objId : undefined,
        type,
        hidden: value.hidden === true,
        opacity: isFiniteNumber(value.opacity)
            ? (value.opacity as number)
            : undefined,
        area: requireRect(value.area, `${where}.area`),
        textArea: value.textArea != null ? requireRect(value.textArea, `${where}.textArea`) : undefined,
        radius: value.radius as SceneRadius | undefined,
        clip: value.clip as SceneClip | undefined,
        transform: value.transform as SceneTransform | undefined,
        scroll: value.scroll as SceneScroll | undefined,
        /*
         * A button matrix's cells pass through as they are validated by their producer: they arrive
         * from the runtime (the C dump) rather than from a hand-written fixture, and re-deriving them
         * here would only be able to agree or disagree with the same numbers. Their shape is checked
         * where they are read (the renderer indexes each cell's `area` and `state`).
         */
        buttonMatrix: value.buttonMatrix as SceneButtonMatrix | undefined,
        parts: parts.map((p, i) => parsePart(p, `${where}.parts[${i}]`)),
    };
}

/**
 * Validate and narrow untrusted input (a WASM dump string, or a fixture) into a Scene.
 *
 * Throws `SceneParseError` on malformed or unsupported input so callers can disable the SVG
 * surface and fall back rather than render something wrong.
 */
export function parseScene(input: unknown): Scene {
    let raw: unknown = input;
    if (typeof input === "string") {
        try {
            raw = JSON.parse(input);
        } catch (error) {
            throw new SceneParseError(
                `scene is not valid JSON: ${(error as Error).message}`
            );
        }
    }
    if (!isRecord(raw)) {
        throw new SceneParseError("scene must be an object");
    }
    if (raw.sceneVersion !== SCENE_VERSION) {
        throw new SceneParseError(
            `unsupported sceneVersion ${String(
                raw.sceneVersion
            )} (this renderer speaks ${SCENE_VERSION})`
        );
    }
    const objects = raw.objects;
    if (!Array.isArray(objects)) {
        throw new SceneParseError('"objects" must be an array');
    }
    return {
        sceneVersion: SCENE_VERSION,
        width: requireNumber(raw, "width", "scene"),
        height: requireNumber(raw, "height", "scene"),
        bgColor: typeof raw.bgColor === "string" ? raw.bgColor : undefined,
        rootPtr: requireNumber(raw, "rootPtr", "scene"),
        objects: objects.map((o, i) => parseObject(o, `objects[${i}]`)),
    };
}

/** Depth-first walk in paint order (parents before children). */
export function* walkScene(
    scene: Scene
): Generator<{ object: SceneObject; depth: number }> {
    const byPtr = new Map<number, SceneObject>();
    for (const object of scene.objects) {
        byPtr.set(object.ptr, object);
    }
    const children = new Map<number, SceneObject[]>();
    const roots: SceneObject[] = [];
    for (const object of scene.objects) {
        const parent =
            object.parentPtr != null ? byPtr.get(object.parentPtr) : undefined;
        if (parent) {
            const list = children.get(parent.ptr) ?? [];
            list.push(object);
            children.set(parent.ptr, list);
        } else {
            roots.push(object);
        }
    }
    const stack: { object: SceneObject; depth: number }[] = [];
    for (let i = roots.length - 1; i >= 0; i--) {
        stack.push({ object: roots[i], depth: 0 });
    }
    while (stack.length > 0) {
        const entry = stack.pop()!;
        yield entry;
        const kids = children.get(entry.object.ptr);
        if (kids) {
            for (let i = kids.length - 1; i >= 0; i--) {
                stack.push({ object: kids[i], depth: entry.depth + 1 });
            }
        }
    }
}

/**
 * Pointers of every object LVGL does not paint on this page: the hidden ones and their subtrees.
 *
 * One rule, two consumers — the renderer skips these objects, and the fidelity harness must not
 * measure them. They used to be measured, and it is the single largest source of false failures the
 * scorecard had: `time` carries 48 objects of which 21 are children of a hidden sub-screen, and the
 * missing ones were compared against whatever the visible page paints inside their boxes (measured:
 * `panel/MAIN 15.04%`, `button/MAIN 19.52%`, both with no SVG node to compare against, so the row
 * could not even report a box IoU). Cross-checked against `lv_obj_is_visible` in the runtime:
 * 27 of 48 objects visible, and the renderer emitted a node for exactly those 27 and no other.
 *
 * `scene.objects` is flat with parents before children, so one pass suffices.
 */
export function hiddenSubtree(objects: readonly SceneObject[]): Set<number> {
    const hidden = new Set<number>();
    for (const object of objects) {
        const insideHidden = object.parentPtr != null && hidden.has(object.parentPtr);
        if (object.hidden || insideHidden) {
            hidden.add(object.ptr);
        }
    }
    return hidden;
}
