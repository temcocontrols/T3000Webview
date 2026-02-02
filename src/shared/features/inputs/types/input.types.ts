/**
 * Shared Input Types
 * Used by both Desktop and Mobile versions
 */

export interface InputPoint {
  serialNumber: number;
  inputId?: string;
  inputIndex?: string;
  panel?: string;
  fullLabel?: string;
  autoManual?: string;
  fValue?: string;
  units?: string;
  range?: string;
  rangeField?: string;
  calibration?: string;
  sign?: string;
  filterField?: string;
  status?: string;
  signalType?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}

export interface InputsPageState {
  inputs: InputPoint[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  selectedDevice: any | null;
}
