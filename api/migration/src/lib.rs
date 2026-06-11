pub use sea_orm_migration::prelude::*;

mod m20240401_215840_create_tables;
mod m20240404_213650_update_tables;
mod m20240418_145628_add_devices_table;
mod m20240519_114859_update_files_table;
mod m20251222_add_lcd_options;
mod m20260403_add_raw_calibration_fields;
mod m20260521_add_flow_log_tables;
mod m20260529_add_trendlog_point_sets_table;
mod m20260604_add_backend_and_registry_tables;
mod m20260604_add_app_log_table;
mod m20260607_add_haystack_v2;
mod m20260607_remove_haystack_v1;
mod m20260611_add_device_online_status;

/// Migrator for webview_database.db (users, files, app config, LCD options)
pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20240401_215840_create_tables::Migration),
            Box::new(m20240404_213650_update_tables::Migration),
            Box::new(m20240418_145628_add_devices_table::Migration),
            Box::new(m20240519_114859_update_files_table::Migration),
            Box::new(m20251222_add_lcd_options::Migration),
        ]
    }
}

/// Migrator for webview_t3_device.db (DEVICES, INPUTS, OUTPUTS, VARIABLES, etc.)
pub struct T3DeviceMigrator;

#[async_trait::async_trait]
impl MigratorTrait for T3DeviceMigrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260403_add_raw_calibration_fields::Migration),
            Box::new(m20260521_add_flow_log_tables::Migration),
            Box::new(m20260529_add_trendlog_point_sets_table::Migration),
            Box::new(m20260604_add_backend_and_registry_tables::Migration),
            Box::new(m20260604_add_app_log_table::Migration),
            Box::new(m20260607_add_haystack_v2::Migration),
            Box::new(m20260607_remove_haystack_v1::Migration),
            Box::new(m20260611_add_device_online_status::Migration),
        ]
    }
}
