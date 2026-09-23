/**
 * Designer — publisher for the app-wide editor status contract.
 *
 * The contract already exists and is documented (`docs/t3000/design-hub/README.md:134`):
 *   producer  `features/design-hub/hooks/useEditorCommands.tsx:31` dispatches it
 *   consumer  `features/design-hub/components/EditorStatusBar.tsx:44-45` listens
 * …but nothing dispatched it before the Designer (the HVAC page passes props instead).
 *
 * Emitting through this factory keeps the shell and the adapters decoupled: an adapter publishes,
 * the status bar renders, and no engine prop-drills into the shell.
 */
import type { EditorStatus, StatusPublisher } from "./DocumentAdapter";

export const EDITOR_STATUS_EVENT = "t3-editor-status";

export function createStatusPublisher(): StatusPublisher {
    return {
        set(partial: EditorStatus) {
            window.dispatchEvent(new CustomEvent<EditorStatus>(EDITOR_STATUS_EVENT, { detail: partial }));
        },
        clear() {
            window.dispatchEvent(new CustomEvent<EditorStatus>(EDITOR_STATUS_EVENT, { detail: {} }));
        }
    };
}

/** Shared instance — a document is mounted one at a time (D3), so one publisher is enough. */
export const statusPublisher = createStatusPublisher();
