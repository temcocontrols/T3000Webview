/**
 * User Type Definitions
 * User authentication and permissions
 */

// USERS Table
export interface User {
  UserId?: number;
  SerialNumber: number;
  User_ID: string;
  User_Index: string;
  Panel: string;
  Name: string;                   // 16 bytes
  Password: string;               // 9 bytes - should be hashed
  Access_Level: number;           // 0-255
  Rights_Access: number;          // Bitfield
  Default_Panel: number;
  Default_Group: number;
  Screen_Right: string;           // Bitfield as TEXT
  Program_Right: string;          // Bitfield as TEXT
  Status: string;
}

// REMOTE_POINTS Table
export interface RemotePoint {
  RemotePointId?: number;
  SerialNumber: number;
  Remote_ID: string;
  Remote_Index: string;
  Panel: string;
  Point_Number: number;
  Point_Type: number;
  Point_Panel: number;
  Sub_Panel: number;
  Network: number;
  Point_Value: number;
  Auto_Manual: number;
  Digital_Analog: number;
  Device_Online: number;
  Product_ID: number;
  Count_Field: number;
  Read_Write: number;             // 0=read only, 1=written
  Time_Remaining: number;
  Object_Instance: number;
  Status: string;
}
