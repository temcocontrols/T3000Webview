# 06 — Reference & FAQ

Quick-reference tables, a glossary of the words you'll see in the UI, and answers to common
questions.

---

## 1. Feature matrix

| Capability | LVGL 9.5 | LVGL with Flow 9.5 |
|---|:--:|:--:|
| Visual page/screen designer | ✅ | ✅ |
| Widget library | ✅ | ✅ |
| Styles, themes, colours | ✅ | ✅ |
| Fonts | ✅ | ✅ |
| Bitmaps / images | ✅ | ✅ |
| Variables | ✅ | ✅ |
| Flow logic editor | — | ✅ |
| Breakpoints / flow debugging | — | ✅ |
| Run / preview (F5) | ✅ | ✅ |
| Full simulator (F7) | ✅ | ✅ |
| Save & reopen from disk | ✅ | ✅ |
| Start from an example | ✅ | ✅ |
| Load screens from a device | ✅ | ✅ |
| Bind to a device | ✅ | ✅ |
| Incremental deploy | ✅ | ✅ |

---

## 2. Routes

| Route | Screen |
|---|---|
| `#/t3000/design` | Design Hub dashboard |
| `#/t3000/design/projects/:id` | Project detail page |
| `#/t3000/eez` | LVGL project editor |

Handy link parameters the editor understands (used internally when you start from the hub):

| Parameter | Meaning |
|---|---|
| `?open=<path>` | Opens an existing project file. |
| `?new=<type>` | Starts the New Project wizard for a type (`LVGL` or `LVGL with EEZ Flow`). |
| `?examples=1&type=<example>` | Starts the wizard from a catalog example. |
| `?name=<name>` | Pre-fills the project name. |
| `?location=<folder>` | Pre-fills the destination folder. |
| `?createDirectory=true\|false` | Pre-fills the *Create directory* option. |

---

## 3. Where projects live

Each project is a folder containing:

| Item | Meaning |
|---|---|
| `<name>.eez-project` | The project file. This is the file you open and save. |
| `device-import/` | Created by **Load from Device** — the screens and images read from the controller. |
| `device-export/` | Created by **Deploy** — the exported screens and images, plus the deploy manifest used to detect changes. |

The Design Hub's **Project History** reads the projects from this location, so anything you
create appears there.

---

## 4. Keyboard shortcuts

| Shortcut | Action |
|---|---|
| **Ctrl + K** | Command palette on the Design Hub. |
| **F5** | Run the project (preview). |
| **Shift + F5** | Back to edit mode. |
| **Ctrl + F5** | Run with the debugger. |
| **F7** | Full simulator (when enabled). |
| Standard edit keys | Undo, redo, cut, copy, paste. |

---

## 5. Status badges

| Badge | Meaning |
|---|---|
| **Unbound** | The project is not linked to any controller yet. |
| **Bound** | The project is linked to a controller, but has not been deployed to it. |
| **Deployed** | A successful deploy to the bound controller has completed. |
| **Local** | The project exists on this T3000 host. |

---

## 6. Glossary

| Term | Meaning |
|---|---|
| **Design Hub** | The dashboard at `#/t3000/design` where all design projects live. |
| **Page** | One screen of the UI. |
| **Widget** | A single element on a page — a label, button, slider, and so on. |
| **Panel** | An invisible container used to group widgets. |
| **Style** | A reusable appearance definition applied to widgets. |
| **Bitmap** | An image asset in the project. |
| **Variable** | A named value the UI can read and change. |
| **Flow** | The visual logic editor (LVGL with Flow projects). |
| **Event handler** | The link from a widget event (like a click) to a flow. |
| **Bind** | Linking a project to a specific controller. |
| **Deploy** | Sending the project to the controller. |
| **Snapshot** | A saved copy of a project's state, kept for comparison or restore. |
| **Manifest** | The record of the last successful deploy, used to send only changed screens and images. |

---

## 7. FAQ

**Which project type should I choose?**
Start with **LVGL 9.5** if the UI only displays things. Choose **LVGL with Flow 9.5** as soon
as you need a click, a value change, a timer, or an animation to *do* something.

**Can I add Flow to an existing LVGL project?**
The Flow editor appears for projects that have Flow support enabled. If the Flow section is
missing, the project was created without it.

**Do I need the device connected while designing?**
No. You can design and preview entirely in the browser, then bind and deploy later.

**Can I keep designing while the device is offline?**
Yes. Deploying is the only step that needs the controller online.

**What does "incremental deploy" mean for me?**
Only screens and images that changed since the last successful deploy are sent. The first
deploy sends everything; later deploys are much quicker.

**What happens if a deploy fails halfway?**
The failed step is reported in the drawer and in the deploy log. Deploy again — the changes
that were not sent are retried.

**Will my screens be overwritten if I load from the device?**
**Load from Device** creates a *new* project from what the device currently has. It does not
modify an existing project.

**Where are my projects stored?**
On the T3000 host, one folder per project (see §3). The Design Hub lists them under
**Project History**.

**How do I back up a project?**
Deploy writes a local copy of the exported screens and images into the project's
`device-export/` folder. Use **Snapshots** on the project detail page to keep point-in-time
copies of the project itself.

**Can two people work on the same project?**
Use **Snapshots** to keep a known-good state before large edits, and **Compare** to review
changes against a snapshot.

**The examples list is empty — what now?**
The catalog is downloaded on first use. Wait a moment and press **Retry**; the host needs
internet access to fetch the examples.

**Why is my text showing boxes instead of characters?**
The font does not contain those characters. Add them to the font's character set.

---

## 8. Error messages you may see

| Message | Meaning / what to do |
|---|---|
| *Backend offline — kept local* | The T3000 host service is not reachable. Local changes are kept, but saving/listing projects needs the host running. |
| *No device selected* | Pick a device in the device bar, or choose one in the deploy drawer. |
| *Cannot load project for deploy* | The project file could not be read. Reopen the project, save it, and deploy again. |
| *Auto-save failed before deploy* | The project could not be written to disk. Check host availability and disk access, then retry. |

---

## 9. Where to go next

- Developer-oriented design documents live in this folder:
  [`../device-firmware-lvgl-architecture.md`](../device-firmware-lvgl-architecture.md),
  [`../import-from-device-design.md`](../import-from-device-design.md),
  [`../device-interface-deployment-via-bacnet-design.md`](../device-interface-deployment-via-bacnet-design.md),
  [`../lvgl-eez-project-json-format.md`](../lvgl-eez-project-json-format.md).
- Back to the start: [Manual home](../README.md).
