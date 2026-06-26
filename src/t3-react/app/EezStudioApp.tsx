
import "src/t3-eez-studio/bridge/browser-polyfill";

import { useEffect, useRef, useState } from "react";
import { initEezBridge, getBackendStatus } from "src/t3-eez-studio/bridge/eez-bridge";
import "src/t3-eez-studio/bridge/eez-registry";
import "bootstrap/dist/css/bootstrap.min.css";
import { makeStyles, mergeClasses, Spinner, FluentProvider, webLightTheme } from "@fluentui/react-components";
import { CheckmarkCircleRegular, ErrorCircleRegular } from "@fluentui/react-icons";

// EEZ Studio stylesheets
import "eez-studio-ui/_stylesheets/main.less";
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
    const [status, setStatus] = useState({ checked: false, online: false });
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const poll = setInterval(() => {
            const st = getBackendStatus();
            setStatus({ ...st });
            if (st.checked) {
                clearInterval(poll);
                if (st.online) {
                    setTimeout(() => setVisible(false), 3000);
                }
            }
        }, 300);
        return () => clearInterval(poll);
    }, []);

    const { checked, online } = status;

    const barClass = mergeClasses(
        s.bar,
        !checked ? s.barChecking : online ? s.barOnline : s.barOffline,
        !visible && s.barHidden
    );

    const icon = !checked ? (
        <Spinner size="extra-tiny" className={s.icon} />
    ) : online ? (
        <CheckmarkCircleRegular className={mergeClasses(s.icon, s.iconOnline)} />
    ) : (
        <ErrorCircleRegular className={mergeClasses(s.icon, s.iconOffline)} />
    );

    const text = !checked
        ? "Establishing connection to T3000 services..."
        : online
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
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        initEezBridge();
        // home/main.tsx auto-executes main() on import — it renders <App /> into
        // #EezStudio_Content (the div rendered below with that id)
        import("home/main").catch(err => console.error("[EEZ] Failed to load home/main:", err));
    }, []);

    return (
        <>
            <FluentProvider theme={webLightTheme}>
                <BackendStatusBar />
            </FluentProvider>
            <div
                id="EezStudio_Content"
                style={{
                    width: "100%",
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            />
        </>
    );
}

export default EezStudioApp;
