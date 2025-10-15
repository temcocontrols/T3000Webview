pub mod routes;
pub mod services;
pub mod points_service;         // ✅ NEW - T3000 Points Management Service (input, output, variable points)
pub mod schedules_service;      // ✅ NEW - T3000 Schedules Management Service
pub mod programs_service;       // ✅ NEW - T3000 Programs Management Service
pub mod trendlogs_service;      // ✅ NEW - T3000 Trendlogs Management Service
pub mod trendlog_ffi_service;   // ✅ NEW - T3000 TrendLog FFI Service for complete info retrieval
pub mod trendlog_monitor_service; // ✅ NEW - Lightweight service for new C++ trendlog export functions
pub mod trendlog_monitor_routes; // ✅ NEW - API routes for new C++ trendlog export functions
// pub mod trendlog_monitor_integration_test; // ❌ REMOVED - Integration test (was creating demo data)
pub mod ffi_test_helper;        // ✅ NEW - FFI Test Helper for verifying T3000.exe connectivity
pub mod trendlog_enhanced_routes; // ✅ NEW - T3000 TrendLog Enhanced API Routes for FFI and view management
pub mod trendlog_data_service;  // ✅ NEW - T3000 TrendLog Historical Data Service (TRENDLOG_DATA table)
pub mod t3000_ffi_sync_service;  // ✅ MAIN T3000 SERVICE - Primary T3000 FFI & Sync integration service (collects ALL data)
pub mod t3_ffi_api_service;     // ✅ NEW - T3000 FFI API Service - HTTP API endpoints with FFI integration (same JSON as WebSocket)
pub mod trendlog_webmsg_service; // ✅ NEW - T3000 TrendLog via HandleWebViewMsg (working approach instead of direct FFI)
pub mod trendlog_webmsg_routes;  // ✅ NEW - T3000 TrendLog WebMsg API Routes (working HandleWebViewMsg endpoints)
pub mod websocket_handler;
// pub mod database_bridge_service; // ✅ AVAILABLE - T3000 C++ DB → Rust DB bridge (not called by default)
// pub mod t3000_ffi_service;     // ✅ AVAILABLE - T3000 FFI bindings and device discovery (not called by default)
// pub mod realtime_data_service; // ✅ AVAILABLE - Real-time data collection with broadcast channels (not called by default)
// pub mod trendlog_api_service;     // ✅ AVAILABLE - T3000 TrendLog API Service (creates TrendLog records from GET_PANEL_DATA)
// pub mod trendlog_http_routes;  // ✅ AVAILABLE - HTTP/WebSocket endpoints for trendlog queries (not called by default)
// pub mod t3000_ffi;             // Temporarily disabled - has unresolved externals (C++ functions not linked)
