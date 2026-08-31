
import "src/t3-eez-studio/bridge/browser-polyfill";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
import { makeStyles, mergeClasses, Spinner, Button, FluentProvider, webLightTheme } from "@fluentui/react-components";
import { ErrorCircleRegular, ArrowClockwiseRegular } from "@fluentui/react-icons";

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
        marginTop: "5px",
        fontSize: "11.5px",
        lineHeight: "1.5",
        flexShrink: 0,
        transition: "opacity 0.4s ease, height 0.3s ease, padding 0.3s ease, margin-top 0.3s ease",
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
        marginTop: "0px",
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
        <Spinner size="tiny" className={s.icon} />
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
    const [backendUp, setBackendUp] = useState<boolean | undefined>(undefined);
    const location = useLocation();
    // Prevent React StrictMode (dev) from double-running the ?new= effect, which
    // would open the New Project wizard twice (two stacked panels).
    const wizardOpenedRef = useRef(false);

    // 1) Backend health → reveal the content area (runs once on mount).
    useEffect(() => {
        let cancelled = false;
        initEezBridge();
        checkBackendHealth().then(h => {
            if (cancelled) return;
            setBackendUp(h);
            if (h) setShowContent(true);
        });
        return () => { cancelled = true; };
    }, []);

    // 2) Mount the embedded EEZ Studio shell once the content area is shown.
    //    main() is deliberately NOT re-run on later navigations — remounting the
    //    whole app while a create is in flight made the previous project flash
    //    and then leave an empty canvas.
    useEffect(() => {
        if (!showContent) return;
        let cancelled = false;
        // When landing here to CREATE a new project (name+location present),
        // don't resurrect previously open project tabs — only the newly created
        // project should show in the editor (avoids the previous project
        // flashing in and conflicting with the new one).
        // NOTE: under HashRouter the query lives in location.search, NOT
        // location.hash (which is empty) — parsing the wrong one silently
        // skipped the create and resurrected the previous default project.
        const params = new URLSearchParams(location.search);
        const isCreate =
            !!(params.get("name") && params.get("location")) &&
            (!!params.get("new") || params.get("examples") === "1");
        const isOpen = !!params.get("open");
        if (isCreate || isOpen) {
            try { localStorage.removeItem("home/tabs"); } catch {}
            try { localStorage.removeItem("home-tab-options"); } catch {}
        }
        import("home/main")
            .then(m => {
                if (!cancelled && m.initEezMain) m.initEezMain();
            })
            .catch(err => console.error("[EEZ] Failed to load home/main:", err));
        return () => { cancelled = true; };
    }, [showContent]);

    // 3) Hand-off from the design hub: /t3000/eez?new=… or ?examples=… creates
    //    the project and opens the editor. Keyed on the route location so a NEW
    //    navigation on the same route (e.g. ?examples= → ?new=) is processed
    //    even though the app is already mounted.
    useEffect(() => {
        if (!showContent) return;
        wizardOpenedRef.current = false;
        let cancelled = false;

        // Parse the query from location.search (HashRouter puts the query here;
        // location.hash is empty). This drives ?new= / ?examples= creates and
        // ?open= opening an existing on-disk project.
        const params = new URLSearchParams(location.search);
        const wizardType = params.get("new") ?? undefined;
        const openExamples = params.get("examples") === "1";
        const openPath = params.get("open");

        // Open an existing on-disk EEZ/LVGL project:
        //   /t3000/eez?open=project/<folder>/<folder>.eez-project
        if (openPath && !wizardType && !openExamples) {
            let attempts = 0;
            // Open the project and VERIFY it actually landed in the store.
            // On a cold boot the EEZ shell can still be settling, so retry —
            // this mirrors the retry logic the ?new= create hand-off uses.
            const tryOpen = () => {
                if (cancelled) return;
                import("home/tabs-store")
                    .then(({ openProject, tabs: tabsRef }) => {
                        if (cancelled) return;
                        // `tabs` is only usable after loadTabs() (inside
                        // home/main). Guard so a cold boot never opens into an
                        // uninitialized store.
                        if (!tabsRef || !tabsRef.tabs) {
                            if (attempts++ < 150) setTimeout(tryOpen, 300);
                            return;
                        }
                        try {
                            openProject(openPath, false);
                        } catch (err) {
                            console.error("[EEZ-Examples] openProject failed:", err);
                        }
                        const opened = tabsRef.tabs.some(
                            (t: any) => t.filePath === openPath
                        );
                        if (opened) {
                            console.log("[EEZ-Examples] openProject succeeded:", openPath);
                        } else if (attempts++ < 40) {
                            setTimeout(tryOpen, 300);
                        }
                    })
                    .catch(() => {
                        if (attempts++ < 150) setTimeout(tryOpen, 300);
                    });
            };
            // Wait for the EEZ shell to mount, then hand off to the editor.
            const waitForOpen = () => {
                if (cancelled) return;
                const mounted =
                    !!document.querySelector(".EezStudio_HomeTab") ||
                    !!document.querySelector(".EezStudio_HomeTab_Navigation");
                if (mounted) {
                    if (wizardOpenedRef.current) return;
                    wizardOpenedRef.current = true;
                    console.log("[EEZ-Examples] EezStudioApp open-project —", openPath);
                    tryOpen();
                    return;
                }
                if (attempts++ < 150) setTimeout(waitForOpen, 300);
            };
            waitForOpen();
            return;
        }

        if (!wizardType && !openExamples) return;

        import("project-editor/project/ui/Wizard").then(w => {
            if (cancelled) return;

            if (openExamples) {
                w.wizardModelExamples.folder =
                    params.get("folder") || "_allExamples";
                const exType = params.get("type");
                if (exType) w.wizardModelExamples.type = exType;
                const exName = params.get("name") ?? null;
                const exLocation = params.get("location") ?? null;
                const exCreateDirectory = params.get("createDirectory") ?? null;
                if (exName) w.wizardModelExamples.name = exName;
                if (exLocation) w.wizardModelExamples.location = exLocation;
                if (exCreateDirectory) {
                    w.wizardModelExamples.createDirectory =
                        exCreateDirectory !== "false";
                }
                console.log("[EEZ-Examples] EezStudioApp handoff — folder:",
                    w.wizardModelExamples.folder,
                    "type:", w.wizardModelExamples.type,
                    "name:", w.wizardModelExamples.name,
                    "location:", w.wizardModelExamples.location,
                    "createDirectory:", w.wizardModelExamples.createDirectory);
            } else {
                w.wizardModelTemplates.type = wizardType;
                const wizardName = params.get("name") ?? null;
                const wizardLocation = params.get("location") ?? null;
                const wizardCreateDirectory = params.get("createDirectory") ?? null;
                if (wizardName) w.wizardModelTemplates.name = wizardName;
                if (wizardLocation) w.wizardModelTemplates.location = wizardLocation;
                if (wizardCreateDirectory) {
                    w.wizardModelTemplates.createDirectory = wizardCreateDirectory !== "false";
                }
            }

            // Path to clean up if a create fails partway (matches
            // wizardModel.projectFolderPath = location/name when
            // createDirectory is set).
            const createDirectory = params.get("createDirectory") !== "false";
            const loc = (params.get("location") || "").trim().replace(/[\/\\]+$/, "");
            const nm = (params.get("name") || "").trim();
            const cleanupFolder = createDirectory
                ? (loc ? loc + "/" + nm : nm)
                : loc;

            // Run the direct-to-editor create. When the home tab first mounts the
            // app may still be settling (WASM compile / tab restore), so a request
            // can occasionally be dropped and createProject fails partway. Retry,
            // cleaning up any partially-created folder so the exists-validation
            // passes on the next attempt.
            const createWithRetry = async (create: () => Promise<boolean>) => {
                for (let attempt = 1; attempt <= 3; attempt++) {
                    if (cancelled) return;
                    const ok = await create().catch(err => {
                        console.error("[EEZ-Examples] autoCreate error:", err);
                        return false;
                    });
                    if (cancelled) return;
                    if (ok) {
                        console.log(`[EEZ-Examples] autoCreate succeeded (attempt ${attempt})`);
                        return;
                    }
                    if (attempt === 3) {
                        console.error("[EEZ-Examples] autoCreate failed after 3 attempts");
                        return;
                    }
                    console.warn(`[EEZ-Examples] autoCreate attempt ${attempt} failed, retrying...`);
                    if (cleanupFolder) {
                        try {
                            await fetch(`/api/eez-studio/delete-recursive?path=${encodeURIComponent(cleanupFolder)}&force=true`, { method: "DELETE" });
                        } catch {}
                    }
                    await new Promise(res => setTimeout(res, 1500));
                }
            };

            // Wait until the app shell (home tab) is fully mounted, then open the
            // wizard ONCE. Opening too early renders the dialog into a layer that
            // the app then tears down.
            let attempts = 0;
            const waitForApp = () => {
                if (cancelled) return;
                const mounted =
                    !!document.querySelector(".EezStudio_HomeTab") ||
                    !!document.querySelector(".EezStudio_HomeTab_Navigation");
                if (mounted) {
                    if (wizardOpenedRef.current) return;
                    wizardOpenedRef.current = true;
                    try {
                        if (openExamples) {
                            if (params?.get("name") && params?.get("location")) {
                                // Direct-to-editor: create the example project now
                                // (downloads + saves, then opens the editor).
                                console.log("[EEZ-Examples] EezStudioApp create-from-example — type=", params.get("type"), "name=", params.get("name"), "location=", params.get("location"));
                                setTimeout(() => createWithRetry(() => w.createProjectFromExample()), 1000);
                            } else {
                                w.showNewExampleProjectWizard();
                            }
                        } else {
                            if (params?.get("name") && params?.get("location")) {
                                // Direct-to-editor: create a NEW LVGL template
                                // project (from the design hub create dialog) and
                                // open the editor — never show the wizard form.
                                console.log("[EEZ-Examples] EezStudioApp create-from-template — new=", wizardType, "name=", params.get("name"), "location=", params.get("location"));
                                setTimeout(() => createWithRetry(() => w.createProjectFromTemplate()), 1000);
                            } else {
                                w.showNewProjectWizard();
                            }
                        }
                    } catch (err) {
                        console.error("[EEZ] Failed to open New Project wizard:", err);
                    }
                    return;
                }
                // Keep waiting while the shell mounts (a cold WASM load can take
                // longer than 12s to render the home tab). Cap at ~45s.
                if (attempts++ < 150) setTimeout(waitForApp, 300);
            };
            waitForApp();
        }).catch(err => console.error("[EEZ] Failed to open New Project wizard:", err));

        return () => {
            cancelled = true;
            wizardOpenedRef.current = false;
        };
        // Re-run when the route location changes — even on the same /t3000/eez
        // route with a different query — so a fresh create request is always
        // processed (previously the previous project stayed in the editor).
    }, [location.key, location.search, showContent]);

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
                {backendUp === false && !showContent && (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "flex-start",
                            padding: "20px 14px",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: 560,
                                background: "#fff",
                                borderRadius: 12,
                                // padding: "20px 24px",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                textAlign: "left",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <ErrorCircleRegular style={{ fontSize: 18, color: "#c50f1f", flexShrink: 0 }} />
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1c2b3a" }}>
                                    T3000 backend is unreachable
                                </div>
                            </div>
                            <div style={{ fontSize: 13, color: "#6b7f94", lineHeight: 1.6 }}>
                                Creating or opening LVGL projects requires the T3000 backend, which
                                creates the project folder on disk. Make sure T3000 is running, then reload
                                this page.
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <Button
                                    size="small"
                                    appearance="primary"
                                    icon={<ArrowClockwiseRegular />}
                                    onClick={() => window.location.reload()}
                                >
                                    Reload
                                </Button>
                                <Button
                                    size="small"
                                    appearance="secondary"
                                    onClick={() => (window.location.hash = "#/t3000/design")}
                                >
                                    Back to Design Hub
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FluentProvider>
    );
}

export default EezStudioApp;
