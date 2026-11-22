# Design Studio — documentation map

Design Studio builds touchscreen UIs for the Tstat11 controller: screens are drawn in a browser
editor, exported to a device JSON format, pushed to the controller over HTTP, stored in flash, and
rendered by the firmware.

**Applies to:** the editor, exporter, REST client and device storage — shipped. The device-side
renderer and the transactional deploy are specifications; each page states which it is.

**Not covered here:** the T3000 application itself, BACnet point data, and the TSTAT LCD subsystem
(`../tstat-lcd/`), which uses a different screen format.

---

## 1. Actor model

```text
  Design Hub / editor            exporter                  host                    device
  ──────────────────            ────────                  ────                    ──────
  .eez-project  ──▶  transformToDeviceJson()  ──▶  /api/device-rest/<ip>/…  ──▶  esp_http_server
  (pages, widgets,          (device screen JSON)     proxy_device_rest            │
   styles, variables)                                                             ▼
                                                                        SPIFFS screen_data
                                                                        /spiffs/screens/*.json
                                                                        /spiffs/images/*.json
                                                                                  │
                                                        renderer ─────────────────┘
                                                        (specified) → LVGL → panel
```

Loading from a device runs the same path backwards: `GET /screens` and `GET /images/pull/<name>`
are turned back into a `.eez-project`.

## 2. Documentation map

| Question | Document | Status |
|---|---|---|
| Where does each part of this feature live? | this page | — |
| How does the firmware draw a screen, and what does it own? | [device-firmware-lvgl-architecture.md](device-firmware-lvgl-architecture.md) | shipped |
| What exactly is a device screen document? | [../bacnet-api/screen-json.md](../bacnet-api/screen-json.md) | shipped |
| What is inside an `.eez-project`? | [lvgl-eez-project-json-format.md](lvgl-eez-project-json-format.md) | shipped |
| Which endpoints exist, with what payloads and codes? | [device-interface-deployment-via-bacnet-design.md](device-interface-deployment-via-bacnet-design.md) | shipped + specified |
| What guarantees does a deploy give, and how do versions and space work? | [screen-deploy-lifecycle-design.md](screen-deploy-lifecycle-design.md) | specified |
| How is the JSON turned into LVGL objects? | [phase2-device-renderer-design.md](phase2-device-renderer-design.md) | specified |
| Which firmware files change, and how is it verified? | [phase2-firmware-implementation-guide.md](phase2-firmware-implementation-guide.md) | specified |
| Where are the exporter, client and UI in this repository? | [phase2-host-implementation-guide.md](phase2-host-implementation-guide.md) | shipped + specified |
| How are screens pulled off a device into a project? | [import-from-device-design.md](import-from-device-design.md) | shipped |
| How do project assets reach the browser and the device? | [static-resource-copy-build.md](static-resource-copy-build.md) | shipped |
| How is the browser editor built? | [wasm-browser-build-migration.md](wasm-browser-build-migration.md) | shipped |
| I am new to the ESP32 firmware — where do I start? | [firmware-developer-onboarding.md](firmware-developer-onboarding.md) | shipped |

Shipped means the code exists in this repository or in the firmware repository, and the page can be
checked against it. Specified means the page defines behaviour that is not implemented yet.

## 3. Shipped versus specified

| Capability | State | Where |
|---|---|---|
| editor, `.eez-project` save/load | shipped | `src/lib/t3-eez-studio/project-editor/` |
| export to device JSON | shipped | `project-editor/build/firmware-export.ts` |
| REST client, incremental deploy, manifest diff | shipped | `device-rest-client.ts`, `deployService.ts` |
| device storage and REST endpoints | shipped | firmware `components/temco_dynamic_display` |
| import from device | shipped | `device-import.ts` |
| default/factory screens | shipped | firmware `DefaultScreens/`, `POST /reset-defaults` |
| **device renders device JSON** | **not implemented** | [phase2-device-renderer-design.md](phase2-device-renderer-design.md) |
| **transactional deploy, capacity, revisions, `/device/status`** | **not implemented** | [screen-deploy-lifecycle-design.md](screen-deploy-lifecycle-design.md) |

Until the renderer exists, a deploy writes files that nothing draws: the panel shows the compiled UI.
`GET /device/status` is the planned way to tell the two apart.

## 4. Canonical screens

The firmware ships 13 default screens. The file name is the screen name; the root widget key is the
PascalCase form (`wireguard_screen` is the one exception, `WireGuardScreen`).

| File | Root key |
|---|---|
| `start_up_screen.json` | `StartUpScreen` |
| `home_screen.json` | `HomeScreen` |
| `main_menu.json` | `MainMenu` |
| `network_config.json` | `NetworkConfig` |
| `parameters.json` | `Parameters` |
| `protocols.json` | `Protocols` |
| `schedule_screen.json` | `ScheduleScreen` |
| `schedule_edit_screen.json` | `ScheduleEditScreen` |
| `time.json` | `Time` |
| `wifi_config.json` | `WifiConfig` |
| `holiday_calender_screen.json` | `HolidayCalenderScreen` |
| `wireguard_screen.json` | `WireGuardScreen` |
| `ddns_screen.json` | `DdnsScreen` |

## 5. User documentation

| # | Chapter | Contents |
|---|---|---|
| 01 | [Overview](manual/01-overview.md) | what Design Studio is, the two project types, screen tour |
| 02 | [Creating a project](manual/02-creating-projects.md) | new, from example, or from a device |
| 03 | [Designing screens](manual/03-editing-screens.md) | widgets, styles, fonts, images |
| 04 | [EEZ Flow](manual/04-eez-flow.md) | variables, events, actions, worked example |
| 05 | [Preview, bind, deploy](manual/05-preview-and-deploy.md) | preview, device binding, deploy semantics |
| 06 | [Reference and FAQ](manual/06-reference-and-faq.md) | feature matrix, routes, files, shortcuts, glossary |

Two project types are offered in the Design Hub: **LVGL 9.5** (UI only) and **LVGL with Flow 9.5**
(UI plus visual logic). Both produce an `.eez-project`, preview in the browser and deploy the same
way; Flow is a project setting, not an irreversible choice.

## 6. Attribution

The editor core — the LVGL project editor, the `.eez-project` format, the Flow engine and the browser
preview runtime — is integrated from the open-source [EEZ Studio](https://github.com/eez-open/studio)
project by Envox d.o.o. (GPL-3.0). The T3000 work around it is the Design Hub, device binding,
export, deploy and the device-side storage described in this folder.
