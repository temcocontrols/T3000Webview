/**
 * svg-diff metrics tests — synthetic pixels, so the numbers are verifiable by hand.
 */

import { describe, expect, it } from "vitest";
import {
    TIER_THRESHOLDS,
    diffImages,
    hasPixels,
    iouOf,
    rectIoU,
    rowFromDiff,
    scorecardToMarkdown,
    summariseScorecard,
    isProceduralType,
    tierForObject,
    tierNote,
    verdictFor,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff";
import type {
    RgbaImage,
    ScorecardRow,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff";
import { firstFontUrl } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff-harness";

describe("svg-diff — tiers come from what the object is, not from the size of the diff", () => {
    it("excludes the widgets LVGL draws procedurally", () => {
        for (const type of ["calendar", "buttonmatrix", "chart", "qrcode", "table", "scale"]) {
            expect(tierForObject({ type })).toBe("T3");
            expect(tierNote({ type })).toContain("D2");
        }
        // The type comes from the widget model, so case and padding must not matter.
        expect(tierForObject({ type: " Calendar " })).toBe("T3");
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
        // A procedural widget outranks its content: it is excluded, not merely relaxed.
        expect(tierForObject({ type: "calendar", carriesTextOrImage: true })).toBe("T3");
    });

    it("excludes the children of a procedural widget with it", () => {
        // A calendar's day cells are ordinary objects drawn from the calendar's private state, so a
        // page reports them as failures unless the exclusion is inherited.
        expect(tierForObject({ type: "object", insideProcedural: true })).toBe("T3");
        expect(tierNote({ type: "object", insideProcedural: true })).toContain("ancestor procedural");
        expect(isProceduralType("calendar")).toBe(true);
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
                widget: "calendar",
                part: "MAIN",
                source: "holiday_calender_screen",
                tier: tierForObject({ type: "calendar" }),
                note: tierNote({ type: "calendar" }),
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
        expect(verdictFor({ ...baseRow, bboxIoU: 0.5 })).toBe("fail");
    });

    it("does not fail a row that has no box to compare", () => {
        expect(verdictFor({ ...baseRow, bboxIoU: undefined })).toBe("pass");
    });

    it("allows T2 its documented anti-aliasing delta", () => {
        expect(verdictFor({ ...baseRow, tier: "T2", pixelDiffPct: 1.5 })).toBe("pass");
        expect(verdictFor({ ...baseRow, tier: "T2", pixelDiffPct: 5 })).toBe("fail");
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
        expect(markdown).toContain("| slider | INDICATOR | indicators | 0.12% | 9 | 1.000 | pass |");
        expect(markdown).toContain("| chart | MAIN | dashboard | 14.80% | 190 | n/a | excluded | D2 |");
        expect(markdown).toContain("**Summary:** 1 pass, 0 fail, 1 excluded.");
    });
});
