# Shared Center DB — Overview

<!-- USER-GUIDE -->

Use this page to understand what Shared Center DB is and whether you need it. If you manage multiple T3000 PCs and want them to share trend logs and device data across the network — this is the feature for you.

- Full SQL Server install steps: [SQL Server Express Setup](./sql-server-express-setup.md)
- Full T3000 UI walkthrough: [T3000 Center DB Configuration](./t3000-center-db-config.md)

---

## 1. What Is It?

**Summary:** Shared Center DB changes T3000 from isolated PCs to one shared system. Instead of each PC keeping separate data, all PCs connect to one central SQL Server database so users see the same building view.

**How to read this figure:**
1. **Before (left):** each PC is standalone with its own local SQLite data.
2. **After (right):** one host PC runs SQL Server and all other PCs connect as clients.
3. **Dashboard panel:** users monitor shared network status, DB sync health, and trend activity from one place.

<div style="padding:16px 0;">

<table style="width:100%; border-collapse:collapse; border:none; background:none; margin:0; padding:0;">
<tr>
<th style="width:1%; white-space:nowrap; border:none; background:none; text-align:left; padding:4px 8px; margin:0;">BEFORE — Standalone Mode</th>
<th style="border:none; background:none; text-align:left; padding:4px 8px; margin:0;">AFTER — Shared Center DB</th>
</tr>
<tr>
<td valign="top" style="width:1%; white-space:nowrap; border:none; padding:4px 8px; margin:0;">
<pre>
+----------+ +----------+ +----------+ +----------+
|  PC-A    | |  PC-B    | |  PC-C    | |  PC-D    |
|  T3000   | |  T3000   | |  T3000   | |  T3000   |
|  SQLite  | |  SQLite  | |  SQLite  | |  SQLite  |
+----------+ +----------+ +----------+ +----------+

Each PC is isolated.
No shared trends or device data.
No central monitoring or view.

Local databases only.
No network synchronization.
No data sharing across PCs.

Every PC stores data locally.
Completely independent operation.
No LAN communication between PCs.
</pre>
</td>
<td valign="top" style="border:none; padding:4px 8px; margin:0;">
<pre>
+--------+ +--------+ +--------+ +--------+    +------------------------------+
| PC-A   | | PC-B   | | PC-C   | | PC-D   |    | Dashboard - Live Monitoring  |
| SERVER | | client | | client | | client |    |------------------------------|
+---+----+ +---+----+ +---+----+ +---+----+    |  Network:  4 PCs Online      |
    |           |           |          |        |    PC-A  Server   Online     |
    +-----------+-----------+----------+        |    PC-B  Client   Online     |
                      |                    +--->|    PC-C  Client   Online     |
        +-------------+--------+           |    |    PC-D  Client   Online     |
        | SQL Server Express   |           |    |------------------------------|
        | on PC-A              |           |    |  DB Sync:  Connected         |
        +----------+-----------+           |    |  DB Size:  16 MB             |
                   |                       |    |------------------------------|
        +----------+-----------+           |    |  Trends:   Sampling Active   |
        | Center DB: T3000     |-----------+    |  Last Sync: just now         |
        | trends/dev/sync      |                +------------------------------+
        +----------------------+

All PCs share one database. One view across the building.
</pre>
</td>
</tr>
</table>

</div>

---

## 2. How It Works

**Summary:** Field data is collected by the Server PC, written to the Center DB, then read by all Client PCs. This keeps dashboards and trends consistent across the team.

**Runtime flow (simple):**
1. Field devices publish values and events.
2. Server PC collects data and writes shared/trend data to the center SQL DB.
3. Client PCs read shared/trend data from the center SQL DB and show the same status and trends.
4. Local SQLite keeps core local runtime info (not trendlog storage).

```
  [Field Devices]          [Server PC - PC-A]        [SQL Server]
  +------------+           +----------------+         +----------+
  | Sensors    |--collect->| T3000 collects |--write->| Center   |
  | BACnet     |           | and writes     |         | DB:T3000 |
  | Modbus     |           +----------------+         +----+-----+
  +------------+                                           |
                                                           |
                                    +----------------------+
                                    |
                  +--------+  +--------+  +--------+
                  | PC-B   |  | PC-C   |  | PC-D   |
                  | client |  | client |  | client |
                  +--------+  +--------+  +--------+
                  Read shared trends and device data over LAN.
```

- **Server PC** — writes shared/trend data to the center SQL DB; local SQLite keeps core local runtime info only
- **Client PCs** — read shared/trend data from the center SQL DB; local SQLite keeps core local runtime info for offline continuity

