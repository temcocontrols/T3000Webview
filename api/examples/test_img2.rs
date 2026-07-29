use std::path::Path;
fn main() {
    let path = Path::new(r"..\..\T3-programmable-controller-on-ESP32\main\TemcoScreen\ui_img_fan_small_png.c");
    let content = std::fs::read_to_string(&path).unwrap();
    // Debug: check what extract_descriptor_int returns
    let w = t3_webview_api::eez_studio::lvgl_img_extract::extract_descriptor_int(&content, ".header.w");
    let h = t3_webview_api::eez_studio::lvgl_img_extract::extract_descriptor_int(&content, ".header.h");
    println!("width={:?}, height={:?}", w, h);
    match t3_webview_api::eez_studio::lvgl_img_extract::extract_image(&path) {
        Ok(img) => println!("OK: {} {}x{} | {} chars", img.name, img.width, img.height, img.png_base64.len()),
        Err(e) => println!("ERROR: {}", e),
    }
}
