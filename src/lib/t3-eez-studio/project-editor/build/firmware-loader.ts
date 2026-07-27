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
    device: DeviceMeta
) {
    const allFonts: { name: string; size: number }[] = [];
    const allBitmaps: string[] = [];
    const seenFonts = new Set<string>();
    const seenBitmaps = new Set<string>();

    for (const screen of screens) {
        for (const f of screen.json.fonts || []) {
            if (!seenFonts.has(f.name)) {
                seenFonts.add(f.name);
                allFonts.push(f);
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
        settings: {
            general: {
                projectType: "LVGL",
                lvglVersion: "9.5.0",
                hasFlowSupport: true,
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
            const actionComponents: Record<string, any>[] = [];
            const connectionLines: Record<string, any>[] = [];

            // Generate unique IDs for this screen
            let compIdx = 0;
            const genId = () => `imp_${s.name}_${compIdx++}_${Date.now().toString(36)}`;

            for (const [widgetId, w] of Object.entries(s.json.widgets || {})) {
                const comp = firmwareWidgetToComponent(widgetId, w);

                if (comp.type === "LVGLActionComponent") {
                    comp.objID = genId();
                    actionComponents.push(comp);
                } else {
                    comp.objID = genId();
                    widgetComponents.push(comp);

                    // If this widget has events with actions, create connectionLines to action components
                    const events = w.events;
                    if (events) {
                        for (const [evtName, evtData] of Object.entries(events)) {
                            const actions = (evtData as any).actions;
                            if (actions?.length) {
                                // Create an action component for this event's actions
                                const actionComp: Record<string, any> = {
                                    objID: genId(),
                                    type: "LVGLActionComponent",
                                    left: (w.x_pos ?? 0) + (w.width ?? 0) + 20,
                                    top: w.y_pos ?? 0,
                                    width: 354,
                                    height: 54,
                                    customInputs: [],
                                    customOutputs: [],
                                    actions: actions.map((a: any) => ({
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
                                    })),
                                };
                                actionComponents.push(actionComp);

                                // Create connection line: widget event → action
                                connectionLines.push({
                                    source: comp.objID,
                                    output: evtName,
                                    target: actionComp.objID,
                                    input: "@seqin",
                                });
                            }
                        }
                    }
                }
            }

            return {
                name: s.name,
                components: [...widgetComponents, ...actionComponents],
                connectionLines,
                localVariables: [],
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
        lvglGroups: [],
        variables: {
            globalVariables: [],
        },
        actions: [],
        userWidgets: [],
    };
}

function firmwareWidgetToComponent(
    id: string,
    w: FirmwareWidget
): Record<string, any> {
    const lvglType = SUB_TYPE_MAP[w.sub_type] || "LVGLPanelWidget";

    const comp: Record<string, any> = {
        objID: id,
        type: lvglType,
        left: w.x_pos ?? 0,
        top: w.y_pos ?? 0,
        width: w.width ?? 0,
        height: w.height ?? 0,
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
    if (w.style) {
        comp.localStyles = { definition: w.style };
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
