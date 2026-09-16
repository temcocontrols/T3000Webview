/**
 * LVGL 9 SVG renderer — fidelity scorecard (P5).
 *
 * ADDITIVE: new file, and **pure**: it compares two RGBA buffers and two rectangles. No DOM, no WASM,
 * no canvas API — so the metrics themselves are unit-tested with synthetic pixels, and only the
 * *capture* of those buffers needs a browser (see `svg-diff-harness.ts`).
 *
 * WHY THE CANVAS IS THE ORACLE
 * ----------------------------
 * The canvas path draws the LVGL WASM framebuffer itself, so it is the reference by construction: any
 * difference is a *translation* bug in the SVG layer, not a layout difference, because both surfaces
 * are driven by the same LVGL run. That is what makes a pixel metric meaningful here.
 *
 * WHAT IS COMPARED
 * ----------------
 * - `pixelDiffPct`  — share of pixels whose channels differ by more than the tolerance. Primary
 *                     pass/fail; catches wrong colours, missing fills, wrong geometry.
 * - `maxChannelDelta` — worst single-channel difference. Catches small-area but severe errors (a
 *                     mis-coloured icon in a large screen stays under the pixel threshold otherwise).
 * - `bboxIoU`        — per-object intersection-over-union between the LVGL area and the SVG node's
 *                     box. Localises layout errors even when colours happen to be close.
 * - `meanChannelDelta` — average difference, useful for spotting systematic anti-aliasing offsets
 *                     (a small non-zero mean everywhere is text/font hinting, not a bug).
 */

export interface RgbaImage {
    width: number;
    height: number;
    /** RGBA, row-major, 4 bytes per pixel — the layout of `ImageData.data`. */
    data: Uint8ClampedArray | Uint8Array;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface DiffOptions {
    /**
     * Per-channel difference that still counts as equal (default 8).
     *
     * `compareInk` reads it too, as the cut for "is this mask disagreement a real difference?": an
     * unmatched ink pixel whose colour agrees within the tolerance is the luminance CUT moving, not
     * the drawing (see `compareInk`). Without it (0) every mask disagreement counts, which is what the
     * fixtures and the strict callers expect.
     */
    tolerance?: number;
    /** Restrict the comparison to a region, e.g. one object's box. */
    region?: Rect;
    /**
     * Boxes inside the region that belong to another row, and are therefore not compared here.
     *
     * A container's box contains everything its children draw, so measuring a container over its whole
     * box reports its children's deltas a second time — once under the widget that drew them and once
     * under every ancestor that contains them (measured: `holiday_calender_screen`'s panel reported
     * 79% while the only wrong thing inside it was the calendar, itself excluded as procedural).
     * Subtracting the descendants' boxes leaves the container's own chrome, which is what its row is
     * about; each descendant is still measured on its own row.
     */
    exclude?: Rect[];
    /**
     * Accept a candidate pixel when the reference holds a matching pixel within this many pixels
     * (default 0 = exact).
     *
     * Rasterised content needs it: LVGL paints a glyph from its own hinted bitmap while the browser
     * paints it from an outline, so a stroke routinely lands half a pixel over. Measured on
     * `home_screen`, correct 14-18 px labels differ on 25-74% of their pixels under an exact
     * comparison — enough that a correct label is indistinguishable from a missing one. A 1 px
     * radius keeps a missing or displaced string failing while letting correct text pass.
     *
     * `maxChannelDelta` and `meanChannelDelta` stay exact, so severity is never softened by it.
     */
    matchRadius?: number;
    /** Luminance cut for the ink-mask metric (`compareInk`); default `INK_THRESHOLD`. */
    inkThreshold?: number;
}

export interface DiffResult {
    /** Pixels compared. */
    compared: number;
    /** Pixels outside the tolerance. */
    differing: number;
    /** `differing / compared * 100`, the primary metric. */
    pixelDiffPct: number;
    maxChannelDelta: number;
    meanChannelDelta: number;
}

/**
 * The same geometric statement for a row whose colours never cross the ink threshold.
 *
 * `countInkEdges` can only see a drawing that HAS bright ink: its predicate is `luminance >=
 * INK_THRESHOLD`. A row whose shape sits just under the cut therefore reports `inkPx = 0`, `edgePx = 0`
 * and is judged on a bare fraction of its area — measured on `home_screen`, a mid-blue button
 * (`#456ad4`, luminance 106 against a threshold of 110) whose rounded corners are anti-aliased
 * differently by the two rasterisers: 8 differing pixels of the 6.6 the 0.5% budget allowed, on the
 * four corner arcs only, each one a 33%-vs-51% blend of the same two colours. The allowance exists
 * exactly for that difference and was blind to it.
 *
 * So where the ink mask sees nothing, the boundary is taken against the region's OWN backdrop: a pixel
 * is content when it differs from the region's most common colour by more than `tolerance`, and a
 * content pixel on the edge of that content is a boundary pixel — the same one-per-boundary-pixel
 * allowance, computed from what the row actually draws instead of from one colour polarity of it.
 */
export function countDrawingEdges(
    image: RgbaImage,
    region: Rect,
    exclude: readonly Rect[] | undefined,
    tolerance: number
): number {
    const counts = new Map<number, number>();
    let samples = 0;
    for (let y = region.y; y < region.y + region.h; y++) {
        for (let x = region.x; x < region.x + region.w; x++) {
            if (exclude && isExcluded(exclude, region, x, y)) {
                continue;
            }
            const offset = (y * image.width + x) * 4;
            const key =
                (image.data[offset] << 16) |
                (image.data[offset + 1] << 8) |
                image.data[offset + 2];
            counts.set(key, (counts.get(key) ?? 0) + 1);
            samples += 1;
        }
    }
    if (samples === 0) {
        return 0;
    }
    let backdrop = -1;
    let best = -1;
    for (const [key, count] of counts) {
        if (count > best) {
            best = count;
            backdrop = key;
        }
    }
    const isContent = (x: number, y: number): boolean => {
        if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
            return false;
        }
        const offset = (y * image.width + x) * 4;
        const data = image.data;
        return (
            Math.abs(data[offset] - ((backdrop >> 16) & 0xff)) > tolerance ||
            Math.abs(data[offset + 1] - ((backdrop >> 8) & 0xff)) > tolerance ||
            Math.abs(data[offset + 2] - (backdrop & 0xff)) > tolerance
        );
    };
    let edgePx = 0;
    for (let y = region.y; y < region.y + region.h; y++) {
        for (let x = region.x; x < region.x + region.w; x++) {
            if (exclude && isExcluded(exclude, region, x, y)) {
                continue;
            }
            if (!isContent(x, y)) {
                continue;
            }
            if (
                x <= region.x ||
                y <= region.y ||
                x >= region.x + region.w - 1 ||
                y >= region.y + region.h - 1 ||
                !isContent(x - 1, y) ||
                !isContent(x + 1, y) ||
                !isContent(x, y - 1) ||
                !isContent(x, y + 1)
            ) {
                edgePx += 1;
            }
        }
    }
    return edgePx;
}

