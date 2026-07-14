import React from "react";
import { observer } from "mobx-react";
import {
    action,
    observable,
    makeObservable,
    computed,
    runInAction
} from "mobx";
import { uniqBy } from "lodash";

import { IExtension } from "eez-studio-shared/extensions/extension";
import {
    getManufacturer,
    isInstrumentExtension
} from "eez-studio-shared/extensions/extensions";

import { showDialog } from "eez-studio-ui/dialog";
import * as notification from "eez-studio-ui/notification";

import {
    ExtensionsManagerStore,
    ViewFilter,
    downloadAndInstallExtension
} from "home/extensions-manager/extensions-manager";

// ── Fluent UI v9 ─────────────────────────────────────────────────
import {
    Button,
    Text,
    Spinner,
    FluentProvider,
    webLightTheme,
    tokens,
} from "@fluentui/react-components";
import {
    DismissRegular,
} from "@fluentui/react-icons";

////////////////////////////////////////////////////////////////////////////////

const BB3_INSTRUMENT_EXTENSION_ID = "687b6dee-2093-4c36-afb7-cfc7ea2bf262";
const BB3_INSTRUMENT_MANUFACTURER = "EEZ";

class SetupState {
    selectedManufacturer: string | undefined = BB3_INSTRUMENT_MANUFACTURER;
    selectedExtensionId: string | undefined = BB3_INSTRUMENT_EXTENSION_ID;

    extensionsManagerStore: ExtensionsManagerStore;

    constructor() {
        makeObservable(this, {
            selectedExtensionId: observable,
            selectedManufacturer: observable,
            reset: action,
            instrumentExtensionNodes: computed,
            manufacturers: computed,
            extensionNodes: computed,
            extensionInstalling: observable
        });

        this.extensionsManagerStore = new ExtensionsManagerStore();
        this.extensionsManagerStore.viewFilter = ViewFilter.ALL;
    }

    reset() {
        this.extensionInstalling = undefined;
    }

    get instrumentExtensionNodes() {
        return this.extensionsManagerStore.all.filter(extension =>
            isInstrumentExtension(extension.latestVersion)
        );
    }

    get manufacturers() {
        return uniqBy(this.instrumentExtensionNodes, extension =>
            getManufacturer(extension.latestVersion)
        ).map(extension => ({
            id: extension.latestVersion.id,
            data: extension.latestVersion,
            selected:
                getManufacturer(extension.latestVersion) ==
                this.selectedManufacturer
        }));
    }

    get extensionNodes() {
        return this.instrumentExtensionNodes
            .filter(
                extension =>
                    getManufacturer(extension.latestVersion) ==
                    this.selectedManufacturer
            )
            .map(extension => ({
                id: extension.latestVersion.id,
                data: extension.latestVersion,
                selected: extension.latestVersion.id == this.selectedExtensionId
            }));
    }

    selectManufacturer = action((node: IListNode) => {
        this.selectedManufacturer = getManufacturer(node.data);
        this.selectedExtensionId = undefined;
    });

    selectExtension = action((node: IListNode) => {
        this.selectedExtensionId = (node.data as IExtension).id;
    });

    extensionInstalling:
        | {
              inProgress: boolean;
              infoNode: React.ReactNode;
              infoType?: notification.Type;
          }
        | undefined;
}

export const setupState = new SetupState();

function renderManufacturer(node: IListNode) {
    let instrumentExtension = node.data as IExtension;
    return (
        <Text size={200} style={{ fontWeight: node.selected ? 600 : 400 }}>
            {getManufacturer(instrumentExtension)}
        </Text>
    );
}

function getExtensionName(extension: IExtension) {
    const manufacturer = getManufacturer(extension);
    let name = extension.displayName || extension.name;
    if (name.startsWith(manufacturer)) {
        const nameWithoutManufacturer = name.substr(manufacturer.length).trim();
        if (nameWithoutManufacturer != "") {
            name = nameWithoutManufacturer;
        }
    }
    return name;
}

function renderExtension(node: IListNode) {
    let instrumentExtension = node.data as IExtension;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {instrumentExtension.image && (
                <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: tokens.colorNeutralBackground2,
                }}>
                    {typeof instrumentExtension.image === "string"
                        ? <img src={instrumentExtension.image} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        : instrumentExtension.image}
                </div>
            )}
            <Text size={200} style={{ fontWeight: node.selected ? 600 : 400 }}>
                {getExtensionName(instrumentExtension)}
            </Text>
        </div>
    );
}

interface IListNode {
    id: string;
    data: any;
    selected: boolean;
}

