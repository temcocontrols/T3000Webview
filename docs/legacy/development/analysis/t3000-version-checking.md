# T3000 Version Checking Mechanism

## Overview
T3000 uses a multi-layered version checking system that compares local and remote versions through INI files and FTP connections. Understanding this mechanism is essential for manually testing the WebView cache clearing integration.

## Version Checking Components

### 1. Local Version Storage
- **File**: `CheckVersionPath.ini` (**Created dynamically by T3000**)
- **Location**: `{T3000.exe directory}\Database\Firmware\CheckVersionPath.ini`
- **Creation**: File is created when T3000 first checks for updates
- **Key Sections**:
  - `[LastUpdateTime]` - Tracks when each product was last updated
  - `[Version]` - Stores current T3000 version number

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

### Method 1: Force Lower Version Number (RECOMMENDED for Source Builds)
1. Close T3000 completely
2. Navigate to your T3000 build output folder (where T3000.exe is located)
3. Create the Database\Firmware subfolder if it doesn't exist:
   ```cmd
   mkdir "Database\Firmware"
   ```
4. Create `Database\Firmware\CheckVersionPath.ini` file with this content:
   ```ini
   [Version]
   T3000=1

   [LastUpdateTime]
   T3000=0
   ```
5. Start T3000 - this will force it to think it's version 1, triggering update check

**Note**: The file path is: `{Your T3000.exe folder}\Database\Firmware\CheckVersionPath.ini`

### Method 2: Modify Source Code Version (For Development Testing)
**Temporary modification for testing only:**
1. In T3000 source: `T3000.cpp` around line 74
2. Temporarily change:
   ```cpp
   T3000_Version = g_versionNO; // Original
   ```
   To:
   ```cpp
   T3000_Version = 1; // Force low version for testing
   ```
3. Rebuild T3000
4. Run - will always think it's version 1

### Method 3: Delete Version INI File
1. Navigate to T3000 build output folder
2. Delete `CheckVersionPath.ini` file (if it exists)
3. Start T3000 - this will force version check

### Method 4: Simulate Update Process Without Server
**Create a test scenario:**
1. Manually call the cache clearing function
2. Copy WebView files to test deployment
3. Test cache refresh behavior

### Method 5: Use Update Dialog Directly
- Menu: Help → Check for Updates
- This triggers `T3000UpdateDlg.cpp` which calls `CheckForUpdate()`
- **Note**: May show "already latest" for source builds

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

## Testing Workflow for Source Code Builds

### Step 1: Prepare Test Environment
```bash
# Navigate to your T3000 build output directory
cd "D:\1025\github\temcocontrols\T3000_Building_Automation_System\Debug"
# or wherever your built T3000.exe is located

# Create backup if version file exists
copy "CheckVersionPath.ini" "CheckVersionPath.ini.backup" 2>nul
```

### Step 2: Force Update Detection (Choose One Method)

#### Option A: INI File Method (EASIEST)
1. Navigate to your T3000 build folder
2. Create the Database\Firmware subfolder:
   ```cmd
   mkdir "Database\Firmware"
   ```
3. Create `Database\Firmware\CheckVersionPath.ini` with:
   ```ini
   [Version]
   T3000=1

   [LastUpdateTime]
   T3000=0
   ```

#### Option B: Source Code Method (FOR PERMANENT TESTING)
In `T3000.cpp`, temporarily modify:
```cpp
// Find this line (around line 74):
T3000_Version = g_versionNO;

// Change to:
T3000_Version = 1; // Always report version 1 for testing
```
Then rebuild T3000.

### Step 3: Test Cache Clearing Integration
1. **Check WebView cache exists**:
   ```
   dir "%LOCALAPPDATA%\T3000\EBWebView\"
   ```
2. **Make changes to WebView files** in your development:
   - Modify files in `T3000Webview\dist\`
   - Copy to `T3000\ResourceFile\webview\www\`
3. **Trigger update check** in T3000
4. **Verify cache directory** is deleted/recreated during update
5. **Confirm WebView** shows updated content immediately

### Step 4: Direct Cache Testing (Alternative Method)
If you want to test cache clearing without full update process:

1. **Open T3000** and navigate to WebView (Modbus Register screen)
2. **Close T3000**
3. **Manually clear cache**:
   ```cmd
   rmdir /s /q "%LOCALAPPDATA%\T3000\EBWebView"
   ```
4. **Deploy new WebView files** to `T3000\ResourceFile\webview\www\`
5. **Restart T3000** and check WebView - should show new content

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
