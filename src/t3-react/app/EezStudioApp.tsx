import { useEffect, useRef, useState } from "react";
import { initEezBridge } from "src/lib/eez-bridge";

export function EezStudioApp() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const done = useRef(false);

    useEffect(() => {
        if (done.current) return;
        done.current = true;
        (async () => {
            try {
                initEezBridge();
                await import("eez-studio-web-entry");
                setLoading(false);
            } catch (e: any) {
                console.error("EEZ Studio boot failed:", e);
                setError(e.message || String(e));
                setLoading(false);
            }
        })();
    }, []);

    if (error) return <div style={{padding:40,color:"red",fontFamily:"sans-serif"}}><h2>EEZ Studio Error</h2><pre>{error}</pre></div>;
    if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"sans-serif"}}>Loading EEZ Studio...</div>;
    return null;
}

export default EezStudioApp;
