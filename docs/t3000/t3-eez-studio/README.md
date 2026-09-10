## Design Studio (Tstat11)

**Design Studio (Tstat11)** is T3000's designer for embedded touchscreen UIs. You draw
screens for the **Tstat11** display, preview them in the browser, and deploy them to the
controller — without writing firmware code.

You reach it from the **Design Hub**: open the Design Hub, pick an **LVGL** tile, and the
editor opens.

> **Powered by EEZ Studio**
>
> The editor core — the LVGL project editor, the `.eez-project` file format, the **EEZ Flow**
> logic engine and the browser preview runtime — is integrated from the open-source
> [**EEZ Studio**](https://github.com/eez-open/studio) project (a free, cross-platform,
> GPL-3.0 tool for embedded GUIs, by Envox d.o.o.).
>
> Because of this, the editor looks and behaves like EEZ Studio and uses the same vocabulary:
> *pages*, *widgets*, *styles*, *variables* and *Flow*. **This manual documents the T3000
> workflow around that core** — the Design Hub, creating a project, binding a device and
> deploying — rather than re-teaching the editor itself.

### Start here in 3 steps

| Step | What you do |
|---|---|
| **1. Pick a project type** | In the Design Hub, click the **LVGL 9.5** tile (plain UI) or **LVGL with Flow 9.5** (UI + logic). |
| **2. Create the project** | **Create New** for a blank project, **LVGL Examples** to start from a ready-made design, or **Load from Device** to pull the screens already on a controller. |
| **3. Design, preview, deploy** | Build your screens in the editor, preview with **Run (F5)**, then **Bind** a device and click **Deploy to Device**. |

### The two project types

| Project type | Choose it when you want… |
|---|---|
| **LVGL 9.5** | A touchscreen UI made of pages, widgets, styles, fonts and images. |
| **LVGL with Flow 9.5** | The same UI **plus** visual logic — a button that changes a value, a screen that reacts to data, animations and timers. |

Both types produce an `.eez-project` file, preview in the browser and deploy to a device.
Flow is a project setting, so it is not an irreversible choice.

### Manual chapters

| # | Chapter | What's inside |
|---|---|---|
| 01 | [Overview](manual/01-overview.md) | What Design Studio (Tstat11) is, the two project types, and a tour of every screen. |
| 02 | [Creating a Project](manual/02-creating-projects.md) | The three ways to start: Create New, from an Example, Load from Device. |
| 03 | [Designing Screens](manual/03-editing-screens.md) | The editor tour and how to build pages with widgets, styles, fonts and images. |
| 04 | [Adding Logic with EEZ Flow](manual/04-eez-flow.md) | Flow components, events, variables, and a worked example. |
| 05 | [Preview, Bind & Deploy](manual/05-preview-and-deploy.md) | Preview in the browser, bind a controller, and deploy your design. |
| 06 | [Reference & FAQ](manual/06-reference-and-faq.md) | Feature matrix, routes, file locations, shortcuts, glossary and troubleshooting. |

### What you can do

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

### Related documentation

**Device-side logic** — how the controller receives, stores and renders the screens, and the
display REST API it exposes — is documented with the firmware:

- [DEVICE_REST_API_DISPLAY.md — firmware display REST API](https://github.com/temcocontrols/T3-programmable-controller-on-ESP32/blob/DynamicUI_Tstat11/components/temco_dynamic_display/DEVICE_REST_API_DISPLAY.md)

**Developer design docs** for this feature live in this folder:

- [`device-firmware-lvgl-architecture.md`](device-firmware-lvgl-architecture.md)
- [`import-from-device-design.md`](import-from-device-design.md)
- [`device-interface-deployment-via-bacnet-design.md`](device-interface-deployment-via-bacnet-design.md)
- [`lvgl-eez-project-json-format.md`](lvgl-eez-project-json-format.md)
