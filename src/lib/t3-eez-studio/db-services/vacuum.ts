import { service } from "eez-studio-shared/service";

import { db, getActiveDbPath } from "eez-studio-shared/db";

export default service<void, void>("db-services/vacuum", async () => {
    // Try the Rust backend API first (browser mode uses this).
    // If the API server isn't running (Electron mode), fall back to better-sqlite3.
    try {
        const dbPath = getActiveDbPath();
        const resp = await fetch("/api/eez-studio/vacuum-database", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: dbPath }),
        });
        if (resp.ok) {
            const result = await resp.json();
            if (result.success) {
                return;
            }
            throw new Error(result.error || "VACUUM failed");
        }
    } catch {
        // API not available — fall back to Electron's better-sqlite3
    }
    db.exec("VACUUM");
});
