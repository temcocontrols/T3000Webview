# T3000 WebView Project - Change Log

## 2025-08-03 - WebView Cache Issue Investigation

### Problem
- T3000 auto-update doesn't refresh WebView content
- Manual refresh works, auto-update doesn't
- New WebView files copied to `T3000\ResourceFile\webview\www` but not reflected

### Investigation Results
- ✅ **Root cause identified**: T3000 C++ code doesn't clear WebView2 cache during auto-update
- ✅ **WebView application working correctly**: No changes needed
- ✅ **Cache clearing solution found**: T3000 already has working cache clearing code in `MainFrm.cpp`

### Solution (T3000 C++ Changes Required)
**Location**: T3000 Building Automation System C++ source
**Fix**: Add cache clearing to T3000's webview file update process
**Method**: Use existing `DeleteDirectory(appDataMyAppPath + "\\EBWebView")` function

### Files Created/Modified
- ✅ `scripts/link-t3000-source.bat` - Direct access to T3000 C++ source
- ✅ `T3000_CPP_Source/` - Symbolic link to T3000 source code
- ✅ `docs/bugs/001-webview-cache-not-cleared.md` - Bug tracking

### Files Removed (Not Needed for This Issue)
- ❌ Source browser components (direct access via symbolic link)
- ❌ Complex integration libraries (issue is in T3000, not WebView)
- ❌ Analysis documents (moved to bug tracking)
- ❌ WebView integration utilities (not needed for this issue)
- ❌ Custom Vite configurations (cache busting not needed on WebView side)
- ❌ Deployment and testing scripts (issue is in T3000, not deployment)
- ❌ Cache management code (the WebView app works fine as-is)### Status
- **Analysis**: COMPLETE ✅
- **WebView changes**: NOT NEEDED ✅
- **T3000 C++ fix**: PENDING (add cache clearing to update process)
- **Testing**: PENDING (after T3000 fix implementation)

### Project Status
- **WebView Application**: Working perfectly, no changes needed
- **Root Cause**: Confirmed in T3000 C++ update process
- **Solution**: Simple one-line addition to T3000 code

### Next Steps
1. Modify T3000 C++ update process to clear WebView cache
2. Build and test T3000 with cache clearing
3. Verify auto-update refreshes WebView content
