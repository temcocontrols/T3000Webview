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
 * Output Analog Units — C++ native indices 31–38
 * Used when output digital_analog === BAC_UNITS_ANALOG (1)
 */
export const OUTPUT_ANALOG_RANGES: RangeOption[] = [
  { value: 0, label: 'Unused', category: 'General' },
  { value: 31, label: '0.0 -> 10 Volts', category: 'Voltage' },
  { value: 32, label: '0.0 -> 100 %Open', category: 'Percentage' },
  { value: 33, label: '0.0 -> 20 psi', category: 'Pressure' },
  { value: 34, label: '0.0 -> 100 % (0-10V)', category: 'Percentage' },
  { value: 35, label: '0.0 -> 100 %Cls', category: 'Percentage' },
  { value: 36, label: '0.0 -> 20 ma', category: 'Current' },
  { value: 37, label: '0.0 -> 100 PWM', category: 'PWM' },
  { value: 38, label: '0.0 -> 100 % (2-10V)', category: 'Percentage' },
];

/**
 * Digital Units (23 options: 0-22)
 * Used when output digital_analog === BAC_UNITS_DIGITAL (0)
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
  { value: 101, label: 'MSV 1', category: 'Multi-State' },
  { value: 102, label: 'MSV 2', category: 'Multi-State' },
  { value: 103, label: 'MSV 3', category: 'Multi-State' },
  { value: 104, label: 'MSV 4', category: 'Multi-State' },
];

/**
 * Constants for output type
 * NOTE: C++ convention: 0 = Digital, 1 = Analog
 */
export const BAC_UNITS_DIGITAL = 0;
export const BAC_UNITS_ANALOG = 1;

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
  const customMappings: { [key: number]: string } = {
    // Digital Custom (23-30)
    23: '9/9', 24: '/', 25: '/', 26: '/', 27: '/', 28: '/', 29: '/', 30: '/',
    // Output Analog (C++ native indices 31-38)
    31: '0.0 -> 10 Volts',
    32: '0.0 -> 100 %Open',
    33: '0.0 -> 20 psi',
    34: '0.0 -> 100 % (0-10V)',
    35: '0.0 -> 100 %Cls',
    36: '0.0 -> 20 ma',
    37: '0.0 -> 100 PWM',
    38: '0.0 -> 100 % (2-10V)',
    // Multi State (101-104)
    101: 'MSV 1', 102: 'MSV 2', 103: 'MSV 3', 104: 'MSV 4',
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
