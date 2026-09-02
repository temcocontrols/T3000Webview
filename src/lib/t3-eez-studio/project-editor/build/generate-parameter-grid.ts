/**
 * generate-parameter-grid.ts — Fill the "parameters" screen's empty scrollable
 * panel (Panel4) with a default parameter grid (header + rows), using data from
 * the t3_webview_device DB (GET /api/t3_device/devices/:serial/input-points).
 *
 * The device screen JSON only defines the static scaffolding (title bar, empty
 * scrollable Panel4, Update button) — the grid rows are drawn at runtime by the
 * firmware. Since dynamic tables are out of scope, we generate a DEFAULT/STATIC
 * grid snapshot into the EEZ project at import time. The developer locks
 * editing to bg/back/header/update; grid cells are identified by the
 * `param_grid_*` identifier prefix + `paramGrid: true` marker so they can be
 * hidden/locked from the editor UI.
 */

import {
    getRangeLabel as inputRangeLabel,
    getRangeOptions as inputGetRangeOptions,
} from "../../../../t3-react/features/inputs/data/rangeData";
import {
    getRangeLabel as outputRangeLabel,
    getRangeOptions as outputGetRangeOptions,
} from "../../../../t3-react/features/outputs/data/rangeData";
import {
    getRangeLabel as variableRangeLabel,
    getRangeOptions as variableGetRangeOptions,
} from "../../../../t3-react/features/variables/data/rangeData";

/** Which point table the grid shows. Matches the firmware's PARAM_TABLE_*. */
export type ParameterPointType = "input" | "output" | "variable";

export interface InputPointData {
    label?: string | null;
    fullLabel?: string | null;
    fValue?: string | null;
    autoManual?: string | null;
    digitalAnalog?: string | null;
    control?: string | null;
    rangeField?: string | null;
    units?: string | null;
    /** Output HOA switch status: 0=MAN-OFF, 1=AUTO, 2=MAN-ON (firmware switch_status). */
    status?: string | null;
    hwSwitchStatus?: string | null;
}

export interface ParameterGridOptions {
    pageName?: string;     // screen whose grid we fill (default "parameters")
    containerId?: string;  // container that holds the panel (default "container1")
    panelId?: string;      // the scrollable panel (default "panel4")
    pointType?: ParameterPointType; // which point table (default "input")
    maxRows?: number;      // how many rows to render (default 15)
    rowHeight?: number;    // px per row (default 24)
    fontName?: string;     // LVGL font (default "MONTSERRAT_12")
    textColor?: string;    // data cell color (default "#FFFFFF")
    headerColor?: string;  // header cell color (default "#9CC8F5")
    panelBgColor?: string; // grid panel background (default "#16222F")
    titleTopMargin?: number; // top margin (px) for the title bar (default 8)
    titleId?: string;        // identifier of the title bar (default "change_config_title2")
}

interface GridColumn {
    key: string;
    title: string;
    x: number;
    w: number;
}

// Column layouts per point type. The firmware (lv_UserPeram.c) shows:
//   INPUT/VAR:   No, Desc, Label, Value, A/M, D/A, Ctrl, Range
//   OUTPUT:      No, Desc, Label, Value, A/M, D/A, Ctrl, SW, Range
// We render the user-facing columns only (Label..Range), adding the OUTPUT-only
// "SW" (HOA switch status) column for outputs.
const COLUMN_SETS: Record<ParameterPointType, GridColumn[]> = {
    input: [
        { key: "label", title: "Label", x: 6, w: 140 },
        { key: "value", title: "Value", x: 146, w: 70 },
        { key: "am", title: "A/M", x: 216, w: 54 },
        { key: "da", title: "D/A", x: 270, w: 54 },
        { key: "ctrl", title: "Ctrl", x: 324, w: 44 },
        { key: "range", title: "Range", x: 368, w: 106 },
    ],
    output: [
        { key: "label", title: "Label", x: 6, w: 120 },
        { key: "value", title: "Value", x: 126, w: 60 },
        { key: "am", title: "A/M", x: 186, w: 48 },
        { key: "da", title: "D/A", x: 234, w: 48 },
        { key: "ctrl", title: "Ctrl", x: 282, w: 40 },
        { key: "sw", title: "SW", x: 322, w: 50 },
        { key: "range", title: "Range", x: 372, w: 102 },
    ],
    variable: [
        { key: "label", title: "Label", x: 6, w: 140 },
        { key: "value", title: "Value", x: 146, w: 70 },
        { key: "am", title: "A/M", x: 216, w: 54 },
        { key: "da", title: "D/A", x: 270, w: 54 },
        { key: "ctrl", title: "Ctrl", x: 324, w: 44 },
        { key: "range", title: "Range", x: 368, w: 106 },
    ],
};

/**
 * Per-type panel identifier inside the parameters screen's container1.
 * The firmware keeps ONE table on the parameters screen and rebuilds it per
 * type (PARAM_TABLE_INPUT/OUTPUT/VARIABLE) when the user enters via the
 * main-menu Inputs/Outputs/Variables button. We model that as three stacked
 * panels (INPUT visible by default, the other two hidden), each pre-filled
 * with its own grid (different fields + default data).
 */
export const PANEL_BY_TYPE: Record<ParameterPointType, string> = {
    input: "panel4",
    output: "panel4_output",
    variable: "panel4_variable",
};

