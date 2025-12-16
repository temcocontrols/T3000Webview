/**
 * System Type Definitions
 * Application configuration, database management, partitioning
 */

// APPLICATION_CONFIG Table
export interface ApplicationConfig {
  id?: number;
  config_key: string;
  config_value: string;
  config_type: string;            // 'string', 'number', 'boolean', 'json'
  description: string;
  user_id: number | null;
  device_serial: string | null;
  panel_id: number | null;
  is_system: boolean;
  version: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

// APPLICATION_CONFIG_HISTORY Table
export interface ApplicationConfigHistory {
  id?: number;
  config_key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  change_reason: string;
  changed_at: string;
}

// database_partition_config Table
export interface DatabasePartitionConfig {
  id?: number;
  strategy: string;               // 'daily', 'weekly', 'monthly', etc.
  custom_days: number | null;
  custom_months: number | null;
  retention_value: number;
  retention_unit: string;         // 'days', 'weeks', 'months'
  auto_cleanup_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// database_files Table
export interface DatabaseFile {
  id?: number;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  record_count: number;
  partition_identifier: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

// database_partitions Table
export interface DatabasePartition {
  id?: number;
  partition_name: string;
  partition_identifier: string;
  start_date: string;
  end_date: string;
  table_prefix: string;
  record_count: number;
  file_size_bytes: number;
  is_active: boolean;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}
