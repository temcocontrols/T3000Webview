# [BETA] The new T3000 web interface — open it with the Chrome button in the toolbar

> **Draft notes — delete this block before posting**
> - Everything in `[square brackets]` is a placeholder: replace it or delete the line.
> - `[Screenshot N]` marks where an image goes (see the checklist at the end of this file).
> - Version used in the examples: `V:26.0930.01` — it is shown in the new interface's top bar (classic T3000
>   shows it in Help ▸ About).
> - LCD UI is deliberately **not** advertised in this beta (still being finished): it stays out of the feature
>   list and the screenshots — only one line under *What happens next* mentions it. Delete that line too if you
>   would rather not mention it at all.
> - Suggested posting: one pinned thread, categories as separate headings (users can link/reply to a section).

### Title options (pick one)

1. **Beta: the new T3000 web interface — open it with the Chrome button in the toolbar**
2. **Try the new T3000 UI (beta) — Inputs, Trend Logs, Haystack, AI Assistant and the new Designer**
3. **Beta preview: one click from T3000 to the new web interface**

---

## Dear T3000 users,

We have been building a second, modern interface for T3000. It runs next to the classic one, opens in your own
browser, and covers the parts of the system you use every day: **Inputs, Outputs, Variables, Trend Logs,
Haystack tags, MCP tools, the AI Assistant, and the new Designer (HVAC schematics, LVGL / EEZ Studio)**.

This is a **beta**: it is ready for you to look at and try, and we want your feedback before the official
release. Please do **not** use it as your only tool for live buildings yet.

| Who | What we suggest |
|---|---|
| Everyone | Install the beta copy from the network drive on a spare PC or next to your current T3000, and click around. |
| Anyone who owns a test panel / lab device | Please try real work on it: edit points, run a trend, tag a device, draw an HVAC graphic. |
| Production / live sites | Keep using the classic T3000 for now. The beta does not touch your existing installation, but we would rather you break things in the lab first. |

### At a glance

- **One click to open it:** the **Chrome button** at the right end of the T3000 toolbar.
- **One click back:** the **Windows icon** in the new interface returns you to the classic T3000.
- **Nothing to install:** copy the beta folder from the network drive and run `T3000.exe` from there.
- **Your current T3000 and its data stay as they are** — the beta is a separate copy.

### Your first five minutes

1. Open the beta and click the **Chrome button** in the toolbar.
2. Check that **Inputs** lists one of your devices with the right name and points.
3. Edit one value and commit it — on a test panel if you can.
4. Click the **Windows icon** to return to the classic T3000.

That is the whole round trip. Everything after this section is detail you can read as you need it.

## 1. How to open the new interface

Two ways, both use the same beta copy:

1. **From the toolbar** — click the **Chrome button** at the right end of the T3000 toolbar.
   T3000 minimises itself and the new interface opens in your browser (Chrome, Edge or Firefox — whichever you
   have installed). The browser opens on a profile that belongs to T3000, so it does not mix with your normal
   browsing tabs or bookmarks.
   - Clicking the button again does **not** open another window: it brings the same window back, maximised.
2. **From the address bar** — with the beta running, open `http://localhost:9103/#/t3000/` in any browser.

**To go back to the classic T3000**, click the **Windows icon** in the new interface's header. It restores and
focuses the classic T3000 window and closes the browser window that T3000 opened.

[Screenshot 1: the Chrome button at the right end of the T3000 toolbar]
[Screenshot 2: the Windows icon in the new interface that takes you back]

**What you need**

- Windows 10 or 11, and Chrome, Edge or Firefox installed.
- Nothing from the internet: the beta serves everything from your own PC (port `9103`).
- The classic T3000 keeps running as it does today — the beta is a separate copy.

## 2. Where to get the beta

The beta is on the company network drive:

```
[\\your-server\share\T3000-Beta-V26.0930.01\   ← fill in the real path]
```

