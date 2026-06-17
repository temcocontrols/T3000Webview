import { useEffect, useRef } from "react";
import { initEezBridge } from "src/t3-eez-studio/bridge/eez-bridge";
import "src/t3-eez-studio/bridge/browser-polyfill";
import "bootstrap/dist/css/bootstrap.min.css";
// EEZ Studio styles — imported statically so Vite can process .less as CSS
import "src/lib/t3-eez-studio/eez-studio.less";

export function EezStudioApp() {
    const done = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (done.current) return;
        done.current = true;
        (async () => {
            initEezBridge();
            const entry = await import("eez-studio-web-entry");
            await entry.createEezStudioApp(rootRef.current!);
        })();
    }, []);

    return (
        <div
            ref={rootRef}
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
