use sea_orm::{Database, DbErr, ConnectionTrait};
use std::fs;

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    // Connect to the SQLite database
    let db = Database::connect("sqlite://Database/t3_device.db").await?;

    // Read the SQL file
    let sql_content = fs::read_to_string("create_t3_device_db.sql")
        .expect("Failed to read SQL file");

    // Split by semicolons and execute each statement
    for statement in sql_content.split(';') {
        let statement = statement.trim();
        if !statement.is_empty() {
            match db.execute_unprepared(statement).await {
                Ok(_) => println!("Executed: {}", &statement[..50.min(statement.len())]),
                Err(e) => println!("Error executing statement: {}\nStatement: {}", e, statement),
            }
        }
    }

    println!("T3000 Device Database created successfully!");
    Ok(())
}
