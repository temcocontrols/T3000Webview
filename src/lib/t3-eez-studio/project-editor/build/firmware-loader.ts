/**
 * firmware-loader.ts — Converts firmware JSON (from device) → .eez-project.
 *
 * Used by the "Import from Device" feature on the Open tab.
 * Reverse of firmware-export.ts.
 */

// ── Widget type mapping (firmware sub_type → LVGL component type) ──
const SUB_TYPE_MAP: Record<string, string> = {
    label: "LVGLLabelWidget",
    button: "LVGLButtonWidget",
    arc: "LVGLArcWidget",
    bar: "LVGLBarWidget",
    image: "LVGLImageWidget",
    switch: "LVGLSwitchWidget",
    slider: "LVGLSliderWidget",
    dropdown: "LVGLDropdownWidget",
    textarea: "LVGLTextareaWidget",
    panel: "LVGLPanelWidget",
    user_widget: "LVGLUserWidgetWidget",
    action: "LVGLActionComponent",
};

interface FirmwareWidget {
    type?: string;
    sub_type: string;
    x_pos: number;
    y_pos: number;
    width: number;
    height: number;
    obj_text?: string;
    text_type?: string;
    style?: Record<string, any>;
    events?: Record<string, any>;
    children?: Record<string, FirmwareWidget>;
    // arc/bar/slider
    min?: number;
    max?: number;
    value?: string;
    value_type?: string;
    value_left?: string;
    value_left_type?: string;
    mode?: string;
    // image
    src?: string;
    rotation?: number;
    pivot_x?: number;
    pivot_y?: number;
    // label
    long_mode?: string;
    recolor?: boolean;
    // button
    inner_align?: string;
    checked?: string;
    checked_type?: string;
    // switch
    checkedState?: string;
    checkedStateType?: string;
    // dropdown
    options?: string[];
    selected?: string;
    // user widget
    widget?: string;
    // action
    actions?: { action: string; screen?: string; variable?: string; value?: any }[];
    // state flags
    disabled?: string;
    disabledState?: string;
    disabledStateType?: string;
    hidden?: string;
    hiddenFlag?: string;
    hiddenFlagType?: string;
    clickable?: boolean;
}

interface FirmwareScreen {
    name: string;
    json: {
        fonts?: { name: string; size: number }[];
        bitmaps?: string[];
        widgets?: Record<string, FirmwareWidget>;
    };
}

interface DeviceMeta {
    panel_name: string;
    serial_number: number;
}

