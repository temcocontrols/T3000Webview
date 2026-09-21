
import "src/t3-eez-studio/bridge/browser-polyfill";

import { Suspense, lazy, useEffect, useRef, useState } from "react";
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

/**
 * EEZ's own settings surface, loaded on demand.
 *
 * It is self-contained (no props, no project context) — a 2 x 2 card grid of *Databases*, *External Tools*,
 * *Project Editor* and the rest — which is what makes it showable outside EEZ's own tab chrome.
 */
const EezSettings = lazy(async () => ({ default: (await import("home/settings")).Settings }));
import "bootstrap/dist/css/bootstrap.min.css";
import { makeStyles, mergeClasses, Spinner, Button, Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, FluentProvider, webLightTheme } from "@fluentui/react-components";
import { ErrorCircleRegular, ArrowClockwiseRegular } from "@fluentui/react-icons";

// EEZ Studio stylesheets
import "eez-studio-ui/_stylesheets/main.less";
import "eez-studio-ui/_stylesheets/main-dark-runtime.less";
import "flexlayout-react/style/light.css";
import { LogUtil } from "@/lib/t3-hvac";
import { folderNameOf, projectFoldersOf, retryPlan, targetExists, targetNameOf } from "./designerCreateGuard";

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

/**
 * Does the project root already contain a folder with this target's name?
 *
 * Drives the create hand-off's guard (see `designerCreateGuard`). Three answers, not two: `true` (the list
 * was read and holds that folder), `false` (the list was read and does not) and **`undefined` for doubt** — a
 * missing endpoint, a network error, an unreadable body. The delete decision treats doubt as "not ours" so
 * nothing is ever removed on a guess, but doubt must **not** be reported as a collision: that is what told
 * every create its name was taken (the body is `{ projects: [...] }`, and an array-only check made this
 * function answer `true` for it).
 */
