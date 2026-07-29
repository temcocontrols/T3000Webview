//! SquareLine C → Firmware JSON parser.
//!
//! Reads SquareLine Studio generated C screen files from the firmware project
//! and converts them to firmware JSON format compatible with the mock API.
//!
//! ## Usage (CLI)
//! ```bash
//! cargo run --example parse_squareline -- \
//!   --input ../T3-programmable-controller-on-ESP32/main/TemcoScreen \
//!   --output firmware-screens.json
//! ```
//!
//! ## Usage (library)
//! ```rust,ignore
//! use crate::eez_studio::parse_squareline::parse_screens;
//! let screens = parse_screens("path/to/TemcoScreen")?;
//! // feed into mock API store or write to file
//! ```

use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use tracing::info;

/// A parsed firmware widget ready for JSON output.
#[derive(Debug, Clone)]
pub struct FirmwareWidget {
    pub id: String,
    pub sub_type: String,
    pub parent: Option<String>,
    pub x_pos: i32,
    pub y_pos: i32,
    pub width: i32,
    pub height: i32,
    pub obj_text: String,
    pub text_type: String,
    pub style: Option<Value>,
    pub events: Option<Value>,
    pub extra: HashMap<String, Value>,
}

/// A parsed screen with its widgets, fonts and bitmaps.
#[derive(Debug)]
pub struct ParsedScreen {
    pub name: String,
    pub widgets: Vec<FirmwareWidget>,
    pub fonts: Vec<(String, i32)>,
    pub bitmaps: Vec<String>,
    pub widgets_map: serde_json::Map<String, Value>,
    /// Screen bg_color from root lv_obj_create(NULL), e.g. "#000000"
    pub bg_color: Option<String>,
}

// ── Widget type detection from LVGL create calls ─────────────────────

const CREATE_PATTERNS: &[(&str, &str)] = &[
    ("lv_label_create", "label"),
    ("lv_button_create", "button"),
    ("lv_btn_create", "button"),
    ("lv_imagebutton_create", "imagebutton"),
    ("lv_checkbox_create", "checkbox"),
    ("lv_arc_create", "arc"),
    ("lv_bar_create", "bar"),
    ("lv_img_create", "image"),
    ("lv_image_create", "image"),
    ("lv_switch_create", "switch"),
    ("lv_slider_create", "slider"),
    ("lv_dropdown_create", "dropdown"),
    ("lv_textarea_create", "textarea"),
    ("lv_roller_create", "roller"),
    ("lv_calendar_create", "calendar"),
    ("lv_keyboard_create", "keyboard"),
    ("lv_spinbox_create", "spinbox"),
];

fn detect_sub_type(line: &str) -> Option<&'static str> {
    for (func, st) in CREATE_PATTERNS {
        if line.contains(func) {
            return Some(st);
        }
    }
    None
}

fn extract_var_name(line: &str) -> Option<String> {
    // "ui_TemperatureVal = lv_label_create(...)"
    if let Some(pos) = line.find('=') {
        let left = line[..pos].trim();
        if !left.is_empty() && left.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return Some(left.to_string());
        }
    }
    None
}

/// Extract the parent widget name from a create call:
/// `lv_label_create(ui_TemperatureContainer)` → Some("TemperatureContainer")
/// `lv_obj_create(NULL)` → None (root screen)
fn extract_parent_name(line: &str) -> Option<String> {
    // Find opening paren after create function name
    let paren = line.find('(')?;
    let after_paren = &line[paren + 1..];
    // Get first argument
    let arg = after_paren.split(|c| c == ',' || c == ')').next()?.trim();
    if arg == "NULL" || arg.is_empty() { return None; }
    // Strip "ui_" prefix and "uic_" prefix
    let clean = arg.trim_start_matches("ui_").trim_start_matches("uic_");
    if clean.is_empty() { return None; }
    Some(clean.to_string())
}

fn extract_ints(line: &str, func: &str) -> Vec<i32> {
    // "lv_obj_set_pos(obj, 80, 20);" → [80, 20]
    let start = match line.find(func) {
        Some(i) => i + func.len(),
        None => return vec![],
    };
    let rest = &line[start..];
    let paren = match rest.find('(') {
        Some(i) => i,
        None => return vec![],
    };
    let args = &rest[paren + 1..];
    args.split(')')
        .next()
        .unwrap_or("")
        .split(',')
        .filter_map(|s| {
            let t = s.trim();
            t.parse::<i32>().ok()
        })
        .collect()
}

