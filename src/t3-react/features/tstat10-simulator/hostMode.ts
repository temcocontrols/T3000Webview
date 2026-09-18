/**
 * LCD / Tstat10 simulator page — "hosted" mode.
 *
 * The unified Designer shell renders the LCD designer's panels in its own regions (Toolbox + Pages in the
 * left region, Properties in the right) and keeps the **canvas** for the design surface. The page must
 * therefore stop drawing those panels itself, otherwise each one would exist twice.
 *
 * A one-way flag rather than a prop, for the same reason as `project-editor/hostMode.ts` on the EEZ side:
 * the panels are portalled into the shell's regions, and it is the *page's* render — not the shell's — that
 * has to choose between its two layouts.
 *
 * Default `false`: un-hosted, the page is exactly what it always was.
 */
let hosted = false;

/** Turns hosted mode on/off. Idempotent; safe to call from an effect. */
export function setLcdPageHosted(value: boolean): void {
    hosted = value;
}

/**
 * True while the unified Designer shell owns the layout. The page then renders only the canvas and portals
 * its panels into the shell's slots (`hostedSlots.ts`).
 */
export function isLcdPageHosted(): boolean {
    return hosted;
}