async function targetFolderExists(target: string): Promise<boolean | undefined> {
    if (!folderNameOf(target)) {
        return undefined;
    }
    try {
        const response = await fetch("/api/eez-studio/projects");
        if (!response.ok) {
            return undefined;
        }
        const folders = projectFoldersOf(await response.json());
        if (!folders) {
            return undefined;
        }
        return targetExists(folders.map(folder => ({ folder })), target);
    } catch {
        return undefined;
    }
}

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
    /**
     * EEZ's **Settings** surface, shown as a modal.
     *
     * The View → Settings menu item used to dispatch `openTab-settings` into EEZ, which only switched to the
     * home tab's *settings* section — and that tab's body was emptied when the Design Hub took the launcher
     * over (`home/home-tab.tsx`: "OPEN/CREATE/EXAMPLES/EXTENSIONS/SETTINGS hidden for now"). The click
     * therefore covered the editor with a blank pane and had no way back, because the top tab strip is
     * hidden too. The component itself never went away, so it is shown here instead — see `onEezAction` —
     * which leaves the document (and its panels) exactly as they were.
     */
    const [settingsOpen, setSettingsOpen] = useState(false);
    const location = useLocation();
    // Prevent React StrictMode (dev) from double-running the ?new= effect, which
    // would open the New Project wizard twice (two stacked panels).
    const wizardOpenedRef = useRef(false);
    /**
     * The create request already handled, as `kind|type|<target folder>`.
     *
     * The hand-off effect re-runs on every route re-render (`location.key`/`location.search`) and StrictMode
     * runs it twice, while the URL keeps saying `?new=…&name=…&location=…` — so a second pass used to create
     * **again**, land on the folder the first pass had just written, and report it as "already exists —
     * nothing was created" while the editor showed the new project. Reset per request, never per effect run:
     * a *different* request (another navigation, another name) is still processed.
     */
    const handledCreateRef = useRef<string | null>(null);

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
    const eezHostRef = useRef<HTMLElement | null>(null);
    // Module namespace of the EEZ tab store, captured so the teardown can release the tab listeners.
    const eezTabsRef = useRef<{ disposeTabListeners?: () => void } | null>(null);
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
            .then(async m => {
                if (cancelled || !m.initEezMain) return;
                // Remember the host while it is still in the document: `#EezStudio_Content` is owned by
                // this tree and is already detached by the time React runs passive cleanups, so looking
                // it up in the teardown below would silently skip the unmount.
                eezHostRef.current = document.getElementById("EezStudio_Content");
                m.initEezMain();
                // The tab stores (mobx, not effects) hold `document`/ipc listeners that outlive the React
                // root; the module namespace is captured here because `tabs` is assigned inside
                // `loadTabs()`, and the binding stays live.
                eezTabsRef.current = await import("home/tabs-store");
            })
            .catch(err => console.error("[EEZ] Failed to load home/main:", err));
        return () => {
            cancelled = true;
            const host = eezHostRef.current as
                | (HTMLElement & { _eezRoot?: { unmount?: () => void } })
                | null;
            const tabsModule = eezTabsRef.current;
            eezHostRef.current = null;
            eezTabsRef.current = null;

            // Deferred by one tick — and this is load-bearing, not tidiness:
            //  1. The embedded shell mounts its OWN React root into `#EezStudio_Content`
            //     (`home/main.tsx` → `createRoot(contentEl)` stored as `contentEl._eezRoot`). That element
            //     belongs to this tree, so without unmounting it the previous root's cleanups never run
            //     and its listeners pile up (`eez-open-project`, Fluent `fui-toast-*`).
            //  2. Doing it *here* unmounts a foreign root while React is committing this one, which React
            //     answers with "Attempted to synchronously unmount a root while React was already
            //     rendering" and defers the unmount itself — that is what made the listener counts flaky.
            //      One tick later the commit is finished and the unmount happens exactly once.
            //  3. The tab stores are mobx objects, not effects: unmounting the root does not reach their
            //     `document`/ipc listeners, and every remount builds fresh tabs, so each visit used to
            //     stack another set of handlers (measured: +6 `document` keydown per route change).
            window.setTimeout(() => {
                try {
                    const root = host?._eezRoot;
                    if (host) {
                        host._eezRoot = undefined;
                    }
                    root?.unmount?.();
                } catch {
                    /* teardown is best effort */
                }
                try {
                    tabsModule?.disposeTabListeners?.();
                } catch {
                    /* teardown is best effort */
                }
            }, 0);
        };
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
                LogUtil.Info("[EEZ-Examples] EezStudioApp handoff — folder:",
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

            /**
             * The project an existing folder **is**: EEZ's wizard computes `projectFilePath` as
             * `projectFolderPath + "/" + name + ".eez-project"`, and `projectFolderPath` is exactly
             * `cleanupFolder` (location/name with "Create directory", else the location).
             */
            const existingProjectPath = nm ? `${cleanupFolder}/${nm}.eez-project` : undefined;

            /**
             * Open that project instead of writing over it.
             *
             * Never destructive, and it is what the user meant by the name they typed — the guard exists to
             * stop the retry's cleanup from deleting a real project, not to refuse the click.
             */
            const openExistingProject = () => {
                if (!existingProjectPath) return;
                import("home/tabs-store")
                    .then(({ openProject, tabs: tabsRef }) => {
                        if (cancelled || !tabsRef?.tabs) return;
                        if (tabsRef.tabs.some((t: any) => t.filePath === existingProjectPath)) return;
                        LogUtil.Info(`[EEZ-Examples] target exists — opening ${existingProjectPath}`);
                        openProject(existingProjectPath, false);
                    })
                    .catch(() => {
                        /* the project can still be opened from the Design Hub */
                    });
            };

            // Was this folder already there *before* we started? The retry below deletes the target so a
            // partial create can start over, and that cleanup is only ever legitimate for a folder **this
            // run** created — a pre-existing one is the user's project. Measured 2026-09-17: clicking
            // "Create & Open" with the default name ("LVGL 9.5") deleted an existing project by that name,
            // and a second create overwrote another one. Fail safe direction: if the list cannot be read,
            // assume it exists, so nothing is deleted on a guess.
            //
            // Resolved on the first attempt (this effect body is synchronous) and cached, so the answer
            // cannot drift between attempts — and it is always taken *before* the first create runs.
            let existedBeforePromise: Promise<boolean | undefined> | undefined;
            const targetExistedBefore = () =>
                (existedBeforePromise ??= targetFolderExists(cleanupFolder).then(exists => {
                    // Only a **confirmed** collision is reported. A cancelled run is no longer the user's create
                    // either: reporting from it is how the message appeared *after* the project had already
                    // been created and opened.
                    if (exists === true && !cancelled) {
                        const message =
                            `A project named "${targetNameOf(cleanupFolder)}" already exists`
                            + " — opening that project instead.";
                        LogUtil.Warn(`[EEZ-Examples] ${message}`);
                        // Not console-only: without a visible message the click looks like a no-op (and the
                        // wizard is easy to miss in this shell). The EEZ surface is mounted by the time a
                        // create runs, so its toast can host the message.
                        import("eez-studio-ui/notification")
                            .then(notification => notification.info(message))
                            .catch(() => {
                                /* notification surface not available — the log line still tells the story */
                            });
                    }
                    return exists;
                }));

            // Run the direct-to-editor create. When the home tab first mounts the
            // app may still be settling (WASM compile / tab restore), so a request
            // can occasionally be dropped and createProject fails partway. Retry, cleaning up any
            // partially-created folder so the exists-validation passes on the next attempt.
            const createWithRetry = async (create: () => Promise<boolean>) => {
                const existedBefore = await targetExistedBefore();
                if (cancelled) return;

                /*
                 * The folder is the user's project: never write over it, and never delete it — opening it is
                 * the only non-destructive answer, and it is what the typed name asked for.
                 */
                if (existedBefore === true) {
                    openExistingProject();
                    return;
                }

                for (let attempt = 1; attempt <= 3; attempt++) {
                    if (cancelled) return;
                    const ok = await create().catch(err => {
                        console.error("[EEZ-Examples] autoCreate error:", err);
                        return false;
                    });
                    if (cancelled) return;
                    if (ok) {
                        LogUtil.Info(`[EEZ-Examples] autoCreate succeeded (attempt ${attempt})`);
                        return;
                    }

                    // Doubt (`undefined`) keeps the folder, like a confirmed collision — but it is not
                    // reported as one; the create simply proceeds.
                    const plan = retryPlan(existedBefore !== false, attempt);
                    if (!plan.retry) {
                        LogUtil.Error(
                            existedBefore !== false
                                ? "[EEZ-Examples] autoCreate failed and the folder was not ours to clean up"
                                : "[EEZ-Examples] autoCreate failed after 3 attempts"
                        );
                        return;
                    }

                    LogUtil.Warn(`[EEZ-Examples] autoCreate attempt ${attempt} failed, retrying...`);
                    if (plan.cleanup && cleanupFolder) {
                        try {
                            // `allowProject=true`: the guard above proved this folder did not exist before we
                            // started, so it is our own partial create — even if the failed attempt managed to
                            // write a `.eez-project` into it (which the backend would otherwise protect).
                            await fetch(`/api/eez-studio/delete-recursive?path=${encodeURIComponent(cleanupFolder)}&force=true&allowProject=true`, { method: "DELETE" });
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
                                const request = `examples|${params.get("type") ?? ""}|${cleanupFolder}`;
                                if (handledCreateRef.current !== request) {
                                    handledCreateRef.current = request;
                                    LogUtil.Info("[EEZ-Examples] EezStudioApp create-from-example — type=", params.get("type"), "name=", params.get("name"), "location=", params.get("location"));
                                    setTimeout(() => createWithRetry(() => w.createProjectFromExample()), 1000);
                                }
                            } else {
                                w.showNewExampleProjectWizard();
                            }
                        } else {
                            if (params?.get("name") && params?.get("location")) {
                                // Direct-to-editor: create a NEW LVGL template
                                // project (from the design hub create dialog) and
                                // open the editor — never show the wizard form.
                                const request = `new|${wizardType ?? ""}|${cleanupFolder}`;
                                if (handledCreateRef.current !== request) {
                                    handledCreateRef.current = request;
                                    LogUtil.Info("[EEZ-Examples] EezStudioApp create-from-template — new=", wizardType, "name=", params.get("name"), "location=", params.get("location"));
                                    setTimeout(() => createWithRetry(() => w.createProjectFromTemplate()), 1000);
                                }
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

            /*
             * Settings is the one EEZ surface the new design left without a home (see `settingsOpen`): its
             * host tab is empty now, so dispatching the IPC would blank the canvas instead of showing it.
             */
            if (action === "openTab-settings") {
                setSettingsOpen(true);
                return;
            }

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
            {settingsOpen ? (
                <Dialog
                    open
                    onOpenChange={(_, data) => {
                        if (!data.open) {
                            setSettingsOpen(false);
                        }
                    }}
                >
                    <DialogSurface style={{ width: "min(1120px, 94vw)", maxWidth: "min(1120px, 94vw)" }}>
                        <DialogBody>
                            <DialogTitle>Settings</DialogTitle>
                            <DialogContent
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    height: "min(72vh, 640px)",
                                    padding: 0
                                }}
                            >
                                <Suspense fallback={<Spinner size="tiny" label="Loading settings…" />}>
                                    <EezSettings />
                                </Suspense>
                            </DialogContent>
                        </DialogBody>
                    </DialogSurface>
                </Dialog>
            ) : null}
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
