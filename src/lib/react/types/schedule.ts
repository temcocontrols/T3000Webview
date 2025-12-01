/**
 * Schedule types
 */

// Schedule type
export enum ScheduleType {
  Weekly = 'weekly',
  Annual = 'annual',
  Exception = 'exception',
}

// Day of week
export enum DayOfWeek {
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
  Sunday = 7,
}

// Time value entry
export interface TimeValue {
  time: string;                // HH:MM format
  value: any;                  // Can be number, boolean, string, etc.
}

// Daily schedule
export interface DailySchedule {
  day: DayOfWeek;
  entries: TimeValue[];
}

// Weekly schedule
export interface WeeklySchedule {
  id: number;
  name: string;
  description?: string;
  days: DailySchedule[];
  enabled: boolean;
  effectiveDate?: Date;
  expiryDate?: Date;
}

// Annual routine (holiday schedule)
export interface AnnualRoutine {
  id: number;
  name: string;
  description?: string;
  date: Date;                  // MM-DD format (year-independent)
  recurring: boolean;
  value: any;
  enabled: boolean;
  priority?: number;
}

// Exception schedule
export interface ExceptionSchedule {
  id: number;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  entries: TimeValue[];
  priority: number;
  enabled: boolean;
}

// Schedule calendar event
export interface ScheduleCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  value?: any;
  scheduleType: ScheduleType;
  scheduleId: number;
}

// Schedule validation result
export interface ScheduleValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
