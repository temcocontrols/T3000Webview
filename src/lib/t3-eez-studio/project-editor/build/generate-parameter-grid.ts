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

import { getRangeLabel as inputRangeLabel } from "../../../../t3-react/features/inputs/data/rangeData";
import { getRangeLabel as outputRangeLabel } from "../../../../t3-react/features/outputs/data/rangeData";
import { getRangeLabel as variableRangeLabel } from "../../../../t3-react/features/variables/data/rangeData";

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
    isHeader: boolean
): Record<string, any> {
    const ts = Date.now().toString(36);
    const uid = `${identifier}_${ts}_${_cellCounter++}`;
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
        clickableFlag: false,
        clickableFlagType: "literal",
        checkedStateType: "literal",
        disabledStateType: "literal",
        widgetFlags: "CLICK_FOCUSABLE|GESTURE_BUBBLE|SNAPPABLE",
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
        eventHandlers: [],
        timeline: "",
        children: "",
        text,
        textType: "literal",
        identifier,
        // Marker so the editor can hide/lock the auto-generated grid cells.
        paramGrid: true,
    };
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
    const panel = (container?.children || []).find(
        c => c.identifier === (options?.panelId || "panel4")
    );
    if (!panel) return { added: 0 };

    const pointType: ParameterPointType = options?.pointType ?? "input";
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
    const textColor = options?.textColor ?? "#FFFFFF";
    const headerColor = options?.headerColor ?? "#9CC8F5";

    // Idempotent: drop any previously generated grid cells.
    const existing = Array.isArray(panel.children) ? panel.children : [];
    panel.children = existing.filter((c: any) => !(c && c.paramGrid));

    const cells: Record<string, any>[] = [];
    const headerY = 4;

    // Header row
    for (const col of columns) {
        cells.push(
            makeCell(
                `param_grid_header_${col.key}`,
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
            cells.push(
                makeCell(
                    `param_grid_r${r}_c${col.key}`,
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

    // Add a little top margin to the title bar so it isn't flush against the
    // top edge, and move the grid down by the same amount to stay aligned.
    const titleTopMargin = options?.titleTopMargin ?? 8;
    const titleBar = (page.components || []).find(
        c => c.identifier === (options?.titleId || "change_config_title2")
    );
    if (titleBar) titleBar.top = titleTopMargin;

    // Position the grid right below the title bar (no empty space at top) and
    // give it a distinct background so it separates from the page background.
    panel.left = 0;
    panel.top = titleTopMargin;
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

    return { added: cells.length };
}
