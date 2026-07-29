//! LVGL C-array image → PNG converter.
//!
//! Reads SquareLine-generated `ui_img_*.c` files containing LVGL image descriptors
//! (RGB565 pixel data + separate alpha channel) and converts them to base64-encoded PNG.
//!
//! Format: LV_COLOR_FORMAT_NATIVE_WITH_ALPHA = RGB565 data (w×h×2 bytes) + alpha (w×h bytes)

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use std::fs;
use std::path::Path;

/// Parsed LVGL image from a .c file
#[derive(Debug)]
pub struct LvglImage {
    pub name: String,
    pub width: u32,
    pub height: u32,
    /// Base64-encoded PNG data
    pub png_base64: String,
}

/// Convert a single ui_img_*.c file to base64 PNG.
pub fn extract_image(file_path: &Path) -> Result<LvglImage, String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("{}: {}", file_path.display(), e))?;

    // Extract image name from filename: ui_img_fan_small_png.c → fan_small
    let name = file_path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .replace("ui_img_", "")
        .replace("_png", "");

    // Parse width and height from the descriptor
    let width = extract_descriptor_int(&content, ".header.w")
        .ok_or_else(|| format!("{}: missing width", name))?;
    let height = extract_descriptor_int(&content, ".header.h")
        .ok_or_else(|| format!("{}: missing height", name))?;

    // Parse the hex data array (the long uint8_t array)
    let raw_bytes = parse_hex_array(&content, "ui_img_")?;

    let pixel_count = (width * height) as usize;
    let rgb565_size = pixel_count * 2;
    let alpha_size = pixel_count;

    if raw_bytes.len() < rgb565_size + alpha_size {
        return Err(format!(
            "{}: data too short ({} bytes, need {} for {}x{})",
            name, raw_bytes.len(), rgb565_size + alpha_size, width, height
        ));
    }

    let rgb565_data = &raw_bytes[..rgb565_size];
    let alpha_data = &raw_bytes[rgb565_size..rgb565_size + alpha_size];

    // Convert to RGBA PNG
    let png_bytes = rgb565_alpha_to_png(rgb565_data, alpha_data, width, height)?;
    let png_base64 = BASE64.encode(&png_bytes);

    Ok(LvglImage {
        name,
        width,
        height,
        png_base64,
    })
}

/// Convert RGB565 + alpha → PNG bytes using the `png` crate (or minimal writer).
fn rgb565_alpha_to_png(
    rgb565: &[u8],
    alpha: &[u8],
    width: u32,
    height: u32,
) -> Result<Vec<u8>, String> {
    let mut rgba: Vec<u8> = Vec::with_capacity((width * height * 4) as usize);

    for i in 0..(width * height) as usize {
        let idx = i * 2;
        let pixel = u16::from_le_bytes([rgb565[idx], rgb565[idx + 1]]);
        // RGB565: RRRRRGGGGGGBBBBB
        let r = (((pixel >> 11) & 0x1F) as u8 * 255 / 31) as u8;
        let g = (((pixel >> 5) & 0x3F) as u8 * 255 / 63) as u8;
        let b = ((pixel & 0x1F) as u8 * 255 / 31) as u8;
        let a = alpha.get(i).copied().unwrap_or(255);
        rgba.extend_from_slice(&[r, g, b, a]);
    }

    // Write PNG using the png crate
    let mut png_data = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_data, width, height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .map_err(|e| format!("PNG header: {}", e))?;
        writer
            .write_image_data(&rgba)
            .map_err(|e| format!("PNG write: {}", e))?;
    }
    Ok(png_data)
}

/// Extract a numeric field from the C descriptor, e.g. `.header.w = 35`
fn extract_descriptor_int(content: &str, field: &str) -> Option<u32> {
    for line in content.lines() {
        if line.contains(field) && line.contains('=') {
            // ".header.w = 35,"
            let after_eq = line.split('=').nth(1)?;
            let num_str = after_eq
                .trim()
                .trim_end_matches(',')
                .trim_end_matches(';');
            return num_str.parse::<u32>().ok();
        }
    }
    None
}

/// Parse a uint8_t hex array declaration from C source.
/// Pattern: `const ... uint8_t ui_img_xxx_data[] = { 0x00, 0x00, ... };`
fn parse_hex_array(content: &str, prefix: &str) -> Result<Vec<u8>, String> {
    // Find the array start: "ui_img_xxx_data[]  = {"
    let pattern = format!("{}_data[]", prefix);
    let array_start = content
        .find(&pattern)
        .ok_or_else(|| "array declaration not found".to_string())?;
    let after_decl = &content[array_start + pattern.len()..];
    let brace = after_decl
        .find('{')
        .ok_or_else(|| "array opening brace not found".to_string())?;
    let after_brace = &after_decl[brace + 1..];

    // Find matching closing brace by counting
    let mut depth = 1i32;
    let mut end = 0usize;
    for (i, ch) in after_brace.char_indices() {
        if ch == '{' { depth += 1; }
        if ch == '}' { depth -= 1; if depth == 0 { end = i; break; } }
    }
    if depth != 0 {
        return Err("unbalanced braces in array".to_string());
    }

    let array_content = &after_brace[..end];

    // Parse hex values: 0x00, 0xFF, etc.
    let mut bytes = Vec::new();
    for part in array_content.split(',') {
        let part = part.trim();
        if part.is_empty() { continue; }
        // Handle "0x00" and "0xFF" patterns
        if let Some(hex) = part.strip_prefix("0x").or_else(|| part.strip_prefix("0X")) {
            let val = u8::from_str_radix(hex, 16)
                .map_err(|_| format!("invalid hex: '{}'", part))?;
            bytes.push(val);
        } else {
            // Might be a raw integer (unlikely for image data)
            if let Ok(val) = part.parse::<u8>() {
                bytes.push(val);
            }
        }
    }

    if bytes.is_empty() {
        return Err("no hex data found in array".to_string());
    }

    Ok(bytes)
}
