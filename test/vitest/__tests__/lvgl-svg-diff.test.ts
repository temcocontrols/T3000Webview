/**
 * svg-diff metrics tests — synthetic pixels, so the numbers are verifiable by hand.
 */

import { describe, expect, it } from "vitest";
import {
    BOX_SLACK_PX,
    MIN_INK_PX,
    TIER_THRESHOLDS,
    TIER_TOLERANCE,
    boxOffsetPx,
    compareInk,
    countInkEdges,
    diffImages,
    hasPixels,
    iouOf,
    pixelAllowancePx,
    rectIoU,
    rowFromDiff,
    scorecardToMarkdown,
    summariseScorecard,
    isProceduralType,
    tierForObject,
    tierNote,
    toleranceForTier,
    verdictFor,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff";
import type {
    RgbaImage,
    ScorecardRow,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff";
import { describeSkippedObjects, firstFontUrl } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff-harness";

describe("svg-diff — tiers come from what the object is, not from the size of the diff", () => {
    it("excludes the widgets LVGL draws procedurally", () => {
        for (const type of ["chart", "qrcode", "colorwheel", "lottie", "canvas", "table", "scale"]) {
            expect(tierForObject({ type })).toBe("T3");
            expect(tierNote({ type })).toContain("D2");
        }
        // The type comes from the widget model, so case and padding must not matter.
        expect(tierForObject({ type: " Chart " })).toBe("T3");
    });

    it("measures a button matrix and a calendar like any other widget", () => {
        /*
         * Both used to be excluded: the cells of a button matrix are drawn by the widget itself, from
         * a map string that is not on the wire. The dump emits them now (`svgEmitButtonMatrix()`), the
         * renderer draws them, so a calendar's day grid is a real row — with the calendar's own MAIN
         * background as the vector part of it.
         */
        expect(tierForObject({ type: "buttonmatrix" })).toBe("T1");
        expect(tierForObject({ type: "calendar" })).toBe("T1");
        // Its cells and its header carry text, which is the T2 relaxation.
        expect(tierForObject({ type: "calendar", carriesTextOrImage: true })).toBe("T2");
        expect(isProceduralType("calendar")).toBe(false);
        expect(isProceduralType("buttonmatrix")).toBe(false);
    });

    it("relaxes the threshold for content LVGL rasterises itself", () => {
        // Glyph bitmaps and images are rasterised by LVGL's own engine: a browser cannot match them
        // pixel for pixel, so the tier is T2 (2%, IoU 0.95) rather than T1 (0.5%, 0.99).
        expect(tierForObject({ type: "label", carriesTextOrImage: true })).toBe("T2");
        expect(tierForObject({ type: "image", carriesTextOrImage: true })).toBe("T2");
        expect(tierNote({ type: "label", carriesTextOrImage: true })).toContain("rasterises");
    });

    it("keeps pure vector style at T1", () => {
        for (const type of ["panel", "button", "object", "arc"]) {
            expect(tierForObject({ type })).toBe("T1");
            expect(tierNote({ type })).toBeUndefined();
        }
        expect(tierForObject({ type: "panel", carriesTextOrImage: true })).toBe("T2");
    });

    it("excludes the children of a procedural widget with it", () => {
        // A chart's legend or a canvas's internal objects are ordinary objects drawn from their
        // owner's private state, so a page reports them as failures unless it is inherited.
        expect(tierForObject({ type: "object", insideProcedural: true })).toBe("T3");
        expect(tierNote({ type: "object", insideProcedural: true })).toContain("ancestor procedural");
        expect(isProceduralType("chart")).toBe(true);
        expect(isProceduralType("panel")).toBe(false);
        // Inheritance never leaks the other way: a normal child stays measurable.
        expect(tierForObject({ type: "label", carriesTextOrImage: true })).toBe("T2");
    });

    it("fails a rasterised row whose content does not match", () => {
        const row = rowFromDiff(
            { widget: "label", part: "MAIN", source: "home_screen", tier: "T2", note: tierNote({ type: "label", carriesTextOrImage: true }) },
            { compared: 100, differing: 30, pixelDiffPct: 30, maxChannelDelta: 200, meanChannelDelta: 60 },
            0.93
        );
        expect(verdictFor(row)).toBe("fail");
    });

    it("does not gate rasterised content on the box (ink cannot fill a line box)", () => {
        // Correct text rows measure 0.92-0.94 because the SVG box is the ink and the LVGL area is the
        // layout box, so the IoU is a diagnostic there — matching the design doc's T2 rule.
        const row = rowFromDiff(
            { widget: "label", part: "MAIN", source: "home_screen", tier: "T2", note: tierNote({ type: "label", carriesTextOrImage: true }) },
            { compared: 100, differing: 1, pixelDiffPct: 1, maxChannelDelta: 40, meanChannelDelta: 5 },
            0.5
        );
        expect(TIER_THRESHOLDS.T2.bboxIoU).toBeUndefined();
        expect(verdictFor(row)).toBe("pass");
    });

    it("reports a procedural row as excluded however large its diff is", () => {
        const row = rowFromDiff(
            {
                widget: "chart",
                part: "MAIN",
                source: "dashboard",
                tier: tierForObject({ type: "chart" }),
                note: tierNote({ type: "chart" }),
            },
            { compared: 100, differing: 100, pixelDiffPct: 100, maxChannelDelta: 255, meanChannelDelta: 200 }
        );
        expect(verdictFor(row)).toBe("excluded");
        const summary = summariseScorecard([row]);
        expect(summary.excluded).toBe(1);
        expect(summary.fail).toBe(0);
        // The reason is written down, not implied.
        expect(scorecardToMarkdown([row])).toContain("decision D2");
    });
});

describe("svg-diff-harness — embedding the page's web fonts", () => {
    /*
     * A `data:` URL raster is an isolated document: it cannot use the page's font faces, so text
     * would be measured with a fallback family. These cases cover reading the URL out of the
     * `src:` descriptors browsers and bundlers actually emit.
     */
    it("reads the URL out of every src form a bundler emits", () => {
        expect(firstFontUrl("url(Montserrat-Medium.ttf)")).toBe("Montserrat-Medium.ttf");
        expect(firstFontUrl('url("a.woff2") format("woff2")')).toBe("a.woff2");
        expect(firstFontUrl("url('a.woff') format('woff'), url(b.ttf)")).toBe("a.woff");
        expect(firstFontUrl("url( data:font/ttf;base64,AA== ) format('truetype')")).toBe(
            "data:font/ttf;base64,AA=="
        );
    });

    it("returns nothing for a local-only source", () => {
        expect(firstFontUrl('local("Montserrat"), local("Montserrat-Medium")')).toBeUndefined();
        expect(firstFontUrl("")).toBeUndefined();
    });
});

describe("svg-diff-harness — the objects a scorecard does not cover", () => {
    /*
     * The dump walks the whole LVGL tree, hidden sub-screens included: `time` holds 48 objects and
     * paints 27 of them, cross-checked against `lv_obj_is_visible` (27 visible, and a node for
     * exactly those 27). Measuring the other 21 meant comparing a box against pixels that belong to
     * the visible page, with no SVG node and therefore no box IoU either — measured
     * `panel/MAIN 15.04%` and `button/MAIN 19.52%` of pure noise on `time` alone.
     */
    it("says how many objects were left out, and says nothing when there are none", () => {
        expect(describeSkippedObjects(21)).toEqual([
            "21 object(s) not visible on this page (LVGL hides them) — not measured",
        ]);
        // Zero and absent are the same thing here: a page whose objects are all visible has no
        // caveat to report, and an empty warning list is not the same as a missing one.
        expect(describeSkippedObjects(0)).toEqual([]);
        expect(describeSkippedObjects(undefined)).toEqual([]);
    });
});

describe("svg-diff — the match radius for rasterised content", () => {
    it("absorbs a stroke that lands a pixel over, without softening the severity metrics", () => {
        // A vertical stroke at x=4 against the same stroke at x=5: identical geometry, sub-pixel
        // rasterisation shift — what a browser-drawn glyph against an LVGL bitmap looks like.
        const ref = withPixel(solid(10, 1, [0, 0, 0, 255]), 4, 0, [255, 255, 255, 255]);
        const shifted = withPixel(solid(10, 1, [0, 0, 0, 255]), 5, 0, [255, 255, 255, 255]);

        const exact = diffImages(ref, shifted);
        expect(exact.differing).toBe(2);
        expect(exact.pixelDiffPct).toBe(20);

        const dilated = diffImages(ref, shifted, { matchRadius: 1 });
        expect(dilated.differing).toBe(0);
        // Severity is still reported exactly, so a bad row cannot hide behind the radius.
        expect(dilated.maxChannelDelta).toBe(255);
        expect(dilated.meanChannelDelta).toBe(exact.meanChannelDelta);
    });

    it("still catches content that moved beyond the radius", () => {
        const ref = withPixel(solid(10, 1, [0, 0, 0, 255]), 4, 0, [255, 255, 255, 255]);
        const moved = withPixel(solid(10, 1, [0, 0, 0, 255]), 8, 0, [255, 255, 255, 255]);
        expect(diffImages(ref, moved, { matchRadius: 1 }).differing).toBeGreaterThan(0);
    });

    it("does not borrow pixels across the region boundary", () => {
        // The white pixel sits outside the compared box, so the empty box must not match it.
        const ref = withPixel(solid(10, 1, [0, 0, 0, 255]), 9, 0, [255, 255, 255, 255]);
        const empty = solid(10, 1, [0, 0, 0, 255]);
        const result = diffImages(ref, empty, { region: { x: 0, y: 0, w: 3, h: 1 }, matchRadius: 1 });
        expect(result.differing).toBe(0);
        expect(result.compared).toBe(3);
    });
});

/** `width`×`height` image filled with one colour. */
function solid(width: number, height: number, rgba: [number, number, number, number]): RgbaImage {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        data[i * 4] = rgba[0];
        data[i * 4 + 1] = rgba[1];
        data[i * 4 + 2] = rgba[2];
        data[i * 4 + 3] = rgba[3];
    }
    return { width, height, data };
}

/** Copy of an image with one pixel replaced. */
function withPixel(
    image: RgbaImage,
    x: number,
    y: number,
    rgba: [number, number, number, number]
): RgbaImage {
    const data = new Uint8ClampedArray(image.data);
    const offset = (y * image.width + x) * 4;
    data[offset] = rgba[0];
    data[offset + 1] = rgba[1];
    data[offset + 2] = rgba[2];
    data[offset + 3] = rgba[3];
    return { width: image.width, height: image.height, data };
}

/** One colour of an image, as a fresh image — a shape drawn over a background. */
function inkRect(
    image: RgbaImage,
    x: number,
    y: number,
    w: number,
    h: number,
    rgba: [number, number, number, number] = [255, 255, 255, 255]
): RgbaImage {
    let result = image;
    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            result = withPixel(result, x + dx, y + dy, rgba);
        }
    }
    return result;
}

