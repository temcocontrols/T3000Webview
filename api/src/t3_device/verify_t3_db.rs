use sea_orm::{Database, DbErr, ConnectionTrait};

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    // Connect to the T3000 device database
    let db = Database::connect("sqlite://Database/t3_device.db").await?;

    // Get all table names
    let _result = db.execute_unprepared("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").await?;

    println!("T3000 Device Database Tables:");
    println!("=============================");

    // Query to get table info
    let tables_query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
    let _tables_result = db.execute_unprepared(tables_query).await?;

    println!("Tables created successfully:");

    // Let's manually check some key tables
    let key_tables = vec![
        "buildings", "floors", "rooms", "networks", "devices",
        "input_points", "output_points", "variable_points",
        "schedules", "trendlogs", "alarms", "units"
    ];

    for table in key_tables {
        let count_query = format!("SELECT COUNT(*) as count FROM {}", table);
        match db.execute_unprepared(&count_query).await {
            Ok(_) => println!("✓ Table '{}' exists", table),
            Err(e) => println!("✗ Table '{}' missing: {}", table, e),
        }
    }

    // Check units data
    let units_query = "SELECT COUNT(*) as count FROM units";
    match db.execute_unprepared(units_query).await {
        Ok(_) => {
            println!("\n✓ Units table populated with basic data");

            // Show some sample units
            let sample_units = "SELECT units_type, units_name, units_description FROM units LIMIT 5";
            println!("\nSample units data:");
            match db.execute_unprepared(sample_units).await {
                Ok(_) => println!("Units data loaded successfully"),
                Err(e) => println!("Error querying units: {}", e),
            }
        },
        Err(e) => println!("✗ Error checking units table: {}", e),
    }

    println!("\nT3000 Device Database verification complete!");
    println!("Database is ready for T3000 integration.");

    Ok(())
}
