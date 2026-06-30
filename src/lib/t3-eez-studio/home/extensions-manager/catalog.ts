import { observable, runInAction, makeObservable } from "mobx";

import {
    getUserDataPath,
    fileExists,
    readJsObjectFromFile,
    writeJsObjectToFile
} from "eez-studio-shared/util-electron";

import * as notification from "eez-studio-ui/notification";

import { IExtension } from "eez-studio-shared/extensions/extension";

// import localCatalogVersion from "./catalog-version.json";

import JSZip from "jszip";

/*
export let DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL =
    "https://github.com/eez-open/studio-extensions/raw/master/build/catalog-version.json";

export const DEFAULT_EXTENSIONS_CATALOG_DOWNLOAD_URL =
    "https://github.com/eez-open/studio-extensions/raw/master/build/catalog.zip";
*/

const GITHUB_EXT_BASE = "https://raw.githubusercontent.com/eez-open/studio-extensions/master/build";
export let DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL =
    `/api/eez-studio/proxy-fetch?url=${encodeURIComponent(GITHUB_EXT_BASE + "/catalog-version.json")}`;

export const DEFAULT_EXTENSIONS_CATALOG_DOWNLOAD_URL =
    `/api/eez-studio/proxy-fetch-binary?url=${encodeURIComponent(GITHUB_EXT_BASE + "/catalog.zip")}`;

// export const DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL = "catalog-version.json"; //override with local file
// export const DEFAULT_EXTENSIONS_CATALOG_DOWNLOAD_URL = "catalog.zip";

interface ICatalogVersion {
    lastModified: Date;
}

class ExtensionsCatalog {
    catalog: IExtension[] = [];
    catalogVersion: ICatalogVersion;
    private _loading = false;
    private _downloading = false;

    constructor() {
        makeObservable(this, {
            catalog: observable
        });
    }

    load() {
        if (this._loading) return;
        this._loading = true;
        console.log("[ext-catalog] load() called");
        this._loadCatalog()
            .then(catalog => {
                console.log("[ext-catalog] _loadCatalog result:", Array.isArray(catalog) ? `array len=${catalog.length}` : typeof catalog);
                runInAction(() => (this.catalog = catalog));
            })
            .catch(error => {
                console.error("[ext-catalog] _loadCatalog error:", error);
                notification.error(
                    `Failed to load extensions catalog (${error})`
                );
            });

        this._loadCatalogVersion()
            .then(catalogVersion => {
                console.log("[ext-catalog] _loadCatalogVersion result:", catalogVersion);
                runInAction(() => (this.catalogVersion = catalogVersion));

                this.checkNewVersionOfCatalog();
            })
            .catch(error => {
                console.error("[ext-catalog] _loadCatalogVersion error:", error);
                notification.error(`Failed to load catalog version (${error})`);
            });
    }

    get catalogPath() {
        return getUserDataPath("catalog.json");
    }

    async _loadCatalog() {
        let catalogPath = this.catalogPath;
        console.log("[ext-catalog] _loadCatalog path:", catalogPath);
        const exists = await fileExists(catalogPath);
        console.log("[ext-catalog] _loadCatalog fileExists:", exists);
        if (!exists) {
            return [];
        }
        const data = await readJsObjectFromFile(catalogPath);
        console.log("[ext-catalog] _loadCatalog data:", Array.isArray(data) ? `array len=${data.length}` : typeof data);
        return data as IExtension[];
    }

    /*
    get catalogVersionPath() {
        return getUserDataPath("catalog-version.json");
    }
    */

    get catalogVersionPath() {
        return getUserDataPath("catalog-version.json");
        // return DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL;
    }

