use std::path::Path;
fn main() {
    let path = Path::new(r"..\..\T3-programmable-controller-on-ESP32\main\TemcoScreen\ui_img_fan_small_png.c");
    match t3_webview_api::eez_studio::lvgl_img_extract::extract_image(&path) {
        Ok(img) => {
            println!("OK: {} {}x{} | base64: {} chars", img.name, img.width, img.height, img.png_base64.len());
            let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &img.png_base64).unwrap();
            std::fs::write(r"..\fan_small_extracted.png", &bytes).unwrap();
            println!("Saved fan_small_extracted.png ({} bytes)", bytes.len());
        }
        Err(e) => println!("ERROR: {}", e),
    }
}
