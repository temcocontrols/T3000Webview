/**
 * Trendlog Type Definitions
 * Trendlog configuration, inputs, views, and data
 */

// TRENDLOGS Table
export interface Trendlog {
  id?: number;
  SerialNumber: number;
  PanelId: number;
  Trendlog_ID: string;
  Switch_Node: string;
  Trendlog_Label: string;
  Interval_Seconds: number;
  Buffer_Size: number;
  Data_Size_KB: string;
  Auto_Manual: string;
  Status: string;
  ffi_synced: number;             // 0=not synced, 1=synced
  last_ffi_sync: string;
  created_at: string;
  updated_at: string;
}

// TRENDLOG_INPUTS Table
export interface TrendlogInput {
  id?: number;
  SerialNumber: number;
  PanelId: number;
  Trendlog_ID: string;
  Point_Type: string;             // 'INPUT', 'OUTPUT', 'VARIABLE'
  Point_Index: string;
  Point_Panel: string;
  Point_Label: string;
  Status: string;
  view_type: string;              // 'MAIN' or 'VIEW'
  view_number: number | null;     // NULL for MAIN, 2-3 for user views
  is_selected: number;            // 1=selected, 0=not selected
  created_at: string;
  updated_at: string;
}

// TRENDLOG_VIEWS Table
export interface TrendlogView {
  id?: number;
  SerialNumber: number;
  PanelId: number;
  Trendlog_ID: string;
  View_Number: number;            // 2 or 3
  Point_Type: string;
  Point_Index: string;
  Point_Panel: string;
  Point_Label: string;
  is_selected: number;
  created_at: string;
  updated_at: string;
}

// TRENDLOG_DATA Table (Parent - point metadata)
export interface TrendlogData {
  id?: number;
  SerialNumber: number;
  PanelId: number;
  PointId: string;                // e.g., "IN1", "OUT1", "VAR128"
  PointIndex: number;
  PointType: string;
  Digital_Analog: string;
  Range_Field: string;
  Units: string;
  Description: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

// TRENDLOG_DATA_DETAIL Table (Child - time-series values)
export interface TrendlogDataDetail {
  ParentId: number;               // References TRENDLOG_DATA(id)
  Value: string;
  LoggingTime_Fmt: string;        // e.g., "2025-10-28 13:35:49"
}

// TRENDLOG_DATA_SYNC_METADATA Table
export interface TrendlogSyncMetadata {
  id?: number;
  SyncTime_Fmt: string;
  MessageType: string;            // "LOGGING_DATA" or "GET_PANELS_LIST"
  PanelId: number | null;
  SerialNumber: number | null;
  RecordsInserted: number;
  SyncInterval: number;
  Success: number;                // 1=success, 0=failed
  ErrorMessage: string | null;
  CreatedAt: string;
}
