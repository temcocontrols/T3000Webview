/**
 * Expansion Type Definitions
 * External I/O devices, thermostat schedules, remote thermostats
 */

// EXTIO_DEVICES Table
export interface ExtIoDevice {
  ExtIoDeviceId?: number;
  SerialNumber: number;           // Parent device
  ExtIO_ID: string;
  ExtIO_Index: string;
  Panel: string;
  Product_ID: number;
  Port: number;                   // 0=sub, 1=zigbee, 2=main
  Modbus_ID: number;
  Last_Contact_Time: number;      // Unix timestamp
  Input_Start: number;
  Input_End: number;
  Output_Start: number;
  Output_End: number;
  ExtIO_SerialNumber: number;     // ExtIO device serial
  Status: string;
}

// TSTAT_SCHEDULES Table
export interface TstatSchedule {
  TstatScheduleId?: number;
  SerialNumber: number;
  Tstat_ID: string;
  Tstat_Index: string;
  Panel: string;
  Schedule_ID: number;
  Schedule: number;
  Flag: number;
  Online_Status: number;          // 0=offline, 1=online
  Name: string;                   // 15 bytes
  Day_Setpoint: number;
  Night_Setpoint: number;
  Awake_Setpoint: number;
  Sleep_Setpoint: number;
  Status: string;
}

// REMOTE_TSTAT_DB Table
export interface RemoteTstatDb {
  RemoteTstatDbId?: number;
  SerialNumber: number;           // Parent device
  Remote_Tstat_ID: string;
  Remote_Index: number;           // 0-63
  Panel: string;
  Protocol: number;               // 0=modbus, 1=bacnet
  Modbus_ID: number;
  BACnet_Instance: number;
  Status: string;
}
