import { ref } from "vue";

export const contextMenuShow = ref<boolean>(false);
export const objectConfigShow = ref<boolean>(false);
export const objectCoordinates = ref<{ x: number, y: number, width: number, height: number }>({ x: 0, y: 0, width: 0, height: 0 });
