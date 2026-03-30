/**
 * Range selection data for Variable points
 * Based on C++ Variable_Analog_Units_Array and Digital_Units_Array
 */

export interface RangeOption {
  value: number;
  label: string;
  category?: string;
}

/**
 * Variable Analog Units — C++ native indices 31–68
 * Used when variable digital_analog === BAC_UNITS_ANALOG (0)
 */
export const VARIABLE_ANALOG_RANGES: RangeOption[] = [
  { value: 0,  label: 'Unused',         category: 'General' },
  { value: 31, label: 'deg.Celsius',    category: 'Temperature' },
  { value: 32, label: 'deg.Fahrenheit', category: 'Temperature' },
  { value: 33, label: 'Feet per Min',   category: 'Velocity' },
  { value: 34, label: 'Pascals',        category: 'Pressure' },
  { value: 35, label: 'KPascals',       category: 'Pressure' },
  { value: 36, label: 'lbs/sqr.inch',  category: 'Pressure' },
  { value: 37, label: 'inches of WC',   category: 'Pressure' },
  { value: 38, label: 'Watts',          category: 'Power' },
  { value: 39, label: 'KWatts',         category: 'Power' },
  { value: 40, label: 'KWH',            category: 'Power' },
  { value: 41, label: 'Volts',          category: 'Electrical' },
  { value: 42, label: 'KV',             category: 'Electrical' },
  { value: 43, label: 'Amps',           category: 'Electrical' },
  { value: 44, label: 'ma',             category: 'Electrical' },
  { value: 45, label: 'CFM',            category: 'Flow' },
  { value: 46, label: 'Seconds',        category: 'Time' },
  { value: 47, label: 'Minutes',        category: 'Time' },
  { value: 48, label: 'Hours',          category: 'Time' },
  { value: 49, label: 'Days',           category: 'Time' },
  { value: 50, label: 'Time',           category: 'Time' },
  { value: 51, label: 'Ohms',           category: 'Electrical' },
  { value: 52, label: '%',              category: 'Percentage' },
  { value: 53, label: '%RH',            category: 'Humidity' },
  { value: 54, label: 'p/min',          category: 'Speed' },
  { value: 55, label: 'Counts',         category: 'Count' },
  { value: 56, label: '%Open',          category: 'Percentage' },
  { value: 57, label: 'Kg',             category: 'Mass' },
  { value: 58, label: 'L/Hour',         category: 'Flow' },
  { value: 59, label: 'GPH',            category: 'Flow' },
  { value: 60, label: 'GAL',            category: 'Volume' },
  { value: 61, label: 'CF',             category: 'Volume' },
  { value: 62, label: 'BTU',            category: 'Energy' },
  { value: 63, label: 'CMH',            category: 'Flow' },
  { value: 64, label: 'Custom 1',       category: 'Custom' },
  { value: 65, label: 'Custom 2',       category: 'Custom' },
  { value: 66, label: 'Custom 3',       category: 'Custom' },
  { value: 67, label: 'Custom 4',       category: 'Custom' },
  { value: 68, label: 'Custom 5',       category: 'Custom' },
];

/**
 * Digital Units (0–30, MSV 101–104) — same numbering as inputs/outputs
 */
export const DIGITAL_RANGES: RangeOption[] = [
  { value: 0,   label: 'Unused',            category: 'General' },
  { value: 1,   label: 'Off/On',            category: 'Standard' },
  { value: 2,   label: 'Close/Open',        category: 'Standard' },
  { value: 3,   label: 'Stop/Start',        category: 'Standard' },
  { value: 4,   label: 'Disable/Enable',    category: 'Standard' },
  { value: 5,   label: 'Normal/Alarm',      category: 'Standard' },
  { value: 6,   label: 'Normal/High',       category: 'Standard' },
  { value: 7,   label: 'Normal/Low',        category: 'Standard' },
  { value: 8,   label: 'No/Yes',            category: 'Standard' },
  { value: 9,   label: 'Cool/Heat',         category: 'Standard' },
  { value: 10,  label: 'Unoccupy/Occupy',   category: 'Standard' },
  { value: 11,  label: 'Low/High',          category: 'Standard' },
  { value: 12,  label: 'On/Off',            category: 'Standard' },
  { value: 13,  label: 'Open/Close',        category: 'Standard' },
  { value: 14,  label: 'Start/Stop',        category: 'Standard' },
  { value: 15,  label: 'Enable/Disable',    category: 'Standard' },
  { value: 16,  label: 'Alarm/Normal',      category: 'Standard' },
  { value: 17,  label: 'High/Normal',       category: 'Standard' },
  { value: 18,  label: 'Low/Normal',        category: 'Standard' },
  { value: 19,  label: 'Yes/No',            category: 'Standard' },
  { value: 20,  label: 'Heat/Cool',         category: 'Standard' },
  { value: 21,  label: 'Occupy/Unoccupy',   category: 'Standard' },
  { value: 22,  label: 'High/Low',          category: 'Standard' },
  { value: 23,  label: 'Custom Digital 1',  category: 'Custom' },
  { value: 24,  label: 'Custom Digital 2',  category: 'Custom' },
  { value: 25,  label: 'Custom Digital 3',  category: 'Custom' },
  { value: 26,  label: 'Custom Digital 4',  category: 'Custom' },
  { value: 27,  label: 'Custom Digital 5',  category: 'Custom' },
  { value: 28,  label: 'Custom Digital 6',  category: 'Custom' },
  { value: 29,  label: 'Custom Digital 7',  category: 'Custom' },
  { value: 30,  label: 'Custom Digital 8',  category: 'Custom' },
  { value: 101, label: 'MSV 1',             category: 'Multi-State' },
  { value: 102, label: 'MSV 2',             category: 'Multi-State' },
  { value: 103, label: 'MSV 3',             category: 'Multi-State' },
  { value: 104, label: 'MSV 4',             category: 'Multi-State' },
];

export const BAC_UNITS_ANALOG = 0;
export const BAC_UNITS_DIGITAL = 1;

export function getRangeOptions(digitalAnalog: number): RangeOption[] {
  return digitalAnalog === BAC_UNITS_DIGITAL ? DIGITAL_RANGES : VARIABLE_ANALOG_RANGES;
}

export function getRangeLabel(value: number, digitalAnalog: number): string {
  const customMappings: { [key: number]: string } = {
    // Digital Custom (23-30)
    23: '9/9', 24: '/', 25: '/', 26: '/', 27: '/', 28: '/', 29: '/', 30: '/',
    // Multi State (101-104)
    101: 'MSV 1', 102: 'MSV 2', 103: 'MSV 3', 104: 'MSV 4',
  };
  if (Object.prototype.hasOwnProperty.call(customMappings, value)) return customMappings[value];
  const ranges = getRangeOptions(digitalAnalog);
  const range = ranges.find(r => r.value === value);
  return range ? range.label : 'Unknown';
}
