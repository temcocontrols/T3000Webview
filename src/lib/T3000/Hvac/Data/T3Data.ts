


import { ref } from 'vue'
import { cloneDeep } from "lodash"

export const emptyProject = {
  version: process.env.VERSION,
  items: [],
  selectedTargets: [],
  elementGuidelines: [],
  itemsCount: 0,
  groupCount: 0,
  activeItemIndex: null,
  viewportTransform: { x: 0, y: 0, scale: 1 },
};

export const appState = ref(cloneDeep(emptyProject));

export const deviceAppState = ref([]);

export const deviceModel = ref({ active: false, data: {} });

export const rulersGridVisible = ref(true);

const T3Data = {
  deviceList: ref([]),
  graphicList: ref([]),
  currentDevice: ref(),
  globalMessage: ref({})
}

export default T3Data
