# SQL Server Express Setup for T3000 (Detailed Step-by-Step)

<!-- USER-GUIDE -->

This guide is for non-technical users.
Follow each step exactly in order.

Estimated time: 25 to 40 minutes.

## What You Need Before Starting

1. Windows PC with administrator rights.
2. Internet access.
3. T3000 installed.
4. SQL Server Express installer.
5. SQL Server Management Studio (SSMS) installer.

## Step 1: Download SQL Server Express

1. Open your web browser.
2. Go to Microsoft SQL Server download page.
3. Download SQL Server 2022 Express.
4. Save file to Desktop.

Expected file name:
- `SQLEXPR_x64_ENU.exe`

![Step 1 - Download SQL Server Express](images/sql-server-express/01-download.png)

## Step 2: Run SQL Server Express Installer

1. Right-click `SQLEXPR_x64_ENU.exe`.
2. Click `Run as administrator`.
3. Click `Yes` on User Account Control.

![Step 2 - Run installer as administrator](images/sql-server-express/02-run-installer.png)

## Step 3: Install SQL Server Express (Basic)

1. In installer, click `Basic`.
2. Accept license terms.
3. Click `Install`.
4. Wait for completion.

What to check:
1. Installation finishes successfully.
2. Instance name is usually `SQLEXPRESS`.

![Step 3 - SQL Server Express install success](images/sql-server-express/03-install-success.png)

## Step 4: Install SSMS

1. Download SSMS from Microsoft.
2. Run installer as administrator.
3. Click `Install` and wait.

![Step 4 - Install SSMS](images/sql-server-express/04-install-ssms.png)

## Step 5: Open SQL Server Configuration Manager

1. Press Windows key.
2. Search `SQL Server Configuration Manager`.
3. Open it.

![Step 5 - Open SQL Server Configuration Manager](images/sql-server-express/05-open-config-manager.png)

## Step 6: Enable TCP/IP

1. In left panel: `SQL Server Network Configuration`.
2. Click `Protocols for SQLEXPRESS`.
3. Right-click `TCP/IP`.
4. Click `Enable`.

![Step 6 - Enable TCPIP](images/sql-server-express/06-enable-tcpip.png)

## Step 7: Set Port to 1433

1. Double-click `TCP/IP`.
2. Open `IP Addresses` tab.
3. Scroll to bottom `IPAll` section.
4. Set:
   1. `TCP Dynamic Ports` = empty
   2. `TCP Port` = `1433`
5. Click `OK`.

![Step 7 - Set port 1433](images/sql-server-express/07-port-1433.png)

## Step 8: Enable and Start SQL Browser

1. In Configuration Manager, click `SQL Server Services`.
2. Find `SQL Server Browser`.
3. Right-click > `Properties`.
4. Set `Start Mode` to `Automatic`.
5. Click `Apply` and `OK`.
6. Right-click `SQL Server Browser` > `Start`.

![Step 8 - SQL Browser service](images/sql-server-express/08-sql-browser.png)

## Step 9: Restart SQL Server Service

1. Right-click `SQL Server (SQLEXPRESS)`.
2. Click `Restart`.
3. Wait until status is `Running`.

![Step 9 - Restart SQL service](images/sql-server-express/09-restart-sql-service.png)

## Step 10: Open SSMS and Connect (Windows Authentication)

1. Open SSMS.
2. Server name: `localhost\SQLEXPRESS`.
3. Authentication: `Windows Authentication`.
4. Click `Connect`.

![Step 10 - SSMS connect](images/sql-server-express/10-ssms-connect.png)

## Step 11: Enable Mixed Authentication Mode

1. In SSMS Object Explorer, right-click server.
2. Click `Properties`.
3. Click `Security`.
4. Select `SQL Server and Windows Authentication mode`.
5. Click `OK`.

![Step 11 - Enable mixed mode](images/sql-server-express/11-mixed-mode.png)

## Step 12: Restart SQL Service Again

1. Go back to SQL Server Configuration Manager.
2. Restart `SQL Server (SQLEXPRESS)` again.

