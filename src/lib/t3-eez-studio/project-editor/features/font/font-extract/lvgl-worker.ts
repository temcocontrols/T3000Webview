const collectFontData = require("lv_font_conv/lib/collect_font_data");
const getFontBinData = require("lv_font_conv/lib/writers/bin");
const getFontSourceData = require("lv_font_conv/lib/writers/lvgl");

const ctx: Worker = self as any;

ctx.onmessage = async (e: MessageEvent) => {
    try {
        const { args, output } = e.data;

        // Reconstruct Buffer objects from base64 strings.
        // Guard: if source_bin_base64 is missing, fail with a clear message
        // instead of letting lv_font_conv throw an opaque "source_bin is not defined".
        for (const f of args.font) {
            if (f.source_bin_base64) {
                f.source_bin = Buffer.from(f.source_bin_base64, "base64");
                delete f.source_bin_base64;
            } else {
                throw new Error(
                    `Font source data missing for "${f.source_path}". ` +
                    `The project's embedded font data may have been stripped — ` +
                    `re-import the original .eez-project file to restore it.`
                );
            }
        }

        const fontData = await collectFontData(args);

        const bin: Buffer = getFontBinData(args, fontData)[output];
        const lvglBinFile = bin.toString("base64");

        const source: Buffer = getFontSourceData(args, fontData)[output];
        const lvglSourceFile = source.toString("base64");

        ctx.postMessage({
            fontData: {
                ascent: fontData.ascent,
                descent: fontData.descent,
                glyphs: fontData.glyphs.map((glyph: any) => ({
                    code: glyph.code,
                    advanceWidth: glyph.advanceWidth,
                    bbox: {
                        x: glyph.bbox.x,
                        y: glyph.bbox.y,
                        width: glyph.bbox.width,
                        height: glyph.bbox.height
                    },
                    pixels: glyph.pixels
                }))
            },
            lvglBinFile,
            lvglSourceFile
        });
    } catch (err: any) {
        ctx.postMessage({ error: err?.message || String(err) });
    }
};
