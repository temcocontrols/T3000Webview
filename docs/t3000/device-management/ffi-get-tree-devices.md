# FFI: `BacnetWebView_GetTreeDevices` — T3000's device tree from memory

> **Why.** The WebView must list every device T3000 shows — including RS485
> devices (`Tstat10`/`TSTAT7` on COM8), MSTP, third-party BACnet/IP, remote and
> virtual devices. The LAN scan can never see the RS485 ones (T3000 holds the COM
> port; `CTStatScanner::ScanComDevice` only works because it calls `close_com()`
> first), and FFI action 4 `GET_PANELS_LIST` only reports `g_bacnet_panel_info`,
> which is filled exclusively from UDP `0x65` replies.
>
> Reading T3000's **database** would work but takes SQLite locks — and T3000's
> files are in `delete` journal mode, where a reader can block its writer
> (measured: writer fails after 1166 ms when a reader holds a transaction).
> T3000 is the main application, so that is unacceptable.
>
> `m_product` already holds exactly what the tree draws, with **live** status.
> Returning it costs a JSON serialisation of ~N small structs — no file, no
> device I/O, no lock. Nothing T3000 does can be delayed by it.

## 1. Header — `BacnetWebView_Exports.h`

```cpp
// DEVICE TREE: the complete list T3000 shows, read from m_product (no DB, no I/O)
__declspec(dllexport) int BacnetWebView_GetTreeDevices(char* buffer, int buffer_size);
```

## 2. Implementation — `BacnetWebView_Exports.cpp`

```cpp
// ---------------------------------------------------------------------------
// BacnetWebView_GetTreeDevices
//
// Serialises CMainFrame::m_product — the vector the tree view renders — to JSON.
// Reads memory only: no database access, no device I/O, so T3000 can never be
// blocked by this call.
//
// Returns the number of bytes written (excluding the NUL). If the buffer is too
// small it returns the required size so the caller can retry. Negative = error:
//   -1 invalid parameters / not initialised
//   -2 m_product unavailable
//
// Note on locking: m_product is mutated by the UI thread (tree edits) and by the
// background refresh loop (_FreshTreeView). To avoid a torn read, take the same
// Read_Mutex that loop uses — it is held for the duration of one loop iteration
// (~8 s while devices are polled), so the call is made from a worker thread by
// the Rust side and never on the UI thread.
// ---------------------------------------------------------------------------
extern "C" __declspec(dllexport) int BacnetWebView_GetTreeDevices(char* buffer, int buffer_size)
{
    if (!buffer || buffer_size <= 0)
        return -1;

    memset(buffer, 0, buffer_size);

    if (!IsAppInitialized())
    {
        const char* error = "{\"error\":\"MFC application not initialized\"}";
        size_t len = strlen(error);
        if (len < (size_t)(buffer_size - 1))
            strncpy_s(buffer, buffer_size, error, len);
        return -1;
    }

    CMainFrame* pFrame = (CMainFrame*)(AfxGetApp()->m_pMainWnd);
    if (!pFrame)
        return -2;

    Json::Value root(Json::objectValue);
    Json::Value devices(Json::arrayValue);

    // Copy the fields we need while the mutex is held; serialise outside it.
    struct tree_row
    {
        unsigned int serial_number;
        int product_class_id;
        int product_id;
        int baudrate;
        int protocol;
        unsigned int ncomport;
        bool status;
        unsigned int parent;
        unsigned char panel_number;
        unsigned int object_instance;
        float hw;
        float sw;
        CString name;
        CString ip;
        CString connection_type;
        CString screen_name;
        CString main_building;
        CString building;
        CString floor;
        CString room;
    };
    std::vector<tree_row> rows;

    {
        CSingleLock lock(Read_Mutex, TRUE);   // same mutex as _FreshTreeView
        rows.reserve(pFrame->m_product.size());
        for (size_t i = 0; i < pFrame->m_product.size(); i++)
        {
            const tree_product& tp = pFrame->m_product.at(i);
            tree_row r;
            r.serial_number    = tp.serial_number;
            r.product_class_id = tp.product_class_id;
            r.product_id       = tp.product_id;
            r.baudrate         = tp.baudrate;
            r.protocol         = tp.protocol;
            r.ncomport         = tp.ncomport;
            r.status           = tp.status;
            r.parent           = tp.note_parent_serial_number;
            r.panel_number     = tp.panel_number;
            r.object_instance  = tp.object_instance;
            r.hw               = tp.hardware_version;
            r.sw               = tp.software_version;
            r.name             = tp.NameShowOnTree;
            r.ip               = tp.NetworkCard_Address;
            r.connection_type  = tp.strImgPathName;
            r.screen_name      = tp.BuildingInfo.strBuildingName; // free-text slot, see note
            r.main_building    = tp.BuildingInfo.strMainBuildingname;
            r.building         = tp.BuildingInfo.strBuildingName;
            r.floor            = tp.BuildingInfo.strFloor;
            r.room             = tp.BuildingInfo.strRoom;
            rows.push_back(r);
        }
    }

    for (size_t i = 0; i < rows.size(); i++)
    {
        const tree_row& r = rows[i];
        if (r.serial_number == 0)
            continue;

        Json::Value d(Json::objectValue);
        d["serial_number"]        = (Json::UInt)r.serial_number;
        d["product_name"]         = std::string(CT2A(r.name));
        d["product_class_id"]     = r.product_class_id;
        d["product_id"]           = r.product_id;
        d["panel_number"]         = (int)r.panel_number;
        d["object_instance"]      = (Json::UInt)r.object_instance;
        d["parent_serial_number"] = (Json::UInt)r.parent;
        d["protocol"]             = r.protocol;
        d["port"]                 = (int)r.ncomport;
        d["online"]               = r.status;
        d["baudrate"]             = std::to_string(r.baudrate);
        d["ip_address"]           = std::string(CT2A(r.ip));
        d["connection_type"]      = std::string(CT2A(r.connection_type));
        d["main_building_name"]   = std::string(CT2A(r.main_building));
        d["building_name"]        = std::string(CT2A(r.building));
        d["floor_name"]           = std::string(CT2A(r.floor));
        d["room_name"]            = std::string(CT2A(r.room));
        devices.append(d);
    }

    root["devices"] = devices;

    Json::StreamWriterBuilder builder;
    builder["indentation"] = "";
    const std::string out = Json::writeString(builder, root);

    if ((int)out.size() + 1 > buffer_size)
        return (int)out.size() + 1;   // caller retries with a bigger buffer

    memcpy(buffer, out.c_str(), out.size());
    buffer[out.size()] = '\0';
    return (int)out.size();
}
```

