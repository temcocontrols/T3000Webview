
import { ref } from "vue";
import { tools, /*T3_Types,*/ /*getObjectActiveValue,*/ /*T3000_Data,*/ /*user, globalNav,*/ demoDeviceData } from "../../../../common";


export const contextMenuShow = ref<boolean>(false);
export const objectConfigShow = ref<boolean>(false);
export const globalMsgShow = ref<boolean>(false);
export const commonMsg = ref<string>("");

// Index page 2

// State variables for drawing and transformations
export const isDrawing = ref<boolean>(false);
export const startTransform = ref([0, 0]);
export const snappable = ref<boolean>(true); // Enable snapping for moveable components
export const keepRatio = ref<boolean>(false); // Maintain aspect ratio for resizing

export const selecto = ref<any>(null); // Reference to the selecto component instance
export const targets = ref([]); // Array of selected targets
export const selectedTool = ref({ ...tools[0], type: "default" }); // Default selected tool

// List of continuous object types
export const continuesObjectTypes = ["Duct", "Wall", "Int_Ext_Wall"];

export let lastAction = null; // Store the last action performed

export const topContextToggleVisible = ref(false);

export const showSettingMenu = ref(false);
export const toggleModeValue = ref('Auto');
export const toggleValueValue = ref('Off');
export const toggleValueDisable = ref(false);
export const toggleValueShow = ref(false);

export const toggleNumberDisable = ref(false);
export const toggleNumberShow = ref(false);
export const toggleNumberValue = ref(0);

export const gaugeSettingsDialog = ref({
  active: false,
  data: { settings: tools.find((tool) => tool.name === "Gauge")?.settings },
});

export const insertCount = ref(0);

export const cursorIconPos = ref({ x: 0, y: 0 }); // Position of the cursor icon
export const objectsRef = ref(null); // Reference to objects

// Types
interface ImportJsonDialog {
  addedCount: number;
  active: boolean;
  uploadBtnLoading: boolean;
  data: string | null;
}

// State of the import JSON dialog
export const importJsonDialog = ref<ImportJsonDialog>({ addedCount: 0, active: false, uploadBtnLoading: false, data: null });

export const clipboardFull = ref<boolean>(false); // State of the clipboard












