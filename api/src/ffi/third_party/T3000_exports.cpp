// T3000 FFI Bridge (dynamic resolver shim)
// Replaces a static import with runtime lookup to avoid link-time dependency on the
// MFC/T3000 binary. Exports a stable function for Rust to call which forwards to the
// real `T3000_RealHandleWebViewMsg_CPP` when available in the host process or
// in `T3000Controls.dll`.

#include <windows.h>
#include <atomic>
#include <mutex>
#include <cstdint>
#include <cstring>

#include "T3000_exports.h"

using RealFn = int(__cdecl*)(int, char*, int);
using BridgeFn = int(__cdecl*)(const char*, char*, int, int);

static std::atomic<RealFn> g_real_fn{nullptr};
static std::atomic<BridgeFn> g_bridge_fn{nullptr};
static std::once_flag g_resolve_once;

static void shim_log(const char* msg) {
    // Always append resolver messages to a T3WebLog folder located next to the host executable.
    // This avoids relying on environment variables or %TEMP% and keeps logs with the app.
    char exePath[MAX_PATH+1] = {0};
    if (!GetModuleFileNameA(NULL, exePath, MAX_PATH)) {
        // fallback to temp if we cannot determine exe path
        if (!GetTempPathA(MAX_PATH, exePath)) return;
        // remove trailing backslash if present
        size_t len = strlen(exePath);
        if (len > 0 && (exePath[len-1] == '\\' || exePath[len-1] == '/')) exePath[len-1] = '\0';
    } else {
        // strip filename to get directory
        char* last = strrchr(exePath, '\\');
        if (last) *last = '\0';
    }

    char logDir[MAX_PATH+1] = {0};
    strcpy_s(logDir, exePath);
    // Ensure we append backslash only once
    size_t ldlen = strlen(logDir);
    if (ldlen > 0 && logDir[ldlen-1] != '\\') strcat_s(logDir, "\\");
    strcat_s(logDir, "T3WebLog");

    // Create directory if it doesn't exist (silent if it does)
    CreateDirectoryA(logDir, NULL);

    char logPath[MAX_PATH+1] = {0};
    strcpy_s(logPath, logDir);
    strcat_s(logPath, "\\t3_shim_resolver.log");

    HANDLE h = CreateFileA(logPath, FILE_APPEND_DATA, FILE_SHARE_READ, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (h == INVALID_HANDLE_VALUE) return;
    DWORD wrote = 0;
    SYSTEMTIME st;
    GetLocalTime(&st);
    char buf[1024];
    int n = _snprintf_s(buf, sizeof(buf), _TRUNCATE, "%04d-%02d-%02d %02d:%02d:%02d.%03d - %s\r\n",
        st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond, st.wMilliseconds, msg ? msg : "");
    WriteFile(h, buf, (DWORD)strlen(buf), &wrote, NULL);
    CloseHandle(h);
}

static void resolve_real_fn() {
    const char* symbol_names[] = {
        "T3_Bridge_HandleWebViewMsg_C", // prefer our non-invasive bridge when present
        "T3000_RealHandleWebViewMsg_CPP",
        "HandleWebViewMsg_C",
        "HandleWebViewMsg",
        NULL
    };

    auto try_get_real = [&](HMODULE hmod) -> RealFn {
        if (!hmod) return nullptr;
        for (const char** p = symbol_names; *p; ++p) {
            if (strcmp(*p, "T3_Bridge_HandleWebViewMsg_C") == 0) continue; // Skip bridge function for real function search

            FARPROC pfn = GetProcAddress(hmod, *p);
            if (pfn) {
                char buf[256];
                _snprintf_s(buf, sizeof(buf), _TRUNCATE, "Found real symbol %s in module 0x%p", *p, (void*)hmod);
                shim_log(buf);
                return reinterpret_cast<RealFn>(pfn);
            } else {
                char buf[256];
                _snprintf_s(buf, sizeof(buf), _TRUNCATE, "Lookup failed for %s in module 0x%p", *p, (void*)hmod);
                shim_log(buf);
            }
        }
        return nullptr;
    };

    auto try_get_bridge = [&](HMODULE hmod) -> BridgeFn {
        if (!hmod) return nullptr;
        FARPROC pfn = GetProcAddress(hmod, "T3_Bridge_HandleWebViewMsg_C");
        if (pfn) {
            char buf[256];
            _snprintf_s(buf, sizeof(buf), _TRUNCATE, "Found bridge symbol T3_Bridge_HandleWebViewMsg_C in module 0x%p", (void*)hmod);
            shim_log(buf);
            return reinterpret_cast<BridgeFn>(pfn);
        } else {
            char buf[256];
            _snprintf_s(buf, sizeof(buf), _TRUNCATE, "Lookup failed for T3_Bridge_HandleWebViewMsg_C in module 0x%p", (void*)hmod);
            shim_log(buf);
        }
        return nullptr;
    };

    shim_log("Resolver start");

    // First, try to find the bridge function in native modules
    HMODULE h = GetModuleHandleW(nullptr);
    if (h) {
        BridgeFn bridge = try_get_bridge(h);
        if (bridge) {
            g_bridge_fn.store(bridge);
            shim_log("Resolved bridge from host exe");
            return;
        }
    }

    HMODULE h2 = GetModuleHandleW(L"T3000Controls.dll");
    if (h2) {
        BridgeFn bridge2 = try_get_bridge(h2);
        if (bridge2) {
            g_bridge_fn.store(bridge2);
            shim_log("Resolved bridge from T3000Controls.dll");
            return;
        }
    }

    // If no bridge found, try to find real functions
    if (h) {
        RealFn r = try_get_real(h);
        if (r) { g_real_fn.store(r); shim_log("Resolved real from host exe"); return; }
    }

    if (h2) {
        RealFn r2 = try_get_real(h2);
        if (r2) { g_real_fn.store(r2); shim_log("Resolved real from T3000Controls.dll"); return; }
    }

    // Try the running module that loaded this shim (useful when shim is injected)
    HMODULE hself = NULL;
    if (GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS, (LPCWSTR)&resolve_real_fn, &hself)) {
        if (hself) {
            RealFn r3 = try_get_real(hself);
            if (r3) { g_real_fn.store(r3); shim_log("Resolved real from shim module"); return; }
            // do not free hself
        }
    }

    // Not found - leave both as nullptr
    shim_log("Resolver finished without finding a symbol");
}

