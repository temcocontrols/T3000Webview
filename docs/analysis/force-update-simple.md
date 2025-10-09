# How to Force T3000 Update for Testing

## Update Mechanism Discovered

The "Update T3000" button launches `Update.exe` which performs this version check:

### Version Comparison Logic:
```cpp
// In Update/UpdateDlg.cpp line 552:
if ((PC_T3000_Version < T3000_FTP_Version) || (PC_T3000_Version == 0))
{
    CS_Info.Format(_T("New version available, downloading now."));
    // Proceeds with download
}
else
{
    CS_Info.Format(_T("Your T3000.exe is up-to-date"));
    // Exits without update
}
```

### Version Sources:
- **PC_T3000_Version**: Read from `{T3000 folder}\Database\temp\MonitorIndex.ini` section `[Version]` key `T3000`
- **T3000_FTP_Version**: Downloaded from `temcocontrols.com/ftp/firmware/ProductPath.ini` section `[Version]` key `T3000Version`

## Simple Solution to Force Update

### Method 1: Modify Local Version File
1. Navigate to your T3000 build folder
2. Go to `Database\temp\` subfolder
3. Edit `MonitorIndex.ini` file:
   ```ini
   [Version]
   T3000=1
   ```
4. Click "Update T3000" button - should now show "New version available"

### Method 2: Create Missing INI File
If `MonitorIndex.ini` doesn't exist:
1. Create folder: `{T3000 folder}\Database\temp\`
2. Create file: `MonitorIndex.ini` with content:
   ```ini
   [Version]
   T3000=1
   ```

## Quick Test Commands
```cmd
# Navigate to your T3000.exe directory
mkdir "Database\temp" 2>nul
echo [Version] > "Database\temp\MonitorIndex.ini"
echo T3000=1 >> "Database\temp\MonitorIndex.ini"
```

Then click "Update T3000" button in T3000.

## For Cache Testing
Once you can trigger the update process:
1. Update will download and extract new T3000 files
2. **Add cache clearing code** to Update.exe completion process
3. Test if WebView cache is cleared during T3000 update
4. Verify WebView shows updated content after update

## Key File Locations
- **Local version**: `{T3000.exe}\Database\temp\MonitorIndex.ini`
- **Server version**: `temcocontrols.com/ftp/firmware/ProductPath.ini`
- **Update executable**: `Update.exe` (launched by T3000)

This approach is much simpler than the complex version checking we looked at before!
