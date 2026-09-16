/**
 * LVGL 9 SVG renderer — fidelity harness capture (P5).
 *
 * ADDITIVE: new file. The metrics live in `svg-diff.ts` (pure, unit-tested); this is the browser half
 * that produces the two RGBA buffers to compare.
 *
 * THE TWO SURFACES
 * ----------------
 * - **reference** — the canvas the LVGL runtime already drew (`<canvas>` inside the page editor). It is
 *   the LVGL framebuffer itself, so it is the oracle by construction.
 * - **candidate** — the live `<svg>`, serialised and rastersied through an `Image` into an offscreen
 *   canvas.
 *
 * WHY THE SVG IS INLINED FIRST
 * ----------------------------
 * A rastersied SVG cannot load *external* resources: an `<image href="http://host/...">` inside a
 * serialised SVG is not fetched by the browser, so those pixels would silently come out empty and the
 * scorecard would blame the renderer for a harness artefact. The surface therefore inlines every
 * referenced bitmap as a data URI before serialising. (In this project image sources already *are*
 * data URIs, so usually nothing has to change — the code is here because the failure mode is silent.)
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * It does not mount a hidden second surface to obtain the reference. Both surfaces are rendered by the
 * same page in the same session, and the canvas is only present when the SVG surface is *off* — so the
 * harness asks the caller for a canvas element when one exists, and otherwise reports the reference as
 * unavailable rather than inventing one. A scorecard that silently compared the SVG against itself
 * would be worse than no scorecard.
 */

import {
    BOX_SLACK_PX,
    MIN_INK_PX,
    boxOffsetPx,
    compareInk,
    boundaryAllowancePx,
    diffImages,
    rectIoU,
    toleranceForTier,
    verdictFor,
} from "./svg-diff";
import type { DiffResult, Rect, ScorecardRow } from "./svg-diff";

export interface CaptureResult {
    image: { width: number; height: number; data: Uint8ClampedArray };
    /** Anything that had to be worked around, surfaced so it can be recorded in the scorecard note. */
    warnings: string[];
}

/**
 * The first `url(...)` in a `src:` descriptor, or `undefined` when there is none.
 *
 * Split out because the harness has to recognise descriptors such as
 * `url(font.ttf) format("truetype")` and ignore local-only sources (`local("Montserrat")`).
 */
export function firstFontUrl(srcValue: string): string | undefined {
    const match = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/i.exec(srcValue);
    const url = match && (match[1] ?? match[2] ?? match[3]);
    return url ? url : undefined;
}

/**
 * The document's web fonts, as data URIs, for embedding in the rasterised clone.
 *
 * A `data:` URL image is its own document: it cannot reach the page's font faces, so without this
 * the SVG side of every comparison silently falls back to a generic family. Text then matches the
 * canvas in position but not in shape — which is indistinguishable from a layout bug, and it hid a
 * real win: with the bundled Montserrat embedded, the overlap of the gauge text's ink more than
 * doubled (378 -> 887 px of 1519) and the whole-surface delta fell 4.99% -> 3.82%.
 *
 * Resolved once per session: the harness runs on every paint and one face is a few hundred KB.
 */
let fontFaceCss: Promise<string> | undefined;

async function bundledFontFaceCss(): Promise<string> {
    if (!fontFaceCss) {
        fontFaceCss = collectFontFaceCss();
    }
    return fontFaceCss;
}

async function collectFontFaceCss(): Promise<string> {
    const rules: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
        let cssRules: CSSRuleList | undefined;
        try {
            // A cross-origin sheet throws; such a sheet cannot be rasterised faithfully anyway.
            cssRules = sheet.cssRules;
        } catch {
            continue;
        }
        if (!cssRules) {
            continue;
        }
        for (const rule of Array.from(cssRules)) {
            if (rule.type !== CSSRule.FONT_FACE_RULE) {
                continue;
            }
            const style = (rule as CSSFontFaceRule).style;
            const srcValue = style.getPropertyValue("src");
            const url = firstFontUrl(srcValue);
            if (!url) {
                continue;
            }
            const family = style.getPropertyValue("font-family");
            let embedded: string;
            if (url.startsWith("data:")) {
                embedded = url;
            } else {
                try {
                    const response = await fetch(new URL(url, location.href).href);
                    if (!response.ok) {
                        continue;
                    }
                    embedded = await toDataUri(await response.arrayBuffer());
                } catch {
                    // A font that cannot be fetched simply is not embedded; the caller records it.
                    continue;
                }
            }
            const weight = style.getPropertyValue("font-weight");
            const fontStyle = style.getPropertyValue("font-style");
            rules.push(
                `@font-face{font-family:${family};` +
                    (weight ? `font-weight:${weight};` : "") +
                    (fontStyle ? `font-style:${fontStyle};` : "") +
                    `src:url(${embedded});}`
            );
        }
    }
    return rules.join("");
}

