/**
 * Alarm types
 */

import { BACnetObjectType } from './bacnet';

// Alarm priority (1 = highest, 16 = lowest)
export type AlarmPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

// Alarm event type
export enum AlarmEventType {
  ChangeOfValue = 'change-of-value',
  ChangeOfState = 'change-of-state',
  OutOfRange = 'out-of-range',
  FloatingLimit = 'floating-limit',
  CommandFailure = 'command-failure',
  BufferReady = 'buffer-ready',
  UnsignedRange = 'unsigned-range',
  Extended = 'extended',
}

// Alarm state
export enum AlarmState {
  Normal = 'normal',
  Fault = 'fault',
  Offnormal = 'offnormal',
  HighLimit = 'high-limit',
  LowLimit = 'low-limit',
}

// Alarm status
export enum AlarmStatus {
  Active = 'active',
  Acknowledged = 'acknowledged',
  Cleared = 'cleared',
}

// Alarm record
export interface AlarmRecord {
  id: string;
  timestamp: Date;
  deviceId: string;
  deviceName: string;
  objectId: number;
  objectName: string;
  objectType: BACnetObjectType;
  eventType: AlarmEventType;
  eventState: AlarmState;
  status: AlarmStatus;
  priority: AlarmPriority;
  message: string;
  value?: number | boolean | string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  clearedAt?: Date;
  notificationClass?: number;
}

// Alarm filter
export interface AlarmFilter {
  deviceIds?: string[];
  eventTypes?: AlarmEventType[];
  eventStates?: AlarmState[];
  statuses?: AlarmStatus[];
  priorities?: AlarmPriority[];
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
}

// Alarm configuration
export interface AlarmConfiguration {
  id: number;
  objectId: number;
  objectName: string;
  enabled: boolean;
  eventType: AlarmEventType;
  highLimit?: number;
  lowLimit?: number;
  deadband?: number;
  timeDelay?: number;          // seconds
  notificationClass: number;
  recipients: string[];        // Email addresses or notification targets
  actions?: AlarmAction[];
}

// Alarm action
export interface AlarmAction {
  type: 'email' | 'sms' | 'webhook' | 'command';
  config: Record<string, any>;
  enabled: boolean;
}

// Alarm summary
export interface AlarmSummary {
  totalCount: number;
  activeCount: number;
  acknowledgedCount: number;
  clearedCount: number;
  byPriority: Record<AlarmPriority, number>;
  byState: Record<AlarmState, number>;
}