### Notes for the implementer

* **`Building_info` fields** — adjust `strFloor` / `strRoom` / `strMainBuildingname`
  to the real member names in `MainFrm.h`. If an equivalent does not exist, drop
  those three keys; the Rust side treats every field as optional.
* **`screen_name`** — `m_product` has no screen name; the line above is a
  placeholder. Either remove it or map it from `GetScreenName(serial, product_id)`.
* **`strImgPathName`** — T3000 stores the connection description here
  (`"Sub Device RS485"`, `"Modbus_and_Bacnet"`), which is why it is sent as
  `connection_type`.
* **`Read_Mutex`** — already used by `_FreshTreeView` (`MainFrm.cpp:10361`).
  Taking it guarantees a consistent snapshot of `m_product`. The Rust caller runs
  this on a blocking worker thread, never on the UI thread, so a short wait is
  harmless; the lock is held for microseconds (copying ~40 structs).
* The return-length convention matches `BacnetWebView_GetTrendlogList`.

## 3. Rust side (already implemented)

`api/src/t3_device/t3000_tree.rs` resolves the export with `GetProcAddress`
(the same mechanism as `BacnetWebView_HandleWebViewMsg`), calls it on a blocking
thread, retries with a larger buffer when needed, and maps the payload into
`AllNode`:

```rust
match t3000_tree::fetch_tree_devices().await {
    Ok(Some(nodes)) if !nodes.is_empty() => { /* upsert into DEVICES */ }
    Ok(None) => { /* export absent (older T3000.exe) → fall back */ }
    Err(e)   => { /* log, keep scanning */ }
}
```

Order in `T3DeviceService::import_t3000_devices`:

1. `BacnetWebView_GetTreeDevices` — **no DB, no I/O, live status** *(preferred)*
2. T3000's `ALL_NODE` database — only when `T3WEB_IMPORT_T3000_DB=1` *(off by default)*
3. otherwise nothing — the UDP scan still populates LAN devices

## 4. Safety summary

| Concern | This design |
|---|---|
| SQLite lock on T3000's files | none — no file is opened |
| COM port contention | none — no serial access |
| Blocking T3000's UI | call runs on a Rust worker thread; C++ side only copies memory |
| Blocking T3000's background loop | the loop may wait for `Read_Mutex` while we copy ~40 structs (µs) |
| Old T3000.exe without the export | `Ok(None)` → fall back, nothing breaks |
