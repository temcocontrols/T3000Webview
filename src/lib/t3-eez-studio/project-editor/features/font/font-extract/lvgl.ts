import type {
    ExtractFontParams,
    FontProperties,
    GlyphProperties,
    IFontExtract
} from "project-editor/features/font/font-extract";

import fs from "fs";
import path from "path";
import { getName, NamingConvention } from "project-editor/build/helper";
import * as notification from "eez-studio-ui/notification";

let extractBusy = false;

export class ExtractFont implements IFontExtract {
    fontProperties: FontProperties;
    allEncodings: number[];
    fontData: any;

    constructor(private params: ExtractFontParams) {}

    async start() {
        // embeddedFontFile is already base64-encoded TTF/OTF data.
        // Use it directly to avoid Buffer.from().toString() round-trip
        // which can break in browser polyfills.
        let source_bin_base64: string;
        if (this.params.embeddedFontFile) {
            source_bin_base64 = this.params.embeddedFontFile;
        } else if (fs.existsSync(this.params.absoluteFilePath)) {
            const source_bin = fs.readFileSync(this.params.absoluteFilePath);
            source_bin_base64 = Buffer.from(source_bin).toString("base64");
        } else {
            throw new Error(
                `Font source not available: embeddedFontFile is missing and ` +
                `file "${this.params.absoluteFilePath}" does not exist. ` +
                `Re-import the font or ensure the project was saved with embedded fonts enabled.`
            );
        }

        const range: number[] = [];
        this.params.encodings!.map(encodingRange =>
            range.push(
                encodingRange.from,
                encodingRange.to,
                encodingRange.mapped_from ?? encodingRange.from
            )
        );

        const symbols = this.params.symbols ?? "";

        const font: any[] = [
            {
                source_path: this.params.absoluteFilePath,
                source_bin_base64,
                ranges: [
                    {
                        range,
                        symbols
                    }
                ]
            }
        ];

        const fontName = this.params.name || "font";

        // Diagnostic: verify embedded data is present before sending to backend
        console.log(
            `[lvgl] extractFont "${fontName}": embeddedFontFile=${!!this.params.embeddedFontFile} ` +
            `(len=${(this.params.embeddedFontFile || "").length}), ` +
            `source_bin_base64 len=${source_bin_base64.length}`
        );

        if (this.params.additionalSources) {
            for (const additionalSource of this.params.additionalSources) {
                let addSourceB64: string;
                if (additionalSource.embeddedFontFile) {
                    addSourceB64 = additionalSource.embeddedFontFile;
                } else if (fs.existsSync(additionalSource.absoluteFilePath)) {
                    const addSourceBin = fs.readFileSync(additionalSource.absoluteFilePath);
                    addSourceB64 = Buffer.from(addSourceBin).toString("base64");
                } else {
                    throw new Error(
                        `Additional font source not available: embeddedFontFile is missing and ` +
                        `file "${additionalSource.absoluteFilePath}" does not exist.`
                    );
                }

                const addRange: number[] = [];
                if (additionalSource.encodings) {
                    additionalSource.encodings.map(encodingRange =>
                        addRange.push(
                            encodingRange.from,
                            encodingRange.to,
                            encodingRange.mapped_from ?? encodingRange.from
                        )
                    );
                }

                const addSymbols = additionalSource.symbols ?? "";

                font.push({
                    source_path: additionalSource.absoluteFilePath,
                    source_bin_base64: addSourceB64,
                    ranges: [
                        {
                            range: addRange,
                            symbols: addSymbols
                        }
                    ]
                });
            }
        }

        const output = getName(
            "ui_font_",
            this.params.name || "",
            NamingConvention.UnderscoreLowerCase
        );

        const args = {
            font,
            size: this.params.size,
            bpp: this.params.bpp,
            no_compress: true,
            lcd: false,
            lcd_v: false,
            use_color_info: false,
            output,
            lv_include: this.params.lvglInclude,
            no_kerning: false,
            no_prefilter: false,
            fast_kerning: false,
            opts_string: this.params.opts_string,
            lv_fallback: this.params.lv_fallback
                ? this.params.lv_fallback
                : undefined,
            // stride: 1,
            // align: 1,
            // no_kerning: true
        };

        // wait for !extractBusy
        await new Promise<void>(resolve => {
            const interval = setInterval(() => {
                if (!extractBusy) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });

        extractBusy = true;

        // show notification only if this takes longer than 1 second
        const NOTIFICATION_TIMEOUT = 3000;
        let toastId;
        function createToast() {
            toastId = notification.info(
                `Extracting font "${fontName}"...`,
                { autoClose: false, isLoading: true }
            );
        }
        let timeout: any = setTimeout(() => {
            timeout = undefined;
            createToast();
        }, NOTIFICATION_TIMEOUT);
        //

        try {
            let workerResult: any;

            if (typeof window !== "undefined") {
                // Browser: font extraction via Rust backend API (pure Rust,
                // self-contained in the DLL — no Node.js needed).
                console.log(
                    `[lvgl] extractFont "${fontName}": calling Rust backend ` +
                    `/api/eez-studio/extract-font (proxy → localhost:9103)`
                );
                const resp = await fetch("/api/eez-studio/extract-font", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ args, output })
                });
                console.log(
                    `[lvgl] extractFont "${fontName}": Rust backend response ` +
                    `status=${resp.status} ok=${resp.ok}`
                );
                if (!resp.ok) {
                    const text = await resp.text().catch(() => "");
                    throw new Error(`Font extraction failed (HTTP ${resp.status}): ${text}`);
                }
                workerResult = await resp.json();
                console.log(
                    `[lvgl] extractFont "${fontName}": Rust backend returned ` +
                    `lvglBinFile=${!!workerResult.lvglBinFile} ` +
                    `(len=${(workerResult.lvglBinFile || "").length}) ` +
                    `lvglSourceFile=${!!workerResult.lvglSourceFile} ` +
                    `(len=${(workerResult.lvglSourceFile || "").length})`
                );
            } else {
                // Electron: use Worker with lv_font_conv
                workerResult = await new Promise<any>((resolve, reject) => {
                    const workerPath = path.join(
                        __dirname,
                        "lvgl-worker.js"
                    );
                    const worker = new Worker(workerPath);

                    worker.onmessage = (e: MessageEvent) => {
                        worker.terminate();
                        if (e.data.error) {
                            reject(new Error(e.data.error));
                        } else {
                            resolve(e.data);
                        }
                    };

                    worker.onerror = (e: ErrorEvent) => {
                        worker.terminate();
                        reject(new Error(e.message));
                    };

                    worker.postMessage({ args, output });
                });
            }

            this.fontData = workerResult.fontData;
            const lvglBinFile = workerResult.lvglBinFile;
            const lvglSourceFile = workerResult.lvglSourceFile;

            this.fontProperties = {
                name: this.params.name || "",
                renderingEngine: "LVGL",
                source: {
                    filePath: this.params.relativeFilePath,
                    size: this.params.size,
                    threshold: this.params.threshold
                },
                embeddedFontFile: source_bin_base64,
                bpp: this.params.bpp,
                threshold: this.params.threshold,
                height: this.fontData.ascent - this.fontData.descent,
                ascent: this.fontData.ascent,
                descent: -this.fontData.descent,
                glyphs: [],
                lvglGlyphs: {
                    encodings: this.params.encodings!,
                    symbols
                },
                lvglBinFile,
                lvglSourceFile
            };

            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;                
            }

