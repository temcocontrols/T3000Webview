/* eslint-disable */
/**
 * dialog-web.tsx — Browser-native replacement for dialog-electron.tsx
 *
 * Same public API, but uses window.confirm() / window.alert() instead of
 * Electron's dialog.showMessageBox().
 *
 * For a richer UI, replace these with custom React modal dialogs later.
 */

////////////////////////////////////////////////////////////////////////////////

export function info(message: string, detail: string | undefined): void {
    alert(message + (detail ? "\n\n" + detail : ""));
}

export function error(message: string, detail: string | undefined): void {
    alert("Error: " + message + (detail ? "\n\n" + detail : ""));
}

export async function confirm(
    message: string,
    detail: string | undefined,
    callback: () => void,
    cancelCallback?: () => void
): Promise<void> {
    const result = window.confirm(
        message + (detail ? "\n\n" + detail : "")
    );
    if (result) {
        callback();
    } else if (cancelCallback) {
        cancelCallback();
    }
}

export async function confirmPromise(
    message: string,
    detail: string | undefined
): Promise<boolean> {
    return window.confirm(message + (detail ? "\n\n" + detail : ""));
}

export async function confirmWithButtons(
    message: string,
    detail: string | undefined,
    buttons: string[]
): Promise<number> {
    // Simplified — only supports 2-button confirm for now.
    // For multi-button, a custom React dialog should be used.
    if (buttons.length <= 2) {
        const result = window.confirm(
            message + (detail ? "\n\n" + detail : "")
        );
        return result ? 0 : 1;
    }
    // Fallback: always return first button
    return 0;
}