async function onAddInstrument(onAddCallback: (instrumentId: string) => void) {
    const extensionVersions = setupState.extensionsManagerStore.all.find(
        extensionVersions =>
            extensionVersions.latestVersion.id == setupState.selectedExtensionId
    );

    if (!extensionVersions) {
        return;
    }

    let installedVersion = extensionVersions.installedVersion;

    if (!installedVersion) {
        runInAction(() => {
            setupState.extensionInstalling = {
                inProgress: true,
                infoNode: null
            };
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            installedVersion = await downloadAndInstallExtension(
                extensionVersions.latestVersion,
                0,
                {
                    update(
                        progressId: string | number,
                        options: {
                            render: React.ReactNode;
                            type: notification.Type;
                        }
                    ) {
                        runInAction(() => {
                            if (setupState.extensionInstalling) {
                                setupState.extensionInstalling.infoNode =
                                    options.render;
                                setupState.extensionInstalling.infoType =
                                    options.type;
                            }
                        });
                    }
                }
            );
        } catch (err) {
            console.error(err);
        }

        runInAction(() => {
            if (setupState.extensionInstalling) {
                setupState.extensionInstalling.inProgress = false;
            }
        });

        if (!installedVersion) {
            return undefined;
        }
    }

    const { createInstrument } = await import("instrument/instrument-object");

    let instrumentId = createInstrument(installedVersion);

    onAddCallback(instrumentId);

    return instrumentId;
}

const Setup = observer(() => {
    if (setupState.extensionInstalling) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", padding: "20px" }}>
                {setupState.extensionInstalling.inProgress && (
                    <div style={{ textAlign: "center" }}>
                        <Text size={400} weight="semibold" style={{ display: "block", marginBottom: "12px" }}>Installing Extension</Text>
                        <Spinner size="large" />
                    </div>
                )}
                <Text size={300} style={{ minHeight: 120, textAlign: "center" }}>
                    {setupState.extensionInstalling.infoNode}
                </Text>
                {setupState.extensionInstalling.infoType === notification.ERROR && (
                    <Button
                        appearance="secondary"
                        onClick={action(() => {
                            runInAction(() => {
                                setupState.extensionInstalling = undefined;
                            });
                        })}
                    >
                        Back
                    </Button>
                )}
            </div>
        );
    }

    // ── List item helper ──
    const listItemStyle = (selected: boolean): React.CSSProperties => ({
        display: "flex",
        alignItems: "center",
        padding: "6px 10px",
        cursor: "pointer",
        borderRadius: "4px",
        backgroundColor: selected ? tokens.colorNeutralBackground1Selected : "transparent",
        color: selected ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground2,
        transition: "background-color 0.1s",
        fontSize: "13px",
        minHeight: "36px",
    });

    return (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", gap: "12px", height: "360px" }}>
            {/* Manufacturers list */}
            <div style={{
                width: "220px",
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}>
                <div style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "6px 10px",
                    borderBottom: "1px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                }}>
                    Manufacturer
                </div>
                <div className="eez-instrument-list" style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#c1c1c1 transparent", padding: "4px 0" }}>
                    {setupState.manufacturers.map(node => (
                        <div
                            key={node.id}
                            style={listItemStyle(node.selected)}
                            onClick={() => setupState.selectManufacturer(node)}
                            onMouseEnter={(e) => { if (!node.selected) e.currentTarget.style.backgroundColor = "#f5f5f5"; }}
                            onMouseLeave={(e) => { if (!node.selected) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                            {renderManufacturer(node)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Extensions list */}
            <div style={{
                width: "320px",
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}>
                <div style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "6px 10px",
                    borderBottom: "1px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                }}>
                    Instrument
                </div>
                <div className="eez-instrument-list" style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#c1c1c1 transparent", padding: "4px 0" }}>
                    {setupState.extensionNodes.map(node => (
                        <div
                            key={node.id}
                            style={listItemStyle(node.selected)}
                            onClick={() => setupState.selectExtension(node)}
                            onMouseEnter={(e) => { if (!node.selected) e.currentTarget.style.backgroundColor = tokens.colorNeutralBackground1Hover; }}
                            onMouseLeave={(e) => { if (!node.selected) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                            {renderExtension(node)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

////////////////////////////////////////////////////////////////////////////////

const AddInstrumentDialog = observer(
    class AddInstrumentDialog extends React.Component<{
        callback: (instrumentId: string) => void;
    }> {
        open = true;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                open: observable,
                onOk: action.bound,
                onCancel: action.bound
            });
        }

        async onOk() {
            const instrumentId = await onAddInstrument(instrumentId =>
                this.props.callback(instrumentId)
            );
            if (instrumentId) {
                runInAction(() => {
                    this.open = false;
                });
            }
        }

        onCancel() {
            this.open = false;
        }

        render() {
            if (!this.open) return null;
            return (
                <FluentProvider theme={webLightTheme}>
                    <div style={{
                        position: "fixed", inset: 0, zIndex: 1000,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.4)",
                    }}>
                        <style>{`.eez-instrument-list ::-webkit-scrollbar{width:6px}.eez-instrument-list ::-webkit-scrollbar-thumb{background:#c1c1c1;border-radius:3px}`}</style>
                        <div style={{
                            backgroundColor: "#fff",
                            borderRadius: "6px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
                            width: "580px",
                            display: "flex",
                            flexDirection: "column",
                        }}>
                            {/* Header */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "10px 12px",
                                borderBottom: "1px solid #e0e0e0",
                            }}>
                                <Text size={200} weight="semibold">Add Instrument</Text>
                                <Button
                                    appearance="transparent"
                                    icon={<DismissRegular />}
                                    onClick={this.onCancel}
                                />
                            </div>

                            {/* Body */}
                            <div style={{ overflow: "hidden", padding: "0 8px" }}>
                                <Setup />
                            </div>

                            {/* Footer */}
                            <div style={{
                                display: "flex", justifyContent: "flex-end", gap: "8px",
                                padding: "10px 12px",
                            }}>
                                <Button
                                    appearance="secondary"
                                    size="medium"
                                    onClick={this.onCancel}
                                    disabled={
                                        setupState.extensionInstalling != undefined &&
                                        setupState.extensionInstalling.infoType !== notification.ERROR
                                    }
                                    style={{ fontWeight: 400, fontSize: "12px", minWidth: "80px" }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    size="medium"
                                    onClick={this.onOk}
                                    disabled={setupState.extensionInstalling != undefined}
                                    style={{ fontWeight: 400, fontSize: "12px", minWidth: "80px" }}
                                >
                                    OK
                                </Button>
                            </div>
                        </div>
                    </div>
                </FluentProvider>
            );
        }
    }
);

export function showAddInstrumentDialog(
    callback: (instrumentId: string) => void
) {
    setupState.reset();
    showDialog(<AddInstrumentDialog callback={callback} />);
}
