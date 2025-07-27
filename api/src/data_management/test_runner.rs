use anyhow::Result;

use crate::data_management::database_test;

/// Run comprehensive database system tests
pub async fn run_database_integration_tests() -> Result<()> {
    println!("=".repeat(60));
    println!("   T3000 WEBVIEW API - DATABASE INTEGRATION TESTS");
    println!("=".repeat(60));

    database_test::run_database_tests().await?;

    println!("\n{}", "=".repeat(60));
    println!("   ALL TESTS COMPLETED SUCCESSFULLY! ✅");
    println!("   Database system ready for production use.");
    println!("=".repeat(60));

    Ok(())
}
