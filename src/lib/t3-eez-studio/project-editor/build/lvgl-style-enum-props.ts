/**
 * lvgl-style-enum-props.ts — LVGL style properties whose value is an ENUM token.
 *
 * The two representations differ in case:
 *   - device-native JSON (and what the ESP32 firmware consumes/produces) stores
 *     them LOWERCASE, e.g. text_align "center", bg_grad_dir "ver", border_side
 *     "full"/"bottom"/"none".
 *   - the EEZ project model stores them UPPERCASE (the enum item name), e.g.
 *     "CENTER", "VER", "FULL"/"BOTTOM"/"NONE" (see style-catalog.tsx
 *     makeEnumPropertyInfo — enumItems are the short uppercase tokens).
 *
 * Import ("Load from device") uppercases these so the editor preview / property
 * grid / code-gen apply them; export ("Deploy to Device") lowercases them back so
 * the device payload keeps the exact device-native form.
 */
export const STYLE_ENUM_PROPS: ReadonlySet<string> = new Set([
    "layout",
    "flex_flow",
    "flex_main_place",
    "flex_cross_place",
    "flex_track_place",
    "grid_column_align",
    "grid_row_align",
    "grid_cell_x_align",
    "grid_cell_y_align",
    "bg_grad_dir",
    "bg_dither_mode",
    "border_side",
    "text_decor",
    "text_align",
    "blend_mode",
    "base_dir",
]);