1. Copy the **whole folder** to a local disk (e.g. `C:\T3000-Beta\`). Running it from the network drive works,
   but it is slower and can be locked by other users.
2. Run `T3000.exe` **from that new folder**. Do not copy it over your production installation.
3. Click the **Chrome button** in the toolbar (or open `http://localhost:9103/#/t3000/`).
4. The version is shown in the new interface's top bar (e.g. `V:26.0930.01`); classic T3000 shows it in
   Help ▸ About. Please quote it in your feedback.

[Screenshot 3: the copied folder and T3000.exe]

## 3. What to try — by category

Each section has a short "what it is", where to find it, and what to test. Detailed documents:

| Category | In the new interface | Detailed document |
|---|---|---|
| Inputs, Outputs, Variables | **Inputs · Outputs · Variables** | [link — `docs/t3000/data-points/`] |
| Trend Logs (new) | **Trend Logs · Trend Policy · Trends ▸ Chart** | [link — `docs/t3000/features/trendlogs.md`] |
| Haystack tags | **Haystack Tags · Auto-Tagging** | [link — `docs/t3000/haystack/`] |
| MCP tools + AI Assistant | **AI Assistant ▸ MCP** | [link] |
| New Designer — HVAC | **Design Hub ▸ HVAC** | [link — `docs/t3000/design-hub/`] |
| New Designer — LVGL / EEZ Studio | **Design Hub ▸ LVGL 9.5 · LVGL with Flow 9.5** | [link — `docs/t3000/t3-eez-studio/`] |

### 3.1 Inputs, Outputs, Variables

**What it is:** the everyday point lists, rebuilt as fast, sortable tables with search and multi-select.

**Try:** open a device's inputs, sort by a column, search for a point, edit a value and commit it; do the same
for outputs and variables.

[Screenshot 4: Inputs page]
[Screenshot 5: one point being edited / committed]
Docs: [link]

### 3.2 Trend Logs (new)

**What it is:** the new trend logging: a trend centre, trend policies (what gets logged and how often) and the
new chart.

**Try:** create a trend for an input, set the interval/samples, watch it collect, then open it in the chart and
zoom / change the range.

[Screenshot 6: Trend Logs list]
[Screenshot 7: trend chart]
Docs: [link]

### 3.3 Haystack tags

**What it is:** Haystack tagging for devices and points, plus auto-tagging that proposes tags for you.

**Try:** tag a device, review the suggestions from auto-tagging, search/filter by a tag.

[Screenshot 8: Haystack Tags]
[Screenshot 9: Auto-Tagging suggestions]
Docs: [link]

### 3.4 MCP tools and the AI Assistant

**What it is:** the Model Context Protocol tools expose your T3000 system to an AI assistant, which can answer
questions about points, trends and devices and help you configure them.

**Try:** ask the assistant a question about a device (e.g. "what is the supply air temperature on SN …"), and
check the tool list / settings on the MCP page.

[Screenshot 10: AI Assistant answering a question]
[Screenshot 11: MCP tools page]
Docs: [link]

### 3.5 The new Designer — HVAC and LVGL / EEZ Studio

**What it is:** your graphics and embedded UI projects, made in the browser and deployed to the device. The
Design Hub is the dashboard: create a drawing by type, pick the device, then edit and deploy.

**Try:**
- **HVAC:** create a schematic for a device's graphic slot (1–8), draw an air handler, save, reload, deploy.
- **LVGL / EEZ Studio:** create an LVGL 9.5 project (or LVGL with Flow 9.5) and open it in the EEZ Studio editor.

**Good to know:** a drawing belongs to **one device + one graphic slot**, and the hub tells you when a slot is
already taken, so you can open the existing drawing instead of overwriting it.

[Screenshot 12: Design Hub dashboard]
[Screenshot 13: HVAC schematic being edited]
[Screenshot 14: LVGL / EEZ Studio editor]
Docs: [link]

## 4. What we would like you to look at

- Does it open on your PC, and does **the Windows icon bring the classic T3000 back**?
- Do your devices show up with the right names, buildings and floors?
- Are values and units correct for your points, and do writes land on the device?
- Any page that feels slow, or shows a spinner that never ends.
- Anything that looks wrong on your screen resolution or in your browser (Chrome / Edge / Firefox).

## 5. Known limitations of the beta

- Beta quality: some pages are still being finished, and a few classic screens have no new page yet.
- The new interface uses a browser profile of its own for T3000 — so sign-ins, extensions and bookmarks from
  your normal browser profile do not apply.
- Please keep using the classic T3000 for anything critical; nothing is removed by installing the beta.

[Add/remove as the team sees fit.]

## 6. How to report back

Please reply in this thread and use this template — it lets us reproduce a problem instead of guessing:

```
Version (Help ▸ About):        V:26.xxxxx.xx
Device / panel (name + SN):    e.g. T3-1216-Fandu57, SN 249555
Browser:                       Chrome / Edge / Firefox + version
Page:                          e.g. Inputs, Trend Logs, Design Hub ▸ HVAC
What I did:                    1) … 2) … 3) …
What I expected:               …
What happened:                 …
Screenshot / log attached:     yes / no
```

Even "it worked" reports are useful — tell us which category you tried and whether it was clear.

## 7. What happens next

This beta is for gathering feedback. After it we will publish an **official release** with the fixes and the
remaining pages, announced here. The **LCD UI designer** is not part of this beta — it is still being finished
and will follow in a later update. Thank you for helping us get there.

[Signature — T3000 team / contact name / e-mail]

---

### Screenshot checklist (internal — delete before posting)

| # | Shot | Where |
|---|---|---|
| 1 | Chrome button in the toolbar | T3000 toolbar, right end |
| 2 | Windows icon that returns to the classic UI | new interface header |
| 3 | The copied beta folder + `T3000.exe` | Explorer |
| 4 | Inputs page | `#/t3000/inputs` |
| 5 | Editing / committing a point | Inputs |
| 6 | Trend Logs list | `#/t3000/trendlogs` |
| 7 | Trend chart | `#/t3000/trends/chart` |
| 8 | Haystack Tags | `#/t3000/haystack-tags` |
| 9 | Auto-Tagging suggestions | `#/t3000/auto-tagging` |
| 10 | AI Assistant answering | `#/t3000/ai-assistant/mcp` |
| 11 | MCP tools page | `#/t3000/ai-assistant/mcp` |
| 12 | Design Hub dashboard | `#/t3000/design` |
| 13 | HVAC schematic in the editor | Design Hub ▸ HVAC |
| 14 | LVGL / EEZ Studio editor | Design Hub ▸ LVGL 9.5 |
