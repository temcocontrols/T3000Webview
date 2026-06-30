//! Pure Rust TTF/OTF font extraction → LVGL binary font format.
//! Replaces lv_font_conv (Node.js + native freetype) with:
//!   - ttf-parser  (parse font metrics)
//!   - fontdue     (rasterize glyphs to bitmaps)
//!   - Custom LVGL binary writer (head/cmap/loca/glyf/kern tables)
//!
//! Output matches lv_font_conv's JSON shape so the JS side (lvgl.ts) is unchanged.

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::Serialize;
use std::collections::BTreeMap;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct FontExtractOutput {
    #[serde(rename = "fontData")]
    pub font_data: FontData,
    #[serde(rename = "lvglBinFile")]
    pub lvgl_bin_file: String,
    #[serde(rename = "lvglSourceFile")]
    pub lvgl_source_file: String,
}

#[derive(Debug, Serialize)]
pub struct FontData {
    pub ascent: u16,
    pub descent: i16,
    pub glyphs: Vec<GlyphData>,
}

#[derive(Debug, Serialize)]
pub struct GlyphData {
    pub code: u32,
    #[serde(rename = "advanceWidth")]
    pub advance_width: f64,
    pub bbox: BBox,
    pub pixels: Vec<Vec<u8>>,
}

#[derive(Debug, Serialize)]
pub struct BBox {
    pub x: i16,
    pub y: i16,
    pub width: u16,
    pub height: u16,
}

