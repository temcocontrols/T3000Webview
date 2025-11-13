/**
 * Range selection data for Input points
 * Based on C++ Input_Analog_Units_Array and Digital_Units_Array
 */

export interface RangeOption {
  value: number;
  label: string;
  unit?: string;
  category?: string;
}

/**
 * Input Analog Units (40 options)
 * Used when input digital_analog === BAC_UNITS_ANALOG
 */
export const INPUT_ANALOG_RANGES: RangeOption[] = [
  { value: 0, label: 'Unused', unit: '', category: 'General' },
  { value: 1, label: 'Y3K -40 to 150', unit: 'Deg.C', category: 'Temperature' },
  { value: 2, label: 'Y3K -40 to 300', unit: 'Deg.F', category: 'Temperature' },
  { value: 3, label: '10K Type2', unit: 'Deg.C', category: 'Temperature' },
  { value: 4, label: '10K Type2', unit: 'Deg.F', category: 'Temperature' },
  { value: 5, label: 'G3K -40 to 120', unit: 'Deg.C', category: 'Temperature' },
  { value: 6, label: 'G3K -40 to 250', unit: 'Deg.F', category: 'Temperature' },
  { value: 7, label: '10K Type3', unit: 'Deg.C', category: 'Temperature' },
  { value: 8, label: '10K Type3', unit: 'Deg.F', category: 'Temperature' },
  { value: 9, label: 'PT 1K -200 to 300', unit: 'Deg.C', category: 'Temperature' },
  { value: 10, label: 'PT 1K -200 to 570', unit: 'Deg.F', category: 'Temperature' },
  { value: 11, label: '0.0 to 5.0', unit: 'Volts', category: 'Voltage' },
  { value: 12, label: '0.0 to 100', unit: 'Amps', category: 'Current' },
  { value: 13, label: '4 to 20', unit: 'ma', category: 'Current' },
  { value: 14, label: '4 to 20', unit: 'psi', category: 'Pressure' },
  { value: 15, label: 'Pulse Count (Slow 1Hz)', unit: 'counts', category: 'Pulse' },
  { value: 16, label: '0 to 100', unit: '%', category: 'Percentage' },
  { value: 17, label: '0 to 100', unit: '%', category: 'Percentage' },
  { value: 18, label: '0 to 100', unit: '%', category: 'Percentage' },
  { value: 19, label: '0.0 to 10.0', unit: 'Volts', category: 'Voltage' },
  { value: 20, label: 'Table 1', unit: 'Custom', category: 'Custom Tables' },
  { value: 21, label: 'Table 2', unit: 'Custom', category: 'Custom Tables' },
  { value: 22, label: 'Table 3', unit: 'Custom', category: 'Custom Tables' },
  { value: 23, label: 'Table 4', unit: 'Custom', category: 'Custom Tables' },
  { value: 24, label: 'Table 5', unit: 'Custom', category: 'Custom Tables' },
  { value: 25, label: 'Pulse Count (Fast 100Hz)', unit: 'counts', category: 'Pulse' },
  { value: 26, label: 'Frequency', unit: 'Hz', category: 'Frequency' },
  { value: 27, label: 'Humidity %', unit: '%', category: 'Environmental' },
  { value: 28, label: 'CO2 PPM', unit: 'PPM', category: 'Environmental' },
  { value: 29, label: 'Revolutions Per Minute', unit: 'RPM', category: 'Speed' },
  { value: 30, label: 'TVOC PPB', unit: 'PPB', category: 'Environmental' },
  { value: 31, label: 'ug/m3', unit: 'ug/m3', category: 'Environmental' },
  { value: 32, label: '#/cm3', unit: '#/cm3', category: 'Environmental' },
  { value: 33, label: 'dB', unit: 'dB', category: 'Sound' },
  { value: 34, label: 'Lux', unit: 'Lux', category: 'Light' },
  { value: 35, label: 'Reserved', unit: '', category: 'Reserved' },
  { value: 36, label: 'Reserved', unit: '', category: 'Reserved' },
  { value: 37, label: 'Reserved', unit: '', category: 'Reserved' },
  { value: 38, label: 'Reserved', unit: '', category: 'Reserved' },
  { value: 39, label: 'Reserved', unit: '', category: 'Reserved' },
];

/**
 * Digital Units (31 options)
 * Used when input digital_analog === BAC_UNITS_DIGITAL
 * Includes standard digital (0-22) and custom digital (23-30)
 */
export const DIGITAL_RANGES: RangeOption[] = [
  { value: 0, label: 'Unused', category: 'General' },
  { value: 1, label: 'Off/On', category: 'Standard' },
  { value: 2, label: 'Close/Open', category: 'Standard' },
  { value: 3, label: 'Stop/Start', category: 'Standard' },
  { value: 4, label: 'Disable/Enable', category: 'Standard' },
  { value: 5, label: 'Normal/Alarm', category: 'Standard' },
  { value: 6, label: 'Normal/High', category: 'Standard' },
  { value: 7, label: 'Normal/Low', category: 'Standard' },
  { value: 8, label: 'No/Yes', category: 'Standard' },
  { value: 9, label: 'Cool/Heat', category: 'Standard' },
  { value: 10, label: 'Unoccupy/Occupy', category: 'Standard' },
  { value: 11, label: 'Low/High', category: 'Standard' },
  { value: 12, label: 'On/Off', category: 'Standard' },
  { value: 13, label: 'Open/Close', category: 'Standard' },
  { value: 14, label: 'Start/Stop', category: 'Standard' },
  { value: 15, label: 'Enable/Disable', category: 'Standard' },
  { value: 16, label: 'Alarm/Normal', category: 'Standard' },
  { value: 17, label: 'High/Normal', category: 'Standard' },
  { value: 18, label: 'Low/Normal', category: 'Standard' },
  { value: 19, label: 'Yes/No', category: 'Standard' },
  { value: 20, label: 'Heat/Cool', category: 'Standard' },
  { value: 21, label: 'Occupy/Unoccupy', category: 'Standard' },
  { value: 22, label: 'High/Low', category: 'Standard' },
  { value: 23, label: 'Custom Digital 1', category: 'Custom' },
  { value: 24, label: 'Custom Digital 2', category: 'Custom' },
  { value: 25, label: 'Custom Digital 3', category: 'Custom' },
  { value: 26, label: 'Custom Digital 4', category: 'Custom' },
  { value: 27, label: 'Custom Digital 5', category: 'Custom' },
  { value: 28, label: 'Custom Digital 6', category: 'Custom' },
  { value: 29, label: 'Custom Digital 7', category: 'Custom' },
  { value: 30, label: 'Custom Digital 8', category: 'Custom' },
];

/**
 * Constants for input type
 */
export const BAC_UNITS_ANALOG = 0;
export const BAC_UNITS_DIGITAL = 1;

/**
 * Get range options based on input type
 */
export function getRangeOptions(digitalAnalog: number): RangeOption[] {
  return digitalAnalog === BAC_UNITS_DIGITAL ? DIGITAL_RANGES : INPUT_ANALOG_RANGES;
}

/**
 * Get range label by value and type
 */
export function getRangeLabel(value: number, digitalAnalog: number): string {
  const ranges = getRangeOptions(digitalAnalog);
  const range = ranges.find(r => r.value === value);
  return range ? range.label : 'Unknown';
}
