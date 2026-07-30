/**
 * firmware-loader.ts — Converts firmware JSON (from device) → .eez-project.
 *
 * Used by the "Import from Device" feature on the Open tab.
 * Reverse of firmware-export.ts.
 */

/** Convert PascalCase or camelCase to snake_case (matching EEZ's identifier convention). */
function toSnakeCase(name: string): string {
    return name
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, "");
}

/** Generate a short unique ID for build file entries. */
let _buildFileCounter = 0;
function genBuildFileId(): string {
    return `bf_${Date.now().toString(36)}_${_buildFileCounter++}`;
}

// ── Widget type mapping (firmware sub_type → LVGL component type) ──
const SUB_TYPE_MAP: Record<string, string> = {
    label: "LVGLLabelWidget",
    button: "LVGLButtonWidget",
    imagebutton: "LVGLImgbuttonWidget",
    arc: "LVGLArcWidget",
    bar: "LVGLBarWidget",
    image: "LVGLImageWidget",
    switch: "LVGLSwitchWidget",
    slider: "LVGLSliderWidget",
    dropdown: "LVGLDropdownWidget",
    textarea: "LVGLTextareaWidget",
    roller: "LVGLRollerWidget",
    panel: "LVGLPanelWidget",
    calendar: "LVGLCalendarWidget",
    user_widget: "LVGLUserWidgetWidget",
    action: "LVGLActionComponent",
};

