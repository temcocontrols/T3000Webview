export const T3_Types = {
  OUTPUT: 0,
  INPUT: 1,
  VARIABLE: 2,
  SCHEDULE: 4,
  HOLIDAY: 5,
  PROGRAM: 6,
};

const gaugeDefautColors = [
  { offset: 33, color: "#14BE64" },
  { offset: 66, color: "#FFB100" },
  { offset: 100, color: "#fd666d" },
];

export const tools = [
  {
    name: "Pointer",
    label: "Select",
    icon: "img:/cursor.svg",
  },
  {
    name: "Box",
    label: "Box",
    icon: "square",
    settings: { bgColor: "#659dc5" },
  },
  {
    name: "Text",
    label: "Text",
    icon: "title",
    settings: { content: "Text", textColor: "black", fontSize: 16 },
  },
  {
    name: "Duct",
    label: "Duct",
    icon: "img:/duct.svg",
  },
  {
    name: "Fan",
    label: "Fan",
    icon: "img:/fan.svg",
    settings: { active: false, inAlarm: false },
  },
  {
    name: "CoolingCoil",
    label: "Cooling Coil",
    icon: "img:/cooling-coil.svg",
    settings: { active: false, inAlarm: false },
  },
  {
    name: "HeatingCoil",
    label: "Heating Coil",
    icon: "img:/heating-coil.svg",
    settings: { active: false, inAlarm: false },
  },
  {
    name: "Filter",
    label: "Filter",
    icon: "img:/filter.svg",
  },
  {
    name: "Humidifier",
    label: "Humidifier",
    icon: "img:/humidifier.svg",
    settings: { active: false, inAlarm: false },
  },
  {
    name: "Damper",
    label: "Damper",
    icon: "img:/damper.svg",
    settings: { inAlarm: false },
  },
  {
    name: "Temperature",
    label: "Temperature",
    icon: "img:/temperature.svg",
  },
  {
    name: "Gauge",
    label: "Gauge",
    icon: "speed",
    settings: {
      min: 0,
      max: 100,
      ticks: 10,
      minorTicks: 5,
      thickness: 30,
      colors: gaugeDefautColors,
      bgColor: null,
      titleColor: "#000000",
    },
  },
  {
    name: "Dial",
    label: "Dial",
    icon: "horizontal_split",
    settings: {
      min: 0,
      max: 100,
      ticks: 5,
      minorTicks: 5,
      colors: gaugeDefautColors,
      bgColor: null,
      titleColor: "#000000",
      textColor: "#000000",
    },
  },
  {
    name: "Value",
    label: "Value",
    icon: "123",
    settings: {
      title: "Title",
      bgColor: "",
      textColor: "",
      t3EntryDisplayField: "value",
    },
  },
  {
    name: "PowerBtn",
    label: "Power On/Off",
    icon: "power_settings_new",
    settings: {
      active: false,
      bgColor: "",
      offColor: "#940303",
      onColor: "#0d87d9",
    },
  },
];

