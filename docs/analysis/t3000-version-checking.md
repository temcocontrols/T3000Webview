# T3000 Version Checking Mechanism

## Overview
T3000 uses a multi-layered version checking system that compares local and remote versions through INI files and FTP connections. Understanding this mechanism is essential for manually testing the WebView cache clearing integration.

## Version Checking Components

### 1. Local Version Storage
- **File**: `CheckVersionPath.ini` (created in T3000 folder)
- **Key Sections**:
  - `[LastUpdateTime]` - Tracks when each product was last updated
  - `[Version]` - Stores current T3000 version number
- **Location**: Dynamically created at runtime in T3000 installation folder

### 2. Version Variables
```cpp
// From T3000.cpp
int T3000_Version = g_versionNO;  // Current T3000 version

// From UpdateDlg.cpp
int PC_T3000_Version = 0;         // Local version from INI
int T3000_FTP_Version = 0;        // Remote version from server
```

### 3. Version Checking Functions

#### CheckForUpdate() - Primary Version Check
**Location**: `global_function.cpp:8369`
- Connects to FTP server at temcocontrols.com
- Downloads version information file
- Compares current vs latest versions
- Returns TRUE if update available

#### Update Detection Process
**Location**: `Dowmloadfile.cpp:1146`
```cpp
local_version_date = GetPrivateProfileInt(_T("LastUpdateTime"), str_product_section, 0, CheckVersionIniFilePath);
```

## Manual Testing Triggers

### Method 1: Delete Version INI File
1. Navigate to T3000 installation folder
2. Delete `CheckVersionPath.ini` file (if it exists)
3. Start T3000 - this will force version check

### Method 2: Modify Version Numbers
1. Locate `CheckVersionPath.ini` in T3000 folder
2. Edit `[Version]` section:
   ```ini
   [Version]
   T3000=0
   ```
3. This forces T3000 to think it's version 0, triggering update

### Method 3: Clear LastUpdateTime
1. Edit `CheckVersionPath.ini`
2. Set or clear `[LastUpdateTime]` entries:
   ```ini
   [LastUpdateTime]
   T3000=0
   ```

### Method 4: Use Update Dialog Directly
- Menu: Help → Check for Updates
- This triggers `T3000UpdateDlg.cpp` which calls `CheckForUpdate()`

## Version Comparison Logic

### Update Detection Conditions
From `UpdateDlg.cpp:552`:
```cpp
if ((PC_T3000_Version < T3000_FTP_Version) || (PC_T3000_Version == 0))
{
    // Update available
}
```

### Update Trigger Events
1. **Version number mismatch**: Local < Remote
2. **Zero version**: Local version = 0 (fresh install)
3. **Missing INI**: CheckVersionPath.ini doesn't exist
4. **Manual check**: User clicks "Check for Updates"

## Integration with Cache Clearing

### Current Cache Clearing Location
**File**: `MainFrm.cpp` - `OnWebviewModbusregister()`
```cpp
// Working cache clearing code already exists:
CString webviewCachePath = localAppDataPath + _T("\\T3000\\EBWebView");
if (PathFileExists(webviewCachePath))
{
    DeleteDirectory(webviewCachePath);
}
```

### Integration Points for Testing
1. **Automatic Update Process**: Add cache clearing to update download completion
2. **Manual Update Trigger**: Test cache clearing when user manually checks for updates
3. **Version Mismatch Detection**: Clear cache when version change detected

## Testing Workflow

### Step 1: Prepare Test Environment
```bash
# Create backup of current version info
copy "C:\Program Files\T3000\CheckVersionPath.ini" "CheckVersionPath.ini.backup"
```

### Step 2: Force Update Detection
```ini
# Edit CheckVersionPath.ini to force update check
[Version]
T3000=0

[LastUpdateTime]
T3000=0
```

### Step 3: Monitor Cache Clearing
1. Check WebView cache exists: `%LOCALAPPDATA%\T3000\EBWebView\`
2. Trigger update check in T3000
3. Verify cache directory is deleted/recreated
4. Confirm WebView shows updated content

### Step 4: Verify Integration
- Test both automatic and manual update scenarios
- Ensure cache clearing doesn't interfere with normal operation
- Validate WebView refresh works after cache clear

## Implementation Notes

### Cache Clearing Integration Points
1. **Download completion** in `Dowmloadfile.cpp`
2. **Update detection** in `T3000UpdateDlg.cpp`
3. **Version change handling** in update process

### Safety Considerations
- Only clear cache when version actually changes
- Ensure WebView is not active during cache clearing
- Handle cache clearing failures gracefully

## Next Steps for Implementation
1. Add cache clearing call to update process completion
2. Test with version number manipulation methods above
3. Validate cache clearing works in all update scenarios
4. Document final implementation in T3000 source
