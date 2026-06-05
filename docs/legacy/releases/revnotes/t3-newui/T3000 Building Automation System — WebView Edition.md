# T3000 Building Automation System — WebView Edition

## 🔍 Overview

We have built a **new web‑based layout for the T3000 Building Automation System**, designed as an assist system to the existing T3000 desktop application.  

This WebView edition keeps the same layout and features you already know from T3000, but makes them available directly in your browser — on PC, tablet, or mobile.  

It’s essentially the **web version of T3000**: same functionality, same depth, but easier to access and mobile‑ready.

![2](./pic/01.png)

![2](./pic/02.png)
---

## 📋 How to Use It

Getting started is simple:

1. **Open T3000.exe** on your PC and keep it running.  
2. **Leave T3000 open** — it acts as the host and BACnet engine.  
3. **Open a browser** on the same PC or another device on your local network.  
4. **Go to**: `http://localhost:9103/#/t3000/`  
5. The WebView UI will load, showing the same layout and features as the desktop version.  

---

## 🔀 What’s the Same, What’s New, and What’s Next

### Kept the Same

WebView preserves the familiar T3000 layout and workflow. Users can continue operating WebView just as they did in T3000, without relearning the interface. Some features are not yet fully built in WebView but are actively being developed to ensure full parity with the desktop application.

---

**1. Left Panel — Building View & Device Tree**  
Provides a hierarchical view of buildings and devices.  

![Left Panel](./pic/03.png)

---

**2. Top Menu — Navigation**  
Contains the main functions, organized into sub‑menus grouped just like in T3000.  
This grouping ensures users can quickly find related commands under familiar categories.

---

**3. Second Bar — Quick Actions**  
Shortcut bar for frequently used commands.  
When hovering the mouse over an icon, a tooltip appears with more description, making it easier for new users to understand each function.  

![Shortcut Bar](./pic/04.png)

---

**4. Right Area — Detail Views**  
This section displays the main working pages, each with a similar layout to T3000.  
Pages include: Inputs, Outputs, Variables, Programs, Trend Logs, Alarms, Schedules, Configuration.  

![Detail View](./pic/05.png)  

![Detail View](./pic/06.png) 

![Detail View](./pic/07.png)  

![Detail View](./pic/08.png) 

![Detail View](./pic/09.png)

---

**5. Bottom Status Bar — System Health**  
Shows alarms, SD card/device indicators, and overall system health. 

---

### Newly Added

WebView introduces several new features beyond the desktop version. These enhancements extend the familiar T3000 workflow with modern capabilities:

---

**1. Shared Center DB**  
Summary: Shared Center DB changes T3000 from isolated PCs to one shared system.  
Instead of each PC keeping separate data, all PCs connect to one central SQL Server database so users see the same building view.  

For more details, view the documentation here:  
http://localhost:9103/#/t3000/documentation/shared-db/shared-center-db-summary

![Detail View](./pic/10.png)

![Detail View](./pic/11.png)

![Detail View](./pic/12.png)

---

**2. Dashboard Panel**  
Live monitoring of network status, database sync, and trend activity.

![Detail View](./pic/13.png)

![Detail View](./pic/14.png)

---

**3. Mobile Responsive Design**  
Optimized layout for phones and tablets, ensuring smooth operation across devices.

![Detail View](./pic/15.png)

![Detail View](./pic/16.png)

![Detail View](./pic/17.png)

![Detail View](./pic/18.png)

![Detail View](./pic/19.png)

---

**4. Event Log**  
Enhanced logging for debugging and system analysis, with filters for easier tracking.

![Detail View](./pic/20.png)

![Detail View](./pic/21.png)

![Detail View](./pic/22.png) 

---

**5. Built‑in & Development Documentation**  
Integrated help and guides directly within the interface. *

![Detail View](./pic/23.png) 

![Detail View](./pic/24.png) 

![Detail View](./pic/25.png) 

![Detail View](./pic/26.png)  

---

---

## ⚙️ How It Works

The general flow is straightforward:  
- **Field devices** send data and events.  
- **T3000.exe** collects this information and acts as the host.  
- Data is stored either in **local SQLite** (standalone mode) or in a **shared SQL Server database** (center mode).  
- **WebView** reads this data and displays it in the browser, keeping dashboards, trends, and device views consistent across all users.  

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + Fluent UI v9  
- **Backend**: Rust (Axum) + WebSocket  
- **Database**: SQLite (fast local cache), MSSQL (optional center DB)  
- **Device Interface**: FFI calls into T3000.exe BACnet engine   

---

