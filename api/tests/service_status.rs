// Simple service status checker
use t3000_webview_api::t3_device::t3000_ffi_sync_service;

#[tokio::main]
async fn main() {
    println!("🔍 T3000 Service Status Check");
    println!("================================");
    
    // Check if the main FFI sync service is running
    let is_running = t3000_ffi_sync_service::is_logging_service_running();
    println!("FFI Sync Service Running: {}", if is_running { "✅ YES" } else { "❌ NO" });
    
    // Try to get service instance
    if let Some(_service) = t3000_ffi_sync_service::get_logging_service() {
        println!("Service Instance: ✅ Available");
        println!("This service automatically inserts trendlog data every 30 seconds");
        println!("Data Source Marker: FFI_SYNC");
        println!("Created By: FFI_SYNC_SERVICE");
    } else {
        println!("Service Instance: ❌ Not initialized");
    }
    
    println!("\n💡 The trendlog data you see is likely from this service!");
}