fn extract_string(line: &str, func: &str, quote: char) -> Option<String> {
    let start = line.find(func)? + func.len();
    let rest = &line[start..];
    let q1 = rest.find(quote)?;
    let q2 = rest[q1 + 1..].find(quote)?;
    Some(rest[q1 + 1..q1 + 1 + q2].to_string())
}

fn extract_font_ref(line: &str) -> Option<String> {
    // lv_obj_set_style_text_font(obj, &ui_font_Arial80, ...)
    if line.contains("lv_obj_set_style_text_font") {
        // Custom font: &ui_font_Arial80
        if let Some(start) = line.find("&ui_font_") {
            let rest = &line[start + 1..]; // skip &
            let end = rest.find(|c: char| !c.is_alphanumeric() && c != '_').unwrap_or(rest.len());
            let name = &rest[..end].replace("ui_font_", "");
            return Some(name.to_string());
        }
        // System font: &lv_font_montserrat_40
        if let Some(start) = line.find("&lv_font_") {
            let rest = &line[start + 1..];
            let end = rest.find(|c: char| !c.is_alphanumeric() && c != '_').unwrap_or(rest.len());
            return Some(rest[..end].to_string());
        }
    }
    None
}

/// Extract font size from font name like "lv_font_montserrat_40" → 40
/// Also handles custom fonts: "Arial80" → 80
fn extract_font_size(line: &str) -> Option<i32> {
    if !line.contains("lv_obj_set_style_text_font") { return None; }
    // System font: &lv_font_montserrat_40
    if let Some(start) = line.find("&lv_font_") {
        let rest = &line[start + 1..];
        let end = rest.find(|c: char| !c.is_alphanumeric() && c != '_').unwrap_or(rest.len());
        let name = &rest[..end];
        if let Some(last_underscore) = name.rfind('_') {
            return name[last_underscore + 1..].parse::<i32>().ok();
        }
    }
    // Custom font: &ui_font_Arial80 → extract "80"
    if let Some(start) = line.find("&ui_font_") {
        let rest = &line[start + 1..];
        let end = rest.find(|c: char| !c.is_alphanumeric() && c != '_').unwrap_or(rest.len());
        let name = &rest[..end].replace("ui_font_", "");
        // Extract trailing digits (e.g. "Arial80" → 80)
        if let Some(digit_start) = name.find(|c: char| c.is_ascii_digit()) {
            return name[digit_start..].parse::<i32>().ok();
        }
    }
    None
}

fn extract_image_ref(line: &str) -> Option<String> {
    if let Some(start) = line.find("&ui_img_") {
        let rest = &line[start + 1..];
        let end = rest.find(|c: char| !c.is_alphanumeric() && c != '_').unwrap_or(rest.len());
        let name = rest[..end].replace("ui_img_", "").replace("_png", "");
        return Some(name.to_string());
    }
    None
}

fn extract_event_cb(line: &str) -> Option<(String, String)> {
    // lv_obj_add_event_cb(obj, FanSetAutoMode, LV_EVENT_CLICKED, NULL);
    if !line.contains("lv_obj_add_event_cb") {
        return None;
    }
    let args = line
        .split('(')
        .nth(1)?
        .split(')')
        .next()?
        .split(',')
        .map(|s| s.trim())
        .collect::<Vec<_>>();

    if args.len() < 3 {
        return None;
    }
    let handler = args[1].to_string();
    let event = args[2].replace("LV_EVENT_", "").replace('_', "");
    Some((handler, event.to_uppercase()))
}

/// Extract hex color from `lv_color_hex(0xRRGGBB)` pattern
fn extract_hex_color(line: &str) -> Option<u32> {
    let start = line.find("lv_color_hex(0x")?;
    let hex_str = &line[start + "lv_color_hex(0x".len()..];
    let end = hex_str.find(|c: char| !c.is_ascii_hexdigit()).unwrap_or(hex_str.len());
    u32::from_str_radix(&hex_str[..end], 16).ok()
}

