/**
 * The delete contract around project data — the frontend half of the backend's `guard_project_delete`.
 *
 * The backend (`api/src/eez_studio/mod.rs`, pinned by its own Rust tests) refuses to remove anything that holds
 * a `.eez-project` unless the request says `allowProject=true`. That makes these call sites a matched pair, and
 * both halves break quietly:
 *
 *  - the **deliberate** deletes must opt in, or the hub's "Delete project" and EEZ's "Remove project" start
 *    failing with 409 — nobody notices until a user reports a project that will not go away;
 *  - the **automatic** cleanup in the create hand-off must never opt in. That path is what deleted a user's
 *    project on 2026-09-17; opting in there would re-arm it, and the loss would surface much later.
 *
 * Source-scanning on purpose (same idiom as `designer-shell.test.tsx`): the contract spans four files that are
 * not otherwise importable in a unit test — two vendored engine files, a bridge and a React effect.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

/** Text following every `delete-recursive` occurrence — the URL and its options. */
function deleteCalls(source: string, window = 300): string[] {
    const calls: string[] = [];
    let index = source.indexOf("delete-recursive");
    while (index !== -1) {
        calls.push(source.slice(index, index + window));
        index = source.indexOf("delete-recursive", index + 1);
    }
    return calls;
}

describe("project delete contract", () => {
    it("the deliberate deletes opt in to deleting project data", () => {
        const files = [
            "src/t3-react/features/design-hub/services/projectCatalog.ts",
            "src/lib/t3-eez-studio/home/open-projects-v2.tsx"
        ];

        for (const file of files) {
            const calls = deleteCalls(read(file));
            expect(calls.length, `${file} should still delete projects deliberately`).toBeGreaterThan(0);
            for (const call of calls) {
                expect(call, `${file}: a deliberate delete must pass allowProject=true`).toContain(
                    "allowProject=true"
                );
            }
        }
    });

    it("the automatic cleanup may opt in only behind the ownership check", () => {
        const app = read("src/t3-react/app/EezStudioApp.tsx");

        // The cleanup runs only for a folder the ownership check *confirmed* absent (the fail-safe answers
        // "exists", so an unreadable list can never reach it) — see `retryPlan` and its unit tests.
        expect(app, "the retry cleanup must stay gated on plan.cleanup").toMatch(
            /if\s*\(plan\.cleanup\s*&&\s*cleanupFolder\)/
        );
        expect(app, "the gate must come from retryPlan(existedBefore, …)").toMatch(/retryPlan\(existedBefore/);

        const calls = deleteCalls(app);
        expect(calls.length).toBeGreaterThan(0);
        for (const call of calls) {
            expect(call, "a half-finished create writes a .eez-project, so this one call must opt in").toContain(
                "allowProject=true"
            );
        }
    });

    it("nothing else automatic opts in", () => {
        const files = [
            // The generic bridge helper: any engine caller goes through it.
            "src/t3-eez-studio/bridge/eez-studio-api.ts",
            // `fs.rmSync`, i.e. recursive deletes issued by engine internals.
            "src/t3-eez-studio/stubs/fs/index.ts"
        ];

        for (const file of files) {
            const calls = deleteCalls(read(file));
            expect(calls.length, `${file} is expected to have a recursive delete`).toBeGreaterThan(0);
            for (const call of calls) {
                expect(call, `${file}: an automatic delete must NOT opt in`).not.toContain("allowProject");
            }
        }
    });

    it("keeps the create hand-off wired to the ownership guard", () => {
        const app = read("src/t3-react/app/EezStudioApp.tsx");

        expect(app).toMatch(/designerCreateGuard/);
        expect(app).toMatch(/targetFolderExists\(/);
        expect(app).toMatch(/retryPlan\(/);
    });
});
