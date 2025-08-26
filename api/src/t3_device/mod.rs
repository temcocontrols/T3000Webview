pub mod routes;
pub mod services;
pub mod points_service;         // ✅ NEW - T3000 Points Management Service (input, output, variable points)
pub mod schedules_service;      // ✅ NEW - T3000 Schedules Management Service
pub mod t3000_ffi_sync_service;  // ✅ MAIN T3000 SERVICE - Primary T3000 FFI & Sync integration service (collects ALL data)
pub mod websocket_handler;
// pub mod database_bridge_service; // ✅ AVAILABLE - T3000 C++ DB → Rust DB bridge (not called by default)
// pub mod t3000_ffi_service;     // ✅ AVAILABLE - T3000 FFI bindings and device discovery (not called by default)
// pub mod realtime_data_service; // ✅ AVAILABLE - Real-time data collection with broadcast channels (not called by default)
// pub mod trendlog_api_service;  // ✅ AVAILABLE - TrendLog API layer for data already collected by main service (not called by default)
// pub mod trendlog_http_routes;  // ✅ AVAILABLE - HTTP/WebSocket endpoints for trendlog queries (not called by default)
// pub mod t3000_ffi;             // Temporarily disabled - has unresolved externals (C++ functions not linked)