![Step 12 - Restart after mixed mode](images/sql-server-express/12-restart-after-mixed-mode.png)

## Step 13: Create Database `T3000`

1. In SSMS, right-click `Databases`.
2. Click `New Database...`.
3. Enter name: `T3000`.
4. Click `OK`.

![Step 13 - Create database](images/sql-server-express/13-create-db.png)

## Step 14: Create SQL Login for T3000

1. In SSMS: `Security` > `Logins`.
2. Right-click `Logins` > `New Login...`.
3. Login name: `t3000_user`.
4. Select `SQL Server authentication`.
5. Set password.

![Step 14 - Create login](images/sql-server-express/14-create-login.png)

## Step 15: Map Login to T3000 Database

1. In same `New Login` window, click `User Mapping`.
2. Check database `T3000`.
3. In roles, check `db_owner` (for initial setup).
4. Click `OK`.

![Step 15 - User mapping](images/sql-server-express/15-user-mapping.png)

## Step 16: Add Firewall Rule (Remote SQL Server Only)

Do this only if SQL Server is on a different PC.

1. Open `Windows Defender Firewall with Advanced Security`.
2. `Inbound Rules` > `New Rule`.
3. Rule type: `Port`.
4. Protocol: `TCP`, port: `1433`.
5. Action: `Allow the connection`.
6. Profile: Domain + Private.
7. Name: `SQL Server 1433`.

Optional:
1. Add UDP `1434` for SQL Browser.

![Step 16 - Firewall rule](images/sql-server-express/16-firewall-1433.png)

## Step 17: Open T3000 Database Configuration Page

1. Open T3000.
2. Go to `Database Configuration`.
3. Select backend: `Microsoft SQL Server`.

![Step 17 - Open database page](images/sql-server-express/17-open-t3000-db-page.png)

## Step 18: Fill SQL Connection Fields in T3000

Enter these values:

1. Host / IP:
   1. Local test: `127.0.0.1`
   2. Remote SQL server: use server IP (example `192.168.1.22`)
2. Port: `1433`
3. Instance Name: `SQLEXPRESS`
4. Database Name: `T3000`
5. Username: `t3000_user`
6. Password: your password

![Step 18 - Fill fields](images/sql-server-express/18-fill-fields.png)

## Step 19: Click Test Connection

1. Click `Test Connection`.
2. Wait for success message.

![Step 19 - Test connection](images/sql-server-express/19-test-connection.png)

## Step 20: Click Save Configuration

1. Click `Save Configuration`.
2. Wait for success message.

![Step 20 - Save configuration](images/sql-server-express/20-save-config.png)

## Step 21: Initialize Schema

1. Click `Init Schema`.
2. Wait for success result.

![Step 21 - Init schema](images/sql-server-express/21-init-schema.png)

## Step 22: Restart T3000

1. Close T3000.
2. Restart T3000 application/service.

![Step 22 - Restart T3000](images/sql-server-express/22-restart-t3000.png)

## Step 23: Verify in Dashboard

1. Open Dashboard.
2. Confirm shared DB status is connected.
3. Confirm sync is running.

![Step 23 - Dashboard verification](images/sql-server-express/23-dashboard-verify.png)

## Troubleshooting

### Error: Connection timeout

Check:
1. SQL Server service is running.
2. TCP/IP is enabled.
3. Port 1433 is configured.
4. Firewall allows 1433.
5. Host/IP and port in T3000 are correct.

### Error: Login failed

Check:
1. Mixed authentication mode enabled.
2. Username/password correct.
3. User mapped to T3000 database.
4. User has permission.

### Error: Database not found

Check:
1. Database name is exactly `T3000`.
2. Correct server instance is used.

<!-- TECHNICAL -->

## Technical Checklist

1. SQL Server (SQLEXPRESS) is running.
2. SQL Browser is running.
3. TCP/IP enabled.
4. Static port is 1433.
5. Mixed mode authentication enabled.
6. T3000 database exists.
7. SQL login mapped to T3000 with db_owner.
8. Firewall allows TCP 1433 (remote scenario).
9. T3000 Test Connection succeeds.
10. Save + Init Schema + Restart completed.
