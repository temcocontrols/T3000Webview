# Bug #001: T3000 WebView Cache Not Cleared During Auto-Update

**Status**: IDENTIFIED - Fix Required in T3000 C++ Code
**Priority**: High
**Component**: T3000 Building Automation System (C++)
**Affected WebView**: No changes needed

## Problem Description

When T3000 performs an auto-update that copies new WebView files to `T3000\ResourceFile\webview\www`, the WebView2 control continues to serve cached content instead of the updated files. Manual refresh works, but auto-update doesn't.

## Root Cause Analysis

**Location**: T3000 C++ source code (accessible via `T3000_CPP_Source/` symbolic link)

**Issue**: T3000's auto-update process copies files but doesn't clear WebView2 cache.

**Evidence**: In `T3000_CPP_Source/T3000/MainFrm.cpp` line 16186, the `OnWebviewModbusregister()` function already has working cache clearing code:

```cpp
void CMainFrame::OnWebviewModbusregister()
{
    // Clear WebView cache BEFORE opening WebView
    CString appDataMyAppPath = GetUserAppDataPath(_T("T3000"));
    appDataMyAppPath = appDataMyAppPath + _T("\\EBWebView");
    DeleteDirectory(appDataMyAppPath);  // <-- This works!

    // ... rest of WebView initialization
}
```

**Cache Location**: `%LOCALAPPDATA%\T3000\EBWebView\`

## Solution (T3000 C++ Code Changes Required)

### Step 1: Locate T3000 Update Function
Find the function in T3000 that copies WebView files to `ResourceFile\webview\www`

### Step 2: Add Cache Clearing
Add this code before and/or after the file copy operation:

```cpp
// Clear WebView cache to force refresh of updated files
void ClearWebViewCache()
{
    CString appDataMyAppPath = GetUserAppDataPath(_T("T3000"));
    appDataMyAppPath = appDataMyAppPath + _T("\\EBWebView");
    DeleteDirectory(appDataMyAppPath);
}
```

### Step 3: Integration Points
Possible locations to add the cache clearing:
- `T3000UpdateDlg.cpp` - In the download/update process
- File deployment function that copies to `ResourceFile\webview\www`
- After restart when T3000 detects updated WebView files

## Testing Plan

1. **Build T3000** with cache clearing modification
2. **Deploy updated WebView files** to test environment
3. **Run T3000 auto-update** process
4. **Verify** WebView shows new content immediately (no manual refresh needed)

## Timeline

- **Analysis Completed**: August 3, 2025
- **Fix Implementation**: Pending T3000 C++ code modification
- **Testing**: After T3000 build with fix

## Related Files

**T3000 C++ Source** (via `T3000_CPP_Source/`):
- `T3000/MainFrm.cpp` - Contains working cache clearing example
- `T3000/T3000UpdateDlg.cpp` - Update dialog (potential integration point)
- `T3000/BacnetWebView.cpp` - WebView2 management
- `T3000/ResourceFile/webview/www/` - Deployment target

**WebView Project** (no changes needed):
- Cache busting already implemented in `quasar.config.js`
- WebView application working correctly as-is

## Notes

- ✅ WebView application working correctly
- ✅ Cache clearing mechanism proven to work in T3000
- ❌ Cache clearing not integrated into T3000 update process
- 🎯 **Focus**: Modify T3000 C++ update process only
