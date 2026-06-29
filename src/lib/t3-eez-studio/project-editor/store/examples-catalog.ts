import { observable, runInAction, makeObservable } from "mobx";

import {
    getUserDataPath,
    fileExists,
    readJsObjectFromFile,
    writeJsObjectToFile
} from "eez-studio-shared/util-electron";

import * as notification from "eez-studio-ui/notification";

import type { ExampleProject } from "project-editor/project/ui/Wizard";

import JSZip from "jszip";

export const EEZ_PROJECT_EXAMPLES_REPOSITORY =
    "https://github.com/eez-open/eez-project-examples";

// const CATALOG_VERSION_DOWNLOAD_URL =
//     "https://github.com/eez-open/eez-project-examples/raw/master/build/catalog-version.json";

// const CATALOG_DOWNLOAD_URL =
//     "https://github.com/eez-open/eez-project-examples/raw/master/build/catalog.zip";

// export const CATALOG_VERSION_DOWNLOAD_URL =
//   "https://raw.githubusercontent.com/eez-open/eez-project-examples/master/build/catalog-version.json";

// export const CATALOG_DOWNLOAD_URL =
//   "https://raw.githubusercontent.com/eez-open/eez-project-examples/master/build/catalog.zip";

export const CATALOG_VERSION_DOWNLOAD_URL =
  "/ghraw-examples/catalog-version.json";

export const CATALOG_DOWNLOAD_URL =
  "/ghraw-examples/catalog.zip";

interface ICatalogVersion {
    lastModified: Date;
}

class ExamplesCatalog {
    catalogAtStart: ExampleProject[];

    catalog: ExampleProject[] = [];
    catalogVersion: ICatalogVersion;

    onNewCatalog: () => void | undefined;

    constructor() {
        makeObservable(this, {
            catalogAtStart: observable,
            catalog: observable
        });
    }

    async load() {
        try {
            const catalog = await this._loadCatalog();
            runInAction(() => {
                if (!this.catalogAtStart) {
                    this.catalogAtStart = catalog;
                }
                this.catalog = catalog;
            });
        } catch (error) {
            console.error("[catalog] Failed to load catalog:", error);
            notification.error(
                `Failed to load eez-project examples catalog (${error})`
            );
        }

        try {
            const catalogVersion = await this._loadCatalogVersion();
            runInAction(() => (this.catalogVersion = catalogVersion));
            this.checkNewVersionOfCatalog();
        } catch (error) {
            console.error("[catalog] Failed to load catalog version:", error);
            notification.error(`Failed to load catalog version (${error})`);
        }
    }

    get catalogPath() {
        return getUserDataPath("examples-catalog.json");
    }

    async _loadCatalog() {
        let catalogPath = this.catalogPath;
        if (await fileExists(catalogPath)) {
            const data = await readJsObjectFromFile(catalogPath);
            if (Array.isArray(data)) {
                return data as ExampleProject[];
            }
        }
        return [] as ExampleProject[];
    }

    get catalogVersionPath() {
        return getUserDataPath("examples-catalog-version.json");
    }

    async _loadCatalogVersion() {
        let catalogVersionPath = this.catalogVersionPath;
        if (await fileExists(catalogVersionPath)) {
            try {
                const catalogVersion = await readJsObjectFromFile(
                    catalogVersionPath
                );
                catalogVersion.lastModified = new Date(
                    catalogVersion.lastModified
                );
                return catalogVersion;
            } catch (err) {
                console.error(err);
            }
        }
        return undefined;
    }

    async checkNewVersionOfCatalog() {
        try {
            const catalogVersion = await this.downloadCatalogVersion();

            if (!catalogVersion) {
                return false;
            }

            const needDownload =
                this.catalog.length === 0 ||
                !this.catalogVersion ||
                catalogVersion.lastModified > this.catalogVersion.lastModified;

            if (needDownload) {
                runInAction(() => (this.catalogVersion = catalogVersion));
                this.downloadCatalog();
            } else {
                return false;
            }
        } catch (error) {
            console.error(error);
            notification.error(
                `Failed to download eez-project examples catalog version`
            );
        }

        return true;
    }

    downloadCatalogVersion() {
        return new Promise<ICatalogVersion>((resolve, reject) => {
            var req = new XMLHttpRequest();
            req.responseType = "json";
            req.open("GET", CATALOG_VERSION_DOWNLOAD_URL);

            req.addEventListener("load", async () => {
                const catalogVersion = req.response;
                if (!catalogVersion) {
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
                console.error("Failed to download catalog-version.json", error);
                resolve(null as any);
            });

            req.send();
        });
    }

    downloadCatalog() {
        var req = new XMLHttpRequest();
        req.responseType = "arraybuffer";
        req.open("GET", CATALOG_DOWNLOAD_URL);

        const progressToastId = notification.info(
            "Downloading eez-project examples catalog ...",
            {
                autoClose: false,
                hideProgressBar: false
            }
        );

        req.addEventListener("progress", event => {
            notification.update(progressToastId, {
                render: event.total
                    ? `Downloading eez-project examples catalog: ${event.loaded} of ${event.total}`
                    : `Downloading eez-project examples catalog: ${event.loaded}`
            });
        });

        req.addEventListener("load", async () => {
            try {
                if (!req.response || req.response.byteLength === 0) {
                    throw new Error("Downloaded catalog is empty");
                }
                // Use JSZip (same as extensions catalog)
                const zip = await JSZip.loadAsync(req.response as ArrayBuffer);
                // Get the first file's content as raw bytes then decode
                const names = Object.keys(zip.files);
                if (names.length === 0) throw new Error("Zip is empty");
                const data = await zip.files[names[0]].async("uint8array");
                const catalogJson = new TextDecoder("utf-8").decode(data);
                const catalog = JSON.parse(catalogJson);
                if (!Array.isArray(catalog)) {
                    throw new Error("Catalog is not an array");
                }

                // Clone before mobx wraps it — Proxy breaks JSON.stringify
                const rawCatalog = JSON.parse(JSON.stringify(catalog));

                runInAction(() => {
                    this.catalog = catalog;
                });

                if (this.onNewCatalog) {
                    this.onNewCatalog();
                }

                await writeJsObjectToFile(this.catalogPath, rawCatalog);

                notification.update(progressToastId, {
                    type: notification.SUCCESS,
                    render: `The latest eez-project examples catalog successfully downloaded.`,
                    autoClose: 5000
                });
            } catch (err) {
                console.error("Failed to process catalog zip", err);
                notification.update(progressToastId, {
                    type: notification.ERROR,
                    render: `Failed to process eez-project examples catalog.`,
                    autoClose: 5000
                });
            }
        });

        req.addEventListener("error", error => {
            console.error("eez-project examples catalog download error", error);
            notification.update(progressToastId, {
                type: notification.ERROR,
                render: `Failed to download eez-project examples catalog.`,
                autoClose: 5000
            });
        });

        req.send();
    }
}

export const examplesCatalog = new ExamplesCatalog();
