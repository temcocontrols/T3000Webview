# T3000 Center DB Configuration

<!-- USER-GUIDE -->

Use this guide after SQL Server Express setup is complete.

## Step 1: Open Database Configuration in T3000

1. Open T3000.
2. Go to the Database menu.
3. Open Database Configuration.

## Step 2: Select SQL Server Backend

1. Choose backend type: Microsoft SQL Server.
2. Confirm server mode is enabled for center database usage.

## Step 3: Enter Connection Parameters

Fill in the following values:

- Host/Server: SQL Server host IP or hostname
- Port: 1433
- Instance: SQLEXPRESS
- Database: T3000
- Username: t3000_user
- Password: your configured password

## Step 4: Test Connection

1. Click Test Connection.
2. Wait for success confirmation.
3. If failed, verify SQL Server service, TCP/IP, firewall 1433, and credentials.

## Step 5: Save Configuration

1. Click Save Configuration.
2. Re-open the page to confirm values are persisted.

## Step 6: Initialize Schema (First-Time Only)

1. Click Init Schema.
2. Wait until initialization completes without errors.

## Step 7: Set Shared DB Role

1. Primary machine: set role to Server.
2. Secondary machines: set role to Client.
3. Save role settings.

## Step 8: Restart and Verify

1. Restart T3000.
2. Open Dashboard.
3. Verify CENTER DB status is Connected.

## Troubleshooting

- Connection timeout: check SQL Server service status and host reachability.
- Login failed: verify SQL login and password.
- Cannot connect remotely: confirm Windows Firewall allows TCP 1433.
- Schema init error: verify account has create/alter permission on target database.
