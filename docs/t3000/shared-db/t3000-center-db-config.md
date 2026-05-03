# T3000 Center DB Configuration

<!-- USER-GUIDE -->

Use this guide to configure a shared central SQL Server database in T3000. This allows multiple T3000 PCs on the same network to share trend logs and device data through one central Microsoft SQL Server instance.

Before starting, make sure SQL Server Express is installed and TCP/IP is enabled. See the [SQL Server Express Setup guide](./sql-server-express-setup.md) if needed.

---

## Step 1: Open T3000 and Update to the Latest Version

Open the T3000 Building Automation System desktop application.

Before configuring the shared database, make sure T3000 is up to date. Click **Help —Check for Updates** in the menu bar and install any available update. The Shared DB feature requires the latest version to work correctly.

![Step 1 —T3000 desktop application](images/t3000/01.png)

---

## Step 2: Go to the Dashboard

In the T3000 webview, click **Dashboard** in the top navigation bar. You can also open the Dashboard directly in a browser:

- **On this PC:** [http://localhost:9103/#/t3000/dashboard](http://localhost:9103/#/t3000/dashboard)
- **From another PC on the same network:** `http://<this-PC-IP>:3003/#/t3000/dashboard` (e.g. `http://192.168.1.22:3003/#/t3000/dashboard`)

You will see two mode cards:

- **Standalone** —stores data locally in SQLite on this PC (currently Active)
- **Shared DB** —connects to a central SQL Server database shared across multiple T3000 PCs

The **Shared DB** card shows *Not configured. Click to connect to a shared SQL Server database.* Click anywhere on the Shared DB card to begin setup.

![Step 2 —Dashboard showing Standalone active and Shared DB not configured](images/t3000/02.png)

---

## Step 3: Click "Connect to Shared DB"

After clicking the Shared DB card, a **Connect to Shared DB —* button appears. Click it to open the Database Configuration page.

![Step 3 —Connect to Shared DB button](images/t3000/03.png)

---

## Step 4: Database Configuration Page

The **Database Configuration** page opens, showing:

- **Centralized Trendlog & Data Storage** —description of the feature
- **Database Status** —currently shows *Standalone · Online*
- **Server / Client Configuration** —toggle is currently **Server Database: Disabled**

![Step 4 —Database Configuration page, standalone mode, server database disabled](images/t3000/04.png)

---

## Step 5: Enable Server Database and Select Role

Toggle **Server Database** to **Enabled**.

Two role cards appear:

- **Server** —this PC writes trend logs and device data to the shared database. Typically the main PC that hosts the SQL Server instance. Data is written to both local SQLite and the server database for redundancy.
- **Client** —this PC reads trend logs and device data from the shared database. It continues to write its own local data to SQLite for offline use.

Select **Server** for the PC hosting the SQL Server instance. Select **Client** for all other PCs.

Under **Backend Type**, select **Microsoft SQL Server**.

![Step 5 —Server Database enabled, Server role selected, Microsoft SQL Server backend](images/t3000/05.png)

---

## Step 6: Enter Connection Settings

Fill in the **Connection Settings —Microsoft SQL Server** fields:

| Field | Description | Example |
|---|---|---|
| Host / IP | IP address or hostname of the SQL Server machine | `192.168.1.100` |
| Port | TCP port SQL Server is listening on | `1433` |
| Instance Name | SQL Server instance name | `SQLEXPRESS` |
| Database Name | Database to use (will be created by Init Schema) | `T3000` |
| Username | SQL login username | `sa` |
| Password | SQL login password | *(your password)* |

Optionally use the **Connection URL** field to override all fields above with a single URL in the format `mssql://user:pass@host:port/dbname`.

To discover SQL Server instances automatically, click **Scan LAN**. The scanner probes ports 1432, 1433, and 1434 on your local subnet and returns all instances found. Click **Use** next to any result to fill in the connection fields automatically.

![Step 6 —Connection Settings fields and Scan LAN section](images/t3000/06.png)

---

## Step 7: Use Scan LAN Results and Save

After scanning, the results show all discovered SQL Server instances. Click **Use** next to the instance you want to connect to. The connection fields are filled in automatically.

Once the fields are set, click **Save Configuration**. A success banner confirms:

> **Success** Server Database server mode + Microsoft SQL Server settings saved. Restart T3000 to apply.

> **Note:** If SQL Server Browser service is not running on the target machine, instances may appear as *TCP port check only* without an instance name. In this case, enter the instance name manually.

![Step 7 —Scan results with 192.168.1.22:1432 selected, save success banner](images/t3000/07.png)

---

## Step 8: Test Connection

Click **Test Connection** to verify the credentials and network connectivity.

If the database does not exist yet, a notice appears:

> **Notice** Connected to SQL Server —authentication OK. Database 'T3000' does not exist yet. Click 'Init Schema' to create it.

This is expected for a first-time setup. Authentication succeeded —the database just needs to be initialized.

If connection fails, check:
- SQL Server service is running
- TCP/IP is enabled in SQL Server Configuration Manager
- Windows Firewall allows the configured port (1433 or 1432)
- Username and password are correct

![Step 8 —Test Connection clicked, authentication OK, database not yet created](images/t3000/08.png)

---

## Step 9: Initialize the Schema

Click **Init Schema** to create all required T3000 tables (inputs, outputs, variables, trend logs, etc.) on the server database.

> Init Schema is safe to run multiple times. It will not delete existing data.

![Step 9 —Init Schema button with tooltip](images/t3000/09.png)

---

## Step 10: Schema Initialization Complete

A success banner confirms:

> **Success** Schema initialized —179 statements executed.

All T3000 tables have been created on the SQL Server database. The server is now ready to receive data.

![Step 10 —Schema initialized successfully, 179 statements executed](images/t3000/10.png)

---

## Step 11: Restart T3000 to Activate

Return to the Dashboard. The **Shared DB** card now shows:

> *Shared DB (Server) saved —restart T3000 to activate.*
> **Database Configuration —*

Close and reopen T3000 to apply the new configuration.

![Step 11 —Dashboard showing Shared DB saved, restart required](images/t3000/11.png)

---

## Step 12: Verify —Shared DB Active After Restart

After restarting T3000, the Dashboard shows **Shared DB** as **Active** with badges:

- **Server** —this PC is the server role
- **SQL Server** —connected to Microsoft SQL Server
- **Connected** —connection is live

The **Network Overview** section shows:

- **Server (This PC)** —Online, with the machine hostname and IP address
- *No client PCs connected yet. Clients appear once they send heartbeats.* —this will populate as Client PCs connect

T3000 Field Devices shows all devices in the building.

![Step 12 —Dashboard after restart, Shared DB Active, Server Online, Network Overview](images/t3000/12.png)

---

## Step 13: Confirm Sync & Database Health

Scroll down on the Dashboard to see:

**System Overview** shows:
- **Shared DB** —Connected
- **SQL Server · Server** —active backend and role
- **DB Size** —the current size of the SQL Server database (e.g. 16.0 MB at `D:\Program Files\Microsoft\...`)

**Sync & Database Health** shows:
- **Connected** badge, SQL Server, Direct write mode
- **Center DB Target** —`SQL Server · 192.168.x.x / T3000`
- Last Sync, Devices Today, Records Today —populate as sync cycles run

**Trend Logs —Last 24 Hours** shows trend data from all tracked points once devices begin polling:
- **Tracked** —number of tracked data points
- **Sampling Active** —points actively recording in the last 2 hours
- **Records (24h)** —total records written in the last 24 hours
- **Last Sample** —timestamp of the most recent data point

![Step 13 —Dashboard System Overview Connected, Sync & Database Health, Trend Logs data](images/t3000/13.png)

---

## Troubleshooting

If you run into issues, first check that SQL Server Express is correctly installed and configured —most connection problems start there. See the **[SQL Server Express Setup guide](./sql-server-express-setup.md)** for the full installation and configuration walkthrough, including how to:

- Enable TCP/IP in SQL Server Configuration Manager
- Set a static port (1433 or 1432)
- Create a SQL login with the right permissions
- Open the correct port in Windows Firewall
- Start the SQL Server Browser service

| Symptom | Likely Cause | Fix |
|---|---|---|
| Connection timeout | SQL Server service stopped or unreachable | Start the SQL Server service; verify network connectivity and firewall rules |
| Login failed | Wrong username or password | Check SQL login credentials; confirm **SQL Server Authentication** is enabled (not Windows-only) |
| Cannot connect remotely | Windows Firewall blocking the port | Allow TCP 1432 or 1433 inbound —see [SQL Server Express Setup](./sql-server-express-setup.md) |
| Database does not exist | First-time setup, database not yet created | Run **Init Schema** after Test Connection shows "authentication OK" |
| Schema init error | Insufficient permissions on the SQL login | Ensure the SQL login has `CREATE DATABASE` and `CREATE TABLE` rights |
| Scan LAN finds no instances | SQL Server Browser service not running | Start the **SQL Server Browser** service on the target machine |
| Instance shows "TCP port check only" | SQL Browser not running, instance name unknown | Start SQL Server Browser, or enter the instance name manually in the connection fields |
| Dashboard still shows Standalone after save | T3000 not restarted after saving | Close and reopen T3000 to apply the new configuration |
| T3000 feature missing or not working | Running an older version of T3000 | Click **Help —Check for Updates** and install the latest version |

---

## Summary

The following table shows the complete setup flow at a glance:

| Step | Action | Result |
|---|---|---|
| 1 | Open T3000, click **Help —Check for Updates** | T3000 is on the latest version |
| 2 | Open Dashboard in browser (`localhost:9103` or `ip:3003`) | Dashboard visible |
| 3 | Click **Shared DB** card —**Connect to Shared DB —* | Opens Database Configuration page |
| 4 | Review Database Configuration page | Currently in Standalone mode |
| 5 | Enable **Server Database**, select **Server** role, select **Microsoft SQL Server** | Server DB enabled |
| 6 | Fill in Host / IP, Port, Instance Name, Database, Username, Password | Connection fields ready |
| 7 | Click **Scan LAN** —click **Use** next to target instance —click **Save Configuration** | Configuration saved |
| 8 | Click **Test Connection** | Authentication OK (database may not exist yet —that's normal) |
| 9 | Click **Init Schema** | Schema creation starts |
| 10 | Wait for success banner: *179 statements executed* | All T3000 tables created on SQL Server |
| 11 | Return to Dashboard, see restart prompt —close and reopen T3000 | T3000 restarts with new config |
| 12 | Dashboard shows **Shared DB · Active · Connected** | Server is live and receiving data |
| 13 | Check **Sync & Database Health** and **Trend Logs** sections | Data flowing into SQL Server |

> For Client PC setup, repeat Steps 1— on each client PC, selecting **Client** role in Step 5. No Init Schema is needed on client PCs.