/// Process a single font source entry.
/// `source_bin_base64` – base64-encoded TTF/OTF font data.
/// `size` – requested font size in px.
/// `bpp`  – bits per pixel (1, 2, 4, or 8).
/// `codepoints` – sorted deduplicated Unicode codepoints to include.
pub fn process_font(
    source_bin_base64: &str,
    size: f32,
    bpp: u8,
    codepoints: &[u32],
    font_name: &str,
    no_compress: bool,
    lcd: bool,
    lcd_v: bool,
    _no_kerning: bool,
    no_prefilter: bool,
) -> Result<FontExtractOutput, String> {
    let font_bytes = BASE64
        .decode(source_bin_base64)
        .map_err(|e| format!("base64 decode: {}", e))?;

    let font = fontdue::Font::from_bytes(font_bytes.clone(), fontdue::FontSettings::default())
        .map_err(|e| format!("font parse: {}", e))?;

    // Rasterize all requested glyphs
    let mut glyphs: Vec<InternalGlyph> = Vec::with_capacity(codepoints.len());
    for &code in codepoints {
        let c = char::from_u32(code).unwrap_or('\0');
        let (metrics, bitmap) = font.rasterize(c, size);
        if bitmap.is_empty() || metrics.width == 0 || metrics.height == 0 {
            // Skip glyphs with no visual representation (spaces, etc.)
            // But still record metrics for advance width
            glyphs.push(InternalGlyph {
                code,
                advance_width: metrics.advance_width as f64,
                x: metrics.xmin as i16,
                y: -(metrics.ymin as i16), // fontdue y grows up, LVGL expects down
                width: 0,
                height: 0,
                pixels: vec![],
                kerning: BTreeMap::new(),
            });
            continue;
        }

        let w = metrics.width as u16;
        let h = metrics.height as u16;

        // Convert 8-bit coverage bitmap → bpp-bit grayscale
        let pixels: Vec<Vec<u8>> = if bpp == 8 {
            (0..h as usize)
                .map(|row| bitmap[row * w as usize..(row + 1) * w as usize].to_vec())
                .collect()
        } else {
            (0..h as usize)
                .map(|row| {
                    bitmap[row * w as usize..(row + 1) * w as usize]
                        .iter()
                        .map(|&p| p >> (8 - bpp))
                        .collect()
                })
                .collect()
        };

        glyphs.push(InternalGlyph {
            code,
            advance_width: metrics.advance_width as f64,
            x: metrics.xmin as i16,
            y: -(metrics.ymin as i16), // flip sign: fontdue bottom-left origin → LVGL top-left
            width: w,
            height: h,
            pixels,
            kerning: BTreeMap::new(),
        });
    }

    // Collect font metrics from ttf-parser
    let face = ttf_parser::Face::parse(&font_bytes, 0)
        .map_err(|e| format!("ttf_parser: {:?}", e))?;
    let scale = size as f64 / face.units_per_em() as f64;

    let ascent = (face.ascender() as f64 * scale).round() as u16;
    let descent = (face.descender() as f64 * scale).round() as i16;
    let typo_ascent = face.typographic_ascender().unwrap_or(face.ascender());
    let typo_descent = face.typographic_descender().unwrap_or(face.descender());
    let typo_line_gap = face.typographic_line_gap().unwrap_or(0);
    let underline_position = face.underline_metrics()
        .map(|m| m.position).unwrap_or(0);
    let underline_thickness = face.underline_metrics()
        .map(|m| m.thickness).unwrap_or(0);

    let src_ascent = ascent as f64;
    let src_descent = descent as f64;
    let src_typo_ascent = (typo_ascent as f64 * scale).round() as i32;
    let src_typo_descent = (typo_descent as f64 * scale).round() as i32;
    let src_line_gap = (typo_line_gap as f64 * scale).round() as u16;
    let src_underline_pos = (underline_position as f64 * scale).round() as i16;
    let src_underline_thick = (underline_thickness as f64 * scale).round() as u16;

    // Assign glyph IDs (1-based, 0 reserved)
    let mut glyph_id: BTreeMap<u32, u16> = BTreeMap::new();
    glyph_id.insert(0, 0);
    for (i, g) in glyphs.iter().enumerate() {
        glyph_id.insert(g.code, (i + 1) as u16);
    }
    let last_id = glyphs.len() as u16 + 1;

    // Calculate global metrics
    let min_y = glyphs.iter().map(|g| g.y).min().unwrap_or(0);
    let max_y = glyphs.iter().map(|g| g.y + g.height as i16).max().unwrap_or(0);
    let monospaced = glyphs.windows(2).all(|w| w[0].advance_width == w[1].advance_width);

    // Bit widths
    let advance_width_format: u8 = if has_kerning(&glyphs) { 1 } else { 0 };
    let advance_width_bits: u8 = if monospaced {
        0
    } else {
        glyphs.iter().map(|g| signed_bits(width_to_int(g.advance_width, advance_width_format) as i16)).max().unwrap_or(0)
    };

    let xy_bits = glyphs.iter()
        .map(|g| signed_bits(g.x).max(signed_bits(g.y)))
        .max().unwrap_or(0);
    let wh_bits = glyphs.iter()
        .map(|g| unsigned_bits(g.width).max(unsigned_bits(g.height)))
        .max().unwrap_or(0);

    // Build tables
    let head = build_head(
        size as u16, bpp,
        src_ascent as u16, src_descent as i16,
        src_typo_ascent as u16, src_typo_descent as i16,
        src_line_gap,
        min_y, max_y,
        monospaced, advance_width_format, advance_width_bits,
        if no_compress { 0 } else { 1 }, // compression_id
        if lcd { 1 } else if lcd_v { 2 } else { 0 }, // subpixels_mode
        src_underline_pos, src_underline_thick,
        has_kerning(&glyphs),
        if glyphs.first().map_or(true, |g| g.advance_width > 0.0) {
            width_to_int(glyphs[0].advance_width, advance_width_format)
        } else { 0 },
        glyph_id.values().max().copied().unwrap_or(0) > 255,
        last_id as usize,
    );

    let cmap = build_cmap(&glyphs, &glyph_id);
    let glyf = build_glyf(&glyphs, &glyph_id, bpp, monospaced, advance_width_format, advance_width_bits, xy_bits, wh_bits, no_compress, no_prefilter, last_id);
    let loca = build_loca(&glyf.offsets, glyf.offsets.len() as u32);
    let kern = build_kern(&glyphs, &glyph_id, advance_width_format);

    // Concatenate binary
    let mut bin = Vec::new();
    bin.extend_from_slice(&head);
    bin.extend_from_slice(&cmap);
    bin.extend_from_slice(&loca);
    bin.extend_from_slice(&glyf.data);
    bin.extend_from_slice(&kern);

    let lvgl_bin_file = BASE64.encode(&bin);

    // Build LVGL C source
    let lvgl_source_file = build_lvgl_source(
        font_name, size, bpp, &glyphs, &glyph_id,
        src_ascent as u16, src_descent as i16, last_id,
    );

    // Build fontData JSON
    let font_data = FontData {
        ascent: src_ascent as u16,
        descent: src_descent as i16,
        glyphs: glyphs.iter().map(|g| GlyphData {
            code: g.code,
            advance_width: g.advance_width as f64,
            bbox: BBox { x: g.x, y: g.y, width: g.width, height: g.height },
            pixels: g.pixels.clone(),
        }).collect(),
    };

    Ok(FontExtractOutput {
        font_data,
        lvgl_bin_file,
        lvgl_source_file: BASE64.encode(lvgl_source_file.as_bytes()),
    })
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

struct InternalGlyph {
    code: u32,
    advance_width: f64,
    x: i16,
    y: i16,
    width: u16,
    height: u16,
    pixels: Vec<Vec<u8>>,
    kerning: BTreeMap<u32, f64>,
}

struct GlyfOutput {
    data: Vec<u8>,
    offsets: Vec<u32>,
}

// ---------------------------------------------------------------------------
// Bit helpers
// ---------------------------------------------------------------------------

fn unsigned_bits(val: u16) -> u8 {
    (16 - val.leading_zeros() as u8).max(1)
}

fn signed_bits(val: i16) -> u8 {
    if val >= 0 { unsigned_bits(val as u16) + 1 } else { unsigned_bits((-(val + 1)) as u16) + 1 }
}

fn width_to_int(w: f64, format: u8) -> i32 {
    if format == 0 { w.round() as i32 } else { (w * 16.0).round() as i32 }
}

fn has_kerning(glyphs: &[InternalGlyph]) -> bool {
    glyphs.iter().any(|g| !g.kerning.is_empty())
}

fn align4(size: usize) -> usize {
    if size % 4 == 0 { size } else { size + 4 - size % 4 }
}

// ---------------------------------------------------------------------------
// Table builders
// ---------------------------------------------------------------------------

fn build_head(
    font_size: u16, bpp: u8,
    ascent: u16, descent: i16,
    typo_ascent: u16, typo_descent: i16,
    typo_line_gap: u16,
    min_y: i16, max_y: i16,
    monospaced: bool,
    advance_width_format: u8,
    advance_width_bits: u8,
    compression_id: u8,
    subpixels_mode: u8,
    underline_position: i16,
    underline_thickness: u16,
    has_kern: bool,
    def_advance_width: i32,
    glyph_id_format_1: bool,
    last_id: usize,
) -> Vec<u8> {
    let o_size = 0usize;
    let o_label = o_size + 4;
    let o_version = o_label + 4;
    let o_tables = o_version + 4;
    let o_font_size = o_tables + 2;
    let o_ascent = o_font_size + 2;
    let o_descent = o_ascent + 2;
    let o_typo_ascent = o_descent + 2;
    let o_typo_descent = o_typo_ascent + 2;
    let o_typo_line_gap = o_typo_descent + 2;
    let o_min_y = o_typo_line_gap + 2;
    let o_max_y = o_min_y + 2;
    let o_def_adv_w = o_max_y + 2;
    let o_kerning_scale = o_def_adv_w + 2;
    let o_idx_to_loc = o_kerning_scale + 2;
    let o_glyph_id_fmt = o_idx_to_loc + 1;
    let o_adv_w_fmt = o_glyph_id_fmt + 1;
    let o_bpp = o_adv_w_fmt + 1;
    let o_xy_bits = o_bpp + 1;
    let o_wh_bits = o_xy_bits + 1;
    let o_adv_w_bits = o_wh_bits + 1;
    let o_compression = o_adv_w_bits + 1;
    let o_subpixels = o_compression + 1;
    let o_reserved = o_subpixels + 1;
    let o_underline_pos = o_reserved + 1;
    let o_underline_thick = o_underline_pos + 2;
    let head_len = align4(o_underline_thick + 2);

    let mut buf = vec![0u8; head_len];

    buf[o_size..o_size+4].copy_from_slice(&(head_len as u32).to_le_bytes());
    buf[o_label..o_label+4].copy_from_slice(b"head");
    buf[o_version..o_version+4].copy_from_slice(&1u32.to_le_bytes());

    let tables_count: u16 = if has_kern { 4 } else { 3 };
    buf[o_tables..o_tables+2].copy_from_slice(&tables_count.to_le_bytes());

    buf[o_font_size..o_font_size+2].copy_from_slice(&font_size.to_le_bytes());
    buf[o_ascent..o_ascent+2].copy_from_slice(&ascent.to_le_bytes());
    buf[o_descent..o_descent+2].copy_from_slice(&(descent as u16).to_le_bytes());
    buf[o_typo_ascent..o_typo_ascent+2].copy_from_slice(&typo_ascent.to_le_bytes());
    buf[o_typo_descent..o_typo_descent+2].copy_from_slice(&(typo_descent as u16).to_le_bytes());
    buf[o_typo_line_gap..o_typo_line_gap+2].copy_from_slice(&typo_line_gap.to_le_bytes());
    buf[o_min_y..o_min_y+2].copy_from_slice(&(min_y as u16).to_le_bytes());
    buf[o_max_y..o_max_y+2].copy_from_slice(&(max_y as u16).to_le_bytes());

    if monospaced {
        buf[o_def_adv_w..o_def_adv_w+2].copy_from_slice(&(def_advance_width as u16).to_le_bytes());
    }

    buf[o_kerning_scale..o_kerning_scale+2].copy_from_slice(&16u16.to_le_bytes()); // FP12.4 = 1.0

    let index_to_loc: u8 = if last_id > 65535 { 1 } else { 0 };
    buf[o_idx_to_loc] = index_to_loc;
    buf[o_glyph_id_fmt] = if glyph_id_format_1 { 1 } else { 0 };
    buf[o_adv_w_fmt] = advance_width_format;
    buf[o_bpp] = bpp;

    // xy_bits, wh_bits, advance_width_bits computed from actual glyph data
    let xy = unsigned_bits((max_y - min_y).max(1) as u16).max(unsigned_bits((max_y - min_y).max(1) as u16));
    let wh = unsigned_bits((max_y - min_y).max(1) as u16);
    buf[o_xy_bits] = xy;
    buf[o_wh_bits] = wh;
    buf[o_adv_w_bits] = advance_width_bits;

    buf[o_compression] = compression_id;
    buf[o_subpixels] = subpixels_mode;
    buf[o_underline_pos..o_underline_pos+2].copy_from_slice(&(underline_position as u16).to_le_bytes());
    buf[o_underline_thick..o_underline_thick+2].copy_from_slice(&underline_thickness.to_le_bytes());

    buf
}

fn build_cmap(glyphs: &[InternalGlyph], glyph_id: &BTreeMap<u32, u16>) -> Vec<u8> {
    // Simple format-0 cmap: consecutive codepoints
    let codes: Vec<u32> = glyphs.iter().map(|g| g.code).collect();
    if codes.is_empty() {
        let mut buf = vec![0u8; 12];
        buf[0..4].copy_from_slice(&12u32.to_le_bytes());
        buf[4..8].copy_from_slice(b"cmap");
        buf[8..12].copy_from_slice(&0u32.to_le_bytes());
        return buf;
    }

    let min_code = codes.iter().min().copied().unwrap();
    let max_code = codes.iter().max().copied().unwrap();
    let range_len = max_code - min_code + 1;

    // Sub-header (16 bytes): offset(4), rangeStart(4), rangeLen(2), glyphIdOffset(2), total(2), type(1)
    let subhead_offset = 12u32 + 16; // after main header + one subheader
    let mut subhead = vec![0u8; 16];
    subhead[0..4].copy_from_slice(&subhead_offset.to_le_bytes());
    subhead[4..8].copy_from_slice(&min_code.to_le_bytes());
    subhead[8..10].copy_from_slice(&(range_len as u16).to_le_bytes());
    subhead[10..12].copy_from_slice(&1u16.to_le_bytes()); // glyphIdOffset starts at 1
    subhead[12..14].copy_from_slice(&(range_len as u16).to_le_bytes());
    subhead[14] = 0; // SUB_FORMAT_0

    // Data: glyph IDs for each code in range
    let mut data = vec![0u8; range_len as usize];
    for &code in &codes {
        let idx = (code - min_code) as usize;
        if idx < data.len() {
            data[idx] = *glyph_id.get(&code).unwrap_or(&0) as u8;
        }
    }

    let content_len = subhead.len() + data.len();
    let total_len = align4(12 + content_len);
    let mut buf = vec![0u8; total_len];
    buf[0..4].copy_from_slice(&(total_len as u32).to_le_bytes());
    buf[4..8].copy_from_slice(b"cmap");
    buf[8..12].copy_from_slice(&1u32.to_le_bytes()); // subtable count
    buf[12..12+subhead.len()].copy_from_slice(&subhead);
    buf[12+subhead.len()..12+subhead.len()+data.len()].copy_from_slice(&data);

    buf
}

fn build_glyf(
    glyphs: &[InternalGlyph],
    glyph_id: &BTreeMap<u32, u16>,
    bpp: u8,
    monospaced: bool,
    advance_width_format: u8,
    advance_width_bits: u8,
    xy_bits: u8,
    wh_bits: u8,
    no_compress: bool,
    _no_prefilter: bool,
    _last_id: u16,
) -> GlyfOutput {
    let header_size = 8; // size + label
    // Reserve id 0
    let mut bin_data: Vec<Vec<u8>> = vec![vec![]];
    let mut offsets: Vec<u32> = vec![0];

    // Sort glyphs by id for offset calculation
    let mut sorted: Vec<(u16, &InternalGlyph)> = glyphs.iter()
        .filter_map(|g| glyph_id.get(&g.code).map(|&id| (id, g)))
        .collect();
    sorted.sort_by_key(|&(id, _)| id);

    for (_id, g) in &sorted {
        let mut buf = Vec::with_capacity(100 + g.width as usize * g.height as usize * 4);

        // Write advance width (if not monospaced)
        if !monospaced {
            let w = width_to_int(g.advance_width, advance_width_format);
            write_bits(&mut buf, w as u32, advance_width_bits as u32);
        }

        // Write bbox
        write_bits(&mut buf, g.x as u32, xy_bits as u32);
        write_bits(&mut buf, g.y as u32, xy_bits as u32);
        write_bits(&mut buf, g.width as u32, wh_bits as u32);
        write_bits(&mut buf, g.height as u32, wh_bits as u32);

        // Write pixel data
        if no_compress {
            for row in &g.pixels {
                for &p in row {
                    write_bits(&mut buf, p as u32, bpp as u32);
                }
            }
        } else {
            // Simple compression: store raw for now (full RLE/LZ4 would match lv_font_conv)
            for row in &g.pixels {
                for &p in row {
                    write_bits(&mut buf, p as u32, bpp as u32);
                }
            }
        }

        bin_data.push(buf);
        offsets.push(offsets.last().unwrap() + bin_data.last().unwrap().len() as u32);
    }

    // Build final buffer
    let total_data_len: usize = bin_data.iter().map(|b| b.len()).sum();
    let total_len = align4(header_size + total_data_len);
    let mut buf = vec![0u8; total_len];
    buf[0..4].copy_from_slice(&(total_len as u32).to_le_bytes());
    buf[4..8].copy_from_slice(b"glyf");

    let mut pos = header_size;
    for b in &bin_data {
        let end = pos + b.len();
        if end <= buf.len() {
            buf[pos..end].copy_from_slice(b);
        }
        pos = end;
    }

    // Fix offsets: they're relative to header
    let header_offset = header_size as u32;
    let fixed_offsets: Vec<u32> = offsets.iter().map(|&o| o + header_offset).collect();

    GlyfOutput {
        data: buf,
        offsets: fixed_offsets,
    }
}

fn write_bits(buf: &mut Vec<u8>, value: u32, bits: u32) {
    // Simple bit writer — write value into whole bytes (MSB first).
    // Each glyph field is byte-aligned for simplicity.
    let v = value & ((1u32 << bits) - 1);
    let bytes_needed = ((bits + 7) / 8) as usize;
    let start = buf.len();
    buf.resize(start + bytes_needed, 0);
    for i in 0..bytes_needed {
        let shift = (bytes_needed - 1 - i) * 8;
        buf[start + i] = ((v >> shift) & 0xFF) as u8;
    }
}

fn build_loca(offsets: &[u32], count: u32) -> Vec<u8> {
    // Uses u32 offsets
    let header = 12;
    let data_len = offsets.len() * 4;
    let total = align4(header + data_len);
    let mut buf = vec![0u8; total];
    buf[0..4].copy_from_slice(&(total as u32).to_le_bytes());
    buf[4..8].copy_from_slice(b"loca");
    buf[8..12].copy_from_slice(&count.to_le_bytes());
    for (i, &off) in offsets.iter().enumerate() {
        let pos = header + i * 4;
        if pos + 4 <= total {
            buf[pos..pos+4].copy_from_slice(&off.to_le_bytes());
        }
    }
    buf
}

fn build_kern(_glyphs: &[InternalGlyph], _glyph_id: &BTreeMap<u32, u16>, _adv_w_fmt: u8) -> Vec<u8> {
    // Kern table — currently no kerning data (fontdue doesn't expose kerning pairs easily).
    // Empty table is valid: lv_font_conv's font.toBin() omits kern when hasKerning() is false.
    // The head table's tables_count will be 3 when kern is empty.
    vec![]
}

// ---------------------------------------------------------------------------
// LVGL C source writer
// ---------------------------------------------------------------------------

fn build_lvgl_source(
    font_name: &str,
    size: f32,
    bpp: u8,
    glyphs: &[InternalGlyph],
    _glyph_id: &BTreeMap<u32, u16>,
    ascent: u16,
    descent: i16,
    _last_id: u16,
) -> String {
    let guard = font_name.to_uppercase();
    let mut out = String::new();

    out.push_str(&format!(
        "/*******************************************************************************\n\
         * Size: {} px\n\
         * Bpp: {}\n\
         ******************************************************************************/\n\n\
         #ifdef LV_LVGL_H_INCLUDE_SIMPLE\n\
         #include \"lvgl.h\"\n\
         #else\n\
         #include \"lvgl/lvgl.h\"\n\
         #endif\n\n\
         #ifndef {}\n\
         #define {} 1\n\
         #endif\n\n\
         #if {}\n\n",
        size, bpp, guard, guard, guard
    ));

    // Glyph bitmaps
    out.push_str("/* Glyph bitmaps */\n");
    for g in glyphs {
        if g.pixels.is_empty() { continue; }
        let _h = g.pixels.len();
        let _w = g.pixels.first().map(|r| r.len()).unwrap_or(0);
        out.push_str(&format!("static const uint8_t glyph_{}_bitmap[] = {{\n", g.code));
        for row in &g.pixels {
            out.push_str("    ");
            for &p in row {
                out.push_str(&format!("0x{:02x}, ", p));
            }
            out.push_str("\n");
        }
        out.push_str("};\n\n");
    }

    // Glyph descriptors
    out.push_str("/* Glyph descriptors */\n");
    out.push_str(&format!("static const lv_font_fmt_txt_glyph_dsc_t glyph_dsc[] = {{\n"));
    for g in glyphs {
        out.push_str(&format!(
            "    {{.bitmap_index = 0, .adv_w = {}, .box_w = {}, .box_h = {}, .ofs_x = {}, .ofs_y = {}}},\n",
            (g.advance_width * 16.0) as i32,
            g.width, g.height,
            g.x, g.y
        ));
    }
    out.push_str("};\n\n");

    // Footer
    out.push_str(&format!(
        "static const lv_font_fmt_txt_dsc_t font_dsc = {{\n\
         .glyph_dsc = glyph_dsc,\n\
         .glyph_cnt = {},\n\
         .bpp = {},\n\
         .kern_scale = 16,\n\
         }};\n\n\
         lv_font_t {} = {{\n\
         .dsc = &font_dsc,\n\
         .line_height = {},\n\
         .base_line = {},\n\
         .get_glyph_dsc = NULL,\n\
         }};\n\n\
         #endif /* {} */\n",
        glyphs.len(), bpp,
        font_name,
        ascent as u16 + (-descent) as u16,
        ascent,
        guard
    ));

    out
}
