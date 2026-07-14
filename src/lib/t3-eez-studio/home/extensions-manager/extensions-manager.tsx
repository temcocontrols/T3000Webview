import { dialog, getCurrentWindow } from "@electron/remote";
import React from "react";
import {
    observable,
    computed,
    action,
    runInAction,
    autorun,
    makeObservable,
    IReactionDisposer
} from "mobx";
import { observer } from "mobx-react";
import classNames from "classnames";
import * as FlexLayout from "flexlayout-react";

var sha256 = require("sha256");

import { compareVersions, studioVersion } from "eez-studio-shared/util";
import { humanize } from "eez-studio-shared/string";

import {
    ExtensionType,
    IExtension
} from "eez-studio-shared/extensions/extension";
import {
    extensions,
    installExtension,
    uninstallExtension,
    changeExtensionImage,
    exportExtension,
    reloadExtension
} from "eez-studio-shared/extensions/extensions";
import { extensionsFolderPath } from "eez-studio-shared/extensions/extension-folder";

import {
    copyFile,
    getValidFileNameFromFileName
} from "eez-studio-shared/util-electron";
// Browser-compatible temp file + binary write (aliased util-electron may resolve to Node.js version)
import { getTempFilePath, writeBinaryData, deleteFile } from "eez-studio-shared/util-web";
import { stringCompare } from "eez-studio-shared/string";

