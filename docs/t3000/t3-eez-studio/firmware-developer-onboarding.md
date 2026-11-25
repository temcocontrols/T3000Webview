# Firmware onboarding — T3-programmable-controller-on-ESP32

**Applies to:** shipped code in the application repository.

> **Audience.** A developer who has *not* written this firmware before (front-end, tools, or a new
> firmware hire) and needs to make a safe, correct change. Everything here was read out of the code,
> not from the README — file and line references are live as of branch `CB-Tstate-11`.
>
> **Repository:** `temcocontrols/T3-programmable-controller-on-ESP32`
> **Target document:** the renderer — making the device draw deployed JSON. See
> [phase2-firmware-implementation-guide.md](phase2-firmware-implementation-guide.md).

---

## Contents

1. [What this repo is](#1-what-this-repo-is)
2. [The three-layer mental model](#2-the-three-layer-mental-model)
3. [Boot flow](#3-boot-flow)
4. [Task and concurrency model](#4-task-and-concurrency-model)
5. [The data model — where the real IP lives](#5-the-data-model--where-the-real-ip-lives)
6. [Subsystem map](#6-subsystem-map)
7. [Building and the two dev loops](#7-building-and-the-two-dev-loops)
8. [A learning path](#8-a-learning-path)
9. [Recipes](#9-recipes)
10. [Landmines verified in the code](#10-landmines-verified-in-the-code)
11. [How this connects to the renderer](#11-how-this-connects-to-phase-2)

---

## 1. What this repo is

**One firmware, many products.** A single ESP32-S3 application that behaves as a different device
depending on one persisted byte, `Modbus.mini_type`.

| `mini_type` | Product | What it pulls in |
|---|---|---|
| `MINI_TSTAT11` | Touch-panel thermostat (the Dynamic UI target) | LVGL 9.5 + `main/TemcoScreen/*` + `components/temco_dynamic_display` |
| `MINI_TSTAT10` | Character-LCD panel (non-S3) | `Menu.c`, `menuIdle.c`, `menuMain.c`, `menuSet.c` |
| `PROJECT_HUB` | HUB with LTE modem | `HUB_Module/*` (A7608, W5500, PPPoS) |
| `PROJECT_AIRLAB`, `PROJECT_POWER_METER`, `PROJECT_CO2`, `PROJECT_FAN_MODULE`, `MINI_NANO`, `PROJECT_LIGHT_PWM`, `PROJECT_LORA_GATEWAY` … | remaining SKUs | sensors, `Light_pwm.c`, `lora.c`, `multiMeter.c` |

The value is read at boot (`read_default_from_flash()`), and one legacy path **rewrites itself**:

```c
/* main/app_main.c:4824 */
if (Modbus.mini_type == MINI_SMALL_ARM) {
    Modbus.mini_type = MINI_TSTAT11;
    save_uint8_to_flash(FLASH_MINI_TYPE, Modbus.mini_type);
}
```

That global decides which tasks are created, which display stack runs, and how many Modbus
registers exist. **Almost every branch in this codebase ultimately keys off it.**

---

## 2. The three-layer mental model

```
┌──────────────────────────────────────────────────────────────┐
│  PROTOCOL VIEWS        BACnet · Modbus RTU/TCP · MQTT · SNMP  │
│  temco_bacnet/src, main/modbus.c, Mqtt_Handler/, hub_snmp.c   │
│  each is only a *view* over the point database                │
└───────────────────────────┬──────────────────────────────────┘
                            │  put_io_buf() / group_data_new
┌───────────────────────────▼──────────────────────────────────┐
│  POINT DATABASE   temco_bacnet/private/user_data.c (3.9 kLOC) │
│  Str_in_point / Str_out_point / Str_variable_point / …        │
│  single source of truth; also the flash + Modbus block layout │
└───────────────────────────┬──────────────────────────────────┘
                            │  get_input_raw / set_output_raw / conver_by_unit_*
┌───────────────────────────▼──────────────────────────────────┐
│  HARDWARE + SERVICES    main/io.c · inputs/outputs · i2c_task │
│  rtc.c · flash.c · wifi.c · ethernet_task.c · LCD_Driver/*    │
└──────────────────────────────────────────────────────────────┘
```

The contract between the layers is one 57-line header:
[main/controls.h](https://github.com/temcocontrols/T3-programmable-controller-on-ESP32/blob/CB-Tstate-11/main/controls.h) —
`#define INPUT / OUTPUT`, `#pragma pack(push,1)`, and the prototypes for `put_io_buf`,
`get_input_raw`, `set_output_raw`, `conver_by_unit_*`.

**Rule of thumb when lost:** find the point, then find its view.
`put_io_buf()` tells you which struct; `modbus.c` / `bac_point.c` tell you how the outside world
sees it.

---

## 3. Boot flow

`void app_main()` — [main/app_main.c](https://github.com/temcocontrols/T3-programmable-controller-on-ESP32/blob/CB-Tstate-11/main/app_main.c):

```
SW_REV = SOFTREV;  count_reboot = 0
Set_Device_Stage(DEVICE_STAGE_INIT)
Bacnet_Initial_Data()            ← zero/seed the point database
read_default_from_flash()        ← load saved settings, including mini_type
initial_HSP()                    ← hardware support package (pins, clocks, ADC)
Inital_Bacnet_Server()           ← BACnet Device object
Get_Tst_DB_From_Flash()          ← sub-device (T3 tree) information
  ├ PROJECT_HUB    → hub_module_init(); USB serial instead of UART0
  └ MINI_SMALL_ARM → becomes MINI_TSTAT11 (persisted)
uart_init(0)                     ← RS485 / Modbus slave
  ├ MINI_TSTAT11 → LCD_Init(); xTaskCreate(Lcd_Task, 16 KB stack, prio IDLE+1)
  └ MINI_TSTAT10 → xTaskCreate(MenuTask, …)
… then ~25 further xTaskCreate calls (see §4)
```

Reading order for a newcomer: `app_main` → `initial_HSP` (io.c) → `Inital_Bacnet_Server` →
`read_default_from_flash` (flash.c). Those four explain 80 % of start-up surprises.

---

## 4. Task and concurrency model

| Task | Stack | Priority | Responsibility |
|---|---|---|---|
| `Lcd_Task` | 16 KB (4×4096) | `IDLE+1` | LVGL render + `lv_Lcd_UpdateData()` |
| `BAC_Control_task` | 6 KB | 3 | BACnet point synchronisation |
| `mstp0_task` / `mstp2_task` | 4 KB | 4 | BACnet MS/TP |
| `bip_task` | 6 KB | 1 | BACnet/IP (UDP 47808) |
| `tcp_server` / `tcp_client` | 6 KB | 5 / 1 | Modbus TCP + T3000 link |
| `wifi_task` | 6 KB | 5 | Wi-Fi STA/AP state machine |
| `timer_task` | 6 KB | **13** | schedules, RTC ticks |
| `led_task` | 2 KB | **14** | status LED |
| `i2c_master_task` / `i2c_task` | 4 KB | 10 / 5 | sensors |
| `uart0_rx_task` / `uart2_rx_task` | 6 KB / 4 KB | 11 / 8 | Modbus RTU framing |
| `ddns_task` | 4 KB | 5 | dynamic DNS |
| `wireguard_mgr` | 3 KB | `IDLE+2` | VPN |
| `a7608_hub` / `hub_lte_process` | 8 KB | 10 | modem (HUB only) |

### Two rules that explain most bugs

**Rule 1 — there is no global lock on the point database.**
Tasks read and write `group_data_new`, `inputs[]`, `Modbus.*` directly. It works because writers
are few and mostly idempotent. If you add a task that mutates points, copy the existing style:
mutate a local copy, publish once.

**Rule 2 — LVGL is single-threaded and belongs to `Lcd_Task`.**
Only `Lcd_Task` may call `lv_*`. Any other task must *queue* work for it. A UI call from the
HTTP or BACnet task corrupts the display or panics.

---

## 5. The data model — where the real IP lives

```c
/* temco_bacnet/private/user_data.c:3618 */
Str_points_ptr put_io_buf(Point_type_equate type, uint8 point)
{
    if (type == IN)  ptr.pin  = &inputs[point];    /* logical input   */
    if (type == OUT) ptr.pout = &outputs[point];   /* physical output */
    if (type == VAR) ptr.pvar = &vars[point];      /* analog variable */
    return ptr;
}
```

- `Str_points_ptr` is a **union of pointers**; the caller checks the type tag. That idiom is used
  everywhere — `lv_UserPeram.c:166`, `store.c:32`, `lora.c:95`, `DisHomeScreen.c:368`.
- The point structs are **packed** (`#pragma pack(1)` in `controls.h`). Their byte layout is
  simultaneously the **flash record** and the **Modbus block** format.
- Persistence lives in `main/flash.c` (2 kLOC): `read_default_from_flash`,
  `Get_Tst_DB_From_Flash`, `save_uint8_to_flash`, plus whole pages for trends and monitors.
- Modbus is only a translation: `read_user_data_by_block()`, `get_reg_value()`,
  `Write_reg_value()` in `main/modbus.c`.

A "data point" is therefore:

```
packed struct in ud_str.h
  → array in temco_bacnet/private/user_data.c
    → accessor put_io_buf()
      → register mapping in main/modbus.c
        → BACnet object in temco_bacnet/private/bac_point.c
```

Trace one value end-to-end before writing any code:

```
get_input_raw()          (main/io.c)
  → control_input()      (main/inputs.c)
    → group_data_new.old_item[]   (point DB)
      → write_input()    (temco_bacnet/private)
        → Modbus register read (main/modbus.c)
```

---

## 6. Subsystem map

| Concern | Files | Size |
|---|---|---|
| Boot / product dispatch | `main/app_main.c` | 4.8 kLOC |
| Modbus slave, register map, TCP | `main/modbus.c` | 3.8 kLOC |
| IO HAL (the live one) | `main/io.c` | 562 |
| BACnet stack (ASHRAE code) | `temco_bacnet/src/*` (95 files) | ~40 kLOC |
| BACnet glue, points, private transfer | `temco_bacnet/private/*` | ~19 kLOC |
| Point database | `temco_bacnet/private/user_data.c` | 3.9 kLOC |
| LVGL panel (driver + generated screens) | `main/LCD_Driver/*`, `main/TemcoScreen/*` (50 files) | ~6 kLOC + 1.8 MB bitmaps |
| Data bindings for the compiled UI | `main/LCD_Driver/lv_UserPeram.c` | 3.0 kLOC |
| Dynamic display REST API + SPIFFS | `components/temco_dynamic_display/` | ~1.3 kLOC |
| Wi-Fi, setup portal, HTTP | `main/wifi.c`, `main/wifi_web_server.c` | 1.1 kLOC |
| HUB modem | `main/HUB_Module/*` | 14 files |
| Sensors | `co2.c`, `sht4x.c`, `mlx90632.c`, `airlab.c`, `INA228.c` | ~4 kLOC |
| Host unit tests | `Unit_Test/` + `mocks/` + `unity/` | 10 suites, 729 APIs |

---

## 7. Building and the two dev loops

### Target loop (needs the ESP-IDF toolchain)

```
idf.py set-target esp32s3          # once
idf.py build
idf.py -p COMx flash monitor
```

- IDF **≥ 5.5.3** (`main/idf_component.yml`); LVGL pinned to **9.5.0**.
- Partition table: `temco_partitions.csv` → `factory` 6 MB @ `0x20000`,
  **`screen_data` SPIFFS 1 MB @ `0x780000`**, `ota_0` 1 MB @ `0x620000`.
- Verify what is actually flashed with `idf.py partition-table` before debugging storage.

### Host loop (no hardware — the fast one)

`Unit_Test/` compiles **the real production sources** (`main/`, `temco_bacnet/`,
`temco_IO_control/`) against mocks for ESP-IDF, FreeRTOS, LwIP and LVGL, then runs Unity tests.

```
cd Unit_Test
make            # → run_tests.exe
```

Read [Unit_Test/README.md](https://github.com/temcocontrols/T3-programmable-controller-on-ESP32/blob/CB-Tstate-11/Unit_Test/README.md)
and `verified_apis.md` first — it documents 729 verified APIs across 10 suites. **This is the only
sub-minute feedback loop in the repository, and the right place to test new logic.**

---

## 8. A learning path

### Week 1 — read, don't write

1. `main/controls.h` (57 lines) → in `ud_str.h`: `Point`, `Str_in_point`, `Str_variable_point`.
2. `put_io_buf()` in `temco_bacnet/private/user_data.c`.
3. Trace one value through the five steps in §5.
4. Run `Unit_Test` and read `test_io_control.c` — it isolates the scaling rules nicely.

### Exercise A — host-only unit test (zero risk)

Pick a pure function (`conver_by_unit_10v`, `crc16`, `timegm`, `swap_word`) and add a Unity test in
`Unit_Test/`. No hardware, no protocol risk, and it teaches the mock surface you will need later.

### Exercise B — the renderer steps D1–D3 (low risk)

Add `dynamic_display_storage_init()`, then `dynui_init()` plus the label/panel factory, following
[phase2-firmware-implementation-guide.md](phase2-firmware-implementation-guide.md). Touches no
protocol code, and the compiled UI remains the fallback.

### Exercise C — add a REST endpoint (medium)

Add `GET /api/eez-device/device/status` to `components/temco_dynamic_display/src/dynamic_display_api.c`
plus its entry in the handler table. Copy `info_handler`. Teaches the httpd task, the CORS helper,
cJSON, and the `max_uri_handlers = 20` budget — without touching BACnet.

---

## 9. Recipes

### "Add a new analog variable"

1. Bump the capacity constant in `ud_str.h` — **this changes the packed layout**, so plan a flash
   migration.
2. `temco_bacnet/private/user_data.c` — array storage + the `put_io_buf()` range check.
3. `main/modbus.c` — register range in `read_user_data_by_block()`.
4. `temco_bacnet/private/bac_point.c` — expose it as an AV.
5. `Unit_Test/test_system_data.c` — extend.
6. Front end: `/api/t3_device/devices/<sn>/variable-points` mapping.

### "Add a compiled screen"

SquareLine export → `main/TemcoScreen/` (picked up automatically by
`file(GLOB TEMCO_SCREEN_SOURCES "TemcoScreen/*.c")` in `main/CMakeLists.txt`) → call its
`ui_*_screen_init()` from `ui_init()`.

### "Add a dynamic screen"

Deploy its JSON — no firmware change (once the renderer lands).

### "Understand a protocol failure"

BACnet: `temco_bacnet/private/` glue → `bac_interface.c` → `src/npdu.c`.
Modbus: `main/modbus.c` `check_whether_modbus_slave()` → `crc16()` → `get_reg_value()`.

---

## 10. Landmines verified in the code

| # | Finding | Why it matters |
|---|---|---|
| 1 | **Duplicate source files.** `main/inputs.c` and `components/temco_IO_control/src/inputs.c` define the **same five functions** (`control_input`, `get_input_value_by_range`, `swap_double`, `swap_word`, `test_match_custom`). Same for `outputs.c`. | Both are compiled (each `CMakeLists.txt` lists them). The linker resolves by archive order, so **editing the wrong copy can silently do nothing.** Edit `main/`, then confirm in the `.map` file. |
| 2 | **Two `ud_str.h`.** `main/ud_str.h` = 1176 lines; `temco_IO_control/include/ud_str.h` = 1157 lines; hashes differ. | The point layout may already have drifted. Diff before touching a struct. |
| 3 | **Packed structs are the wire *and* flash format** (`#pragma pack(1)`). | Adding or reordering a field silently corrupts saved data and Modbus blocks. |
| 4 | **Legacy files behind `#ifdef INPUT / OUTPUT`** — `controls.h` defines both unconditionally, and `far`/`xdata`/`code` are `#define`d to nothing. | Files like `inputs.c` are ARM-era code. Reading them as modern ESP-IDF will mislead you; the live IO path is `io.c` + `i2c_task.c`. |
| 5 | **No lock on the shared point database.** | Any new task writing points races BACnet / Modbus / LCD. |
| 6 | **LVGL only from `Lcd_Task`** (`IDLE+1`, 16 KB stack). | Building or parsing inside the httpd task corrupts the display or panics. |
| 7 | **Port 80 is shared** by the Wi-Fi setup portal and the display REST API — mutually exclusive by design (`wifi_web_server_start()` stops the display API; `wifi_web_server_stop()` restarts it). | "Device unreachable while in AP mode" is expected behaviour, not a bug. |
| 8 | **Several files are commented out** of `main/CMakeLists.txt` (`deviceparams.c`, `ble_mesh.c`, `pic.c`, `lowPower.c`, `smtp_client_task`…). | They are not in the binary; don't debug them. |
| 9 | **`sdkconfig`, `sdkconfig.old`, `sdkconfig.bak` are all committed.** | Which one is live is ambiguous; run `idf.py menuconfig`, save, then diff. |
| 10 | **`temco_bacnet/src/*` is vendored ASHRAE code** (95 files). | Fix behaviour in `private/` glue, not in `src/` — upgrades overwrite `src/`. |

---

## 11. How this connects to the renderer

the renderer needs exactly **one** new architectural thing here: a build/rebuild path that runs **inside
`Lcd_Task`**, reads SPIFFS and creates LVGL objects — plus a queue so the HTTP task can signal it.
Everything else already exists:

| the renderer needs | Already in this repo |
|---|---|
| Storage + seeded defaults | `components/temco_dynamic_display` + `screen_data` partition |
| JSON parser | cJSON (the `json` component) |
| LVGL 9.5 with all required widgets | `main/idf_component.yml`, `sdkconfig` |
| The place to hook the render | `Lcd_Task` (`main/LCD_Driver/lcd_task.c:202`) |
| Point data for later expression support | `put_io_buf()` |
| A test harness | `Unit_Test/` |

Recommended order for a first-time firmware contributor:

```
host unit test  →  D1 storage  →  D2 labels  →  D3 styles (photo checkpoint)
```

Nothing in that sequence touches BACnet, Modbus or the point layout — which is exactly why it is
the safe way to start.

### See also

- [phase2-device-renderer-design.md](phase2-device-renderer-design.md) — the payload contract
- [phase2-firmware-implementation-guide.md](phase2-firmware-implementation-guide.md) — file-by-file changes with reference code
- [phase2-host-implementation-guide.md](phase2-host-implementation-guide.md) — the front-end half
- [device-firmware-lvgl-architecture.md](device-firmware-lvgl-architecture.md) — the current LVGL stack
