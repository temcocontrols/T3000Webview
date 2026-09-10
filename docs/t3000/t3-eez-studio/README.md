# LVGL Studio — User Manual

**LVGL Studio** is the T3000 embedded-touchscreen designer. You draw screens for a T3
controller, add logic, preview everything in the browser, and send the finished design to
the device — without writing firmware code.

You reach it from the **Design Hub**:

```
Design Hub  →  #/t3000/design  →  "LVGL 9.5" or "LVGL with Flow 9.5" tile  →  editor
```

> **New here?** Read [01 — Overview](manual/01-overview.md), then
> [02 — Creating a Project](manual/02-creating-projects.md). Everything else can be read
> on demand.

---

## What you can build

| Project type | Pick this when you want… |
|---|---|
| **LVGL 9.5** | A touchscreen UI made of pages, widgets, styles, fonts and images. |
| **LVGL with Flow 9.5** | The same UI **plus** visual logic — button presses that change values, screens that react to data, animations and timers. |

Both types produce an `.eez-project` file, preview in the browser, and deploy to a device.

---

## Quick start (5 minutes)

1. **Open the Design Hub** and pick a type tile (`LVGL 9.5` or `LVGL with Flow 9.5`).
2. **Create the project** — either **Create New**, **start from an Example**, or
   **Load from Device** to pull the screens already on a controller.
3. **Design your screens** in the editor, preview them, then **Bind** a device and click
   **Deploy to Device**.

---

## Chapters

| # | Chapter | What's inside |
|---|---|---|
| 01 | [Overview](manual/01-overview.md) | What LVGL Studio is, the two project types, and a tour of every screen. |
| 02 | [Creating a Project](manual/02-creating-projects.md) | The three ways to start: Create New, from an Example, Load from Device. |
| 03 | [Designing Screens](manual/03-editing-screens.md) | The editor tour and how to build pages with widgets, styles, fonts and images. |
| 04 | [Adding Logic with EEZ Flow](manual/04-eez-flow.md) | Flow components, events, variables, and a worked example. |
| 05 | [Preview, Bind & Deploy](manual/05-preview-and-deploy.md) | Preview in the browser, bind a controller, and deploy your design. |
| 06 | [Reference & FAQ](manual/06-reference-and-faq.md) | Feature matrix, routes, file locations, shortcuts, glossary and troubleshooting. |

---

## Feature matrix

| Capability | LVGL 9.5 | LVGL with Flow 9.5 |
|---|:--:|:--:|
| Visual page/screen designer | ✅ | ✅ |
| Widget library (label, button, switch, slider, bar, image, panel…) | ✅ | ✅ |
| Styles, themes, fonts | ✅ | ✅ |
| Bitmaps / images | ✅ | ✅ |
| Variables | ✅ | ✅ |
| **Flow logic editor** (actions, event handlers, timers) | — | ✅ |
| Browser preview (Run mode) | ✅ | ✅ |
| Full simulator (F7) | ✅ | ✅ |
| Save / reopen project from disk | ✅ | ✅ |
| Bind to a device | ✅ | ✅ |
| Deploy to a device | ✅ | ✅ |
| Start from an EEZ example project | ✅ | ✅ |
| Load existing screens off a device | ✅ | ✅ |

---

## What this manual does not cover

- The **HVAC** designer and the **LCD UI / thermostat simulator** (the other two tiles on
  the Design Hub).
- T3000 device setup — see *Quick Start* and *Device Management* in the main documentation.
- Firmware internals and the on-device JSON format. Those are covered by the developer
  documents in this same folder:
  - [`device-firmware-lvgl-architecture.md`](device-firmware-lvgl-architecture.md)
  - [`import-from-device-design.md`](import-from-device-design.md)
  - [`device-interface-deployment-via-bacnet-design.md`](device-interface-deployment-via-bacnet-design.md)
  - [`lvgl-eez-project-json-format.md`](lvgl-eez-project-json-format.md)

---

## Screenshots in this manual

The chapters reference images in [`manual/images/`](manual/images/). Those placeholders are
listed (with the exact filename and what each should show) in
[`manual/images/README.md`](manual/images/README.md) — drop the screenshot in with the
matching filename and it appears automatically.
