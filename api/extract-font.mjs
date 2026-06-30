// Standalone font extraction script for Rust backend.
// Reads JSON from stdin, writes result JSON to stdout.
// Usage: node extract-font.mjs < input.json > output.json

import { createRequire } from "module";
import { Buffer } from "buffer";
const require = createRequire(import.meta.url);

const collectFontData = require("lv_font_conv/lib/collect_font_data");
const getFontBinData = require("lv_font_conv/lib/writers/bin");
const getFontSourceData = require("lv_font_conv/lib/writers/lvgl");

async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const { args, output } = input;

    // Reconstruct Buffer objects from base64 strings
    for (const f of args.font) {
        if (f.source_bin_base64) {
            f.source_bin = Buffer.from(f.source_bin_base64, "base64");
            delete f.source_bin_base64;
        }
    }

    const fontData = await collectFontData(args);

    const bin = getFontBinData(args, fontData)[output];
    const lvglBinFile = bin.toString("base64");

    const source = getFontSourceData(args, fontData)[output];
    const lvglSourceFile = source.toString("base64");

    const result = {
        fontData: {
            ascent: fontData.ascent,
            descent: fontData.descent,
            glyphs: fontData.glyphs.map((glyph) => ({
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
    };

    process.stdout.write(JSON.stringify(result));
}

main().catch(err => {
    process.stderr.write(JSON.stringify({ error: err?.message || String(err) }));
    process.exit(1);
});