describe("svg-diff — pixel metrics", () => {
    it("reports a perfect match as 0%", () => {
        const image = solid(10, 10, [255, 0, 0, 255]);
        const result = diffImages(image, image);
        expect(result.pixelDiffPct).toBe(0);
        expect(result.maxChannelDelta).toBe(0);
        expect(result.differing).toBe(0);
        expect(result.compared).toBe(100);
        expect(hasPixels(result)).toBe(true);
    });

    it("counts one bad pixel out of a hundred as 1%", () => {
        const reference = solid(10, 10, [0, 0, 0, 255]);
        const candidate = withPixel(reference, 3, 4, [255, 255, 255, 255]);
        const result = diffImages(reference, candidate);
        expect(result.differing).toBe(1);
        expect(result.pixelDiffPct).toBe(1);
        expect(result.maxChannelDelta).toBe(255);
    });

    it("ignores differences within the tolerance", () => {
        const reference = solid(4, 4, [100, 100, 100, 255]);
        const candidate = solid(4, 4, [108, 92, 100, 255]); // deltas 8, 8, 0
        const result = diffImages(reference, candidate, { tolerance: 8 });
        expect(result.pixelDiffPct).toBe(0);
        // ...but the deltas are still reported, so systematic drift is visible.
        expect(result.maxChannelDelta).toBe(8);
        expect(result.meanChannelDelta).toBeGreaterThan(0);
    });

    it("counts a difference just over the tolerance", () => {
        const reference = solid(2, 2, [100, 100, 100, 255]);
        const candidate = solid(2, 2, [109, 100, 100, 255]);
        expect(diffImages(reference, candidate, { tolerance: 8 }).pixelDiffPct).toBe(100);
    });

    it("honours a tolerance of zero", () => {
        const reference = solid(2, 2, [10, 10, 10, 255]);
        const candidate = solid(2, 2, [11, 10, 10, 255]);
        expect(diffImages(reference, candidate, { tolerance: 0 }).differing).toBe(4);
    });

    it("compares transparency, so a missing shape is caught", () => {
        const reference = solid(4, 4, [0, 0, 0, 0]);
        const candidate = solid(4, 4, [255, 0, 0, 255]);
        expect(diffImages(reference, candidate).pixelDiffPct).toBe(100);
    });

    it("restricts the comparison to a region", () => {
        const reference = solid(10, 10, [0, 0, 0, 255]);
        const candidate = withPixel(reference, 1, 1, [255, 255, 255, 255]);
        // The bad pixel is outside the region, so the region is clean...
        expect(
            diffImages(reference, candidate, { region: { x: 5, y: 5, w: 2, h: 2 } })
                .compared
        ).toBe(4);
        expect(
            diffImages(reference, candidate, { region: { x: 5, y: 5, w: 2, h: 2 } })
                .pixelDiffPct
        ).toBe(0);
        // ...and inside it, it is caught.
        expect(
            diffImages(reference, candidate, { region: { x: 0, y: 0, w: 2, h: 2 } })
                .pixelDiffPct
        ).toBe(25);
    });

    it("clips a region that runs past the image edge", () => {
        const image = solid(4, 4, [0, 0, 0, 255]);
        const result = diffImages(image, image, {
            region: { x: 2, y: 2, w: 100, h: 100 },
        });
        expect(result.compared).toBe(4);
    });

    it("leaves out the boxes another row already measures", () => {
        /*
         * A container's box contains its children's drawing, so a container measured over its whole
         * box reports its children's deltas a second time (measured: holiday_calender_screen's panel
         * at 22% while the only wrong thing inside it was the calendar). Excluding the descendants
         * leaves the container's own chrome.
         */
        const reference = solid(10, 10, [0, 0, 0, 255]);
        const candidate = withPixel(reference, 1, 1, [255, 255, 255, 255]);
        // Measured over the whole box, the child's pixel is the container's failure...
        expect(diffImages(reference, candidate).pixelDiffPct).toBe(1);
        // ...and it is not once the child's box is excluded.
        const excluded = diffImages(reference, candidate, {
            exclude: [{ x: 1, y: 1, w: 1, h: 1 }],
        });
        expect(excluded.pixelDiffPct).toBe(0);
        expect(excluded.compared).toBe(99);
    });

    it("never borrows a neighbouring pixel from an excluded box", () => {
        /*
         * With a match radius the comparison looks one pixel away for evidence of the ink. A pixel
         * inside a box this row does not own is not evidence: it belongs to whichever row measures
         * that box, so borrowing it would let a container absorb its child's content.
         */
        // The reference has ink at x = 2 only; the candidate puts its ink at x = 1.
        const reference = withPixel(solid(3, 1, [0, 0, 0, 255]), 2, 0, [255, 255, 255, 255]);
        const candidate = withPixel(solid(3, 1, [0, 0, 0, 255]), 1, 0, [255, 255, 255, 255]);
        const region = { x: 0, y: 0, w: 3, h: 1 };

        // The ink at x = 2 is one pixel from x = 1, so the shift is forgiven...
        expect(diffImages(reference, candidate, { region, matchRadius: 1 }).pixelDiffPct).toBe(0);
        // ...unless x = 2 belongs to another row, which is what the exclusion says.
        const excluded = diffImages(reference, candidate, {
            region,
            matchRadius: 1,
            exclude: [{ x: 2, y: 0, w: 1, h: 1 }],
        });
        expect(excluded.pixelDiffPct).toBe(50);
        // Only the two owned pixels were compared.
        expect(excluded.compared).toBe(2);
    });

    it("refuses to compare different sizes instead of hiding the mismatch", () => {
        expect(() => diffImages(solid(2, 2, [0, 0, 0, 255]), solid(3, 3, [0, 0, 0, 255]))).toThrow(
            /size mismatch/
        );
    });
});

