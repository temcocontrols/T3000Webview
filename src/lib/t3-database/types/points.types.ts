/**
 * Point Type Definitions (Inputs, Outputs, Variables)
 * TypeScript interfaces matching C++ database schema exactly
 * Field names use C++ conventions (Full_Label, Auto_Manual, Range_Field, etc.)
 */

// ============================================================================
// INPUTS Table (64 per device, index 0-63)
// ============================================================================
export interface Input {
  InputId?: number;                    // Auto-increment primary key
  SerialNumber: number;                // FK to DEVICES
  Input_Index: number;                 // 0-63
  Panel: string;
  Full_Label: string;                  // C++ Full_Label
  Auto_Manual: number;                 // C++ Auto_Manual
  fValue: number;                      // C++ fValue
  Units: string;
  Range_Field: string;                 // C++ Range
  Calibration: string;
  Sign: string;
  Filter_Field: string;                // C++ Filter
  Status: string;
  Digital_Analog: number;
  Label: string;
  Type_Field: string;                  // C++ Type
}

// ============================================================================
// OUTPUTS Table (64 per device, index 0-63)
// ============================================================================
export interface Output {
  OutputId?: number;                   // Auto-increment primary key
  SerialNumber: number;                // FK to DEVICES
  Output_Index: number;                // 0-63
  Panel: string;
  Full_Label: string;                  // C++ Full_Label
  Auto_Manual: number;                 // C++ Auto_Manual
  fValue: number;                      // C++ fValue
  Units: string;
  Range_Field: string;                 // C++ Range
  Calibration: string;
  Sign: string;
  Filter_Field: string;                // C++ Filter
  Status: string;
  Digital_Analog: number;
  Label: string;
  Type_Field: string;                  // C++ Type
}

// ============================================================================
// VARIABLES Table (128 per device, index 0-127)
// ============================================================================
export interface Variable {
  VariableId?: number;                 // Auto-increment primary key
  SerialNumber: number;                // FK to DEVICES
  Variable_Index: number;              // 0-127
  Panel: string;
  Full_Label: string;                  // C++ Full_Label
  Auto_Manual: number;                 // C++ Auto_Manual
  fValue: number;                      // C++ fValue
  Units: string;
  Range_Field: string;                 // C++ Range
  Calibration: string;
  Sign: string;
  Filter_Field: string;                // C++ Filter
  Status: string;
  Digital_Analog: number;
  Label: string;
  Type_Field: string;                  // C++ Type
}

// ============================================================================
// Batch Save Request/Response Types
// ============================================================================
export interface BatchSaveRequest<T> {
  serial_number: number;
  items: T[];
}

export interface BatchSaveResponse {
  success: boolean;
  inserted: number;
  updated: number;
  errors?: string[];
}
