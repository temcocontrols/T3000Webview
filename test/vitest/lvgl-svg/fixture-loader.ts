/**
 * Shared fixture loader for the LVGL SVG renderer tests.
 *
 * Lives outside `__tests__/` on purpose: the vitest `include` pattern collects
 * `test/vitest/__tests__/**` + `src/**\/*.vitest.*`, so this file is a plain helper and is
 * never executed as a test suite.
 *
 * Fixtures are parsed through the real `parseScene`, so every test implicitly asserts that the
 * scene contract accepts them.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseScene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";
import type { Scene } from "../../../src/lib/t3-eez-studio/project-editor/lvgl/svg/scene";

export const FIXTURES = [
    "boxes",
    "indicators",
    "text",
    "media",
    "dashboard",
    "kitchen-sink",
] as const;

export function loadFixture(name: string): Scene {
    // Resolved from the vitest root rather than import.meta.url: under vitest the module URL
    // does not always carry the project prefix, which silently resolved to C:\test\... .
    const path = resolve(
        process.cwd(),
        "test/vitest/fixtures/lvgl-svg",
        `${name}.json`
    );
    return parseScene(readFileSync(path, "utf8"));
}
