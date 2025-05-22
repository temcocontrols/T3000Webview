
import { ref } from "vue";
import { tools, /*T3_Types,*/ /*getObjectActiveValue,*/ /*T3000_Data,*/ /*user, globalNav,*/ demoDeviceData } from "../../../../common";


export const contextMenuShow = ref<boolean>(false);
export const objectConfigShow = ref<boolean>(false);
export const globalMsgShow = ref<boolean>(false);
export const commonMsg = ref<string>("");

// Index page 2

// State variables for drawing and transformations
export const isDrawing = ref(false);
export const startTransform = ref([0, 0]);
export const snappable = ref(true); // Enable snapping for moveable components
export const keepRatio = ref(false); // Maintain aspect ratio for resizing

export const selecto = ref(null); // Reference to the selecto component instance
export const targets = ref([]); // Array of selected targets
export const selectedTool = ref({ ...tools[0], type: "default" }); // Default selected tool

// List of continuous object types
export const continuesObjectTypes = ["Duct", "Wall", "Int_Ext_Wall"];

// State of the import JSON dialog
export const importJsonDialog = ref({ addedCount: 0, active: false, uploadBtnLoading: false, data: null });
export const clipboardFull = ref(false); // State of the clipboard
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

