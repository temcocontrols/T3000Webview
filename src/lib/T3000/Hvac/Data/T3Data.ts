
import { ref } from "vue";
import { cloneDeep } from "lodash";
import GlobalMsgModel from "../Model/GlobalMsgModel";

const gaugeDefautColors = [
  { offset: 33, color: "#14BE64" },
  { offset: 66, color: "#FFB100" },
  { offset: 100, color: "#fd666d" },
];

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
        unit: "°C",
        label: "Y3K -40 to 150",
      },
      {
        id: 2,
        unit: "°F",
        label: "Y3K -40 to 300",
      },
      {
        id: 3,
        unit: "°C",
        label: "10K Type2",
      },
      {
        id: 4,
        unit: "°F",
        label: "10K Type2",
      },
      {
        id: 5,
        unit: "°C",
        label: "G3K -40 to 120",
      },
      {
        id: 6,
        unit: "°F",
        label: "G3K -40 to 250",
      },
      {
        id: 7,
        unit: "°C",
        label: "10K Type3",
      },
      {
        id: 8,
        unit: "°F",
        label: "10K Type3",
      },
      {
        id: 9,
        unit: "°C",
        label: "PT 1K -200 to 300",
      },
      {
        id: 10,
        unit: "°F",
        label: "PT 1K -200 to 570",
      },
      {
        id: 11,
        unit: "V",
        label: "0.0 to 5.0",
      },
      {
        id: 12,
        unit: "A",
        label: "0.0 to 100",
      },
      {
        id: 13,
        unit: "ma",
        label: "4 to 20",
      },
      {
        id: 14,
        unit: "PSI",
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
        unit: "V",
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
        unit: "V",
        label: "0.0 to 10.0",
      },
      {
        id: 2,
        unit: "%Open",
        label: "0.0 to 100",
      },
      {
        id: 3,
        unit: "PSI",
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
        unit: "°C",
        label: "°C",
      },
      {
        id: 2,
        unit: "°F",
        label: "°F",
      },
      {
        id: 3,
        unit: "FPM",
        label: "FPM",
      },
      {
        id: 4,
        unit: "Pa",
        label: "Pa",
      },
      {
        id: 5,
        unit: "KPa",
        label: "KPa",
      },
      {
        id: 6,
        unit: "PSI",
        label: "PSI",
      },
      {
        id: 7,
        unit: "inWC",
        label: "inWC",
      },
      {
        id: 8,
        unit: "W",
        label: "W",
      },
      {
        id: 9,
        unit: "kW",
        label: "kW",
      },
      {
        id: 10,
        unit: "KWH",
        label: "KWH",
      },
      {
        id: 11,
        unit: "V",
        label: "V",
      },
      {
        id: 12,
        unit: "KV",
        label: "KV",
      },
      {
        id: 13,
        unit: "A",
        label: "A",
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
        unit: "s",
        label: "s",
      },
      {
        id: 17,
        unit: "min",
        label: "min",
      },
      {
        id: 18,
        unit: "h",
        label: "h",
      },
      {
        id: 19,
        unit: "d",
        label: "d",
      },
      {
        id: 20,
        unit: "Time",
        label: "Time",
      },
      {
        id: 21,
        unit: "Ω",
        label: "Ω",
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
        unit: "L/h",
        label: "L/h",
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
  rulersGridVisible: false,
  locked: false,
};

export const emptyLib = {
  version: process.env.VERSION,
  imagesCount: 0,
  objLibItemsCount: 0,
  images: [],
  objLib: [],
};

export const appState = ref(cloneDeep(emptyProject));

// app state v2 for new ui
export const appStateV2 = ref(cloneDeep(emptyProject));

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

// Log the initial T3000_Data store creation
console.log('= T3Data: STORE INITIALIZATION - T3000_Data reactive store created:', {
  initialState: {
    panelsData: T3000_Data.value.panelsData,
    panelsList: T3000_Data.value.panelsList,
    panelsRanges: T3000_Data.value.panelsRanges,
    loadingPanel: T3000_Data.value.loadingPanel
  },
  storeLocation: 'src/lib/T3000/Hvac/Data/T3Data.ts',
  timestamp: new Date().toISOString(),
  note: 'This is the global reactive store shared across all components'
});

// Add a watcher to track all changes to T3000_Data
import { watch } from 'vue';

watch(T3000_Data, (newValue, oldValue) => {
  // Track T3000_Data store changes for reactive updates
}, { deep: true });

