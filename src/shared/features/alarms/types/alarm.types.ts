/**
 * Shared Alarm Types
 * Used by both Desktop and Mobile versions
 */

export interface Alarm {
  alarm_id: string;
  panel: string;
  message: string;
  time_stamp: string;
  acknowledged: string;
  status: string;
  priority?: string;
  notification_id?: string;
  alarm_state?: string;
  alarm_type?: string;
  source?: string;
  description?: string;
  action_field?: string;
  low_limit?: string;
  high_limit?: string;
}
