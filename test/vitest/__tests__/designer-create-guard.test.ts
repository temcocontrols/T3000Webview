/**
 * The create hand-off must never delete a project folder that already existed.
 *
 * Regression net for the data-loss bug found on 2026-09-17: the retry cleaned up the target folder after a
 * failed attempt, so creating a project with a name that was already taken deleted the user's project (and
 * then wrote a fresh template in its place). These cases pin the rule, including the identity edge cases
 * (`location` with a trailing slash, case differences, nested locations).
 */
import { describe, expect, it } from "vitest";

import {
    folderNameOf,
    projectFoldersOf,
    retryPlan,
    targetExists
} from "../../../src/t3-react/app/designerCreateGuard";

describe("designer create guard", () => {
    it("reads the project list out of the body the endpoint actually sends", () => {
        // The real body (`/api/eez-studio/projects`, measured 2026-09-20) is an OBJECT with a `projects`
        // array. An array-only check answered "cannot read", and the create guard treats that as a collision —
        // so every create was told its name was taken, and the create was skipped.
        expect(
            projectFoldersOf({ projects: [{ folder: "LVGL 9.5" }, { folder: "T3-LB-ESP_SN1028" }] })
        ).toEqual(["LVGL 9.5", "T3-LB-ESP_SN1028"]);
        // A bare array is still accepted, for a body shape the API may send elsewhere.
        expect(projectFoldersOf([{ folder: "smart-home" }])).toEqual(["smart-home"]);
        // …and a name that is not in that list is **not** a collision.
        expect(
            targetExists(
                (projectFoldersOf({ projects: [{ folder: "LVGL 9.5" }] }) ?? []).map(folder => ({ folder })),
                "project/LVGL 9.5 2"
            )
        ).toBe(false);
    });

    it("reports 'unknown' — not 'exists' — for a body it cannot read", () => {
        expect(projectFoldersOf(undefined)).toBeUndefined();
        expect(projectFoldersOf(null)).toBeUndefined();
        expect(projectFoldersOf({})).toBeUndefined();
        expect(projectFoldersOf({ projects: "nope" })).toBeUndefined();
        expect(projectFoldersOf("<html>error</html>")).toBeUndefined();
        // An empty list IS readable: nothing exists.
        expect(projectFoldersOf({ projects: [] })).toEqual([]);
        // A project entry without a folder name contributes an empty name (never a match).
        expect(projectFoldersOf({ projects: [{ name: "no folder field" }] })).toEqual([""]);
    });

    it("reduces a location/name target to the folder name", () => {
        expect(folderNameOf("project/LVGL 9.5")).toBe("lvgl 9.5");
        expect(folderNameOf("project/LVGL 9.5/")).toBe("lvgl 9.5");
        expect(folderNameOf("LVGL 9.5")).toBe("lvgl 9.5");
        expect(folderNameOf("project\\LVGL 9.5")).toBe("lvgl 9.5");
        expect(folderNameOf("  project/Nested/Deep  ")).toBe("deep");
        expect(folderNameOf("")).toBe("");
        expect(folderNameOf(null)).toBe("");
    });

    it("recognises an existing project, ignoring case and the path prefix", () => {
        const projects = [
            { folder: "smart-home" },
            { folder: "LVGL 9.5" },
            { folder: "T3-LB-ESP_SN1028" }
        ];

        expect(targetExists(projects, "project/LVGL 9.5")).toBe(true);
        expect(targetExists(projects, "project/lvgl 9.5")).toBe(true);
        expect(targetExists(projects, "project/SMART-HOME")).toBe(true);
        expect(targetExists(projects, "project/Brand New")).toBe(false);
    });

    it("says 'does not exist' rather than throwing on a missing/empty list", () => {
        expect(targetExists([], "project/Anything")).toBe(false);
        expect(targetExists(undefined, "project/Anything")).toBe(false);
        expect(targetExists(null, "project/Anything")).toBe(false);
        // No usable name ⇒ nothing to match, so nothing may be deleted on the strength of it.
        expect(targetExists([{ folder: "" }], "project/")).toBe(false);
        expect(targetExists([{ folder: "anything" }], "")).toBe(false);
    });

    it("never retries or cleans up a folder that existed before the run", () => {
        for (const attempt of [1, 2, 3]) {
            expect(retryPlan(true, attempt), `attempt ${attempt}`).toEqual({
                retry: false,
                cleanup: false
            });
        }
    });

    it("keeps the original retry behaviour for a folder this run created", () => {
        expect(retryPlan(false, 1)).toEqual({ retry: true, cleanup: true });
        expect(retryPlan(false, 2)).toEqual({ retry: true, cleanup: true });
        expect(retryPlan(false, 3)).toEqual({ retry: false, cleanup: true });
        expect(retryPlan(false, 3, 5)).toEqual({ retry: true, cleanup: true });
    });
});
