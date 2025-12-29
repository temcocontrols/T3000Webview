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
pub mod trendlog_parent_cache;  // ✅ Parent ID cache for split-table optimization
pub mod migrate_trendlog_split; // ✅ Migration script for TRENDLOG_DATA split-table optimization
pub mod t3_ffi_sync_service;  // ✅ MAIN T3000 SERVICE - Primary T3000 FFI & Sync integration service (collects ALL data)
pub mod t3_ffi_api_service;     // ✅ T3000 FFI API Service - HTTP API endpoints with FFI integration (same JSON as WebSocket)
pub mod trendlog_webmsg_service; // ✅ T3000 TrendLog via HandleWebViewMsg (working approach instead of direct FFI)
pub mod trendlog_webmsg_routes;  // ✅ T3000 TrendLog WebMsg API Routes (working HandleWebViewMsg endpoints)
pub mod websocket_handler;  // 🔥 MOVED EARLY - Must initialize before route modules for proper logging
pub mod input_update_routes;    // ✅ T3000 Input Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod output_update_routes;   // ✅ T3000 Output Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod variable_update_routes; // ✅ T3000 Variable Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod input_batch_routes;     // ✅ T3000 Input Batch Save API Routes (batch update multiple inputs)
pub mod output_batch_routes;    // ✅ T3000 Output Batch Save API Routes (batch update multiple outputs)
pub mod variable_batch_routes;  // ✅ T3000 Variable Batch Save API Routes (batch update multiple variables)
pub mod arrays_update_routes;   // ✅ T3000 Arrays Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod conversion_tables_update_routes;   // ✅ T3000 Conversion Tables Update (renamed from tables)
pub mod users_update_routes;    // ✅ T3000 Users Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod custom_units_update_routes; // ✅ T3000 Custom Units Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod programs_update_routes;     // ✅ T3000 Programs Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod schedules_update_routes;    // ✅ T3000 Schedules Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod holidays_update_routes;     // ✅ T3000 Holidays Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod pid_controllers_update_routes; // ✅ T3000 PID Controllers Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod graphics_update_routes;     // ✅ T3000 Graphics Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod graphics_refresh_routes;    // ✅ T3000 Graphics Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod alarms_update_routes;       // ✅ T3000 Alarms Update API Routes using UPDATE_WEBVIEW_LIST (Action 16)
pub mod settings_routes;            // ✅ T3000 Settings API Routes (network/communication/time/protocol settings)
pub mod specialized_routes;         // ✅ T3000 Specialized Features API Routes (remote points, email alarms, etc.)
pub mod input_refresh_routes;   // ✅ T3000 Input Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod output_refresh_routes;  // ✅ T3000 Output Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod variable_refresh_routes; // ✅ T3000 Variable Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod program_refresh_routes; // ✅ T3000 Program Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod pid_loop_refresh_routes; // ✅ T3000 PID Loop Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod schedule_refresh_routes; // ✅ T3000 Schedule Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod holiday_refresh_routes; // ✅ T3000 Holiday Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod alarm_refresh_routes; // ✅ T3000 Alarm Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod trendlog_refresh_routes; // ✅ T3000 TrendLog Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod arrays_refresh_routes;  // ✅ T3000 Arrays Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod conversion_tables_refresh_routes; // ✅ T3000 Conversion Tables Refresh (renamed from tables)
pub mod users_refresh_routes;   // ✅ T3000 Users Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
pub mod custom_units_refresh_routes; // ✅ T3000 Custom Units Refresh API Routes using GET_WEBVIEW_LIST (Action 17)