// Utility function to log complete T3000_Data flow state
export const logT3000DataFlowState = (context: string, additionalInfo?: any) => {
  // Log T3000_Data state for debugging when needed
};

export const grpNav = ref([]); // Navigation history for grouped elements

// Panel options for selection
export const selectPanelOptions = ref(T3000_Data.value.panelsData);
export const linkT3EntryDialog = ref({ active: false, data: null }); // State of the link T3 entry dialog
export const linkT3EntryDialogV2 = ref({ active: false, data: null }); // State of the link T3 entry dialog 2
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

export const devVersion = ref("V:25.1029.01");

export const localSettings = ref({ version: "V:25.1029.01", transform: 0 });

export const T3Data = {
  deviceList: ref([]),
  graphicList: ref([]),
  currentDevice: ref(),
  globalMessage: ref({})
}

export const NewTool = [
  {
    name: "Pointer",
    label: "Select",
    icon: "svguse:icons.svg#cursor|0 0 280 200",
    cat: ["Basic"],
  },
  {
    name: "Box",
    label: "Box",
    icon: "square",
    cat: ["Basic"],
    settings: {
      bgColor: {
        value: "#659dc5",
        type: "color",
        label: "Background Color",
        id: 1,
      },
    },
  },
  {
    name: "Text",
    label: "Text",
    icon: "title",
    cat: ["Basic"],
    settings: {
      textColor: {
        value: "black",
        type: "color",
        label: "Text color",
        id: 2,
      },
      textAlign: {
        value: "left",
        type: "textAlign",
        id: 3,
      },
      text: {
        value: "Text",
        type: "text",
        label: "Text",
        id: 1,
      },
    },
  },

  {
    name: "Line",
    label: "Line",
    icon: "svguse:icons.svg#line",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
{
    name: "SegLine",
    label: "Segment Line",
    icon: "svguse:icons.svg#segLine",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "G_Rectangle",
    label: "Rectangle",
    icon: "svguse:icons.svg#rectangle|0 0 24 24",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "G_Circle",
    label: "Circle",
    icon: "svguse:icons.svg#circle|0 0 24 24",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
   {
    name: "Oval",
    label: "Oval",
    icon: "svguse:icons.svg#oval|0 0 30 30",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "ArrowRight",
    label: "Arrow Right",
    icon: "svguse:icons.svg#arrow_right|0 0 32 32",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "ArrowLeft",
    label: "Arrow Left",
    icon: "svguse:icons.svg#arrow_left|0 0 32 32",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "ArrowTop",
    label: "Arrow Top",
    icon: "svguse:icons.svg#arrow_top|0 0 32 32",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "ArrowBottom",
    label: "Arrow Bottom",
    icon: "svguse:icons.svg#arrow_bottom|0 0 32 32",
    cat: ["General"],
    settings: {
      // bgColor: {
      //   value: "#000",
      //   type: "color",
      //   label: "Background Color",
      //   id: 1,
      // },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },

  // {
  //   name: "Duct",
  //   label: "Duct",
  //   icon: "svguse:icons.svg#duct|0 0 226 75",
  //   cat: ["Duct"],
  //   height: 40,
  //   settings: {
  //     bgColor: {
  //       value: "#808080",
  //       type: "color",
  //       label: "Fill color",
  //       id: 1,
  //     },
  //   },
  // },
  {
    name: "Fan",
    label: "Fan",
    icon: "svguse:icons.svg#fan",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "CoolingCoil",
    label: "Cooling Coil",
    icon: "svguse:icons.svg#cooling-coil|0 0 20 29",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "HeatingCoil",
    label: "Heating Coil",
    icon: "svguse:icons.svg#heating-coil|0 0 19.526541 28.758413",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "Filter",
    label: "Filter",
    icon: "svguse:icons.svg#filter|0 0 13 29",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Humidifier",
    label: "Humidifier",
    icon: "svguse:icons.svg#humidifier|0 0 18 25",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "Humidity",
    label: "Humidity",
    icon: "svguse:icons.svg#humidity|0 0 10.221108 22.472175",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Pressure",
    label: "Pressure",
    icon: "svguse:icons.svg#pressure",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Damper",
    label: "Damper",
    icon: "svguse:icons.svg#damper|0 0 13.431694 28.950886",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "Temperature",
    label: "Temperature",
    cat: ["Duct", "Pipe"],
    icon: "svguse:icons.svg#temperature|0 0 10.423067 22.852614",
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "ThermalWheel",
    label: "Thermal Wheel",
    icon: "svguse:icons.svg#thermal-wheel",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "Enthalpy",
    label: "Enthalpy",
    icon: "svguse:icons.svg#enthalpy|0 0 10 22",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Flow",
    label: "Flow",
    icon: "svguse:icons.svg#flow",
    cat: ["Duct"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Boiler",
    label: "Boiler",
    icon: "svguse:icons.svg#boiler",
    cat: ["Pipe"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "Heatpump",
    label: "Heat pump",
    icon: "svguse:icons.svg#heatpump",
    cat: ["Pipe"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "Pump",
    label: "Pump",
    icon: "svguse:icons.svg#pump",
    cat: ["Pipe"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "ValveThreeWay",
    label: "Valve Three-Way",
    icon: "svguse:icons.svg#ValveThreeWay",
    cat: ["Pipe"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  {
    name: "ValveTwoWay",
    label: "Valve Two-Way",
    icon: "svguse:icons.svg#ValveTwoWay",
    cat: ["Pipe"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Gauge",
    label: "Gauge",
    icon: "speed",
    cat: ["Metrics"],
    settings: {
      min: {
        value: 0,
        type: "number",
        label: "Min",
        id: 1,
      },
      max: {
        value: 100,
        type: "number",
        label: "Max",
        id: 2,
      },
      ticks: {
        value: 10,
        type: "number",
        label: "Ticks",
        id: 3,
      },
      minorTicks: {
        value: 5,
        type: "number",
        label: "Minor ticks",
        id: 4,
      },
      thickness: {
        value: 30,
        type: "number",
        label: "Thickness",
        id: 5,
      },
      colors: {
        value: gaugeDefautColors,
        type: "colors",
        id: 6,
      },
      titleColor: {
        value: "#000000",
        type: "titleColor",
        id: 7,
      },
    },
  },
  {
    name: "Dial",
    label: "Dial",
    icon: "horizontal_split",
    cat: ["Metrics"],
    settings: {
      min: {
        value: 0,
        type: "number",
        label: "Min",
        id: 1,
      },
      max: {
        value: 100,
        type: "number",
        label: "Max",
        id: 2,
      },
      ticks: {
        value: 5,
        type: "number",
        label: "Ticks",
        id: 3,
      },
      minorTicks: {
        value: 5,
        type: "number",
        label: "Minor ticks",
        id: 4,
      },
      colors: {
        value: gaugeDefautColors,
        type: "colors",
        id: 5,
      },
      titleColor: {
        value: "#000000",
        type: "titleColor",
        id: 6,
      },
      textColor: {
        value: "#000000",
        type: "color",
        label: "Text color",
        id: 7,
      },
    },
  },
  {
    name: "Value",
    label: "Value",
    icon: "123",
    cat: ["Metrics"],
    settings: {
      bgColor: {
        value: "#0065a3",
        type: "color",
        label: "Background color",
        id: 1,
      },
      textColor: {
        value: "#ffffff",
        type: "color",
        label: "Text color",
        id: 3,
      },
      titleColor: {
        value: "#000000",
        type: "titleColor",
        id: 2,
      },
      textAlign: {
        value: "left",
        type: "textAlign",
        id: 4,
      },
      t3EntryDisplayField: {
        value: "description",
        type: "select",
        id: 6,
      },
    },
  },
  {
    name: "IconBasic",
    label: "Icon",
    icon: "emoji_emotions",
    cat: ["Basic"],
    settings: {
      active: {
        value: true,
        type: "boolean",
        label: "On/Off",
        id: 1,
      },
      offColor: {
        value: "#940303",
        type: "color",
        label: "Off Color",
        id: 3,
      },
      onColor: {
        value: "#659dc5",
        type: "color",
        label: "On Color",
        id: 4,
      },
      icon: {
        value: "warning",
        type: "icon",
        label: "Icon",
        id: 5,
      },
      t3EntryDisplayField: {
        value: "value",
        type: "select",
        id: 6,
      },
    },
  },
  {
    name: "Icon",
    label: "Icon with title",
    icon: "fa-solid fa-icons",
    cat: ["Metrics"],
    settings: {
      textAlign: {
        value: "left",
        type: "textAlign",
        id: 2,
      },
      active: {
        value: false,
        type: "boolean",
        label: "On/Off",
        id: 1,
      },
      offColor: {
        value: "#940303",
        type: "color",
        label: "Off Color",
        id: 3,
      },
      onColor: {
        value: "#0d87d9",
        type: "color",
        label: "On Color",
        id: 4,
      },
      icon: {
        value: "fa-solid fa-camera-retro",
        type: "icon",
        label: "Icon",
        id: 5,
      },
      t3EntryDisplayField: {
        value: "value",
        type: "select",
        id: 6,
      },
    },
  },
  {
    name: "Switch",
    label: "Switch Icon",
    icon: "toggle_off",
    cat: ["Basic"],
    settings: {
      textAlign: {
        value: "left",
        type: "textAlign",
        id: 2,
      },
      active: {
        value: false,
        type: "boolean",
        label: "On/Off",
        id: 1,
      },
      offColor: {
        value: "#000000",
        type: "color",
        label: "Off Color",
        id: 3,
      },
      onColor: {
        value: "#01c16e",
        type: "color",
        label: "On Color",
        id: 4,
      },
      icon: {
        value: "toggle",
        type: "iconSwitch",
        label: "Icon",
        id: 5,
      },
      t3EntryDisplayField: {
        value: "value",
        type: "select",
        id: 6,
      },
    },
  },
  {
    name: "LED",
    label: "LED",
    icon: "svguse:icons.svg#led",
    cat: ["Basic"],
    settings: {
      textAlign: {
        value: "left",
        type: "textAlign",
        id: 3,
      },
      active: {
        value: false,
        type: "boolean",
        label: "On/Off",
        id: 1,
      },
      blink: {
        value: false,
        type: "boolean",
        label: "Blink",
        id: 2,
      },
      blinkInterval: {
        value: 700,
        type: "number",
        label: "Blink interval",
        id: 4,
      },
      offColor: {
        value: "#000000",
        type: "color",
        label: "Off Color",
        id: 5,
      },
      onColor: {
        value: "#01c16e",
        type: "color",
        label: "On Color",
        id: 6,
      },
      t3EntryDisplayField: {
        value: "value",
        type: "select",
        id: 7,
      },
    },
  },
  // {
  //   name: "Wall",
  //   label: "Wall",
  //   icon: "crop_16_9",
  //   cat: ["Room"],
  //   height: 20,
  //   settings: {
  //     bgColor: {
  //       value: "#666666",
  //       type: "color",
  //       label: "Background Color",
  //       id: 1,
  //     },
  //   },
  // },
  {
    name: "Wall",
    label: "Wall",
    icon: "svguse:icons.svg#int_ext_wall",
    cat: ["Room"],
    height: 10,
    settings: {
      bgColor: {
        value: "#000",
        type: "color",
        label: "Background Color",
        id: 1,
      },
      strokeColor: {
        value: "#000",
        type: "color",
        label: "Stroke Color",
        id: 2,
      },
      strokeWidth: {
        value: 19.5,
        type: "number",
        label: "Stroke width",
        id: 3,
      },
    },
  },
  {
    name: "RoomHumidity",
    label: "Room Humidity",
    icon: "svguse:icons.svg#room-humidity",
    cat: ["Room"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "RoomTemperature",
    label: "Room Temperature",
    icon: "svguse:icons.svg#room-temperature",
    cat: ["Room"],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Weld",
    label: "Weld",
    icon: "svguse:icons.svg#weld",
    cat: [""],
    settings: {
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
      active: {
        value: false,
        type: "boolean",
        label: "Active",
        id: 2,
      },
      inAlarm: {
        value: false,
        type: "boolean",
        label: "In alarm",
        id: 3,
      },
    },
  },
  // New duct
  {
    name: "Duct1",
    label: "Duct1",
    icon: "svguse:icons.svg#duct1 |0 0 12 12",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Duct2",
    label: "Duct2",
    icon: "svguse:icons.svg#duct2",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Duct3",
    label: "Duct3",
    icon: "svguse:icons.svg#duct3",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Duct4",
    label: "Duct4",
    icon: "svguse:icons.svg#duct4",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Duct5",
    label: "Duct5",
    icon: "svguse:icons.svg#duct5",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Duct7",
    label: "Duct6",
    icon: "svguse:icons.svg#duct7",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Duct8",
    label: "Duct7",
    icon: "svguse:icons.svg#duct8",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
  {
    name: "Duct9",
    label: "Duct8",
    icon: "svguse:icons.svg#duct9",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",//"#659dc5",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  }
];

// Adjust the height of the vertical scroll bar when global message is shown
export const AdjustVlScrollHeight = 42;

export const toolsCategories = [
  "Basic",
  "General",
  "Pipe",
  "NewDuct",
  "Duct",
  "Room",
  "Metrics",
];
