/**
 * State Store - Centralized state management for T3000 application
 * Replaces global reactive state from T3Data.ts with proper state management
 *
 * Uses Vue's reactivity system with proper encapsulation and type safety
 */

import { ref, computed, reactive, type Ref } from "vue";
import { cloneDeep } from "lodash";
import type GlobalMsgModel from "../../Model/GlobalMsgModel";

// Type definitions
export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

export interface Project {
  version: string | undefined;
  items: any[];
  selectedTargets: any[];
  elementGuidelines: any[];
  itemsCount: number;
  groupCount: number;
  activeItemIndex: number | null;
  viewportTransform: ViewportTransform;
  rulersGridVisible: boolean;
}

export interface Library {
  version: string | undefined;
  imagesCount: number;
  objLibItemsCount: number;
  images: any[];
  objLib: any[];
}

export interface DocumentAreaPosition {
  workAreaPadding: string;
  hRulerWOffset: string;
  wpwWOffset: string;
  wpWOffset: string;
  hRuler: { width: number; height: number };
  vRuler: { width: number; height: number };
  hvGrid: { width: number; height: number };
  wiewPortWH: { width: string; height: string };
  widthOffset: string;
  heightOffset: string;
}

export interface DeviceModel {
  active: boolean;
  data: Record<string, any>;
}

export interface GlobalNav {
  title: string;
  home: string;
  back: string | null;
}

export interface T3000Data {
  panelsData: any[];
  panelsList: any[];
  panelsRanges: any[];
  loadingPanel: any;
}

export interface LocalSettings {
  version: string;
  transform: number;
}

export interface LinkT3EntryDialog {
  active: boolean;
  data: any;
}

export interface T3DataState {
  deviceList: Ref<any[]>;
  graphicList: Ref<any[]>;
  currentDevice: Ref<any>;
  globalMessage: Ref<any>;
}

// Default values
const emptyProject: Project = {
  version: process.env.VERSION,
  items: [],
  selectedTargets: [],
  elementGuidelines: [],
  itemsCount: 0,
  groupCount: 0,
  activeItemIndex: null,
  viewportTransform: { x: 0, y: 0, scale: 1 },
  rulersGridVisible: false
};

const emptyLib: Library = {
  version: process.env.VERSION,
  imagesCount: 0,
  objLibItemsCount: 0,
  images: [],
  objLib: [],
};

// State management class
class StateStore {
  // Core application state
  public readonly appState: Ref<Project> = ref(cloneDeep(emptyProject));
  public readonly appStateV2: Ref<Project> = ref(cloneDeep(emptyProject));
  public readonly library: Ref<Library> = ref(cloneDeep(emptyLib));

  // Device and panel state
  public readonly deviceAppState: Ref<any[]> = ref([]);
  public readonly deviceModel: Ref<DeviceModel> = ref({ active: false, data: {} });
  public readonly T3000_Data: Ref<T3000Data> = ref({
    panelsData: [],
    panelsList: [],
    panelsRanges: [],
    loadingPanel: null,
  });

  // UI state
  public readonly rulersGridVisible: Ref<boolean> = ref(true);
  public readonly locked: Ref<boolean> = ref(false);
  public readonly isBuiltInEdge: Ref<boolean> = ref(false);
  public readonly viewport: Ref<any> = ref(null);
  public readonly moveable: Ref<any> = ref(null);

  // Document and layout state
  public readonly documentAreaPosition: Ref<DocumentAreaPosition> = ref({
    workAreaPadding: "110px",
    hRulerWOffset: "128px",
    wpwWOffset: "128px",
    wpWOffset: "136px",
    hRuler: { width: 0, height: 20 },
    vRuler: { width: 20, height: 0 },
    hvGrid: { width: 0, height: 0 },
    wiewPortWH: {
      width: "calc(100vw - v-bind('documentAreaPosition.wpWOffset'))",
      height: "calc(100vh - 93px)"
    },
    widthOffset: '128px',
    heightOffset: 'calc(93px)', // Will be updated reactively
  });

  // Navigation and history
  public readonly globalNav: Ref<GlobalNav> = ref({
    title: "Modbus Register",
    home: "/modbus-register",
    back: null,
  });
  public readonly grpNav: Ref<any[]> = ref([]);
  public readonly undoHistory: Ref<any[]> = ref([]);
  public readonly redoHistory: Ref<any[]> = ref([]);

  // User and authentication
  public readonly user: Ref<any> = ref(null);

  // Dialogs and notifications
  public readonly linkT3EntryDialog: Ref<LinkT3EntryDialog> = ref({ active: false, data: null });
  public readonly linkT3EntryDialogV2: Ref<LinkT3EntryDialog> = ref({ active: false, data: null });
  public readonly savedNotify: Ref<boolean> = ref(false);
  public readonly globalMsg: Ref<GlobalMsgModel[]> = ref([]);

