/**
 * firmware-export.ts — Transforms .eez-project → device JSON format.
 *
 * Produces per-screen JSON files following the Firmware JSON Format spec
 * (see docs/t3000/architecture/lvgl-eez-project-json-format.md, Appendix B).
 *
 * Each output file goes to `<projectDir>/device-export/<screen_name>.json`.
 */

// ── Widget type mapping (LVGL prefix → firmware sub_type) ──
const TYPE_MAP: Record<string, string> = {
    LVGLLabelWidget: "label",
    LVGLButtonWidget: "button",
    LVGLArcWidget: "arc",
    LVGLBarWidget: "bar",
    LVGLImageWidget: "image",
    LVGLSwitchWidget: "switch",
    LVGLPanelWidget: "panel",
    LVGLDropdownWidget: "dropdown",
    LVGLSliderWidget: "slider",
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
function transformComponent(c: any): Record<string, any> | null {
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
            const r = transformComponent(child);
            if (r) Object.assign(result, r);
        }
        return result;
    }

    const mapped = TYPE_MAP[t];

    // ── Action component (flow logic — changeScreen, setVariable, etc.) ──
    if (t === "LVGLActionComponent" && c.actions?.length) {
        const ident = c.objID?.slice(0, 8) || ("act_" + Math.random().toString(36).slice(2, 8));
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

        case "dropdown":
            if (c.options?.length) {
                obj.options = c.options.map((o: any) =>
                    typeof o === "string" ? o : o.label || o.text || "?"
                );
            }
            if (c.selected != null) obj.selected = c.selected;
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
            const r = transformComponent(child);
            if (r) Object.assign(obj.children, r);
        }
    }

    return { [ident]: obj };
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

export interface DeviceScreen {
    fonts: { name: string; size: number }[];
    bitmaps: string[];
    widgets: Record<string, any>;
}

/**
 * Transform a loaded .eez-project into per-screen device JSON objects.
 */
export function transformToDeviceJson(
    project: any
): Record<string, DeviceScreen> {
    const fonts = (project.fonts || []).map((f: any) => ({
        name: f.name || "?",
        size: f.source?.size ?? 0,
    }));

    const bitmaps: string[] = (project.bitmaps || []).map(
        (b: any) => b.name || "?"
    );

    const result: Record<string, DeviceScreen> = {};

    for (const page of project.userPages || []) {
        const screenName: string = page.name || "unknown";

        // Build objID → identifier map from all components (including actions)
        const objIdToIdent: Record<string, string> = {};
        const actionWidgets: Record<string, any> = {};
        const allWidgets: Record<string, any> = {};

        for (const comp of page.components || []) {
            const r = transformComponent(comp);
            if (r) {
                const entry = Object.entries(r)[0];
                if (entry) {
                    const [ident, widget] = entry;
                    allWidgets[ident] = widget;
                    if (comp.objID) objIdToIdent[comp.objID] = ident;
                    if (widget.sub_type === "action") actionWidgets[ident] = widget;
                }
            }
        }

        // Resolve connectionLines: attach actions to widget events
        for (const line of page.connectionLines || []) {
            const sourceIdent = objIdToIdent[line.source];
            const targetIdent = objIdToIdent[line.target];
            const sourceWidget = sourceIdent ? allWidgets[sourceIdent] : null;
            const targetAction = targetIdent ? actionWidgets[targetIdent] : null;

            if (sourceWidget && targetAction && line.output) {
                const evtName = line.output;
                if (!sourceWidget.events) sourceWidget.events = {};
                if (!sourceWidget.events[evtName]) {
                    sourceWidget.events[evtName] = { actions: [] };
                } else if (!sourceWidget.events[evtName].actions) {
                    // The event entry may already exist from eventHandlers
                    // export ({ action, user_data } only) — make sure the
                    // actions array is present before pushing into it.
                    sourceWidget.events[evtName].actions = [];
                }
                if (targetAction.actions) {
                    sourceWidget.events[evtName].actions.push(...targetAction.actions);
                }
            }
        }

        // Remove standalone action widgets from final output (actions now live in events)
        for (const ident of Object.keys(actionWidgets)) {
            delete allWidgets[ident];
        }

        result[screenName] = { fonts, bitmaps, widgets: allWidgets };
    }

    return result;
}
