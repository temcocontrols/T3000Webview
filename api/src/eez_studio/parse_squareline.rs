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
}

// ── Widget type detection from LVGL create calls ─────────────────────

const CREATE_PATTERNS: &[(&str, &str)] = &[
    ("lv_label_create", "label"),
    ("lv_btn_create", "button"),
    ("lv_arc_create", "arc"),
    ("lv_bar_create", "bar"),
    ("lv_img_create", "image"),
    ("lv_image_create", "image"),
    ("lv_switch_create", "switch"),
    ("lv_slider_create", "slider"),
    ("lv_dropdown_create", "dropdown"),
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
    if line.contains("lv_obj_set_style_text_font") || line.contains("lv_obj_set_style_text_font") {
        if let Some(start) = line.find("&ui_font_") {
            let rest = &line[start + 1..]; // skip &
            let end = rest.find(|c: char| !c.is_alphanumeric() && c != '_').unwrap_or(rest.len());
            let name = &rest[..end].replace("ui_font_", "");
            return Some(name.to_string());
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
    let mut current_idx: Option<usize> = None;

    for line in &lines {
        let line = line.trim();

        // Detect widget creation
        if let Some(sub_type) = detect_sub_type(line) {
            let id = extract_var_name(line)
                .map(|n| n.replace("ui_", "").replace("uic_", ""))
                .unwrap_or_else(|| format!("w_{}", widgets.len()));

            // Skip if this line is inside a function call argument (not an assignment)
            if !line.contains('=') && sub_type == "button" {
                continue; // lv_btn_create used as arg, skip
            }

            let is_panel = line.contains("lv_obj_create") && !CREATE_PATTERNS.iter().any(|(f, _)| line.contains(f) && *f != "lv_obj_create");

            widgets.push(FirmwareWidget {
                id,
                sub_type: if is_panel { "panel".to_string() } else { sub_type.to_string() },
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

        // Position: lv_obj_set_pos(obj, x, y)
        if line.contains("lv_obj_set_pos") {
            let ints = extract_ints(line, "lv_obj_set_pos");
            if ints.len() >= 2 {
                w.x_pos = ints[ints.len() - 2];
                w.y_pos = ints[ints.len() - 1];
            }
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
        }

        // Label text: lv_label_set_text(obj, "text")
        if w.sub_type == "label" || w.sub_type == "button" {
            if line.contains("lv_label_set_text") {
                if let Some(text) = extract_string(line, "lv_label_set_text", '"') {
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

        // Switch/Slider value: lv_arc_set_value / lv_bar_set_value
        if line.contains("lv_arc_set_value") || line.contains("lv_bar_set_value") || line.contains("lv_slider_set_value") {
            let ints = extract_ints(line, &line[..line.find('(').unwrap_or(0)].trim().to_string());
            if let Some(&v) = ints.last() {
                w.extra.insert("value".into(), json!(v));
            }
        }

        // Style: font
        if let Some(font_name) = extract_font_ref(line) {
            let style = w.style.get_or_insert(json!({}));
            if let Some(def) = style.get_mut("DEFAULT") {
                def["text_font"] = json!(font_name);
            } else {
                *style = json!({ "DEFAULT": { "text_font": font_name } });
            }
            if !fonts.iter().any(|(n, _)| n == &font_name) {
                fonts.push((font_name, 0));
            }
        }

        // Style: background image
        if let Some(img_name) = extract_image_ref(line) {
            if line.contains("bg_img") || line.contains("background") {
                let style = w.style.get_or_insert(json!({}));
                if let Some(def) = style.get_mut("DEFAULT") {
                    def["bg_img_src"] = json!(img_name);
                } else {
                    *style = json!({ "DEFAULT": { "bg_img_src": img_name } });
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
        if w.sub_type == "dropdown" {
            if line.contains("lv_dropdown_set_options") {
                if let Some(opts) = extract_string(line, "lv_dropdown_set_options", '"') {
                    let items: Vec<Value> = opts.split("\\n").map(|s| json!(s)).collect();
                    w.extra.insert("options".into(), json!(items));
                }
            }
        }
    }

    Ok(ParsedScreen {
        name: screen_name,
        widgets,
        fonts: fonts.into_iter().collect(),
        bitmaps,
    })
}

// ── Parse all screens in a directory ─────────────────────────────────

pub fn parse_screens(dir: &Path) -> Result<Value, String> {
    let mut screens = Vec::new();
    let mut all_fonts: Vec<(String, i32)> = Vec::new();
    let mut all_bitmaps: Vec<String> = Vec::new();
    let mut seen_fonts = HashSet::new();
    let mut seen_bitmaps = HashSet::new();

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

        for (name, size) in &screen.fonts {
            if seen_fonts.insert(name.clone()) {
                all_fonts.push((name.clone(), *size));
            }
        }
        for name in &screen.bitmaps {
            if seen_bitmaps.insert(name.clone()) {
                all_bitmaps.push(name.clone());
            }
        }

        screens.push(screen);
    }

    let screen_entries: Vec<Value> = screens
        .iter()
        .map(|s| {
            let widgets_map: HashMap<String, Value> = s
                .widgets
                .iter()
                .map(|w| {
                    let mut obj = json!({
                        "type": "Widget",
                        "sub_type": w.sub_type,
                        "x_pos": w.x_pos,
                        "y_pos": w.y_pos,
                        "width": w.width,
                        "height": w.height,
                        "obj_text": w.obj_text,
                        "text_type": w.text_type,
                    });
                    if let Some(ref style) = w.style {
                        obj["style"] = style.clone();
                    }
                    if let Some(ref events) = w.events {
                        obj["events"] = events.clone();
                    }
                    for (k, v) in &w.extra {
                        obj[k] = v.clone();
                    }
                    (w.id.clone(), obj)
                })
                .collect();

            json!({
                "name": s.name,
                "json": {
                    "fonts": s.fonts.iter().map(|(n, sz)| json!({"name": n, "size": sz})).collect::<Vec<_>>(),
                    "bitmaps": s.bitmaps,
                    "widgets": widgets_map,
                }
            })
        })
        .collect();

    Ok(json!({
        "screens": screen_entries,
        "fonts": all_fonts.iter().map(|(n, sz)| json!({"name": n, "size": sz})).collect::<Vec<_>>(),
        "bitmaps": all_bitmaps,
    }))
}
