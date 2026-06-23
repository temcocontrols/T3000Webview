import { observable, runInAction, makeObservable } from "mobx";

import {
    getUserDataPath,
    fileExists,
    readJsObjectFromFile,
    writeJsObjectToFile
} from "eez-studio-shared/util-electron";

import * as notification from "eez-studio-ui/notification";

import { IExtension } from "eez-studio-shared/extensions/extension";

import localCatalogVersion from "./catalog-version.json";

import JSZip from "jszip";

// export let DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL =
//     "https://github.com/eez-open/studio-extensions/raw/master/build/catalog-version.json";

// export const DEFAULT_EXTENSIONS_CATALOG_DOWNLOAD_URL =
//     "https://github.com/eez-open/studio-extensions/raw/master/build/catalog.zip";

export const DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL = "catalog-version.json"; //override with local file
export const DEFAULT_EXTENSIONS_CATALOG_DOWNLOAD_URL = "catalog.zip";

interface ICatalogVersion {
    lastModified: Date;
}

class ExtensionsCatalog {
    catalog: IExtension[] = [];
    catalogVersion: ICatalogVersion;

    constructor() {
        makeObservable(this, {
            catalog: observable
        });
    }

    load() {
        this._loadCatalog()
            .then(catalog => {
                runInAction(() => (this.catalog = catalog));
            })
            .catch(error =>
                notification.error(
                    `Failed to load extensions catalog (${error})`
                )
            );

        this._loadCatalogVersion()
            .then(catalogVersion => {
                runInAction(() => (this.catalogVersion = catalogVersion));

                this.checkNewVersionOfCatalog();
            })
            .catch(error =>
                notification.error(`Failed to load catalog version (${error})`)
            );
    }

    get catalogPath() {
        return getUserDataPath("catalog.json");
    }

    async _loadCatalog() {
        let catalogPath = this.catalogPath;
        if (!(await fileExists(catalogPath))) {
            return [];
        }
        return (await readJsObjectFromFile(catalogPath)) as IExtension[];
    }

    /*
    get catalogVersionPath() {
        return getUserDataPath("catalog-version.json");
    }
    */

    get catalogVersionPath() {
        // return getUserDataPath("catalog-version.json");
        return DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL;
    }

    async _loadCatalogVersion() {
        let catalogVersion;

        let catalogVersionPath = this.catalogVersionPath;
        if (await fileExists(catalogVersionPath)) {
            try {
                catalogVersion = await readJsObjectFromFile(catalogVersionPath);
                catalogVersion.lastModified = new Date(
                    catalogVersion.lastModified
                );
            } catch (err) {
                console.error(err);
            }
        }

        return catalogVersion;
    }

    async checkNewVersionOfCatalog(forceDownload: boolean = false) {
        try {
            const catalogVersion = await this.downloadCatalogVersion();

            if (
                !this.catalogVersion ||
                catalogVersion.lastModified > this.catalogVersion.lastModified
            ) {
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

    /*
    downloadCatalogVersion() {
        return new Promise<ICatalogVersion>((resolve, reject) => {
            var req = new XMLHttpRequest();
            req.responseType = "json";
            req.open("GET", DEFAULT_EXTENSIONS_CATALOG_VERSION_DOWNLOAD_URL);

            req.addEventListener("load", async () => {
                const catalogVersion = req.response;
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
    */

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

    /*
    downloadCatalog() {
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
            debugger;
            const decompress = require("decompress");

            const files = await decompress(Buffer.from(req.response));

            const catalog = JSON.parse(files[0].data);

            runInAction(() => (this.catalog = catalog));

            await writeJsObjectToFile(this.catalogPath, this.catalog);

            notification.update(progressToastId, {
                type: notification.SUCCESS,
                render: `The latest extensions catalog successfully downloaded.`,
                autoClose: 5000
            });
        });

        req.addEventListener("error", error => {
            console.error("ExtensionsCatalog download error", error);
            notification.update(progressToastId, {
                type: notification.ERROR,
                render: `Failed to download extensions catalog.`,
                autoClose: 5000
            });
        });

        req.send();
    }
    */

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
                    try { await writeJsObjectToFile(this.catalogPath, this.catalog); } catch { /* cache only */ }

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

}

export const extensionsCatalog = new ExtensionsCatalog();
