# LAN Scanner — UDP Device Discovery

Pure Rust async port of the C++ `RefreshNetWorkDeviceListByUDPFunc()`
from `T3000-Source/T3000/global_function.cpp:9796`.

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

| Symptom in the log | Meaning | Fix |
|---|---|---|
| `sending query to 255.255.255.255:1234` then `0 packet(s)` | No replies reach the process | Check the firewall hint logged after the scan, and whether the devices are on the adapter's subnet |
| `broadcast + unicast sweep found nothing` | Both phases silent | PC and devices on different subnets, or all inbound UDP blocked |
| `serial COMx scan failed: ... Access is denied` | Another program (usually T3000.exe) owns the COM port | Close T3000.exe, or accept that the port cannot be scanned |
| `serial COMx scan failed: ... semaphore timeout` | USB-serial driver did not answer | Unplug/replug the adapter |


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
