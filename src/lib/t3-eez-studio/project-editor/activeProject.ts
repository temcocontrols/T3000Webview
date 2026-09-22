/**
 * EEZ project editor — the active `ProjectStore` and its **root layout model**, published for the Designer shell.
 *
 * The shell renders EEZ's panels in its own React root. Those panels read `ProjectContext`, whose value
 * **is** the `ProjectStore` (`<ProjectContext.Provider value={projectStore}>`,
 * `React.Context<ProjectStore>` in `home/tabs-store.tsx:457`), so the shell has to be able to get hold
 * of the live store — which EEZ creates per project tab, deep inside its own root.
 *
 * `ProjectEditorView` publishes it when it mounts (i.e. when a project is open) and clears it when it
 * unmounts, so the shell can render a "no project" state instead of crashing on a missing context.
 *
 * ## Why the layout model is published too
 *
 * `layoutModels.root` is a **computed**, not a constant: EEZ swaps it wholesale per mode
 * (`store/layout-models.tsx:226-234` — `rootEditor` · `rootRuntime` (Run/Debug) · `rootDockerSimulator`
 * (Full Sim)), and the shell draws its side panels *from that model*. Before this, the projection was
 * memoised on the store alone, so clicking **Run** kept the editor's panels on screen (measured: still
 * *Pages / Widgets Structure / Properties*, while EEZ itself had already switched to the runtime page).
 *
 * The swap happens inside EEZ's own code (`setRuntimeMode`, `onSetFullSimulatorMode`) with no call site to
 * hook, hence the `autorun` — it is the only way to notice. It watches the *computed root*, so it fires on a
 * mode change and on nothing else (a tab click does not change which model is the root).
 *
 * The **mode** (`EezEditorMode`) is published as well, because the model alone does not describe what EEZ
 * draws: in Run mode the runtime page is drawn *instead of* the workbench, so the model is beside the point.
 * See the type's own comment.
 *
 * Deliberately tiny hand-rolled stores (no mobx on the reader side, no React): the publisher lives in the EEZ
 * tree and the subscriber in the app tree, and `useSyncExternalStore` on the shell side gives exact,
 * tearing-free subscriptions.
 */
import { autorun, type IReactionDisposer } from "mobx";
import type * as FlexLayout from "flexlayout-react";

import { ProjectEditor } from "project-editor/project-editor-interface";

import type { ProjectStore } from "project-editor/store";

let activeProject: ProjectStore | undefined = undefined;
let activeLayoutModel: FlexLayout.Model | undefined = undefined;
let activeEditorMode: EezEditorMode = "none";
let activePageEditor = false;
let layoutSelection: LayoutSelection = { revision: 0 };
let modelWatch: IReactionDisposer | undefined;
const listeners = new Set<() => void>();
const modelListeners = new Set<() => void>();
const modeListeners = new Set<() => void>();
const pageEditorListeners = new Set<() => void>();
const selectionListeners = new Set<() => void>();

/** Notifies every subscriber of one of the snapshots. */
function notify(targets: Set<() => void>): void {
    for (const listener of [...targets]) {
        listener();
    }
}

/**
 * What EEZ is drawing in its **content area** — the thing the shell's regions have to match.
 *
 * The distinction between `run` and `debug` is not cosmetic: `ProjectEditor.Content` returns the runtime page
 * **before** it looks at the model when the runtime is on without the debugger (`ProjectEditor.tsx:312-331`),
 * so in `run` there is no workbench to mirror at all — the runtime page fills the area and the panels a model
 * would describe are simply not drawn. Mirrored naively (no mode), the shell kept its panels in Run mode and
 * drew the *debugger* layout, which is what the user saw.
 */
export type EezEditorMode = "none" | "edit" | "run" | "debug" | "full-sim";

/** The mode a store is in *now* — observable reads only, so the watch below re-runs when any of it changes. */
function modeOf(projectStore: ProjectStore | undefined): EezEditorMode {
    if (!projectStore?.layoutModels) {
        // No layout models: not a project-editor context (EEZ's `run-tab` stores). Nothing to mirror.
        return projectStore ? "run" : "none";
    }

    if (projectStore.layoutModels.isDockerSimulatorMode) {
        return "full-sim";
    }

    if (projectStore.runtime) {
        return projectStore.runtime.isDebuggerActive ? "debug" : "run";
    }

    return "edit";
}

