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
    verdictFor,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff";
import type {
    RgbaImage,
    ScorecardRow,
} from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/svg-diff";

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
