use sea_orm_migration::prelude::*;

// Import all trendlog migrations
mod m20250807_000000_create_trendlog_schema;

pub struct TrendlogMigrator;

#[async_trait::async_trait]
impl MigratorTrait for TrendlogMigrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250807_000000_create_trendlog_schema::Migration),
        ]
    }
}

// Re-export the migrations for use in other modules
pub use m20250807_000000_create_trendlog_schema::Migration as CreateTrendlogSchema;
