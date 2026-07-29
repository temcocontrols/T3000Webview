use std::path::Path;
fn main() {
    let dir = r"..\..\T3-programmable-controller-on-ESP32\main\TemcoScreen";
    let out_dir = r"..\extracted-imgs";
    std::fs::create_dir_all(out_dir).unwrap();
    let mut ok = 0;
    let mut err = 0;
    for entry in std::fs::read_dir(dir).unwrap() {
        let path = entry.unwrap().path();
        let name = path.file_name().unwrap().to_string_lossy();
        if !name.starts_with("ui_img_") || !name.ends_with(".c") { continue; }
        match t3_webview_api::eez_studio::lvgl_img_extract::extract_image(&path) {
            Ok(img) => {
                let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &img.png_base64).unwrap();
                let out = Path::new(out_dir).join(format!("{}.png", img.name));
                std::fs::write(&out, &bytes).unwrap();
                println!("  OK  {} ({}x{}) -> {}", img.name, img.width, img.height, out.display());
                ok += 1;
            }
            Err(e) => {
                println!("  ERR {}: {}", name, e);
                err += 1;
            }
        }
    }
    println!("Done: {} OK, {} errors", ok, err);
}
