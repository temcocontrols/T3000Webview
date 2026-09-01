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
    if (!container) return { added: 0 };

    const pointType: ParameterPointType = options?.pointType ?? "input";
    const panelId = options?.panelId || PANEL_BY_TYPE[pointType] || "panel4";
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
        const actions: Array<{ id: string; hidden: boolean }> =
            hideIds.map(id => ({ id, hidden: true }));
        // Only emit a "show" action when the target isn't the default-visible
        // INPUT panel (it's already visible; showing it again is a no-op).
        if (showId !== PANEL_BY_TYPE.input) {
            actions.push({ id: showId, hidden: false });
        }
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
