# LAN Scanner — UDP Device Discovery

Pure Rust async port of the C++ `RefreshNetWorkDeviceListByUDPFunc()`
from `T3000-Source/T3000/global_function.cpp:9796`.

> **The LAN scan is not the primary device source.** Devices on an RS485 bus
> (a `Tstat10`/`TSTAT7` on COM8, the usual "Local View" install) never answer
> a UDP query, and the C++ `GET_PANELS_LIST` bridge (FFI action 4) only reports
> `g_bacnet_panel_info`, which is filled exclusively from UDP replies. Those
> devices come from T3000's own database (`Database/Buildings/<b>/<b>.db` →
> `ALL_NODE`), read read-only with a ~11 ms lock window. The scan then
> *enriches* that list with IPs and liveness for network devices.

## Protocol Overview

T3000 devices listen on **UDP port 1234** for a broadcast query and
respond with device metadata. The scanner broadcasts `[0x64, 0,0,0,0]`
to `255.255.255.255:1234` and collects `0x65` responses from all
devices on reachable subnets.

| Constant | Value | Meaning |
|---|---|---|
| `UPD_BROADCAST_QRY_MSG` | `0x64` (100) | Query command byte |
| `RESPONSE_MSG` | `0x65` (101) | Device response command |
| `RESPONSE_TOTAL_SUB_INFO` | `0x2F` (47) | Sub-device list response |
| `BROADCAST_DEST_PORT` | 1234 | Devices listen here |
| `SCAN_PORT_RANGE` | 57619–57623 | Scanner binds here for replies |

## Architecture

```
api/src/lan_scan/
├── mod.rs          # Module entry, re-exports
├── types.rs        # DiscoveredDevice (20 fields), ScanResult, product_map (130+ entries)
├── protocol.rs     # Constants, build_scan_query(), parse_scan_response(), parse_sub_device_info()
├── scanner.rs      # get_ip_mask_gateway(), scan_network(), scan_on_adapter(), unicast_sweep()
└── tests/lan_scan/ # 18 unit tests + 1 real-network test (ignored)
```

## Response Packet Layout

Each response is interleaved: data byte, reserve byte, data byte, …
Offsets below are indices into the raw buffer.

| Offset | Size | Field | Notes |
|---|---|---|---|
| 0 | 1 | command | `0x65` |
| 4,6,8,10 | 4×u8 | serial_number | Little-endian u32 |
| 12 | 1 | product_id | Maps to product_name via product_map |
| 14 | 1 | modbus_id | |
| 16,18,20,22 | 4×u8 | ip_address | |
| 24–25 | 2 | modbus_port | Big-endian u16 |
| 26–27 | 2 | firmware_version | /10 for products 10,35,50,62,74,88 |
| 28–29 | 2 | hardware_version | |
| 30–33 | 4 | parent_serial | Airlab bug: equal bytes → 0 |
| 34,35,57,58 | 4 | object_instance | |
| 36 | 1 | panel_number | |
| 37–56 | 20 | panel_name | Null-terminated ASCII |
| 59 | 1 | isp_mode | 0=app, 1=bootloader→skip, 2=corrupted→skip |
| 60–61 | 2 | bacnet_ip_port | Big-endian u16 |
| 62 | 1 | hardware_info | |
| 63 | 1 | subnet_protocol | 0→1 mapping, 12→10 for BACnet devices |
| 64 | 1 | command_version | Only if buf.len ≥ 67 |
| 65 | 1 | subnet_port | Only if parent≠0 |
| 66 | 1 | subnet_baudrate | Only if parent≠0 |
| 67 | 1 | minitype | Always at 67 |

## Sub-Device Info (0x2F)

| Offset | Size | Field |
|---|---|---|
| 0 | 1 | command = 0x2F |
| 1 | 1 | device_count |
| 2–5 | 4 | parent_serial (u32 LE) |
| 6–20 | 15 | reserved |
| 21+ | pairs | (status:u8, modbus_id:u8) × device_count |

## Scanning Flow