// Ensure resolver runs as soon as the DLL is loaded so logs appear even if
// the host doesn't call into the shim immediately.
BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    switch (fdwReason) {
        case DLL_PROCESS_ATTACH:
            // run resolver once on attach
            std::call_once(g_resolve_once, resolve_real_fn);
            break;
        case DLL_THREAD_ATTACH:
        case DLL_THREAD_DETACH:
        case DLL_PROCESS_DETACH:
        default:
            break;
    }
    return TRUE;
}

// Exported helper to force the resolver and create a log entry. Call this
// from a test harness or from the host to force immediate resolver activity.
extern "C" __declspec(dllexport) int T3_ForceResolverAndLog() {
    shim_log("T3_ForceResolverAndLog: called");
    std::call_once(g_resolve_once, resolve_real_fn);
    shim_log("T3_ForceResolverAndLog: resolver invoked");
    return g_real_fn.load() ? 1 : 0;
}

// Stable exported function Rust will call. It first lazily resolves the real
// function and then forwards the call. Returns -1 if function not available or
// if the real function indicates failure.
extern "C" __declspec(dllexport) int T3_CallRealHandleWebViewMsg(int action, char* msg, int iLen) {
    std::call_once(g_resolve_once, resolve_real_fn);

    // Prefer bridge function if available
    BridgeFn bridge_fn = g_bridge_fn.load();
    if (bridge_fn) {
        shim_log("T3_CallRealHandleWebViewMsg: using bridge function");
        return bridge_fn(msg, msg, iLen, action);
    }

    // Fallback to real function
    RealFn fn = g_real_fn.load();
    if (!fn) {
        shim_log("T3_CallRealHandleWebViewMsg: no function available");
        // Signal missing bridge to caller. Caller may then retry later.
        return -1;
    }

    // Forward call
    shim_log("T3_CallRealHandleWebViewMsg: using real function");
    return fn(action, msg, iLen);
}

// Keep HandleWebViewMsg symbol for compatibility; forward to T3_CallRealHandleWebViewMsg.
extern "C" __declspec(dllexport) int HandleWebViewMsg(int action, char* msg, int iLen) {
    return T3_CallRealHandleWebViewMsg(action, msg, iLen);
}

// Export the preferred bridge symbol directly from the shim as a fallback.
// This allows the resolver to find it in the shim module itself if the native
// module hasn't been rebuilt yet. The implementation calls the fallback bridge.
extern "C" __declspec(dllexport) int T3_Bridge_HandleWebViewMsg_C(const char* in_utf8, char* out_utf8, int out_len, int msg_source) {
    shim_log("T3_Bridge_HandleWebViewMsg_C: called from shim fallback");

    // Convert to the signature expected by T3_CallRealHandleWebViewMsg
    // For now, treat in_utf8 as the input message and copy to out_utf8
    if (!in_utf8 || !out_utf8 || out_len <= 0) {
        shim_log("T3_Bridge_HandleWebViewMsg_C: invalid parameters");
        return -1;
    }

    // Try to use the resolver to find a real function first
    std::call_once(g_resolve_once, resolve_real_fn);
    RealFn fn = g_real_fn.load();

    if (fn) {
        // Forward to the resolved real function
        shim_log("T3_Bridge_HandleWebViewMsg_C: forwarding to resolved function");
        // Convert the msg_source to action parameter
        return fn(msg_source, const_cast<char*>(in_utf8), out_len);
    }

    // Fallback: return the BRIDGE_NOT_LINKED diagnostic
    shim_log("T3_Bridge_HandleWebViewMsg_C: no real function found, returning fallback");
    const char* diagnostic_response =
        "{"
        "\"action\": \"LOGGING_DATA_RES\","
        "\"status\": \"BRIDGE_NOT_LINKED\","
        "\"message\": \"MFC bridge HandleWebViewMsg_C not available; returning diagnostic from shim fallback\""
        "}";

    size_t result_len = strlen(diagnostic_response);
    if (result_len + 1 <= (size_t)out_len) {
        strcpy(out_utf8, diagnostic_response);
        return 0;
    }

    // Buffer too small
    return -1;
}

// Provide a helper to check availability without performing a call.
extern "C" __declspec(dllexport) int T3_IsRealHandleAvailable() {
    std::call_once(g_resolve_once, resolve_real_fn);
    return (g_bridge_fn.load() || g_real_fn.load()) ? 1 : 0;
}

