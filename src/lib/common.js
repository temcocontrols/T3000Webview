// Import the necessary dependencies
import { ref } from "vue";

export const T3000_Data = ref({
  panelsData: [],
  panelsList: [],
  panelsRanges: [],
  loadingPanel: null,
});

// Define a function to get the entry range based on the item
export const getEntryRange = (item) => {
  // Check if the item has a range
  if (item?.range) {
    // Determine the range type based on the item type
    const rangeType = item.type.toLowerCase();
    // Find the range based on the item's range ID
    let range = !item.digital_analog
      ? ranges.digital.find((i) => i.id === item.range)
      : ranges.analog[rangeType].find((i) => i.id === item.range);

    // If the range is not found, check for custom ranges
    if (!range) {
      const customRanges = T3000_Data.value.panelsRanges.filter(
        (i) => i.pid === item.pid
      );
      range = !item.digital_analog
        ? customRanges.find(
            (i) => i.type === "digital" && i.index === item.range
          )
        : customRanges.find(
            (i) => i.type === "analog" && i.index === item.range
          );

      // If the range is still not found and the range ID is greater than 100, assume it is a custom range
      if (!range && item.range > 100) {
        range = customRanges.find(
          (i) => i.type === "MSV" && i.index === item.range
        );
      }
    }

    // Return the range if found
    if (range) return range;
  }

  // Return a default range if no range is found
  return { label: "Unused", unit: "" };
};

export const T3_Types = {
  OUTPUT: 0,
  INPUT: 1,
  VARIABLE: 2,
  SCHEDULE: 4,
  HOLIDAY: 5,
  PROGRAM: 6,
  MON: 9,
};

const gaugeDefautColors = [
  { offset: 33, color: "#14BE64" },
  { offset: 66, color: "#FFB100" },
  { offset: 100, color: "#fd666d" },
];

export const toolsCategories = [
  "Basic",
  "Room",
  "General",
  "Pipe",
  "Duct",
  "Metrics",
];

