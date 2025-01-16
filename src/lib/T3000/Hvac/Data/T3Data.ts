


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
  rulersGridVisible: false
};

export const emptyLib = {
  version: process.env.VERSION,
  imagesCount: 0,
  objLibItemsCount: 0,
  images: [],
  objLib: [],
};

export const appState = ref(cloneDeep(emptyProject));

export const deviceAppState = ref([]);

export const deviceModel = ref({ active: false, data: {} });

export const rulersGridVisible = ref(true);

export const user = ref(null);

export const globalNav = ref({
  title: "Modbus Register",
  home: "/modbus-register",
  back: null,
});

export const library = ref(cloneDeep(emptyLib));

export const isBuiltInEdge = ref(false);

// Ruler & Grid default value
export const documentAreaPosition = ref(
  {
    workAreaPadding: "110px", hRulerWOffset: "128px", wpwWOffset: "128px", wpWOffset: "136px",
    hRuler: { width: 0, height: 20 },
    vRuler: { width: 20, height: 0 },
    hvGrid: { width: 0, height: 0 },

    //width:  calc(100vw - v-bind("documentAreaPosition.wpWOffset"));
    //height: calc(100vh - 68px);
    wiewPortWH: { width: "calc(100vw - v-bind('documentAreaPosition.wpWOffset'))", height: "calc(100vh - 93px)" },
    widthOffset: '128px',
    heightOffset: isBuiltInEdge.value ? '68px' : '115px',
  });

export const viewportMargins = ({
  top: isBuiltInEdge?.value ? 36 : 95 + 20 + 2,
  left: 106 + 20 + 2,
});

export const viewport = ref(null); // Reference to the viewport element

export const locked = ref(false); // State to lock or unlock the interface

const T3Data = {
  deviceList: ref([]),
  graphicList: ref([]),
  currentDevice: ref(),
  globalMessage: ref({})
}



export default T3Data
