
import "src/t3-eez-studio/bridge/browser-polyfill";

import { useEffect, useState } from "react";
import { initEezBridge, checkBackendHealth } from "src/t3-eez-studio/bridge/eez-studio-api";
import "src/t3-eez-studio/bridge/eez-registry";
import { ipcRenderer } from "electron";

// ── EEZ top-menu → IPC channel map ────────────────────────────────
// Header's File/Edit/View/Help menus dispatch `eez-studio-action` CustomEvents
// (Header.tsx handleEezAction). Map each channel to the embedded EEZ Studio's
// IPC channel, which is handled by home/main.tsx + home/tabs-store.tsx.
const EEZ_ACTION_TO_IPC: Record<string, string | { channel: string; args?: any[] }> = {
    // File
    "new-project": "new-project",
    "add-instrument": "add-instrument",
    "open": "open-project", // opens a file picker (electron-kitchen)
    "reload-project": "reload-project",
    "save": "save",
    "save-as": "saveAs",
    "check": "check",
    "build": "build",
    "build-extensions": "build-extensions",
    "build-and-install-extensions": "build-and-install-extensions",
    // Edit
    "undo": "undo",
    "redo": "redo",
    "cut": "cut",
    "copy": "copy",
    "paste": "paste",
    "delete": "delete",
    "select-all": "select-all",
    "find-project-component": "findProjectComponent",
    // View
    "openTab-home": { channel: "openTab", args: ["home"] },
    "openTab-history": { channel: "openTab", args: ["history"] },
    "openTab-shortcutsAndGroups": { channel: "openTab", args: ["shortcutsAndGroups"] },
    "openTab-homeSection_notebooks": { channel: "openTab", args: ["home"] },
    "openTab-extensions": { channel: "openTab", args: ["extensions"] },
    "openTab-settings": { channel: "openTab", args: ["settings"] },
    "showScrapbookManager": "showScrapbookManager",
    "switch-theme": "switch-theme",
    "toggle-components-palette": "toggleComponentsPalette",
    "reset-layout": "resetLayoutModels",
    "show-next-tab": "show-next-tab",
    "show-previous-tab": "show-previous-tab",
    "reload": "reload",
    // Help
    "show-documentation-browser": "show-documentation-browser",
    "show-about-box": "show-about-box",
};
// No-op in browser: new-window, close-window, exit, toggle-fullscreen,
// toggle-devtools, zoom-in, zoom-out, reset-zoom, import-instrument-def
import "bootstrap/dist/css/bootstrap.min.css";
import { makeStyles, mergeClasses, Spinner, FluentProvider, webLightTheme } from "@fluentui/react-components";
import { CheckmarkCircleRegular, ErrorCircleRegular } from "@fluentui/react-icons";

// EEZ Studio stylesheets
import "eez-studio-ui/_stylesheets/main.less";
import "eez-studio-ui/_stylesheets/main-dark-runtime.less";
import "flexlayout-react/style/light.css";

const useBackendStyles = makeStyles({
    bar: {
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        padding: "8px 14px",
        fontSize: "11.5px",
        lineHeight: "1.5",
        flexShrink: 0,
        transition: "opacity 0.4s ease, height 0.3s ease, padding 0.3s ease",
    },
    barOnline: {
        backgroundColor: "#dff6dd",
        color: "#0e700e",
        borderBottom: "1px solid #c7e7cb",
    },
    barOffline: {
        backgroundColor: "#fff4ce",
        color: "#8a5d00",
        borderBottom: "1px solid #f0d98f",
    },
    barChecking: {
        backgroundColor: "#f0f6ff",
        color: "#323130",
        borderBottom: "1px solid #d0e4f7",
    },
    barHidden: {
        opacity: 0,
        height: "0px",
        padding: "0px 14px",
        overflow: "hidden",
        borderBottom: "none",
    },
    icon: {
        fontSize: "14px",
        flexShrink: 0,
        marginTop: "1px",
    },
    iconOnline: { color: "#0e700e" },
    iconOffline: { color: "#8a5d00" },
    iconChecking: { color: "#0f6cbd" },
});

