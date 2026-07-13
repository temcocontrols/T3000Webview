
import "src/t3-eez-studio/bridge/browser-polyfill";

import { useEffect, useState } from "react";
import { initEezBridge, checkBackendHealth } from "src/t3-eez-studio/bridge/eez-studio-api";
import "src/t3-eez-studio/bridge/eez-registry";
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
                }).catch(err => console.error("[EEZ] Failed to load home/main:", err));
            }
        });

        return () => {
            cancelled = true;
        };
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
