/**
 * BACnet data types for T3000 devices
 * Based on BACnet object properties
 */

// BACnet object types
export enum BACnetObjectType {
  AnalogInput = 'analog-input',
  AnalogOutput = 'analog-output',
  AnalogValue = 'analog-value',
  BinaryInput = 'binary-input',
  BinaryOutput = 'binary-output',
  BinaryValue = 'binary-value',
  MultiStateInput = 'multi-state-input',
  MultiStateOutput = 'multi-state-output',
  MultiStateValue = 'multi-state-value',
  Schedule = 'schedule',
  Calendar = 'calendar',
  Program = 'program',
  TrendLog = 'trend-log',
  NotificationClass = 'notification-class',
}

// Point status
export enum PointStatus {
  Normal = 'normal',
  Fault = 'fault',
  Overridden = 'overridden',
  OutOfService = 'out-of-service',
}

// Input point (BACnet Analog/Binary/Multi-State Input)
export interface InputPoint {
  id: number;                  // Object instance
  name: string;
  description?: string;
  objectType: BACnetObjectType;
  presentValue: number | boolean | string;
  units?: string;
  range?: { min: number; max: number };
  calibration?: number;
  filter?: number;
  status: PointStatus;
  lastUpdate?: Date;
  autoManual?: 'auto' | 'manual';
}

// Output point (BACnet Analog/Binary/Multi-State Output)
export interface OutputPoint {
  id: number;
  name: string;
  description?: string;
  objectType: BACnetObjectType;
  presentValue: number | boolean | string;
  units?: string;
  range?: { min: number; max: number };
  relinquishDefault?: number | boolean;
  priority?: number;
  status: PointStatus;
  lastUpdate?: Date;
  autoManual?: 'auto' | 'manual';
}

// Variable point (BACnet Analog/Binary/Multi-State Value)
export interface VariablePoint {
  id: number;
  name: string;
  description?: string;
  objectType: BACnetObjectType;
  presentValue: number | boolean | string;
  units?: string;
  range?: { min: number; max: number };
  status: PointStatus;
  lastUpdate?: Date;
  autoManual?: 'auto' | 'manual';
}

// Program data (BACnet Program object)
export interface ProgramData {
  id: number;
  name: string;
  description?: string;
  programState: 'idle' | 'loading' | 'running' | 'waiting' | 'halted';
  code: string;                // Program source code
  lastModified?: Date;
  errorLine?: number;
  errorMessage?: string;
}

// Schedule data (BACnet Schedule object)
export interface ScheduleData {
  id: number;
  name: string;
  description?: string;
  effectivePeriod: { start: Date; end: Date };
  weeklySchedule: BACnetWeeklySchedule;
  exceptionSchedule?: BACnetExceptionSchedule[];
  presentValue: any;
}

// Weekly schedule (7 days)
export interface BACnetWeeklySchedule {
  monday: BACnetDaySchedule;
  tuesday: BACnetDaySchedule;
  wednesday: BACnetDaySchedule;
  thursday: BACnetDaySchedule;
  friday: BACnetDaySchedule;
  saturday: BACnetDaySchedule;
  sunday: BACnetDaySchedule;
}

// Day schedule (time-value pairs)
export interface BACnetDaySchedule {
  timeValues: Array<{
    time: string;              // HH:MM format
    value: any;
  }>;
}

// Exception schedule (holidays, special events)
export interface BACnetExceptionSchedule {
  date: Date;
  priority: number;
  timeValues: Array<{
    time: string;
    value: any;
  }>;
}

// Trend log data (BACnet Trend Log object)
export interface TrendLogData {
  id: number;
  name: string;
  description?: string;
  enable: boolean;
  recordCount: number;
  totalRecordCount: number;
  logInterval: number;         // seconds
  startTime?: Date;
  stopTime?: Date;
  records: TrendLogRecord[];
}

// Trend log record
export interface TrendLogRecord {
  timestamp: Date;
  value: number;
  status?: PointStatus;
}

// Trend log data point (for charts/graphs)
export type TrendDataPoint = TrendLogRecord;

// Alarm severity levels
export enum AlarmSeverity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Info = 'info',
}

// Alarm status
export enum AlarmStatus {
  Active = 'active',
  Acknowledged = 'acknowledged',
  Cleared = 'cleared',
  Resolved = 'resolved',
}

// Alarm/Event data (BACnet Notification Class)
export interface AlarmData {
  id: number;
  name: string;
  description?: string;
  eventType: string;
  eventState: 'normal' | 'fault' | 'offnormal' | 'high-limit' | 'low-limit';
  timestamp: Date;
  priority: number;
  acknowledged: boolean;
  acknowledgeTime?: Date;
  message?: string;
  sourceObject?: string;
}

// Controller data (PID Loop configuration)
export interface ControllerData {
  id: number;
  name: string;
  description?: string;
  enable: boolean;
  setpoint: number;
  processVariable: number;
  output: number;
  proportionalBand: number;    // P gain
  integralTime: number;        // I time
  derivativeTime: number;      // D time
  action: 'direct' | 'reverse';
  units?: string;
  status: PointStatus;
}

// Graphics/Screen data
export interface GraphicsData {
  id: number;
  name: string;
  description?: string;
  width: number;
  height: number;
  backgroundColor?: string;
  elements: GraphicsElement[];
  lastModified?: Date;
}

// Graphics element
export interface GraphicsElement {
  id: string;
  type: 'text' | 'shape' | 'gauge' | 'value' | 'icon' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
  linkedPoint?: number;        // Link to input/output/variable
}