describe("svg-diff — box agreement", () => {
    it("is 1 for identical rects", () => {
        expect(rectIoU({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(1);
    });

    it("is 0 for disjoint rects", () => {
        expect(rectIoU({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 })).toBe(0);
    });

    it("measures partial overlap", () => {
        // Half-shifted 10×10 boxes: intersection 50, union 150.
        const iou = rectIoU({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 });
        expect(iou).toBeCloseTo(50 / 150, 6);
    });

    it("treats two empty rects as agreeing", () => {
        expect(rectIoU({ x: 0, y: 0, w: 0, h: 0 }, { x: 5, y: 5, w: 0, h: 0 })).toBe(1);
    });

    it("treats an empty rect against a real one as no agreement", () => {
        expect(rectIoU({ x: 0, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 5, h: 5 })).toBe(0);
    });

    it("reports the raw intersection and union", () => {
        const result = iouOf({ x: 0, y: 0, w: 4, h: 4 }, { x: 2, y: 2, w: 4, h: 4 });
        expect(result.intersection).toBe(4);
        expect(result.union).toBe(28);
    });
});

describe("svg-diff — how far ink may stick out of the object's box", () => {
    const area = { x: 15, y: 0, w: 450, h: 40 };

    it("is 0 for any box that is inside", () => {
        // The measured title panel: a border drawn inside the object's box.
        expect(boxOffsetPx(area, { x: 16, y: 2, w: 448, h: 37 })).toBe(0);
        expect(boxOffsetPx(area, area)).toBe(0);
        /*
         * A glyph run is narrower than the line box it sits in — but its ink can be a fraction of a
         * pixel TALLER than it, because a `<text>` box is the ink extent while the LVGL area is the
         * line box (measured: `98,78 194x16` against `98,77.4 189.3x16.8`). That is why the rule is a
         * slack and not "inside": 0.6 px of overhang passes, 4 px does not.
         */
        expect(
            boxOffsetPx({ x: 98, y: 78, w: 194, h: 16 }, { x: 98, y: 77.4, w: 189.3, h: 16.8 })
        ).toBeCloseTo(0.6, 5);
        expect(BOX_SLACK_PX).toBeGreaterThan(0.6);
    });

    it("is the largest overhang, in pixels, for a box that sticks out", () => {
        // 2 px past the right edge and 3 px above the top.
        expect(boxOffsetPx(area, { x: 15, y: -3, w: 452, h: 43 })).toBe(3);
        // A completely displaced shape is far outside the slack.
        expect(boxOffsetPx(area, { x: 300, y: 100, w: 450, h: 40 })).toBe(285);
        // Half a stroke of bleed is inside the slack, a full stroke of displacement is not.
        expect(boxOffsetPx(area, { x: 14, y: 0, w: 450, h: 40 })).toBeLessThanOrEqual(BOX_SLACK_PX);
        expect(boxOffsetPx(area, { x: 15 - BOX_SLACK_PX - 1, y: 0, w: 450, h: 40 })).toBeGreaterThan(
            BOX_SLACK_PX
        );
    });
});

describe("svg-diff — verdicts", () => {
    const baseRow: ScorecardRow = {
        widget: "slider",
        part: "INDICATOR",
        source: "indicators",
        pixelDiffPct: 0.12,
        maxChannelDelta: 9,
        bboxIoU: 1,
        tier: "T1",
    };

    it("passes a T1 row inside both thresholds", () => {
        expect(verdictFor(baseRow)).toBe("pass");
    });

    it("fails a T1 row over the pixel threshold", () => {
        expect(verdictFor({ ...baseRow, pixelDiffPct: TIER_THRESHOLDS.T1.pixelDiffPct + 0.01 })).toBe(
            "fail"
        );
    });

    it("fails on box agreement even when the pixels are close", () => {
        /*
         * The box rule is the OFFSET, not the IoU, and it applies to T1 — the shapes the renderer
         * places. The IoU is reported but never decides: a layout box and a renderer's ink extent are
         * different rectangles on purpose (measured — a title panel `15,0 450x40` whose border is drawn
         * inside lands at `16,2 448x37`, IoU 0.921, with 0.12% of pixels differing). Ink that overhangs
         * the box by more than `BOX_SLACK_PX` is a misplacement.
         */
        expect(verdictFor({ ...baseRow, boxOffsetPx: BOX_SLACK_PX + 0.5 })).toBe("fail");
        expect(verdictFor({ ...baseRow, bboxIoU: 0.5 })).toBe("pass");
        // Shrinking is not evidence: a text run, an inset border and a partly-filled container all do it.
        expect(verdictFor({ ...baseRow, boxOffsetPx: 0 })).toBe("pass");
        // The bleed a correct row produces is inside the slack.
        expect(verdictFor({ ...baseRow, boxOffsetPx: BOX_SLACK_PX })).toBe("pass");
        // A text run's ink may overhang its line box, so the rule is not applied to T2 rows.
        expect(verdictFor({ ...baseRow, tier: "T2", boxOffsetPx: 7.5 })).toBe("pass");
    });

    it("does not fail a row that has no box to compare", () => {
        expect(verdictFor({ ...baseRow, bboxIoU: undefined, boxOffsetPx: undefined })).toBe("pass");
    });

    it("allows T2 its documented anti-aliasing delta", () => {
        expect(verdictFor({ ...baseRow, tier: "T2", pixelDiffPct: 1.5 })).toBe("pass");
        expect(verdictFor({ ...baseRow, tier: "T2", pixelDiffPct: 5 })).toBe("fail");
    });

    it("judges a row on counts when it has them, with a boundary allowance for strokes", () => {
        /*
         * A ring is the case this exists for: `home_screen`'s 2 px gauge ring over radius 104 reads
         * 675 differing pixels (1.53% of its 44100 px box — over any area-proportional budget) with an
         * ink boundary of 723, every differing pixel on one of the ring's two edges, and ink masks that
         * agree to 0.0%. One pixel of allowance per boundary pixel is the geometric statement "two
         * rasterisers disagree on the boundary"; the area budget still applies to a filled shape.
         */
        const ring: ScorecardRow = {
            ...baseRow,
            comparedPx: 44100,
            differingPx: 675,
            edgePx: 723,
            pixelDiffPct: 1.53,
            inkDiffPct: 0,
        };
        expect(pixelAllowancePx(ring)).toBe(723);
        expect(verdictFor(ring)).toBe("pass");
        // A filled panel with the same pixel diff has almost no boundary, so the area budget decides.
        const panel: ScorecardRow = { ...ring, differingPx: 675, edgePx: 40, inkDiffPct: undefined };
        expect(pixelAllowancePx(panel)).toBeCloseTo(220.5, 1);
        expect(verdictFor(panel)).toBe("fail");

        // Ink in the wrong place fails even when the boundary allowance would cover the pixels.
        expect(verdictFor({ ...ring, inkDiffPct: 100 })).toBe("fail");
    });

    it("falls back to the bare percentage for a row without counts", () => {
        expect(pixelAllowancePx(baseRow)).toBeUndefined();
        expect(verdictFor({ ...baseRow, pixelDiffPct: 0.4 })).toBe("pass");
        expect(verdictFor({ ...baseRow, pixelDiffPct: 0.6 })).toBe("fail");
    });

    it("reports a row with nothing comparable as unmeasured, not as a pass", () => {
        /*
         * The root screen's region is entirely covered by its children's boxes — excluded so their
         * drawing is not charged to it twice — so nothing is left to compare. Saying "pass" there is how
         * a scorecard overstates itself; the count is reported so the denominator stays honest.
         */
        const empty: ScorecardRow = { ...baseRow, comparedPx: 0, differingPx: 0, edgePx: 0 };
        expect(verdictFor(empty)).toBe("unmeasured");
        expect(summariseScorecard([empty, baseRow])).toMatchObject({
            pass: 1,
            fail: 0,
            unmeasured: 1,
        });
        expect(scorecardToMarkdown([empty])).toContain("1 unmeasured");
    });

    it("excludes T3 rather than failing it", () => {
        expect(verdictFor({ ...baseRow, tier: "T3", pixelDiffPct: 40 })).toBe("excluded");
    });

    it("summarises a mixed scorecard and lists the failures", () => {
        const rows: ScorecardRow[] = [
            baseRow,
            { ...baseRow, widget: "bar", pixelDiffPct: 3 },
            { ...baseRow, widget: "chart", tier: "T3", pixelDiffPct: 15 },
        ];
        const summary = summariseScorecard(rows);
        expect(summary.pass).toBe(1);
        expect(summary.fail).toBe(1);
        expect(summary.excluded).toBe(1);
        expect(summary.failed.map(row => row.widget)).toEqual(["bar"]);
    });
});

describe("svg-diff — the ink mask for rasterised content", () => {
    /** A 10x2 image with a 2px-wide "glyph" at x = 3,4, drawn at the same place unless told otherwise. */
    function withGlyph(x: number, colour: [number, number, number, number] = [255, 255, 255, 255]): RgbaImage {
        let image = solid(10, 2, [0, 0, 0, 255]);
        image = withPixel(image, x, 0, colour);
        image = withPixel(image, x + 1, 0, colour);
        image = withPixel(image, x, 1, colour);
        image = withPixel(image, x + 1, 1, colour);
        return image;
    }

    it("reports 0% when the ink is in the same place, whatever the channel values", () => {
        /*
         * This is the whole point: a glyph bitmap (LVGL) and a glyph outline (the browser) put ink in
         * the same pixels and disagree on the coverage of the edges. The measured case is a correct
         * 14-18 px label reading 12-26% per channel at a tolerance of 30 — and 0-12% as a mask.
         */
        const reference = withGlyph(3);
        // The same ink, painted "thicker" (a slightly different coverage on every pixel).
        const thicker = withGlyph(3, [150, 150, 150, 255]);
        const result = compareInk(reference, thicker, { region: { x: 0, y: 0, w: 10, h: 2 } });
        expect(result.inkDiffPct).toBe(0);
        expect(result.referenceInk).toBe(4);
    });

    it("reports 100% when the ink is missing, and again when it is somewhere else", () => {
        const reference = withGlyph(3);
        const empty = solid(10, 2, [0, 0, 0, 255]);
        expect(
            compareInk(reference, empty, { region: { x: 0, y: 0, w: 10, h: 2 } }).inkDiffPct
        ).toBe(100);

        // Displaced by 3 px: outside the one-pixel tolerance, so still unmatched ink.
        const moved = withGlyph(6);
        expect(
            compareInk(reference, moved, { region: { x: 0, y: 0, w: 10, h: 2 }, matchRadius: 1 })
                .inkDiffPct
        ).toBe(100);
        // One pixel over is the tolerated case (a stroke landing half a pixel off).
        const shifted = withGlyph(4);
        expect(
            compareInk(reference, shifted, { region: { x: 0, y: 0, w: 10, h: 2 }, matchRadius: 1 })
                .inkDiffPct
        ).toBe(0);
    });

    it("counts ink the candidate has and the reference does not", () => {
        // A string drawn twice, or a shape that should not be there, is visible in `extraInk`.
        const reference = withGlyph(3);
        let doubled = withGlyph(3);
        doubled = withPixel(doubled, 7, 0, [255, 255, 255, 255]);
        doubled = withPixel(doubled, 7, 1, [255, 255, 255, 255]);
        const result = compareInk(reference, doubled, { region: { x: 0, y: 0, w: 10, h: 2 } });
        expect(result.extraInk).toBe(2);
        expect(result.missingInk).toBe(0);
        // 2 unmatched of 4 + 6 ink pixels.
        expect(result.inkDiffPct).toBeCloseTo(20, 5);
    });

    it("ignores ink in a box that belongs to another row", () => {
        // Same rule as the pixel diff: a container is not judged on what its children draw.
        const reference = withGlyph(3);
        const candidate = solid(10, 2, [0, 0, 0, 255]);
        const excluded = compareInk(reference, candidate, {
            region: { x: 0, y: 0, w: 10, h: 2 },
            exclude: [{ x: 3, y: 0, w: 2, h: 2 }],
        });
        expect(excluded.referenceInk).toBe(0);
        expect(excluded.inkDiffPct).toBe(0);
    });

    it("decides a rasterised row when the row carries a mask", () => {
        /*
         * Both numbers must pass. The ink mask cannot see colour, and the pixel budget cannot see
         * whether the glyph is there at all, so a row is only as good as its worst metric: measured, a
         * correct label reads 3% of ink and 24% of pixels (over the T2 pixel budget, hence the ink
         * mask), while a label whose node was removed reads 100% of ink and 95% of pixels.
         */
        const base: ScorecardRow = {
            widget: "label",
            part: "MAIN",
            source: "home_screen",
            pixelDiffPct: 24,
            maxChannelDelta: 40,
            tier: "T2",
            tolerance: 30,
        };
        expect(verdictFor({ ...base, inkDiffPct: 3 })).toBe("fail");
        expect(verdictFor({ ...base, inkDiffPct: 60 })).toBe("fail");
        // A row inside both budgets, or without a mask to compare against.
        expect(verdictFor({ ...base, pixelDiffPct: 1, inkDiffPct: 3 })).toBe("pass");
        expect(verdictFor({ ...base, pixelDiffPct: 1 })).toBe("pass");
    });

    it("applies the ink budget to T1 as well", () => {
        // Measured on `schedule_screen`: six buttons read 0.30% of pixels with ink masks that disagree
        // on 100%, because the renderer drew ink where the canvas has none.
        const button: ScorecardRow = {
            widget: "button",
            part: "MAIN",
            source: "schedule_screen",
            pixelDiffPct: 0.3,
            maxChannelDelta: 90,
            comparedPx: 2400,
            differingPx: 7,
            edgePx: 0,
            tier: "T1",
        };
        expect(verdictFor(button)).toBe("pass");
        expect(verdictFor({ ...button, inkDiffPct: 100, inkPx: 400 })).toBe("fail");
        expect(verdictFor({ ...button, inkDiffPct: 0, inkPx: 400 })).toBe("pass");
    });

    it("ignores an ink mask taken on a handful of pixels", () => {
        /*
         * With one or two ink pixels, the metric measures the luminance threshold, not ink: a single
         * pixel crossing `INK_THRESHOLD` reads as 100%. Measured across the thirteen pages, every such
         * failing row held 1-22 ink pixels (`panel inkPx=6 px=14/13919`, `button inkPx=1 px=2/657`)
         * while every row where the metric did real work held 300-1248. Those rows are judged on
         * pixels instead, which is the stricter metric at that size.
         */
        const row: ScorecardRow = {
            widget: "button",
            part: "MAIN",
            source: "schedule_screen",
            pixelDiffPct: 0.3,
            maxChannelDelta: 91,
            comparedPx: 1593,
            differingPx: 3,
            edgePx: 0,
            tier: "T1",
            inkPx: 3,
        };
        expect(MIN_INK_PX).toBeGreaterThan(22);
        expect(verdictFor({ ...row, inkDiffPct: 100 })).toBe("pass");
        // ...and once there is enough ink for the mask to mean something, it decides again.
        expect(verdictFor({ ...row, inkDiffPct: 100, inkPx: 300 })).toBe("fail");
    });

    it("does not fail a T1 row on an overhang that nothing visible produces", () => {
        /*
         * `getBBox()` counts transparent geometry, so a row whose pixels and ink both match exactly has
         * no visible misplacement to report however far its node's box reaches (measured:
         * `schedule_edit_screen` labels at +7.5 px with 0 of 1200 pixels differing, ink 0.0%).
         */
        const invisible: ScorecardRow = {
            widget: "label",
            part: "MAIN",
            source: "schedule_edit_screen",
            pixelDiffPct: 0,
            maxChannelDelta: 0,
            tier: "T1",
            tolerance: 30,
            comparedPx: 1200,
            differingPx: 0,
            edgePx: 0,
            inkPx: 40,
            inkDiffPct: 0,
            boxOffsetPx: 7.5,
        };
        expect(verdictFor(invisible)).toBe("pass");
        // One visible pixel is enough for the overhang to mean something.
        expect(verdictFor({ ...invisible, differingPx: 1 })).toBe("fail");
    });

    it("counts ink and its boundary, so a stroke can be given a geometric allowance", () => {
        /*
         * A 4 px wide inked band in a 10x4 region: 16 ink pixels, all of them on the band's boundary
         * (a 2 px tall band has no interior rows). One pixel of allowance per boundary pixel is what
         * lets a correct 2 px ring pass: measured on `home_screen`'s gauge, 675 differing pixels with
         * 723 boundary pixels, while the ink masks agree to 0.0%.
         */
        const band = inkRect(solid(10, 4, [0, 0, 0, 255]), 3, 0, 4, 2);
        const edges = countInkEdges(band, { x: 0, y: 0, w: 10, h: 4 });
        expect(edges.inkPx).toBe(8);
        expect(edges.edgePx).toBe(8);

        // A filled region has no interior boundary of its own except the region's edge: two full rows
        // plus two full columns, corners counted once.
        const filled = solid(10, 4, [255, 255, 255, 255]);
        expect(countInkEdges(filled, { x: 0, y: 0, w: 10, h: 4 })).toEqual({
            inkPx: 40,
            edgePx: 24,
        });

        // Another row's box contributes no ink and no boundary.
        expect(
            countInkEdges(band, { x: 0, y: 0, w: 10, h: 4 }, [{ x: 3, y: 0, w: 4, h: 2 }])
        ).toEqual({ inkPx: 0, edgePx: 0 });

        // A dark region has none either — the fallback for those rows is the percentage budget.
        expect(countInkEdges(solid(10, 4, [0, 0, 0, 255]), { x: 0, y: 0, w: 10, h: 4 })).toEqual({
            inkPx: 0,
            edgePx: 0,
        });
    });
});

describe("svg-diff — scorecard output", () => {
    it("builds a row from a diff result", () => {
        const reference = solid(4, 4, [0, 0, 0, 255]);
        const candidate = withPixel(reference, 0, 0, [255, 255, 255, 255]);
        const row = rowFromDiff(
            { widget: "panel", part: "MAIN", source: "boxes", tier: "T1" },
            diffImages(reference, candidate),
            1
        );
        expect(row.pixelDiffPct).toBe(6.25);
        expect(row.maxChannelDelta).toBe(255);
        expect(row.bboxIoU).toBe(1);
    });

    it("renders a markdown table with a summary", () => {
        const markdown = scorecardToMarkdown([
            {
                widget: "slider",
                part: "INDICATOR",
                source: "indicators",
                pixelDiffPct: 0.123,
                maxChannelDelta: 9.4,
                bboxIoU: 1,
                tier: "T1",
            },
            {
                widget: "chart",
                part: "MAIN",
                source: "dashboard",
                pixelDiffPct: 14.8,
                maxChannelDelta: 190,
                tier: "T3",
                note: "D2",
            },
        ]);
        expect(markdown).toContain(
            "| slider | INDICATOR | indicators | 30 | 0.12% | n/a | n/a | n/a | n/a | n/a | 9 | 1.000 | n/a | pass |"
        );
        expect(markdown).toContain(
            "| chart | MAIN | dashboard | 8 | 14.80% | n/a | n/a | n/a | n/a | n/a | 190 | n/a | n/a | excluded | D2 |"
        );
        expect(markdown).toContain("**Summary:** 1 pass, 0 fail, 1 excluded.");
    });

    it("shows the counts a verdict was taken on, so a pasted table stays auditable", () => {
        const markdown = scorecardToMarkdown([
            {
                widget: "arc",
                part: "MAIN",
                source: "home_screen",
                pixelDiffPct: 1.53,
                maxChannelDelta: 208,
                comparedPx: 44100,
                differingPx: 675,
                edgePx: 723,
                inkPx: 1690,
                inkDiffPct: 0,
                tier: "T1",
            },
        ]);
        expect(markdown).toContain(
            "| arc | MAIN | home_screen | 30 | 1.53% | 675/44100 | 723 | 723 | 0.00 | 1690 | 208 | n/a | n/a | pass |"
        );
    });

    it("measures each tier at the tolerance its content needs, and says so", () => {
        /*
         * The tolerance and the match radius are one decision: a correct 14-18 px label reads 12-26%
         * at a tolerance of 8 *with* a 1 px radius and 1.6% at 30, for the same frame, because the
         * ink boxes agree within a pixel and what differs is stroke coverage (LVGL's hinted bitmap
         * against the browser's outline). T1 needs the same tolerance for the same reason on its
         * curved edges — every anti-aliased boundary of a rounded button, a switch or an arc lands in
         * the 9-30 band, measured at 2-7% of small boxes at tolerance 8 and 0.00-0.19% at 30.
         */
        expect(toleranceForTier("T1")).toBe(30);
        expect(toleranceForTier("T2")).toBe(30);
        // The budget is what separates the tiers, never the tolerance.
        expect(TIER_THRESHOLDS.T1.pixelDiffPct).toBeLessThan(TIER_THRESHOLDS.T2.pixelDiffPct);
        expect(TIER_TOLERANCE.T3).toBe(8);

        // A row's own tolerance wins when the caller set one (the harness does, per tier).
        const row: ScorecardRow = {
            widget: "label",
            part: "MAIN",
            source: "home_screen",
            pixelDiffPct: 1.5,
            maxChannelDelta: 40,
            tier: "T2",
            tolerance: 30,
        };
        expect(verdictFor(row)).toBe("pass");
        // The tolerance is never a free pass on the budget itself.
        expect(verdictFor({ ...row, pixelDiffPct: 2.5 })).toBe("fail");
        // ...and it travels with the number, so a pasted scorecard is self-describing.
        expect(scorecardToMarkdown([row])).toContain("| label | MAIN | home_screen | 30 |");
    });
});
