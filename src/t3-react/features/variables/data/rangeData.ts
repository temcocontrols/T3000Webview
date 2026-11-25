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
 * Variable Analog Units — the firmware's 0-based indices 0..33
 * (`Variable_Analog_Units_Array`, e.g. 1 = °C, 2 = °F)
 * Used when variable digital_analog === BAC_UNITS_ANALOG (1)
 */
export const VARIABLE_ANALOG_RANGES: RangeOption[] = [
  { value: 0, label: 'Unused' },
  { value: 1, label: '\u00b0C' },
  { value: 2, label: '\u00b0F' },
  { value: 3, label: 'FPM' },
  { value: 4, label: 'Pa' },
  { value: 5, label: 'KPa' },
  { value: 6, label: 'PSI' },
  { value: 7, label: 'inWC' },
  { value: 8, label: 'W' },
  { value: 9, label: 'kW' },
  { value: 10, label: 'kWH' },
  { value: 11, label: 'V' },
  { value: 12, label: 'kV' },
  { value: 13, label: 'A' },
  { value: 14, label: 'mA' },
  { value: 15, label: 'CFM' },
  { value: 16, label: 's' },
  { value: 17, label: 'min' },
  { value: 18, label: 'h' },
  { value: 19, label: 'd' },
  { value: 20, label: 'Time' },
  { value: 21, label: '\u03a9' },
  { value: 22, label: '%' },
  { value: 23, label: '%RH' },
  { value: 24, label: 'PPM' },
  { value: 25, label: 'Counts' },
  { value: 26, label: '%Open' },
  { value: 27, label: 'kg' },
  { value: 28, label: 'L/h' },
  { value: 29, label: 'GPH' },
  { value: 30, label: 'GAL' },
  { value: 31, label: 'CF' },
  { value: 32, label: 'BTU' },
  { value: 33, label: 'm\u00b3/h' },
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

/* NOTE: C++ convention: 0 = Digital, 1 = Analog */
export const BAC_UNITS_DIGITAL = 0;
export const BAC_UNITS_ANALOG = 1;

export function getRangeOptions(digitalAnalog: number): RangeOption[] {
  return digitalAnalog === BAC_UNITS_DIGITAL ? DIGITAL_RANGES : VARIABLE_ANALOG_RANGES;
}

/**
 * Codes 0–30 exist in both tables, so the number alone cannot decide the mode.
 * 31–33 are analog-only and 101–104 (MSV) are digital-only: typing one of those
 * must switch the mode instead of saving it as the other kind.
 */
export function inferDigitalAnalog(value: number): number | undefined {
  const inAnalog = VARIABLE_ANALOG_RANGES.some(r => r.value === value);
  const inDigital = DIGITAL_RANGES.some(r => r.value === value);
  if (inAnalog && !inDigital) return BAC_UNITS_ANALOG;
  if (inDigital && !inAnalog) return BAC_UNITS_DIGITAL;
  return undefined;
}

export function getRangeLabel(value: number, digitalAnalog: number): string {
  const ranges = getRangeOptions(digitalAnalog);
  const range = ranges.find(r => r.value === value);
  return range ? range.label : 'Unknown';
}

export function getUnitSymbol(value: number, digitalAnalog: number): string {
  if (digitalAnalog === BAC_UNITS_DIGITAL) {
    const range = DIGITAL_RANGES.find(r => r.value === value);
    return range ? range.label : '0/1';
  }
  const range = VARIABLE_ANALOG_RANGES.find(r => r.value === value);
  return range?.label || '---';
}
