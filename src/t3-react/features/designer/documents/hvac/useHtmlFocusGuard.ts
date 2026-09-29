/**
 * Designer — keep the HVAC engine's keystrokes out of the shell's own inputs.
 *
 * WHY THIS EXISTS. The engine listens for keys at `window` level (`KeyboardOpt.OnKeyDown` /
 * `OnKeyPress`) and only declines to act when `T3Constant.DocContext.CanTypeInWorkArea` is false. The
 * origin flipped that flag — and recorded the element — whenever one of its own HTML controls took
 * focus (`SDUI.MainController.AcceptHTMLText` → `SDUI.Resources.DocumentContext.HTMLFocusControl`), and
 * dropped focus again when a tool was armed (`SDUI.ShapeController.StampOrDragDropNewShape`).
 *
 * WHAT THE PORT WAS MISSING. Both *readers* survived (`KeyboardOpt` bails on the flag; `LMEvtUtil` and
 * `S.BaseShape` blur the recorded control) but nothing ever wrote either value, so they were inert. The
 * visible defect: with a text object still in edit mode, characters typed into the Properties panel were
 * consumed by the engine as well and appeared in the drawing.
 *
 * THE ONE EXCLUSION is the engine's own text-entry proxy (`#T3TouchProxy`): while that field has focus the
 * engine *must* keep reading keys — that is inline text editing.
 */
import { useEffect } from "react";

import { TEXT_ENTRY_PROXY_ID } from "@/lib/t3-hvac/Data/Constant/AreaIds";
import T3Constant from "@/lib/t3-hvac/Data/Constant/T3Constant";

/** Controls that own the keyboard while focused. */
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true']";

/**
 * Engine-owned fields that must never close the typing gate.
 *
 * - `#T3TouchProxy` — keystrokes there *are* the drawing's text.
 * - the clipboard helpers — `T3Clipboard.FocusOnClipboardInput()` parks focus there after every drawing
 *   mouse-up (that is how the clipboard module recognises an engine copy), so a click on the drawing would
 *   otherwise look exactly like the user typing in a panel.
 */
const ENGINE_OWNED_IDS = new Set([
    TEXT_ENTRY_PROXY_ID,
    "_clipboardInput",
    "_IEclipboardDiv",
    "_crossTabClipboardDiv"
]);

/**
 * True when focus on `element` should silence the engine.
 *
 * The drawing container is focusable (`tabIndex={0}`) but is not editable, so clicking the drawing still
 * hands the keyboard back — which is the behaviour the origin produced with `focusout`.
 */
function ownsTheKeyboard(element: EventTarget | null): element is HTMLElement {
    if (!(element instanceof HTMLElement) || !element.matches(EDITABLE_SELECTOR)) {
        return false;
    }

    // The engine's own fields — keystrokes there are the engine's business.
    return !ENGINE_OWNED_IDS.has(element.id);
}

/**
 * Records the focused HTML control and closes / reopens the engine's typing gate with it.
 *
 * Mount this with the document: the listeners are on `document`, because the controls that steal focus
 * (properties panel, tool panel, shell bands) are siblings of the drawing area, not descendants of it.
 */
export function useHtmlFocusGuard(enabled = true) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const onFocusIn = (event: FocusEvent) => {
            if (!ownsTheKeyboard(event.target)) {
                return;
            }
            T3Constant.DocContext.HTMLFocusControl = event.target;
            T3Constant.DocContext.CanTypeInWorkArea = false;
        };

        const onFocusOut = (event: FocusEvent) => {
            // Only the recorded control may reopen the gate — a later focus keeps it closed.
            if (event.target !== T3Constant.DocContext.HTMLFocusControl) {
                return;
            }
            T3Constant.DocContext.HTMLFocusControl = null;
            T3Constant.DocContext.CanTypeInWorkArea = true;
        };

        document.addEventListener("focusin", onFocusIn);
        document.addEventListener("focusout", onFocusOut);

        return () => {
            document.removeEventListener("focusin", onFocusIn);
            document.removeEventListener("focusout", onFocusOut);

            // Never leave the gate shut behind us: the flag is engine-global and outlives this document.
            T3Constant.DocContext.HTMLFocusControl = null;
            T3Constant.DocContext.CanTypeInWorkArea = true;
        };
    }, [enabled]);
}