```
scan_network(timeout_secs)
  ├─ get_ip_mask_gateway() → every IPv4 adapter (IP, mask, gateway)
  │   └─ Windows: GetAdaptersInfo (loopback + APIPA skipped)
  │   └─ Fallback: connect UDP to 8.8.8.8
  └─ For each adapter (all in parallel):
      ├─ bind_scan_port(ip) → binds to ip:57619..57623 (ephemeral fallback)
      ├─ set_broadcast(true)
      ├─ send_to(255.255.255.255:1234, query)
      ├─ send_to(<subnet broadcast>:1234, query)   # e.g. 10.10.10.255
      ├─ recv_loop: 0x65 → parse_scan_response(), 0x2F → sub-device info
      │   ├─ re-broadcast every 250 ms **only while nothing has answered**
      │   └─ at +600 ms with no reply → unicast sweep, inside the same listen
      │       window: <subnet>.1 … <subnet>.254 (254 probes max)
      └─ stop after 500 ms of silence, or at +1.2 s when nothing answers
  └─ Deduplicate by serial_number

scan_all(timeout_secs)
  ├─ serial pass starts first (thread per COM port, in parallel with UDP)
  ├─ UDP pass (above)
  └─ Modbus TCP sub-port pass, one thread per parent gateway
```

### Timing

Every wait ends as soon as the line goes quiet — the parameters below only
bound the "nothing answered" case:

| Constant | Value | Effect |
|---|---|---|
| `QUIET_WINDOW` | 500 ms | Silence after the last reply ends the adapter's scan |
| `RESEND_INTERVAL` / `RESEND_PHASE` | 250 ms / 600 ms | Up to 3 broadcasts, but only until something answers |
| `FIRST_REPLY_WAIT` | 1.2 s | Give-up point when nothing answers at all |
| `SWEEP_AFTER` | 600 ms | Unicast sweep is fired inside the listen window (no extra wait) |
| `TCP_TIMEOUT` (sub-port) | 500 ms | Was 1000 ms; a working gateway answers in tens of ms |

Measured on a 1-device LAN (`cargo test --test lan_scan test_real_full_scan -- --ignored --nocapture`):

| Pass | Before | After |
|---|---|---|
| UDP, device answers broadcast | ~1350 ms | ~650 ms |
| UDP, broadcast blocked (sweep fallback) | ~2750 ms | ~1260 ms |
| Full scan (`scan_all`) | ~12.9 s | ~7.9 s |

### Detached deep pass (`deep: true`)

`POST /api/t3_device/devices/scan-refresh` accepts `deep: true`: the UDP pass
runs and is merged, the response returns immediately with
`"deep_scan": "running"`, and `scan_deep()` (serial COM + TCP sub-ports, ~8 s)
continues in a detached task that upserts into DEVICES when it finishes.

* Only one deep pass runs at a time (`DEEP_SCAN_RUNNING`); a second request is
  ignored instead of fighting over the COM ports.
* The detached pass **never marks devices offline** — it only sees serial and
  sub-port devices, so that decision stays with the UDP pass (page load + the
  5-minute timer).
* `GET /api/t3_device/devices/deep-scan` → `{ running, started_at, found }`; the
  UI polls it every 2 s and re-reads the device list when `running` goes false.
* With `deep: false` (or `mode: "full"`) the old synchronous behaviour is kept
  for callers that need the complete result in one response.

### Why the unicast sweep exists

Broadcast is fragile in three common setups, and all three look identical in
the log — queries go out, zero packets come back:

1. **Windows Firewall** treats the reply to a `255.255.255.255` query as
   unsolicited inbound traffic: it does not match the outbound UDP state, so it
   is dropped unless the executable has an inbound allow rule (the C++ T3000.exe
   normally does; a freshly built Rust binary does not).
2. **Managed switches / Wi-Fi APs** filter broadcast between client ports.
3. **Multi-NIC hosts** (Hyper-V, WSL, VPN adapters) can route the limited
   broadcast out an interface the devices never see.

