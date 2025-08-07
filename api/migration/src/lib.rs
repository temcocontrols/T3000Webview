pub use sea_orm_migration::prelude::*;

mod m20240401_215840_create_tables;
mod m20240404_213650_update_tables;
mod m20240418_145628_add_devices_table;
mod m20240519_114859_update_files_table;

// New T3000 Device Database Migrations
mod m20250807_000001_create_t3_device_database;
mod m20250807_000002_create_schedules_and_trending;
mod m20250807_000003_create_indexes_and_data;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20240401_215840_create_tables::Migration),
            Box::new(m20240404_213650_update_tables::Migration),
            Box::new(m20240418_145628_add_devices_table::Migration),
            Box::new(m20240519_114859_update_files_table::Migration),

            // T3000 Device Database Migrations
            Box::new(m20250807_000001_create_t3_device_database::Migration),
            Box::new(m20250807_000002_create_schedules_and_trending::Migration),
            Box::new(m20250807_000003_create_indexes_and_data::Migration),
        ]
    }
}