function BackendStatusBar() {
    const s = useBackendStyles();
    const [health, setHealth] = useState<boolean | undefined>(undefined);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        checkBackendHealth().then(h => {
            setHealth(h);
            if (h) {
                setTimeout(() => setVisible(false), 3000);
            }
        });
    }, []);

    const barClass = mergeClasses(
        s.bar,
        health === undefined ? s.barChecking : health ? s.barOnline : s.barOffline,
        !visible && s.barHidden
    );

    const icon = health === undefined ? (
        <Spinner size="extra-tiny" className={s.icon} />
    ) : health ? (
        <CheckmarkCircleRegular className={mergeClasses(s.icon, s.iconOnline)} />
    ) : (
        <ErrorCircleRegular className={mergeClasses(s.icon, s.iconOffline)} />
    );

    const text = health === undefined
        ? "Establishing connection to T3000 services..."
        : health
        ? "T3000 services connected — loading workspace"
        : "T3000 services unavailable — verify T3000 is running, then reload the page";

    return (
        <div className={barClass}>
            {icon}
            <span>{text}</span>
        </div>
    );
}

export function EezStudioApp() {
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        let cancelled = false;
        initEezBridge();

        checkBackendHealth().then(h => {
            if (cancelled) return;
            if (h) {
                setShowContent(true);
                // home/main is side-effect driven (cached import won't re-run).
                // Import it first if not already loaded, then call initEezMain() to re-render.
                import("home/main").then(m => {
                    if (!cancelled && m.initEezMain) {
                        m.initEezMain();
                    }
                    // #/t3000/eez?new=<wizardType> → open the New Project wizard
                    // pre-configured with the requested LVGL template.
                    const qi = window.location.hash.indexOf("?");
                    const wizardType = qi >= 0
                        ? new URLSearchParams(window.location.hash.slice(qi + 1)).get("new")
                        : null;
                    if (!cancelled && wizardType) {
                        import("project-editor/project/ui/Wizard").then(w => {
                            if (cancelled) return;
                            w.wizardModelTemplates.type = wizardType;
                            // Wait until the app shell (home tab) is fully mounted,
                            // then open the wizard ONCE. Opening too early renders the
                            // dialog into a layer that the app then tears down.
                            let attempts = 0;
                            const waitForApp = () => {
                                if (cancelled) return;
                                const mounted =
                                    !!document.querySelector(".EezStudio_HomeTab") ||
                                    !!document.querySelector(".EezStudio_HomeTab_Navigation");
                                if (mounted) {
                                    try { w.showNewProjectWizard(); }
                                    catch (err) { console.error("[EEZ] Failed to open New Project wizard:", err); }
                                    return;
                                }
                                if (attempts++ < 40) setTimeout(waitForApp, 300);
                            };
                            waitForApp();
                        }).catch(err => console.error("[EEZ] Failed to open New Project wizard:", err));
                    }
                }).catch(err => console.error("[EEZ] Failed to load home/main:", err));
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    // ── EEZ top-menu bridge ─────────────────────────────────────
    // Header dispatches `eez-studio-action` (see Header.tsx handleEezAction);
    // forward the channel to the embedded EEZ Studio via its IPC emitter.
    useEffect(() => {
        const onEezAction = (e: Event) => {
            const action = (e as CustomEvent<string>).detail;
            if (!action) return;
            const mapped = EEZ_ACTION_TO_IPC[action];
            if (!mapped) return;
            const channel = typeof mapped === "string" ? mapped : mapped.channel;
            const args = typeof mapped === "string" ? [] : (mapped.args ?? []);
            ipcRenderer.send(channel, ...args);
        };
        window.addEventListener("eez-studio-action", onEezAction);
        return () => window.removeEventListener("eez-studio-action", onEezAction);
    }, []);

    return (
        <FluentProvider theme={webLightTheme}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                <BackendStatusBar />
                {showContent && (
                    <div
                        id="EezStudio_Content"
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                    />
                )}
            </div>
        </FluentProvider>
    );
}

export default EezStudioApp;