export const ranges = [
  {
    id: 1,
    label: "Off/On",
    off: "Off",
    on: "On",
    directInvers: null,
  },
  {
    id: 2,
    label: "Close/Open",
    off: "Close",
    on: "Open",
    directInvers: null,
  },
  {
    id: 3,
    label: "Stop/Start",
    off: "Stop",
    on: "Start",
    directInvers: null,
  },
  {
    id: 4,
    label: "Disable/Enable",
    off: "Disable",
    on: "Enable",
    directInvers: null,
  },
  {
    id: 5,
    label: "Normal/Alarm",
    off: "Normal",
    on: "Alarm",
    directInvers: null,
  },
  {
    id: 6,
    label: "Normal/High",
    off: "Normal",
    on: "High",
    directInvers: null,
  },
  {
    id: 7,
    label: "Normal/Low",
    off: "Normal",
    on: "Low",
    directInvers: null,
  },
  {
    id: 8,
    label: "No/Yes",
    off: "No",
    on: "Yes",
    directInvers: null,
  },
  {
    id: 9,
    label: "Cool/Heat",
    off: "Cool",
    on: "Heat",
    directInvers: null,
  },
  {
    id: 10,
    label: "Unoccupy/Occupy",
    off: "Unoccupy",
    on: "Occupy",
    directInvers: null,
  },
  {
    id: 11,
    label: "Low/High",
    on: "Low",
    off: "High",
    directInvers: null,
  },
  {
    id: 12,
    label: "On/Off",
    on: "Off",
    off: "On",
    directInvers: true,
  },
  {
    id: 13,
    label: "Open/Close",
    on: "Close",
    off: "Open",
    directInvers: true,
  },
  {
    id: 14,
    label: "Start/Stop",
    on: "Stop",
    off: "Start",
    directInvers: true,
  },
  {
    id: 15,
    label: "Enable/Disable",
    on: "Disable",
    off: "Enable",
    directInvers: true,
  },
  {
    id: 16,
    label: "Alarm/Normal",
    on: "Normal",
    off: "Alarm",
    directInvers: true,
  },
  {
    id: 17,
    label: "High/Normal",
    on: "Normal",
    off: "High",
    directInvers: true,
  },
  {
    id: 18,
    label: "Low/Normal",
    on: "Normal",
    off: "Low",
    directInvers: true,
  },
  {
    id: 19,
    label: "Yes/No",
    on: "No",
    off: "Yes",
    directInvers: true,
  },
  {
    id: 20,
    label: "Heat/Cool",
    on: "Cool",
    off: "Heat",
    directInvers: true,
  },
  {
    id: 21,
    label: "Occupy/Unoccupy",
    on: "Unoccupy",
    off: "Occupy",
    directInvers: true,
  },
  {
    id: 22,
    label: "High/Low",
    on: "Low",
    off: "High",
    directInvers: true,
  },
  {
    analog: true,
    id: 0,
    unit: "",
    label: "Unused",
  },
  {
    analog: true,
    id: 1,
    unit: "Deg.C",
    label: "Y3K -40 to 150",
  },
  {
    analog: true,
    id: 2,
    unit: "Deg.F",
    label: "Y3K -40 to 300",
  },
  {
    analog: true,
    id: 3,
    unit: "Deg.C",
    label: "10K Type2",
  },
  {
    analog: true,
    id: 4,
    unit: "Deg.F",
    label: "10K Type2",
  },
  {
    analog: true,
    id: 5,
    unit: "Deg.C",
    label: "G3K -40 to 120",
  },
  {
    analog: true,
    id: 6,
    unit: "Deg.F",
    label: "G3K -40 to 250",
  },
  {
    analog: true,
    id: 7,
    unit: "Deg.C",
    label: "10K Type3",
  },
  {
    analog: true,
    id: 8,
    unit: "Deg.F",
    label: "10K Type3",
  },
  {
    analog: true,
    id: 9,
    unit: "Deg.C",
    label: "PT 1K -200 to 300",
  },
  {
    analog: true,
    id: 10,
    unit: "Deg.F",
    label: "PT 1K -200 to 570",
  },
  {
    analog: true,
    id: 11,
    unit: "Volts",
    label: "0.0 to 5.0",
  },
  {
    analog: true,
    id: 12,
    unit: "Amps",
    label: "0.0 to 100",
  },
  {
    analog: true,
    id: 13,
    unit: "ma",
    label: "4 to 20",
  },
  {
    analog: true,
    id: 14,
    unit: "psi",
    label: "4 to 20",
  },
  {
    analog: true,
    id: 15,
    unit: "counts",
    label: "Pulse Count (Slow 1Hz)",
  },
  {
    analog: true,
    id: 16,
    unit: "%",
    label: "0 to 100",
  },
  {
    analog: true,
    id: 17,
    unit: "%",
    label: "0 to 100",
  },
  {
    analog: true,
    id: 18,
    unit: "%",
    label: "0 to 100",
  },
  {
    analog: true,
    id: 19,
    unit: "Volts",
    label: "0.0 to 10.0",
  },
  {
    analog: true,
    id: 20,
    unit: "",
    label: "Table 1",
  },
  {
    analog: true,
    id: 21,
    unit: "",
    label: "Table 2",
  },
  {
    analog: true,
    id: 22,
    unit: "",
    label: "Table 3",
  },
  {
    analog: true,
    id: 23,
    unit: "",
    label: "Table 4",
  },
  {
    analog: true,
    id: 24,
    unit: "",
    label: "Table 5",
  },
  {
    analog: true,
    id: 25,
    unit: "counts",
    label: "Pulse Count (Fast 100Hz)",
  },
  {
    analog: true,
    id: 26,
    unit: "Hz",
    label: "Frequency",
  },
  {
    analog: true,
    id: 27,
    unit: "%",
    label: "Humidty %",
  },
  {
    analog: true,
    id: 28,
    unit: "PPM",
    label: "CO2  PPM",
  },
  {
    analog: true,
    id: 29,
    unit: "RPM",
    label: "Revolutions Per Minute",
  },
  {
    analog: true,
    id: 30,
    unit: "PPB",
    label: "TVOC PPB",
  },
  {
    analog: true,
    id: 31,
    unit: "ug/m3",
    label: "ug/m3",
  },
  {
    analog: true,
    id: 32,
    unit: "#/cm3",
    label: "#/cm3",
  },
  {
    analog: true,
    id: 33,
    unit: "dB",
    label: "dB",
  },
  {
    analog: true,
    id: 34,
    unit: "Lux",
    label: "Lux",
  },
  {
    analog: true,
    id: 35,
    unit: "",
    label: "",
  },
  {
    analog: true,
    id: 36,
    unit: "",
    label: "",
  },
  {
    analog: true,
    id: 37,
    unit: "",
    label: "",
  },
  {
    analog: true,
    id: 38,
    unit: "",
    label: "",
  },
  {
    analog: true,
    id: 39,
    unit: "",
    label: "",
  },
];