/// Generic parser for ANY `lv_obj_set_style_<prop>(obj, <value>, <selector>)` call.
/// Returns (prop_name, json_value, part, state) or None if not a style line.
fn parse_style_property(line: &str) -> Option<(String, Value, String, String)> {
    let prefix = "lv_obj_set_style_";
    let start = line.find(prefix)?;
    let after_prefix = &line[start + prefix.len()..];

    // Extract property name (up to the opening paren)
    let paren = after_prefix.find('(')?;
    let prop_name = after_prefix[..paren].trim().to_string();
    if prop_name.is_empty() { return None; }

    // Extract value — second argument after first comma
    let args_str = &after_prefix[paren + 1..];
    let first_comma = args_str.find(',')?;
    let value_str = args_str[first_comma + 1..]
        .split(',')
        .next()?
        .trim();

    // Parse value: hex color, integer, or LVGL constant
    let value: Value = if let Some(hex) = extract_hex_color(line) {
        json!(format!("#{:06X}", hex))
    } else if let Ok(num) = value_str.parse::<i32>() {
        json!(num)
    } else {
        // LVGL constant like LV_OPA_COVER, LV_BORDER_SIDE_NONE, etc.
        let cleaned = value_str
            .trim_start_matches("LV_OPA_")  // LV_OPA_COVER → COVER
            .trim_start_matches("LV_BORDER_SIDE_")  // LV_BORDER_SIDE_NONE → NONE
            .trim_start_matches("LV_GRAD_DIR_")
            .trim_start_matches("LV_TEXT_ALIGN_")
            .trim_start_matches("LV_TEXT_DECOR_")
            .trim_start_matches("LV_DIR_")
            .to_lowercase();
        json!(cleaned)
    };

    // Extract part and state from selector (third argument)
    let selector_str = args_str
        .split(',')
        .nth(2)
        .unwrap_or("")
        .split(')')
        .next()
        .unwrap_or("")
        .trim();

    let part = if selector_str.contains("LV_PART_INDICATOR") { "INDICATOR" }
        else if selector_str.contains("LV_PART_KNOB") { "KNOB" }
        else if selector_str.contains("LV_PART_MAIN") { "MAIN" }
        else if selector_str.contains("LV_PART_ITEMS") { "ITEMS" }
        else if selector_str.contains("LV_PART_SELECTED") { "SELECTED" }
        else if selector_str.contains("LV_PART_SCROLLBAR") { "SCROLLBAR" }
        else if selector_str.contains("LV_PART_CURSOR") { "CURSOR" }
        else if selector_str.contains("LV_PART_TEXTAREA_PLACEHOLDER") { "TEXTAREA_PLACEHOLDER" }
        else { "DEFAULT" };

    let state = if selector_str.contains("LV_STATE_CHECKED") { "CHECKED" }
        else if selector_str.contains("LV_STATE_PRESSED") { "PRESSED" }
        else if selector_str.contains("LV_STATE_FOCUSED") { "FOCUSED" }
        else if selector_str.contains("LV_STATE_DISABLED") { "DISABLED" }
        else if selector_str.contains("LV_STATE_SCROLLED") { "SCROLLED" }
        else { "DEFAULT" };

    Some((prop_name, value, part.to_string(), state.to_string()))
}

/// Parse the size hint from SquareLine's `/// <number>` comment after LV_SIZE_CONTENT.
/// e.g. `lv_obj_set_width(obj, LV_SIZE_CONTENT);   /// 1` → Some(1)
fn parse_size_comment(line: &str) -> Option<i32> {
    let comment = line.find("///")?;
    let rest = &line[comment + 3..];
    rest.trim().parse::<i32>().ok()
}

fn screen_name_from_file(path: &Path) -> String {
    path.file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .replace("ui_", "")
        .chars()
        .fold((String::new(), true), |(mut s, new_word), c| {
            if c.is_uppercase() {
                if !new_word {
                    s.push('_');
                }
                s.push(c.to_ascii_lowercase());
                (s, false)
            } else {
                s.push(c);
                (s, false)
            }
        })
        .0
}

// ── Parse a single .c file ──────────────────────────────────────────