Devices answer a **unicast** `0x64` query exactly like a broadcast one, and the
unicast reply *does* match the firewall's UDP state — so sweeping the adapter's
own subnet recovers devices the broadcast phase cannot see. Only one /24 is
swept (254 probes) even on a /16, because LAN devices almost always sit in the
adapter's own /24. The sweep is sent from inside the listen loop, so it adds no
wall-clock time of its own.

### Serial pass

* One **thread per COM port** (`ScanComThreadNoCritical` equivalent) — ports
  are independent, so a 4-port machine costs one port's time instead of four.
* Baud probing stops at the first rate that yields a device: one RS-485 bus
  runs at exactly one baud rate, so the remaining 5 rates cannot hold anything
  new.

### TCP sub-port pass

* One thread per parent gateway (unchanged).
* A parent that does not answer the sub-port register write is **not a
  programmable gateway** (e.g. an ESP32 T3 that only speaks the scan protocol);
  the pass aborts after that first timeout instead of repeating it for all 15
  (sub-port, baud) combinations.
* Probing a sub-port stops at the first baud that yields a device.


## Troubleshooting an empty device tree

Before blaming the scan, check which source should have produced the devices:

```bash
curl http://localhost:9103/api/t3_device/devices/t3000-db   # what T3000 knows
curl http://localhost:9103/api/t3_device/devices            # what the tree reads
```

| Symptom in the log | Meaning | Fix |
|---|---|---|
| `[t3000_db] imported N device(s) from T3000` then devices in the tree | Working: the list came from T3000's database | — |
| `[t3000_db] device import skipped: T3000 database folder ... not found` | The process cannot see `<T3000>/Database/T3000.db` | Start the service from the T3000 runtime folder, or set `TEMCO_T3000_PATH` |
| `sending query to 255.255.255.255:1234` then `0 packet(s)` | No UDP replies reach the process | Check the firewall hint logged after the scan, and whether the devices are on the adapter's subnet |
| `broadcast + unicast sweep found nothing` | Both phases silent | PC and devices on different subnets, or all inbound UDP blocked |
| `serial COMx scan failed: ... Access is denied` | Another program (usually T3000.exe) owns the COM port | **Expected** when T3000 is running — never open it from the WebView; T3000 routes those devices |
| `serial COMx scan failed: ... semaphore timeout` | USB-serial driver did not answer | Unplug/replug the adapter |

## T3000 device sources — preferred order

The WebView takes T3000's device list from the first source that answers:

| # | Source | Cost / risk | Status |
|---|---|---|---|
| 1 | **T3000's building database** (`ALL_NODE`) — T3000 writes *every* discovery there (UDP, RS485, MSTP, third-party BACnet/IP, remote, virtual, manual) | read-only read, ~11 ms shared lock, no writer impact (measured) | **default** |
| 2 | FFI `BacnetWebView_GetTreeDevices` — T3000's in-memory tree (`m_product`), adds live status | memory copy only | only if a future T3000.exe exports it; skipped automatically otherwise |
| 3 | LAN scan (UDP + serial + TCP sub-port) | 0.65 s … 7.9 s | always runs, adds devices before T3000 stores them |

Because source 1 already contains the output of **all six** T3000 scan passes,
porting `ScanBacnetMSTPDevice`, `ScanRemoteIPDevice` and
`ScanThirdPartyBACnetDevice` to Rust would add nothing:

| T3000 pass | Port to Rust? | Why |
|---|---|---|
| `ScanNetworkDevice` (UDP 0x64/0x65) | already have | also catches brand-new IP devices before T3000 stores them |
| `ScanComDevice` (RS485 Modbus) | have it | blocked while T3000 owns the port; results come from its DB |
| `ScanTCPtoRS485SubPort` | already have | finds devices behind a gateway early |
| `ScanBacnetMSTPDevice` | **no** | needs the COM port → same `Access is denied` |
| `ScanRemoteIPDevice` | **no** | needs the user's remote-site config; result already in DB |
| `ScanThirdPartyBACnetDevice` | **no** | BACnet/IP Who-Is with `Sleep(10000)` per adapter; result already in DB |
| `CombineScanResult` + conflict resolution | not needed | upsert dedupes by serial |

