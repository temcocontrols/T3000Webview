


import { ref } from 'vue'
import { cloneDeep } from "lodash"
import GlobalMsgModel from '../Model/GlobalMsgModel'

export const ranges = {
  digital: [
    {
      id: 1,
      label: "Off/On",
      off: "Off",
      on: "On",
      direct: null,
    },
    {
      id: 2,
      label: "Close/Open",
      off: "Close",
      on: "Open",
      direct: null,
    },
    {
      id: 3,
      label: "Stop/Start",
      off: "Stop",
      on: "Start",
      direct: null,
    },
    {
      id: 4,
      label: "Disable/Enable",
      off: "Disable",
      on: "Enable",
      direct: null,
    },
    {
      id: 5,
      label: "Normal/Alarm",
      off: "Normal",
      on: "Alarm",
      direct: null,
    },
    {
      id: 6,
      label: "Normal/High",
      off: "Normal",
      on: "High",
      direct: null,
    },
    {
      id: 7,
      label: "Normal/Low",
      off: "Normal",
      on: "Low",
      direct: null,
    },
    {
      id: 8,
      label: "No/Yes",
      off: "No",
      on: "Yes",
      direct: null,
    },
    {
      id: 9,
      label: "Cool/Heat",
      off: "Cool",
      on: "Heat",
      direct: null,
    },
    {
      id: 10,
      label: "Unoccupy/Occupy",
      off: "Unoccupy",
      on: "Occupy",
      direct: null,
    },
    {
      id: 11,
      label: "Low/High",
      on: "Low",
      off: "High",
      direct: null,
    },
    {
      id: 12,
      label: "On/Off",
      on: "Off",
      off: "On",
      direct: true,
    },
    {
      id: 13,
      label: "Open/Close",
      on: "Close",
      off: "Open",
      direct: true,
    },
    {
      id: 14,
      label: "Start/Stop",
      on: "Stop",
      off: "Start",
      direct: true,
    },
    {
      id: 15,
      label: "Enable/Disable",
      on: "Disable",
      off: "Enable",
      direct: true,
    },
    {
      id: 16,
      label: "Alarm/Normal",
      on: "Normal",
      off: "Alarm",
      direct: true,
    },
    {
      id: 17,
      label: "High/Normal",
      on: "Normal",
      off: "High",
      direct: true,
    },
    {
      id: 18,
      label: "Low/Normal",
      on: "Normal",
      off: "Low",
      direct: true,
    },
    {
      id: 19,
      label: "Yes/No",
      on: "No",
      off: "Yes",
      direct: true,
    },
    {
      id: 20,
      label: "Heat/Cool",
      on: "Cool",
      off: "Heat",
      direct: true,
    },
    {
      id: 21,
      label: "Occupy/Unoccupy",
      on: "Unoccupy",
      off: "Occupy",
      direct: true,
    },
    {
      id: 22,
      label: "High/Low",
      on: "Low",
      off: "High",
      direct: true,
    },
  ],
  analog: {
    input: [
      {
        id: 0,
        unit: "",
        label: "Unused",
      },
      {
        id: 1,
        unit: "Deg.C",
        label: "Y3K -40 to 150",
      },
      {
        id: 2,
        unit: "Deg.F",
        label: "Y3K -40 to 300",
      },
      {
        id: 3,
        unit: "Deg.C",
        label: "10K Type2",
      },
      {
        id: 4,
        unit: "Deg.F",
        label: "10K Type2",
      },
      {
        id: 5,
        unit: "Deg.C",
        label: "G3K -40 to 120",
      },
      {
        id: 6,
        unit: "Deg.F",
        label: "G3K -40 to 250",
      },
      {
        id: 7,
        unit: "Deg.C",
        label: "10K Type3",
      },
      {
        id: 8,
        unit: "Deg.F",
        label: "10K Type3",
      },
      {
        id: 9,
        unit: "Deg.C",
        label: "PT 1K -200 to 300",
      },
      {
        id: 10,
        unit: "Deg.F",
        label: "PT 1K -200 to 570",
      },
      {
        id: 11,
        unit: "Volts",
        label: "0.0 to 5.0",
      },
      {
        id: 12,
        unit: "Amps",
        label: "0.0 to 100",
      },
      {
        id: 13,
        unit: "ma",
        label: "4 to 20",
      },
      {
        id: 14,
        unit: "psi",
        label: "4 to 20",
      },
      {
        id: 15,
        unit: "counts",
        label: "Pulse Count (Slow 1Hz)",
      },
      {
        id: 16,
        unit: "%",
        label: "0 to 100",
      },
      {
        id: 17,
        unit: "%",
        label: "0 to 100",
      },
      {
        id: 18,
        unit: "%",
        label: "0 to 100",
      },
      {
        id: 19,
        unit: "Volts",
        label: "0.0 to 10.0",
      },
      {
        id: 25,
        unit: "counts",
        label: "Pulse Count (Fast 100Hz)",
      },
      {
        id: 26,
        unit: "Hz",
        label: "Frequency",
      },
      {
        id: 27,
        unit: "%",
        label: "Humidty %",
      },
      {
        id: 28,
        unit: "PPM",
        label: "CO2  PPM",
      },
      {
        id: 29,
        unit: "RPM",
        label: "Revolutions Per Minute",
      },
      {
        id: 30,
        unit: "PPB",
        label: "TVOC PPB",
      },
      {
        id: 31,
        unit: "ug/m3",
        label: "ug/m3",
      },
      {
        id: 32,
        unit: "#/cm3",
        label: "#/cm3",
      },
      {
        id: 33,
        unit: "dB",
        label: "dB",
      },
      {
        id: 34,
        unit: "Lux",
        label: "Lux",
      },
    ],
    output: [
      {
        id: 0,
        unit: "",
        label: "Unused",
      },
      {
        id: 1,
        unit: "Volts",
        label: "0.0 to 10.0",
      },
      {
        id: 2,
        unit: "%Open",
        label: "0.0 to 100",
      },
      {
        id: 3,
        unit: "psi",
        label: "4 to 20",
      },
      {
        id: 4,
        unit: "%",
        label: "0 to 100",
      },
      {
        id: 5,
        unit: "%Cls",
        label: "0 to 100",
      },
      {
        id: 6,
        unit: "ma",
        label: "4 to 20",
      },
      {
        id: 7,
        unit: "%PWM",
        label: "0 to 100",
      },
      {
        id: 8,
        unit: "%",
        label: "2 to 10",
      },
    ],
    variable: [
      {
        id: 0,
        unit: "Unused",
        label: "Unused",
      },
      {
        id: 1,
        unit: "Deg.C",
        label: "Deg.C",
      },
      {
        id: 2,
        unit: "Deg.F",
        label: "Deg.F",
      },
      {
        id: 3,
        unit: "Feet per Min",
        label: "Feet per Min",
      },
      {
        id: 4,
        unit: "Pascals",
        label: "Pascals",
      },
      {
        id: 5,
        unit: "KPascals",
        label: "KPascals",
      },
      {
        id: 6,
        unit: "lbs/sqr.inch",
        label: "lbs/sqr.inch",
      },
      {
        id: 7,
        unit: "inches of WC",
        label: "inches of WC",
      },
      {
        id: 8,
        unit: "Watts",
        label: "Watts",
      },
      {
        id: 9,
        unit: "KWatts",
        label: "KWatts",
      },
      {
        id: 10,
        unit: "KWH",
        label: "KWH",
      },
      {
        id: 11,
        unit: "Volts",
        label: "Volts",
      },
      {
        id: 12,
        unit: "KV",
        label: "KV",
      },
      {
        id: 13,
        unit: "Amps",
        label: "Amps",
      },
      {
        id: 14,
        unit: "ma",
        label: "ma",
      },
      {
        id: 15,
        unit: "CFM",
        label: "CFM",
      },
      {
        id: 16,
        unit: "Seconds",
        label: "Seconds",
      },
      {
        id: 17,
        unit: "Minutes",
        label: "Minutes",
      },
      {
        id: 18,
        unit: "Hours",
        label: "Hours",
      },
      {
        id: 19,
        unit: "Days",
        label: "Days",
      },
      {
        id: 20,
        unit: "Time",
        label: "Time",
      },
      {
        id: 21,
        unit: "Ohms",
        label: "Ohms",
      },
      {
        id: 22,
        unit: "%",
        label: "%",
      },
      {
        id: 23,
        unit: "%RH",
        label: "%RH",
      },
      {
        id: 24,
        unit: "p/min",
        label: "p/min",
      },
      {
        id: 25,
        unit: "Counts",
        label: "Counts",
      },
      {
        id: 26,
        unit: "%Open",
        label: "%Open",
      },
      {
        id: 27,
        unit: "Kg",
        label: "Kg",
      },
      {
        id: 28,
        unit: "L/Hour",
        label: "L/Hour",
      },
      {
        id: 29,
        unit: "GPH",
        label: "GPH",
      },
      {
        id: 30,
        unit: "GAL",
        label: "GAL",
      },
      {
        id: 31,
        unit: "CF",
        label: "CF",
      },
      {
        id: 32,
        unit: "BTU",
        label: "BTU",
      },
      {
        id: 33,
        unit: "CMH",
        label: "CMH",
      },
    ],
  },
};

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

