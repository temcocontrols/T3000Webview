pub mod routes;
pub mod services;
pub mod t3000_main_service;      // ✅ MAIN T3000 SERVICE - Primary T3000 integration service
pub mod websocket_handler;
// pub mod database_bridge_service; // ✅ AVAILABLE - T3000 C++ DB → Rust DB bridge (not called by default)
// pub mod t3000_ffi_service;     // ✅ AVAILABLE - T3000 FFI bindings and device discovery (not called by default)
// pub mod realtime_data_service; // ✅ AVAILABLE - Real-time data collection with broadcast channels (not called by default)
// pub mod trend_collector;       // Temporarily disabled - needs field name updates
// pub mod trend_routes;          // Temporarily disabled - needs field name updates
// pub mod t3000_ffi;             // Temporarily disabled - has unresolved externals