Instead, the detached deep pass **re-reads T3000's list when it finishes**, so a
T3000 scan that ran meanwhile is merged without any extra scanner in Rust.

## T3000 device database (ALL_NODE) — default source

T3000's own tree is built from a SQLite database next to its executable, not
from a network scan (`MainFrm.cpp` — `select * from ALL_NODE`):

```
<runtime>/Database/T3000.db                            Building (Protocal, Com_Port, Building_Path)
<runtime>/Database/Buildings/<b>/<b>.db                ALL_NODE  ← one row per device
```

`api/src/t3_device/t3000_building_db.rs` reads it read-only (`mode=ro`, WAL
sharing) and upserts into the WebView `DEVICES` table:

| ALL_NODE column | DEVICES column | Notes |
|---|---|---|
| `Serial_ID` | `SerialNumber` (PK) | rows without a positive serial are skipped |
| `Panal_Number` | `PanelId`, `Panel_Number` | required by FFI action 17 |
| `Object_Instance` | `object_instance` | fallback for action 17 when `PROTOCOL_SETTINGS` is empty |
| `Parent_SerialNum` | `parent_serial_number` | non-zero → sub-device in the tree |
| `Product_name` | `Product_Name`, `Show_Label_Name` | tree label |
| `Product_class_ID` / `Product_ID` | same | icon + product mapping |
| `NetworkCard_Address` (else `Bautrate` when it looks like an IP) | `ip_address` | `Bautrate` holds the *baud rate* on RS485 devices |
| `Bautrate` (9600…115200) | `Bautrate` | |
| `Com_Port` | `port` | |
| `Protocol` | `subnet_protocol` | 0 Modbus 485, 1 Modbus TCP, 2 BACnet MSTP, 3 BACnet IP, 5 Auto |
| `Background_imgID` | `connection_type` | doubles as "Sub Device RS485" / "Modbus_and_Bacnet" in T3000's schema |
| `Online_Status` | `is_online` — **only when `1`** | See the warning below: this column is not live status |
| `Background_imgID` | `connection_type` | doubles as "Sub Device RS485" / "Modbus_and_Bacnet" in T3000's schema |