/**
 * The rasterisation allowance for a row: one differing pixel per boundary pixel of the row's drawing.
 *
 * Which boundary, decided the same way the verdict decides whether ink can be measured at all: the
 * region's bright ink when it has any (`countInkEdges`), and otherwise the edge of the drawing
 * measured against the region's own backdrop (`countDrawingEdges`). A region whose content never
 * reaches `INK_THRESHOLD` — a mid-blue button, a pale panel on a pale page — has no bright ink to
 * count, and taking its (nonzero) `edgePx` at face value would leave the row judged on a bare
 * fraction of its area instead of on the drawing it is measured for.
 */
export function boundaryAllowancePx(
    image: RgbaImage,
    region: Rect,
    exclude: readonly Rect[] | undefined,
    tolerance: number
): number {
    const edges = countInkEdges(image, region, exclude);
    return edges.inkPx >= MIN_INK_PX
        ? edges.edgePx
        : countDrawingEdges(image, region, exclude, tolerance);
}

/**
 * How much ink a region holds, and how much of it lies on the ink's boundary.
 *
 * The boundary count is what makes a per-pixel budget meaningful for a **stroke**. Two rasterisers
 * agree on a thin band's geometry and still disagree on its edges, because the browser anti-aliases
 * them and LVGL's software renderer rasterises them hard: measured on `home_screen`'s 210x210 gauge, a
 * 2 px ring at radius 104 differs on 675 px at tolerance 30 with a 1 px match radius — every one of
 * them on the ring's two edges, `edgePx = 723`, and the ink masks agree to **0.0%**. A budget that is
 * a fraction of the *area* cannot express that: the ring's box is 44100 px, so 0.5% allows 220 px for
 * a shape whose edges alone are 723. Hence `edgePx`: one differing pixel per boundary pixel is the
 * rasterisation allowance, which is a geometric statement, not a tuned number.
 */
export interface InkEdges {
    /** Ink pixels in the region (luminance at or above `INK_THRESHOLD`). */
    inkPx: number;
    /** Ink pixels with a non-ink 4-neighbour. */
    edgePx: number;
}

/**
 * Ink and ink-boundary counts for a region, honouring `exclude` like every other metric.
 *
 * `edgePx` includes the region's border as a boundary: ink that runs under the region's edge (a ring
 * clipped by its own box) is boundary ink by construction, and counting it keeps a fully inked region
 * from reporting zero edges.
 */
export function countInkEdges(
    image: RgbaImage,
    region: Rect,
    exclude?: readonly Rect[]
): InkEdges {
    const ink = (x: number, y: number): boolean => {
        const offset = (y * image.width + x) * 4;
        const data = image.data;
        return (
            (data[offset] * 299 + data[offset + 1] * 587 + data[offset + 2] * 114) / 1000 >=
            INK_THRESHOLD
        );
    };
    let inkPx = 0;
    let edgePx = 0;
    for (let y = region.y; y < region.y + region.h; y++) {
        for (let x = region.x; x < region.x + region.w; x++) {
            if (exclude && isExcluded(exclude, region, x, y)) {
                continue;
            }
            if (!ink(x, y)) {
                continue;
            }
            inkPx += 1;
            if (
                x <= region.x ||
                y <= region.y ||
                x >= region.x + region.w - 1 ||
                y >= region.y + region.h - 1 ||
                !ink(x - 1, y) ||
                !ink(x + 1, y) ||
                !ink(x, y - 1) ||
                !ink(x, y + 1)
            ) {
                edgePx += 1;
            }
        }
    }
    return { inkPx, edgePx };
}

/**
 * Ink-mask comparison: the metric for content LVGL rasterises itself.
 *
 * A per-channel comparison cannot judge a glyph. LVGL paints one from its own hinted 4bpp bitmap, the
 * browser paints the same glyph from an outline with its own anti-aliasing, and the two agree on
 * *where the ink is* while disagreeing on *how much* every edge pixel carries — measured: a correct
 * 14-18 px label reads 12-26% at a tolerance of 30 with a one-pixel radius, so a budget expressed that
 * way cannot tell a correct label from a slightly bold one.
 *
 * Both rasters are therefore reduced to "is there ink here" (luminance at or above `threshold`) and
 * compared as masks with a one-pixel tolerance: ink with no counterpart in the other mask is counted,
 * and the score is the share of all ink that is unmatched. A correct label lands near zero; a missing,
 * displaced or duplicated string lands near 100%.
 *
 * An unmatched pixel only counts when the two rasters actually disagree there (`tolerance`, the same
 * per-channel cut the pixel metric uses). A luminance cut alone cannot tell ink from a background that
 * happens to sit on it: measured on `main_menu`, a panel's gradient passes 110 one pixel earlier in the
 * candidate than in the reference, which turned **670 background pixels into "extra ink" (100%)** while
 * the two colours differed by 2 units — a false failure, since those pixels are the panel the row's own
 * parent draws, not anything this row paints. A missing glyph is unaffected: it differs by 200+ units.
 */