export function firmwareToProject(
    screens: FirmwareScreen[],
    device: DeviceMeta,
    displaySize?: { width: number; height: number }
) {
    const allFonts: { name: string; size: number }[] = [];
    const allBitmaps: string[] = [];
    const seenFonts = new Set<string>();
    const seenBitmaps = new Set<string>();

    for (const screen of screens) {
        for (const f of screen.json.fonts || []) {
            // Strip lv_font_ prefix for cleaner naming (e.g. "lv_font_montserrat_40" → "montserrat_40")
            const cleanName = f.name.replace(/^lv_font_/, "");
            if (!seenFonts.has(cleanName)) {
                seenFonts.add(cleanName);
                allFonts.push({ name: cleanName, size: f.size });
            }
        }
        for (const b of screen.json.bitmaps || []) {
            if (!seenBitmaps.has(b)) {
                seenBitmaps.add(b);
                allBitmaps.push(b);
            }
        }
    }

    return {
        themesVersion: "v3",
        objID: `proj_${device.serial_number}_${Date.now().toString(36)}`,
        settings: {
            general: {
                objID: `proj_${device.panel_name}_${Date.now().toString(36)}`,
                projectVersion: "v3",
                projectType: "lvgl",
                lvglVersion: "9.5.0",
                flowSupport: true,
                displayWidth: displaySize?.width ?? 480,
                displayHeight: displaySize?.height ?? 320,
                displayBorderRadius: 0,
                colorFormat: "RGB",
                extensions: [],
                imports: [],
            },
            build: {
                configurations: [
                    { name: "Default" },
                ],
                lvglInclude: "lvgl/lvgl.h",
                generateSourceCodeForEezFramework: false,
                compressFlowDefinition: false,
                executionQueueSize: 1000,
            },
        },
        importedFrom: {
            device: device.panel_name,
            serialNumber: device.serial_number,
            importedAt: new Date().toISOString(),
        },
        userPages: screens.map(s => {
            const widgetComponents: Record<string, any>[] = [];

            // Generate unique IDs for this screen
            let compIdx = 0;
            const genId = () => `imp_${s.name}_${compIdx++}_${Date.now().toString(36)}`;

            const pageId = `page_${s.name}_${Date.now().toString(36)}`;
            const displayW = displaySize?.width ?? 800;
            const displayH = displaySize?.height ?? 480;

            // ── Background panel (full-screen, replaces page-level localStyles) ──
            const bgColor = (s.json as any).bg_color;
            if (bgColor) {
                const bgId = `bg_${s.name}_${Date.now().toString(36)}`;
                widgetComponents.push({
                    objID: genId(),
                    type: "LVGLPanelWidget",
                    left: 0,
                    top: 0,
                    width: displayW,
                    height: displayH,
                    leftUnit: "px",
                    topUnit: "px",
                    widthUnit: "px",
                    heightUnit: "px",
                    customInputs: [],
                    customOutputs: [],
                    hiddenFlagType: "literal",
                    clickableFlag: false,
                    clickableFlagType: "literal",
                    checkedStateType: "literal",
                    disabledStateType: "literal",
                    widgetFlags: "ADV_HITTEST|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
                    states: "",
                    useStyle: "default",
                    localStyles: {
                        objID: `${bgId}_style_${Date.now().toString(36)}`,
                        definition: {
                            MAIN: { DEFAULT: { bg_color: bgColor } },
                        },
                    },
                    groupIndex: 0,
                    eventHandlers: [],
                    timeline: "",
                    children: "",
                });
            }

            for (const [widgetId, w] of Object.entries(s.json.widgets || {})) {
                const comp = firmwareWidgetToComponent(widgetId, w, displayW, displayH);
                comp.objID = genId();
                widgetComponents.push(comp);
            }

            return {
                objID: pageId,
                name: s.name,
                components: widgetComponents,
                connectionLines: [],
                localVariables: [],
                userProperties: [],
                left: 0,
                top: 0,
                width: displayW,
                height: displayH,
                createAtStart: true,
                deleteOnScreenUnload: false,
            };
        }),
        fonts: allFonts.map(f => ({
            name: f.name,
            source: { size: f.size },
        })),
        bitmaps: allBitmaps.map(b => ({
            name: b,
            image: "",
        })),
        lvglStyles: { allStyles: [] },
        lvglGroups: { groups: [] },
        variables: {
            globalVariables: [],
        },
        actions: [],
        userWidgets: [],
        colors: [],
        themes: [],
    };
}