export const T3_Types = {
  OUTPUT: 0,
  INPUT: 1,
  VARIABLE: 2,
  SCHEDULE: 4,
  HOLIDAY: 5,
  PROGRAM: 6,
  MON: 9,
};

export const T3000_Data = ref({
  panelsData: [],
  panelsList: [],
  panelsRanges: [],
  loadingPanel: null,
});

export const grpNav = ref([]); // Navigation history for grouped elements

// Panel options for selection
export const selectPanelOptions = ref(T3000_Data.value.panelsData);
export const linkT3EntryDialog = ref({ active: false, data: null }); // State of the link T3 entry dialog
export const savedNotify = ref(false); // Notification state for saving
export const undoHistory = ref([]); // History for undo actions
export const redoHistory = ref([]); // History for redo actions
export const moveable = ref(null); // Reference to the moveable component instance

/*
{
  type: "error" | "warning" | "info" | "success"
  message:"Error message",
  isShow: true | false,
  msgType: ""
}
*/
// export const globalMsg = ref({ type: "info", message: "", isShow: false, msgType: "" });// Global message state
export const globalMsg = ref<GlobalMsgModel[]>([]);

export const devVersion = ref("V:25.0304.01");

export const localSettings = ref({ version: "V:25.0304.01", transform: 0 });

const T3Data = {
  deviceList: ref([]),
  graphicList: ref([]),
  currentDevice: ref(),
  globalMessage: ref({})
}



export default T3Data