  // Settings and version
  public readonly devVersion: Ref<string> = ref("V:25.0816.01");
  public readonly localSettings: Ref<LocalSettings> = ref({
    version: "V:25.0816.01",
    transform: 0
  });

  // Legacy T3Data structure for backward compatibility
  public readonly T3Data: T3DataState = {
    deviceList: ref([]),
    graphicList: ref([]),
    currentDevice: ref(undefined),
    globalMessage: ref({})
  };

  // Computed properties
  public readonly viewportMargins = computed(() => ({
    top: this.isBuiltInEdge.value ? 36 : 95 + 20 + 2,
    left: 106 + 20 + 2,
  }));

  public readonly selectPanelOptions = computed(() => this.T3000_Data.value.panelsData);

  constructor() {
    // Update document area position based on edge detection
    this.updateDocumentAreaPosition();
  }

  // Methods for state management
  public resetProject(): void {
    this.appState.value = cloneDeep(emptyProject);
  }

  public resetProjectV2(): void {
    this.appStateV2.value = cloneDeep(emptyProject);
  }

  public resetLibrary(): void {
    this.library.value = cloneDeep(emptyLib);
  }

  public updateViewportTransform(transform: Partial<ViewportTransform>): void {
    this.appState.value.viewportTransform = {
      ...this.appState.value.viewportTransform,
      ...transform
    };
  }

  public addToUndoHistory(state: any): void {
    this.undoHistory.value.push(cloneDeep(state));
    // Limit history size
    if (this.undoHistory.value.length > 50) {
      this.undoHistory.value.shift();
    }
  }

  public addToRedoHistory(state: any): void {
    this.redoHistory.value.push(cloneDeep(state));
    // Limit history size
    if (this.redoHistory.value.length > 50) {
      this.redoHistory.value.shift();
    }
  }

  public clearRedoHistory(): void {
    this.redoHistory.value = [];
  }

  public addGlobalMessage(message: GlobalMsgModel): void {
    this.globalMsg.value.push(message);
  }

  public removeGlobalMessage(index: number): void {
    if (index >= 0 && index < this.globalMsg.value.length) {
      this.globalMsg.value.splice(index, 1);
    }
  }

  public clearGlobalMessages(): void {
    this.globalMsg.value = [];
  }

  public updateDeviceModel(data: Partial<DeviceModel>): void {
    this.deviceModel.value = {
      ...this.deviceModel.value,
      ...data
    };
  }

  public setActiveItem(index: number | null): void {
    this.appState.value.activeItemIndex = index;
  }

  public addItem(item: any): void {
    this.appState.value.items.push(item);
    this.appState.value.itemsCount = this.appState.value.items.length;
  }

  public removeItem(index: number): void {
    if (index >= 0 && index < this.appState.value.items.length) {
      this.appState.value.items.splice(index, 1);
      this.appState.value.itemsCount = this.appState.value.items.length;
    }
  }

  public updateItem(index: number, item: any): void {
    if (index >= 0 && index < this.appState.value.items.length) {
      this.appState.value.items[index] = item;
    }
  }

  public setSelectedTargets(targets: any[]): void {
    this.appState.value.selectedTargets = targets;
  }

  public addSelectedTarget(target: any): void {
    this.appState.value.selectedTargets.push(target);
  }

  public removeSelectedTarget(index: number): void {
    if (index >= 0 && index < this.appState.value.selectedTargets.length) {
      this.appState.value.selectedTargets.splice(index, 1);
    }
  }

  public clearSelectedTargets(): void {
    this.appState.value.selectedTargets = [];
  }

  private updateDocumentAreaPosition(): void {
    // Reactive update based on isBuiltInEdge
    this.documentAreaPosition.value.heightOffset = this.isBuiltInEdge.value ? '68px' : '115px';
  }

  // Cleanup method for destroying the store
  public destroy(): void {
    this.resetProject();
    this.resetProjectV2();
    this.resetLibrary();
    this.clearGlobalMessages();
    this.clearSelectedTargets();
    this.undoHistory.value = [];
    this.redoHistory.value = [];
    this.grpNav.value = [];
    this.deviceAppState.value = [];
    this.T3Data.deviceList.value = [];
    this.T3Data.graphicList.value = [];
  }
}

// Create and export singleton instance
export const stateStore = new StateStore();

// Export individual state refs for backward compatibility
export const {
  appState,
  appStateV2,
  library,
  deviceAppState,
  deviceModel,
  T3000_Data,
  rulersGridVisible,
  locked,
  isBuiltInEdge,
  viewport,
  moveable,
  documentAreaPosition,
  globalNav,
  grpNav,
  undoHistory,
  redoHistory,
  user,
  linkT3EntryDialog,
  linkT3EntryDialogV2,
  savedNotify,
  globalMsg,
  devVersion,
  localSettings,
  T3Data,
  viewportMargins,
  selectPanelOptions
} = stateStore;

// Export the store class for type information
export type { StateStore };