function firmwareWidgetToComponent(
    id: string,
    w: FirmwareWidget,
    displayW: number = 800,
    displayH: number = 480
): Record<string, any> {
    const lvglType = SUB_TYPE_MAP[w.sub_type] || "LVGLPanelWidget";

    // Detect LV_SIZE_CONTENT: width/height = 0 (set by parse_squareline for LV_SIZE_CONTENT)
    const isSizeContentW = w.width === 0;
    const isSizeContentH = w.height === 0;
    // Detect centered widget (LV_ALIGN_CENTER in firmware)
    const isCentered = (w as any).align === "center";

    // Compute pixel position for centered widgets
    let leftVal = w.x_pos ?? 0;
    let topVal = w.y_pos ?? 0;
    let widthVal = w.width ?? 0;
    let heightVal = w.height ?? 0;

    if (isCentered) {
        // Center the widget on screen, then add x/y offsets (LVGL preserves x/y as offsets from aligned position)
        leftVal = Math.round((displayW - widthVal) / 2) + (w.x_pos ?? 0);
        topVal = Math.round((displayH - heightVal) / 2) + (w.y_pos ?? 0);
    }

    // Estimate size for content-sized labels based on text length
    if (isSizeContentW && (w.obj_text || "")) {
        widthVal = Math.max((w.obj_text || "").length * 10, 40);
    }
    if (isSizeContentH && (w.obj_text || "")) {
        heightVal = 24;
    }

    const comp: Record<string, any> = {
        objID: id,
        type: lvglType,
        left: leftVal,
        top: topVal,
        width: widthVal,
        height: heightVal,
        customInputs: [],
        customOutputs: [],

        // ── Required LVGLWidget base properties ──
        leftUnit: "px",
        topUnit: "px",
        widthUnit: isSizeContentW ? "content" : "px",
        heightUnit: isSizeContentH ? "content" : "px",
        hiddenFlagType: "literal",
        clickableFlag: true,
        clickableFlagType: "literal",
        checkedStateType: "literal",
        disabledStateType: "literal",
        widgetFlags: "CLICKABLE|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
        states: "",
        useStyle: "default",
        localStyles: {
            objID: `${id}_style_${Date.now().toString(36)}`,
        },
        groupIndex: 0,
        eventHandlers: [],
        timeline: "",
        children: "",
    };

    // ── Text ──
    if (lvglType === "LVGLLabelWidget" || lvglType === "LVGLButtonWidget") {
        comp.text = w.obj_text || "";
        comp.textType = w.text_type || "literal";
        if (w.long_mode) comp.longMode = w.long_mode;
        if (w.recolor) comp.recolor = true;
    }

    // ── Arc / Bar / Slider ──
    if (
        lvglType === "LVGLArcWidget" ||
        lvglType === "LVGLBarWidget" ||
        lvglType === "LVGLSliderWidget"
    ) {
        comp.min = w.min ?? 0;
        comp.max = w.max ?? 100;
        if (w.value != null) {
            comp.value = w.value;
            comp.valueType = w.value_type || "expression";
        }
        if (w.value_left != null) {
            comp.valueLeft = w.value_left;
            comp.valueLeftType = w.value_left_type || "expression";
        }
        if (w.mode) comp.mode = w.mode;
    }

    // ── Image ──
    if (lvglType === "LVGLImageWidget" && w.src) {
        comp.image = w.src;
    }
    if (w.rotation != null) comp.rotation = w.rotation;
    if (w.pivot_x != null) comp.pivotX = w.pivot_x;
    if (w.pivot_y != null) comp.pivotY = w.pivot_y;

    // ── Switch ──
    if (lvglType === "LVGLSwitchWidget" && (
        w.checked_type === "expression" || w.checkedStateType === "expression"
    )) {
        comp.checkedState = w.checked || w.checkedState || "";
        comp.checkedStateType = "expression";
    }

    // ── Button (toggle) ──
    if (lvglType === "LVGLButtonWidget") {
        if (w.inner_align) comp.innerAlign = w.inner_align;
        if (w.checked_type === "expression") {
            comp.checkedState = w.checked || "";
            comp.checkedStateType = "expression";
        }
    }

    // ── Dropdown ──
    if (lvglType === "LVGLDropdownWidget") {
        if (w.options?.length) {
            comp.options = w.options.map(o =>
                typeof o === "string" ? o : (o as any).label || (o as any).text || "?"
            );
        }
        if (w.selected != null) comp.selected = w.selected;
    }

    // ── User Widget ──
    if (lvglType === "LVGLUserWidgetWidget" && w.widget) {
        comp.userWidgetPageName = w.widget;
    }

    // ── Action component ──
    if (lvglType === "LVGLActionComponent") {
        comp.type = "LVGLActionComponent";
        comp.actions = (w.actions || []).map((a: any) => ({
            action: a.action || "?",
            screen: a.screen || "",
            screenType: "literal",
            fadeMode: "FADE_IN",
            fadeModeType: "literal",
            speed: 200,
            speedType: "literal",
            delay: 0,
            delayType: "literal",
            useStack: true,
            useStackType: "literal",
        }));
    }

    // ── Style ──
    // w.style is { STATE: { PROP: VALUE } } from parser (e.g. { DEFAULT: { bg_color: "#000" } })
    // Wrap in MAIN part since components only have MAIN as LVGL part
    if (w.style) {
        // Clean font names: lv_font_montserrat_40 → montserrat_40
        const cleanedStyle: Record<string, Record<string, any>> = {};
        for (const [state, props] of Object.entries(w.style as Record<string, Record<string, any>>)) {
            cleanedStyle[state] = {};
            for (const [prop, value] of Object.entries(props)) {
                if (prop === "text_font" && typeof value === "string") {
                    cleanedStyle[state][prop] = value.replace(/^lv_font_/, "");
                } else {
                    cleanedStyle[state][prop] = value;
                }
            }
        }
        comp.localStyles = {
            objID: `${comp.objID}_style_${Date.now().toString(36)}`,
            definition: { MAIN: cleanedStyle },
        };
    }

    // ── Events ──
    if (w.events) {
        comp.eventHandlers = Object.entries(w.events).map(([name, e]) => ({
            eventName: name,
            handlerType: (e as any).action || "action",
            userData: (e as any).user_data ?? 0,
        }));
    }

    // ── State flags ──
    const disabled = w.disabled || w.disabledState;
    if (disabled && (w.disabledStateType === "expression" || typeof disabled === "string")) {
        comp.disabledState = disabled;
        comp.disabledStateType = "expression";
    }
    const hidden = w.hidden || w.hiddenFlag;
    if (hidden && (w.hiddenFlagType === "expression" || typeof hidden === "string")) {
        comp.hiddenFlag = hidden;
        comp.hiddenFlagType = "expression";
    }
    if (w.clickable === false) {
        comp.clickableFlag = false;
    }

    // ── Children (panel / dropdown) ──
    if (w.children) {
        comp.components = Object.entries(w.children).map(([cid, cw]) =>
            firmwareWidgetToComponent(cid, cw)
        );
    }

    return comp;
}
