/**
 * image-size tests — real bitmaps, so the numbers come from the files, not from the test.
 */

import { describe, expect, it } from "vitest";
import { imageNaturalSize } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/image-size";
import { IMAGE_FIXTURES } from "../fixtures/lvgl-svg/image-fixtures";

describe("image-size — the natural size of a bitmap, read from its own header", () => {
    it("reads a real PNG", () => {
        expect(imageNaturalSize(IMAGE_FIXTURES.png)).toEqual({ width: 3, height: 7 });
    });

    it("reads a real JPEG", () => {
        expect(imageNaturalSize(IMAGE_FIXTURES.jpeg)).toEqual({ width: 3, height: 7 });
    });

    it("reads a real GIF", () => {
        expect(imageNaturalSize(IMAGE_FIXTURES.gif)).toEqual({ width: 3, height: 7 });
    });

    it("reads a real BMP", () => {
        expect(imageNaturalSize(IMAGE_FIXTURES.bmp)).toEqual({ width: 3, height: 7 });
    });

    it("reads a VP8X WebP, whose dimensions are stored minus one", () => {
        expect(imageNaturalSize(IMAGE_FIXTURES.webpVp8x)).toEqual({
            width: IMAGE_FIXTURES.webpWidth,
            height: IMAGE_FIXTURES.webpHeight,
        });
    });

    it("reads a VP8L WebP, whose dimensions are packed into one word", () => {
        expect(imageNaturalSize(IMAGE_FIXTURES.webpVp8l)).toEqual({
            width: IMAGE_FIXTURES.webpWidth,
            height: IMAGE_FIXTURES.webpHeight,
        });
    });

    it("never swaps width and height", () => {
        // Every fixture is 3x7; a transposed read would be 7x3 and pass a square-only test.
        for (const source of Object.values(IMAGE_FIXTURES)) {
            if (typeof source !== "string") {
                continue;
            }
            const size = imageNaturalSize(source);
            expect(size!.height).toBeGreaterThan(size!.width);
        }
    });

    it("measures nothing it cannot read synchronously", () => {
        expect(imageNaturalSize(undefined)).toBeUndefined();
        expect(imageNaturalSize("")).toBeUndefined();
        expect(imageNaturalSize("/assets/icon.png")).toBeUndefined();
        expect(imageNaturalSize("https://example.com/icon.png")).toBeUndefined();
        // An SVG has no raster header, and its size comes from its viewBox.
        expect(imageNaturalSize("data:image/svg+xml,%3Csvg%2F%3E")).toBeUndefined();
        // Not base64, so the bytes are not the bytes.
        expect(imageNaturalSize("data:image/png,not-base64")).toBeUndefined();
        expect(imageNaturalSize("data:image/png;base64,!!!!")).toBeUndefined();
    });

    it("refuses a damaged or empty header instead of inventing a size", () => {
        // Right signature, no IHDR where the format guarantees one.
        expect(
            imageNaturalSize("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAA=")
        ).toBeUndefined();
        // A PNG whose IHDR declares zero pixels.
        expect(
            imageNaturalSize(
                "data:image/png;base64,iVBORw0KGgoAAAAAAAAAAAAAAAAAAAAA="
            )
        ).toBeUndefined();
        // A PNG that stops before the height field.
        expect(
            imageNaturalSize("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA")
        ).toBeUndefined();
        // A JPEG with no frame header at all.
        expect(imageNaturalSize("data:image/jpeg;base64,/9j/4AAQ")).toBeUndefined();
        // A WebP whose first chunk is not a frame this knows.
        expect(
            imageNaturalSize("data:image/webp;base64,UklGRgAAAABXRUJQAAAAAAA=")
        ).toBeUndefined();
    });
});
