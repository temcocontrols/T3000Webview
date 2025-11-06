

export interface EventFormState {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  group?: string;
  flagText: string;
  startFlag: number;
  endFlag: number;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  group?: string;
  flagText: string;
  startFlag: number;
  endFlag: number;
}