interface FirmwareWidget {
    type?: string;
    sub_type: string;
    parent?: string;
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
    // arc-specific (from lv_arc_set_bg_angles / lv_arc_set_rotation)
    bg_start_angle?: number;
    bg_end_angle?: number;
    // image
    src?: string;
    rotation?: number;
    pivot_x?: number;
    pivot_y?: number;
    // imagebutton
    img_released?: string;
    img_pressed?: string;
    img_disabled?: string;
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
    // dropdown / roller
    options?: string[];
    optionsType?: string;
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

/** Metadata detected from firmware — sourced from /device/info API. */
export interface FirmwareMetadata {
    displaySize?: { width: number; height: number };
    lvglVersion?: string;
    darkTheme?: boolean;
    colorFormat?: string;
}

/**
 * Normalize an LVGL version string to one supported by the WASM runtime.
 * Available WASM runtimes: 8.4.0, 9.2.2, 9.3.0, 9.4.0, 9.5.0
 * Unsupported versions (e.g. "9.1.0" from SquareLine) map to nearest available.
 */
const AVAILABLE_WASM_VERSIONS = ["9.5.0", "9.4.0", "9.3.0", "9.2.2", "8.4.0"];
const DEFAULT_LVGL_VERSION = "9.5.0";

function normalizeLvglVersion(raw?: string): string {
    if (!raw) return DEFAULT_LVGL_VERSION;
    // Exact match
    if (AVAILABLE_WASM_VERSIONS.includes(raw)) return raw;
    // Fuzzy: match major.minor prefix (e.g. "9.1.0" → closest 9.x)
    const [major, minor] = raw.split(".").map(Number);
    for (const v of AVAILABLE_WASM_VERSIONS) {
        const [vm, vn] = v.split(".").map(Number);
        if (vm === major && vn >= (minor || 0)) return v;
    }
    return DEFAULT_LVGL_VERSION;
}

export function firmwareToProject(
    screens: FirmwareScreen[],
    device: DeviceMeta,
    meta?: FirmwareMetadata
) {
    const allFonts: { name: string; size: number }[] = [];
    const allBitmaps: string[] = [];
    const seenFonts = new Set<string>();
    const seenBitmaps = new Set<string>();

    for (const screen of screens) {
        for (const f of screen.json.fonts || []) {
            // Strip lv_font_ prefix and UPPERCASE for cleaner naming
            // (e.g. "lv_font_montserrat_40" → "MONTSERRAT_40" matching BUILT_IN_FONTS)
            const cleanName = f.name.replace(/^lv_font_/, "").toUpperCase();
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
                lvglVersion: normalizeLvglVersion(meta?.lvglVersion),
                flowSupport: true,
                displayWidth: meta?.displaySize?.width ?? 480,
                displayHeight: meta?.displaySize?.height ?? 320,
                displayBorderRadius: 0,
                colorFormat: meta?.colorFormat || "RGB",
                darkTheme: meta?.darkTheme ?? true,
                extensions: [],
                imports: [],
            },
            build: {
                configurations: [
                    { name: "Default" },
                ],
                files: [
                    {
                        objID: genBuildFileId(),
                        fileName: "screens.h",
                        template: "#ifndef EEZ_LVGL_UI_SCREENS_H\r\n#define EEZ_LVGL_UI_SCREENS_H\r\n\r\n//${eez-studio LVGL_INCLUDE}\r\n\r\n#ifdef __cplusplus\r\nextern \"C\" {\r\n#endif\r\n\r\n//${eez-studio LVGL_SCREENS_DECL}\r\n//${eez-studio LVGL_SCREENS_DECL_EXT}\r\n\r\n#ifdef __cplusplus\r\n}\r\n#endif\r\n\r\n#endif /*EEZ_LVGL_UI_SCREENS_H*/",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "screens.c",
                        template: "#include <string.h>\n\n#include \"screens.h\"\n#include \"images.h\"\n#include \"fonts.h\"\n#include \"actions.h\"\n#include \"vars.h\"\n#include \"styles.h\"\n#include \"ui.h\"\n\n//${eez-studio LVGL_SCREENS_DEF}\n//${eez-studio LVGL_SCREENS_DEF_EXT}",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "actions.h",
                        template: "#ifndef EEZ_LVGL_UI_EVENTS_H\r\n#define EEZ_LVGL_UI_EVENTS_H\r\n\r\n//${eez-studio LVGL_INCLUDE}\r\n\r\n#ifdef __cplusplus\r\nextern \"C\" {\r\n#endif\r\n\r\n//${eez-studio LVGL_ACTIONS_DECL}\r\n\r\n#ifdef __cplusplus\r\n}\r\n#endif\r\n\r\n#endif /*EEZ_LVGL_UI_EVENTS_H*/",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "vars.h",
                        template: "#ifndef EEZ_LVGL_UI_VARS_H\r\n#define EEZ_LVGL_UI_VARS_H\r\n\r\n#include <stdint.h>\r\n#include <stdbool.h>\r\n\r\n#ifdef __cplusplus\r\nextern \"C\" {\r\n#endif\r\n\r\n// enum declarations\r\n\r\n//${eez-studio FLOW_ENUMS}\r\n\r\n// Flow global variables\r\n\r\n//${eez-studio FLOW_GLOBAL_VARIABLES_ENUM}\r\n\r\n// Native global variables\r\n\r\n//${eez-studio LVGL_VARS_DECL}\r\n\r\n#ifdef __cplusplus\r\n}\r\n#endif\r\n\r\n#endif /*EEZ_LVGL_UI_VARS_H*/",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "structs.h",
                        template: "#ifndef EEZ_LVGL_UI_STRUCTS_H\n#define EEZ_LVGL_UI_STRUCTS_H\n\n//${eez-studio EEZ_FOR_LVGL_CHECK}\n\n#if defined(EEZ_FOR_LVGL)\n\n#include <eez/flow/flow.h>\n#include <stdint.h>\n#include <stdbool.h>\n\n#include \"vars.h\"\n\nusing namespace eez;\n\n//${eez-studio FLOW_STRUCTS}\n\n//${eez-studio FLOW_STRUCT_VALUES}\n\n#endif\n\n#endif /*EEZ_LVGL_UI_STRUCTS_H*/\n",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "images.h",
                        template: "#ifndef EEZ_LVGL_UI_IMAGES_H\r\n#define EEZ_LVGL_UI_IMAGES_H\r\n\r\n//${eez-studio LVGL_INCLUDE}\r\n\r\n#ifdef __cplusplus\r\nextern \"C\" {\r\n#endif\r\n\r\n//${eez-studio LVGL_IMAGES_DECL}\r\n\r\n#ifdef __cplusplus\r\n}\r\n#endif\r\n\r\n#endif /*EEZ_LVGL_UI_IMAGES_H*/",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "images.c",
                        template: "#include \"images.h\"\n\n//${eez-studio LVGL_IMAGES_DEF}",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "fonts.h",
                        template: "#ifndef EEZ_LVGL_UI_FONTS_H\r\n#define EEZ_LVGL_UI_FONTS_H\r\n\r\n//${eez-studio LVGL_INCLUDE}\r\n\r\n#ifdef __cplusplus\r\nextern \"C\" {\r\n#endif\r\n\r\n//${eez-studio LVGL_FONTS_DECL}\r\n\r\n#ifdef __cplusplus\r\n}\r\n#endif\r\n\r\n#endif /*EEZ_LVGL_UI_FONTS_H*/",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "styles.h",
                        template: "#ifndef EEZ_LVGL_UI_STYLES_H\r\n#define EEZ_LVGL_UI_STYLES_H\r\n\r\n//${eez-studio LVGL_INCLUDE}\r\n\r\n#ifdef __cplusplus\r\nextern \"C\" {\r\n#endif\r\n\r\n//${eez-studio LVGL_STYLES_DECL}\r\n\r\n#ifdef __cplusplus\r\n}\r\n#endif\r\n\r\n#endif /*EEZ_LVGL_UI_STYLES_H*/",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "styles.c",
                        template: "#include \"styles.h\"\n#include \"images.h\"\n#include \"fonts.h\"\n\n//${eez-studio LVGL_STYLES_DEF}\n",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "ui.h",
                        template: "#ifndef EEZ_LVGL_UI_GUI_H\n#define EEZ_LVGL_UI_GUI_H\n\n//${eez-studio LVGL_INCLUDE}\n\n//${eez-studio EEZ_FOR_LVGL_CHECK}\n\n#if defined(EEZ_FOR_LVGL)\n#include <eez/flow/lvgl_api.h>\n#endif\n\n#if !defined(EEZ_FOR_LVGL)\n#include \"screens.h\"\n#endif\n\n#ifdef __cplusplus\nextern \"C\" {\n#endif\n\n//${eez-studio GUI_ASSETS_DECL}\n\nvoid ui_init();\nvoid ui_tick();\n\n#if !defined(EEZ_FOR_LVGL)\nvoid loadScreen(enum ScreensEnum screenId);\n#endif\n\n#ifdef __cplusplus\n}\n#endif\n\n#endif // EEZ_LVGL_UI_GUI_H",
                    },
                    {
                        objID: genBuildFileId(),
                        fileName: "ui.c",
                        template: "#if defined(EEZ_FOR_LVGL)\n#include <eez/core/vars.h>\n#endif\n\n#include \"ui.h\"\n#include \"screens.h\"\n#include \"images.h\"\n#include \"actions.h\"\n#include \"vars.h\"\n\n//${eez-studio GUI_ASSETS_DEF}\n\n//${eez-studio LVGL_NATIVE_VARS_TABLE_DEF}\n\n//${eez-studio LVGL_ACTIONS_ARRAY_DEF}\n\n#if defined(EEZ_FOR_LVGL)\n\nvoid ui_init() {\n    eez_flow_init(assets, sizeof(assets), (lv_obj_t **)&objects, sizeof(objects), images, sizeof(images), actions);\n}\n\nvoid ui_tick() {\n    eez_flow_tick();\n    tick_screen(g_currentScreen);\n}\n\n#else\n\nstatic int16_t currentScreen = -1;\n\nstatic lv_obj_t *getLvglObjectFromIndex(int32_t index) {\n    if (index == -1) {\n        return 0;\n    }\n    return ((lv_obj_t **)&objects)[index];\n}\n\nstatic const void *getLvglImageByName(const char *name) {\n    for (size_t imageIndex = 0; imageIndex < sizeof(images) / sizeof(ext_img_desc_t); imageIndex++) {\n        if (strcmp(images[imageIndex].name, name) == 0) {\n            return images[imageIndex].img_dsc;\n        }\n    }\n    return 0;\n}\n\nvoid loadScreen(enum ScreensEnum screenId) {\n    currentScreen = screenId - 1;\n    lv_obj_t *screen = getLvglObjectFromIndex(currentScreen);\n    lv_scr_load_anim(screen, LV_SCR_LOAD_ANIM_FADE_IN, 200, 0, false);\n}\n\nvoid ui_init() {\n    create_screens();\n    loadScreen(SCREEN_ID_MAIN);\n}\n\nvoid ui_tick() {\n    tick_screen(currentScreen);\n}\n\n#endif\n",
                    },
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
            const displayW = meta?.displaySize?.width ?? 480;
            const displayH = meta?.displaySize?.height ?? 320;

            // ── Background panel (full-screen, replaces page-level localStyles) ──
            // Default to #000000 for dark theme screens that don't set explicit bg_color
            const isDark = meta?.darkTheme ?? true;
            const bgColor = (s.json as any).bg_color || (isDark ? "#000000" : "#FFFFFF");
                const bgId = genId();
                widgetComponents.push({
                    objID: bgId,
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
                    style: {
                        objID: genId(),
                        useStyle: "default",
                        conditionalStyles: [],
                        childStyles: [],
                    },
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

            // Firmware widgets as direct page components (no LVGLScreenWidget wrapper)
            const fwObjIds: Record<string, string> = {};

            // Recursively collect all non-screen widgets from the widget tree.
            // Only immediate children of the screen widget become top-level
            // components. Deeper descendants stay nested inside their parent
            // via firmwareWidgetToComponent's comp.children — this is essential
            // for correct LVGL relative positioning.
            function collectWidgets(widgets: Record<string, FirmwareWidget>) {
                for (const [widgetId, w] of Object.entries(widgets)) {
                    if (w.sub_type === "screen") {
                        if (w.children) collectWidgets(w.children);
                        continue;
                    }
                    const comp = firmwareWidgetToComponent(widgetId, w);
                    comp.objID = genId();
                    comp.identifier = toSnakeCase(widgetId);
                    fwObjIds[widgetId] = comp.objID;
                    widgetComponents.push(comp);
                }
            }
            collectWidgets(s.json.widgets || {});

            // Walk the nested component tree to assign unique objIDs to all
            // descendants and register them in fwObjIds. Nested children
            // are created by firmwareWidgetToComponent with the firmware
            // widget name as a placeholder objID — we replace it with a
            // generated unique ID so connectionLines can reference them.
            function registerNestedIds(comps: Record<string, any>[]) {
                for (const comp of comps) {
                    const fwKey = (comp as any)._fwKey as string | undefined;
                    if (fwKey && !fwObjIds[fwKey]) {
                        // Generate unique ID, set identifier for EEZ build index,
                        // and register in fwObjIds so flag_modify actions can
                        // reference this widget by its snake_case name.
                        const uid = genId();
                        comp.objID = uid;
                        comp.identifier = toSnakeCase(fwKey);
                        // Also update style objIDs that reference the old ID
                        if (comp.style?.objID) comp.style.objID = `${uid}_style_ref_${Date.now().toString(36)}`;
                        if (comp.localStyles?.objID) comp.localStyles.objID = `${uid}_style_${Date.now().toString(36)}`;
                        fwObjIds[fwKey] = uid;
                    }
                    if (comp.children && Array.isArray(comp.children)) {
                        registerNestedIds(comp.children);
                    }
                }
            }
            registerNestedIds(widgetComponents);

            // ── Build flow: action components + connectionLines ──
            const connectionLines: any[] = [];
            // bgId is the background panel's objID — screen-level events route through it

            // Map firmware event names to EEZ event names (same logic as firmwareWidgetToComponent)
            const mapEventName = (evtName: string, subType: string) => {
                if (evtName !== "ALL") return evtName;
                if (subType === "arc" || subType === "bar" || subType === "slider") return "VALUE_CHANGED";
                // ALL other types (button, imagebutton, switch, dropdown, roller, panel, screen, etc.)
                // default to CLICKED. "ALL" is NOT a valid EEZ LVGL event name.
                return "CLICKED";
            };

            // Recursively process widget events and create connectionLines
            let actionYOffset = displayH + 40; // stack action components below the screen
            const processWidgetEvents = (
                widgetId: string,
                w: FirmwareWidget,
                isScreen: boolean
            ) => {
                const events = w.events as Record<string, any> | undefined;
                if (events) {
                    const sourceObjId = isScreen ? bgId : (fwObjIds[widgetId] || undefined);
                    if (sourceObjId) {
                        for (const [eventName, eventData] of Object.entries(events)) {
                            const evtActions = (eventData as any).actions || [];
                            const eezevtName = mapEventName(eventName, w.sub_type);
                            for (const action of evtActions) {
                                if (action.action === "screen_change") {
                                    const aid = genId();
                                    // EEZ uses LVGLActionComponent with nested actions array
                                    widgetComponents.push({
                                        objID: aid, type: "LVGLActionComponent",
                                        left: 20, top: actionYOffset, width: 350, height: 50,
                                        customInputs: [], customOutputs: [],
                                        actions: [{
                                            objID: genId(), action: "changeScreen",
                                            screen: action.screen || "", screenType: "literal",
                                            fadeMode: action.anim === "MOVE_LEFT" ? "MOVE_LEFT" : action.anim === "MOVE_RIGHT" ? "MOVE_RIGHT" : action.anim === "MOVE_TOP" ? "MOVE_TOP" : action.anim === "MOVE_BOTTOM" ? "MOVE_BOTTOM" : action.anim === "FADE_OUT" ? "FADE_OUT" : "FADE_IN", fadeModeType: "literal",
                                            speed: action.speed || 200, speedType: "literal",
                                            delay: action.delay || 0, delayType: "literal",
                                            useStack: true, useStackType: "literal",
                                        }],
                                    });
                                    actionYOffset += 60;
                                    connectionLines.push({ objID: genId(), source: sourceObjId, output: eezevtName, target: aid, input: "@seqin" });
                                } else if (action.action === "flag_modify") {
                                    // Use snake_case identifier (matching EEZ build convention)
                                    const targetName = toSnakeCase(action.target || "");
                                    // Guard: skip if target not found in tree
                                    if (!targetName || !fwObjIds[action.target || ""]) continue;
                                    const hiddenVal = action.mode === "remove" ? false : true;
                                    const aid = genId();
                                    widgetComponents.push({
                                        objID: aid, type: "LVGLActionComponent",
                                        left: 20, top: actionYOffset, width: 350, height: 50,
                                        customInputs: [], customOutputs: [],
                                        actions: [{
                                            objID: genId(), action: "objSetFlagHidden",
                                            object: targetName, objectType: "literal",
                                            hidden: hiddenVal, hiddenType: "literal",
                                        }],
                                    });
                                    actionYOffset += 60;
                                    connectionLines.push({ objID: genId(), source: sourceObjId, output: eezevtName, target: aid, input: "@seqin" });
                                }
                            }
                        }
                    }
                }
                // Recurse into children
                if (w.children) {
                    for (const [childId, childW] of Object.entries(w.children)) {
                        processWidgetEvents(childId, childW as FirmwareWidget, false);
                    }
                }
            };

            for (const [widgetId, w] of Object.entries(s.json.widgets || {})) {
                const isScreen = w.sub_type === "screen";
                processWidgetEvents(widgetId, w, isScreen);
            }

            // ── Update background panel eventHandlers for screen-level events ──
            // Screen events (SCREEN_LOADED, CLICKED on background, GESTURE, etc.)
            // are routed through the background panel. Populate its eventHandlers.
            const screenWidget = Object.entries(s.json.widgets || {}).find(
                ([, w]) => w.sub_type === "screen"
            );
            if (screenWidget) {
                const [, screenW] = screenWidget;
                const screenEvents = screenW.events;
                if (screenEvents && Object.keys(screenEvents).length > 0) {
                    const bgPanel = widgetComponents.find(c => c.objID === bgId);
                    if (bgPanel) {
                        const bgEventNames = new Set<string>();
                        for (const evtName of Object.keys(screenEvents)) {
                            bgEventNames.add(mapEventName(evtName, screenW.sub_type));
                        }
                        // Merge with existing eventHandlers (e.g. from screen_change connections)
                        const existing = bgPanel.eventHandlers || [];
                        const existingNames = new Set(existing.map((e: any) => e.eventName));
                        for (const name of bgEventNames) {
                            if (!existingNames.has(name)) {
                                existing.push({ eventName: name, handlerType: "flow" });
                            }
                        }
                        bgPanel.eventHandlers = existing;
                        bgPanel.clickableFlag = true;
                    }
                }
            }

            return {
                objID: pageId,
                name: s.name,
                components: widgetComponents,
                connectionLines,
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
    w: FirmwareWidget
): Record<string, any> {
    const lvglType = SUB_TYPE_MAP[w.sub_type] || "LVGLPanelWidget";
    // Store firmware key on every component (including nested children)
    // so registerNestedIds can map fwObjIds correctly after tree is built.

    // Detect LV_SIZE_CONTENT: width/height = 0 (set by parse_squareline for LV_SIZE_CONTENT)
    const isSizeContentW = w.width === 0;
    const isSizeContentH = w.height === 0;
    let widthVal = w.width ?? 0;
    let heightVal = w.height ?? 0;

    // Detect alignment from firmware (e.g. LV_ALIGN_CENTER → "CENTER")
    // Panels wider than the display with center align get pushed off-screen.
    // Strip the align so they render at their raw x/y position instead.
    const firmwareAlign = (w as any).align as string | undefined;
    const effectiveAlign = (firmwareAlign === "center" && widthVal > 480) ? undefined : firmwareAlign;

    // In LVGL, x/y are OFFSETS from the aligned position when align is set.
    // When we strip center align from wide panels, the offset was meant for
    // scrollable centering — reset to 0 so the panel starts at parent's top-left.
    const leftVal = effectiveAlign ? (w.x_pos ?? 0) : 0;
    const topVal = effectiveAlign ? (w.y_pos ?? 0) : 0;

    // For content-sized labels, estimate width/height from font size.
    // The "align: CENTER" style (set below) handles positioning natively in LVGL.
    if (isSizeContentW && (w.obj_text || "")) {
        const fontName: string | undefined =
            (w.style as any)?.MAIN?.DEFAULT?.text_font || (w.style as any)?.DEFAULT?.text_font || undefined;
        const fontSize = (() => {
            if (!fontName) return 16;
            const m = fontName.match(/_(\d+)$/);
            if (m) return parseInt(m[1], 10);
            // Custom font: "Arial80" → 80, "lv_font_montserrat_40" → 40
            const digits = fontName.match(/(\d+)/);
            return digits ? parseInt(digits[1], 10) : 16;
        })();
        widthVal = Math.max((w.obj_text || "").length * fontSize * 0.48, 80);
    }
    if (isSizeContentH && (w.obj_text || "")) {
        const fontName: string | undefined =
            (w.style as any)?.MAIN?.DEFAULT?.text_font || (w.style as any)?.DEFAULT?.text_font || undefined;
        const fontSize = (() => {
            if (!fontName) return 16;
            const m = fontName.match(/_(\d+)$/);
            if (m) return parseInt(m[1], 10);
            const digits = fontName.match(/(\d+)/);
            return digits ? parseInt(digits[1], 10) : 16;
        })();
        heightVal = Math.max(fontSize + 6, 24);
    }
    // Textarea needs extra height for cursor + border
    if (isSizeContentH && lvglType === "LVGLTextareaWidget" && heightVal < 40) {
        heightVal = 40;
    }

    // Flex panels with content-sized width/height: estimate from children
    const ff = (w as any).flex_flow as string | undefined;
    if (ff && w.children) {
        if (isSizeContentW) {
            const childWidths = Object.values(w.children).map((c: any) => (c.width || 90));
            if (ff === "row" || ff === "row_wrap") {
                widthVal = childWidths.reduce((a: number, b: number) => a + b, 0) + 20;
            } else {
                widthVal = Math.max(...childWidths, 100);
            }
        }
        if (isSizeContentH) {
            const childHeights = Object.values(w.children).map((c: any) => (c.height || 30));
            if (ff === "column" || ff === "column_wrap") {
                heightVal = childHeights.reduce((a: number, b: number) => a + b, 0) + 20;
            } else {
                heightVal = Math.max(...childHeights, 30);
            }
        }
    }

    const comp: Record<string, any> = {
        objID: id,
        type: lvglType,
        left: leftVal,
        top: topVal,
        width: widthVal,
        height: heightVal,
        _fwKey: id, // firmware widget name for fwObjIds registration
        customInputs: [],
        customOutputs: [],

        // ── Required LVGLWidget base properties ──
        leftUnit: "px",
        topUnit: "px",
        widthUnit: "px",
        heightUnit: "px",
        hiddenFlagType: "literal",
        clickableFlag: true,
        clickableFlagType: "literal",
        checkedStateType: "literal",
        disabledStateType: "literal",
        widgetFlags: "CLICKABLE|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
        states: "",
        style: {
            objID: `${id}_style_ref_${Date.now().toString(36)}`,
            useStyle: "default",
            conditionalStyles: [],
            childStyles: [],
        },
        localStyles: {
            objID: `${id}_style_${Date.now().toString(36)}`,
        },
        groupIndex: 0,
        eventHandlers: [],
        timeline: "",
        children: "",
    };

    // ── Text ──
    if (lvglType === "LVGLLabelWidget" || lvglType === "LVGLButtonWidget" || lvglType === "LVGLTextareaWidget") {
        comp.text = w.obj_text || "";
        comp.textType = w.text_type || "literal";
        if (w.long_mode) comp.longMode = w.long_mode;
        if (w.recolor) comp.recolor = true;
        // Textarea-specific
        if (lvglType === "LVGLTextareaWidget") {
            if ((w as any).placeholder) comp.placeholder = (w as any).placeholder;
            if ((w as any).one_line) comp.oneLineMode = true;
        }
    }

    // ── Arc / Bar / Slider ──
    if (
        lvglType === "LVGLArcWidget" ||
        lvglType === "LVGLBarWidget" ||
        lvglType === "LVGLSliderWidget"
    ) {
        // EEZ uses rangeMin/rangeMax for arc, min/max for bar/slider
        if (lvglType === "LVGLArcWidget") {
            comp.rangeMin = w.min ?? 0;
            comp.rangeMinType = "literal";
            comp.rangeMax = w.max ?? 100;
            comp.rangeMaxType = "literal";
        } else {
            comp.min = w.min ?? 0;
            comp.max = w.max ?? 100;
        }
        if (w.value != null) {
            comp.value = w.value;
            comp.valueType = w.value_type || "literal";
        }
        if (w.value_left != null) {
            comp.valueLeft = w.value_left;
            comp.valueLeftType = w.value_left_type || "literal";
        }
        if (w.mode) comp.mode = w.mode;
    }

    // ── Arc-specific ──
    if (lvglType === "LVGLArcWidget") {
        if (w.bg_start_angle != null) {
            comp.bgStartAngle = w.bg_start_angle;
            comp.bgStartAngleType = "literal";
        }
        if (w.bg_end_angle != null) {
            comp.bgEndAngle = w.bg_end_angle;
            comp.bgEndAngleType = "literal";
        }
        // Arc rotation from lv_arc_set_rotation
        if (w.rotation != null) {
            comp.rotation = w.rotation;
            comp.rotationType = "literal";
        }
    }

    // ── Image ──
    if (lvglType === "LVGLImageWidget" && w.src) {
        comp.image = w.src;
    }

    // ── Imagebutton ──
    if (lvglType === "LVGLImgbuttonWidget") {
        // Firmware uses lv_imagebutton_set_src(obj, STATE, NULL, &img, NULL)
        if ((w as any).img_released) comp.imageReleased = (w as any).img_released;
        if ((w as any).img_pressed) comp.imagePressed = (w as any).img_pressed;
        if ((w as any).img_disabled) comp.imageDisabled = (w as any).img_disabled;
        // Fallback: if only released is set, use it for all states
        if (comp.imageReleased && !comp.imagePressed) comp.imagePressed = comp.imageReleased;
        if (comp.imageReleased && !comp.imageDisabled) comp.imageDisabled = comp.imageReleased;
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
        } else {
            // Ensure options is never undefined (prevents unescapeCString crash)
            comp.options = ["--"];
        }
        if (w.selected != null) comp.selected = w.selected;
    }

    // ── Roller ──
    if (lvglType === "LVGLRollerWidget") {
        if (w.options?.length) {
            comp.options = w.options.map(o =>
                typeof o === "string" ? o : (o as any).label || (o as any).text || "?"
            );
        }
        // Default options so roller doesn't crash on empty
        if (!comp.options || comp.options.length === 0) {
            comp.options = ["--"];
        }
        comp.optionsType = "literal";
    }

    // ── Calendar ──
    if (lvglType === "LVGLCalendarWidget") {
        if ((w as any).today_year != null) comp.todayYear = (w as any).today_year;
        if ((w as any).today_month != null) comp.todayMonth = (w as any).today_month;
        if ((w as any).today_day != null) comp.todayDay = (w as any).today_day;
        if ((w as any).header) comp.header = (w as any).header;
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
    // w.style is now { PART: { STATE: { PROP: VALUE } } } from parser
    // e.g. { "MAIN": { "DEFAULT": { "arc_color": "#62B7FF" } }, "KNOB": { "DEFAULT": { "bg_color": "#C6DFD9" } } }
    const hasStyle = !!(w.style && Object.keys(w.style).length > 0);
    const hasAlign = !!effectiveAlign;
    const hasNoDefault = !!(w as any).no_default_style;
    if (hasStyle || hasAlign || hasNoDefault) {
        const cleanedStyle: Record<string, Record<string, Record<string, any>>> = {};

        // Copy firmware style properties: PART → STATE → props
        if (w.style) {
            for (const [part, states] of Object.entries(w.style as Record<string, Record<string, any>>)) {
                cleanedStyle[part] = {};
                for (const [state, props] of Object.entries(states)) {
                    cleanedStyle[part][state] = {};
                    for (const [prop, value] of Object.entries(props)) {
                        if (prop === "text_font" && typeof value === "string") {
                            cleanedStyle[part][state][prop] = value.replace(/^lv_font_/, "").toUpperCase();
                        } else {
                            cleanedStyle[part][state][prop] = value;
                        }
                    }
                }
            }
        }

        // Ensure MAIN.DEFAULT exists for alignment / no_default_style / font overrides
        const mainDefault = () => {
            if (!cleanedStyle["MAIN"]) cleanedStyle["MAIN"] = {};
            if (!cleanedStyle["MAIN"]["DEFAULT"]) cleanedStyle["MAIN"]["DEFAULT"] = {};
            return cleanedStyle["MAIN"]["DEFAULT"];
        };

        // Add alignment if firmware set it (e.g. LV_ALIGN_CENTER → "CENTER")
        if (hasAlign) {
            const ds = mainDefault();
            const alignMap: Record<string, string> = {
                center: "CENTER",
                top_left: "TOP_LEFT", top_mid: "TOP_MID", top_right: "TOP_RIGHT",
                bottom_left: "BOTTOM_LEFT", bottom_mid: "BOTTOM_MID", bottom_right: "BOTTOM_RIGHT",
                left_mid: "LEFT_MID", right_mid: "RIGHT_MID",
            };
            ds["align"] = alignMap[effectiveAlign.toLowerCase()] || effectiveAlign.toUpperCase();
        }

        // lv_obj_remove_style_all → transparent panel with no borders/padding
        if (hasNoDefault) {
            const ds = mainDefault();
            ds["bg_opa"] = 0;
            ds["border_width"] = 0;
            ds["pad_left"] = 0;
            ds["pad_right"] = 0;
            ds["pad_top"] = 0;
            ds["pad_bottom"] = 0;
            ds["radius"] = 0;
        }

        // Map custom fonts (e.g. "Arial80") to closest built-in MONTSERRAT
        if (cleanedStyle["MAIN"]?.["DEFAULT"]?.text_font) {
            const font = cleanedStyle["MAIN"]["DEFAULT"].text_font;
            if (!/^MONTSERRAT_\d+$/.test(font)) {
                const digits = font.match(/(\d+)/);
                if (digits) {
                    const targetSize = parseInt(digits[1], 10);
                    const available = [8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48];
                    const closest = available.reduce((prev, curr) =>
                        Math.abs(curr - targetSize) < Math.abs(prev - targetSize) ? curr : prev
                    );
                    cleanedStyle["MAIN"]["DEFAULT"].text_font = `MONTSERRAT_${closest}`;
                }
            }
        }

        // Default text color to white for labels/textareas on dark theme firmware
        const isTextWidget = lvglType === "LVGLLabelWidget" || lvglType === "LVGLTextareaWidget" || lvglType === "LVGLButtonWidget";
        if (isTextWidget) {
            const ds = mainDefault();
            if (!ds["text_color"]) ds["text_color"] = "#FFFFFF";
        }

        // Button with child labels: zero out padding so text isn't clipped
        if (lvglType === "LVGLButtonWidget" && w.children) {
            const hasLabel = Object.values(w.children).some(c => c.sub_type === "label");
            if (hasLabel) {
                const ds = mainDefault();
                ds["pad_left"] = 0;
                ds["pad_right"] = 0;
                ds["pad_top"] = 0;
                ds["pad_bottom"] = 0;
            }
        }

        comp.localStyles = {
            objID: `${comp.objID}_style_${Date.now().toString(36)}`,
            definition: cleanedStyle as any,
        };
    }

    // ── Events ──
    // Firmware JSON events: { "ALL" | "CLICKED" | ...: { actions: [...] } }
    // Map to EEZ eventHandlers format: [ { eventName, handlerType:"flow" } ]
    // The flow section creates connectionLines from these event outputs.
    if (w.events && Object.keys(w.events).length > 0) {
        comp.eventHandlers = Object.keys(w.events).map(evtName => {
            // Map firmware "ALL" (from LV_EVENT_ALL) to meaningful event names.
            // "ALL" is NOT a valid EEZ LVGL event — it must be mapped or the
            // build check crashes with "getWidgetEvents(...)[this.eventName] is undefined".
            let mappedName = evtName;
            if (mappedName === "ALL") {
                if (lvglType === "LVGLArcWidget" || lvglType === "LVGLBarWidget" || lvglType === "LVGLSliderWidget") {
                    mappedName = "VALUE_CHANGED";
                } else {
                    // Buttons, imagebuttons, switches, dropdowns, rollers,
                    // panels, screens, and all other types: default to CLICKED
                    mappedName = "CLICKED";
                }
            }
            return { eventName: mappedName, handlerType: "flow" };
        });
    } else {
        comp.eventHandlers = [];
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
    } else if (hidden && (hidden === "true" || hidden === "1" || String(hidden) === "true")) {
        comp.hiddenFlag = "true";
        comp.hiddenFlagType = "literal";
    }
    if (w.clickable === false) {
        comp.clickableFlag = false;
    }

    // ── Children (panel / button / dropdown) ──
    if (w.children) {
        comp.children = Object.entries(w.children).map(([cid, cw]) =>
            firmwareWidgetToComponent(cid, cw)
        );
    }

    // ── Flex layout: position children sequentially ──
    const flexFlow = (w as any).flex_flow as string | undefined;
    if (flexFlow && comp.children && Array.isArray(comp.children) && comp.children.length > 0) {
        const padTop = Number(((w.style as any)?.MAIN?.DEFAULT?.pad_top) ?? 0);
        const padLeft = Number(((w.style as any)?.MAIN?.DEFAULT?.pad_left) ?? 0);
        const isColumn = flexFlow === "column" || flexFlow === "column_wrap";
        const isRow = flexFlow === "row" || flexFlow === "row_wrap";

        // Strip align from all descendants (flex handles positioning)
        if (isColumn) {
            let yOff = padTop;
            for (const child of comp.children) {
                if (!(child as any).hiddenFlag) {
                    child.top = yOff;
                    child.left = padLeft;
                    const cs = (child as any).localStyles?.definition;
                    if (cs) for (const p of Object.values(cs) as any[]) for (const s of Object.values(p||{}) as any[]) if (s&&typeof s==="object") delete s.align;
                    yOff += (child.height || 30) + 2;
                }
            }
        } else if (isRow) {
            let xOff = padLeft;
            for (const child of comp.children) {
                if (!(child as any).hiddenFlag) {
                    child.left = xOff;
                    child.top = padTop;
                    const cs = (child as any).localStyles?.definition;
                    if (cs) for (const p of Object.values(cs) as any[]) for (const s of Object.values(p||{}) as any[]) if (s&&typeof s==="object") delete s.align;
                    xOff += (child.width || 30) + 2;
                }
            }
        }
    }

    return comp;
}