export const tools = [
  {
    name: "Pointer",
    label: "Select",
    icon: "svguse:icons.svg#cursor|0 0 320 512",
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
    name: "G_Rectangle",
    label: "Rectangle",
    icon: "svguse:icons.svg#g_rectangle|0 0 24 24",
    cat: ["General"],
    settings: {
      bgColor: {
        value: "#000",
        type: "color",
        label: "Background Color",
        id: 1,
      },
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
    icon: "svguse:icons.svg#g_circle|0 0 24 24",
    cat: ["General"],
    settings: {
      bgColor: {
        value: "#000",
        type: "color",
        label: "Background Color",
        id: 1,
      },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "G_Step",
    label: "Step",
    icon: "svguse:icons.svg#g_step|0 0 24 24",
    cat: ["General"],
    settings: {
      bgColor: {
        value: "#000",
        type: "color",
        label: "Background Color",
        id: 1,
      },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "G_Hexagon",
    label: "Hexagon",
    icon: "svguse:icons.svg#g_hexagon|0 0 24 24",
    cat: ["General"],
    settings: {
      bgColor: {
        value: "#000",
        type: "color",
        label: "Background Color",
        id: 1,
      },
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  {
    name: "Duct",
    label: "Duct",
    icon: "svguse:icons.svg#duct|0 0 226 75",
    cat: ["Duct"],
    height: 40,
    settings: {
      bgColor: {
        value: "#808080",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
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
  {
    name: "Wall",
    label: "Wall",
    icon: "crop_16_9",
    cat: ["Room"],
    height: 20,
    settings: {
      bgColor: {
        value: "#666666",
        type: "color",
        label: "Background Color",
        id: 1,
      },
    },
  },
  {
    name: "Int_Ext_Wall",
    label: "Interior / Exterior Wall",
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
];

export const icons = [
  {
    value: "",
    label: "None",
  },
  {
    value: "image",
    label: "Image",
  },
  {
    value: "schedule",
    label: "Schedule",
  },
  {
    value: "power_settings_new",
    label: "Power Button",
  },
  {
    value: "bolt",
    label: "Bolt",
  },
  {
    value: "grid_view",
    label: "Grid",
  },
  {
    value: "question_mark",
    label: "Question mark",
  },
  {
    value: "help",
    label: "Help",
  },
  {
    value: "error",
    label: "Error",
  },
  {
    value: "cancel",
    label: "Cancel",
  },
  {
    value: "check",
    label: "Check",
  },
  {
    value: "check_circle",
    label: "Check circle",
  },
  {
    value: "visibility",
    label: "Visibility",
  },
  {
    value: "fa-solid fa-camera-retro",
    label: "Camera Retro",
  },
  {
    value: "fa-solid fa-laptop-code",
    label: "Code",
  },
  {
    value: "calendar_month",
    label: "Calendar",
  },
  {
    value: "warning",
    label: "Alarm",
  },
  {
    value: "link_off",
    label: "Fault",
  },
  {
    value: "back_hand",
    label: "Manual",
  },
  {
    value: "block",
    label: "Out of Service",
  },
  {
    value: "fiber_manual_record",
    label: "Dot",
  },
  {
    value: "forward",
    label: "Arrow",
  },
];

export const switchIcons = [
  {
    icon: {},
    value: "none",
    label: "None",
  },
  {
    icon: {
      off: "toggle_off",
      on: "toggle_on",
    },
    value: "toggle",
    label: "Toggle",
  },
  {
    icon: {
      off: "radio_button_unchecked",
      on: "radio_button_checked",
    },
    value: "radio",
    label: "Radio",
  },
  {
    icon: {
      off: "check_box_outline_blank",
      on: "check_box",
    },
    value: "checkbox",
    label: "Check box",
  },
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

export const cellClassRules = {
  "bg-yellow-400": (params) =>
    ["REVISION", "UNDER_REVIEW"].includes(params.data.status),
};

export const columnTypes = {
  required: {
    cellClassRules: {
      "bg-red-800": (params) => params.value === null || params.value === "",
    },
  },
};
export const operationOptions = [
  "03 Read Holding Registers (4x)",
  "06 Read Write Single Register",
  "16 Read Write Multiple Registers",
  "03_06 Read Holding and Write Single",
  "03_16 Read Holding and Write Multiple",
  "01 Read Coils (0x)",
  "02 Read Discrete Inputs (1x)",
  "04 Read Input Registers (3x)",
  "05 Write Single Coil",
  "15 Write Multiple Coil",
];

export const dataFormatOptions = [
  "8 Bit Unsigned Integer",
  "8 Bit Signed Integer",
  "16 Bit Unsigned Integer",
  "16 Bit Signed Integer",
  "16 Bit Unsigned Integer/10",
  "16 Bit Signed Integer/10",
  "16 Bit Unsigned Integer/100",
  "16 Bit Signed Integer/100",
  "32 Bit Unsigned Integer HI_LO",
  "32 Bit Unsigned Integer LO_HI",
  "32 Bit Signed Integer HI_LO",
  "32 Bit Signed Integer LO_HI",
  "Floating HI_LO/10",
  "Floating LO_HI/10",
  "Floating HI_LO/100",
  "Floating LO_HI/100",
  "Floating HI_LO/1000",
  "Floating LO_HI/1000",
  "Character String LO_HI",
  "Character String HI_LO",
  "32 Bit Float_ABCD",
  "32 Bit Float_CDAB",
  "32 Bit Float_BADC",
  "32 Bit Float_DCBA",
];
export const devices = ref([]);
export const modbusRegColumns = [
  {
    colId: 1,
    headerName: "#",
    sortable: true,
    field: "id",
    editable: false,
    width: 90,
    cellRenderer: "RowActionsRenderer",
  },
  {
    colId: 2,
    headerName: "Register Address",
    cellEditor: "agNumberCellEditor",
    sortable: true,
    field: "register_address",
    width: 120,
    type: ["required"],
  },
  {
    colId: 3,
    headerName: "Operation",
    sortable: true,
    field: "operation",
    tooltipField: "operation",
    cellEditor: "SelectEditor",
    width: 230,
    cellEditorParams: {
      clearable: false,
      options: operationOptions,
    },
    type: ["required"],
  },
  {
    colId: 4,
    headerName: "Register Length",
    cellEditor: "agNumberCellEditor",
    sortable: true,
    field: "register_length",
    width: 130,
    type: ["required"],
  },
  {
    colId: 5,
    headerName: "Register Name",
    sortable: true,
    field: "register_name",
    tooltipField: "register_name",
  },
  {
    colId: 6,
    headerName: "Data Format",
    sortable: true,
    field: "data_format",
    tooltipField: "data_format",
    width: 160,
    type: ["required"],
    cellEditor: "SelectEditor",
    cellEditorParams: {
      clearable: false,
      options: dataFormatOptions,
    },
  },
  {
    colId: 7,
    headerName: "Description",
    sortable: false,
    field: "description",
    tooltipField: "description",
  },
  {
    colId: 8,
    headerName: "Device Name",
    sortable: true,
    field: "device_id",
    width: 100,
    type: ["required"],
    valueFormatter: (params) => {
      if (params.data.device_id === null) return "";
      return (
        params.data.device?.name ||
        devices.value.find((d) => d.id === params.data.device_id)?.name ||
        ""
      );
    },
    cellEditor: "SelectEditor",
    cellEditorParams: {
      clearable: false,
      options: () => devices.value.filter((d) => d.name !== "All Devices"),
      optionValue: "id",
      optionLabel: "name",
    },
  },
];

// Define a function to get the active value of an object based on its settings and T3 entry
export function getObjectActiveValue(item) {
  // Initialize the active value to false
  let active = false;

  // Check if the item has a T3 entry and its settings have an active property
  if (!item.t3Entry || item.settings?.active === undefined) return false;

  // Check if the item is an output with a hardware switch status
  if (item.t3Entry.type === "OUTPUT" && item.t3Entry.hw_switch_status === 1) {
    active = !!item.t3Entry.hw_switch_status;
  }
  // Check if the item has a range
  else if (item.t3Entry.range) {
    const analog = item.t3Entry.digital_analog;
    const range = getEntryRange(item.t3Entry);
    if (range) {
      // Determine the active value based on the item's type and value
      active =
        (!analog &&
          ((item.t3Entry?.control === 1 && !range.direct) ||
            (item.t3Entry?.control === 0 && range.direct))) ||
        (analog && item.t3Entry?.value > 0)
          ? true
          : false;
    }
  }
  // Check if the item is a program
  else if (item.t3Entry.type === "PROGRAM") {
    active = !!item.t3Entry.status;
  }
  // Check if the item is a schedule
  else if (item.t3Entry.type === "SCHEDULE") {
    active = !!item.t3Entry.output;
  }
  // Check if the item is a holiday
  else if (item.t3Entry.type === "HOLIDAY") {
    active = !!item.t3Entry.value;
  }

  // Return the active value
  return active;
}

export const user = ref(null);

export const demoDeviceData = () => {
  return import("./demo-data").then((exps) => {
    return exps.default;
  });
};

export const globalNav = ref({
  title: "Modbus Register",
  home: "/modbus-register",
  back: null,
});

export function isAdmin(user) {
  if (!user) return false;
  return (
    user.roles.admin || user.roles.administrator || user.roles.restricted_admin
  );
}

export function getModbusRegisterSettings() {
  return localStorage.getItem("modbusRegisterSettings")
    ? JSON.parse(localStorage.getItem("modbusRegisterSettings")) || null
    : null;
}
