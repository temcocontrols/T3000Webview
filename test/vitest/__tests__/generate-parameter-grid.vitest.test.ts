import { describe, it, expect } from "vitest";
import {
    generateParameterGrid,
    generateAllParameterGrids,
    gridCellText,
    PANEL_BY_TYPE,
} from "../../../src/lib/t3-eez-studio/project-editor/build/generate-parameter-grid";

const BASE = "http://localhost:3003/api/eez-studio";
const enc = encodeURIComponent;
const projectPath = "project/T3-XX-ESP11113/T3-XX-ESP11113.eez-project";

async function loadProject() {
    return JSON.parse(
        await (await fetch(`${BASE}/read-text-file?path=${enc(projectPath)}`)).text()
    );
}

async function saveProject(proj: any) {
    const w = await fetch(`${BASE}/write-text-file?path=${enc(projectPath)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proj),
    });
    expect(w.status).toBe(200);
}

function paramPanel(proj: any, panelId: string) {
    const page = proj.userPages.find((p: any) => p.name === "parameters");
    const container = page.components.find((c: any) => c.identifier === "container1");
    return container.children.find((c: any) => c.identifier === panelId);
}

describe("parameter grid generation", () => {
    it("maps raw point codes to display text", () => {
        expect(gridCellText({ label: "", fullLabel: "AHU-1 Supply Temp1s" }, "label")).toBe("AHU-1 Supply Temp1s");
        expect(gridCellText({ fValue: "-40000" }, "value")).toBe("-40000");
        expect(gridCellText({ autoManual: "0" }, "am")).toBe("Auto");   // firmware: 0=Auto
        expect(gridCellText({ autoManual: "1" }, "am")).toBe("Manual"); // firmware: 1=Manual
        expect(gridCellText({ digitalAnalog: "1" }, "da")).toBe("Analog");
        expect(gridCellText({ digitalAnalog: "0" }, "da")).toBe("Digital");
        expect(gridCellText({ control: "0" }, "ctrl")).toBe("0"); // firmware shows raw control
        expect(gridCellText({ control: "1" }, "ctrl")).toBe("1");
        expect(gridCellText({ digitalAnalog: "0", rangeField: "2" }, "range")).toBe("Close/Open");
        expect(gridCellText({ digitalAnalog: "0", rangeField: "0" }, "range")).toBe("Unused");
    });

    it("generates a grid into the current project from the DB and verifies", async () => {
        const proj = await loadProject();
        const sn = proj.importedFrom?.serialNumber;
        const pointsResp = await fetch(`http://localhost:3003/api/t3_device/devices/${sn}/input-points`);
        const pointsData = await pointsResp.json();
        const inputPoints = pointsData.input_points || [];
        expect(inputPoints.length).toBeGreaterThan(0);

        const { added } = generateParameterGrid(proj, inputPoints, { maxRows: 15 });
        expect(added).toBe(15 * 6 + 6); // 15 rows x 6 cols + 6 header

        const panel = paramPanel(proj, PANEL_BY_TYPE.input);
        const cells = panel.children.filter((c: any) => c.paramGrid);
        expect(cells.length).toBe(15 * 6 + 6);
        expect(panel.flagScrollDirection).toBe("all"); // LV_DIR_ALL (both directions)
        expect(panel.widgetFlags).toContain("SCROLLABLE");

        await saveProject(proj);

        const header = cells.find((c: any) => c.identifier === "param_grid_input_header_label");
        const firstRowRange = cells.find((c: any) => c.identifier === "param_grid_input_r0_crange");
        console.log("header label:", header && header.text);
        console.log("row0 range:", firstRowRange && firstRowRange.text);
        console.log("input row0:", cells.slice(6, 12).map((c: any) => c.text).join(" | "));
    }, 30000);

    it("generates an OUTPUT grid into its own panel (firmware fields: +SW col), hidden by default", async () => {
        const proj = await loadProject();
        const sn = proj.importedFrom?.serialNumber;
        const resp = await fetch(`http://localhost:3003/api/t3_device/devices/${sn}/output-points`);
        const data = await resp.json();
        const outputPoints = data.output_points || [];
        expect(outputPoints.length).toBeGreaterThan(0);

        const { added } = generateParameterGrid(proj, outputPoints, {
            pointType: "output",
            maxRows: 15,
        });
        // output columns = 7 (Label, Value, A/M, D/A, Ctrl, SW, Range)
        expect(added).toBe(15 * 7 + 7);

        const panel = paramPanel(proj, PANEL_BY_TYPE.output);
        expect(panel).toBeTruthy(); // auto-cloned from panel4
        const cells = panel.children.filter((c: any) => c.paramGrid);
        expect(cells.length).toBe(15 * 7 + 7);
        const headers = cells
            .filter((c: any) => /^param_grid_output_header_/.test(c.identifier))
            .map((c: any) => c.text);
        expect(headers.join("|")).toBe("Label|Value|A/M|D/A|Ctrl|SW|Range");

        const row0 = cells
            .filter((c: any) => /^param_grid_output_r0_/.test(c.identifier))
            .map((c: any) => c.text);
        console.log("output row0:", row0.join(" | "));

        await saveProject(proj);
    }, 30000);

    it("generates a VARIABLE grid into its own panel (same cols as input, variable range table), hidden by default", async () => {
        const proj = await loadProject();
        const sn = proj.importedFrom?.serialNumber;
        const resp = await fetch(`http://localhost:3003/api/t3_device/devices/${sn}/variable-points`);
        const data = await resp.json();
        const variablePoints = data.variable_points || [];
        expect(variablePoints.length).toBeGreaterThan(0);

        const { added } = generateParameterGrid(proj, variablePoints, {
            pointType: "variable",
            maxRows: 15,
        });
        // variable columns = 6 (Label, Value, A/M, D/A, Ctrl, Range) — no SW
        expect(added).toBe(15 * 6 + 6);

        const panel = paramPanel(proj, PANEL_BY_TYPE.variable);
        expect(panel).toBeTruthy(); // auto-cloned from panel4
        const cells = panel.children.filter((c: any) => c.paramGrid);
        expect(cells.length).toBe(15 * 6 + 6);
        const headers = cells
            .filter((c: any) => /^param_grid_variable_header_/.test(c.identifier))
            .map((c: any) => c.text);
        expect(headers.join("|")).toBe("Label|Value|A/M|D/A|Ctrl|Range");

        const row0 = cells
            .filter((c: any) => /^param_grid_variable_r0_/.test(c.identifier))
            .map((c: any) => c.text);
        console.log("variable row0:", row0.join(" | "));

        await saveProject(proj);
    }, 30000);

    it("generates ALL THREE grids (different fields + data) and wires the main-menu switch", async () => {
        const proj = await loadProject();
        const sn = proj.importedFrom?.serialNumber;

        const [inResp, outResp, varResp] = await Promise.all([
            fetch(`http://localhost:3003/api/t3_device/devices/${sn}/input-points`),
            fetch(`http://localhost:3003/api/t3_device/devices/${sn}/output-points`),
            fetch(`http://localhost:3003/api/t3_device/devices/${sn}/variable-points`),
        ]);
        const [inData, outData, varData] = await Promise.all([
            inResp.json(), outResp.json(), varResp.json(),
        ]);

        const res = generateAllParameterGrids(proj, {
            inputPoints: inData.input_points || [],
            outputPoints: outData.output_points || [],
            variablePoints: varData.variable_points || [],
        });
        expect(res.panels.sort()).toEqual(
            ["panel4", "panel4_output", "panel4_variable"].sort()
        );

        // Panel visibility: input shown, output + variable hidden.
        expect(paramPanel(proj, "panel4").hiddenFlag).toBeUndefined();
        expect(paramPanel(proj, "panel4_output").hiddenFlag).toBe("true");
        expect(paramPanel(proj, "panel4_variable").hiddenFlag).toBe("true");

        // Distinct fields per type.
        const typeOf = (pid: string) =>
            pid === "panel4" ? "input" : pid === "panel4_output" ? "output" : "variable";
        const headers = (pid: string) =>
            paramPanel(proj, pid).children
                .filter((c: any) => new RegExp(`^param_grid_${typeOf(pid)}_header_`).test(c.identifier))
                .map((c: any) => c.text);
        expect(headers("panel4").join("|")).toBe("Label|Value|A/M|D/A|Ctrl|Range");
        expect(headers("panel4_output").join("|")).toBe("Label|Value|A/M|D/A|Ctrl|SW|Range");
        expect(headers("panel4_variable").join("|")).toBe("Label|Value|A/M|D/A|Ctrl|Range");

        // Distinct default data: first data rows must differ.
        const row0 = (pid: string) =>
            paramPanel(proj, pid).children
                .filter((c: any) => new RegExp(`^param_grid_${typeOf(pid)}_r0_`).test(c.identifier))
                .map((c: any) => c.text)
                .join(" | ");
        console.log("input row0   :", row0("panel4"));
        console.log("output row0  :", row0("panel4_output"));
        console.log("variable row0:", row0("panel4_variable"));
        expect(row0("panel4")).not.toBe(row0("panel4_output"));
        expect(row0("panel4_output")).not.toBe(row0("panel4_variable"));

        // Main-menu switch wiring: img_button1/2/3 -> objSetFlagHidden actions.
        const mm = proj.userPages.find((p: any) => p.name === "main_menu");
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
        const inputBtn = findWidget(mm, "img_button1");
        const outputBtn = findWidget(mm, "img_button2");
        const variableBtn = findWidget(mm, "img_button3");
        expect(inputBtn && outputBtn && variableBtn).toBeTruthy();

        const acts = (mm.components || []).filter(
            (c: any) => c.type === "LVGLActionComponent"
        );
        const switchActs = acts.filter((a: any) =>
            (a.actions || []).some((x: any) => x.action === "objSetFlagHidden")
        );
        // input btn: 2 hides; output btn: 2 hides + 1 show; variable btn: 2 hides + 1 show
        expect(switchActs.length).toBe(8);

        const lines = mm.connectionLines || [];
        const switchLines = lines.filter((l: any) =>
            [inputBtn.objID, outputBtn.objID, variableBtn.objID].includes(l.source)
        );
        // 8 switch lines + 3 pre-existing changeScreen→parameters lines.
        expect(switchLines.length).toBe(11);
        expect(
            switchLines.filter((l: any) => String(l.objID).startsWith("param_switch")).length
        ).toBe(8);

        await saveProject(proj);
    }, 30000);
});
