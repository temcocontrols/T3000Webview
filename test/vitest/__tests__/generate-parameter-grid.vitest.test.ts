import { describe, it, expect } from "vitest";
import { generateParameterGrid, gridCellText } from "../../../src/lib/t3-eez-studio/project-editor/build/generate-parameter-grid";

const BASE = "http://localhost:3003/api/eez-studio";
const enc = encodeURIComponent;
const projectPath = "project/T3-XX-ESP11113/T3-XX-ESP11113.eez-project";

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
        const proj = JSON.parse(
            await (await fetch(`${BASE}/read-text-file?path=${enc(projectPath)}`)).text()
        );
        const sn = proj.importedFrom?.serialNumber;
        const pointsResp = await fetch(`http://localhost:3003/api/t3_device/devices/${sn}/input-points`);
        const pointsData = await pointsResp.json();
        const inputPoints = pointsData.input_points || [];
        expect(inputPoints.length).toBeGreaterThan(0);

        const { added } = generateParameterGrid(proj, inputPoints, { maxRows: 15 });
        expect(added).toBe(15 * 6 + 6); // 15 rows x 6 cols + 6 header

        const page = proj.userPages.find(p => p.name === "parameters");
        const container = page.components.find(c => c.identifier === "container1");
        const panel = container.children.find(c => c.identifier === "panel4");
        const cells = panel.children.filter((c: any) => c.paramGrid);
        expect(cells.length).toBe(15 * 6 + 6);
        expect(panel.flagScrollDirection).toBe("all"); // LV_DIR_ALL (both directions)
        expect(panel.widgetFlags).toContain("SCROLLABLE");

        // Write the generated grid back to the project so it's visible now
        const w = await fetch(`${BASE}/write-text-file?path=${enc(projectPath)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proj),
        });
        expect(w.status).toBe(200);

        // Sample a couple of cell values for the report
        const header = cells.find((c: any) => c.identifier === "param_grid_header_label");
        const firstRowRange = cells.find((c: any) => c.identifier === "param_grid_r0_crange");
        console.log("header label:", header && header.text);
        console.log("row0 range:", firstRowRange && firstRowRange.text);
        console.log("row0 cells:", cells.slice(6, 12).map((c: any) => c.text).join(" | "));
    }, 30000);

    it("generates an OUTPUT grid from the DB (firmware fields: +SW col) and writes it", async () => {
        const proj = JSON.parse(
            await (await fetch(`${BASE}/read-text-file?path=${enc(projectPath)}`)).text()
        );
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

        const page = proj.userPages.find(p => p.name === "parameters");
        const container = page.components.find(c => c.identifier === "container1");
        const panel = container.children.find(c => c.identifier === "panel4");
        const cells = panel.children.filter((c: any) => c.paramGrid);
        expect(cells.length).toBe(15 * 7 + 7);
        const headers = cells
            .filter((c: any) => /^param_grid_header_/.test(c.identifier))
            .map((c: any) => c.text);
        expect(headers.join("|")).toBe("Label|Value|A/M|D/A|Ctrl|SW|Range");

        const row0 = cells
            .filter((c: any) => /^param_grid_r0_/.test(c.identifier))
            .map((c: any) => c.text);
        console.log("output row0:", row0.join(" | "));

        const w = await fetch(`${BASE}/write-text-file?path=${enc(projectPath)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proj),
        });
        expect(w.status).toBe(200);
    }, 30000);

    it("generates a VARIABLE grid from the DB (same cols as input, variable range table)", async () => {
        const proj = JSON.parse(
            await (await fetch(`${BASE}/read-text-file?path=${enc(projectPath)}`)).text()
        );
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

        const page = proj.userPages.find(p => p.name === "parameters");
        const container = page.components.find(c => c.identifier === "container1");
        const panel = container.children.find(c => c.identifier === "panel4");
        const cells = panel.children.filter((c: any) => c.paramGrid);
        expect(cells.length).toBe(15 * 6 + 6);
        const headers = cells
            .filter((c: any) => /^param_grid_header_/.test(c.identifier))
            .map((c: any) => c.text);
        expect(headers.join("|")).toBe("Label|Value|A/M|D/A|Ctrl|Range");

        const row0 = cells
            .filter((c: any) => /^param_grid_r0_/.test(c.identifier))
            .map((c: any) => c.text);
        console.log("variable row0:", row0.join(" | "));

        const w = await fetch(`${BASE}/write-text-file?path=${enc(projectPath)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proj),
        });
        expect(w.status).toBe(200);
    }, 30000);
});
