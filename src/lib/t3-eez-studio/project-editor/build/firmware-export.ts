/**
 * firmware-export.ts — Transforms .eez-project → device JSON format.
 *
 * Output is the DEVICE-NATIVE nested schema (see the ESP32 firmware
 * `components/temco_dynamic_display/DefaultScreens/*.json`): each screen is a
 * single root widget `<ScreenName>` (`sub_type:"screen"`) with all widgets
 * nested under its `children`, plus top-level `bg_color` and per-screen
 * `fonts`/`bitmaps`. This is the exact inverse of firmware-loader.ts.
 *
 * Editor-only artifacts (generated parameter grid, range popups, flow/action
 * components) are stripped — the device builds those itself.
 *
 * Each output file goes to `<projectDir>/device-export/<screen_name>.json`.
 */

// ── Widget type mapping (LVGL prefix → firmware sub_type) ──
// Must cover every LVGL widget type the loader (firmware-loader.ts SUB_TYPE_MAP)
// can produce, so a round-trip import → deploy restores the full screen
// (image buttons, text areas, rollers, keyboards, ... are NOT dropped).
const TYPE_MAP: Record<string, string> = {
    LVGLLabelWidget: "label",
    LVGLButtonWidget: "button",
    LVGLImgbuttonWidget: "imagebutton",
    LVGLArcWidget: "arc",
    LVGLBarWidget: "bar",
    LVGLImageWidget: "image",
    LVGLSwitchWidget: "switch",
    LVGLSliderWidget: "slider",
    LVGLDropdownWidget: "dropdown",
    LVGLTextareaWidget: "textarea",
    LVGLRollerWidget: "roller",
    LVGLPanelWidget: "panel",
    LVGLCalendarWidget: "calendar",
    LVGLCheckboxWidget: "checkbox",
    LVGLKeyboardWidget: "keyboard",
    LVGLUserWidgetWidget: "user_widget",
};

// ── Component types that are flow/action logic, not UI widgets ──
const SKIP_TYPES = new Set([
    "SetVariableActionComponent",
    "WatchVariableActionComponent",
    "OutputActionComponent",
    "DelayActionComponent",
    "AnimateActionComponent",
    "IsTrueActionComponent",
]);

// ── Extract image source from widget ──
function extractImageSrc(c: any): string | undefined {
    // Direct image field (some widget types)
    if (c.image && typeof c.image === "string" && c.image.length > 0) {
        return c.image;
    }
    // From localStyles definition
    const ls = c.localStyles;
    if (ls?.definition) {
        for (const part of Object.values(ls.definition) as any[]) {
            for (const state of Object.values(part || {}) as any[]) {
                if (state && typeof state === "object") {
                    if (state.bg_img_src) return state.bg_img_src;
                    if (state.src) return state.src;
                }
            }
        }
    }
    return undefined;
}

/**
 * Restore the original device widget name by removing the import-uniquify
 * suffix (`_2`, `_3`, ...) that firmware-loader adds to keep LVGL widget
 * identifiers unique in EEZ's project-wide namespace. The device stores
 * widget names per-screen, so the original name is used when deploying back.
 */
function restoreDeviceWidgetName(name: string): string {
    return name.replace(/_\d+$/, "");
}

