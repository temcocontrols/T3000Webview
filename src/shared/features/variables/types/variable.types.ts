/**
 * Shared Variable Types
 * Used by both Desktop and Mobile versions
 */

export interface VariablePoint {
  serialNumber: number;
  variableId?: string;
  variableIndex?: string;
  panel?: string;
  fullLabel?: string;
  autoManual?: string;
  fValue?: string;
  units?: string;
  rangeField?: string;
  calibration?: string;
  sign?: string;
  filterField?: string;
  status?: string;
  digitalAnalog?: string;
  label?: string;
  typeField?: string;
}
