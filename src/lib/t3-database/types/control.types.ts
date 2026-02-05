/**
 * Control Type Definitions
 * Programs, Schedules, PIDs, Holidays, Arrays, Conversion Tables, Custom Units
 */

// PROGRAMS Table
export interface Program {
  ProgramId?: number;
  SerialNumber: number;
  Program_ID: string;
  Panel: string;
  Label: string;
  Full_Label: string;
  Status: string;
  Auto_Manual: number;
  Size: number;
  Execution_Time: number;
  Program_Code: string;          // Program source code
}

// SCHEDULES Table
export interface Schedule {
  ScheduleId?: number;
  SerialNumber: number;
  Schedule_ID: string;
  Panel: string;
  Label: string;
  Full_Label: string;
  Auto_Manual: number;
  Status: string;
  Output: number;
  Holiday1: number;
  Holiday2: number;
  Times: string;                  // JSON array of schedule times
}

// PID_TABLE Table
export interface Pid {
  PidId?: number;
  SerialNumber: number;
  PID_ID: string;
  Panel: string;
  Input: number;
  Input_Value: number;
  Setpoint: number;
  Auto_Manual: number;
  Output: number;
  Output_Value: number;
  Proportional: number;
  Integral: number;
  Derivative: number;
  Status: string;
}

// HOLIDAYS Table
export interface Holiday {
  HolidayId?: number;
  SerialNumber: number;
  Holiday_ID: string;
  Panel: string;
  Label: string;
  Full_Label: string;
  Auto_Manual: number;
  Value: number;
  Days: string;                   // JSON array of holiday dates
  Status: string;
}

// ARRAYS Table
export interface Array {
  ArrayId?: number;
  SerialNumber: number;
  Array_ID: string;
  Array_Index: string;
  Panel: string;
  Label: string;                  // 9 bytes
  Array_Size: number;             // 0-65535
  Status: string;
}

// CONVERSION_TABLES Table
export interface ConversionTable {
  TableId?: number;
  SerialNumber: number;
  Table_ID: string;
  Table_Index: string;
  Panel: string;
  Table_Name: string;             // 9 bytes
  Table_Data: string;             // JSON array of {volts, value} pairs
  Status: string;
}

// CUSTOM_UNITS Table
export interface CustomUnit {
  UnitId?: number;
  SerialNumber: number;
  Unit_ID: string;
  Unit_Index: string;
  Panel: string;
  Unit_Type: string;              // 'DIGITAL' or 'ANALOG'
  Direct: number;                 // 0 or 1
  Digital_Units_Off: string;      // 12 bytes
  Digital_Units_On: string;       // 12 bytes
  Analog_Unit_Name: string;
  Status: string;
}

// VARIABLE_UNITS Table
export interface VariableUnit {
  VariableUnitId?: number;
  SerialNumber: number;
  Variable_ID: string;
  Variable_Index: string;
  Panel: string;
  Variable_Cus_Unite: string;     // 20 bytes
  Status: string;
}