---

## 3. Setup — Two Phases

**Summary:** This setup gives your team one shared view of the building. Users on any T3000 PC can see the same trends, device data, and connection status in real time.

**How to use this section:**
1. Do **Phase 1** once on the main PC that will host SQL Server.
2. Do **Phase 2** on every T3000 PC:
      - Host PC = **Server** role
      - All other PCs = **Client** role

<div style="padding:16px 0;">

<table style="width:100%; border-collapse:collapse; border:none; background:none; margin:0; padding:0;">
<tr>
<th style="width:50%; border:none; background:none; text-align:left; padding:4px 8px; margin:0;">Phase 1 — Host PC only (~30 min)</th>
<th style="width:50%; border:none; background:none; text-align:left; padding:4px 8px; margin:0;">Phase 2 — Each T3000 PC (~5 min)</th>
</tr>
<tr>
<td valign="top" style="border:none; padding:4px 8px; margin:0;">
<pre>
[Download SQL Server]     [Run Installer]
SQL2022-SSEI-Expr.exe     Instance: SQLEXPRESS
From microsoft.com        Mixed Mode Auth
      |                        |
      +--------+--------+------+
               |
[Enable TCP/IP]           [Configure Firewall]
Config Manager            Windows Defender
Protocols -> TCP/IP       Allow Inbound TCP 1433
Port: 1433                All profiles
      |                        |
      +--------+--------+------+
               |
[Create SQL Login]        [Start Services]
Login: sa or custom       SQL Server: Running
Auth: SQL authenticated   SQL Browser: Running
Password: strong (8+)     Verify port 1433 open
      |                        |
      +--------+--------+------+
               |
      [SQL Server Ready]
</pre>
</td>
<td valign="top" style="border:none; padding:4px 8px; margin:0;">
<pre>
[Open Dashboard]          [Click Shared DB]
Start T3000 app           Status: Standalone
localhost:3003            -> Connect to Shared DB
      |                        |
      +--------+--------+------+
               |
[Enable Server Database]  [Select Role]
Toggle: OFF -> ON         SERVER: host PC only
Unlocks Shared DB config  CLIENT: all other PCs
      |                        |
      +--------+--------+------+
               |
[Enter SQL Connection]    [Test Connection]
Host: 192.168.1.100       Click Test Connection
Port: 1433                Should show: "Auth OK"
Instance: SQLEXPRESS      Then: Init Schema (179 stmts)
DB: T3000
User/Pass: sa credentials
      |                        |
      +--------+--------+------+
               |
[Save & Restart T3000]
Dashboard shows: Shared DB Active
</pre>
</td>
</tr>
</table>

</div>

---

## 4. Server vs Client Role

| Role | Choose when | What it does |
|---|---|---|
| **Server** | This PC hosts SQL Server | Writes to center DB + local SQLite |
| **Client** | Any other PC on the LAN | Reads from center DB, keeps local SQLite |

One Server. All other PCs are Clients.

---

## 5. What Success Looks Like

After saving the configuration and restarting T3000, open the Dashboard at `localhost:3003`. You should see:

```
  +--------------------------------------------------+
  |  Shared DB                               ACTIVE  |
  |  SQL Server . Server                  Connected  |
  |                                                  |
  |  Network Overview                                |
  |    Server (This PC)   192.168.1.100     Online   |
  |    Client - PC-B      192.168.1.101     Online   |
  |    Client - PC-C      192.168.1.102     Online   |
  |                                                  |
  |  Sync & DB Health     Connected                  |
  |  Center DB Target     SQL Server / T3000         |
  |  Trend Logs (24h)     Sampling Active            |
  +--------------------------------------------------+
```

---

## 6. Quick Troubleshooting

| Symptom | Likely Cause | First Check |
|---|---|---|
| Connection timeout | SQL service stopped or firewall blocking | Start SQL service; allow TCP 1433 inbound |
| Login failed | Wrong credentials or Windows-only auth mode | Check username/password; enable Mixed Mode |
| Instance not found by Scan LAN | SQL Browser service not running | Start SQL Server Browser, or enter instance manually |
| Still shows Standalone after save | T3000 not restarted | Close and reopen T3000 |

---

## 7. Next Steps

- **Set up SQL Server on the host PC:** [SQL Server Express Setup](./sql-server-express-setup.md)
- **Configure T3000 UI on each PC:** [T3000 Center DB Configuration](./t3000-center-db-config.md)
