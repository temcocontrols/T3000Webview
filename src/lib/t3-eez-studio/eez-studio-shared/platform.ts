/* eslint-disable */
/**
 * platform.ts — Browser-compatible replacements for Electron APIs
 *
 * Replaces:
 *   - clipboard from "electron"     → navigator.clipboard
 *   - shell from "electron"         → window.open
 *   - getCurrentWindow from "@electron/remote" → no-op / mock
 */

////////////////////////////////////////////////////////////////////////////////
// Clipboard
////////////////////////////////////////////////////////////////////////////////

export const clipboard = {
    writeText(text: string): void {
        navigator.clipboard.writeText(text).catch(err => {
            console.error("clipboard.writeText failed:", err);
            // Fallback for older browsers
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        });
    },

    readText(): string {
        // Clipboard read requires user gesture + permission in browser
        console.warn("clipboard.readText is not available in browser");
        return "";
    },

    writeBuffer(_format: string, _buffer: Buffer): void {
        console.warn("clipboard.writeBuffer is not available in browser");
    },

    readBuffer(_format: string): Buffer {
        console.warn("clipboard.readBuffer is not available in browser");
        return Buffer.alloc(0);
    },

    write(data: any, _type?: string): void {
        if (typeof data === "string") {
            this.writeText(data);
        } else {
            console.warn("clipboard.write (non-text) is not available in browser");
        }
    }
};

////////////////////////////////////////////////////////////////////////////////
// Shell (open external URLs, show in folder, etc.)
////////////////////////////////////////////////////////////////////////////////

export const shell = {
    openExternal(url: string): Promise<void> {
        window.open(url, "_blank", "noopener,noreferrer");
        return Promise.resolve();
    },

    openPath(_path: string): Promise<string> {
        console.warn("shell.openPath is not available in browser");
        return Promise.resolve("");
    },

    showItemInFolder(_path: string): void {
        console.warn("shell.showItemInFolder is not available in browser");
    },

    beep(): void {
        // no-op in browser
    }
};

////////////////////////////////////////////////////////////////////////////////
// Window management
////////////////////////////////////////////////////////////////////////////////

export function getCurrentWindow(): { show: () => void } {
    // In a browser, there's no separate window concept — return a no-op
    return {
        show() {
            // Already visible in browser
        }
    };
}