/** Base64 a binary buffer without blowing the argument limit of `String.fromCharCode`. */
async function toDataUri(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:font/ttf;base64,${btoa(binary)}`;
}

/** Serialise the live SVG with every referenced bitmap inlined. */
export function serializeSvg(
    svg: SVGSVGElement,
    embeddedFontCss?: string
): {
    text: string;
    warnings: string[];
} {
    const warnings: string[] = [];
    const clone = svg.cloneNode(true) as SVGSVGElement;

    clone.querySelectorAll("image").forEach(image => {
        const href =
            image.getAttribute("href") ?? image.getAttribute("xlink:href") ?? "";
        if (href && !href.startsWith("data:")) {
            warnings.push(`external image not inlined: ${href.slice(0, 60)}`);
        }
    });

    // A detached clone has no layout, so the size must be written explicitly or the raster is empty.
    const width = svg.width.baseVal.value || Number(svg.getAttribute("width")) || 0;
    const height = svg.height.baseVal.value || Number(svg.getAttribute("height")) || 0;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    /*
     * The fonts travel with the clone: a `data:` URL raster is an isolated document and would
     * otherwise render every glyph with a fallback face (see `bundledFontFaceCss`).
     */
    if (embeddedFontCss) {
        const style = svg.ownerDocument.createElementNS(
            "http://www.w3.org/2000/svg",
            "style"
        );
        style.textContent = embeddedFontCss;
        clone.insertBefore(style, clone.firstChild);
    }

    return { text: new XMLSerializer().serializeToString(clone), warnings };
}

/** Decode an image element into a canvas and read its pixels. */
async function imageToRgba(
    source: string,
    width: number,
    height: number,
    background: [number, number, number]
): Promise<CaptureResult["image"]> {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("rasterise failed"));
        image.src = source;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("2d context unavailable");
    }
    /*
     * The SVG surface is transparent outside what it draws — the app's page is the backdrop, and the
     * renderer is not responsible for it. The raster is therefore filled with the colour the
     * reference sits on (`backdropOf`); filling white regardless turned every empty pixel of every
     * row into a 255-channel difference from this app's dark pages: the whole-surface delta on
     * `schedule_screen` read 8.02% against 5.04% for the same frame, and every row with it.
     */
    ctx.fillStyle = `rgb(${background[0]}, ${background[1]}, ${background[2]})`;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    return {
        width,
        height,
        data: new Uint8ClampedArray(imageData.data),
    };
}

/**
 * The backdrop both rasters sit on.
 *
 * The SVG surface is transparent outside what it draws — the app's page is the backdrop and the
 * renderer is not responsible for it — so the candidate has to be filled with the colour the
 * reference shows behind it. White (the old behaviour) inflated every row on these dark pages.
 *
 * The colour is the reference's **most common** one, not a corner pixel: a corner is background by
 * construction, but a page whose top-left corner is a coloured header made every label over a panel
 * differ by that header's colour.
 */
function backdropOf(reference: CaptureResult): [number, number, number] {
    const data = reference.image.data;
    const counts = new Map<number, number>();
    // A 480x320 page is 150k samples; step over them, the answer is one solid fill.
    for (let i = 0; i < data.length; i += 4 * 7) {
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best = -1;
    let bestCount = -1;
    for (const [key, count] of counts) {
        if (count > bestCount) {
            best = key;
            bestCount = count;
        }
    }
    if (best < 0) {
        return [data[0], data[1], data[2]];
    }
    return [(best >> 16) & 0xff, (best >> 8) & 0xff, best & 0xff];
}

/**
 * Rasterise the live SVG surface.
 *
 * Uses a `data:` URL rather than a blob URL: a blob would be a different origin for some browsers'
 * image-loading rules, and `data:` keeps the operation synchronous with the document.
 */
export async function captureSvg(
    svg: SVGSVGElement,
    width: number,
    height: number,
    background: [number, number, number] = [255, 255, 255]
): Promise<CaptureResult> {
    const embeddedFonts = await bundledFontFaceCss();
    const { text, warnings } = serializeSvg(svg, embeddedFonts);
    if (!embeddedFonts) {
        warnings.push(
            "no web fonts embedded — text is rasterised with a fallback family"
        );
    }
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    return {
        image: await imageToRgba(encoded, width, height, background),
        warnings,
    };
}

/**
 * Read the reference pixels from a canvas that LVGL already drew.
 *
 * The canvas is validated rather than assumed: an untouched `<canvas>` is fully transparent, and
 * comparing against it would report a 100% difference that says nothing about the renderer.
 */
export function captureCanvas(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
): CaptureResult {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("reference canvas has no 2d context");
    }
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = new Uint8ClampedArray(imageData.data);

    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) {
            opaque += 1;
        }
    }
    const warnings: string[] = [];
    if (opaque === 0) {
        warnings.push("reference canvas is empty — compare with caution");
    }
    return { image: { width, height, data }, warnings };
}

export interface HarnessInput {
    svg: SVGSVGElement;
    /** The LVGL canvas, when the caller has one (i.e. when the canvas surface was rendered). */
    canvas?: HTMLCanvasElement;
    /** Page size in pixels. */
    width: number;
    height: number;
    /** Rows to measure individually, one per object/part. */
    objects?: Array<{
        widget: string;
        part: string;
        /** Box in page coordinates, from the scene dump. */
        area: Rect;
        /** Box of the corresponding SVG node, from `getBBox()`, for the IoU. */
        nodeRect?: Rect;
        tier: ScorecardRow["tier"];
        /** Per-channel tolerance for this row; the tier's own is used when absent. */
        tolerance?: number;
        /** Recorded reason for an excluded or accepted row. */
        note?: string;
        /**
         * Boxes inside `area` that belong to someone else — the object's descendants.
         *
         * A container's box contains everything its children draw, so without this a container's row
         * fails for its children's deltas, counted a second time under every ancestor. See
         * `DiffOptions.exclude`.
         */
        exclude?: Rect[];
        /**
         * The object draws nothing of its own: its box is covered by the widget that draws it (a
         * textarea's internal label is the case that was measured). There is nothing to compare, and
         * the pixels in its box are already judged by the row that paints them.
         */
        drawsNothing?: boolean;
    }>;
    /** Label for the source column, e.g. `home_screen`. */
    source: string;
    tolerance?: number;
    /**
     * Objects the scene holds but LVGL does not paint on this page (hidden sub-screens), so the
     * caller left them out of `objects`.
     *
     * Recorded rather than silently dropped, and it is not a small number: `time` is 48 objects of
     * which 21 are hidden, so one in two rows used to be a comparison against nothing (no SVG node,
     * therefore no box either) — measured `panel/MAIN 15.04%` and `button/MAIN 19.52%` of pure noise.
     * See `SceneObject.hidden` and `hiddenSubtree`.
     */
    notVisible?: number;
    /**
     * Whether the caller saw the same scene on two consecutive paints (or on two consecutive calls).
     *
     * The harness runs on every paint, so without this a scorecard read right after a page switch
     * reports a **transitional** frame and looks catastrophic — measured: `schedule_screen` 65% with 4
     * rows. The caller computes it from the scene it already holds; the harness only records it.
     */
    settled?: boolean;
}

/**
 * What the harness did NOT measure, as a warning line.
 *
 * Objects LVGL hides have no SVG node and are excluded by the caller (see
 * `HarnessInput.notVisible`); saying so out loud is what keeps a scorecard honest about its
 * denominator — "48 rows, all pass" means something very different from "27 of 48 measured".
 */
export function describeSkippedObjects(notVisible: number | undefined): string[] {
    if (!notVisible) {
        return [];
    }
    return [
        `${notVisible} object(s) not visible on this page (LVGL hides them) — not measured`,
    ];
}

export interface HarnessResult {
    /** Whole-surface comparison, when a reference canvas was available. */
    whole?: DiffResult;
    rows: ScorecardRow[];
    /** Harness-level problems (no reference, rastersiation warnings). */
    warnings: string[];
    /** False when the scene changed between the two most recent paints (see `HarnessInput.settled`). */
    settled: boolean;
}

/**
 * Run the comparison and build scorecard rows.
 *
 * Per-object rows are measured by restricting the pixel comparison to that object's box, which is what
 * makes a failure localisable to a widget+part without eyeballing an image ("bboxIoU is the reason the
 * scene dump carries exact areas").
 */
export async function runFidelityHarness(
    input: HarnessInput
): Promise<HarnessResult> {
    const warnings: string[] = [];
    warnings.push(...describeSkippedObjects(input.notVisible));

    let reference: CaptureResult | undefined;
    if (input.canvas) {
        reference = captureCanvas(input.canvas, input.width, input.height);
        warnings.push(...reference.warnings);
    } else {
        warnings.push("no reference canvas — per-object rows omitted");
    }

    /*
     * The candidate is rasterised after the reference so it can be filled with the backdrop the
     * reference sits on. Both rasters are "what the page looks like"; only one of them is the
     * renderer's work.
     */
    const candidate = await captureSvg(
        input.svg,
        input.width,
        input.height,
        reference ? backdropOf(reference) : undefined
    );
    warnings.push(...candidate.warnings);

    const rows: ScorecardRow[] = [];
    if (reference) {
        const whole = diffImages(reference.image, candidate.image, {
            tolerance: input.tolerance,
        });

        if (input.objects) {
            for (const object of input.objects) {
                /*
                 * An object that draws nothing of its own is not measurable: its box is covered by
                 * another widget's drawing (a textarea's internal label sits inside the textarea
                 * that paints the placeholder), so its "diff" is that widget's, counted twice. It is
                 * recorded as excluded rather than dropped, so the scorecard still accounts for it.
                 */
                if (object.drawsNothing) {
                    rows.push({
                        widget: object.widget,
                        part: object.part,
                        source: input.source,
                        pixelDiffPct: 0,
                        maxChannelDelta: 0,
                        tier: "T3",
                        tolerance: toleranceForTier("T3"),
                        note:
                            object.note ??
                            "draws nothing itself — its box is painted by the widget that owns it (measured: a textarea's internal label), so the pixels are judged on that widget's row",
                    });
                    continue;
                }
                const diff = diffImages(reference.image, candidate.image, {
                    tolerance:
                        object.tolerance ?? input.tolerance ?? toleranceForTier(object.tier),
                    region: object.area,
                    exclude: object.exclude,
                    /*
                     * Rasterised content (glyphs, bitmaps) gets a one-pixel radius: LVGL paints a
                     * glyph from its own hinted bitmap and the browser from an outline, so a stroke
                     * lands half a pixel over and an exact comparison would fail every correct label.
                     * T1 rows need it too, for their own reason: a curved or thin shape is rasterised
                     * hard by LVGL and anti-aliased by the browser, so the same geometry differs on
                     * the boundary (measured: `schedule_edit_screen` dropdown 15.86% -> 4.46% at a
                     * 1 px radius, `home_screen` gauge 3.92% -> 1.53%).
                     */
                    matchRadius: 1,
                });
                /*
                 * Content LVGL rasterises itself is ALSO measured as an ink mask, and every row keeps
                 * that number: it is the only metric that separates "the glyph is here, drawn a little
                 * thicker" from "the glyph is missing", and it is what catches ink the renderer draws
                 * where LVGL draws none (measured: six buttons on `schedule_screen` at 0.30% of pixels
                 * but ink 100%, because the reference has no ink in their boxes at all).
                 */
                const ink = compareInk(reference.image, candidate.image, {
                    region: object.area,
                    exclude: object.exclude,
                    /*
                     * Two pixels of slack, not one: the SVG's stems come out ~20% heavier than
                     * LVGL's hinted bitmap, which puts extra ink one to two pixels outside the
                     * reference's mask. Measured on `start_up_screen`'s "Initialising . . .":
                     * a correct row reads 17.7% at radius 1 and 6.35% at radius 2, while the
                     * same row with its SVG node removed reads 100% either way.
                     */
                    matchRadius: 2,
                    /*
                     * The row's own per-channel tolerance travels with the ink comparison: it is what
                     * separates a real ink difference from the luminance cut moving under a background
                     * that sits on it. A missing glyph differs by 200+ units, a gradient that crosses
                     * the threshold by 2 — measured on `main_menu`, where a panel's gradient turned 670
                     * background pixels into "extra ink" (a 100% verdict) over a 2-unit colour
                     * difference. See `compareInk`.
                     */
                    tolerance:
                        object.tolerance ?? input.tolerance ?? toleranceForTier(object.tier),
                });
                const edgePx = boundaryAllowancePx(
                    reference.image,
                    object.area,
                    object.exclude,
                    object.tolerance ?? input.tolerance ?? toleranceForTier(object.tier)
                );
                rows.push({
                    widget: object.widget,
                    part: object.part,
                    source: input.source,
                    pixelDiffPct: diff.pixelDiffPct,
                    maxChannelDelta: diff.maxChannelDelta,
                    comparedPx: diff.compared,
                    differingPx: diff.differing,
                    edgePx,
                    inkDiffPct: ink.inkDiffPct,
                    inkPx: ink.referenceInk + ink.candidateInk,
                    bboxIoU: object.nodeRect
                        ? rectIoU(object.area, object.nodeRect)
                        : undefined,
                    boxOffsetPx: object.nodeRect
                        ? boxOffsetPx(object.area, object.nodeRect)
                        : undefined,
                    tier: object.tier,
                    tolerance:
                        object.tolerance ?? input.tolerance ?? toleranceForTier(object.tier),
                    note: object.note,
                });
            }
        }

        return { whole, rows, warnings, settled: input.settled ?? true };
    }

    return { rows, warnings, settled: input.settled ?? true };
}

/**
 * The number a row's verdict was actually taken on, with its unit.
 *
 * Printing `pixelDiffPct` for every failure would be misleading: a T2 row passes or fails on its ink
 * mask, and a row can fail on its box while its pixels are identical (`boxOffsetPx`).
 */
export function decidingMetric(row: ScorecardRow): string {
    if (row.tier === "T3") {
        return "excluded";
    }
    if (row.comparedPx === 0) {
        return "unmeasured";
    }
    if (
        row.inkDiffPct != null &&
        row.inkDiffPct > 25 &&
        (row.inkPx == null || row.inkPx >= MIN_INK_PX)
    ) {
        return `ink ${row.inkDiffPct.toFixed(1)}% of ${row.inkPx}px`;
    }
    if (row.boxOffsetPx != null && row.tier === "T1" && row.boxOffsetPx > BOX_SLACK_PX) {
        return `box +${row.boxOffsetPx.toFixed(1)}px`;
    }
    return `${row.pixelDiffPct.toFixed(2)}%`;
}

/** One-line console summary, so a dev run does not need to read the table to see the verdict. */
export function describeHarnessResult(result: HarnessResult): string {
    const failures = result.rows.filter(row => verdictFor(row) === "fail");
    const excluded = result.rows.filter(row => verdictFor(row) === "excluded").length;
    const unmeasured = result.rows.filter(row => verdictFor(row) === "unmeasured").length;
    const head = result.whole
        ? `whole surface ${result.whole.pixelDiffPct.toFixed(2)}% (maxΔ ${
              result.whole.maxChannelDelta
          })`
        : "no whole-surface comparison";
    const tail = failures.length
        ? `; FAIL: ${failures
              .map(row => `${row.widget}/${row.part} ${decidingMetric(row)}`)
              .join(", ")}`
        : result.rows.length
          ? "; all measured rows pass"
          : "";
    const excludedNote = excluded ? `; ${excluded} excluded (procedural, D2)` : "";
    const unmeasuredNote = unmeasured ? `; ${unmeasured} unmeasured (no comparable pixels)` : "";
    /*
     * The tolerance travels with the number: a budget of 2% is meaningless without it, and a
     * transitional frame is not a result at all.
     */
    const tolerances = [...new Set(result.rows.map(row => row.tolerance))].filter(
        tolerance => tolerance !== undefined
    );
    const toleranceNote = tolerances.length ? `; row tolerances ${tolerances.join("/")}` : "";
    const settledNote = result.settled ? "" : "; TRANSITIONAL frame — not a result";
    return `[lvgl-svg] ${head}${tail}${excludedNote}${unmeasuredNote}${toleranceNote}${settledNote}`;
}
