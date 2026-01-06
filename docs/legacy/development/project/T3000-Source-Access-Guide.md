# T3000 WebView Cache Issue - Root Cause & Solution

## ✅ Problem Identified and Resolved

**Issue**: T3000 auto-update copies new WebView files but doesn't refresh browser cache
**Root Cause**: T3000 C++ code missing cache clearing in update process
**Solution**: Add cache clearing to T3000's webview file update function

## 🔗 Direct T3000 Source Access

**T3000 C++ Source**: Now accessible at `T3000_Building_Automation_System_Source/` via symbolic link
**Created by**: `scripts\link-t3000-source.bat`

## 🎯 The Fix (T3000 C++ Code Changes)

### Working Cache Clearing Code Found
In `T3000_Building_Automation_System_Source/T3000/MainFrm.cpp` line 16186:

```cpp
void CMainFrame::OnWebviewModbusregister()
{
    // THIS CODE WORKS - Clear WebView cache before opening
    CString appDataMyAppPath = GetUserAppDataPath(_T("T3000"));
    appDataMyAppPath = appDataMyAppPath + _T("\\EBWebView");
    DeleteDirectory(appDataMyAppPath);  // <-- Cache clearing that works!

    // ... rest of WebView initialization
}
```

### Required Integration
Add the same cache clearing to T3000's webview file update process:

```cpp
// In T3000 update function that copies files to ResourceFile\webview\www
void UpdateWebViewFiles()
{
    // Clear cache BEFORE copying new files
    CString appDataMyAppPath = GetUserAppDataPath(_T("T3000"));
    appDataMyAppPath = appDataMyAppPath + _T("\\EBWebView");
    DeleteDirectory(appDataMyAppPath);

    // Copy new webview files to T3000\ResourceFile\webview\www
    // ... existing file copy code ...

    // Optionally clear cache AFTER copying (belt and suspenders)
    DeleteDirectory(appDataMyAppPath);
}
```

## 📁 Key Files

**T3000 C++ Source** (via `T3000_Building_Automation_System_Source/`):
- `T3000/MainFrm.cpp` - Contains working cache clearing example
- `T3000/T3000UpdateDlg.cpp` - Update dialog (integration point)
- `T3000/ResourceFile/webview/www/` - Deployment target

**Bug Tracking**:
- `docs/bugs/webview2-cache-complete.md` - Complete consolidated documentation
- `docs/bugs/README.md` - Documentation index

**WebView Project** (working correctly):
- Standard Vue.js/Quasar application
- Cache busting in build configuration
- No special WebView integration needed

## 🚀 Status

- ✅ **Analysis Complete**: Root cause identified in T3000 C++ code
- ✅ **Solution Found**: Working cache clearing code exists in T3000
- ✅ **WebView Working**: No changes needed to WebView application
- ⏳ **Pending**: Integrate cache clearing into T3000 update process

## Next Steps

1. **Locate T3000 update function** that copies webview files
2. **Add cache clearing** using proven `DeleteDirectory()` method
3. **Build and test T3000** with the modification
4. **Verify auto-update** now refreshes WebView content

**The fix is simple**: T3000 already knows how to clear the cache - just need to call it during the update process!
