import { ref } from "vue";

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
