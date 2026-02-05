/**
 * Tool Definitions and Categories for T3000 HVAC System
 * Separated from T3Data.ts as part of refactoring efforts
 *
 * Contains all drawing tool configurations, settings, and categorization
 */

export interface ColorRange {
  offset: number;
  color: string;
}

export interface ToolSetting {
  value: any;
  type: string;
  label?: string;
  id: number;
}

export interface Tool {
  name: string;
  label: string;
  icon: string;
  cat: string[];
  height?: number;
  settings: Record<string, ToolSetting>;
}

export const gaugeDefaultColors: ColorRange[] = [
  { offset: 33, color: "#14BE64" },
  { offset: 66, color: "#FFB100" },
  { offset: 100, color: "#fd666d" },
];

export const toolsCategories = [
  "Basic",
  "General",
  "Pipe",
  "NewDuct",
  "Duct",
  "Room",
  "Metrics",
] as const;

export type ToolCategory = typeof toolsCategories[number];

export const newTools: Tool[] = [
  {
    name: "Pointer",
    label: "Select",
    icon: "svguse:icons.svg#cursor|0 0 280 200",
    cat: ["Basic"],
    settings: {},
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
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  // Arrow tools
  {
    name: "ArrowRight",
    label: "Arrow Right",
    icon: "svguse:icons.svg#arrow_right|0 0 32 32",
    cat: ["General"],
    settings: {
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
      fillColor: {
        value: "#659dc5",
        type: "color",
        label: "Fill color",
        id: 2,
      },
    },
  },
  // HVAC Duct tools
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
  // Pipe tools
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
  // Metrics tools
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
        value: gaugeDefaultColors,
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
        value: gaugeDefaultColors,
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
  // Icon tools
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
  // Room tools
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
  // New Duct tools
  {
    name: "Duct1",
    label: "Duct1",
    icon: "svguse:icons.svg#duct1 |0 0 12 12",
    cat: ["NewDuct"],
    settings: {
      fillColor: {
        value: "#0173fe",
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
        value: "#0173fe",
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
        value: "#0173fe",
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
        value: "#0173fe",
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
        value: "#0173fe",
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
        value: "#0173fe",
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
        value: "#0173fe",
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
        value: "#0173fe",
        type: "color",
        label: "Fill color",
        id: 1,
      },
    },
  },
];

// Tool helper functions
export function getToolsByCategory(category: ToolCategory): Tool[] {
  return newTools.filter(tool => tool.cat.includes(category));
}

export function getToolByName(name: string): Tool | undefined {
  return newTools.find(tool => tool.name === name);
}

export function getAllCategories(): ToolCategory[] {
  return [...toolsCategories];
}

// Constants for UI adjustments
export const AdjustVlScrollHeight = 42;
