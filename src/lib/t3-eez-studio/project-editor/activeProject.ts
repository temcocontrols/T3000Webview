/**
 * EEZ project editor — the active `ProjectStore`, published for the Designer shell.
 *
 * The shell renders EEZ's panels in its own React root. Those panels read `ProjectContext`, whose value
 * **is** the `ProjectStore` (`<ProjectContext.Provider value={projectStore}>`,
 * `React.Context<ProjectStore>` in `home/tabs-store.tsx:457`), so the shell has to be able to get hold
 * of the live store — which EEZ creates per project tab, deep inside its own root.
 *
 * `ProjectEditorView` publishes it when it mounts (i.e. when a project is open) and clears it when it
 * unmounts, so the shell can render a "no project" state instead of crashing on a missing context.
 *
 * Deliberately a tiny hand-rolled store (no mobx, no React): the publisher lives in the EEZ tree and the
 * subscriber in the app tree, and `useSyncExternalStore` on the shell side gives an exact, tearing-free
 * subscription.
 */
import type { ProjectStore } from "project-editor/store";

let activeProject: ProjectStore | undefined = undefined;
const listeners = new Set<() => void>();

/** Called by `ProjectEditorView` on mount/unmount. */
export function publishActiveProject(projectStore: ProjectStore | undefined): void {
    if (activeProject === projectStore) {
        return;
    }

    activeProject = projectStore;

    for (const listener of [...listeners]) {
        listener();
    }
}

/** The project currently open, or undefined while a project is loading/closing. */
export function getActiveProject(): ProjectStore | undefined {
    return activeProject;
}

/** Subscribe to changes; returns the unsubscribe function. */
export function subscribeActiveProject(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
