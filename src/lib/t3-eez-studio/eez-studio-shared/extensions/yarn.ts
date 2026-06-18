import path from "path";

import { fileExists, makeFolder } from "eez-studio-shared/util-electron";

import { sourceRootDir } from "eez-studio-shared/util";

import { extensionsFolderPath } from "eez-studio-shared/extensions/extension-folder";

import type { IExtension } from "eez-studio-shared/extensions/extension";

import { getBridgeAPI } from "eez-studio-shared/bridge";

function yarnFn(args: string[]) {
    // Browser: yarn is a Node.js CLI tool, not available
    if (typeof process === "undefined" || !!(process as any).type) {
        console.log("[EEZ] yarn skipped in browser:", args.join(" "));
        return Promise.resolve();
    }
    const yarn = sourceRootDir() + "/../libs/yarn-1.22.10.js";
    const cp = require("child_process");

    return new Promise<void>((resolve, reject) => {
        const env = {
            NODE_ENV: "production",
            ELECTRON_RUN_AS_NODE: "true"
        };

        const cmd = [process.execPath, yarn].concat(args).join(" ");

        console.log("Launching yarn:", cmd);

        cp.execFile(
            process.execPath,
            [yarn].concat(args),
            {
                cwd: extensionsFolderPath,
                env,
                timeout: 10 * 1000, // 10 seconds
                maxBuffer: 1024 * 1024
            },
            (err: any, stdout: any, stderr: any) => {
                if (err) {
                    reject(stderr);
                } else {
                    console.log("yarn", stdout);
                    resolve();
                }
            }
        );
    });
}

export async function yarnInstall(extensionToInstall?: IExtension) {
    const cacheFolderPath = `${extensionsFolderPath}/cache`;

    if (extensionToInstall) {
        await yarnFn([
            "add",
            "--no-emoji",
            "--cache-folder",
            cacheFolderPath,
            extensionToInstall.version
                ? `${extensionToInstall.name}@${extensionToInstall.version}`
                : extensionToInstall.name
        ]);
    } else {
        await yarnFn([
            "install",
            "--no-emoji",
            "--cache-folder",
            cacheFolderPath
        ]);
    }
}

export async function yarnUninstall(moduleName: string) {
    await yarnInstall();
    await yarnFn(["remove", moduleName]);
}

export async function getNodeModuleFolders() {
    const packageJsonPath = `${extensionsFolderPath}/package.json`;
    if (!(await fileExists(packageJsonPath))) {
        // In browser: yarn is unavailable; seed a minimal package.json via bridge
        const bridge = getBridgeAPI();
        if (bridge) {
            try {
                await bridge.writeTextFile(
                    packageJsonPath,
                    JSON.stringify({ name: "eez-extensions", version: "1.0.0", private: true, dependencies: {} }, null, 2)
                );
            } catch (err) {
                console.log("[EEZ] Failed to seed extensions package.json:", err);
            }
        } else {
            try {
                await yarnFn(["init", "-y"]);
            } catch (err) {
                console.log("yarn", err);
            }
        }
    }

    const cacheFolderPath = `${extensionsFolderPath}/cache`;
    if (!(await fileExists(cacheFolderPath))) {
        await makeFolder(cacheFolderPath);
    }

    // In browser: use bridge to read the JSON file instead of require()
    let packageJson: any;
    const bridge = getBridgeAPI();
    if (bridge) {
        try {
            const text = await bridge.readTextFile(packageJsonPath);
            packageJson = JSON.parse(text);
        } catch {
            packageJson = {};
        }
    } else {
        packageJson = require(packageJsonPath);
    }

    return Object.keys(packageJson.dependencies || []).map(plugin =>
        path.resolve(extensionsFolderPath, "node_modules", plugin.split("#")[0])
    );
}