export interface InkMaskResult {
    referenceInk: number;
    candidateInk: number;
    /** Reference ink with no candidate ink within `radius`. */
    missingInk: number;
    /** Candidate ink with no reference ink within `radius`. */
    extraInk: number;
    /** `(missing + extra) / (reference + candidate) * 100` — 0 when the two masks agree. */
    inkDiffPct: number;
    threshold: number;
    radius: number;
    /**
     * Mask disagreements that were ignored because the two rasters agree on the pixel itself.
     *
     * Reported rather than hidden: they are the measure of how close the two backgrounds sat to
     * `threshold`, and a large number here is a hint that the row's backdrop is not what it should be.
     */
    thresholdOnly: number;
}

/** Luminance at or above which a pixel counts as ink. */
export const INK_THRESHOLD = 110;

/**
 * The largest per-channel difference at one pixel — the same measure the pixel metric takes.
 *
 * Used to tell a REAL ink difference from a threshold artefact: an ink mask is a hard cut on
 * luminance, so a background that sits within a couple of units of it classifies one way in the
 * reference and the other way in the candidate while the two pixels are the same colour.
 */
function channelDeltaAt(
    a: RgbaImage,
    b: RgbaImage,
    x: number,
    y: number
): number {
    const i = (y * a.width + x) * 4;
    return Math.max(
        Math.abs(a.data[i] - b.data[i]),
        Math.abs(a.data[i + 1] - b.data[i + 1]),
        Math.abs(a.data[i + 2] - b.data[i + 2])
    );
}

function isInk(
    data: Uint8ClampedArray | Uint8Array,
    offset: number,
    threshold: number
): boolean {
    // Rec.601 luma over the 0..255 channels. The pages are dark, so the cut can be generous.
    return (
        (data[offset] * 299 + data[offset + 1] * 587 + data[offset + 2] * 114) / 1000 >=
        threshold
    );
}

/**
 * Compare two rasters as ink masks over a region.
 *
 * `exclude` is honoured like everywhere else: a box that belongs to another row contributes no ink to
 * either side, so a container can neither be blamed for nor credited with its children's drawing.
 */
export function compareInk(
    reference: RgbaImage,
    candidate: RgbaImage,
    options: DiffOptions = {}
): InkMaskResult {
    const radius = options.matchRadius ?? 1;
    const threshold = options.inkThreshold ?? INK_THRESHOLD;
    /*
     * 0 keeps the raw mask comparison (every disagreement counts), which is what a caller that does not
     * state a tolerance is asking for. The harness passes the row's own, so a mask flip the pixel
     * metric cannot see is not reported as ink.
     */
    const tolerance = options.tolerance ?? 0;
    const exclude = options.exclude;
    const region = options.region
        ? clampRegion(options.region, reference)
        : { x: 0, y: 0, w: reference.width, h: reference.height };

    const inkAt = (image: RgbaImage, x: number, y: number) =>
        isInk(image.data, (y * image.width + x) * 4, threshold);

    /** Is there ink of `other` at (x, y), or within `radius` of it? */
    const hasCounterpart = (other: RgbaImage, x: number, y: number) => {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (
                    nx < region.x ||
                    ny < region.y ||
                    nx >= region.x + region.w ||
                    ny >= region.y + region.h ||
                    isExcluded(exclude, region, nx, ny)
                ) {
                    continue;
                }
                if (inkAt(other, nx, ny)) {
                    return true;
                }
            }
        }
        return false;
    };

    let referenceInk = 0;
    let candidateInk = 0;
    let missingInk = 0;
    let extraInk = 0;
    let thresholdOnly = 0;
    for (let y = region.y; y < region.y + region.h; y++) {
        for (let x = region.x; x < region.x + region.w; x++) {
            if (isExcluded(exclude, region, x, y)) {
                continue;
            }
            const refInk = inkAt(reference, x, y);
            const candInk = inkAt(candidate, x, y);
            /*
             * A mask disagreement the pixel metric cannot see is the threshold, not the drawing:
             * the two rasters hold the same colour here, one of them just falls on the other side of
             * the cut. Counting it would report a background as ink (and vice versa).
             */
            const realDifference =
                tolerance === 0 || channelDeltaAt(reference, candidate, x, y) > tolerance;
            if (refInk) {
                referenceInk += 1;
                if (!candInk && !hasCounterpart(candidate, x, y)) {
                    if (realDifference) {
                        missingInk += 1;
                    } else {
                        thresholdOnly += 1;
                    }
                }
            }
            if (candInk) {
                candidateInk += 1;
                if (!refInk && !hasCounterpart(reference, x, y)) {
                    if (realDifference) {
                        extraInk += 1;
                    } else {
                        thresholdOnly += 1;
                    }
                }
            }
        }
    }

    const total = referenceInk + candidateInk;
    return {
        referenceInk,
        candidateInk,
        missingInk,
        extraInk,
        inkDiffPct: total === 0 ? 0 : ((missingInk + extraInk) / total) * 100,
        threshold,
        radius,
        thresholdOnly,
    };
}

/**
 * The boxes a row must not be measured on: everything another object draws inside this one's box.
 *
 * A row is about the pixels ITS object painted, and geometry is the only cheap way to say which pixels
 * those are. Two cases, one rule — the larger box gives up the pixels the smaller one claims:
 *
 * 1. **Containment.** A container's box holds everything its children draw, so measuring the container
 *    over its whole box reports its children's deltas a second time (measured: `holiday_calender_screen`'s
 *    panel at 79% while the only wrong thing inside it was the calendar).
 * 2. **Partial overlap.** Two widgets can overlap without either containing the other, which is not a
 *    container case at all: measured on `network_config`, an IP separator label's box (172..370) holds
 *    the four octet textareas (170..230, 240..300, 310..370, 380..440) — *siblings*, painted before it —
 *    so the label's row was charged with their digits' anti-aliasing: 224 differing pixels at a tolerance
 *    of 30, of which ~210 were the textareas' glyphs and ~14 were the label's own dot (2 px off).
 *
 * The smaller box wins because that is the widget drawn OVER the larger one by convention (a label over
 * a panel, a value over a gauge — the harness doc already recorded the gauge case, where a numeric label
 * is a SIBLING of the arc it sits on). Each object still has its own row, so nothing goes unmeasured:
 * the pixels move from the larger row to the smaller one, they do not disappear.
 *
 * An exact overlap (identical areas) counts as containment — LVGL does stack two objects on one box, and
 * each row then drops the other's box, exactly as it did before partial overlaps were handled.
 */
