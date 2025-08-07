// Simple test to verify dual database functionality
use t3_webview_api::{app_state::app_state, utils::{run_migrations, initialize_trendlog_database, DATABASE_URL, TRENDLOG_DATABASE_URL}};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing dual database setup...");
    println!("Main database URL: {}", *DATABASE_URL);
    println!("Trendlog database URL: {}", *TRENDLOG_DATABASE_URL);

    // Initialize main database
    println!("1. Running main database migrations...");
    run_migrations().await?;
    println!("   ✓ Main database migrations completed");

    // Initialize trendlog database
    println!("2. Initializing trendlog database...");
    initialize_trendlog_database().await?;
    println!("   ✓ Trendlog database initialized");

    // Test dual database connections
    println!("3. Testing dual database connections...");
    let app_state = app_state().await?;

    // Test main database connection
    {
        let _main_conn = app_state.conn.lock().await;
        println!("   ✓ Main database connection established");
    }

    // Test trendlog database connection
    {
        let _trendlog_conn = app_state.trendlog_conn.lock().await;
        println!("   ✓ Trendlog database connection established");
    }

    println!("\n🎉 Dual database setup completed successfully!");
    println!("   • Main database: {}", *DATABASE_URL);
    println!("   • Trendlog database: {}", *TRENDLOG_DATABASE_URL);
    println!("   • Both connections are working and ready for use");

    Ok(())
}
