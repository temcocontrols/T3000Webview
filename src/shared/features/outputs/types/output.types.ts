/**
 * Shared Output Types
 * Used by both Desktop and Mobile versions
 */

export interface OutputPoint {
  serialNumber: number;
  outputId?: string;
  outputIndex?: string;
  panel?: string;
  fullLabel?: string;
  autoManual?: string;
  hwSwitchStatus?: string;
  fValue?: string;
  units?: string;
  range?: string;
  rangeField?: string;
  lowVoltage?: string;
  highVoltage?: string;
  pwmPeriod?: string;
  status?: string;
  signalType?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}
