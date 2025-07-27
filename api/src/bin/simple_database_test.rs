use anyhow::Result;
use t3_webview_api::data_management::simple_test;

#[tokio::main]
async fn main() -> Result<()> {
    println!("🚀 T3000 Database Integration Test");
    println!("==================================\n");

    // Run the simple database test
    match simple_test::run_simple_database_test().await {
        Ok(_) => {
            println!("\n🎉 SUCCESS: Database system is working correctly!");
            println!("✅ Ready for T3000 hardware integration");
            Ok(())
        }
        Err(e) => {
            println!("\n❌ FAILED: Database test failed: {}", e);
            std::process::exit(1);
        }
    }
}