> **`Online_Status` is not live status.** It is written in bulk only in
> `CMainFrame::OnDestroy` ("so the next open shows the state from the last
> close"), plus a few per-protocol-group updates in the tree-refresh loop that
> do not cover every protocol. Measured on a running T3000: **35 of 38 rows read
> `0` while its own tree showed those devices green** (e.g. `Tstat10-99`,
> protocol 10/BACnet-MSTP). So the importer trusts a `1` and treats `0` as
> *unknown* — it never marks a device offline from this column. Liveness stays
> with the UDP scan (IP devices) and the FFI panel list.

Imported rows are refreshed on every service start and on every
`POST /api/t3_device/devices/scan-refresh`. `last_checked` is stamped only for
devices reported `Online_Status = 1`, which keeps them inside the LAN scan's
5-minute grace window instead of being greyed out.

**The COM port is never opened by the WebView.** T3000 owns it for the whole
session; a second opener gets `Access is denied`. Reads and writes for those
devices go through T3000 over FFI (action 17 needs `panelId`,
`serialNumber` and `objectinstance` only).

### Locking: is reading T3000's database safe?

Measured, not assumed:

| Fact | Evidence |
|---|---|
| Journal mode is `delete` (rollback journal), so a reader *can* block a writer | `PRAGMA journal_mode` on the live files → `delete` |
| A reader that keeps a transaction open **does** block T3000 | measured: writer fails with `database is locked` after 1166 ms |
| The importer does **not** do that | `tests/t3000_db::reading_never_blocks_the_t3000_writer`: 84 reads vs 94 concurrent writes → **0 write failures**, max write latency **22.8 ms** |
| Lock window per read | `examples/measure_t3000_db_read` on the real DB: median **11.3 ms**, p95 16.8 ms (38 devices) |

Guarantees in `t3000_building_db`:

* `mode=ro` — the process *cannot* write, even by accident;
* `PRAGMA query_only = 1` — second line of defence;
* `busy_timeout = 750 ms` on **our** side (T3000 uses 60 s), so a collision makes
  us back off and retry, never the reverse;
* one short `SELECT` per attempt, connection dropped immediately — the shared
  lock lives for a single small statement, not for the process lifetime;
* 4 attempts with backoff; a non-busy error (missing file, hot journal after a
  T3000 crash) is reported and the import is skipped — nothing is forced.

T3000 writes to its building database roughly every 8 s (the `while(1)`
tree-refresh loop in `_FreshTreeView`), so a collision window of ~17 ms means
~0.2 % of imports overlap, and then T3000 just waits a few milliseconds out of
its 60 s budget.

### How T3000 itself discovers devices

T3000 never relies on a single scan. `ALL_NODE` is the authoritative tree, and
four things write to it:

| Source | Code | Writes to ALL_NODE |
|---|---|---|
| **Scan All** (Tools → Scan Device) | `MainFrm.cpp:3910 OnScanDevice` → `Scan_Product()` → `CTStatScanner::ScanAll()` (`TStatScanner.cpp:4192`) | `SendScanEndMsg()` → `CombineScanResult()` + conflict resolution → `AddNewTStatToDB()` / `AddNewNetToDB()`; the MSTP thread also upserts directly |
| **BACnet/IP I-Am** | `MainFrm.cpp:6788` | auto-insert (product_class 254, `PROTOCOL_THIRD_PARTY_BAC_BIP`) |
| **Manual add dialogs** | `AllNodesDiaolg.cpp`, `ARDDlg.cpp`, `BacnetAddRemoteDevice.cpp`, `BacnetAddVirtualDevice.cpp`, `ConnectRemoteServer.cpp` | insert |
| **Scan result review** | `ScanDlg.cpp:1794/1865 WriteOneDevInfoToDB`, `TStatScanner.cpp:3508 WriteOneNetInfoToDB` | insert |

Crucially, `CTStatScanner::ScanAll()` runs **inside T3000** and starts with:

```cpp
SetCommunicationType(0);   // serial mode
close_com();               // ← releases the COM handle T3000's polling loop holds
```

so its serial probe (`ScanComDevice`, `ScanComThreadNoCritical`) can actually
open COM8. It then runs, in threads: `ScanDetectComData`, `ScanComDevice`,
`ScanNetworkDevice` (UDP 0x64/0x65), `ScanBacnetMSTPDevice`,
`ScanRemoteIPDevice`, `ScanTCPtoRS485SubPort`, `ScanThirdPartyBACnetDevice`.
`g_bPauseMultiRead` is set while it runs so polling does not fight the scan.

Out-of-process this is impossible: the port is held, so the Rust serial pass
can only ever return `Access is denied`. Therefore:

* the WebView **uses** the result (`ALL_NODE`) instead of duplicating the scan;
* the serial pass skips the ports T3000 is configured to use
  (`Building.Com_Port`) — it still probes other, free ports, which keeps the
  standalone (no T3000) case working;
* the UDP pass stays, because it is additive and works concurrently.

### Not yet covered by the Rust scan

| C++ `ScanAll` step | Rust | Note |
|---|---|---|
| `ScanNetworkDevice` (UDP 0x64/0x65) | `scanner::scan_network` | equivalent |
| `ScanComDevice` (RS485 Modbus) | `serial::scan_all_serial_ports` | only works when T3000 is not running |
| `ScanTCPtoRS485SubPort` | `scanner::scan_tcp_sub_ports` | equivalent (500 ms timeout) |
| `ScanBacnetMSTPDevice` | — | missing |
| `ScanRemoteIPDevice` | — | missing |
| `ScanThirdPartyBACnetDevice` | — | missing (T3000 auto-inserts on I-Am) |
| `CombineScanResult` + conflict resolution | — | missing (dedupe by serial happens on upsert instead) |

These three are deliberately **not** ported: with T3000 running they are its
job, and without T3000 they are rare (MSTP/remote/third-party imports).

### Proposed FFI contract (when T3000-Source can change)

Reading `ALL_NODE` works today with no C++ change, but it couples the WebView
to T3000's schema. Two messages would make the contract explicit:

| Action | Name | Returns |
|---|---|---|
| `23` | `GET_ALL_NODES` | `{ action: "GET_ALL_NODES_RES", data: [ { serial_number, panel_number, object_instance, parent_serial_number, product_name, product_class_id, product_id, screen_name, ip_address, com_port, protocol, online_status, connection_type } ] }` — the same rows the tree uses |
| `24` | `TRIGGER_SCAN` | starts `CTStatScanner::ScanAll()` in a worker thread (the `OnScanDevice` path without the dialog) and answers `{ status: "started" }`; the WebView then polls `GET_ALL_NODES` |

With those, `t3000_building_db` becomes a fallback instead of the primary path,
and "Scan" in the WebView would really run T3000's scan — including RS485.


## Key Differences from C++

| Aspect | C++ | Rust |
|---|---|---|
| Adapter enum | `GetAdaptersInfo()` Win32 API | `GetAdaptersInfo()` Win32 API |
| Broadcast target | `255.255.255.255:1234` | Same, plus the adapter's subnet broadcast |
| Bind port | `57619–57623` | Same |
| Socket model | Blocking `select()` + `recvfrom()` | Async Tokio `UdpSocket` |
| Timeout | Fixed 8-second `select()` | Configurable via parameter |
| Broadcast fallback | None | Unicast sweep of the adapter's /24 |
| Resend | One send, 8 s window | Up to 3 sends, ends on first reply |
| Serial ports | Thread per port | Thread per port (same) |
| Baud probing | All 6 rates | Stops at the first rate with a device |
| TCP sub-port | 15 combos, 3 s timeout | Aborts non-gateways, stops on first hit, 500 ms timeout |
| Dedup | Tracks seen IPs in send buffer | `HashSet<u32>` after scan |

## Bugs Caught During Porting

1. **Broadcast port**: Sent to 57619 instead of 1234 — devices never heard queries
2. **IP parsing**: `(Preferred)` suffix from `ipconfig /all` broke `Ipv4Addr::parse()`
3. **Variable shadowing**: `current_ip = Some(v)` used old variable with suffix
4. **Subnet protocol mapping**: Was `6→0`, should be `0→1` (MODBUS_RS485→MODBUS_TCPIP)
5. **Minitype offset**: Was conditional on `parent_serial`, should always be `buf[67]`
6. **Sub-device base offset**: Was 22, should be 21
7. **Airlab parent_serial bug**: Equal bytes → zero (matches C++ quirk)
8. **Firmware /10**: Only for specific product IDs (10, 35, 50, 62, 74, 88)

## Real Hardware Test Results

Verified against live T3000 devices on the LAN — 5 devices found across
two subnets, matching the C++ desktop application output:

```
192.168.0.x: 4 devices (SN 271292, 271851, 212375, 240488)
192.168.1.x: 1 device  (SN 237219)
```

## Usage

```bash
# Unit tests
cargo test --test lan_scan

# Real network scan (requires T3000 hardware on LAN)
cargo test --test lan_scan test_real_network_scan -- --ignored --nocapture

# Real full-scan timing: UDP, serial and scan_all() in one run
cargo test --test lan_scan test_real_full_scan -- --ignored --nocapture

# From code
use t3_webview_api::lan_scan::scanner;
let result = scanner::scan_network(8).await;  // 8 second timeout
```

## C++ Reference Files

- `T3000-Source/T3000/global_function.cpp:9796` — `RefreshNetWorkDeviceListByUDPFunc()`
- `T3000-Source/T3000/global_function.cpp:9037` — `AddNetDeviceForRefreshList()` parser
- `T3000-Source/T3000/global_function.cpp:8982` — `AddSubNetInfoIntoRefreshList()` sub-device parser
- `T3000-Source/T3000/global_function.cpp:9610` — `GetIPMaskGetWay()` adapter enumeration
- `T3000-Source/T3000/global_define.h:619` — `refresh_net_device` struct
- `T3000-Source/T3000/global_define.h:244` — `UDP_BROADCAST_PORT = 1234`
