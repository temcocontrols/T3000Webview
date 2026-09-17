/**
 * EEZ project editor — "hosted" mode.
 *
 * The unified Designer shell (P2) renders the project's panels in its own regions and keeps the
 * **canvas** for the active editor. EEZ must therefore stop drawing its own FlexLayout workbench,
 * otherwise every panel would exist twice (once in the shell's region, once in EEZ's container).
 *
 * This is a one-way flag rather than a prop because the component that has to change
 * (`ProjectEditor.Content`) is mounted deep inside EEZ's own React root — the shell is a *different*
 * root and cannot pass props into it. It must be set before EEZ mounts, which the shell can guarantee:
 * `EezStudioApp` mounts the EEZ root only after a dynamic import plus the backend health check.
 *
 * Default `false`, so the un-hosted path is exactly what it always was.
 */
let hosted = false;

/** Turns hosted mode on/off. Idempotent; safe to call from an effect. */
export function setProjectEditorHosted(value: boolean): void {
    hosted = value;
}

export function isProjectEditorHosted(): boolean {
    return hosted;
}