    async _loadCatalogVersion() {
        let catalogVersion;

        let catalogVersionPath = this.catalogVersionPath;
        console.log("[ext-catalog] _loadCatalogVersion path:", catalogVersionPath);
        const verExists = await fileExists(catalogVersionPath);
        console.log("[ext-catalog] _loadCatalogVersion fileExists:", verExists);
        if (verExists) {
            try {
                catalogVersion = await readJsObjectFromFile(catalogVersionPath);
                console.log("[ext-catalog] _loadCatalogVersion parsed:", catalogVersion);
                catalogVersion.lastModified = new Date(
                    catalogVersion.lastModified
                );
            } catch (err) {
                console.error("[ext-catalog] _loadCatalogVersion parse error:", err);
            }
        }

        return catalogVersion;
    }

    async checkNewVersionOfCatalog(forceDownload: boolean = false) {
        console.log("[ext-catalog] checkNewVersionOfCatalog forceDownload=", forceDownload);
        try {
            const catalogVersion = await this.downloadCatalogVersion();
            console.log("[ext-catalog] remote version:", catalogVersion?.lastModified, "local:", this.catalogVersion?.lastModified);

            const needDownload = this.catalog.length === 0 || !this.catalogVersion || catalogVersion.lastModified > this.catalogVersion.lastModified;
            console.log("[ext-catalog] needDownload:", needDownload);

            if (needDownload) {
                console.log("[ext-catalog] triggering downloadCatalog()...");
                runInAction(() => (this.catalogVersion = catalogVersion));
                this.downloadCatalog();
            } else {
                // no new version
                if (forceDownload) {
                    this.downloadCatalog();
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error(error);
            notification.error(`Failed to download extensions catalog version`);
        }

        return true;
    } 
  
    downloadCatalogVersion() {
        console.log("[ext-catalog] downloadCatalogVersion fetching:", DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL);
        return new Promise<ICatalogVersion>((resolve, reject) => {
            var req = new XMLHttpRequest();
            req.responseType = "json";
            req.open("GET", DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL);

            req.addEventListener("load", async () => {
                console.log("[ext-catalog] downloadCatalogVersion response status:", req.status);
                const catalogVersion = req.response;
                if (!catalogVersion) {
                    console.warn("[ext-catalog] downloadCatalogVersion empty response");
                    resolve(null as any);
                    return;
                }
                catalogVersion.lastModified = new Date(
                    catalogVersion.lastModified
                );
                await writeJsObjectToFile(
                    this.catalogVersionPath,
                    catalogVersion
                );
                resolve(catalogVersion);
            });

            req.addEventListener("error", error => {
                console.error(
                    "Failed to download catalog-version.json for extensions",
                    error
                );
                reject(error);
            });

            req.send();
        });
    } 

    /*
    async downloadCatalogVersion(): Promise<ICatalogVersion> {
        try {

            //override with local version
            // DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL = "catalog-version.json";
            const catalogVersion = await readJsObjectFromFile(this.catalogVersionPath);
            catalogVersion.lastModified = new Date(catalogVersion.lastModified);
            console.log("downloadCatalogVersion=>Loaded catalog-version.json from local folder", catalogVersion);
            return catalogVersion;
        } catch (e) {
            console.error("downloadCatalogVersion=>Failed to read local catalog-version.json", e);
            throw e;
        }
    }
    */

    downloadCatalog() {
        if (this._downloading) { console.log("[ext-catalog] downloadCatalog already in progress, skipping"); return; }
        this._downloading = true;
        console.log("[ext-catalog] downloadCatalog() starting...");
        var req = new XMLHttpRequest();
        req.responseType = "arraybuffer";
        req.open("GET", DEFAULT_EXTENSIONS_CATALOG_DOWNLOAD_URL);

        const progressToastId = notification.info(
            "Downloading extensions catalog ...",
            {
                autoClose: false,
                hideProgressBar: false
            }
        );

        req.addEventListener("progress", event => {
            notification.update(progressToastId, {
                render: event.total
                    ? `Downloading extensions catalog: ${event.loaded} of ${event.total}`
                    : `Downloading extensions catalog: ${event.loaded}`
            });
        });

        req.addEventListener("load", async () => {
            try {
                console.log("[ext-catalog] downloadCatalog response received, bytes:", req.response?.byteLength);
                if (!req.response || req.response.byteLength === 0) {
                    throw new Error("Downloaded catalog is empty");
                }
                const zip = await JSZip.loadAsync(req.response as ArrayBuffer);
                const names = Object.keys(zip.files);
                console.log("[ext-catalog] zip files:", names.length);
                if (names.length === 0) throw new Error("Zip is empty");
                const data = await zip.files[names[0]].async("uint8array");
                const catalogJson = new TextDecoder("utf-8").decode(data);
                console.log("[ext-catalog] extracted JSON, chars:", catalogJson.length);
                const catalog = JSON.parse(catalogJson);
                console.log("[ext-catalog] parsed:", Array.isArray(catalog) ? `array len=${catalog.length}` : typeof catalog);

                // Clone before mobx wraps it — Proxy breaks JSON.stringify
                const rawCatalog = JSON.parse(JSON.stringify(catalog));
                console.log("[ext-catalog] clone len:", JSON.stringify(rawCatalog).length);

                runInAction(() => (this.catalog = catalog));

                console.log("[ext-catalog] saving to:", this.catalogPath);
                await writeJsObjectToFile(this.catalogPath, rawCatalog);
                console.log("[ext-catalog] save complete, verifying...");
                const saved = await fileExists(this.catalogPath);
                console.log("[ext-catalog] file-exists after save:", saved);

                this._downloading = false;

                notification.update(progressToastId, {
                    type: notification.SUCCESS,
                    render: `The latest extensions catalog successfully downloaded.`,
                    autoClose: 5000
                });
            } catch (err) {
                this._downloading = false;
                console.error("[ext-catalog] Failed to process extensions catalog zip", err);
                notification.update(progressToastId, {
                    type: notification.ERROR,
                    render: `Failed to process extensions catalog.`,
                    autoClose: 5000
                });
            }
        });

        req.addEventListener("error", error => {
            this._downloading = false;
            console.error("ExtensionsCatalog download error", error);
            notification.update(progressToastId, {
                type: notification.ERROR,
                render: `Failed to download extensions catalog.`,
                autoClose: 5000
            });
        });

        req.send();
    }

    /*
    async downloadCatalog(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.responseType = "arraybuffer";
            req.open("GET", "/catalog.zip"); // ✅ served from public folder

            const progressToastId = notification.info("Loading local catalog.zip ...", {
                autoClose: false,
                hideProgressBar: false
            });

            req.addEventListener("load", async () => {
                try {
                    const arrayBuffer = req.response as ArrayBuffer;
                    console.log("Response byte length:", arrayBuffer.byteLength);

                    // Quick sanity check: zip files start with "PK" (0x50 0x4B)
                    const bytes = new Uint8Array(arrayBuffer);
                    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
                        throw new Error("Not a valid zip file, got wrong content");
                    }

                    // ✅ Use JSZip instead of decompress
                    const zip = await JSZip.loadAsync(arrayBuffer);

                    // Assume the first file is your catalog.json
                    const fileNames = Object.keys(zip.files);
                    const catalogJson = await zip.files[fileNames[0]].async("string");
                    const catalog = JSON.parse(catalogJson);

                    runInAction(() => (this.catalog = catalog));
                    try { await writeJsObjectToFile(this.catalogPath, this.catalog); } catch {   }

                    notification.update(progressToastId, {
                        type: notification.SUCCESS,
                        render: "Local extensions catalog successfully loaded.",
                        autoClose: 5000
                    });
                    resolve();
                } catch (err) {
                    console.error("JSZip error", err);
                    notification.update(progressToastId, {
                        type: notification.ERROR,
                        render: "Failed to parse local catalog.zip.",
                        autoClose: 5000
                    });
                    reject(err);
                }
            });

            req.addEventListener("error", error => {
                console.error("ExtensionsCatalog load error", error);
                notification.update(progressToastId, {
                    type: notification.ERROR,
                    render: "Failed to load local catalog.zip.",
                    autoClose: 5000
                });
                reject(error);
            });

            req.send();
        });
    } 
    */
}

export const extensionsCatalog = new ExtensionsCatalog();
