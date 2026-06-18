import { useEffect, useRef } from "react";
import { initEezBridge } from "src/t3-eez-studio/bridge/eez-bridge";
import "src/t3-eez-studio/bridge/browser-polyfill";
import "src/t3-eez-studio/bridge/eez-registry";
import "bootstrap/dist/css/bootstrap.min.css";

// EEZ Studio stylesheets
import "eez-studio-ui/_stylesheets/main.less";
import "flexlayout-react/style/light.css";

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
    );
}

export default EezStudioApp;
