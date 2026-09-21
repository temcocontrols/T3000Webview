/**
 * Designer — resizable panel splitter.
 *
 * Same interaction recipe as `layout/MainLayout.tsx:56-63 (style) / :142-172 (drag math)`:
 * a 4 px column that reports the delta from the drag start so the owner can clamp its own width.
 * Body cursor/user-select are locked during the drag (MainLayout.tsx:246-275 does the same).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";

/**
 * A 1 px line drawn **inside** a 4 px hit area.
 *
 * Fluent offers no splitter, and a 4 px solid bar between two panels is the loudest line on the page — for an
affordance nobody reads, only drags. The line brightens to brand on hover, which is the only cue it needs.
 */
function hairline(direction: "to right" | "to bottom", color: string): string {
    return `linear-gradient(${direction}, transparent 0 1.5px, ${color} 1.5px 2.5px, transparent 2.5px 100%)`;
}

const useStyles = makeStyles({
    vertical: {
        width: "4px",
        flexShrink: 0,
        cursor: "col-resize",
        backgroundImage: hairline("to right", tokens.colorNeutralStroke2),
        transitionProperty: "background-image",
        transitionDuration: "0.15s",
        ":hover": { backgroundImage: hairline("to right", tokens.colorBrandBackground) }
    },
    horizontal: {
        height: "4px",
        flexShrink: 0,
        cursor: "row-resize",
        backgroundImage: hairline("to bottom", tokens.colorNeutralStroke2),
        transitionProperty: "background-image",
        transitionDuration: "0.15s",
        ":hover": { backgroundImage: hairline("to bottom", tokens.colorBrandBackground) }
    },
    verticalActive: {
        backgroundImage: hairline("to right", tokens.colorBrandBackground)
    },
    horizontalActive: {
        backgroundImage: hairline("to bottom", tokens.colorBrandBackground)
    }
});

export interface ShellSplitterProps {
    orientation: "vertical" | "horizontal";
    /** Called with the total delta (px) since the drag started. */
    onDrag: (deltaPx: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    title?: string;
}

export const ShellSplitter: React.FC<ShellSplitterProps> = ({
    orientation,
    onDrag,
    onDragStart,
    onDragEnd,
    title
}) => {
    const styles = useStyles();
    const [dragging, setDragging] = useState(false);

    const originRef = useRef(0);
    const onDragRef = useRef(onDrag);
    onDragRef.current = onDrag;

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            event.preventDefault();
            originRef.current = orientation === "vertical" ? event.clientX : event.clientY;
            setDragging(true);
            onDragStart?.();
        },
        [orientation, onDragStart]
    );

    useEffect(() => {
        if (!dragging) {
            return;
        }

        const handleMove = (event: PointerEvent) => {
            const current = orientation === "vertical" ? event.clientX : event.clientY;
            onDragRef.current(current - originRef.current);
        };

        const handleUp = () => {
            setDragging(false);
            onDragEnd?.();
        };

        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.cursor = orientation === "vertical" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleUp);

        return () => {
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
            window.removeEventListener("pointercancel", handleUp);
        };
    }, [dragging, orientation]);

    return (
        <div
            role="separator"
            aria-orientation={orientation}
            title={title}
            onPointerDown={handlePointerDown}
            className={mergeClasses(
                orientation === "vertical" ? styles.vertical : styles.horizontal,
                dragging ? (orientation === "vertical" ? styles.verticalActive : styles.horizontalActive) : ""
            )}
        />
    );
};
