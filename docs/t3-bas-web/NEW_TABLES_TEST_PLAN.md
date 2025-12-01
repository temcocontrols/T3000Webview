# New Tables Testing Plan
**Date**: 2025-11-27
**Goal**: Identify which new table causes DLL initialization failure (missing logs)

## Test Strategy
Add ONE table at a time, rebuild, test logs. Mark ✅ if logs appear, ❌ if logs stop.

## Baseline (Working State)
- [ ] Step 0: ALL new tables disabled → **TEST FIRST** (should have logs)

## New Tables to Test (Add one by one)

### Arrays Table
- [ ] Step 1: Enable `arrays_update_routes` only
- [ ] Step 2: Enable `arrays_refresh_routes` only
- [ ] Step 3: Enable BOTH arrays routes

### Tables Table
- [ ] Step 4: Enable `tables_update_routes` only
- [ ] Step 5: Enable `tables_refresh_routes` only
- [ ] Step 6: Enable BOTH tables routes

### Users Table
- [ ] Step 7: Enable `users_update_routes` only
- [ ] Step 8: Enable `users_refresh_routes` only
- [ ] Step 9: Enable BOTH users routes

### Custom Units Table
- [ ] Step 10: Enable `custom_units_update_routes` only
- [ ] Step 11: Enable `custom_units_refresh_routes` only
- [ ] Step 12: Enable BOTH custom_units routes

### Settings Routes (Complex)
- [ ] Step 13: Enable `settings_routes` (network, communication, protocol, time, etc.)

### Specialized Routes (Complex)
- [ ] Step 14: Enable `specialized_routes` (remote_points, email_alarms, etc.)

## Test Procedure for Each Step
1. Edit `routes.rs` - uncomment ONE route merge
2. Run: `cargo build --release --target i686-pc-windows-msvc`
3. Close T3000.exe
4. Copy DLL: `Copy-Item "d:\1025\github\temcocontrols\T3000Webview7\api\target\i686-pc-windows-msvc\release\t3_webview_api.dll" "D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\t3_webview_api.dll" -Force`
5. Start T3000.exe
6. Check for logs: `Get-ChildItem "D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\T3WebLog\2025-11\1127" -Filter "*CppMsg*" | Select-Object Name, Length, LastWriteTime`
7. If logs appear (>1KB): ✅ PASS - Keep enabled, continue to next
8. If logs stop (<500 bytes): ❌ FAIL - This route has the issue, disable it

## Results
(To be filled during testing)

## Current Status
**Phase**: Baseline test (Step 0) - ALL new tables disabled
**Next**: Build and verify logs work
