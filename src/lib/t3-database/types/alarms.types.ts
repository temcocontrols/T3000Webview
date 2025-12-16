/**
 * Alarm Type Definitions
 * Alarms, alarm settings, and email notifications
 */

// ALARMS Table
export interface Alarm {
  AlarmId?: number;
  SerialNumber: number;
  Alarm_ID: string;
  Panel: string;
  Message: string;
  Status: string;
  Priority: string;
  NotificationID: string;
  AlarmState: string;
  AlarmType: string;
  Source: string;
  Description: string;
  Acknowledged: string;
  Action_Field: string;
  TimeStamp: string;
  LowLimit: string;
  HighLimit: string;
}

// ALARM_SETTINGS Table
export interface AlarmSetting {
  AlarmSettingId?: number;
  SerialNumber: number;
  Alarm_Setting_ID: string;
  Alarm_Setting_Index: string;
  Panel: string;
  Point_Number: number;
  Point_Type: number;
  Point_Panel: number;
  Point1_Number: number;
  Point1_Type: number;
  Point1_Panel: number;
  Condition: number;
  Way_Low: number;
  Low: number;
  Normal: number;
  High: number;
  Way_High: number;
  Time_Field: number;
  Message_Count: number;
  Count_Field: number;
  Status: string;
}

// EMAIL_ALARMS Table
export interface EmailAlarm {
  EmailAlarmId?: number;
  SerialNumber: number;
  Email_ID: string;
  Panel: string;
  SMTP_Type: number;              // 0=IP, 1=domain
  SMTP_IP: string;                // "192.168.1.1"
  SMTP_Domain: string;            // 40 bytes
  SMTP_Port: number;
  Email_Address: string;          // 60 bytes
  User_Name: string;              // 60 bytes
  Password: string;               // 20 bytes
  Secure_Connection_Type: number; // 0=NULL, 1=SSL, 2=TLS
  To1_Addr: string;               // 60 bytes
  To2_Addr: string;               // 60 bytes
  Error_Code: number;
  Status: string;
}

// MONITORDATA Table
export interface MonitorData {
  MonitorId?: number;
  SerialNumber: number;
  Monitor_ID: string;
  Switch_Node: string;
  Monitor_Label: string;
  Monitor_Value: string;
  Auto_Manual: string;
  Status: string;
  Units: string;
  Monitor_Type: string;
  TimeStamp: string;
  Range_Field: string;
  Calibration: string;
}
