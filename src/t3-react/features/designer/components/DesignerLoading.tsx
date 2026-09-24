/**
 * Designer — the shell's **one** loading state.
 *
 * Everything a designer route waits for is drawn with this component, and with nothing else:
 *
 *   · the document chunk (the host module and the engine it pulls in) — the route's `<Suspense>`
 *     fallback, `pages/DesignerRouteFallback.tsx`, which also covers the host chunk because
 *     `DesignerPage` adds no boundary of its own;
 *   · the document's own data (a drawing, a project) — `DocumentRuntime.loading`, which the shell draws
 *     as an overlay over the canvas (`DesignerShell`, `styles.overlay`).
 *
 * Why one component instead of one spinner per phase: the waits are **sequential but look like three
 * different events** when each draws its own wording and its own position — the route fallback used to
 * be `Loading...` in a padded row pinned to the top-left, the document boundary `Loading document…`
 * centered in the middle area, Fluent's `Spinner label` a third layout. Measured on
 * `#/t3000/designer/hvac-schematic` (throttled, so the phases are readable):
 *
 *     `Loading...` @ (42,122)  35.4 s → 36.7 s
 *     `Loading document…` @ (335,219)  36.7 s → 38.2 s   ← same wait, moved and re-worded
 *
 * Three things make the phases read as one load instead:
 *
 *   · **one sentence**, named per document — `kinds.ts#designerLoadingLabel`: `Loading HVAC Drawing…` is
 *     what the route shows, and the same text is what the document shows when it waits for its own data
 *     (a drawing, a project);
 *   · **one position** — pinned top-left (`placement`, default `top`). Centered in an empty pane it read
 *     as a placeholder for something that had failed, and it put the eye in the middle of nothing;
 *   · **one typography** — a 12 px regular label in the muted foreground, i.e. the treatment the Design
 *     Hub's and the documentation's loading rows already use, so no loading state reads louder than the
 *     content it announces.
 *
 * The box is a **column** that fills its host (`flex: 1` + `height: 100%`), so `top`/`center` place the
 * box while the row inside keeps the spinner and the label centred against each other. It fits both hosts
 * it is given: the middle area's flex column (route fallback, LCD document) and the shell's absolutely
 * positioned overlay.
 */
import React from "react";
import { Spinner, Text, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
    /*
     * A column, so the box can be pinned to the top-left while the row inside it keeps its own vertical
     * centring: with `align-items: flex-start` on the row, a spinner that is taller than the label would
     * sit its top edge on the label's, which is what made the first version look slightly off.
     */
    root: {
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        width: "100%",
        height: "100%",
        minHeight: 0
    },
    /**
     * Pinned to the **top-left** of the area it fills (user request, 2026-09-24). Centered, it sat in the
     * middle of an empty pane and read as a placeholder for something that had failed; here it sits where
     * the content is about to start, on the same left edge as the app's other loading rows (`App.tsx`'s
     * "Loading Design Hub …", the documentation one).
     */
    top: {
        alignItems: "flex-start",
        justifyContent: "flex-start",
        padding: "14px 20px"
    },
    /** The old placement, kept for a caller that wants it. */
    center: {
        alignItems: "center",
        justifyContent: "center"
    },
    /** The row itself: spinner and label kept centred against each other whatever the box around it does. */
    row: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    /**
     * Normal text, not a caption and not a headline: the app's small caption size (`fontSizeBase200`, 12 px)
     * in a muted foreground — the same treatment the Design Hub's and the documentation's loading rows use,
     * so no loading state anywhere in the app reads louder than the content it announces.
     */
    label: {
        color: tokens.colorNeutralForeground2
    }
});

export interface DesignerLoadingProps {
    /** What is being loaded — `Loading HVAC Drawing…` — rather than a bare "Loading…". */
    label?: string;
    /**
     * `top` (default) pins the row to the top of the area it fills: the shell's middle area, or the
     * document's own overlay. `center` keeps the earlier centered placement.
     */
    placement?: "top" | "center";
}

export const DesignerLoading: React.FC<DesignerLoadingProps> = ({
    label = "Loading designer…",
    placement = "top"
}) => {
    const styles = useStyles();

    return (
        /* `data-designer-loading` — a stable hook for measurements/tests, which the three inline
           fallbacks this replaces could never offer (they were unrelated divs with unrelated text). */
        <div
            className={`${styles.root} ${placement === "top" ? styles.top : styles.center}`}
            data-designer-loading="true"
            data-designer-loading-placement={placement}
            role="status"
            aria-live="polite"
        >
            <div className={styles.row}>
                <Spinner size="tiny" />
                <Text size={200} className={styles.label}>
                    {label}
                </Text>
            </div>
        </div>
    );
};
