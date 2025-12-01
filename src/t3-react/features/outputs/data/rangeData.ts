/**
 * Range selection data for Output points
 * Based on C++ Output_Analog_Units_Array and Digital_Units_Array
 */

export interface RangeOption {
  value: number;
  label: string;
  unit?: string;
  category?: string;
}

/**
 * Output Analog Units (9 options: 0-8)
 * Used when output digital_analog === BAC_UNITS_ANALOG
 */
export const OUTPUT_ANALOG_RANGES: RangeOption[] = [
  { value: 0, label: 'Unused', unit: '', category: 'General' },
  { value: 1, label: '0.0 -> 10', unit: 'Volts', category: 'Voltage' },
  { value: 2, label: '0.0 -> 100', unit: '%Open', category: 'Percentage' },
  { value: 3, label: '4 -> 20', unit: 'psi', category: 'Pressure' },
  { value: 4, label: '0.0 -> 100', unit: '%', category: 'Percentage' },
  { value: 5, label: '0.0 -> 100', unit: '%Cls', category: 'Percentage' },
  { value: 6, label: '4 -> 20', unit: 'ma', category: 'Current' },
  { value: 7, label: '0.0 -> 100', unit: 'PWM', category: 'PWM' },
  { value: 8, label: '2 -> 10', unit: 'Volts', category: 'Voltage' },
];

/**
 * Digital Units (23 options: 0-22)
 * Used when output digital_analog === BAC_UNITS_DIGITAL
 * Same as input digital ranges
 */
export const OUTPUT_DIGITAL_RANGES: RangeOption[] = [
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
 * Constants for output type
 */
export const BAC_UNITS_ANALOG = 0;
export const BAC_UNITS_DIGITAL = 1;

/**
 * Get range options based on output type
 */
export function getRangeOptions(digitalAnalog: number): RangeOption[] {
  return digitalAnalog === BAC_UNITS_DIGITAL ? OUTPUT_DIGITAL_RANGES : OUTPUT_ANALOG_RANGES;
}

/**
 * Get range label by value and type
 */
export function getRangeLabel(value: number, digitalAnalog: number): string {
  // Hardcoded mappings for custom digital units (23-30)
  const customMappings: { [key: number]: string } = {
    23: '9/9',
    24: '/',
    25: '/',
    26: '/',
    27: '/',
    28: '/',
    29: '/',
    30: '/',
  };

  // Check custom mappings first
  if (customMappings.hasOwnProperty(value)) {
    return customMappings[value];
  }

  // Fall back to standard ranges
  const ranges = getRangeOptions(digitalAnalog);
  const range = ranges.find(r => r.value === value);
  return range ? range.label : 'Unknown';
}