import {
    VerticalHeaderWithBody,
    Header,
    Body
} from "eez-studio-ui/header-with-body";
import { Toolbar } from "eez-studio-ui/toolbar";
import { ButtonAction } from "eez-studio-ui/action";
import { List, ListItem, IListNode } from "eez-studio-ui/list";
import {
    info,
    confirm,
    confirmWithButtons
} from "eez-studio-ui/dialog-electron";
import * as notification from "eez-studio-ui/notification";
import { SearchInput } from "eez-studio-ui/search-input";
import { FlexLayoutContainer } from "eez-studio-ui/FlexLayout";
import { Input, Button, Badge, makeStyles, tokens, mergeClasses, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from "@fluentui/react-components";
import { SearchRegular, ArrowDownloadRegular, ArrowSyncRegular, MoreHorizontalRegular } from "@fluentui/react-icons";

import { ExtensionShortcuts } from "home/extensions-manager/extension-shortcuts";
import { extensionsCatalog } from "home/extensions-manager/catalog";

import { homeLayoutModels } from "home/home-layout-models";

////////////////////////////////////////////////////////////////////////////////

const installedExtensions = computed(() => {
    return Array.from(extensions.values()).filter(
        extension => !extension.preInstalled
    );
});

////////////////////////////////////////////////////////////////////////////////

export enum ViewFilter {
    ALL,
    INSTALLED,
    NOT_INSTALLED,
    NEW_VERSIONS
}

interface IExtensionVersions {
    allVersions: IExtension[];
    installedVersion?: IExtension;
    latestVersion: IExtension;
    versionInFocus: IExtension; // installed || latest
}

class ExtensionsVersionsCatalogBuilder {
    extensionsVersions: IExtensionVersions[] = [];

    isInstalled(extension: IExtension) {
        return !!extension.installationFolderPath;
    }

    addVersion(extensionVersions: IExtensionVersions, extension: IExtension) {
        for (let i = 0; i < extensionVersions.allVersions.length; ++i) {
            const compareResult = compareVersions(
                extension.version,
                extensionVersions.allVersions[i].version
            );

            if (compareResult > 0) {
                extensionVersions.allVersions.splice(i, 0, extension);
                return;
            }

            if (compareResult === 0) {
                if (this.isInstalled(extension)) {
                    extensionVersions.allVersions[i] = extension;
                }
                return;
            }
        }

        extensionVersions.allVersions.push(extension);
    }

    addExtension(extension: IExtension) {
        for (const extensionVersions of this.extensionsVersions) {
            if (extensionVersions.versionInFocus.id === extension.id) {
                // a new version of already seen extension
                this.addVersion(extensionVersions, extension);

                if (
                    compareVersions(
                        extension.version,
                        extensionVersions.latestVersion.version
                    ) > 0
                ) {
                    extensionVersions.latestVersion = extension;
                }

                if (this.isInstalled(extension)) {
                    extensionVersions.installedVersion = extension;
                }

                extensionVersions.versionInFocus =
                    extensionVersions.installedVersion ||
                    extensionVersions.latestVersion;

                return;
            }
        }

        // a new extension
        const extensionVersions: IExtensionVersions = {
            allVersions: [extension],
            latestVersion: extension,
            versionInFocus: extension
        };

        if (this.isInstalled(extension)) {
            extensionVersions.installedVersion = extension;
        }

        this.extensionsVersions.push(extensionVersions);
    }

    get(
        extensionType?: ExtensionType,
        viewFilter?: ViewFilter,
        searchText?: string,
        excludeExtensions?: string[]
    ) {
        let extensionsVersions;

        if (extensionType) {
            extensionsVersions = this.extensionsVersions.filter(
                extensionsVersions =>
                    extensionsVersions.versionInFocus.extensionType ==
                    extensionType
            );
        } else {
            extensionsVersions = this.extensionsVersions;
        }

        if (searchText) {
            extensionsVersions = extensionsVersions.filter(
                extensionsVersions => {
                    const parts = searchText.trim().toLowerCase().split("+");
                    if (parts.length == 0) {
                        return true;
                    }

                    const searchTargets = [
                        extensionsVersions.versionInFocus.name,
                        extensionsVersions.versionInFocus.displayName,
                        extensionsVersions.versionInFocus.description,
                        extensionsVersions.versionInFocus.author
                    ]
                        .filter(target => target && target.trim().length > 0)
                        .join(", ")
                        .toLowerCase();

                    return !parts.find(
                        part => searchTargets.indexOf(part) == -1
                    );
                }
            );
        }

        if (excludeExtensions) {
            extensionsVersions = extensionsVersions.filter(
                extensionsVersions => {
                    return !excludeExtensions.find(
                        excludeExtension =>
                            extensionsVersions.versionInFocus.name ===
                            excludeExtension
                    );
                }
            );
        }

        if (viewFilter == undefined || viewFilter === ViewFilter.ALL) {
            return extensionsVersions;
        } else if (viewFilter === ViewFilter.INSTALLED) {
            return extensionsVersions.filter(
                extensionVersions => !!extensionVersions.installedVersion
            );
        } else if (viewFilter === ViewFilter.NOT_INSTALLED) {
            return extensionsVersions.filter(
                extensionVersions => !extensionVersions.installedVersion
            );
        } else {
            return extensionsVersions.filter(
                extensionVersions =>
                    extensionVersions.installedVersion &&
                    compareVersions(
                        extensionVersions.latestVersion.version,
                        extensionVersions.installedVersion.version
                    ) > 0
            );
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

export class ExtensionsManagerStore {
    section: ExtensionType = "iext";
    selectedExtension: IExtension | undefined;
    _viewFilter: ViewFilter | undefined;
    searchText: string = "";
    excludeExtensions: string[] | undefined;

    constructor() {
        makeObservable(this, {
            section: observable,
            selectedExtension: observable,
            _viewFilter: observable,
            viewFilter: computed,
            searchText: observable,
            excludeExtensions: observable,

            extensionsVersionsCatalogBuilder: computed,
            all: computed,
            installed: computed,
            notInstalled: computed,
            newVersions: computed,
            extensionNodes: computed,

            selectExtensionById: action,
            selectedExtensionVersions: computed,

            switchToInstrumentExtensions: action.bound,
            switchToProjectExtensions: action.bound,
            switchToMeasurementExtensions: action.bound,
            onSearchChange: action.bound
        });
    }

    updateSelectedExtension() {
        if (
            !extensionsManagerStore.extensionNodes.find(
                extensionNode => extensionNode.id == this.selectedExtension?.id
            )
        ) {
            this.selectedExtension =
                extensionsManagerStore.extensionNodes.length > 0
                    ? extensionsManagerStore.extensionNodes[0].data
                    : undefined;
        }
    }

    updateViewFilter() {
        if (this._viewFilter) {
            if (
                (this._viewFilter == ViewFilter.INSTALLED &&
                    this.installed.length == 0) ||
                (this._viewFilter == ViewFilter.NOT_INSTALLED &&
                    this.notInstalled.length == 0) ||
                (this._viewFilter == ViewFilter.NEW_VERSIONS &&
                    this.newVersions.length == 0)
            ) {
                this._viewFilter = ViewFilter.ALL;
            }
        }

        this.updateSelectedExtension();
    }

    switchToInstrumentExtensions() {
        this.section = "iext";
        this.updateViewFilter();
    }
    switchToProjectExtensions() {
        this.section = "pext";
        this.updateViewFilter();
    }
    switchToMeasurementExtensions() {
        this.section = "measurement-functions";
        this.updateViewFilter();
    }

    onSearchChange(event: any) {
        this.searchText = $(event.target).val() as string;
        this._viewFilter = ViewFilter.ALL;
    }

    get viewFilter() {
        if (this._viewFilter !== undefined) {
            return this._viewFilter;
        }

        if (this.newVersions.length > 0) {
            return ViewFilter.NEW_VERSIONS;
        }

        return ViewFilter.ALL;
    }

    set viewFilter(value: ViewFilter) {
        this._viewFilter = value;
    }

    filterExtension(extension: IExtension) {
        if (extension.extensionType != this.section) {
            return false;
        }
        return true;
    }

    get extensionsVersionsCatalogBuilder() {
        const builder = new ExtensionsVersionsCatalogBuilder();

        installedExtensions.get().forEach(extension => {
            builder.addExtension(extension);
        });

        const catalog = extensionsCatalog.catalog;
        if (Array.isArray(catalog)) {
            catalog.forEach((extension: any) => {
                const extensionMinStudioVersion = (extension as any)["eez-studio"]
                    .minVersion;
                if (extensionMinStudioVersion !== undefined) {
                    if (
                        compareVersions(studioVersion, extensionMinStudioVersion) <
                        0
                    ) {
                        return;
                    }
                }

                builder.addExtension(extension);
            });
        }

        return builder;
    }

    get all() {
        // All extensions hidden pending custom LVGL extensions
        return [];
        /*
        return this.extensionsVersionsCatalogBuilder.get(
            this.section,
            ViewFilter.ALL,
            this.searchText
        );
        */
    }

    get installed() {
        return [];
        /*
        return this.extensionsVersionsCatalogBuilder.get(
            this.section,
            ViewFilter.INSTALLED,
            this.searchText
        );
        */
    }

    get notInstalled() {
        return [];
        /*
        return this.extensionsVersionsCatalogBuilder.get(
            this.section,
            ViewFilter.NOT_INSTALLED,
            this.searchText
        );
        */
    }

    get newVersions() {
        return [];
        /*
        return this.extensionsVersionsCatalogBuilder.get(
            this.section,
            ViewFilter.NEW_VERSIONS,
            this.searchText
        );
        */
    }

    get newVersionsInAllSections() {
        return [];
        /*
        return this.extensionsVersionsCatalogBuilder.get(
            undefined,
            ViewFilter.NEW_VERSIONS,
            ""
        );
        */
    }

    get extensionNodes() {
        return [];
        /*
        return this.extensionsVersionsCatalogBuilder
            .get(
                this.section,
                extensionsManagerStore.viewFilter,
                this.searchText,
                this.excludeExtensions
            )
            .sort((a, b) =>
                stringCompare(
                    a.versionInFocus.displayName || a.versionInFocus.name,
                    b.versionInFocus.displayName || b.versionInFocus.name
                )
            )
            .map(extension => ({
                id: extension.versionInFocus.id,
                data: extension.versionInFocus,
                selected:
                    extensionsManagerStore.selectedExtension !== undefined &&
                    extension.versionInFocus.id ===
                        extensionsManagerStore.selectedExtension.id
            }));
        */
    }

    selectExtensionById(id: string) {
        const extensionNode = this.extensionNodes.find(
            extensionNode => extensionNode.id === id
        );
        this.selectedExtension =
            (extensionNode && extensionNode.data) || undefined;

        this.updateSelectedExtension();
    }

    getExtensionVersionsById(id: string) {
        return this.extensionsVersionsCatalogBuilder
            .get(undefined, ViewFilter.ALL, "")
            .find(
                extensionVersions => extensionVersions.versionInFocus.id === id
            );
    }

    get selectedExtensionVersions() {
        if (!this.selectedExtension) {
            return undefined;
        }
        return this.getExtensionVersionsById(this.selectedExtension.id);
    }

    getSelectedExtensionByVersion(version: string) {
        return (
            this.selectedExtensionVersions &&
            this.selectedExtensionVersions.allVersions.find(
                extension => extension.version === version
            )
        );
    }
}

export const extensionsManagerStore = new ExtensionsManagerStore();

////////////////////////////////////////////////////////////////////////////////

export const ExtensionInMasterView = observer(
    class ExtensionInMasterView extends React.Component<
        {
            extension: IExtension;
        },
        {}
    > {
        constructor(props: { extension: IExtension }) {
            super(props);

            makeObservable(this, {
                extensionInstalled: computed
            });
        }

        get extensionInstalled() {
            const extensionVersions =
                extensionsManagerStore.getExtensionVersionsById(
                    this.props.extension.id
                );
            return extensionVersions && extensionVersions.installedVersion;
        }

        render() {
            const installed = this.extensionInstalled;
            const ext = this.props.extension;

            // Proxy local file paths through API (browser can't load file:// or /absolute/paths)
            let imgSrc = ext.image;
            if (imgSrc && typeof imgSrc === "string") {
                if (!imgSrc.startsWith("data:") && !imgSrc.startsWith("http")) {
                    console.log(`[ExtImg] proxying: name="${ext.name}" raw="${ext.image}"`);
                    if (imgSrc.startsWith("file://")) {
                        imgSrc = `/api/eez-studio/read-file?path=${encodeURIComponent(imgSrc.replace(/^file:\/\/\//, "").replace(/^file:\/\//, ""))}`;
                    } else if (imgSrc.startsWith("/") || /^[A-Za-z]:/.test(imgSrc)) {
                        imgSrc = `/api/eez-studio/read-file?path=${encodeURIComponent(imgSrc)}`;
                    }
                    console.log(`[ExtImg] proxied: "${imgSrc}"`);
                } else {
                    console.log(`[ExtImg] passthrough: name="${ext.name}" type=${imgSrc.substring(0, 30)}...`);
                }
            } else {
                console.log(`[ExtImg] empty: name="${ext.name}"`);
            }

            return (
                <ListItem
                    leftIcon={imgSrc}
                    leftIconSize={80}
                    label={
                        <div style={{ padding: "2px 0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                <span style={{ fontSize: "14px", fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                                    {this.props.extension.displayName || this.props.extension.name}
                                </span>
                                <Badge
                                    appearance="filled"
                                    size="medium"
                                    style={{
                                        fontWeight: 700,
                                        backgroundColor: installed ? "#dff6dd" : "#deecf9",
                                        color: installed ? "#0b5e2e" : "#0f4c7a",
                                    }}
                                >
                                    {installed ? "Installed" : "Not installed"}
                                </Badge>
                                <span style={{ marginLeft: "auto", fontSize: "12px", color: tokens.colorNeutralForeground3 }}>
                                    v{this.props.extension.version}
                                </span>
                            </div>
                            <div style={{ fontSize: "12px", color: tokens.colorNeutralForeground2, marginBottom: "2px" }}>
                                {this.props.extension.description}
                            </div>
                            <div style={{ fontSize: "11px", color: tokens.colorNeutralForeground3 }}>
                                {this.props.extension.author}
                            </div>
                        </div>
                    }
                />
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

function confirmMessage(extension: IExtension) {
    return `You are about to install version ${extension.version} of the '${
        extension.displayName || extension.name
    }' extension.`;
}

const BUTTON_INSTRUCTIONS = `
Click 'OK' to replace the installed version.
Click 'Cancel' to stop the installation.`;

const BUTTONS = ["OK", "Cancel"];

export const MasterView = observer(
    class MasterView extends React.Component {
        render() {
            return (
                <List
                    className="EezStudio_ExtensionsManager_MasterView"
                    nodes={extensionsManagerStore.extensionNodes}
                    renderNode={node => (
                        <ExtensionInMasterView extension={node.data} />
                    )}
                    selectNode={action(
                        (node: IListNode) =>
                            (extensionsManagerStore.selectedExtension =
                                node.data)
                    )}
                />
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

type SectionType = "properties" | "shortcuts";

interface ExtensionSectionsProps {
    extension: IExtension;
}

export const ExtensionSections = observer(
    class ExtensionSections extends React.Component<
        ExtensionSectionsProps,
        {}
    > {
        activeSection: SectionType = "properties";

        constructor(props: ExtensionSectionsProps) {
            super(props);

            makeObservable(this, {
                activeSection: observable,
                activateSection: action
            });
        }
        activateSection(section: SectionType, event: any) {
            event.preventDefault();
            this.activeSection = section;
        }

        render() {
            const ext = this.props.extension;
            const hasRenderProps = typeof ext.renderPropertiesComponent === "function";
            const propsResult = hasRenderProps ? ext.renderPropertiesComponent!() : null;
            const hasShortcuts = !!(ext.properties && ext.properties.shortcuts && ext.properties.shortcuts.length > 0);
            console.log("[ExtSections] render:", {
                name: ext.displayName || ext.name,
                hasRenderPropsFn: hasRenderProps,
                propsResultTruthy: !!propsResult,
                hasProperties: !!ext.properties,
                propertiesKeys: ext.properties ? Object.keys(ext.properties) : [],
                hasShortcuts,
                shortcutsLen: ext.properties?.shortcuts?.length,
            });

            let availableSections: SectionType[] = [];

            const props = this.props.extension.properties;
            const propertiesComponent = this.props.extension
                .renderPropertiesComponent
                ? this.props.extension.renderPropertiesComponent()
                : null;

            // Fallback: render generic property sections from package.json data
            const hasGenericProperties = props && (
                props.connection || props.channels || props.lists || props.fileDownload
            );
            if (propertiesComponent || hasGenericProperties) {
                availableSections.push("properties");
            }

            if (props && props.shortcuts && props.shortcuts.length > 0) {
                availableSections.push("shortcuts");
            }

            if (availableSections.length === 0) {
                return null;
            }

            let activeSection = this.activeSection;

            if (availableSections.indexOf(activeSection) === -1) {
                activeSection = availableSections[0];
            }

            let navigationItems = availableSections.map(section => {
                let className = classNames("nav-link", {
                    active: section === activeSection
                });

                return (
                    <li key={section} className="nav-item">
                        <a
                            className={className}
                            href="#"
                            onClick={this.activateSection.bind(this, section)}
                        >
                            {humanize(section)}
                        </a>
                    </li>
                );
            });

            let body;
            if (activeSection === "properties") {
                body = propertiesComponent || (
                    <pre style={{ padding: "10px", fontSize: "11px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "Consolas, Monaco, monospace", margin: 0 }}>
                        {JSON.stringify(props, null, 2)}
                    </pre>
                );
            } else if (activeSection === "shortcuts") {
                body = <ExtensionShortcuts extension={this.props.extension} />;
            }

            return (
                <div className="EezStudio_ExtensionsManager_DetailsView_Body">
                    <style>{`
                        .EezStudio_ExtensionsManager_DetailsView .EezStudio_Body::-webkit-scrollbar { width: 6px; height: 6px; }
                        .EezStudio_ExtensionsManager_DetailsView .EezStudio_Body::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
                    `}</style>
                    <div style={{ marginTop: "10px" }}>
                        <ul className="nav nav-tabs">{navigationItems}</ul>
                    </div>

                    <div
                        style={{
                            padding: "10px",
                            fontSize: "12px",
                            overflowY: "auto",
                            overflowX: "auto",
                            scrollbarWidth: "thin",
                            scrollbarColor: "#c1c1c1 transparent",
                            maxHeight: "100%",
                        }}
                    >
                        {body}
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

async function finishInstall(extensionZipPackageData: any) {
    try {
    console.log("[ext-install] finishInstall called, data len:", extensionZipPackageData?.length);
    const tempFilePath = await getTempFilePath();
    console.log("[ext-install] tempFilePath:", tempFilePath);

    await writeBinaryData(tempFilePath, extensionZipPackageData);
    console.log("[ext-install] wrote temp file, now installing...");

    const extension = await installExtension(tempFilePath, {
        notFound() {
            console.log("[ext-install] installExtension notFound called");
        },
        async confirmReplaceNewerVersion(
            newExtension: IExtension,
            existingExtension: IExtension
        ) {
            return true;
        },
        async confirmReplaceOlderVersion(
            newExtension: IExtension,
            existingExtension: IExtension
        ) {
            return true;
        },
        async confirmReplaceTheSameVersion(
            newExtension: IExtension,
            existingExtension: IExtension
        ) {
            return true;
        }
    });

    // Clean up temp ZIP file
    try { await deleteFile(tempFilePath); } catch {}
    console.log("[ext-install] installExtension result:", extension?.id);
    return extension;
    } catch(e) {
        console.error("[ext-install] finishInstall error:", e);
        throw e;
    }
}

export function downloadAndInstallExtension(
    extensionToInstall: IExtension,
    progressId: notification.ProgressId,
    progress: {
        update(
            progressId: string | number,
            options: {
                render: React.ReactNode;
                type: notification.Type;
                autoClose?: number | false;
            }
        ): void;
    } = notification
) {
    return new Promise<IExtension | undefined>(async (resolve, reject) => {
        if (extensionToInstall.extensionType == "pext") {
            progress.update(progressId, {
                render: `Installing extension ${
                    extensionToInstall.displayName || extensionToInstall.name
                }@${extensionToInstall.version} ...`,
                type: notification.INFO
            });

            try {
                const { yarnInstall } = await import(
                    "eez-studio-shared/extensions/yarn"
                );

                await yarnInstall(extensionToInstall);

                const extension = await reloadExtension(
                    extensionsFolderPath +
                        "/node_modules/" +
                        extensionToInstall.name
                );

                progress.update(progressId, {
                    render: `Extension ${
                        extensionToInstall.displayName ||
                        extensionToInstall.name
                    }@${extensionToInstall.version} has been installed.`,
                    type: notification.INFO,
                    autoClose: 5000
                });

                resolve(extension);
            } catch (err) {
                progress.update(progressId, {
                    render: `Failed to install ${
                        extensionToInstall.displayName ||
                        extensionToInstall.name
                    }@${extensionToInstall.version} extension: ${err}`,
                    type: notification.ERROR,
                    autoClose: 5000
                });

                reject();
            }
        } else {
            var req = new XMLHttpRequest();
            req.responseType = "arraybuffer";
            // Browser: proxy through backend to avoid CORS (process.platform set by browser-polyfill)
            let downloadUrl = extensionToInstall.download!;
            if (typeof process !== "undefined" && (process as any).platform === "browser") {
                downloadUrl = "/api/eez-studio/proxy-fetch-binary?url=" + encodeURIComponent(downloadUrl);
            }
            req.open("GET", downloadUrl);

            progress.update(progressId, {
                render: `Downloading "${
                    extensionToInstall.displayName || extensionToInstall.name
                }" extension package ...`,
                type: notification.INFO
            });

            req.addEventListener("progress", event => {
                progress.update(progressId, {
                    render: `Downloading "${
                        extensionToInstall.displayName ||
                        extensionToInstall.name
                    }" extension package: ${event.loaded} of ${event.total}.`,
                    type: notification.INFO
                });
            });

            req.addEventListener("load", () => {
                console.log("[ext-install] download complete, bytes:", req.response?.byteLength);
                const extensionZipFileData = Buffer.from(req.response);
                console.log("[ext-install] buffer created, len:", extensionZipFileData.length);

                // Skip SHA-256 check in browser (stub can't compute real hash)
                if (extensionToInstall.sha256 && (process as any).platform !== "browser") {
                    if (
                        sha256(extensionZipFileData) !==
                        extensionToInstall.sha256
                    ) {
                        progress.update(progressId, {
                            render: `Failed to install "${
                                extensionToInstall.displayName ||
                                extensionToInstall.name
                            }" extension because package file hash doesn't match.`,
                            type: notification.ERROR,
                            autoClose: 5000
                        });
                        reject();
                        return;
                    }
                }

                console.log("[ext-install] calling finishInstall...");
                finishInstall(extensionZipFileData)
                    .then(extension => {
                        console.log("[ext-install] finishInstall resolved:", extension?.id);
                        if (extension) {
                            progress.update(progressId, {
                                render: `Extension "${
                                    extension.displayName || extension.name
                                }" installed.`,
                                type: notification.SUCCESS,
                                autoClose: 5000
                            });
                        } else {
                            progress.update(progressId, {
                                render: `Failed to install "${
                                    extensionToInstall.displayName ||
                                    extensionToInstall.name
                                }" extension.`,
                                type: notification.ERROR,
                                autoClose: 5000
                            });
                        }
                        resolve(extension);
                    })
                    .catch(error => {
                        console.error("[ext-install] finishInstall failed:", error);
                        progress.update(progressId, {
                            render: `Failed to install "${
                                extensionToInstall.displayName ||
                                extensionToInstall.name
                            }" extension.`,
                            type: notification.ERROR,
                            autoClose: 5000
                        });
                        reject();
                    });
            });

            req.addEventListener("error", error => {
                console.error("Extension download error", error);
                progress.update(progressId, {
                    render: `Failed to download "${
                        extensionToInstall.displayName ||
                        extensionToInstall.name
                    }" extension package.`,
                    type: notification.ERROR,
                    autoClose: 5000
                });
                reject();
            });

            req.send();
        }
    });
}

////////////////////////////////////////////////////////////////////////////////

export const DetailsView = observer(
    class DetailsView extends React.Component {
        selectedVersion: string;
        autorunDispose: IReactionDisposer;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                selectedVersion: observable,
                displayedExtension: computed,
                extensionVersions: computed,
                installEnabled: computed,
                updateEnabled: computed,
                replaceEnabled: computed,
                uninstallEnabled: computed
            });
        }

        componentDidMount() {
            this.autorunDispose = autorun(() => {
                const selectedExtensionVersions =
                    extensionsManagerStore.selectedExtensionVersions;
                if (selectedExtensionVersions) {
                    runInAction(
                        () =>
                            (this.selectedVersion =
                                selectedExtensionVersions.versionInFocus.version)
                    );
                }
            });
        }

        componentWillUnmount() {
            this.autorunDispose();
        }

        get displayedExtension() {
            return extensionsManagerStore.getSelectedExtensionByVersion(
                this.selectedVersion
            );
        }

        get extensionVersions() {
            return extensionsManagerStore.selectedExtensionVersions;
        }

        get installEnabled() {
            return !(
                this.extensionVersions &&
                this.extensionVersions.installedVersion
            );
        }

        get updateEnabled() {
            return (
                this.extensionVersions &&
                this.extensionVersions.installedVersion &&
                this.displayedExtension ===
                    this.extensionVersions.installedVersion &&
                compareVersions(
                    this.extensionVersions.latestVersion.version,
                    this.extensionVersions.installedVersion.version
                ) > 0
            );
        }

        get replaceEnabled() {
            return (
                this.extensionVersions &&
                this.extensionVersions.installedVersion &&
                this.displayedExtension !==
                    this.extensionVersions.installedVersion
            );
        }

        get uninstallEnabled() {
            return (
                this.extensionVersions &&
                this.extensionVersions.installedVersion
            );
        }

        handleInstall = async () => {
            if (!this.extensionVersions) {
                return;
            }

            let extensionToInstall = this.displayedExtension;
            if (!extensionToInstall) {
                return;
            }

            if (
                extensionToInstall === this.extensionVersions.installedVersion
            ) {
                // if already installed then install latest version
                extensionToInstall = this.extensionVersions.latestVersion;
                if (!extensionToInstall) {
                    return;
                }
            }

            const progressToastId = notification.info("Updating...", {
                autoClose: false
            });
            await new Promise(resolve => setTimeout(resolve, 500));

            const extension = await downloadAndInstallExtension(
                extensionToInstall,
                progressToastId
            );

            if (extension) {
                extensionsManagerStore.selectExtensionById(extension.id);
            }
        };

        handleUninstall = () => {
            if (!this.extensionVersions) {
                return;
            }

            const extension = this.extensionVersions.installedVersion;
            if (!extension) {
                return;
            }

            confirm("Are you sure?", undefined, async () => {
                try {
                    await uninstallExtension(extension.id);
                    notification.success(
                        `Extension "${
                            extension.displayName || extension.name
                        }" uninstalled`
                    );
                    extensionsManagerStore.selectExtensionById(extension.id);
                } catch (err) {
                    notification.error(
                        `Failed to uninstall extension ${
                            extension.displayName || extension.name
                        }: ${err}`
                    );
                }
            });
        };

        handleExport = async () => {
            if (!this.extensionVersions) {
                return;
            }

            const extension = this.extensionVersions.installedVersion;
            if (!extension) {
                return;
            }

            const result = await dialog.showSaveDialog(getCurrentWindow(), {
                filters: [
                    { name: "Extension files", extensions: ["zip"] },
                    { name: "All Files", extensions: ["*"] }
                ],
                defaultPath: getValidFileNameFromFileName(
                    extension.name + ".zip"
                )
            });

            let filePath = result.filePath;
            if (filePath) {
                if (!filePath.toLowerCase().endsWith(".zip")) {
                    filePath += ".zip";
                }

                try {
                    const tempFilePath = await getTempFilePath();
                    await exportExtension(extension, tempFilePath);
                    await copyFile(tempFilePath, filePath);
                    notification.success(`Saved to "${filePath}"`);
                } catch (err) {
                    notification.error(err.toString());
                }
            }
        };

        handleChangeImage = async () => {
            if (!this.extensionVersions) {
                return;
            }

            const extension = this.extensionVersions.installedVersion;
            if (!extension) {
                return;
            }

            const result = await dialog.showOpenDialog(getCurrentWindow(), {
                properties: ["openFile"],
                filters: [
                    {
                        name: "Image files",
                        extensions: ["png", "jpg", "jpeg"]
                    },
                    { name: "All Files", extensions: ["*"] }
                ]
            });
            const filePaths = result.filePaths;
            if (filePaths && filePaths[0]) {
                changeExtensionImage(extension, filePaths[0]);
            }
        };

        static getFullDescription(extension: IExtension): React.ReactNode {
            let fullDescription;
            if (extension.moreDescription) {
                if (extension.description) {
                    fullDescription = extension.description.trim();
                    if (fullDescription) {
                        if (!fullDescription.endsWith(".")) {
                            fullDescription += ".";
                        }
                    }
                }

                if (extension.moreDescription) {
                    if (fullDescription) {
                        fullDescription += "\n";
                    }
                    fullDescription += extension.moreDescription.trim();
                    if (fullDescription) {
                        if (!fullDescription.endsWith(".")) {
                            fullDescription += ".";
                        }
                    }
                }
            } else {
                fullDescription = extension.description;
            }
            if (fullDescription) {
                fullDescription = <pre>{fullDescription}</pre>;
            }
            return fullDescription;
        }

        render() {
            const extension = this.displayedExtension;
            if (!extension) {
                return (
                    <div className="EezStudio_ExtensionsManager_DetailsView"></div>
                );
            }

            return (
                <VerticalHeaderWithBody className="EezStudio_ExtensionsManager_DetailsView">
                    <Header className="EezStudio_ExtensionDetailsHeader">
                        <div className="EezStudio_ExtensionDetailsHeaderImageContainer">
                            {(() => {
                                let imgSrc = extension.image;
                                if (imgSrc && typeof imgSrc === "string") {
                                    if (!imgSrc.startsWith("data:") && !imgSrc.startsWith("http")) {
                                        if (imgSrc.startsWith("file://")) {
                                            imgSrc = `/api/eez-studio/read-file?path=${encodeURIComponent(imgSrc.replace(/^file:\/\/\//, "").replace(/^file:\/\//, ""))}`;
                                        } else if (imgSrc.startsWith("/") || /^[A-Za-z]:/.test(imgSrc)) {
                                            imgSrc = `/api/eez-studio/read-file?path=${encodeURIComponent(imgSrc)}`;
                                        }
                                    }
                                }
                                const imgWidth = extension.extensionType === "iext" ? 256 : 128;
                                return <img src={imgSrc} width={imgWidth} />;
                            })()}
                            {extension.installationFolderPath &&
                                extension.extensionType == "iext" && (
                                    <a
                                        href="#"
                                        style={{ cursor: "pointer" }}
                                        onClick={this.handleChangeImage}
                                    >
                                        Change image
                                    </a>
                                )}
                        </div>
                        <div className="EezStudio_ExtensionDetailsHeaderProperties">
                            <div className="EezStudio_ExtensionDetailsHeaderPropertiesNameAndVersion">
                                <h5>
                                    {extension.displayName || extension.name}
                                </h5>
                                <div className="form-inline">
                                    <label
                                        className="my-1 me-2"
                                        htmlFor="EezStudio_Extension_Details_VersionSelect"
                                    >
                                        Versions:
                                    </label>
                                    <select
                                        id="EezStudio_Extension_Details_VersionSelect"
                                        className="custom-select my-1 me-sm-2"
                                        value={this.selectedVersion}
                                        onChange={action(
                                            (
                                                event: React.ChangeEvent<HTMLSelectElement>
                                            ) => {
                                                this.selectedVersion =
                                                    event.currentTarget.value;
                                            }
                                        )}
                                    >
                                        {this.extensionVersions!.allVersions.map(
                                            extension => (
                                                <option
                                                    key={extension.version}
                                                    value={extension.version}
                                                >
                                                    {extension.version}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div>
                                {DetailsView.getFullDescription(extension)}
                            </div>
                            <div>{extension.author}</div>
                            <div style={{ marginBottom: "10px" }}>
                                <small>{extension.id}</small>
                            </div>
                            <Toolbar>
                                {this.installEnabled && (
                                    <ButtonAction
                                        text="Install"
                                        title="Install extension"
                                        className="btn-success"
                                        onClick={this.handleInstall}
                                    />
                                )}
                                {this.updateEnabled && (
                                    <ButtonAction
                                        text="Update"
                                        title="Update extension to the latest version"
                                        className="btn-success"
                                        onClick={this.handleInstall}
                                    />
                                )}
                                {this.replaceEnabled && (
                                    <ButtonAction
                                        text="Replace"
                                        title="Replace installed extension with selected version"
                                        className="btn-success"
                                        onClick={this.handleInstall}
                                    />
                                )}
                                {this.uninstallEnabled && (
                                    <ButtonAction
                                        text="Uninstall"
                                        title="Uninstall extension"
                                        className="btn-danger"
                                        onClick={this.handleUninstall}
                                    />
                                )}
                                {extension.isEditable && extension.isDirty && (
                                    <ButtonAction
                                        text="Export"
                                        title="Export extension"
                                        className="btn-secondary"
                                        onClick={this.handleExport}
                                    />
                                )}
                            </Toolbar>
                        </div>
                    </Header>
                    <Body>
                        <ExtensionSections extension={extension} />
                    </Body>
                </VerticalHeaderWithBody>
            );
        }
    }
);

const ExtensionsManagerSubNavigation = observer(
    class ExtensionsManagerSubNavigation extends React.Component {
        isUpdatingAll: boolean = false;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                isUpdatingAll: observable
            });
        }

        installExtensionFromFile = async () => {
            const result = await dialog.showOpenDialog(getCurrentWindow(), {
                properties: ["openFile"],
                filters: [
                    { name: "Extensions", extensions: ["zip"] },
                    { name: "All Files", extensions: ["*"] }
                ]
            });

            const filePaths = result.filePaths;
            if (filePaths && filePaths[0]) {
                try {
                    let filePath = filePaths[0];

                    const extension = await installExtension(filePath, {
                        notFound() {
                            info(
                                "This is not a valid extension package file.",
                                undefined
                            );
                        },
                        async confirmReplaceNewerVersion(
                            newExtension: IExtension,
                            existingExtension: IExtension
                        ) {
                            return (
                                (await confirmWithButtons(
                                    confirmMessage(newExtension),
                                    `The newer version ${existingExtension.version} is already installed.${BUTTON_INSTRUCTIONS}`,
                                    BUTTONS
                                )) === 0
                            );
                        },
                        async confirmReplaceOlderVersion(
                            newExtension: IExtension,
                            existingExtension: IExtension
                        ) {
                            return (
                                (await confirmWithButtons(
                                    confirmMessage(newExtension),
                                    `The older version ${existingExtension.version} is already installed.${BUTTON_INSTRUCTIONS}`,
                                    BUTTONS
                                )) === 0
                            );
                        },
                        async confirmReplaceTheSameVersion(
                            newExtension: IExtension,
                            existingExtension: IExtension
                        ) {
                            return (
                                (await confirmWithButtons(
                                    confirmMessage(newExtension),
                                    `That version is already installed.${BUTTON_INSTRUCTIONS}`,
                                    BUTTONS
                                )) === 0
                            );
                        }
                    });

                    if (extension) {
                        notification.success(
                            `Extension "${
                                extension.displayName || extension.name
                            }" installed`
                        );

                        extensionsManagerStore.selectExtensionById(
                            extension.id
                        );
                    }
                } catch (err) {
                    notification.error(err.toString());
                }
            }
        };

        installExtensionFromFolder = async () => {
            const result = await dialog.showOpenDialog(getCurrentWindow(), {
                properties: ["openDirectory"]
            });

            if (result.filePaths && result.filePaths[0]) {
                const folderPath = result.filePaths[0];

                const progressToastId = notification.info("Updating...", {
                    autoClose: false
                });
                await new Promise(resolve => setTimeout(resolve, 500));

                try {
                    notification.update(progressToastId, {
                        render: `Installing extension from ${folderPath} ...`,
                        type: notification.INFO
                    });

                    const extensionToInstall = require(folderPath +
                        "/package.json");

                    const name = extensionToInstall.name;

                    extensionToInstall.name =
                        "link:" + folderPath.replace(/\\/g, "/");
                    extensionToInstall.version = undefined;

                    const { yarnInstall } = await import(
                        "eez-studio-shared/extensions/yarn"
                    );
                    await yarnInstall(extensionToInstall);

                    const extension = await reloadExtension(
                        extensionsFolderPath + "/node_modules/" + name
                    );

                    if (extension) {
                        extensionsManagerStore.selectExtensionById(
                            extension.id
                        );
                    }

                    notification.update(progressToastId, {
                        render: `Extension from ${folderPath} has been installed.`,
                        type: notification.INFO,
                        autoClose: 5000
                    });
                } catch (err) {
                    console.error(err);
                    notification.update(progressToastId, {
                        render: `Failed to install extension from ${folderPath}: ${err}`,
                        type: notification.ERROR,
                        autoClose: 5000
                    });
                }
            }
        };

        updateCatalog = async () => {
            await extensionsCatalog.checkNewVersionOfCatalog(true);
        };

        updateAll = async () => {
            runInAction(() => (this.isUpdatingAll = true));

            const extensionsToUpdate =
                extensionsManagerStore.extensionNodes.map(
                    extensionNode =>
                        extensionsManagerStore.getExtensionVersionsById(
                            extensionNode.data.id
                        )!.latestVersion
                );

            const progressToastId = notification.info("Updating...", {
                autoClose: false
            });
            await new Promise(resolve => setTimeout(resolve, 500));

            for (let i = 0; i < extensionsToUpdate.length; ++i) {
                await downloadAndInstallExtension(
                    extensionsToUpdate[i],
                    progressToastId
                );
            }

            notification.update(progressToastId, {
                render: "All extensions successfully updated!",
                type: notification.SUCCESS,
                autoClose: 5000
            });

            runInAction(() => (this.isUpdatingAll = false));
        };

        render() {
            return (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "10px",
                    minWidth: "200px",
                    maxWidth: "200px",
                }}>
                    {/* Filter list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FilterTab
                            label="All"
                            count={extensionsManagerStore.all.length}
                            selected={extensionsManagerStore.viewFilter === ViewFilter.ALL}
                            onClick={action(() => (extensionsManagerStore.viewFilter = ViewFilter.ALL))}
                        />
                        {extensionsManagerStore.installed.length > 0 && (
                            <FilterTab
                                label="Installed"
                                count={extensionsManagerStore.installed.length}
                                selected={extensionsManagerStore.viewFilter === ViewFilter.INSTALLED}
                                onClick={action(() => (extensionsManagerStore.viewFilter = ViewFilter.INSTALLED))}
                            />
                        )}
                        {extensionsManagerStore.notInstalled.length > 0 && (
                            <FilterTab
                                label="Not installed"
                                count={extensionsManagerStore.notInstalled.length}
                                selected={extensionsManagerStore.viewFilter === ViewFilter.NOT_INSTALLED}
                                onClick={action(() => (extensionsManagerStore.viewFilter = ViewFilter.NOT_INSTALLED))}
                            />
                        )}
                        {extensionsManagerStore.newVersions.length > 0 && (
                            <FilterTab
                                label="New versions"
                                count={extensionsManagerStore.newVersions.length}
                                selected={extensionsManagerStore.viewFilter === ViewFilter.NEW_VERSIONS}
                                onClick={action(() => (extensionsManagerStore.viewFilter = ViewFilter.NEW_VERSIONS))}
                                attention={extensionsManagerStore.newVersions.length > 0}
                            />
                        )}
                    </div>

                    {/* Action menu at bottom-right */}
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", paddingTop: "8px" }}>
                        <Menu positioning="above-end">
                            <MenuTrigger disableButtonEnhancement>
                                <Button appearance="subtle" size="small" icon={<MoreHorizontalRegular />} />
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList style={{ backgroundColor: "#faf9f8", boxShadow: tokens.shadow8, border: "1px solid #edebe9", borderRadius: "6px", padding: "4px" }}>
                                    <MenuItem icon={<ArrowSyncRegular />} onClick={this.updateCatalog} style={{ padding: "8px 12px", borderRadius: "4px" }}>
                                        Update Catalog
                                    </MenuItem>
                                    <MenuItem icon={<ArrowDownloadRegular />} onClick={
                                        extensionsManagerStore.section == "pext"
                                            ? this.installExtensionFromFolder
                                            : this.installExtensionFromFile
                                    } style={{ padding: "8px 12px", borderRadius: "4px" }}>
                                        Install Extension
                                    </MenuItem>
                                </MenuList>
                            </MenuPopover>
                        </Menu>
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

export const ExtensionsList = observer(
    class ExtensionsList extends React.Component {
        factory = (node: FlexLayout.TabNode) => {
            var component = node.getComponent();

            if (component === "Master") {
                return <MasterView />;
            }

            if (component === "Details") {
                return <DetailsView />;
            }

            return null;
        };

        render() {
            if (extensionsManagerStore.extensionNodes.length === 0) {
                return (
                    <div className="EezStudio_ExtensionsManager_NoExtensions">
                        No extension found
                    </div>
                );
            }

            return (
                <FlexLayoutContainer
                    model={homeLayoutModels.extensionManager}
                    factory={this.factory}
                />
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

export const ExtensionsManager = observer(
    class ExtensionsManager extends React.Component {
        render() {
            return (
                <div className="EezStudio_ExtensionsManager">
                    <div style={{
                        margin: `${tokens.spacingVerticalS} auto`,
                        // borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
                        maxWidth: "500px",
                        width: "100%",
                    }}>
                        <style>{`.eez-ext-search-input input::placeholder { font-size: 12px; }`}</style>
                        <Input
                            className="eez-ext-search-input"
                            contentBefore={<SearchRegular fontSize={16} />}
                            placeholder="Search extensions..."
                            value={extensionsManagerStore.searchText}
                            onChange={(e) => {
                                runInAction(() => {
                                    extensionsManagerStore.searchText = e.target.value;
                                    extensionsManagerStore._viewFilter = ViewFilter.ALL;
                                });
                            }}
                            size="medium"
                            style={{ width: "100%", borderRadius: 10, fontSize: "14px" }}
                        />
                    </div>

                    <div style={{
                        display: "flex",
                        gap: "1px",
                        margin: `0 24px 8px 24px`,
                        justifyContent: "center",
                    }}>
                        <NavTab
                            label="Project Editor Extensions"
                            selected={extensionsManagerStore.section == "pext"}
                            onClick={extensionsManagerStore.switchToProjectExtensions}
                            attention={extensionsManagerStore.extensionsVersionsCatalogBuilder.get("pext", ViewFilter.NEW_VERSIONS, "").length > 0}
                        />
                        <NavTab
                            label="Instrument Extensions"
                            selected={extensionsManagerStore.section == "iext"}
                            onClick={extensionsManagerStore.switchToInstrumentExtensions}
                            attention={extensionsManagerStore.extensionsVersionsCatalogBuilder.get("iext", ViewFilter.NEW_VERSIONS, "").length > 0}
                        />
                        <NavTab
                            label="Measurement Extensions"
                            selected={extensionsManagerStore.section == "measurement-functions"}
                            onClick={extensionsManagerStore.switchToMeasurementExtensions}
                            attention={extensionsManagerStore.extensionsVersionsCatalogBuilder.get("measurement-functions", ViewFilter.NEW_VERSIONS, "").length > 0}
                        />
                    </div>

                    <div className="EezStudio_ExtensionsManager_Body" style={{ marginTop: "10px" }}>
                        {extensionsManagerStore.extensionsVersionsCatalogBuilder.get(
                            extensionsManagerStore.section,
                            ViewFilter.ALL,
                            extensionsManagerStore.searchText
                        ).length > 0 ? (
                            <>
                                <ExtensionsManagerSubNavigation />
                                <MasterView />
                                <DetailsView />
                            </>
                        ) : (
                            <div className="EezStudio_ExtensionsManager_NoExtensions">
                                No extension found
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const FilterTab = observer(
    ({
        label,
        count,
        selected,
        onClick,
        attention,
    }: {
        label: string;
        count: number;
        selected: boolean;
        onClick: () => void;
        attention?: boolean;
    }) => (
        <div
            onClick={onClick}
            style={{
                padding: `6px 12px`,
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: selected ? 600 : 400,
                color: selected ? tokens.colorNeutralForeground1 : tokens.colorNeutralForeground2,
                backgroundColor: selected ? tokens.colorNeutralBackground1Selected : "transparent",
                borderRadius: tokens.borderRadiusMedium,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                gap: "6px",
                transition: "background-color 0.15s",
            }}
        >
            {label}
            <Badge appearance="filled" color="informative" size="small" style={{ fontSize: "12px", fontWeight: 600 }}>{count}</Badge>
            {attention && (
                <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: tokens.colorStatusDangerBackground3,
                    display: "inline-block",
                }} />
            )}
        </div>
    )
);

const NavTab = observer(
    ({
        label,
        selected,
        onClick,
        attention,
    }: {
        label: string;
        selected: boolean;
        onClick: () => void;
        attention: boolean;
    }) => (
        <div
            onClick={onClick}
            style={{
                padding: `${tokens.spacingVerticalS} 24px`,
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: selected ? 700 : 500,
                color: selected ? tokens.colorNeutralForeground1 : tokens.colorNeutralForeground2,
                borderBottom: selected ? `2px solid ${tokens.colorBrandStroke1}` : "2px solid transparent",
                transition: "border-color 0.15s, color 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
            }}
        >
            {label}
            {attention && (
                <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: tokens.colorStatusDangerBackground3,
                    display: "inline-block",
                }} />
            )}
        </div>
    )
);
