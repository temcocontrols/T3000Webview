// T3000 Device Database Entities Module - Pure T3000 Structure
pub mod devices;
pub mod alarms;
pub mod graphics;
pub mod holidays;
pub mod input_points;
pub mod monitor_data;
pub mod output_points;
pub mod pid_controllers;
pub mod programs;
pub mod schedules;
pub mod trendlog_data;
pub mod trendlog_data_detail;
pub mod trendlog_data_old;
pub mod trendlog_data_sync_metadata;
pub mod trendlog_inputs;
pub mod trendlog_views;
pub mod trendlogs;
pub mod variable_points;

// Additional Feature Entities (Added November 24, 2025)
pub mod array_points;
pub mod tables;
pub mod custom_units;
pub mod variable_units;
pub mod users;
pub mod remote_points;
pub mod email_alarms;
pub mod extio_devices;
pub mod tstat_schedules;
pub mod graphic_labels;
pub mod msv_data;
pub mod alarm_settings;
pub mod remote_tstat_db;

// Device Settings Entities (Split from Str_Setting_Info)
pub mod network_settings;
pub mod communication_settings;
pub mod protocol_settings;
pub mod time_settings;
pub mod dyndns_settings;
pub mod hardware_info;
pub mod feature_flags;
pub mod wifi_settings;
pub mod misc_settings;

