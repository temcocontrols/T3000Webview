// ============================================================
// Paste these two functions into BacnetWebView.cpp
// right after the closing } of webview_run_server()
// ============================================================

// ------------------------------------------------------------
// REQUIRED: Add this include at top of BacnetWebView.cpp
// #include <winsvc.h>
//
// REQUIRED: Add Advapi32.lib to linker dependencies
// Project Properties -> Linker -> Input -> Additional Dependencies
// ------------------------------------------------------------


// ============================================================
// FUNCTION 1: Run T3Net as a plain process (same as Rust pattern)
// Call from a new thread, same way CreateWebServerThreadfun works
// ============================================================
int run_t3net_process()
{
    std::string exe_dir = get_executable_directory();
    std::string t3net_path = exe_dir + "\\T3Net.exe";

    // Check T3Net.exe exists
    if (GetFileAttributesA(t3net_path.c_str()) == INVALID_FILE_ATTRIBUTES)
    {
        SetPaneString(BAC_SHOW_MISSION_RESULTS, L"T3Net.exe not found");
        return 1;
    }

    STARTUPINFOA si = { 0 };
    PROCESS_INFORMATION pi = { 0 };
    si.cb = sizeof(si);

    if (!CreateProcessA(
        t3net_path.c_str(),   // path to T3Net.exe
        NULL,                  // no extra command line args
        NULL, NULL,            // default security
        FALSE,                 // don't inherit handles
        CREATE_NO_WINDOW,      // no console window popup
        NULL,                  // inherit environment
        exe_dir.c_str(),       // working dir = same folder as T3000.exe
        &si, &pi))
    {
        SetPaneString(BAC_SHOW_MISSION_RESULTS, L"Failed to start T3Net.exe");
        return 1;
    }

    // Don't wait for it — let T3Net run in background
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return 0;
}


// ============================================================
// FUNCTION 2: Install T3Net as Windows Service (checks first)
// then starts it. Requires T3000.exe running as Administrator.
// ============================================================
int install_and_start_t3net_service()
{
    // Step 1: Open Service Control Manager
    SC_HANDLE hSCM = OpenSCManager(NULL, NULL, SC_MANAGER_ALL_ACCESS);
    if (!hSCM)
    {
        SetPaneString(BAC_SHOW_MISSION_RESULTS, L"OpenSCManager failed (need admin?)");
        return 1;
    }

    // Step 2: Check if service already installed
    SC_HANDLE hService = OpenServiceW(hSCM, L"T3Net", SERVICE_QUERY_STATUS | SERVICE_START);
    if (!hService)
    {
        // Service does not exist yet — install it now
        std::string exe_dir = get_executable_directory();
        std::string t3net_path = exe_dir + "\\T3Net.exe";

        if (GetFileAttributesA(t3net_path.c_str()) == INVALID_FILE_ATTRIBUTES)
        {
            CloseServiceHandle(hSCM);
            SetPaneString(BAC_SHOW_MISSION_RESULTS, L"T3Net.exe not found, cannot install service");
            return 1;
        }

        // CreateServiceW needs wide string path
        std::wstring t3net_path_w(t3net_path.begin(), t3net_path.end());

        hService = CreateServiceW(
            hSCM,
            L"T3Net",                     // internal service name
            L"T3000 Web Service",         // display name shown in services.msc
            SERVICE_ALL_ACCESS,
            SERVICE_WIN32_OWN_PROCESS,
            SERVICE_AUTO_START,           // auto-start on Windows boot
            SERVICE_ERROR_NORMAL,
            t3net_path_w.c_str(),         // full path to T3Net.exe
            NULL,                         // no load ordering group
            NULL,                         // no tag identifier
            NULL,                         // no dependencies
            NULL,                         // run as LocalSystem
            NULL);                        // no password

        if (!hService)
        {
            CloseServiceHandle(hSCM);
            SetPaneString(BAC_SHOW_MISSION_RESULTS, L"Failed to create T3Net service");
            return 1;
        }
    }

    // Step 3: Start service if it is currently stopped
    SERVICE_STATUS_PROCESS ssp = { 0 };
    DWORD dwBytesNeeded = 0;
    QueryServiceStatusEx(
        hService,
        SC_STATUS_PROCESS_INFO,
        (LPBYTE)&ssp,
        sizeof(ssp),
        &dwBytesNeeded);

    if (ssp.dwCurrentState == SERVICE_STOPPED)
    {
        StartServiceW(hService, 0, NULL);
    }

    CloseServiceHandle(hService);
    CloseServiceHandle(hSCM);
    return 0;
}


// ============================================================
// HOW TO CALL THEM — add in MainFrm.cpp near line 1189
// alongside the existing Rust thread creation line
// ============================================================

// Option A — run as plain process (T3Net stops when T3000 closes):
//
//   CreateThread(NULL, NULL, [](LPVOID) -> DWORD { run_t3net_process(); return 0; }, NULL, NULL, NULL);

// Option B — install as service (T3Net runs at boot, independent of T3000):
//
//   CreateThread(NULL, NULL, [](LPVOID) -> DWORD { install_and_start_t3net_service(); return 0; }, NULL, NULL, NULL);