export function exclusionBoxes(
    objects: readonly { ptr: number; area: Rect }[]
): Map<number, Rect[]> {
    const excludes = new Map<number, Rect[]>();
    for (const object of objects) {
        const list: Rect[] = [];
        const a = object.area;
        for (const other of objects) {
            if (other === object) {
                continue;
            }
            const b = other.area;
            const contained =
                b.x >= a.x &&
                b.y >= a.y &&
                b.x + b.w <= a.x + a.w &&
                b.y + b.h <= a.y + a.h;
            if (contained) {
                list.push(b);
                continue;
            }
            const overlaps =
                b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y;
            if (!overlaps || b.w * b.h >= a.w * a.h) {
                continue;
            }
            /* Only the part they share moves; the rest of `other` is outside this row anyway. */
            const x = Math.max(a.x, b.x);
            const y = Math.max(a.y, b.y);
            list.push({
                x,
                y,
                w: Math.min(a.x + a.w, b.x + b.w) - x,
                h: Math.min(a.y + a.h, b.y + b.h) - y,
            });
        }
        if (list.length > 0) {
            excludes.set(object.ptr, list);
        }
    }
    return excludes;
}

/** Fidelity thresholds from the design doc (`fidelity-harness.md` §4). */
export const TIER_THRESHOLDS: {
    T1: { pixelDiffPct: number; bboxIoU: number; inkDiffPct: number; edgeAllowancePx: number };
    T2: {
        pixelDiffPct: number;
        inkDiffPct?: number;
        bboxIoU?: number;
        edgeAllowancePx: number;
    };
} = {
    /**
     * Style-only widgets: label, panel, button, slider, switch, bar, arc, image, …
     *
     * `bboxIoU` is the design doc's number and stays on the row as severity, but it does **not**
     * decide the verdict — a box IoU between a layout box and the renderer's ink extent is not a
     * fidelity measurement. Measured across the 13-page sweep, every row that failed *only* on it had
     * a pixel diff of 0.00-0.22% inside its own box, because the two boxes legitimately differ:
     *
     * | Row | LVGL area | SVG node box | IoU | pixels |
     * |---|---|---|---|---|
     * | a title panel | `15,0 450x40` | `16,2 448x37` | 0.921 | 0.12% |
     * | a container | `0,0 480x320` | children's union | 0.613 | 0.00% |
     * | a label | `98,78 194x16` | `98,77.4 189.3x16.8` | 0.930 | 2.51% |
     *
     * The border is drawn *inside* the object's box, a text run cannot fill a line box, and a
     * container is not filled by its children. Placement is therefore judged by `boxOffsetPx` — how
     * far the node's ink sticks out of the object's box, which is what a misplacement actually looks
     * like — and by the pixel budget, which is what catches content drawn in the wrong place.
     *
     * `inkDiffPct: 25` is the same budget T2 uses, and T1 needs it for the mirror-image reason: ink the
     * renderer draws where LVGL draws none. Measured on `schedule_screen`, six buttons whose boxes hold
     * no ink at all on the canvas read 0.30% of pixels — under any per-channel budget — while their ink
     * masks disagreed on **100%**, because there was candidate ink and no reference ink.
     */
    T1: { pixelDiffPct: 0.5, bboxIoU: 0.99, inkDiffPct: 25, edgeAllowancePx: 1 },
    /**
     * Animated / layered widgets, and anything whose content LVGL rasterises itself.
     *
     * The pixel budget is 2% and — matching the design doc — the box is NOT enforced here. The two
     * rectangles are not the same thing: the SVG node's box is the INK (`getBBox()` of a `<text>`
     * element) while the LVGL area is the layout box, and glyph ink cannot fill a line box. Measured
     * across the 13-page sweep, correct text rows land at 0.92-0.94 IoU, so enforcing 0.95 failed
     * every correct label. Misplacement is still caught, by the pixel budget itself: a shifted or
     * duplicated string lands far above 2%.
     *
     * `inkDiffPct` is the budget that decides a rasterised row; the per-channel budget above applies
     * only when a row has no ink mask. Measured (ink compared with a two-pixel radius, see the harness):
     *
     * | Row | pixelDiffPct (tol 30, r1) | ink% |
     * |---|---|---|
     * | a correct label, "Tstat - 11" | 8.9 | 0.9 |
     * | a correct label, "Initialising . . ." | 24.8 | 6.4 |
     * | the same label with its SVG node removed | 95.2 | 100 |
     *
     * 25% therefore passes correct text with a 4x margin and still fails anything missing, moved or
     * duplicated — which the per-channel metric could not do: it read 12-26% for correct text.
     */
    T2: { pixelDiffPct: 2, inkDiffPct: 25, edgeAllowancePx: 1 },
};

/**
 * Per-channel tolerance each tier is compared at.
 *
 * The tolerance and the match radius are ONE decision, not two, and a budget cannot be read without
 * them. Measured on `start_up_screen`'s "Initialising . . .": the ink boxes agree within a pixel
 * (canvas `x=193 y=264 94x14`, SVG `x=193 y=264 93x14`) yet the row reads 24.8% exactly, 12-26% at a
 * tolerance of 8 *with* a 1 px match radius, and **1.6%** at 30. The difference is stroke coverage —
 * LVGL paints a glyph from its own hinted 4bpp bitmap, the browser from an outline — which is exactly
 * what a tolerance is for, not a defect.
 *
 * T1 is compared at the same tolerance as T2, for a different reason: every T1 shape that has a
 * curved edge (a rounded button, a switch's track and knob, an arc's band) is anti-aliased by the
 * browser and rasterised without anti-aliasing by LVGL's software renderer, so the same geometry
 * differs by a soft ring of 9-30 per channel along its boundary. Measured with the exclusions applied
 * (so each row is judged on its own pixels only), across six pages:
 *
 * | Row | tolerance 8 | tolerance 30 |
 * |---|---|---|
 * | `wifi_config` switch 50x25, 96 px differing | 7.68% | 0.00% |
 * | `time` button 100x30, 35 px differing | 2.20% | 0.19% |
 * | `schedule_screen` panel 460x30, 432 px differing | 6.65% | 0.00% |
 * | `parameters` panel 480x280, 48 px differing | 0.91% | 0.00% |
 * | `home_screen` checkbox 220x20 (glyphs, substance) | 31.45% | 27.80% |
 * | `home_screen` arc 210x210 (band geometry, substance) | 7.42% | 3.92% |
 *
 * Every one of those T1 differences is in the 9-30 band, i.e. edge coverage and nothing else, while
 * real differences (glyph shape, arc geometry) survive the change with most of their magnitude. The
 * *budget* stays at 0.5%, so this stops counting rasteriser anti-aliasing as infidelity without
 * accepting any geometry, colour or placement error.
 */
