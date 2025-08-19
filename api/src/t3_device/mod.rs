pub mod routes;
pub mod services;
pub mod t3000_main_service;      // ✅ MAIN T3000 SERVICE - Primary T3000 integration service
pub mod websocket_handler;
// pub mod database_bridge_service; // ✅ AVAILABLE - T3000 C++ DB → Rust DB bridge (not called by default)
// pub mod data_collector;        // Temporarily disabled - needs field name updates
// pub mod trend_collector;       // Temporarily disabled - needs field name updates
// pub mod trend_routes;          // Temporarily disabled - needs field name updates
// pub mod t3000_ffi;             // Temporarily disabled - has unresolved externals