/** Called by `ProjectEditorView` on mount/unmount. */
export function publishActiveProject(projectStore: ProjectStore | undefined): void {
    if (activeProject === projectStore) {
        return;
    }

    activeProject = projectStore;

    /*
     * Keep the published model/mode in step with the store. `autorun` runs once immediately, so a project
     * that opens in Run mode publishes the runtime state without waiting for a change. Disposed before the
     * next watch is installed, and when the project closes.
     */
    modelWatch?.();
    modelWatch = undefined;

    if (projectStore) {
        modelWatch = autorun(() => {
            publishActiveEditorMode(modeOf(projectStore));
            publishActiveLayoutModel(projectStore.layoutModels?.root);
            publishActivePageEditor(isPageEditorActive(projectStore));
            publishPageStatus(pageStatusOf(projectStore));
        });
    } else {
        publishActiveEditorMode("none");
        publishActiveLayoutModel(undefined);
        publishActivePageEditor(false);
        publishPageStatus(NO_PAGE_STATUS);
    }

    notify(listeners);
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

/**
 * The **root** layout model of the open project — the model the shell projects its panels from.
 *
 * Its identity changes when EEZ switches mode (edit · run/debug · full simulator), which is exactly the
 * signal the shell needs; it is stable across everything else.
 */
export function getActiveLayoutModel(): FlexLayout.Model | undefined {
    return activeLayoutModel;
}

/** Subscribe to root-model changes; returns the unsubscribe function. */
export function subscribeActiveLayoutModel(listener: () => void): () => void {
    modelListeners.add(listener);
    return () => {
        modelListeners.delete(listener);
    };
}

/** Called by the watch above — identity-checked, so a re-render of the same model notifies nobody. */
function publishActiveLayoutModel(model: FlexLayout.Model | undefined): void {
    if (activeLayoutModel === model) {
        return;
    }

    activeLayoutModel = model;
    notify(modelListeners);
}

/** The mode EEZ's content area is in — `"none"` while no project is open. */
export function getActiveEditorMode(): EezEditorMode {
    return activeEditorMode;
}

/** Subscribe to mode changes; returns the unsubscribe function. */
export function subscribeActiveEditorMode(listener: () => void): () => void {
    modeListeners.add(listener);
    return () => {
        modeListeners.delete(listener);
    };
}

function publishActiveEditorMode(mode: EezEditorMode): void {
    if (activeEditorMode === mode) {
        return;
    }

    activeEditorMode = mode;
    notify(modeListeners);
}

/**
 * Is the **active editor a page** — i.e. is there a *Widgets Structure* to show?
 *
 * EEZ's left area has a second column holding the *Widgets Structure* panel (`flow-structure` →
 * `PageStructure`), and that panel is bound to the **active editor**: it reads `editorsStore.activeEditor`
 * and only answers for a `PageClass` (`PagesNavigation.tsx:78-92`). For every other editor — the Settings
 * editor, a flow editor — it falls back to `EezStudio_PageStructure_NoPageSelected`, which is a *flat,
 * empty* block (`project-editor.less:4208`: `height: 100%; background-color: @panelHeaderColor`).
 *
 * Measured live with the Settings editor open: that column drew 186 × 673 px of dead grey beside the
 * Components Palette (and pushed the canvas 186 px to the right). The shell drops the column whenever this
 * is false — the same rule it already applies to a region with no panels at all. (The origin keeps it,
 * blank: nothing in EEZ hides it, because the flexlayout model is static.)
 */
function isPageEditorActive(projectStore: ProjectStore | undefined): boolean {
    const activeEditor = projectStore?.editorsStore?.activeEditor;

    // `ProjectEditor` is an empty object until `initProjectEditor` fills it in, so `PageClass` can be
    // missing while a project is still booting.
    const PageClass = (ProjectEditor as { PageClass?: new (...args: any[]) => any }).PageClass;
    if (!activeEditor || !PageClass) {
        return false;
    }

    return activeEditor.object instanceof PageClass;
}

/** Is a page editor the active one? (`false` while no project is open.) */
export function getActivePageEditor(): boolean {
    return activePageEditor;
}

/** Subscribe to page-editor changes; returns the unsubscribe function. */
export function subscribeActivePageEditor(listener: () => void): () => void {
    pageEditorListeners.add(listener);
    return () => {
        pageEditorListeners.delete(listener);
    };
}

function publishActivePageEditor(isPageEditor: boolean): void {
    if (activePageEditor === isPageEditor) {
        return;
    }

    activePageEditor = isPageEditor;
    notify(pageEditorListeners);
}

/**
 * What the open project has to say in the status bar: the **active page**, its size, and whether the project
 * has unsaved changes.
 *
 * `name` stays empty unless the workbench is showing a page editor — Settings and the flow editors have no
 * page, and Run/Debug/Full Sim draw the runtime *instead of* the workbench (see `modeOf`), so there is no page
 * on screen to name.
 *
 * `modified` is `projectStore.isModified`, the real flag. Without it the shared bar's Saved/Unsaved chip says
 * "Saved" for this document forever, because the only producer of the app-wide status publisher is HVAC's.
 *
 * Value-compared before notifying: the watch below also reads `isModified`, so it re-runs on **every edit**,
 * and only an actual change (the flag flipping, a page switch, a page resize) may reach the subscribers.
 */
export interface EezPageStatus {
    name: string;
    width: number;
    height: number;
    modified: boolean;
}

const NO_PAGE_STATUS: EezPageStatus = { name: "", width: 0, height: 0, modified: false };

let pageStatus: EezPageStatus = NO_PAGE_STATUS;
const pageStatusListeners = new Set<() => void>();

/** The active page and the dirty flag of the open project (`name` is empty when no page is on screen). */
export function getPageStatus(): EezPageStatus {
    return pageStatus;
}

/** Subscribe to page-status changes; returns the unsubscribe function. */
export function subscribePageStatus(listener: () => void): () => void {
    pageStatusListeners.add(listener);
    return () => {
        pageStatusListeners.delete(listener);
    };
}

function publishPageStatus(next: EezPageStatus): void {
    if (
        pageStatus.name === next.name &&
        pageStatus.width === next.width &&
        pageStatus.height === next.height &&
        pageStatus.modified === next.modified
    ) {
        return;
    }

    pageStatus = next;
    notify(pageStatusListeners);
}

/** Observable reads only, so the watch notices a page switch, a page resize and the first edit. */
function pageStatusOf(projectStore: ProjectStore | undefined): EezPageStatus {
    if (!projectStore || modeOf(projectStore) !== "edit") {
        return NO_PAGE_STATUS;
    }

    const object = projectStore.editorsStore?.activeEditor?.object as
        | { name?: unknown; width?: unknown; height?: unknown }
        | undefined;
    const PageClass = (ProjectEditor as { PageClass?: new (...args: any[]) => any }).PageClass;
    const isPage = !!object && !!PageClass && object instanceof PageClass;

    return {
        name: isPage && typeof object?.name === "string" ? object.name : "",
        width: isPage && typeof object?.width === "number" ? object.width : 0,
        height: isPage && typeof object?.height === "number" ? object.height : 0,
        modified: !!projectStore.isModified
    };
}

/**
 * The last panel selection, published for the hosted Designer shell.
 *
 * The shell projects its regions from the flexlayout model, and it can only recompute when the model's
 * *identity* changes — but a selection (`doAction(selectTab)`) mutates the same object. So `revision` changes
 * on **every** selection, whoever made it, to force that recompute.
 *
 * `tabId` says *which* panel was asked for, and that is what lets the shell keep the two kinds of selection
 * apart: EEZ opening a panel for the user (*Check* → Checks, a failed Build → Output, a search → Search
 * References) versus the shell's own side strips, which select through the very same
 * `LayoutModels.selectTab`. Only the former may pop the bottom dock open — the user's report was "I click User
 * Widgets / User Actions and the bottom panel shows up too". The shell's own dock strip does not go through
 * `selectTab` at all (it uses the raw model action, because a border toggles), so it can never reveal either.
 *
 * Like the other snapshots it is a value for `useSyncExternalStore`; the object is replaced per selection so
 * the snapshot identity changes exactly once.
 */
export interface LayoutSelection {
    /** Bumped on every selection (EEZ's or the shell's) — the projection's recompute trigger. */
    revision: number;
    /** The tab that was asked for, or `undefined` for the initial state. */
    tabId?: string;
}

export function getLayoutSelection(): LayoutSelection {
    return layoutSelection;
}

/** Subscribe to selections; returns the unsubscribe function. */
export function subscribeLayoutSelection(listener: () => void): () => void {
    selectionListeners.add(listener);
    return () => {
        selectionListeners.delete(listener);
    };
}

/** Called by `LayoutModels.selectTab` — see `LayoutSelection`. */
export function notifyLayoutSelectionChange(tabId?: string): void {
    layoutSelection = { revision: layoutSelection.revision + 1, tabId };
    notify(selectionListeners);
}
