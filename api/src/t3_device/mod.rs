pub mod routes;
pub mod services;
pub mod constants;              // ✅ T3000 Constants for TRENDLOG_DATA fields (DataSource, CreatedBy)
pub mod points_service;         // ✅ T3000 Points Management Service (input, output, variable points)
pub mod schedules_service;      // ✅ T3000 Schedules Management Service
pub mod programs_service;       // ✅ T3000 Programs Management Service
pub mod trendlogs_service;      // ✅ T3000 Trendlogs Management Service
pub mod trendlog_ffi_service;   // ✅ T3000 TrendLog FFI Service for complete info retrieval
pub mod trendlog_monitor_service; // ✅ Lightweight service for new C++ trendlog export functions
pub mod trendlog_monitor_routes; // ✅ API routes for new C++ trendlog export functions
// pub mod ffi_test_helper;     // ⚠️  Moved to tests/ - FFI diagnostic endpoints (used by public/ffi-test.html)
pub mod trendlog_enhanced_routes; // ✅ T3000 TrendLog Enhanced API Routes for FFI and view management
pub mod trendlog_data_service;  // ✅ T3000 TrendLog Historical Data Service (TRENDLOG_DATA table)
pub mod t3_ffi_sync_service;  // ✅ MAIN T3000 SERVICE - Primary T3000 FFI & Sync integration service (collects ALL data)
pub mod t3_ffi_api_service;     // ✅ T3000 FFI API Service - HTTP API endpoints with FFI integration (same JSON as WebSocket)
pub mod trendlog_webmsg_service; // ✅ T3000 TrendLog via HandleWebViewMsg (working approach instead of direct FFI)
pub mod trendlog_webmsg_routes;  // ✅ T3000 TrendLog WebMsg API Routes (working HandleWebViewMsg endpoints)
pub mod websocket_handler;
