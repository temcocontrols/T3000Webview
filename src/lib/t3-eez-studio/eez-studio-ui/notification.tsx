import React from "react";
import {
    Toaster,
    useToastController,
    Toast,
    ToastTitle,
    ToastIntent,
    FluentProvider,
    webLightTheme,
} from "@fluentui/react-components";

// ── Module-level refs to the Fluent UI toast controller ──────────────

type ToastController = ReturnType<typeof useToastController>;

let _dispatchToast: ToastController["dispatchToast"] | null = null;
let _dismissToast: ToastController["dismissToast"] | null = null;
let _updateToast: ToastController["updateToast"] | null = null;

// ── Toast ID wrapper ─────────────────────────────────────────────────

export type ToastId = string;

let _nextId = 0;

function nextId(): ToastId {
    return `ntf-${++_nextId}`;
}

// ── Internal ToastContainer component ─────────────────────────────────

const ToastContainer: React.FC = () => {
    const { dispatchToast, dismissToast, updateToast } = useToastController("eez-notification");

    React.useEffect(() => {
        _dispatchToast = dispatchToast;
        _dismissToast = dismissToast;
        _updateToast = updateToast;
        return () => {
            _dispatchToast = null;
            _dismissToast = null;
            _updateToast = null;
        };
    }, [dispatchToast, dismissToast, updateToast]);

    return (
        <Toaster
            toasterId="eez-notification"
            position="top-end"
            pauseOnHover
            closeOnClick
        />
    );
};

// ── Container (replaces react-toastify's ToastContainer) ──────────────

export const container: React.ReactElement = (
    <FluentProvider theme={webLightTheme}>
        <ToastContainer />
    </FluentProvider>
);

// ── Public API (same signatures as before) ───────────────────────────

function dispatch(message: string, intent: ToastIntent, autoClose: number | false = 3000): ToastId {
    const id = nextId();
    if (!_dispatchToast) {
        console.warn("[notification] Toaster not mounted, cannot show:", message);
        return id;
    }

    _dispatchToast(
        <Toast>
            <ToastTitle>{message}</ToastTitle>
        </Toast>,
        {
            toastId: id,
            intent,
            timeout: autoClose === false ? -1 : autoClose,
            position: "top-end",
        } as any
    );

    return id;
}

export function info(message: string, options?: { autoClose?: number | false }): ToastId {
    return dispatch(message, "info", options?.autoClose ?? 3000);
}

export function success(message: string, options?: { autoClose?: number | false }): ToastId {
    return dispatch(message, "success", options?.autoClose ?? 3000);
}

export function warn(message: string, options?: { autoClose?: number | false }): ToastId {
    return dispatch(message, "warning", options?.autoClose ?? 3000);
}

export function error(message: string, options?: { autoClose?: number | false }): ToastId {
    return dispatch(message, "error", options?.autoClose ?? false);
}

export function update(toastId: ToastId, options: { message?: string; autoClose?: number | false }): void {
    if (!_updateToast) return;
    // Fluent UI update: re-render the toast with new content
    _updateToast({
        toastId,
        content: options.message ? (
            <Toast>
                <ToastTitle>{options.message}</ToastTitle>
            </Toast>
        ) : undefined,
        timeout: options.autoClose === false ? -1 : (options.autoClose ?? 3000),
    } as any);
}

export function dismiss(toastId: ToastId): void {
    if (!_dismissToast) return;
    _dismissToast(toastId);
}

// ── Type exports (keep backward compat) ───────────────────────────────

export const INFO = "info";
export const SUCCESS = "success";
export const WARNING = "warning";
export const ERROR = "error";

export type Type = typeof INFO | typeof SUCCESS | typeof WARNING | typeof ERROR;
export type ProgressId = ToastId;