// ── Recursively transform one component tree ──
// `registerObj` lets the caller capture each EEZ objID → exported device widget
// name so page connectionLines (widget events → actions) still resolve after
// widgets are promoted out of an LVGLScreenWidget wrapper.
function transformComponent(
    c: any,
    registerObj?: (objID: string, ident: string) => void
): Record<string, any> | null {
    const t: string = c.type || "";
    // UI-only parameter-grid range popups (editor preview) — never deployed.
    // These are the hidden "Select digital range .." panels plus their
    // objSetFlagHidden flow components; the device has its own range dialog.
    if (c.paramGridPopup === true) return null;
    if (SKIP_TYPES.has(t)) return null;

    // Unwrap screen widget — promote children directly
    if (t === "LVGLScreenWidget") {
        const result: Record<string, any> = {};
        for (const child of c.children || []) {
            const r = transformComponent(child, registerObj);
            if (r) Object.assign(result, r);
        }
        return result;
    }

    const mapped = TYPE_MAP[t];

    // ── Action component (flow logic — changeScreen, setVariable, etc.) ──
    if (t === "LVGLActionComponent" && c.actions?.length) {
        const ident = c.objID?.slice(0, 8) || ("act_" + Math.random().toString(36).slice(2, 8));
        if (registerObj && c.objID) registerObj(c.objID, ident);
        return { [ident]: {
            type: "Widget",
            sub_type: "action",
            x_pos: c.left ?? 0,
            y_pos: c.top ?? 0,
            width: 0,
            height: 0,
            obj_text: "",
            text_type: "literal",
            actions: c.actions.map((a: any) => ({
                action: a.action || "?",
                ...(a.screen ? { screen: a.screen } : {}),
                ...(a.variableName ? { variable: a.variableName } : {}),
                ...(a.value ? { value: a.value } : {}),
            })),
        }};
    }

    if (!mapped) return null;

    // ── UI-only parameter-grid Range dropdowns ──
    // These are editor-interactive dropdowns (click to pick a range) but must
    // NOT reach the device: the firmware has its own native range dialog.
    // Strip them back to a plain label showing the currently-selected option.
    if (t === "LVGLDropdownWidget" && c.paramGrid === true) {
        const ident = restoreDeviceWidgetName(
            c.identifier ||
                (c.name ? c.name.replace(/\s+/g, "_") : "") ||
                ("w_" + (c.objID || "").slice(0, 8))
        );
        // options is a newline-joined string in the EEZ project
        // (array:string literal). Split to pick the selected label.
        const options: string[] = typeof c.options === "string"
            ? c.options.split("\n")
            : Array.isArray(c.options)
              ? c.options.map((o: any) => (typeof o === "string" ? o : o.label || o.text || "?"))
              : [];
        const selIdx = typeof c.selected === "number" ? c.selected : 0;
        const label = options[selIdx] ?? "";
        const obj: Record<string, any> = {
            type: "Widget",
            sub_type: "label",
            x_pos: c.left ?? 0,
            y_pos: c.top ?? 0,
            width: c.width ?? 0,
            height: c.height ?? 0,
            obj_text: label,
            text_type: "literal",
        };
        const ls = c.localStyles;
        if (ls?.definition) obj.style = ls.definition;
        return { [ident]: obj };
    }

    // Widget name = identifier, falling back to objID prefix. Strip the
    // import-uniquify suffix so the device gets its original widget name back.
    const ident: string = restoreDeviceWidgetName(
        c.identifier ||
            (c.name ? c.name.replace(/\s+/g, "_") : "") ||
            ("w_" + (c.objID || "").slice(0, 8))
    );

    // ═══ 8 base fields (EVERY widget has these) ═══
    const obj: Record<string, any> = {
        type: "Widget",
        sub_type: mapped,
        x_pos: c.left ?? 0,
        y_pos: c.top ?? 0,
        width: c.width ?? 0,
        height: c.height ?? 0,
        obj_text: "",
        text_type: "literal",
    };

    // ── Style (optional, any widget) ──
    const ls = c.localStyles;
    if (ls?.definition) obj.style = ls.definition;

    // ── Events (optional, any widget) ──
    // Parameter-grid cells are UI-only: the editor wires CLICKED handlers onto
    // the clickable Range cells to open their popup, but that must NOT reach
    // the device — the firmware handles the range edit itself. Drop events for
    // every paramGrid cell so they export as plain static labels.
    const events = c.paramGrid === true ? undefined : c.eventHandlers;
    if (events?.length) {
        obj.events = {};
        for (const e of events) {
            const evtName = e.eventName || e.trigger || "?";
            obj.events[evtName] = {
                action: e.handlerType || "?",
                user_data: e.userData ?? 0,
            };
        }
    }

    // ═══ Type-specific properties ═══
    switch (mapped) {
        case "label":
            if (c.text != null && c.text !== "") {
                obj.obj_text = c.text;
                obj.text_type = c.textType || "literal";
            }
            if (c.longMode) obj.long_mode = c.longMode;
            if (c.recolor) obj.recolor = true;
            break;

        case "button":
            // innerAlign for button labels
            if (c.innerAlign) obj.inner_align = c.innerAlign;
            // checked state (toggle button)
            if (c.checkedStateType === "expression") {
                obj.checked = c.checkedState || "";
                obj.checked_type = "expression";
            }
            break;

        case "arc":
        case "bar":
        case "slider":
            // Range
            obj.min = c.min ?? c.rangeMin ?? 0;
            obj.max = c.max ?? c.rangeMax ?? 100;
            // Value
            if (c.value != null) {
                obj.value = c.value;
                obj.value_type = c.valueType || "expression";
            }
            // Second value (range slider)
            if (c.valueLeft != null) {
                obj.value_left = c.valueLeft;
                obj.value_left_type = c.valueLeftType || "expression";
            }
            // Slider mode
            if (c.mode) obj.mode = c.mode;
            break;

        case "image":
            // Image source
            const src = extractImageSrc(c);
            if (src) obj.src = src;
            // Rotation / pivot (from animation properties)
            if (c.rotation != null) obj.rotation = c.rotation;
            if (c.pivotX != null) obj.pivot_x = c.pivotX;
            if (c.pivotY != null) obj.pivot_y = c.pivotY;
            break;

        case "switch":
            if (c.checkedStateType === "expression") {
                obj.checked = c.checkedState || "";
                obj.checked_type = "expression";
            }
            break;

        case "dropdown": {
            // EEZ stores LVGL dropdown `options` as a NEWLINE-JOINED STRING in
            // the project (array:string edited as MultilineText) — handle both
            // that and a plain string array.
            const options: string[] = typeof c.options === "string"
                ? c.options.split("\n").filter((line: string) => line !== "")
                : Array.isArray(c.options)
                  ? c.options.map((o: any) =>
                        typeof o === "string" ? o : o.label || o.text || "?"
                    )
                  : [];
            if (options.length > 0) obj.options = options;
            if (c.selected != null) obj.selected = c.selected;
            break;
        }

        case "imagebutton":
            // Reconstruct the device image-button fields (inverse of loader):
            // device uses img_pressed / img_released / img_disabled.
            if (c.imageReleased) obj.img_released = c.imageReleased;
            if (c.imagePressed) obj.img_pressed = c.imagePressed;
            else if (c.imageReleased) obj.img_pressed = c.imageReleased;
            if (c.imageDisabled) obj.img_disabled = c.imageDisabled;
            break;

        case "textarea":
            // Text areas carry obj_text + placeholder + one_line on the device.
            if (c.text != null && c.text !== "") {
                obj.obj_text = c.text;
                obj.text_type = c.textType || "literal";
            }
            if (c.placeholder) obj.placeholder = c.placeholder;
            if (c.oneLineMode) obj.one_line = true;
            break;

        case "roller": {
            // Roller options are stored like dropdown options (newline string
            // or array) and go back as a plain array to the device.
            const options: string[] = typeof c.options === "string"
                ? c.options.split("\n").filter((line: string) => line !== "")
                : Array.isArray(c.options)
                  ? c.options.map((o: any) =>
                        typeof o === "string" ? o : o.label || o.text || "?"
                    )
                  : [];
            if (options.length > 0) obj.options = options;
            if (c.selected != null) obj.selected = c.selected;
            break;
        }

        case "calendar":
            // Calendar date/header fields (device uses today_year etc.).
            if (c.todayYear != null) obj.today_year = c.todayYear;
            if (c.todayMonth != null) obj.today_month = c.todayMonth;
            if (c.todayDay != null) obj.today_day = c.todayDay;
            if (c.header) obj.header = c.header;
            break;

        case "checkbox":
            // Checkbox label text lives in obj_text on the device.
            if (c.text != null && c.text !== "") {
                obj.obj_text = c.text;
                obj.text_type = c.textType || "literal";
            }
            break;

        case "keyboard":
            // No extra device fields — geometry / style / events already exported.
            break;

        case "user_widget":
            // Reference the user widget by name
            if (c.userWidgetPageName) obj.widget = c.userWidgetPageName;
            break;
    }

    // ── State flags (optional) ──
    if (c.disabledStateType === "expression" && c.disabledState) {
        obj.disabled = c.disabledState;
    }
    if (c.hiddenFlagType === "expression" && c.hiddenFlag) {
        obj.hidden = c.hiddenFlag;
    }
    if (c.clickableFlag != null && !c.clickableFlag) {
        obj.clickable = false;
    }
    // Grid cells are static on the device (the firmware drives their edits), so
    // force clickable off even though the editor marks the Range cells
    // clickable in order to open their popup.
    if (c.paramGrid === true) {
        obj.clickable = false;
    }

    // ── Children (optional, recursive) ──
    const children = c.children;
    if (children?.length) {
        obj.children = {};
        for (const child of children) {
            const r = transformComponent(child, registerObj);
            if (r) Object.assign(obj.children, r);
        }
    }

    if (registerObj && c.objID) {
        registerObj(c.objID, ident);
    }

    return { [ident]: obj };
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API — native (device) nested screen export
// ═══════════════════════════════════════════════════════════════════════════

export interface DeviceScreen {
    /** Top-level screen background color, e.g. "#000000". */
    bg_color?: string;
    /** Bitmap names used by THIS screen only. */
    bitmaps: string[];
    /** Fonts used by THIS screen only: `[fontId, size]` pairs. */
    fonts: [string, number][];
    /** One root widget (sub_type "screen") with nested children. */
    widgets: Record<string, any>;
}

/** PascalCase an EEZ identifier → native widget key.
 *  "fan_button" → "FanButton", "change_config_title2" → "ChangeConfigTitle2". */
function nativeKey(ident: string): string {
    return ident
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("");
}

/** Prefixes / exact identifiers the EDITOR generates for preview only
 *  (parameter grid cells + their tab host panels + the "Select digital range"
 *  popups). The device builds these itself, so they never reach the export.
 *  `panel4*` are the generated INPUT/OUTPUT/VARIABLE grid host panels on the
 *  parameters screen; its real chrome (title + container) is kept. */
const EDITOR_ARTIFACT_PREFIXES = ["range_popup_", "param_grid_"];
// `panel4_output` / `panel4_variable` are the editor's extra INPUT/OUTPUT/
// VARIABLE tab host panels; `panel4` is kept (the device file has it) but its
// generated `param_grid_*` children are stripped by the prefix rule above.
const EDITOR_ARTIFACT_IDS = new Set(["panel4_output", "panel4_variable"]);

function isEditorArtifact(c: any): boolean {
    if (c.paramGridPopup === true || c.paramGrid === true) return true;
    const id: string = c.identifier || c.name || "";
    if (EDITOR_ARTIFACT_IDS.has(id)) return true;
    return EDITOR_ARTIFACT_PREFIXES.some((p) => id.startsWith(p));
}

/** Native widget keys that are genuinely lowercase in the firmware (the
 *  wireguard/ddns enable toggles) — Pascal-casing them would be wrong. */
const NATIVE_SNAKE_KEYS = new Set([
    "wg_enable", "wg_local", "wg_peer", "wg_port", "wg_status",
    "ddns_enable", "ddns_status",
]);

/** Root widget keys that can't be derived by Pascal-casing the page name. */
const ROOT_KEY_OVERRIDES: Record<string, string> = {
    wireguard_screen: "WireGuardScreen",
};

/** Collect every identifier in a widget subtree (real widgets only — used to
 *  decide whether a trailing `_2/_3` uniquify suffix is a REAL duplicate on
 *  this screen or just the loader's cross-screen uniquify artifact). */
function collectIdentifiers(children: any[], out: Set<string>): void {
    for (const c of children || []) {
        const id = c?.identifier;
        if (id) out.add(id);
        if (c?.children?.length) collectIdentifiers(c.children, out);
    }
}

/** Map an EEZ identifier to the native widget key on THIS screen.
 *  `_N` suffixes added purely for cross-screen uniqueness (base name absent on
 *  this screen) are dropped; genuine duplicates (both names present) are kept.
 *  Genuinely-lowercase firmware keys stay lowercase. */
function resolveNativeKey(ident: string, allRaw: Set<string>): string {
    const m = /^(.+)_(\d+)$/.exec(ident || "");
    let base = ident || "";
    if (m && !allRaw.has(m[1])) base = m[1];
    if (NATIVE_SNAKE_KEYS.has(base)) return base;
    return nativeKey(base);
}

/** Reverse the loader's font-name cleaning:
 *  "MONTSERRAT_16" → "lv_font_montserrat_16" (built-in),
 *  "ARIAL80"       → "Arial80" (custom font). */
function canonicalFontId(cleanName: string): string {
    const m = /^MONTSERRAT_(\d+)$/.exec(cleanName || "");
    if (m) return `lv_font_montserrat_${m[1]}`;
    const c = /^([A-Z]+)(\d+)$/.exec(cleanName || "");
    if (c) return c[1].charAt(0).toUpperCase() + c[1].slice(1).toLowerCase() + c[2];
    return cleanName || "";
}

/** Clone an EEZ style definition into the native style object:
 *  - `text_font` clean names → canonical font ids (and record the font),
 *  - `MAIN.DEFAULT.align` is lifted OUT to the widget's top-level `align`,
 *  - `bg_img_src`/`src` bitmap names are recorded. */
function sanitizeStyle(
    definition: any,
    ctx: NativeCtx,
    project: any
): { style?: any; align?: string } {
    if (!definition || typeof definition !== "object") return {};
    const clone = JSON.parse(JSON.stringify(definition));
    let align: string | undefined;

    const walk = (node: any, isDefaultState: boolean) => {
        for (const key of Object.keys(node)) {
            const v = node[key];
            if (typeof v === "object" && v !== null) {
                // Record MAIN.DEFAULT.align at the state level only.
                if (key === "DEFAULT" && v && typeof v.align === "string") {
                    align = v.align.toLowerCase();
                    delete v.align;
                }
                walk(v, key === "DEFAULT");
                continue;
            }
            if (key === "text_font" && typeof v === "string" && v) {
                const id = canonicalFontId(v);
                node[key] = id;
                ctx.usedFonts.set(id, fontSizeFor(ctx, project, v, id));
            } else if ((key === "bg_img_src" || key === "src") && typeof v === "string" && v) {
                ctx.usedBitmaps.add(v);
            }
        }
    };
    walk(clone, false);
    return { style: clone, align };
}

function fontSizeFor(ctx: NativeCtx, project: any, cleanName: string, id: string): number {
    const digit = /^MONTSERRAT_(\d+)$/.exec(cleanName || "");
    if (digit) return Number(digit[1]);
    const f = (project.fonts || []).find((x: any) => x.name === cleanName);
    return f?.source?.size ?? 0;
}

interface NativeCtx {
    displayW: number;
    displayH: number;
    project: any;
    /** EEZ objID → exported native widget node (for connection-line events). */
    nodeByObjId: Map<string, any>;
    /** EEZ identifier → exported native widget key (for flag_modify targets). */
    keyByIdent: Map<string, string>;
    usedFonts: Map<string, number>;
    usedBitmaps: Set<string>;
}

function isBackgroundPanel(c: any, ctx: NativeCtx): boolean {
    if ((c.type || "") !== "LVGLPanelWidget") return false;
    if (c.identifier) return false;
    return (c.left ?? 0) === 0 && (c.top ?? 0) === 0 &&
        (c.width ?? 0) === ctx.displayW && (c.height ?? 0) === ctx.displayH;
}

/** EEZ literal flags are stored as the STRING "true"/"false". */
function isTruthy(v: any): boolean {
    return v === true || v === "true";
}

/** Emit one EEZ widget → native widget object (no events; they are attached
 *  afterwards from connectionLines). Returns null for editor artifacts. */
function emitWidget(c: any, ctx: NativeCtx, allRaw: Set<string>): { key: string; obj: Record<string, any> } | null {
    const t: string = c.type || "";
    if (SKIP_TYPES.has(t)) return null;
    if (isEditorArtifact(c)) return null;

    const mapped = TYPE_MAP[t];
    if (!mapped) return null; // action/flow components handled via events

    const rawId = c.identifier || c.name || ("w_" + (c.objID || "").slice(0, 8));
    const key = resolveNativeKey(rawId, allRaw);
    if (!key) return null;
    ctx.keyByIdent.set(rawId, key);

    const obj: Record<string, any> = {
        type: "Widget",
        sub_type: mapped,
        x_pos: c.left ?? 0,
        y_pos: c.top ?? 0,
        // LVGL "content" sized widgets are 0×0 on the device (sized to text).
        width: c.widthUnit === "content" ? 0 : (c.width ?? 0),
        height: c.heightUnit === "content" ? 0 : (c.height ?? 0),
        obj_text: "",
        text_type: "literal",
    };

    // ── Style + align (optional) ──
    const { style, align } = sanitizeStyle(c.localStyles?.definition, ctx, ctx.project);
    if (style && Object.keys(style).length) obj.style = style;
    if (align) obj.align = align;

    // ── Native font / bitmap recording from type-specific fields ──
    if (c.text != null && c.text !== "") {
        obj.obj_text = c.text;
        obj.text_type = c.textType || "literal";
    }

    // ═══ Type-specific properties (inverse of firmware-loader) ═══
    switch (mapped) {
        case "label":
            if (c.longMode) obj.long_mode = c.longMode;
            if (c.recolor) obj.recolor = true;
            break;

        case "button":
            if (c.innerAlign) obj.inner_align = c.innerAlign;
            if (c.checkedStateType === "expression" && c.checkedState) {
                obj.checked = c.checkedState;
                obj.checked_type = "expression";
            }
            break;

        case "arc":
        case "bar":
        case "slider":
            obj.min = c.min ?? c.rangeMin ?? 0;
            obj.max = c.max ?? c.rangeMax ?? 100;
            if (c.value != null) {
                obj.value = c.value;
                obj.value_type = c.valueType || "expression";
            }
            if (c.valueLeft != null) {
                obj.value_left = c.valueLeft;
                obj.value_left_type = c.valueLeftType || "expression";
            }
            if (c.mode) obj.mode = c.mode;
            // ── Arc-only: device-native angles (lv_arc_set_bg_angles /
            //    lv_arc_set_rotation). EEZ stores them as bgStartAngle /
            //    bgEndAngle / rotation; WITHOUT them the loader re-imports an
            //    arc with undefined integers → EEZ "must be an integer" errors.
            if (mapped === "arc") {
                if (c.rotationType !== "expression" && c.rotation != null) {
                    obj.rotation = Number(c.rotation);
                }
                if (c.bgStartAngleType !== "expression" && c.bgStartAngle != null) {
                    obj.bg_start_angle = Number(c.bgStartAngle);
                }
                if (c.bgEndAngleType !== "expression" && c.bgEndAngle != null) {
                    obj.bg_end_angle = Number(c.bgEndAngle);
                }
            }
            break;

        case "image": {
            const src = extractImageSrc(c);
            if (src) {
                obj.src = src;
                ctx.usedBitmaps.add(src);
            }
            if (c.rotation != null) obj.rotation = c.rotation;
            if (c.pivotX != null) obj.pivot_x = c.pivotX;
            if (c.pivotY != null) obj.pivot_y = c.pivotY;
            break;
        }

        case "dropdown":
        case "roller": {
            const options: string[] = typeof c.options === "string"
                ? c.options.split("\n").filter((line: string) => line !== "")
                : Array.isArray(c.options)
                  ? c.options.map((o: any) => typeof o === "string" ? o : o.label || o.text || "?")
                  : [];
            if (options.length > 0) obj.options = options;
            if (c.selected != null) obj.selected = c.selected;
            break;
        }

        case "imagebutton": {
            if (c.imageReleased) {
                obj.img_released = c.imageReleased;
                ctx.usedBitmaps.add(c.imageReleased);
            }
            if (c.imagePressed) {
                obj.img_pressed = c.imagePressed;
                ctx.usedBitmaps.add(c.imagePressed);
            } else if (c.imageReleased) {
                obj.img_pressed = c.imageReleased;
            }
            if (c.imageDisabled) {
                obj.img_disabled = c.imageDisabled;
                ctx.usedBitmaps.add(c.imageDisabled);
            }
            break;
        }

        case "textarea":
            if (c.placeholder) obj.placeholder = c.placeholder;
            if (c.oneLineMode) obj.one_line = true;
            break;

        case "calendar":
            if (c.todayYear != null) obj.today_year = c.todayYear;
            if (c.todayMonth != null) obj.today_month = c.todayMonth;
            if (c.todayDay != null) obj.today_day = c.todayDay;
            if (c.header) obj.header = c.header;
            break;

        case "checkbox":
            // label text already in obj_text above
            break;

        case "keyboard":
            break;

        case "user_widget":
            if (c.userWidgetPageName) obj.widget = c.userWidgetPageName;
            break;
    }

    // ── State flags ──
    // EEZ stores literal true/false as STRING "true"/"false"; a device widget is
    // hidden/disabled only when the flag is truthy (initial hidden popups etc.).
    if (c.disabledStateType === "expression" && c.disabledState) {
        obj.disabled = c.disabledState;
    } else if (c.disabledStateType === "literal" && isTruthy(c.disabledState)) {
        obj.disabled = true;
    }
    if (c.hiddenFlagType === "expression" && c.hiddenFlag) {
        obj.hidden = c.hiddenFlag;
    } else if (c.hiddenFlagType === "literal" && isTruthy(c.hiddenFlag)) {
        obj.hidden = true;
    }
    if (c.clickableFlag === false) obj.clickable = false;

    // ── Children (nested, recursive) ──
    if (c.children?.length) {
        const childMap: Record<string, any> = {};
        for (const child of c.children) {
            const r = emitWidget(child, ctx, allRaw);
            if (!r) continue;
            childMap[r.key] = r.obj;
        }
        if (Object.keys(childMap).length) obj.children = childMap;
    }

    if (c.objID) ctx.nodeByObjId.set(c.objID, obj);

    return { key, obj };
}

/** Reverse-map an EEZ action (LVGLActionComponent.actions[i]) → native action.
 *  Returns null when the action is editor-only or its target widget is an
 *  editor artifact that was stripped. */
function mapNativeAction(a: any, ctx: NativeCtx): Record<string, any> | null {
    if (!a) return null;
    if (a.action === "changeScreen") {
        return {
            action: "screen_change",
            screen: a.screen || "",
            anim: a.fadeMode || "FADE_IN",
            speed: a.speed ?? 200,
            delay: a.delay ?? 0,
        };
    }
    if (a.action === "objSetFlagHidden") {
        const target = ctx.keyByIdent.get(a.object);
        if (!target) return null; // target stripped as an editor artifact
        return {
            action: "flag_modify",
            flag: "hidden",
            mode: a.hidden ? "add" : "remove",
            target,
        };
    }
    // setVariable / other EEZ-only actions are not expressible natively.
    return null;
}

/** Extract the screen background color from the loader-created full-screen
 *  background panel (fall back handled by the caller). */
function extractBgColor(bg: any): string | undefined {
    return bg?.localStyles?.definition?.MAIN?.DEFAULT?.bg_color || undefined;
}

/**
 * Transform a loaded .eez-project into per-screen DEVICE-NATIVE nested JSON.
 *
 * Each screen is a single root widget `<ScreenName>` (`sub_type:"screen"`) with
 * widgets nested under `children`, plus top-level `bg_color` and per-screen
 * `fonts`/`bitmaps` — matching the ESP32 firmware DefaultScreens format.
 */
export function transformToDeviceJson(project: any): Record<string, DeviceScreen> {
    const settings = project.settings?.general || {};
    const displayW: number = settings.displayWidth || 480;
    const displayH: number = settings.displayHeight || 320;

    const result: Record<string, DeviceScreen> = {};

    for (const page of project.userPages || []) {
        const screenName: string = page.name || "unknown";
        const ctx: NativeCtx = {
            displayW,
            displayH,
            project,
            nodeByObjId: new Map(),
            keyByIdent: new Map(),
            usedFonts: new Map(),
            usedBitmaps: new Set(),
        };

        const comps = page.components || [];
        const screenWidget = comps.find((c: any) => c.type === "LVGLScreenWidget");
        const actionByObjId = new Map<string, any>();
        const startByObjId = new Set<string>();
        for (const c of comps) {
            if (c.type === "LVGLActionComponent") actionByObjId.set(c.objID, c);
            else if (c.type === "StartActionComponent") startByObjId.add(c.objID);
        }

        // Raw identifier universe (for _N-suffix resolution on this screen).
        const allRaw = new Set<string>();
        collectIdentifiers(screenWidget?.children || [], allRaw);

        // ── Root screen widget ──
        const rootKey = ROOT_KEY_OVERRIDES[screenName] || nativeKey(screenName);
        const root: Record<string, any> = {
            type: "Widget",
            sub_type: "screen",
            x_pos: 0,
            y_pos: 0,
            width: 0,
            height: 0,
            obj_text: "",
            text_type: "literal",
        };
        const children: Record<string, any> = {};
        let bgObjId: string | undefined;
        let bgColor: string | undefined;

        for (const child of screenWidget?.children || []) {
            if (isBackgroundPanel(child, ctx)) {
                bgObjId = child.objID;
                bgColor = extractBgColor(child);
                continue;
            }
            const r = emitWidget(child, ctx, allRaw);
            if (!r) continue;
            children[r.key] = r.obj;
        }

        // ── Events: reconstruct native actions from page connectionLines ──
        for (const line of page.connectionLines || []) {
            const targetComp = line.target ? actionByObjId.get(line.target) : null;
            if (!targetComp || !targetComp.actions) continue;

            let ownerNode: Record<string, any> | null = null;
            let evtName: string | undefined;

            if (line.output === "@seqout" && line.source && startByObjId.has(line.source)) {
                // StartActionComponent chain → SCREEN_LOADED on the root widget.
                ownerNode = root;
                evtName = "SCREEN_LOADED";
            } else if (line.source && line.source === bgObjId) {
                // Events on the (dropped) background panel → root screen widget.
                ownerNode = root;
                evtName = line.output;
            } else if (line.source) {
                ownerNode = ctx.nodeByObjId.get(line.source) || null;
                evtName = line.output;
            }

            if (!ownerNode || !evtName) continue;

            const nativeActions: Record<string, any>[] = [];
            for (const a of targetComp.actions || []) {
                const native = mapNativeAction(a, ctx);
                if (native) nativeActions.push(native);
            }
            if (!nativeActions.length) continue;

            ownerNode.events = ownerNode.events || {};
            const ev = ownerNode.events[evtName] || (ownerNode.events[evtName] = { actions: [] });
            ev.actions.push(...nativeActions);
        }

        // ── Assemble the native screen object ──
        if (Object.keys(children).length) root.children = children;
        root.events = root.events || {};
        if (!Object.keys(root.events).length) delete root.events;

        const fonts: [string, number][] = Array.from(ctx.usedFonts.entries())
            .filter(([, size]) => size > 0)
            .map(([id, size]) => [id, size] as [string, number]);
        const bitmaps: string[] = Array.from(ctx.usedBitmaps);

        result[screenName] = {
            bg_color: bgColor || (settings.darkTheme === false ? "#FFFFFF" : "#000000"),
            fonts,
            bitmaps,
            widgets: { [rootKey]: root },
        };
    }

    return result;
}