export const TIER_TOLERANCE: { T1: number; T2: number; T3: number } = {
    T1: 30,
    T2: 30,
    T3: 8,
};

/**
 * How far a node's ink may stick out of the object's box before a T1 row fails.
 *
 * Measured on correct rows across the pages: a text run's ink reaches 2.4 px past its line box
 * (`start_up_screen`), a switch's knob and its shadow 2.5 px past its box (`schedule_screen`), and a
 * label's advance width 2.1-4.25 px (T2, so not box-checked anyway). The misplacements this rule
 * exists to catch are an order of magnitude larger: 7.5-233 px before the clip clamp, 52 px for a
 * container whose children were clipped, 8 px for a schedule table panel. Three pixels covers the
 * rasteriser and shadow bleed of a correct row and nothing else.
 */
export const BOX_SLACK_PX = 3;

/**
 * The largest distance by which `inner` overhangs `outer`, in pixels; 0 when it is fully inside.
 *
 * This is the box rule, in place of an IoU: a renderer's ink extent is legitimately smaller than the
 * LVGL layout box (a text run in a line box, a border drawn inside the box, a container its children do
 * not fill), so shrinking is not evidence. Sticking *out* is what a misplacement or a wrongly sized
 * shape looks like.
 */
export function boxOffsetPx(outer: Rect, inner: Rect): number {
    return Math.max(
        0,
        outer.x - inner.x,
        outer.y - inner.y,
        inner.x + inner.w - (outer.x + outer.w),
        inner.y + inner.h - (outer.y + outer.h)
    );
}

/** The tolerance a row is measured at, from its tier. */
export function toleranceForTier(tier: ScorecardRow["tier"]): number {
    return TIER_TOLERANCE[tier] ?? TIER_TOLERANCE.T1;
}

export interface IouResult {
    intersection: number;
    union: number;
    /** `intersection / union`, or 1 when both rects are empty. */
    iou: number;
}