pub fn parse_screen_file(file_path: &Path) -> Result<ParsedScreen, String> {
    let content = fs::read_to_string(file_path).map_err(|e| format!("{}: {}", file_path.display(), e))?;
    let lines: Vec<&str> = content.lines().collect();
    let screen_name = screen_name_from_file(file_path);

    let mut widgets: Vec<FirmwareWidget> = Vec::new();
    let mut fonts = Vec::new();
    let mut bitmaps = Vec::new();
    let mut screen_bg_color: Option<String> = None;
    let mut current_idx: Option<usize> = None;
    let mut skip_root_screen = false;
    let mut root_screen_id: Option<String> = None; // e.g. "HomeScreen"

    for line in &lines {
        let line = line.trim();

        // Skip root screen: lv_obj_create(NULL) — capture bg_color, don't create widget
        if line.contains("lv_obj_create(NULL)") || line.contains("lv_obj_create( NULL )") {
            skip_root_screen = true;
            // Capture root screen variable name for parent matching
            root_screen_id = extract_var_name(line)
                .map(|n| n.replace("ui_", "").replace("uic_", ""));
            continue;
        }
        // Capture bg_color on root screen lines (before any widget is created)
        if skip_root_screen && line.contains("lv_obj_set_style_bg_color") {
            if let Some(hex) = extract_hex_color(line) {
                screen_bg_color = Some(format!("#{:06X}", hex));
            }
            continue;
        }
        if skip_root_screen && (line.contains("lv_obj_remove_flag") || line.contains("lv_obj_set_style_bg_opa")) {
            continue;
        }
        skip_root_screen = false;

        // Detect widget creation (panels use lv_obj_create, not in CREATE_PATTERNS)
        let detected = detect_sub_type(line);
        let is_panel = !detected.is_some() && line.contains("lv_obj_create")
            && !line.contains("lv_obj_create(NULL)") && !line.contains("lv_obj_create( NULL )");
        if detected.is_some() || is_panel {
            let sub_type = detected.unwrap_or("panel");
            let id = extract_var_name(line)
                .map(|n| n.replace("ui_", "").replace("uic_", ""))
                .unwrap_or_else(|| format!("w_{}", widgets.len()));

            let parent = extract_parent_name(line);

            widgets.push(FirmwareWidget {
                id,
                sub_type: sub_type.to_string(),
                parent,
                x_pos: 0,
                y_pos: 0,
                width: 0,
                height: 0,
                obj_text: String::new(),
                text_type: "literal".to_string(),
                style: None,
                events: None,
                extra: HashMap::new(),
            });
            current_idx = Some(widgets.len() - 1);
            continue;
        }

        let idx = match current_idx {
            Some(i) => i,
            None => continue,
        };
        let w = &mut widgets[idx];

        // Position: lv_obj_set_pos(obj, x, y) or lv_obj_set_x / lv_obj_set_y
        if line.contains("lv_obj_set_pos") {
            let ints = extract_ints(line, "lv_obj_set_pos");
            if ints.len() >= 2 {
                w.x_pos = ints[ints.len() - 2];
                w.y_pos = ints[ints.len() - 1];
            }
        }
        if line.contains("lv_obj_set_x(") {
            let ints = extract_ints(line, "lv_obj_set_x");
            if let Some(&v) = ints.last() { w.x_pos = v; }
        }
        if line.contains("lv_obj_set_y(") {
            let ints = extract_ints(line, "lv_obj_set_y");
            if let Some(&v) = ints.last() { w.y_pos = v; }
        }

        // Size: lv_obj_set_size(obj, w, h) or lv_obj_set_width/height
        if line.contains("lv_obj_set_size") {
            let ints = extract_ints(line, "lv_obj_set_size");
            if ints.len() >= 2 {
                w.width = ints[ints.len() - 2];
                w.height = ints[ints.len() - 1];
            }
        }
        if line.contains("lv_obj_set_width") {
            let ints = extract_ints(line, "lv_obj_set_width");
            if let Some(&v) = ints.last() { w.width = v; }
            // LV_SIZE_CONTENT → output 0 so frontend can use "content" unit
            else if line.contains("LV_SIZE_CONTENT") { w.width = 0; }
        }
        if line.contains("lv_obj_set_height") {
            let ints = extract_ints(line, "lv_obj_set_height");
            if let Some(&v) = ints.last() { w.height = v; }
            else if line.contains("LV_SIZE_CONTENT") { w.height = 0; }
        }

        // Alignment: lv_obj_set_align(obj, LV_ALIGN_CENTER) → store as extra
        // x/y are OFFSETS from the aligned position, so DON'T overwrite them
        if line.contains("lv_obj_set_align") {
            if line.contains("LV_ALIGN_CENTER") {
                w.extra.insert("align".into(), serde_json::json!("center"));
            } else if line.contains("LV_ALIGN_TOP_LEFT") {
                w.extra.insert("align".into(), serde_json::json!("top_left"));
            } else if line.contains("LV_ALIGN_TOP_MID") {
                w.extra.insert("align".into(), serde_json::json!("top_mid"));
            } else if line.contains("LV_ALIGN_TOP_RIGHT") {
                w.extra.insert("align".into(), serde_json::json!("top_right"));
            } else if line.contains("LV_ALIGN_BOTTOM_LEFT") {
                w.extra.insert("align".into(), serde_json::json!("bottom_left"));
            } else if line.contains("LV_ALIGN_BOTTOM_MID") {
                w.extra.insert("align".into(), serde_json::json!("bottom_mid"));
            } else if line.contains("LV_ALIGN_BOTTOM_RIGHT") {
                w.extra.insert("align".into(), serde_json::json!("bottom_right"));
            } else if line.contains("LV_ALIGN_LEFT_MID") {
                w.extra.insert("align".into(), serde_json::json!("left_mid"));
            } else if line.contains("LV_ALIGN_RIGHT_MID") {
                w.extra.insert("align".into(), serde_json::json!("right_mid"));
            }
        }

        // ── Detect lv_obj_remove_style_all → transparent panel ──
        if line.contains("lv_obj_remove_style_all") {
            w.extra.insert("no_default_style".into(), serde_json::json!(true));
        }

        // ── Detect lv_obj_add_flag(obj, LV_OBJ_FLAG_HIDDEN) → hidden widget ──
        if line.contains("lv_obj_add_flag") && line.contains("LV_OBJ_FLAG_HIDDEN") {
            w.extra.insert("hidden".into(), serde_json::json!(true));
        }

        // ── Style extraction (generic: handles ALL lv_obj_set_style_* calls) ──
        // Output structure: { PART: { STATE: { prop: value } } }
        // e.g. { "MAIN": { "DEFAULT": { "arc_color": "#62B7FF" } }, "KNOB": { "DEFAULT": { "bg_color": "#C6DFD9" } } }
        if line.contains("lv_obj_set_style_") && !line.contains("lv_obj_set_style_text_font") {
            if let Some((prop_name, value, part, state)) = parse_style_property(line) {
                let style = w.style.get_or_insert(serde_json::json!({}));
                let part_obj = if let Some(existing) = style.get_mut(&part) {
                    existing
                } else {
                    style[&part] = serde_json::json!({});
                    style.get_mut(&part).unwrap()
                };
                if let Some(existing) = part_obj.get_mut(&state) {
                    existing[&prop_name] = value;
                } else {
                    part_obj[&state] = serde_json::json!({&prop_name: value});
                }
            }
        }

        // Label text: lv_label_set_text(obj, "text"), also lv_textarea_set_text
        if w.sub_type == "label" || w.sub_type == "button" || w.sub_type == "textarea" {
            if line.contains("lv_label_set_text") {
                if let Some(text) = extract_string(line, "lv_label_set_text", '"') {
                    if !text.is_empty() {
                        w.obj_text = text;
                    }
                }
            }
            if line.contains("lv_textarea_set_text") {
                if let Some(text) = extract_string(line, "lv_textarea_set_text", '"') {
                    if !text.is_empty() {
                        w.obj_text = text;
                    }
                }
            }
        }

        // Arc/Bar/Slider range: lv_arc_set_range / lv_bar_set_range
        if line.contains("lv_arc_set_range") || line.contains("lv_bar_set_range") || line.contains("lv_slider_set_range") {
            let ints = if line.contains("lv_arc_set_range") {
                extract_ints(line, "lv_arc_set_range")
            } else if line.contains("lv_bar_set_range") {
                extract_ints(line, "lv_bar_set_range")
            } else {
                extract_ints(line, "lv_slider_set_range")
            };
            if ints.len() >= 2 {
                w.extra.insert("min".into(), json!(ints[ints.len() - 2]));
                w.extra.insert("max".into(), json!(ints[ints.len() - 1]));
            }
        }

        // Arc background angles: lv_arc_set_bg_angles(obj, start, end)
        if line.contains("lv_arc_set_bg_angles") {
            let ints = extract_ints(line, "lv_arc_set_bg_angles");
            if ints.len() >= 2 {
                w.extra.insert("bg_start_angle".into(), json!(ints[ints.len() - 2]));
                w.extra.insert("bg_end_angle".into(), json!(ints[ints.len() - 1]));
            }
        }

        // Arc rotation: lv_arc_set_rotation(obj, degrees)
        if line.contains("lv_arc_set_rotation") {
            let ints = extract_ints(line, "lv_arc_set_rotation");
            if let Some(&v) = ints.last() {
                w.extra.insert("rotation".into(), json!(v));
            }
        }

        // Switch/Slider value: lv_arc_set_value / lv_bar_set_value
        if line.contains("lv_arc_set_value") || line.contains("lv_bar_set_value") || line.contains("lv_slider_set_value") {
            let ints = extract_ints(line, &line[..line.find('(').unwrap_or(0)].trim().to_string());
            if let Some(&v) = ints.last() {
                w.extra.insert("value".into(), json!(v));
            }
        }

        // Style: font (placed in correct PART→STATE hierarchy like other styles)
        if let Some(font_name) = extract_font_ref(line) {
            // Use parse_style_property to get the correct PART and STATE
            let (part, state) = if let Some((_prop, _val, p, s)) = parse_style_property(line) {
                (p, s)
            } else {
                ("MAIN".to_string(), "DEFAULT".to_string())
            };
            let style = w.style.get_or_insert(json!({}));
            let part_obj = if let Some(existing) = style.get_mut(&part) {
                existing
            } else {
                style[&part] = serde_json::json!({});
                style.get_mut(&part).unwrap()
            };
            if let Some(def) = part_obj.get_mut(&state) {
                def["text_font"] = json!(font_name);
            } else {
                part_obj[&state] = serde_json::json!({ "text_font": font_name });
            }
            let font_size = extract_font_size(line).unwrap_or(0);
            if !fonts.iter().any(|(n, _)| n == &font_name) {
                fonts.push((font_name, font_size));
            }
        }

        // Style: background image
        if let Some(img_name) = extract_image_ref(line) {
            if line.contains("bg_img") || line.contains("background") {
                let (part, state) = if let Some((_prop, _val, p, s)) = parse_style_property(line) {
                    (p, s)
                } else {
                    ("MAIN".to_string(), "DEFAULT".to_string())
                };
                let style = w.style.get_or_insert(json!({}));
                let part_obj = if let Some(existing) = style.get_mut(&part) {
                    existing
                } else {
                    style[&part] = serde_json::json!({});
                    style.get_mut(&part).unwrap()
                };
                if let Some(def) = part_obj.get_mut(&state) {
                    def["bg_img_src"] = json!(img_name);
                } else {
                    part_obj[&state] = serde_json::json!({ "bg_img_src": img_name });
                }
            }
            if !bitmaps.contains(&img_name) {
                bitmaps.push(img_name);
            }
        }

        // Image source (for image widgets)
        if w.sub_type == "image" {
            if let Some(src) = extract_image_ref(line) {
                w.extra.insert("src".into(), json!(src));
                if !bitmaps.contains(&src) {
                    bitmaps.push(src);
                }
            }
        }

        // Imagebutton source: lv_imagebutton_set_src(obj, STATE, NULL, &img, NULL)
        if w.sub_type == "imagebutton" && line.contains("lv_imagebutton_set_src") {
            if let Some(src) = extract_image_ref(line) {
                let state = if line.contains("LV_IMAGEBUTTON_STATE_RELEASED") { "released" }
                    else if line.contains("LV_IMAGEBUTTON_STATE_PRESSED") { "pressed" }
                    else if line.contains("LV_IMAGEBUTTON_STATE_DISABLED") { "disabled" }
                    else if line.contains("LV_IMAGEBUTTON_STATE_CHECKED_RELEASED") { "checked_released" }
                    else if line.contains("LV_IMAGEBUTTON_STATE_CHECKED_PRESSED") { "checked_pressed" }
                    else if line.contains("LV_IMAGEBUTTON_STATE_CHECKED_DISABLED") { "checked_disabled" }
                    else { "released" };
                w.extra.insert(format!("img_{}", state).into(), json!(src));
                if !bitmaps.contains(&src) {
                    bitmaps.push(src);
                }
            }
        }

        // Event handler
        if let Some((handler, event)) = extract_event_cb(line) {
            let events = w.events.get_or_insert(json!({}));
            events[&event] = json!({
                "actions": [{
                    "action": handler.replace("Event_Cb_", ""),
                    "note": format!("SquareLine callback: {}", handler)
                }]
            });
        }

        // Dropdown options: lv_dropdown_set_options(obj, "a\nb\nc")
        // Also handles split-line case: function on one line, string on next
        if w.sub_type == "dropdown" {
            if line.contains("lv_dropdown_set_options") {
                if let Some(opts) = extract_string(line, "lv_dropdown_set_options", '"') {
                    let items: Vec<Value> = opts.split("\\n").map(|s| json!(s)).collect();
                    w.extra.insert("options".into(), json!(items));
                } else {
                    // Function call and string are on separate lines:
                    //   lv_dropdown_set_options(obj,
                    //       "options\nhere");
                    // Mark this widget for options extraction on next line
                    w.extra.insert("_pending_dropdown_opts".into(), json!(true));
                }
            }
            // Continuation line for split dropdown options: starts with quote
            if w.extra.get("_pending_dropdown_opts").and_then(|v| v.as_bool()).unwrap_or(false)
                && line.starts_with('"')
            {
                // Extract string between first and last quote on this line
                if let Some(end_quote) = line.rfind('"') {
                    if end_quote > 0 {
                        let opts = &line[1..end_quote];
                        let items: Vec<Value> = opts.split("\\n").map(|s| json!(s)).collect();
                        w.extra.insert("options".into(), json!(items));
                    }
                }
                w.extra.remove("_pending_dropdown_opts");
            }
        }

        // Roller options: lv_roller_set_options(obj, "a\nb\nc")
        // Same split-line handling as dropdown
        if w.sub_type == "roller" {
            if line.contains("lv_roller_set_options") {
                if let Some(opts) = extract_string(line, "lv_roller_set_options", '"') {
                    let items: Vec<Value> = opts.split("\\n").map(|s| json!(s)).collect();
                    w.extra.insert("options".into(), json!(items));
                } else {
                    w.extra.insert("_pending_roller_opts".into(), json!(true));
                }
            }
            if w.extra.get("_pending_roller_opts").and_then(|v| v.as_bool()).unwrap_or(false)
                && line.starts_with('"')
            {
                if let Some(end_quote) = line.rfind('"') {
                    if end_quote > 0 {
                        let opts = &line[1..end_quote];
                        let items: Vec<Value> = opts.split("\\n").map(|s| json!(s)).collect();
                        w.extra.insert("options".into(), json!(items));
                    }
                }
                w.extra.remove("_pending_roller_opts");
            }
        }

        // Textarea placeholder: lv_textarea_set_placeholder_text(obj, "...")
        if w.sub_type == "textarea" {
            if line.contains("lv_textarea_set_placeholder_text") {
                if let Some(ph) = extract_string(line, "lv_textarea_set_placeholder_text", '"') {
                    w.extra.insert("placeholder".into(), json!(ph));
                }
            }
            // One-line mode
            if line.contains("lv_textarea_set_one_line") && line.contains("true") {
                w.extra.insert("one_line".into(), json!(true));
            }
        }

        // Roller: lv_roller_set_selected / lv_dropdown_set_selected
        if (w.sub_type == "roller" || w.sub_type == "dropdown")
            && line.contains("_set_selected")
        {
            if let Some(start) = line.find("_set_selected(") {
                let after = &line[start + "_set_selected(".len()..];
                if let Some(end) = after.find(')') {
                    if let Ok(v) = after[..end].trim().parse::<i32>() {
                        w.extra.insert("selected".into(), json!(v));
                    }
                }
            }
        }

        // Label long mode: lv_label_set_long_mode(obj, LV_LABEL_LONG_WRAP)
        if w.sub_type == "label" && line.contains("lv_label_set_long_mode") {
            let mode = if line.contains("LV_LABEL_LONG_WRAP") { "WRAP" }
                else if line.contains("LV_LABEL_LONG_DOT") { "DOT" }
                else if line.contains("LV_LABEL_LONG_SCROLL") { "SCROLL" }
                else if line.contains("LV_LABEL_LONG_SCROLL_CIRCULAR") { "SCROLL_CIRCULAR" }
                else if line.contains("LV_LABEL_LONG_CLIP") { "CLIP" }
                else { "WRAP" };
            w.extra.insert("long_mode".into(), json!(mode));
        }

        // Image rotation: lv_image_set_rotation(obj, angle)
        if w.sub_type == "image" && line.contains("lv_image_set_rotation") {
            let ints = extract_ints(line, "lv_image_set_rotation");
            if let Some(&v) = ints.last() {
                w.extra.insert("rotation".into(), json!(v));
            }
        }
    }

    // Build parent→children index for widget tree
    let mut children_map: HashMap<String, Vec<String>> = HashMap::new();
    for w in &widgets {
        if let Some(ref parent) = w.parent {
            children_map.entry(parent.clone()).or_default().push(w.id.clone());
        }
    }

    let widgets_map: serde_json::Map<String, Value> = widgets.iter()
        .filter(|w| w.parent.is_none() || w.parent.as_deref() == root_screen_id.as_deref())
        .map(|w| {
            let mut obj = json!({
                "type": "Widget", "sub_type": w.sub_type,
                "x_pos": w.x_pos, "y_pos": w.y_pos,
                "width": w.width, "height": w.height,
                "obj_text": w.obj_text, "text_type": w.text_type,
            });
            if let Some(ref s) = w.style { obj.as_object_mut().unwrap().insert("style".into(), s.clone()); }
            if let Some(ref e) = w.events { obj.as_object_mut().unwrap().insert("events".into(), e.clone()); }
            for (k, v) in &w.extra { obj.as_object_mut().unwrap().insert(k.clone(), v.clone()); }
            // Include nested children
            if let Some(child_ids) = children_map.get(&w.id) {
                let children: serde_json::Map<String, Value> = child_ids.iter()
                    .filter_map(|cid| widgets.iter().find(|cw| cw.id == *cid))
                    .map(|cw| {
                        let mut child_obj = json!({
                            "type": "Widget", "sub_type": cw.sub_type,
                            "x_pos": cw.x_pos, "y_pos": cw.y_pos,
                            "width": cw.width, "height": cw.height,
                            "obj_text": cw.obj_text, "text_type": cw.text_type,
                        });
                        if let Some(ref s) = cw.style { child_obj.as_object_mut().unwrap().insert("style".into(), s.clone()); }
                        if let Some(ref e) = cw.events { child_obj.as_object_mut().unwrap().insert("events".into(), e.clone()); }
                        for (k, v) in &cw.extra { child_obj.as_object_mut().unwrap().insert(k.clone(), v.clone()); }
                        // Recursively include grandchildren
                        if let Some(grandchild_ids) = children_map.get(&cw.id) {
                            let grandchildren: serde_json::Map<String, Value> = grandchild_ids.iter()
                                .filter_map(|gid| widgets.iter().find(|gw| gw.id == *gid))
                                .map(|gw| {
                                    let mut gobj = json!({
                                        "type": "Widget", "sub_type": gw.sub_type,
                                        "x_pos": gw.x_pos, "y_pos": gw.y_pos,
                                        "width": gw.width, "height": gw.height,
                                        "obj_text": gw.obj_text, "text_type": gw.text_type,
                                    });
                                    if let Some(ref s) = gw.style { gobj.as_object_mut().unwrap().insert("style".into(), s.clone()); }
                                    if let Some(ref e) = gw.events { gobj.as_object_mut().unwrap().insert("events".into(), e.clone()); }
                                    for (k, v) in &gw.extra { gobj.as_object_mut().unwrap().insert(k.clone(), v.clone()); }
                                    (gw.id.clone(), gobj)
                                }).collect();
                            if !grandchildren.is_empty() {
                                child_obj.as_object_mut().unwrap().insert("children".into(), json!(grandchildren));
                            }
                        }
                        (cw.id.clone(), child_obj)
                    }).collect();
                if !children.is_empty() {
                    obj.as_object_mut().unwrap().insert("children".into(), json!(children));
                }
            }
            (w.id.clone(), obj)
        }).collect();

    Ok(ParsedScreen {
        name: screen_name,
        widgets,
        fonts: fonts.into_iter().collect(),
        bitmaps,
        widgets_map,
        bg_color: screen_bg_color,
    })
}

// ── Parse all screens in a directory ─────────────────────────────────

pub fn parse_screens(dir: &Path) -> Result<Vec<ParsedScreen>, String> {
    let mut screens = Vec::new();

    let entries = fs::read_dir(dir).map_err(|e| format!("{}: {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("{}: {}", dir.display(), e))?;
        let path = entry.path();
        let name = path.file_name().unwrap_or_default().to_string_lossy();

        if !name.starts_with("ui_") || !name.ends_with(".c") { continue; }
        if name.starts_with("ui_img_") || name.starts_with("ui_font_") { continue; }
        if name == "ui.c" || name == "ui_events.c" || name == "ui_helpers.c" || name == "ui_comp_hook.c" { continue; }

        let screen = parse_screen_file(&path)?;
        info!("  {} → {}: {} widgets", name, screen.name, screen.widgets.len());
        screens.push(screen);
    }

    Ok(screens)
}
