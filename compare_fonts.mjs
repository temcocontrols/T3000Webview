// Compare lv_font_conv (Electron) output with Rust backend output
// Run this in Electron T3000 or Node.js with lv_font_conv installed.
// Usage: node compare_fonts.mjs

import { readFileSync, writeFileSync } from "fs";

// Load lv_font_conv
const { default: lv_font_conv } = await import("lv_font_conv");
// Actually lv_font_conv doesn't export a programmatic API easily.
// Let's use the internal font builder directly.

const Font = (await import("./node_modules/lv_font_conv/lib/font/font.js")).default;

// Test data: use the same font bytes the Rust backend would receive
const ttfBytes = readFileSync(process.argv[2] || "path/to/font.ttf");
const ttfBase64 = ttfBytes.toString("base64");

// Build using lv_font_conv
const fontData = {
    size: 21,
    bpp: 4,
    ascent: 0,
    descent: 0,
    typoAscent: 0,
    typoDescent: 0,
    typoLineGap: 0,
    underlinePosition: 0,
    underlineThickness: 0,
    glyphs: [] // would need the full glyph rasterization data
};

console.log("WARNING: This script needs the full glyph rasterization output.");
console.log("Instead, let's compare the BINARY TABLE FORMATS by dumping hex.");

// Simpler approach: fetch the Rust backend response and compare
const resp = await fetch("http://localhost:9103/api/eez-studio/extract-font", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        source_bin_base64: ttfBase64,
        size: 21,
        bpp: 4,
        codepoints: Array.from({length: 95}, (_, i) => i + 32),
        font_name: "test_21",
        no_compress: false,
        lcd: false,
        lcd_v: false,
        no_kerning: true,
        no_prefilter: false
    })
});

const rustResult = await resp.json();
const rustBin = Buffer.from(rustResult.lvglBinFile, "base64");

console.log("Rust binary size:", rustBin.length);
console.log("First 256 bytes hex:");
console.log(rustBin.slice(0, 256).toString("hex"));

// Parse tables
function parseTable(bin, offset) {
    const size = bin.readUInt32LE(offset);
    const label = bin.slice(offset + 4, offset + 8).toString("ascii");
    console.log(`  Table at ${offset}: "${label}" size=${size}`);
    return { offset, size, label, data: bin.slice(offset + 8, offset + size) };
}

let pos = 0;
while (pos < rustBin.length) {
    const t = parseTable(rustBin, pos);
    pos += t.size;
    
    if (t.label === "head") {
        console.log("  head index_to_loc:", t.data[29]); // offset within head data
        console.log("  head glyph_id_fmt:", t.data[30]);
        console.log("  head bpp:", t.data[32]);
    }
    if (t.label === "cmap") {
        console.log("  cmap subtable_count:", t.data.readUInt32LE(0));
        // Subheader at offset 4 within cmap data
        const sh = t.data.slice(4, 20);
        console.log("  cmap subheader[0] range_start:", sh.readUInt32LE(0));
        console.log("  cmap subheader[0] range_len:", sh.readUInt16LE(4));
        console.log("  cmap subheader[0] glyph_id_start:", sh.readUInt16LE(6));
        console.log("  cmap subheader[0] total:", sh.readUInt16LE(8));
        console.log("  cmap subheader[0] type:", sh[10]);
        // Data after all subheaders
        const dataOff = 4 + 16; // count(4) + subheader(16)
        console.log("  cmap data first 20 bytes:", t.data.slice(dataOff, dataOff + 20).toString("hex"));
    }
    if (t.label === "loca") {
        console.log("  loca count:", t.data.readUInt32LE(0));
        console.log("  loca first 10 entries (u32):", 
            Array.from({length: 10}, (_, i) => t.data.readUInt32LE(4 + i*4)));
    }
}

writeFileSync("rust_font_bin.bin", rustBin);
console.log("\nSaved binary to rust_font_bin.bin");
console.log("Now compare with Electron's lv_font_conv output");