function clampRegion(region: Rect, image: RgbaImage): Rect {
    const x = Math.max(0, Math.floor(region.x));
    const y = Math.max(0, Math.floor(region.y));
    const right = Math.min(image.width, Math.ceil(region.x + region.w));
    const bottom = Math.min(image.height, Math.ceil(region.y + region.h));
    return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

function isEmpty(result: DiffResult): boolean {
    return result.compared === 0;
}

/**
 * True when (x, y) is inside one of the excluded boxes.
 *
 * The boxes are clipped to the region first, so a box that merely touches the region cannot exclude
 * anything outside it.
 */
function isExcluded(
    exclude: readonly Rect[] | undefined,
    region: Rect,
    x: number,
    y: number
): boolean {
    if (!exclude) {
        return false;
    }
    for (const box of exclude) {
        if (
            x >= Math.max(region.x, box.x) &&
            x < Math.min(region.x + region.w, box.x + box.w) &&
            y >= Math.max(region.y, box.y) &&
            y < Math.min(region.y + region.h, box.y + box.h)
        ) {
            return true;
        }
    }
    return false;
}

/**
 * True when a reference pixel within `radius` of (x, y) matches the candidate pixel there.
 *
 * This is "is this ink present a pixel away?", which is what a sub-pixel stroke shift looks like.
 * Neighbours are clamped to the region so one object's pixels are never borrowed from another's —
 * and excluded boxes are skipped for the same reason.
 */
function matchesWithinRadius(
    reference: RgbaImage,
    candidate: RgbaImage,
    x: number,
    y: number,
    region: Rect,
    tolerance: number,
    radius: number,
    exclude?: Rect[]
): boolean {
    const cand = (y * reference.width + x) * 4;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) {
                continue;
            }
            const nx = x + dx;
            const ny = y + dy;
            if (
                nx < region.x ||
                ny < region.y ||
                nx >= region.x + region.w ||
                ny >= region.y + region.h ||
                isExcluded(exclude, region, nx, ny)
            ) {
                continue;
            }
            const ref = (ny * reference.width + nx) * 4;
            if (
                Math.abs(reference.data[ref] - candidate.data[cand]) <= tolerance &&
                Math.abs(reference.data[ref + 1] - candidate.data[cand + 1]) <= tolerance &&
                Math.abs(reference.data[ref + 2] - candidate.data[cand + 2]) <= tolerance &&
                Math.abs(reference.data[ref + 3] - candidate.data[cand + 3]) <= tolerance
            ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Compare two images. They must have the same dimensions: a size mismatch is a caller error, and
 * silently cropping would hide exactly the kind of bug this is meant to catch.
 */
export function diffImages(
    reference: RgbaImage,
    candidate: RgbaImage,
    options: DiffOptions = {}
): DiffResult {
    if (
        reference.width !== candidate.width ||
        reference.height !== candidate.height
    ) {
        throw new Error(
            `diffImages: size mismatch ${reference.width}x${reference.height} vs ` +
                `${candidate.width}x${candidate.height}`
        );
    }
    const tolerance = options.tolerance ?? 8;
    const matchRadius = options.matchRadius ?? 0;
    const exclude = options.exclude;
    const region = options.region
        ? clampRegion(options.region, reference)
        : { x: 0, y: 0, w: reference.width, h: reference.height };

    let compared = 0;
    let differing = 0;
    let maxChannelDelta = 0;
    let totalDelta = 0;

    for (let y = region.y; y < region.y + region.h; y++) {
        for (let x = region.x; x < region.x + region.w; x++) {
            if (isExcluded(exclude, region, x, y)) {
                continue;
            }
            const offset = (y * reference.width + x) * 4;
            let worst = 0;
            let sum = 0;
            for (let channel = 0; channel < 4; channel++) {
                const delta = Math.abs(
                    reference.data[offset + channel] - candidate.data[offset + channel]
                );
                sum += delta;
                if (delta > worst) {
                    worst = delta;
                }
            }
            compared += 1;
            totalDelta += sum;
            if (worst > maxChannelDelta) {
                maxChannelDelta = worst;
            }
            if (worst > tolerance) {
                if (
                    matchRadius > 0 &&
                    matchesWithinRadius(
                        reference,
                        candidate,
                        x,
                        y,
                        region,
                        tolerance,
                        matchRadius,
                        exclude
                    )
                ) {
                    // Ink present a pixel away: a rasterisation shift, not a missing stroke.
                } else {
                    differing += 1;
                }
            }
        }
    }

    return {
        compared,
        differing,
        pixelDiffPct: compared === 0 ? 0 : (differing / compared) * 100,
        maxChannelDelta,
        meanChannelDelta: compared === 0 ? 0 : totalDelta / (compared * 4),
    };
}

/** Intersection-over-union of two rectangles — how well two boxes agree, 0..1. */
export function rectIoU(a: Rect, b: Rect): number {
    return iouOf(a, b).iou;
}

export function iouOf(a: Rect, b: Rect): IouResult {
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.w, b.x + b.w);
    const bottom = Math.min(a.y + a.h, b.y + b.h);
    const intersection =
        Math.max(0, right - left) * Math.max(0, bottom - top);
    const union = a.w * a.h + b.w * b.h - intersection;
    if (union <= 0) {
        // Two empty rects agree completely; anything else with an empty union cannot be compared.
        return { intersection: 0, union: 0, iou: a.w * a.h === 0 && b.w * b.h === 0 ? 1 : 0 };
    }
    return { intersection, union, iou: intersection / union };
}

/**
 * The least ink a row must hold before its ink mask is allowed to decide.
 *
 * Below it, the metric is not measuring ink but the luminance threshold: one pixel landing on the
 * other side of `INK_THRESHOLD` reads as 50% (two ink pixels total) or 100% (one). Measured across
 * the thirteen pages, every failing row with less than 32 ink pixels was of that kind — `panel
 * inkPx=6 px=14/13919`, `button inkPx=1 px=2/657`, `textarea inkPx=2 px=2/774` (all `ink=100`, all with
 * two to eighteen pixels differing out of thousands) — while every row where the metric was doing real
 * work held an order of magnitude more: a correct label 300-900, a defective one 1248.
 *
 * A handful of pixels is not left unjudged: the pixel budget catches it, and it is the stricter
 * metric there (a missing 3x3 knob is 9 px of a 1000 px box, i.e. 0.9% against a 0.5% budget).
 */
export const MIN_INK_PX = 32;

/**
 * `unmeasured` is its own verdict, not a pass: a row whose region holds no comparable pixels says
 * nothing about fidelity, and reporting it as a pass is how a scorecard starts overstating itself.
 * It happens by design — the root screen's region is entirely covered by its children's boxes, which
 * are excluded so the children's drawing is not charged to it twice.
 */
export type Verdict = "pass" | "fail" | "excluded" | "unmeasured";

/**
 * Widgets LVGL draws procedurally, with nothing on the wire to reproduce them.
 *
 * A chart, qrcode, colour wheel, lottie player, canvas, table or scale paints its contents from
 * private state (a data series, a pixel buffer, a matrix of cells) inside its own draw callback.
 * None of that is recoverable from the per-part style values a scene dump carries, so these widgets
 * are EXCLUDED by decision D2 rather than failed. The list lives here, in one reviewable place: it
 * must never be inferred from a diff that merely happens to be large.
 *
 * A **button matrix and a calendar used to be on this list** and are not any more: the dump emits
 * their cells (each button's box, text, centred text box and state, plus the cell style per state),
 * and the renderer draws them, so both are measured like any other widget. That is what makes a
 * calendar's day grid a real row instead of an exclusion — see `rendering.md` (part slots) and
 * `svgEmitButtonMatrix()` in `svg_scene_dump.cpp` for the wire.
 */
export const PROCEDURAL_WIDGET_TYPES: readonly string[] = [
    "chart",
    "qrcode",
    "colorwheel",
    "lottie",
    "canvas",
    "table",
    "scale",
];

function isProcedural(widget: string): boolean {
    return PROCEDURAL_WIDGET_TYPES.indexOf(widget.trim().toLowerCase()) !== -1;
}

export interface TierInput {
    /** Widget subtype from the widget model, e.g. "label", "calendar". */
    type: string;
    /** True when any part carries text or a bitmap. */
    carriesTextOrImage?: boolean;
    /**
     * True when an ANCESTOR is a procedural widget.
     *
     * A chart's legend or a canvas's internal objects are ordinary objects drawn from their owner's
     * private state, so they inherit the exclusion — otherwise one out-of-scope widget reports a
     * dozen failures.
     */
    insideProcedural?: boolean;
}

/**
 * The tier a row belongs to.
 *
 * - **T1** pure vector style — backgrounds, borders, arcs, lines. Must match to 0.5% and IoU 0.99.
 * - **T2** content LVGL rasterises itself: glyph bitmaps from its own Montserrat (hinting and all)
 *   and bitmaps/images. A browser's text or image pipeline cannot reproduce those pixel for pixel,
 *   so the threshold is 2% — but the box must still agree to IoU 0.95, which is what keeps
 *   misplaced, duplicated or missing content failing instead of being excused.
 * - **T3** procedurally drawn widgets, excluded by decision D2.
 *
 * Deliberately NOT a function of the measured diff: a tier assigned because a diff is large is how a
 * scorecard stops meaning anything.
 */
export function tierForObject(input: TierInput): ScorecardRow["tier"] {
    if (input.insideProcedural || isProcedural(input.type)) {
        return "T3";
    }
    return input.carriesTextOrImage ? "T2" : "T1";
}

/** The recorded reason for a row's tier, so an exclusion or a relaxed threshold is never implicit. */
export function tierNote(input: TierInput): string | undefined {
    if (input.insideProcedural) {
        return "drawn from an ancestor procedural widget's private state (decision D2)";
    }
    const tier = tierForObject(input);
    if (tier === "T3") {
        return "procedural widget (decision D2): drawn from private state, not from part styles";
    }
    if (tier === "T2") {
        return "content LVGL rasterises (glyph bitmap / image): a browser cannot match it pixel for pixel";
    }
    return undefined;
}

/** True when `type` is a widget LVGL draws procedurally (exported for the row builder's walk). */
export function isProceduralType(type: string): boolean {
    return isProcedural(type);
}

export interface ScorecardRow {
    /** Widget subtype, e.g. `slider`. */
    widget: string;
    /** LVGL part the measurement applies to (`MAIN`, `INDICATOR`, …) or `-` for whole-object. */
    part: string;
    /** Fixture or page the measurement came from. */
    source: string;
    pixelDiffPct: number;
    maxChannelDelta: number;
    /**
     * Pixels compared and pixels outside the tolerance, the counts `pixelDiffPct` is derived from.
     *
     * They are what the budget is actually taken on: `allowed = max(budget% * comparedPx,
     * edgeAllowancePx * edgePx)`, because a budget that is a fraction of the AREA cannot describe a
     * stroke (see `InkEdges`). Absent on hand-built rows, where the percentage stands alone.
     */
    comparedPx?: number;
    differingPx?: number;
    /** Ink-boundary pixels in the row's region (`countInkEdges`), the rasterisation allowance. */
    edgePx?: number;
    /**
     * Share of ink with no counterpart in the other raster (`compareInk`), for content LVGL rasterises
     * itself. This is what decides such a row; the per-channel number above stays as severity.
     */
    inkDiffPct?: number;
    /** `referenceInk + candidateInk` — how much ink the mask comparison was taken on. */
    inkPx?: number;
    /** `undefined` when no box comparison was possible (no SVG node, no area). */
    bboxIoU?: number;
    /**
     * How far the node's ink overhangs the object's box (`boxOffsetPx`), 0 when it is inside.
     *
     * This is the box rule a T1 row is judged on; `bboxIoU` above is reported severity only, because a
     * layout box and an ink extent are not the same rectangle.
     */
    boxOffsetPx?: number;
    /** `T1`, `T2` or `T3` — decides the threshold applied. */
    tier: keyof typeof TIER_THRESHOLDS | "T3";
    /**
     * Per-channel tolerance this row was compared at (`TIER_TOLERANCE`), so the percentage is
     * self-describing: a 2% budget means nothing without the tolerance it was measured at.
     */
    tolerance?: number;
    /** Free text: known, accepted deltas are recorded here, never hidden. */
    note?: string;
}

/**
 * The number of differing pixels a row is allowed: the larger of "this share of the area" and "one
 * pixel per ink-boundary pixel".
 *
 * The second term is what makes a ring, a border or a 2 px stroke measurable at all: measured on
 * `home_screen`'s gauge, a correct 2 px ring over radius 104 reads 675 differing pixels with an
 * ink boundary of 723 — 1.53% of a 210x210 box, i.e. over any area-proportional budget, while the
 * ink masks agree to 0.0% and every differing pixel is on one of the ring's two edges.
 *
 * `undefined` when the row carries no counts (a hand-built row), in which case the bare percentage
 * is the rule.
 */
export function pixelAllowancePx(row: ScorecardRow): number | undefined {
    if (row.tier === "T3" || row.comparedPx == null) {
        return undefined;
    }
    const threshold = TIER_THRESHOLDS[row.tier];
    return Math.max(
        (threshold.pixelDiffPct / 100) * row.comparedPx,
        (threshold.edgeAllowancePx ?? 0) * (row.edgePx ?? 0)
    );
}

/**
 * Apply the design-doc thresholds. T3 (procedural widgets: chart/qrcode/colorwheel/lottie/canvas) is
 * excluded by decision D2 rather than failed, and T2 is allowed documented anti-aliasing deltas.
 *
 * Three questions, and a row must answer all three:
 *
 * 1. **Is the ink where it should be?** (`inkDiffPct`, when either side has ink.) This is the only
 *    metric that can tell "the glyph is here, drawn a little heavier" from "the glyph is missing" —
 *    measured: a correct label reads 0.9–6.4%, the same label with its node removed reads 100%.
 * 2. **Are the pixels right?** The per-channel budget, taken on counts rather than on a fraction of
 *    the area, so a stroke gets a rasterisation allowance proportional to its boundary
 *    (`edgePx`) and not to the empty space around it.
 * 3. **Is the drawing inside its own box?** (`boxOffsetPx`.) The IoU is reported, not enforced.
 */
export function verdictFor(row: ScorecardRow): Verdict {
    if (row.tier === "T3") {
        return "excluded";
    }
    if (row.comparedPx === 0) {
        return "unmeasured";
    }
    const threshold = TIER_THRESHOLDS[row.tier];
    const inkBudget = (threshold as { inkDiffPct?: number }).inkDiffPct;
    /*
     * The ink mask is a measurement only when it was taken on enough ink: a region holding a handful of
     * ink pixels says nothing about a drawing (`MIN_INK_PX`). A row with no ink COUNT was not measured
     * by the harness at all (a hand-built row), and its percentage is then all there is to go on.
     */
    const inkMeasurable = row.inkPx == null || row.inkPx >= MIN_INK_PX;
    const inkDecides = inkBudget != null && row.inkDiffPct != null && inkMeasurable;
    const inkOk = !inkDecides || (row.inkDiffPct as number) <= (inkBudget as number);
    const allowedPx = pixelAllowancePx(row);
    const pixelOk =
        allowedPx != null && row.differingPx != null
            ? row.differingPx <= allowedPx
            : row.pixelDiffPct <= threshold.pixelDiffPct;
    /*
     * A rasterised row that HAS an ink mask is decided by that mask, which is what T2's tier note
     * says: "`inkDiffPct` is the budget that decides a rasterised row; the per-channel budget above
     * applies only when a row has no ink mask."
     *
     * The pixels are still reported, and they are the reason this has to be said out loud rather than
     * assumed: a correct 14 px string rasterised twice reads **23%** of its box in differing pixels at
     * a tolerance of 30 and a 1 px radius (measured: `home_screen`'s "HUMIDITY", 377 of 1620 against an
     * allowance of 284) because the browser draws the outline 20% heavier than LVGL's hinted bitmap —
     * one pixel of extra stem, on both sides of every stem. The same row reads 10.6% on the ink mask,
     * which is the metric whose cause is modelled in it (see `compareInk`). Failing a row on a metric
     * whose cause is not modelled in it, while the modelled one reports 10.6% of a 25% budget, is how a
     * gate stops meaning anything. The failure modes this rule could hide are covered elsewhere: a
     * missing, moved or duplicated string reads 100% on the mask, and the per-channel number stays on
     * the row as severity.
     */
    const pixelsDecide = !inkDecides || row.tier !== "T2";
    const hasVisibleDelta = (row.differingPx ?? 1) > 0 || (row.inkDiffPct ?? 0) > 0;
    const pixelOrInkOk = pixelsDecide ? pixelOk : true;
    /*
     * The box rule applies to T1 only, and the design doc says why: the SVG node's box is the INK
     * extent while the LVGL area is the layout box, and a text run's ink legitimately overhangs its
     * line box (measured: a family of `schedule_edit_screen` labels overhang by 7.5 px with an ink
     * agreement of 0.0% and a pixel diff of 0-143 px). For a shape, an overhang means the renderer put
     * drawing outside the widget it belongs to, which is what the rule is for.
     *
     * It also only applies when something is visibly out of place: a transparent shape still counts
     * towards `getBBox()`, so a row whose pixels and ink both match exactly has no visible
     * misplacement to report (`schedule_edit_screen` labels at +7.5 px with 0 of 1200 pixels differing).
     */
    const boxOk =
        row.tier !== "T1" ||
        row.boxOffsetPx == null ||
        !hasVisibleDelta ||
        row.boxOffsetPx <= BOX_SLACK_PX;
    return inkOk && (pixelsDecide ? pixelOk : true) && boxOk ? "pass" : "fail";
}

/** Aggregate verdict for a set of rows: any failure fails the scorecard. */
export function summariseScorecard(rows: ScorecardRow[]): {
    pass: number;
    fail: number;
    excluded: number;
    unmeasured: number;
    failed: ScorecardRow[];
} {
    const failed: ScorecardRow[] = [];
    let pass = 0;
    let excluded = 0;
    let unmeasured = 0;
    for (const row of rows) {
        const verdict = verdictFor(row);
        if (verdict === "excluded") {
            excluded += 1;
        } else if (verdict === "unmeasured") {
            unmeasured += 1;
        } else if (verdict === "pass") {
            pass += 1;
        } else {
            failed.push(row);
        }
    }
    return { pass, fail: failed.length, excluded, unmeasured, failed };
}

function round(value: number, digits = 2): string {
    return value.toFixed(digits);
}

/**
 * Markdown table — the P5 gate artefact and the living record of accepted deltas.
 *
 * `maxΔ` is rendered as an integer because a single channel value does not need decimals, and the
 * rounded percentages keep the table readable when it is pasted into a PR.
 */
export function scorecardToMarkdown(rows: ScorecardRow[]): string {
    const lines = [
        "| Widget | Part | Source | tol | pixelDiffPct | diffPx | allowPx | edgePx | ink% | inkPx | maxΔ | bboxIoU | box+ | Verdict | Note |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ];
    for (const row of rows) {
        const allowance = pixelAllowancePx(row);
        lines.push(
            `| ${row.widget} | ${row.part} | ${row.source} | ${
                row.tolerance ?? toleranceForTier(row.tier)
            } | ${round(row.pixelDiffPct)}% | ${
                row.differingPx == null
                    ? "n/a"
                    : `${row.differingPx}/${row.comparedPx ?? "?"}`
            } | ${allowance == null ? "n/a" : Math.round(allowance)} | ${
                row.edgePx ?? "n/a"
            } | ${row.inkDiffPct == null ? "n/a" : round(row.inkDiffPct)} | ${
                row.inkPx ?? "n/a"
            } | ${Math.round(row.maxChannelDelta)} | ${
                row.bboxIoU === undefined ? "n/a" : round(row.bboxIoU, 3)
            } | ${
                row.boxOffsetPx === undefined ? "n/a" : `${round(row.boxOffsetPx, 1)}px`
            } | ${verdictFor(row)} | ${row.note ?? ""} |`
        );
    }
    const summary = summariseScorecard(rows);
    lines.push("");
    lines.push(
        `**Summary:** ${summary.pass} pass, ${summary.fail} fail, ${summary.excluded} excluded` +
            (summary.unmeasured ? `, ${summary.unmeasured} unmeasured` : "") +
            "."
    );
    if (summary.unmeasured > 0) {
        lines.push(
            "_Note: an `unmeasured` row had no comparable pixels — its region is covered by the boxes " +
                "of other rows (the root screen is the usual case). It is neither a pass nor a failure._"
        );
    }
    return lines.join("\n");
}

/** Convenience: build a row from a diff result plus the optional box agreement. */
export function rowFromDiff(
    base: Pick<ScorecardRow, "widget" | "part" | "source" | "tier" | "note">,
    diff: DiffResult,
    bboxIoU?: number,
    boxOffset?: number
): ScorecardRow {
    return {
        ...base,
        pixelDiffPct: diff.pixelDiffPct,
        maxChannelDelta: diff.maxChannelDelta,
        bboxIoU,
        boxOffsetPx: boxOffset,
    };
}

/** Exposed for callers that want to know whether a comparison was meaningful at all. */
export function hasPixels(result: DiffResult): boolean {
    return !isEmpty(result);
}