            if (toastId) {
                notification.update(toastId!, {
                    render: `Font "${fontName}" extracted successfully.`,
                    type: notification.SUCCESS,
                    isLoading: false,
                    autoClose: 1000
                });
            }
        } catch (err: any) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }

            if (!toastId) {
                // always show notification if it fails
                createToast();
            }

            notification.update(toastId!, {
                render: `Font "${fontName}" extraction failed: ${err.message}`,
                type: notification.ERROR,
                isLoading: false,
                autoClose: false
            });
            throw err;
        } finally {
            extractBusy = false;
        }
    }

    getAllGlyphs = () => {
        return this.fontData.glyphs.map((glyph: any) => {
            let glyphProperties: GlyphProperties = {} as any;

            glyphProperties.encoding = glyph.code;

            glyphProperties.dx = glyph.advanceWidth;

            glyphProperties.x = glyph.bbox.x;
            glyphProperties.y = glyph.bbox.y;
            glyphProperties.width = glyph.bbox.width;
            glyphProperties.height = glyph.bbox.height;

            glyphProperties.source = {
                filePath: this.params.relativeFilePath,
                size: this.params.size,
                threshold: this.params.threshold,
                encoding: glyph.code
            } as any;

            const pixelArray: number[] = [];
            for (const row of glyph.pixels) {
                pixelArray.push(...row);
            }

            glyphProperties.glyphBitmap = {
                width: glyph.bbox.width,
                height: glyph.bbox.height,
                pixelArray
            };

            return glyphProperties;
        });
    };

    freeResources() {
        extractBusy = false;
    }
}