let _objCounter = 0;
function genObjId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${_objCounter++}`;
}

/** Clone the primary grid panel (panel4) for another point type. The clone
 *  shares the same geometry/styling but starts empty + hidden; the caller adds
 *  the grid cells. */
function cloneParamPanel(template: any, panelId: string): any {
    const uid = genObjId(panelId);
    const clone = JSON.parse(JSON.stringify(template));
    clone.objID = uid;
    clone.identifier = panelId;
    clone.children = [];
    clone.style = {
        objID: `${uid}_style_ref`,
        useStyle: "default",
        conditionalStyles: [],
        childStyles: [],
    };
    clone.localStyles = {
        objID: `${uid}_style`,
        definition: JSON.parse(JSON.stringify(template.localStyles?.definition || {})),
    };
    clone.hiddenFlagType = "literal";
    clone.hiddenFlag = "true";
    clone.flagScrollDirection = "all"; // LV_DIR_ALL (both directions)
    clone.flagScrollbarMode = "AUTO";
    return clone;
}

/** Map a raw point row to the display text for one grid column.
 *  Field semantics follow the firmware (lv_UserPeram.c `param_table_fill_row`):
 *  auto_manual: 0=Auto, 1=Manual; digital_analog: 1=Analog, 0=Digital;
 *  output "SW" = switch_status (HOA: 0=MAN-OFF, 1=AUTO, 2=MAN-ON). */
export function gridCellText(
    pt: InputPointData,
    key: string,
    pointType: ParameterPointType = "input"
): string {
    switch (key) {
        case "label":
            return pt.label && pt.label.trim() ? pt.label : pt.fullLabel || "-";
        case "value":
            return pt.fValue || "-";
        case "am":
            // firmware: auto_manual == 0 ? "Auto" : "Manual"
            return pt.autoManual === "1" ? "Manual" : "Auto";
        case "da":
            // firmware: digital_analog == 1 ? "Analog" : "Digital"
            return pt.digitalAnalog === "1" ? "Analog" : "Digital";
        case "ctrl":
            // firmware shows the raw control value
            return pt.control || "-";
        case "sw": {
            // Output HOA switch status (0=MAN-OFF, 1=AUTO, 2=MAN-ON)
            const v = pt.hwSwitchStatus ?? pt.status;
            switch (String(v)) {
                case "0": return "MAN-OFF";
                case "1": return "AUTO";
                case "2": return "MAN-ON";
                default: return v ? String(v) : "-";
            }
        }
        case "range": {
            const da = parseInt(pt.digitalAnalog || "0", 10);
            const rv = parseInt(pt.rangeField || "0", 10);
            // firmware: range table depends on the point type
            // (param_table_get_range_options(PARAM_TABLE_INPUT/OUTPUT/VARIABLE)).
            const label =
                pointType === "output"
                    ? outputRangeLabel(rv, da)
                    : pointType === "variable"
                      ? variableRangeLabel(rv, da)
                      : inputRangeLabel(rv, da);
            return label && label !== "Unknown" ? label : (pt.rangeField || "-");
        }
        default:
            return "-";
    }
}

let _cellCounter = 0;

/** Build an LVGLLabelWidget cell matching the loader's component shape. */
function makeCell(
    identifier: string,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: string,
    fontName: string,
    isHeader: boolean,
    opts?: { clickable?: boolean; eventName?: string }
): Record<string, any> {
    const ts = Date.now().toString(36);
    const uid = `${identifier}_${ts}_${_cellCounter++}`;
    const clickable = opts?.clickable ?? false;
    const eventName = opts?.eventName;
    return {
        objID: uid,
        type: "LVGLLabelWidget",
        left: x,
        top: y,
        width: w,
        height: h,
        leftUnit: "px",
        topUnit: "px",
        widthUnit: "px",
        heightUnit: "px",
        customInputs: [],
        customOutputs: [],
        hiddenFlagType: "literal",
        clickableFlag: clickable,
        clickableFlagType: "literal",
        checkedStateType: "literal",
        disabledStateType: "literal",
        widgetFlags:
            (clickable ? "CLICKABLE|" : "") +
            "CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
        states: "",
        style: {
            objID: `${uid}_style_ref_${ts}`,
            useStyle: "default",
            conditionalStyles: [],
            childStyles: [],
        },
        localStyles: {
            objID: `${uid}_style_${ts}`,
            definition: {
                MAIN: {
                    DEFAULT: {
                        text_font: fontName,
                        text_color: color,
                        // TOP_LEFT so `left`/`top` are offsets from the grid
                        // panel's top-left (not its center). All text (header
                        // and cells) is left-aligned inside the cell.
                        align: "TOP_LEFT",
                        text_align: "LEFT",
                        pad_left: 4,
                        pad_right: 4,
                    },
                },
            },
        },
        groupIndex: 0,
        eventHandlers: eventName
            ? [{ eventName, handlerType: "flow" }]
            : [],
        timeline: "",
        children: "",
        text,
        textType: "literal",
        identifier,
        // Marker so the editor can hide/lock the auto-generated grid cells.
        paramGrid: true,
    };
}

/** Resolve the range option list for a point (firmware table per point type).
 *  digital_analog picks digital (0) vs analog (1) — same as the device. */
function getRangeOptionsForType(
    pointType: ParameterPointType,
    digitalAnalog: number
): { value: number; label: string }[] {
    const opts =
        pointType === "output"
            ? outputGetRangeOptions(digitalAnalog)
            : pointType === "variable"
              ? variableGetRangeOptions(digitalAnalog)
              : inputGetRangeOptions(digitalAnalog);
    return (opts || []).map(o => ({ value: o.value, label: o.label }));
}

/** Title shown on the popup opened when a Range grid cell is clicked (this is
 *  the device's dialog title for digital ranges). */
const RANGE_POPUP_TITLE = "Select digital range";

/** Size of the range-picker popup panel. */
const RANGE_POPUP_WIDTH = 320;
const RANGE_POPUP_HEIGHT = 170;

/** Opacity (0-255) of the dismiss backdrop behind an open popup. 0 = fully
 *  transparent: it exists only to catch taps outside the popup (tapping the
 *  grid area closes it) without adding any visible overlay / hiding the
 *  screen title. */
const RANGE_POPUP_BACKDROP_OPA = 0;

/** How much bigger (px) the popup title font is vs the grid cell font. */
const RANGE_POPUP_TITLE_FONT_DELTA = 6;

/** Derive the popup title font from the grid font (e.g. "MONTSERRAT_12" →
 *  "MONTSERRAT_18"). Falls back to the same font when it has no size suffix. */
function bumpFontSize(fontName: string, delta: number): string {
    const m = /^(.*?)(\d+)$/.exec(fontName);
    if (!m) return fontName;
    const size = parseInt(m[2], 10);
    return `${m[1]}${Math.max(size + delta, 12)}`;
}

/** One clickable Range cell + the point it belongs to (for popup options). */
interface RangeRowMeta {
    rowIndex: number;
    pt: InputPointData;
    cell: Record<string, any>;
}

/** Build the hidden "Select digital range .." popup for one grid row.
 *
 * UI-only: clicking the row's Range cell in the EEZ editor shows this panel,
 * which contains a real LVGL dropdown pre-loaded with the point's range
 * options (the list the device's native range dialog would present). Nothing
 * here pushes to the device — on export the popup + its flow wiring carry the
 * `paramGridPopup` marker and are dropped, leaving only the static Range
 * label (the device keeps its own native range dialog).
 */
function makeRangePopup(
    baseId: string,
    pointType: ParameterPointType,
    pt: InputPointData,
    fontName: string,
    titleFont: string,
    textColor: string,
    headerColor: string,
    x: number,
    y: number
): { panel: Record<string, any>; dropdown: Record<string, any> } {
    const ts = Date.now().toString(36);
    const da = parseInt(pt.digitalAnalog || "0", 10);
    const rv = parseInt(pt.rangeField || "0", 10);
    const ranges = getRangeOptionsForType(pointType, da);
    const options = ranges.map(o => o.label).join("\n");
    const selIdx = ranges.findIndex(o => o.value === rv);
    const selected = selIdx >= 0 ? selIdx : 0;

    const panelUid = `${baseId}_panel_${ts}_${_cellCounter++}`;
    const panel: Record<string, any> = {
        objID: panelUid,
        type: "LVGLPanelWidget",
        left: x,
        top: y,
        width: RANGE_POPUP_WIDTH,
        height: RANGE_POPUP_HEIGHT,
        leftUnit: "px",
        topUnit: "px",
        widthUnit: "px",
        heightUnit: "px",
        customInputs: [],
        customOutputs: [],
        hiddenFlagType: "literal",
        hiddenFlag: "true",
        clickableFlag: true,
        clickableFlagType: "literal",
        checkedStateType: "literal",
        disabledStateType: "literal",
        widgetFlags: "CLICKABLE|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
        states: "",
        style: {
            objID: `${panelUid}_style_ref_${ts}`,
            useStyle: "default",
            conditionalStyles: [],
            childStyles: [],
        },
        localStyles: {
            objID: `${panelUid}_style_${ts}`,
            definition: {
                MAIN: {
                    DEFAULT: {
                        bg_color: "#141C27",
                        bg_opa: 240,
                        radius: 10,
                        border_color: "#8A93A0",
                        border_width: 1,
                        border_opa: 255,
                        shadow_color: "#000000",
                        shadow_opa: 180,
                        shadow_width: 50,
                        shadow_spread: 4,
                        pad_left: 0,
                        pad_right: 0,
                        pad_top: 0,
                        pad_bottom: 0,
                    },
                },
            },
        },
        groupIndex: 0,
        eventHandlers: [],
        timeline: "",
        children: [],
        identifier: `${baseId}_panel`,
        // UI-only: firmware-export drops paramGridPopup widgets.
        paramGridPopup: true,
    };

    const titleUid = `${baseId}_title_${ts}_${_cellCounter++}`;
    const title: Record<string, any> = {
        objID: titleUid,
        type: "LVGLLabelWidget",
        left: 0,
        top: 12,
        width: RANGE_POPUP_WIDTH,
        height: 40,
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
        widgetFlags: "CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
        states: "",
        style: {
            objID: `${titleUid}_style_ref_${ts}`,
            useStyle: "default",
            conditionalStyles: [],
            childStyles: [],
        },
        localStyles: {
            objID: `${titleUid}_style_${ts}`,
            definition: {
                MAIN: {
                    DEFAULT: {
                        text_font: titleFont,
                        text_color: headerColor,
                        text_align: "CENTER",
                        pad_left: 0,
                        pad_right: 0,
                    },
                },
            },
        },
        groupIndex: 0,
        eventHandlers: [],
        timeline: "",
        children: "",
        text: RANGE_POPUP_TITLE,
        textType: "literal",
        identifier: `${baseId}_title`,
        paramGridPopup: true,
    };

    const dropdownUid = `${baseId}_dropdown_${ts}_${_cellCounter++}`;
    const dropdown: Record<string, any> = {
        objID: dropdownUid,
        type: "LVGLDropdownWidget",
        left: 24,
        top: 62,
        width: RANGE_POPUP_WIDTH - 48,
        height: 40,
        leftUnit: "px",
        topUnit: "px",
        widthUnit: "px",
        heightUnit: "px",
        customInputs: [],
        customOutputs: [],
        hiddenFlagType: "literal",
        clickableFlag: true,
        clickableFlagType: "literal",
        checkedStateType: "literal",
        disabledStateType: "literal",
        widgetFlags: "CLICKABLE|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
        states: "",
        style: {
            objID: `${dropdownUid}_style_ref_${ts}`,
            useStyle: "default",
            conditionalStyles: [],
            childStyles: [],
        },
        localStyles: {
            objID: `${dropdownUid}_style_${ts}`,
            definition: {
                MAIN: {
                    DEFAULT: {
                        text_font: fontName,
                        text_color: textColor,
                        align: "TOP_LEFT",
                        text_align: "LEFT",
                        pad_left: 6,
                        pad_right: 6,
                        bg_color: "#1E2A38",
                        bg_opa: 255,
                        radius: 6,
                        border_color: "#3A4C62",
                        border_width: 1,
                        border_opa: 255,
                    },
                },
            },
        },
        groupIndex: 0,
        eventHandlers: [{ eventName: "VALUE_CHANGED", handlerType: "flow" }],
        timeline: "",
        children: "",
        options,
        optionsType: "literal",
        selected,
        selectedType: "literal",
        direction: "bottom",
        identifier: `${baseId}_dropdown`,
        paramGridPopup: true,
    };

    panel.children.push(title, dropdown);
    return { panel, dropdown };
}

/** Remove range-picker popups/flow artifacts previously generated for one point
 *  type so re-imports/regenerations never stack duplicates. */
function cleanupRangePopupEditors(
    page: any,
    pointType: ParameterPointType
): void {
    const prefix = `range_popup_${pointType}_`;
    if (Array.isArray(page.components)) {
        for (let i = page.components.length - 1; i >= 0; i--) {
            const c: any = page.components[i];
            const id = String(c?.identifier || "");
            const oid = String(c?.objID || "");
            if (id.startsWith(prefix) || oid.startsWith(prefix)) {
                page.components.splice(i, 1);
            }
        }
    }
    if (Array.isArray(page.connectionLines)) {
        for (let i = page.connectionLines.length - 1; i >= 0; i--) {
            if (String(page.connectionLines[i]?.objID || "").startsWith(prefix)) {
                page.connectionLines.splice(i, 1);
            }
        }
    }
}

/** Build the hidden (fully transparent) dismiss layer behind the range popups.
 *  It covers the grid area below the screen title, sitting above the grid but
 *  below the row popups. Tapping it (anywhere outside the open popup) closes
 *  the popup without dimming the page or hiding the title — the same
 *  tap-outside-to-dismiss UX as the device dialog. UI-only: marked
 *  `paramGridPopup` so it never reaches the device. */
function makeRangeBackdrop(
    baseId: string,
    x: number,
    y: number,
    w: number,
    h: number
): Record<string, any> {
    const ts = Date.now().toString(36);
    const uid = `${baseId}_${ts}_${_cellCounter++}`;
    return {
        objID: uid,
        type: "LVGLPanelWidget",
        left: x,
        top: y,
        width: w,
        height: h,
        leftUnit: "px",
        topUnit: "px",
        widthUnit: "px",
        heightUnit: "px",
        customInputs: [],
        customOutputs: [],
        hiddenFlagType: "literal",
        hiddenFlag: "true",
        clickableFlag: true,
        clickableFlagType: "literal",
        checkedStateType: "literal",
        disabledStateType: "literal",
        widgetFlags:
            "CLICKABLE|ADV_HITTEST|CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
        states: "",
        style: {
            objID: `${uid}_style_ref_${ts}`,
            useStyle: "default",
            conditionalStyles: [],
            childStyles: [],
        },
        localStyles: {
            objID: `${uid}_style_${ts}`,
            definition: {
                MAIN: {
                    DEFAULT: {
                        bg_color: "#000000",
                        bg_opa: RANGE_POPUP_BACKDROP_OPA,
                        radius: 0,
                        // No border / shadow: the dismiss layer must be fully
                        // invisible (it only catches taps outside the popup).
                        border_color: "#000000",
                        border_width: 0,
                        border_opa: 0,
                        shadow_width: 0,
                        shadow_opa: 0,
                        pad_left: 0,
                        pad_right: 0,
                        pad_top: 0,
                        pad_bottom: 0,
                    },
                },
            },
        },
        groupIndex: 0,
        eventHandlers: [{ eventName: "CLICKED", handlerType: "flow" }],
        timeline: "",
        children: "",
        identifier: baseId,
        // UI-only: firmware-export drops paramGridPopup widgets.
        paramGridPopup: true,
    };
}

/** Create one hidden popup per Range row on the `parameters` page and wire it
 *  to the row's Range cell:
 *    - Range cell CLICKED            → show the backdrop + that row's popup
 *    - popup dropdown VALUE_CHANGED  → hide the popup + backdrop (range picked)
 *    - backdrop CLICKED (tap outside)→ hide the backdrop + all popups
 *  Uses the same LVGLActionComponent + connectionLine wiring the loader uses
 *  for device popups (SysModePanel etc.), so it executes in EEZ Run mode. All
 *  artifacts are marked `paramGridPopup` (dropped again on export). */
function attachRangePopupEditors(
    page: any,
    container: any,
    panel: any,
    pointType: ParameterPointType,
    rangeRows: RangeRowMeta[],
    fontName: string,
    titleFont: string,
    textColor: string,
    headerColor: string
): void {
    if (!rangeRows.length) return;

    const comps = page.components || (page.components = []);
    const lines = page.connectionLines || (page.connectionLines = []);

    // Center the popup over the parameters content area (container1). The
    // panels inside it are scrollable and can be taller than the viewport, so
    // use the container's visible region rather than the (deep) panel geometry.
    const containerLeft = Number(container?.left) || 0;
    const containerTop = Number(container?.top) || 0;
    const containerW = Number(container?.width) || 480;
    const containerH = Number(container?.height) || 280;
    const popupX =
        containerLeft + Math.max(0, Math.round((containerW - RANGE_POPUP_WIDTH) / 2));
    const popupY =
        containerTop + Math.max(0, Math.round((containerH - RANGE_POPUP_HEIGHT) / 2));

    // Hidden (transparent) dismiss backdrop sized to the grid panel's VISIBLE
    // area (its scroll viewport), starting below the screen's title bar. It
    // therefore never dims/hides the "Parameter Setup" header and does not
    // extend down past the visible grid into the strip below (Update button
    // area). Pushed before any popup so the row popups draw on top of it.
    const titleBar = (page.components || []).find(
        c =>
            c &&
            c.type === "LVGLPanelWidget" &&
            typeof c.identifier === "string" &&
            c.identifier.startsWith("change_config_title")
    );
    const titleBottom = titleBar
        ? (Number(titleBar.top) || 0) + (Number(titleBar.height) || 40)
        : containerTop + 40;
    const panelLeft = containerLeft + (Number(panel?.left) || 0);
    const panelTop = containerTop + (Number(panel?.top) || 0);
    const panelW =
        panel && Number(panel?.width) > 0 ? Number(panel.width) : containerW;
    const panelH =
        panel && Number(panel?.height) > 0
            ? Number(panel.height)
            : Math.max(0, containerH - Math.max(0, titleBottom - containerTop));
    const gridBottom = Math.min(panelTop + panelH, containerTop + containerH);
    let dismissTop = Math.min(Math.max(panelTop, titleBottom), gridBottom);
    let dismissH = Math.max(0, gridBottom - dismissTop);
    // Fallback: if the panel reports no usable viewport, cover from below the
    // title to the bottom of the content area so the backdrop still exists.
    if (dismissH <= 0) {
        dismissTop = Math.min(
            containerTop + containerH,
            Math.max(containerTop, titleBottom)
        );
        dismissH = Math.max(0, containerTop + containerH - dismissTop);
    }
    const backdropBase = `range_popup_${pointType}_backdrop`;
    const backdrop = makeRangeBackdrop(
        backdropBase,
        panelLeft,
        dismissTop,
        panelW,
        dismissH
    );
    comps.push(backdrop);

    // Stack the popup action components below any the loader already made.
    let top = 1000;
    for (const c of comps) {
        if (c && c.type === "LVGLActionComponent" && typeof c.top === "number") {
            top = Math.max(top, c.top + 70);
        }
    }

    // Shared backdrop actions: show it (when any Range cell is clicked) and
    // hide it (when a range is picked or the backdrop itself is tapped).
    const showBgAid = genObjId(`${backdropBase}_show`);
    comps.push({
        objID: showBgAid,
        type: "LVGLActionComponent",
        left: 20,
        top,
        width: 350,
        height: 50,
        customInputs: [],
        customOutputs: [],
        actions: [
            {
                objID: genObjId(`${backdropBase}_show_a`),
                action: "objSetFlagHidden",
                object: backdropBase,
                objectType: "literal",
                hidden: false,
                hiddenType: "literal",
            },
        ],
        paramGridPopup: true,
    });
    top += 70;
    const hideBgAid = genObjId(`${backdropBase}_hide`);
    comps.push({
        objID: hideBgAid,
        type: "LVGLActionComponent",
        left: 20,
        top,
        width: 350,
        height: 50,
        customInputs: [],
        customOutputs: [],
        actions: [
            {
                objID: genObjId(`${backdropBase}_hide_a`),
                action: "objSetFlagHidden",
                object: backdropBase,
                objectType: "literal",
                hidden: true,
                hiddenType: "literal",
            },
        ],
        paramGridPopup: true,
    });
    top += 70;

    for (const meta of rangeRows) {
        const base = `range_popup_${pointType}_r${meta.rowIndex}`;
        const { panel: popup, dropdown } = makeRangePopup(
            base,
            pointType,
            meta.pt,
            fontName,
            titleFont,
            textColor,
            headerColor,
            popupX,
            popupY
        );
        comps.push(popup);

        // Show this row's popup (and the backdrop) when its Range cell is clicked.
        const showAid = genObjId(`${base}_show`);
        comps.push({
            objID: showAid,
            type: "LVGLActionComponent",
            left: 20,
            top,
            width: 350,
            height: 50,
            customInputs: [],
            customOutputs: [],
            actions: [
                {
                    objID: genObjId(`${base}_show_a`),
                    action: "objSetFlagHidden",
                    object: `${base}_panel`,
                    objectType: "literal",
                    hidden: false,
                    hiddenType: "literal",
                },
            ],
            paramGridPopup: true,
        });
        lines.push({
            objID: genObjId(`${base}_show_c`),
            source: meta.cell.objID,
            output: "CLICKED",
            target: showAid,
            input: "@seqin",
        });
        lines.push({
            objID: genObjId(`${base}_show_bg_c`),
            source: meta.cell.objID,
            output: "CLICKED",
            target: showBgAid,
            input: "@seqin",
        });
        top += 70;

        // Hide the popup once a range is picked inside it, or when the user
        // taps outside it (the backdrop). Picking also hides the backdrop.
        const hideAid = genObjId(`${base}_hide`);
        comps.push({
            objID: hideAid,
            type: "LVGLActionComponent",
            left: 20,
            top,
            width: 350,
            height: 50,
            customInputs: [],
            customOutputs: [],
            actions: [
                {
                    objID: genObjId(`${base}_hide_a`),
                    action: "objSetFlagHidden",
                    object: `${base}_panel`,
                    objectType: "literal",
                    hidden: true,
                    hiddenType: "literal",
                },
            ],
            paramGridPopup: true,
        });
        lines.push({
            objID: genObjId(`${base}_hide_c`),
            source: dropdown.objID,
            output: "VALUE_CHANGED",
            target: hideAid,
            input: "@seqin",
        });
        lines.push({
            objID: genObjId(`${base}_pick_c`),
            source: dropdown.objID,
            output: "VALUE_CHANGED",
            target: hideBgAid,
            input: "@seqin",
        });
        lines.push({
            objID: genObjId(`${base}_dismiss_c`),
            source: backdrop.objID,
            output: "CLICKED",
            target: hideAid,
            input: "@seqin",
        });
        top += 70;
    }

    // Tapping the backdrop also hides the backdrop itself.
    lines.push({
        objID: genObjId(`${backdropBase}_dismiss_c`),
        source: backdrop.objID,
        output: "CLICKED",
        target: hideBgAid,
        input: "@seqin",
    });
}

/**
 * Fill the `parameters` screen's scrollable panel with a default grid.
 * Returns the number of cell widgets added (0 if the panel wasn't found).
 */
export function generateParameterGrid(
    project: any,
    points: InputPointData[],
    options?: ParameterGridOptions
): { added: number } {
    const page = (project.userPages || []).find(
        p => p.name === (options?.pageName || "parameters")
    );
    if (!page) return { added: 0 };

    const container = (page.components || []).find(
        c => c.identifier === (options?.containerId || "container1")
    );
    if (!container) return { added: 0 };

    const pointType: ParameterPointType = options?.pointType ?? "input";
    const panelId = options?.panelId || PANEL_BY_TYPE[pointType] || "panel4";
    // Drop any range-popup artifacts this point type generated on a previous
    // run so re-imports/regenerations never stack duplicate popups/wiring.
    cleanupRangePopupEditors(page, pointType);
    // Each point type renders into its own stacked panel. The primary panel
    // (panel4 = INPUT) exists from the imported screen; the output/variable
    // panels are created by cloning it on first use.
    let panel = (container.children || []).find(
        c => c.identifier === panelId
    );
    if (!panel) {
        const primary = (container.children || []).find(
            c => c.identifier === PANEL_BY_TYPE.input
        );
        if (!primary) return { added: 0 };
        panel = cloneParamPanel(primary, panelId);
        container.children.push(panel);
    }
    const isPrimary = panelId === PANEL_BY_TYPE.input;
    const columns = COLUMN_SETS[pointType] || COLUMN_SETS.input;
    const maxRows = options?.maxRows ?? 15;
    const rowH = options?.rowHeight ?? 24;
    const fontName = options?.fontName ?? "MONTSERRAT_12";

    // Ensure the chosen font is present in the project so it renders.
    const projectFonts = project.fonts || (project.fonts = []);
    if (!projectFonts.some((f: any) => f && f.name === fontName)) {
        const size = parseInt(String(fontName.split("_")[1] || "12"), 10) || 12;
        projectFonts.push({ name: fontName, source: { size } });
    }
    // Larger font used for the range-picker popup title.
    const popupTitleFont = bumpFontSize(fontName, RANGE_POPUP_TITLE_FONT_DELTA);
    if (!projectFonts.some((f: any) => f && f.name === popupTitleFont)) {
        const size = parseInt(String(popupTitleFont.split("_")[1] || "12"), 10) || 12;
        projectFonts.push({ name: popupTitleFont, source: { size } });
    }
    const textColor = options?.textColor ?? "#FFFFFF";
    const headerColor = options?.headerColor ?? "#9CC8F5";

    // Idempotent: drop any previously generated grid cells.
    const existing = Array.isArray(panel.children) ? panel.children : [];
    panel.children = existing.filter((c: any) => !(c && c.paramGrid));

    const cells: Record<string, any>[] = [];
    /** Clickable Range cells (one per data row) — each opens its own popup. */
    const rangeRows: RangeRowMeta[] = [];
    const headerY = 4;

    // Header row
    for (const col of columns) {
        cells.push(
            makeCell(
                `param_grid_${pointType}_header_${col.key}`,
                col.x,
                headerY,
                col.w,
                rowH,
                col.title,
                headerColor,
                fontName,
                true
            )
        );
    }

    // Data rows (up to maxRows)
    const rows = (points || []).slice(0, maxRows);
    rows.forEach((pt, r) => {
        const y = headerY + rowH + 2 + r * rowH;
        for (const col of columns) {
            if (col.key === "range") {
                // Range cells are clickable LABELS in the grid. Clicking one
                // opens a "Select digital range .." popup (a hidden panel with
                // an LVGL dropdown of the point's range options) — the editor
                // analog of the device's native range dialog. UI-only: on
                // export these cells go back to static labels and the popups
                // are dropped (paramGridPopup).
                const cell = makeCell(
                    `param_grid_${pointType}_r${r}_c${col.key}`,
                    col.x,
                    y,
                    col.w,
                    rowH,
                    gridCellText(pt, col.key, pointType),
                    textColor,
                    fontName,
                    false,
                    { clickable: true, eventName: "CLICKED" }
                );
                cells.push(cell);
                rangeRows.push({ rowIndex: r, pt, cell });
            } else {
                cells.push(
                    makeCell(
                        `param_grid_${pointType}_r${r}_c${col.key}`,
                        col.x,
                        y,
                        col.w,
                        rowH,
                        gridCellText(pt, col.key, pointType),
                        textColor,
                        fontName,
                        false
                    )
                );
            }
        }
    });

    panel.children.push(...cells);

    // Make the panel scrollable so >~8 rows can be reached (device used
    // scroll_dir: BOTH on this panel).
    const flags = panel.widgetFlags || "";
    if (flags.indexOf("SCROLLABLE") === -1) {
        panel.widgetFlags = [
            "CLICKABLE",
            "CLICK_FOCUSABLE",
            "GESTURE_BUBBLE",
            "SNAPPABLE",
            "SCROLLABLE",
            "SCROLL_CHAIN_HOR",
            "SCROLL_CHAIN_VER",
            "SCROLL_ELASTIC",
            "SCROLL_MOMENTUM",
            "SCROLL_WITH_ARROW",
        ].join("|");
    }
    panel.flagScrollDirection = "all"; // LV_DIR_ALL (both directions; EEZ enum has no "BOTH")
    panel.flagScrollbarMode = panel.flagScrollbarMode || "AUTO";

    // Position the primary grid right below the title bar (no empty space at
    // top) and give it a distinct background so it separates from the page
    // background. Cloned panels keep the primary's geometry (copied at clone
    // time) — only the primary re-positions the title bar.
    if (isPrimary) {
        const titleTopMargin = options?.titleTopMargin ?? 8;
        const titleBar = (page.components || []).find(
            c => c.identifier === (options?.titleId || "change_config_title2")
        );
        if (titleBar) titleBar.top = titleTopMargin;
        panel.left = 0;
        panel.top = titleTopMargin;
    }
    const d = (panel.localStyles = panel.localStyles || {});
    d.definition = d.definition || {};
    d.definition.MAIN = d.definition.MAIN || {};
    d.definition.MAIN.DEFAULT = {
        ...(d.definition.MAIN.DEFAULT || {}),
        align: "TOP_LEFT",
        bg_color: options?.panelBgColor ?? "#16222F",
        bg_opa: 255,
        border_color: "#2C3E50",
        border_width: 1,
        border_opa: 255,
        radius: 8,
        pad_left: 0,
        pad_right: 0,
        pad_top: 0,
        pad_bottom: 0,
    };

    // Add the "Select digital range .." popups (one per row) + the flow wiring
    // that opens them when a Range cell is clicked.
    attachRangePopupEditors(
        page,
        container,
        panel,
        pointType,
        rangeRows,
        fontName,
        popupTitleFont,
        textColor,
        headerColor
    );

    return { added: cells.length };
}

export interface AllParameterGridsData {
    inputPoints?: InputPointData[];
    outputPoints?: InputPointData[];
    variablePoints?: InputPointData[];
}

export interface AllParameterGridsResult {
    /** Total grid cells added across all three panels. */
    added: number;
    /** Panels that received a grid (e.g. ["panel4","panel4_output","panel4_variable"]). */
    panels: string[];
}

/**
 * Generate the three parameter grids (INPUT/OUTPUT/VARIABLE) into three stacked
 * panels on the `parameters` screen, then wire the main-menu Inputs/Outputs/
 * Variables buttons so run mode shows the matching panel.
 *
 * Firmware model (lv_UserPeram.c): ONE parameters screen + ONE table rebuilt
 * per type when the user enters via the main-menu Inputs/Outputs/Variables
 * button (Event_Cb_ParamInput/Output/VariableShowCallBackFunc). We reproduce
 * that with three overlapping panels:
 *   - panel4 (input)          — visible by default (firmware init PARAM_TABLE_INPUT)
 *   - panel4_output           — hidden until "Outputs" is pressed
 *   - panel4_variable         — hidden until "Variables" is pressed
 */
export function generateAllParameterGrids(
    project: any,
    data: AllParameterGridsData,
    options?: ParameterGridOptions
): AllParameterGridsResult {
    let added = 0;
    const panels: string[] = [];
    const types: ParameterPointType[] = ["input", "output", "variable"];
    for (const t of types) {
        const pts = data[`${t}Points` as keyof AllParameterGridsData] || [];
        const res = generateParameterGrid(project, pts as InputPointData[], {
            ...options,
            pointType: t,
        });
        added += res.added;
        if (res.added) panels.push(PANEL_BY_TYPE[t]);
    }

    // Default visible grid = INPUT (matches firmware s_param_table_type init).
    setParamPanelHidden(project, PANEL_BY_TYPE.input, false);
    setParamPanelHidden(project, PANEL_BY_TYPE.output, true);
    setParamPanelHidden(project, PANEL_BY_TYPE.variable, true);

    // Keep the Update button on top: it must stay the last child of container1
    // (LVGL renders later siblings on top), matching the firmware where the
    // button overlays the table.
    const page = (project.userPages || []).find(p => p.name === "parameters");
    const container = (page?.components || []).find(
        c => c.identifier === "container1"
    );
    if (container && Array.isArray(container.children)) {
        const updateBtn = container.children.find(
            (c: any) => c.identifier === "parameter_update_btn"
        );
        if (updateBtn) {
            container.children = container.children.filter(
                (c: any) => c !== updateBtn
            );
            container.children.push(updateBtn);
        }
    }

    wireParameterGridSwitch(project);

    return { added, panels };
}

function setParamPanelHidden(project: any, panelId: string, hidden: boolean): void {
    const page = (project.userPages || []).find(p => p.name === "parameters");
    const container = (page?.components || []).find(
        c => c.identifier === "container1"
    );
    const panel = (container?.children || []).find(c => c.identifier === panelId);
    if (!panel) return;
    if (hidden) {
        panel.hiddenFlagType = "literal";
        panel.hiddenFlag = "true";
    } else {
        // no hidden flag => visible (matches the imported primary panel)
        delete panel.hiddenFlag;
        panel.hiddenFlagType = "literal";
    }
}

/**
 * Wire the main-menu Inputs/Outputs/Variables buttons (img_button1/2/3) to show
 * the matching parameters panel and hide the other two — mirroring the
 * firmware's Event_Cb_ParamInput/Output/VariableShowCallBackFunc. Each button
 * already has a changeScreen→parameters flow; we add objSetFlagHidden actions
 * (the same action the loader uses for home-screen mode panels) chained off the
 * button's CLICKED event.
 */
function wireParameterGridSwitch(project: any): void {
    const mm = (project.userPages || []).find(p => p.name === "main_menu");
    if (!mm) return;

    const findWidget = (root: any, id: string): any => {
        const queue: any[] = [root];
        while (queue.length) {
            const cur = queue.shift();
            if (!cur) continue;
            if (cur.identifier === id) return cur;
            for (const ch of cur.children || []) queue.push(ch);
            for (const c of cur.components || []) queue.push(c);
        }
        return null;
    };

    const buttons: Record<string, any> = {
        input: findWidget(mm, "img_button1"),
        output: findWidget(mm, "img_button2"),
        variable: findWidget(mm, "img_button3"),
    };
    if (!buttons.input || !buttons.output || !buttons.variable) return;

    // Stack the new flow components below the ones the loader already created.
    let top = 1000;
    for (const c of mm.components || []) {
        if (c.type === "LVGLActionComponent" && typeof c.top === "number") {
            top = Math.max(top, c.top + 60);
        }
    }
    const comps = mm.components || (mm.components = []);
    const lines = mm.connectionLines || (mm.connectionLines = []);

    // Idempotent: drop any switch actions/lines this module added before
    // (objID prefix "param_switch") so re-imports don't stack duplicates.
    for (let i = comps.length - 1; i >= 0; i--) {
        if (String(comps[i].objID).startsWith("param_switch")) comps.splice(i, 1);
    }
    for (let i = lines.length - 1; i >= 0; i--) {
        if (String(lines[i].objID).startsWith("param_switch")) lines.splice(i, 1);
    }

    for (const type of Object.keys(buttons) as ParameterPointType[]) {
        const btn = buttons[type];
        const showId = PANEL_BY_TYPE[type];
        const hideIds = (Object.keys(PANEL_BY_TYPE) as ParameterPointType[])
            .filter(t => t !== type)
            .map(t => PANEL_BY_TYPE[t]);
        // Always show the selected panel and hide the other two. The INPUT
        // panel also gets an explicit "show": otherwise, after switching to
        // Outputs/Variables (which hide INPUT) and coming back, clicking
        // Inputs would only hide the other two and INPUT stays hidden → the
        // input grid appears empty.
        const actions: Array<{ id: string; hidden: boolean }> = [
            ...hideIds.map(id => ({ id, hidden: true })),
            { id: showId, hidden: false },
        ];
        for (const a of actions) {
            const aid = genObjId("param_switch");
            comps.push({
                objID: aid,
                type: "LVGLActionComponent",
                left: 20,
                top,
                width: 350,
                height: 50,
                customInputs: [],
                customOutputs: [],
                actions: [
                    {
                        objID: genObjId("param_switch_a"),
                        action: "objSetFlagHidden",
                        object: a.id,
                        objectType: "literal",
                        hidden: a.hidden,
                        hiddenType: "literal",
                    },
                ],
            });
            lines.push({
                objID: genObjId("param_switch_c"),
                source: btn.objID,
                output: "CLICKED",
                target: aid,
                input: "@seqin",
            });
            top += 60;
        }
    }
}
