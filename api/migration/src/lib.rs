pub use sea_orm_migration::prelude::*;

mod m20240401_215840_create_tables;
mod m20240404_213650_update_tables;
mod m20240418_145628_add_devices_table;
mod m20240519_114859_update_files_table;
mod m20250122_000000_data_management_schema;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20240401_215840_create_tables::Migration),
            Box::new(m20240404_213650_update_tables::Migration),
            Box::new(m20240418_145628_add_devices_table::Migration),
            Box::new(m20240519_114859_update_files_table::Migration),
            Box::new(m20250122_000000_data_management_schema::Migration),
        ]
    }
}
