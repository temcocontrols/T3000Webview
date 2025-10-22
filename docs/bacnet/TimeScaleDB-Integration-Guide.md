# SQLite Integration Guide for T3000 BACnet System

**Date:** July 29, 2025
**Project:** T3000 BACnet SQLite Integration
**Purpose:** Complete guide for SQLite setup and optimization for IoT time-series data

## Overview

This guide provides comprehensive instructions for setting up and optimizing SQLite for the T3000 BACnet data polling system. SQLite is a lightweight, file-based database that provides excellent performance for IoT time-series data collection with minimal setup requirements.

## SQLite Installation Guide

### Windows Installation

SQLite is embedded and requires no separate installation. Simply install the Node.js SQLite3 package:

```powershell
# Install SQLite3 for Node.js
npm install sqlite3
npm install @types/sqlite3  # For TypeScript support

# Alternatively, use better-sqlite3 for improved performance
npm install better-sqlite3
npm install @types/better-sqlite3
```

### Database File Setup
```powershell
# Create data directory
mkdir data
cd data

# SQLite database will be created automatically when first accessed
# Database file: ./data/t3000_bacnet.db
```

### Development vs Production Setup
```javascript
// Development configuration
const dbPath = './data/t3000_bacnet_dev.db';

// Production configuration
const dbPath = process.env.NODE_ENV === 'production'
    ? './data/t3000_bacnet.db'
    : './data/t3000_bacnet_dev.db';
```

## Database Schema Design

### Core Schema Implementation
```sql
-- SQLite Schema for T3000 BACnet System
-- No need for extensions or complex setup

-- Create enum-like tables for data integrity (SQLite doesn't have native enums)
CREATE TABLE device_status_enum (
    status TEXT PRIMARY KEY CHECK (status IN ('active', 'inactive', 'error', 'maintenance'))
);

INSERT INTO device_status_enum VALUES ('active'), ('inactive'), ('error'), ('maintenance');

CREATE TABLE object_type_enum (
    type TEXT PRIMARY KEY CHECK (type IN ('AI', 'AO', 'DI', 'DO', 'AV', 'BV'))
);

INSERT INTO object_type_enum VALUES ('AI'), ('AO'), ('DI'), ('DO'), ('AV'), ('BV');

CREATE TABLE data_quality_enum (
    quality TEXT PRIMARY KEY CHECK (quality IN ('good', 'bad', 'uncertain', 'error'))
);

INSERT INTO data_quality_enum VALUES ('good'), ('bad'), ('uncertain'), ('error');

-- Device registry table
CREATE TABLE devices (
    device_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bacnet_device_id INTEGER UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    port INTEGER DEFAULT 47808,
    vendor_id INTEGER,
    vendor_name TEXT,
    model_name TEXT,
    firmware_version TEXT,
    application_software_version TEXT,
    supports_block_read BOOLEAN DEFAULT 0,
    max_apdu_length INTEGER DEFAULT 1476,
    segmentation_supported BOOLEAN DEFAULT 0,
    location TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' REFERENCES device_status_enum(status),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient device lookups
CREATE INDEX idx_devices_bacnet_id ON devices(bacnet_device_id);
CREATE INDEX idx_devices_ip ON devices(ip_address);
CREATE INDEX idx_devices_status ON devices(status);

-- BACnet objects table
CREATE TABLE bacnet_objects (
    object_id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    object_type TEXT NOT NULL REFERENCES object_type_enum(type),
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    description TEXT,
    units TEXT,
    cov_increment REAL,
    poll_interval INTEGER DEFAULT 30, -- seconds
    enabled BOOLEAN DEFAULT 1,
    min_value REAL,
    max_value REAL,
    resolution REAL,
    out_of_service BOOLEAN DEFAULT 0,
    reliability TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, object_type, object_instance)
);

-- Create indexes for efficient object queries
CREATE INDEX idx_objects_device ON bacnet_objects(device_id);
CREATE INDEX idx_objects_type ON bacnet_objects(object_type);
CREATE INDEX idx_objects_enabled ON bacnet_objects(enabled);

-- Main time-series data table (partitioned by date for performance)
CREATE TABLE sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_id INTEGER NOT NULL,
    object_id INTEGER NOT NULL REFERENCES bacnet_objects(object_id),
    object_type TEXT NOT NULL REFERENCES object_type_enum(type),
    object_instance INTEGER NOT NULL,
    value REAL,
    raw_value TEXT, -- JSON string for original BACnet value
    quality TEXT DEFAULT 'good' REFERENCES data_quality_enum(quality),
    reliability TEXT,
    priority_array TEXT, -- JSON string for BACnet priority array
    poll_duration_ms INTEGER, -- Performance tracking
    block_read_id TEXT, -- UUID for grouping related block reads
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for time-series queries (SQLite optimization)
CREATE INDEX idx_sensor_data_timestamp ON sensor_data (timestamp DESC);
CREATE INDEX idx_sensor_data_device_time ON sensor_data (device_id, timestamp DESC);
CREATE INDEX idx_sensor_data_object_time ON sensor_data (object_id, timestamp DESC);
CREATE INDEX idx_sensor_data_type_time ON sensor_data (object_type, timestamp DESC);
CREATE INDEX idx_sensor_data_block_read ON sensor_data (block_read_id) WHERE block_read_id IS NOT NULL;

-- Polling statistics table
CREATE TABLE polling_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_id INTEGER NOT NULL REFERENCES devices(device_id),
    total_objects INTEGER NOT NULL,
    successful_reads INTEGER NOT NULL,
    failed_reads INTEGER NOT NULL,
    block_reads_used INTEGER DEFAULT 0,
    individual_reads_used INTEGER DEFAULT 0,
    total_duration_ms INTEGER NOT NULL,
    average_response_ms REAL,
    errors TEXT -- JSON string for error details
);

-- Create index for polling statistics
CREATE INDEX idx_polling_stats_timestamp ON polling_statistics(timestamp DESC);
CREATE INDEX idx_polling_stats_device ON polling_statistics(device_id);

-- System events table for monitoring
CREATE TABLE system_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL, -- discovery, error, config_change, etc.
    device_id INTEGER REFERENCES devices(device_id),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    details TEXT, -- JSON string
    resolved BOOLEAN DEFAULT 0,
    resolved_at DATETIME
);

CREATE INDEX idx_system_events_timestamp ON system_events(timestamp DESC);
CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_severity ON system_events(severity);
```

### Aggregated Views for Performance
```sql
-- Create views for common aggregations (SQLite doesn't have materialized views)
-- These can be updated periodically or computed on-demand

-- Hourly aggregations view
CREATE VIEW sensor_data_hourly AS
SELECT
    datetime(timestamp, 'start of hour') AS hour,
    device_id,
    object_id,
    object_type,
    COUNT(*) as sample_count,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    -- SQLite doesn't have STDDEV, so we calculate manually or use a simpler approach
    COUNT(CASE WHEN quality = 'good' THEN 1 END) as good_samples,
    COUNT(CASE WHEN quality != 'good' THEN 1 END) as bad_samples
FROM sensor_data
GROUP BY
    datetime(timestamp, 'start of hour'),
    device_id,
    object_id,
    object_type;

-- Daily aggregations view
CREATE VIEW sensor_data_daily AS
SELECT
    date(timestamp) AS day,
    device_id,
    object_id,
    object_type,
    COUNT(*) as sample_count,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    -- First and last values (SQLite approach)
    (SELECT value FROM sensor_data s2
     WHERE s2.device_id = sensor_data.device_id
       AND s2.object_id = sensor_data.object_id
       AND date(s2.timestamp) = date(sensor_data.timestamp)
     ORDER BY s2.timestamp ASC LIMIT 1) as first_value,
    (SELECT value FROM sensor_data s2
     WHERE s2.device_id = sensor_data.device_id
       AND s2.object_id = sensor_data.object_id
       AND date(s2.timestamp) = date(sensor_data.timestamp)
     ORDER BY s2.timestamp DESC LIMIT 1) as last_value
FROM sensor_data
GROUP BY
    date(timestamp),
    device_id,
    object_id,
    object_type;

-- Device performance view
CREATE VIEW device_performance_hourly AS
SELECT
    datetime(timestamp, 'start of hour') AS hour,
    device_id,
    COUNT(*) as poll_count,
    AVG(total_duration_ms) as avg_poll_time,
    SUM(successful_reads) as total_successful,
    SUM(failed_reads) as total_failed,
    AVG(CASE WHEN total_objects > 0 THEN (CAST(successful_reads AS REAL) / total_objects) * 100 ELSE 0 END) as success_rate
FROM polling_statistics
GROUP BY
    datetime(timestamp, 'start of hour'),
    device_id;
```### Data Retention and Cleanup
```sql
-- SQLite doesn't have automatic retention policies, so we create manual cleanup procedures

-- Trigger to update 'updated_at' timestamp
CREATE TRIGGER update_devices_timestamp
AFTER UPDATE ON devices
FOR EACH ROW
BEGIN
    UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE device_id = NEW.device_id;
END;

CREATE TRIGGER update_objects_timestamp
AFTER UPDATE ON bacnet_objects
FOR EACH ROW
BEGIN
    UPDATE bacnet_objects SET updated_at = CURRENT_TIMESTAMP WHERE object_id = NEW.object_id;
END;

-- Cleanup procedures (to be run periodically)
-- Delete sensor data older than 90 days
-- DELETE FROM sensor_data WHERE timestamp < datetime('now', '-90 days');

-- Delete polling statistics older than 1 year
-- DELETE FROM polling_statistics WHERE timestamp < datetime('now', '-365 days');

-- Delete resolved system events older than 180 days
-- DELETE FROM system_events WHERE resolved = 1 AND resolved_at < datetime('now', '-180 days');
```

### Database Optimization
```sql
-- SQLite optimization settings and procedures

-- PRAGMA settings for performance (set at connection time)
-- PRAGMA journal_mode = WAL;              -- Write-Ahead Logging for better concurrency
-- PRAGMA synchronous = NORMAL;            -- Balance between safety and performance
-- PRAGMA cache_size = 10000;              -- Increase cache size (pages)
-- PRAGMA temp_store = memory;             -- Store temporary tables in memory
-- PRAGMA mmap_size = 268435456;           -- Memory-mapped I/O (256MB)

-- Analyze tables periodically for query optimization
-- ANALYZE;

-- Vacuum to reclaim space (run periodically)
-- VACUUM;

-- Create additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_type_time
ON sensor_data(device_id, object_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_data_recent
ON sensor_data(timestamp DESC)
WHERE timestamp > datetime('now', '-1 day');

-- Partial index for good quality data
CREATE INDEX IF NOT EXISTS idx_sensor_data_good_quality
ON sensor_data(object_id, timestamp DESC)
WHERE quality = 'good';
```

## Database Connection and Configuration

### Node.js Integration
```typescript
// database.ts - SQLite integration
import Database from 'better-sqlite3';
import path from 'path';

interface DatabaseConfig {
    filePath: string;
    readOnly?: boolean;
    verbose?: boolean;
    timeout?: number;
}

export class SQLiteConnection {
    private db: Database.Database;
    private filePath: string;

    constructor(config: DatabaseConfig) {
        this.filePath = config.filePath;

        // Ensure data directory exists
        const dir = path.dirname(this.filePath);
        if (!require('fs').existsSync(dir)) {
            require('fs').mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(this.filePath, {
            readonly: config.readOnly || false,
            verbose: config.verbose ? console.log : undefined,
            timeout: config.timeout || 5000
        });

        this.setupDatabase();
    }

    private setupDatabase(): void {
        // Enable WAL mode and optimize for time-series data
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 10000');
        this.db.pragma('temp_store = memory');
        this.db.pragma('mmap_size = 268435456'); // 256MB

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');

        console.log('SQLite database configured for optimal performance');
    }

    query(sql: string, params?: any[]): any {
        const start = Date.now();
        try {
            const stmt = this.db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            const duration = Date.now() - start;

            if (process.env.NODE_ENV === 'development') {
                console.log('Executed query', {
                    sql: sql.substring(0, 100) + '...',
                    duration,
                    rows: result.length
                });
            }

            return { rows: result, rowCount: result.length };
        } catch (error) {
            const duration = Date.now() - start;
            console.error('Query error', { sql, duration, error });
            throw error;
        }
    }

    run(sql: string, params?: any[]): Database.RunResult {
        const stmt = this.db.prepare(sql);
        return params ? stmt.run(...params) : stmt.run();
    }

    prepare(sql: string): Database.Statement {
        return this.db.prepare(sql);
    }

    transaction<T>(fn: () => T): T {
        return this.db.transaction(fn)();
    }

    close(): void {
        this.db.close();
    }

    // Health check method
    healthCheck(): boolean {
        try {
            const result = this.query('SELECT 1 as health');
            return result.rows[0]?.health === 1;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    // Backup method
    backup(backupPath: string): void {
        this.db.backup(backupPath);
    }

    // Maintenance operations
    vacuum(): void {
        this.db.exec('VACUUM');
    }

    analyze(): void {
        this.db.exec('ANALYZE');
    }
}

// Initialize database connection
const dbConfig: DatabaseConfig = {
    filePath: process.env.DB_PATH || './data/t3000_bacnet.db',
    verbose: process.env.NODE_ENV === 'development'
};

export const db = new SQLiteConnection(dbConfig);
    user: process.env.DB_USER || 't3000_user',
    password: process.env.DB_PASSWORD || 'secure_password123',
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
};

export const db = new TimeScaleDBConnection(dbConfig);
```

### Data Access Layer
```typescript
// data-access.ts
import { db } from './database';

export interface SensorReading {
    timestamp: Date;
    deviceId: number;
    objectId: number;
    objectType: string;
    objectInstance: number;
    value: number;
    quality: string;
    pollDuration?: number;
    blockReadId?: string;
}

export interface Device {
    deviceId: number;
    bacnetDeviceId: number;
    deviceName: string;
    ipAddress: string;
    port: number;
    supportsBlockRead: boolean;
    status: string;
}

export class SensorDataRepository {
    // Batch insert for high performance using SQLite transaction
    insertSensorReadings(readings: SensorReading[]): void {
        if (readings.length === 0) return;

        const insertStmt = db.prepare(`
            INSERT INTO sensor_data (
                timestamp, device_id, object_id, object_type,
                object_instance, value, quality, poll_duration_ms, block_read_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((readings: SensorReading[]) => {
            for (const reading of readings) {
                insertStmt.run(
                    reading.timestamp.toISOString(),
                    reading.deviceId,
                    reading.objectId,
                    reading.objectType,
                    reading.objectInstance,
                    reading.value,
                    reading.quality,
                    reading.pollDuration || null,
                    reading.blockReadId || null
                );
            }
        });

        try {
            insertMany(readings);
        } catch (error) {
            console.error('Batch insert failed:', error);
            throw error;
        }
    }

    // Get latest readings for a device
    getLatestReadings(deviceId: number, limit: number = 100): SensorReading[] {
        const query = `
            SELECT
                timestamp, device_id, object_id, object_type,
                object_instance, value, quality, poll_duration_ms, block_read_id
            FROM sensor_data
            WHERE device_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `;

        const result = db.query(query, [deviceId, limit]);
        return result.rows.map(this.mapRowToReading);
    }

    // Get time-series data for trend analysis
    getTrendData(
        objectId: number,
        startTime: Date,
        endTime: Date,
        aggregation: 'raw' | 'hourly' | 'daily' = 'raw'
    ): any[] {
        let query: string;

        switch (aggregation) {
            case 'hourly':
                query = `
                    SELECT
                        datetime(timestamp, 'start of hour') as timestamp,
                        AVG(value) as value,
                        MIN(value) as min_value,
                        MAX(value) as max_value,
                        COUNT(*) as sample_count
                    FROM sensor_data
                    WHERE object_id = ? AND timestamp BETWEEN ? AND ?
                    GROUP BY datetime(timestamp, 'start of hour')
                    ORDER BY timestamp
                `;
                break;
            case 'daily':
                query = `
                    SELECT
                        date(timestamp) as timestamp,
                        AVG(value) as value,
                        MIN(value) as min_value,
                        MAX(value) as max_value,
                        COUNT(*) as sample_count
                    FROM sensor_data
                    WHERE object_id = ? AND timestamp BETWEEN ? AND ?
                    GROUP BY date(timestamp)
                    ORDER BY timestamp
                `;
                break;
            default:
                query = `
                    SELECT timestamp, value, quality
                    FROM sensor_data
                    WHERE object_id = ? AND timestamp BETWEEN ? AND ?
                    ORDER BY timestamp
                `;
        }

        const result = db.query(query, [objectId, startTime.toISOString(), endTime.toISOString()]);
        return result.rows;
    }

    private mapRowToReading(row: any): SensorReading {
        return {
            timestamp: new Date(row.timestamp),
            deviceId: row.device_id,
            objectId: row.object_id,
            objectType: row.object_type,
            objectInstance: row.object_instance,
            value: row.value,
            quality: row.quality,
            pollDuration: row.poll_duration_ms,
            blockReadId: row.block_read_id
        };
    }
}

export class DeviceRepository {
    insertOrUpdateDevice(device: Partial<Device>): number {
        const query = `
            INSERT INTO devices (
                bacnet_device_id, device_name, ip_address, port,
                supports_block_read, status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (bacnet_device_id)
            DO UPDATE SET
                device_name = excluded.device_name,
                ip_address = excluded.ip_address,
                port = excluded.port,
                supports_block_read = excluded.supports_block_read,
                status = excluded.status,
                updated_at = CURRENT_TIMESTAMP,
                last_seen = CURRENT_TIMESTAMP
            RETURNING device_id
        `;

        const result = db.run(query, [
            device.bacnetDeviceId,
            device.deviceName,
            device.ipAddress,
            device.port || 47808,
            device.supportsBlockRead ? 1 : 0,
            device.status || 'active'
        ]);

        return result.lastInsertRowid as number;
    }

    getAllActiveDevices(): Device[] {
        const query = `
            SELECT device_id, bacnet_device_id, device_name, ip_address,
                   port, supports_block_read, status
            FROM devices
            WHERE status = 'active'
            ORDER BY device_name
        `;

        const result = db.query(query);
        return result.rows.map(row => ({
            deviceId: row.device_id,
            bacnetDeviceId: row.bacnet_device_id,
            deviceName: row.device_name,
            ipAddress: row.ip_address,
            port: row.port,
            supportsBlockRead: row.supports_block_read === 1,
            status: row.status
        }));
    }
}
        ]);

        const query = `
            INSERT INTO sensor_data (
                timestamp, device_id, object_id, object_type,
                object_instance, value, quality, poll_duration_ms, block_read_id
            ) VALUES ${values}
        `;

        await db.query(query, params);
    }

    // Get latest readings for a device
    async getLatestReadings(deviceId: number, limit: number = 100): Promise<SensorReading[]> {
        const query = `
            SELECT
                timestamp, device_id, object_id, object_type,
                object_instance, value, quality, poll_duration_ms, block_read_id
            FROM sensor_data
            WHERE device_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
        `;

        const result = await db.query(query, [deviceId, limit]);
        return result.rows.map(this.mapRowToReading);
    }

    // Get time-series data for trend analysis
    async getTrendData(
        objectId: number,
        startTime: Date,
        endTime: Date,
        aggregation: 'raw' | 'hourly' | 'daily' = 'raw'
    ): Promise<any[]> {
        let query: string;

        switch (aggregation) {
            case 'hourly':
                query = `
                    SELECT hour as timestamp, avg_value as value, min_value, max_value, sample_count
                    FROM sensor_data_hourly
                    WHERE object_id = $1 AND hour BETWEEN $2 AND $3
                    ORDER BY hour
                `;
                break;
            case 'daily':
                query = `
                    SELECT day as timestamp, avg_value as value, min_value, max_value, sample_count
                    FROM sensor_data_daily
                    WHERE object_id = $1 AND day BETWEEN $2 AND $3
                    ORDER BY day
                `;
                break;
            default:
                query = `
                    SELECT timestamp, value, quality
                    FROM sensor_data
                    WHERE object_id = $1 AND timestamp BETWEEN $2 AND $3
                    ORDER BY timestamp
                `;
        }

        const result = await db.query(query, [objectId, startTime, endTime]);
        return result.rows;
    }

    private mapRowToReading(row: any): SensorReading {
        return {
            timestamp: row.timestamp,
            deviceId: row.device_id,
            objectId: row.object_id,
            objectType: row.object_type,
            objectInstance: row.object_instance,
            value: row.value,
            quality: row.quality,
            pollDuration: row.poll_duration_ms,
            blockReadId: row.block_read_id
        };
    }
}

export class DeviceRepository {
    async insertOrUpdateDevice(device: Partial<Device>): Promise<number> {
        const query = `
            INSERT INTO devices (
                bacnet_device_id, device_name, ip_address, port,
                supports_block_read, status, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (bacnet_device_id)
            DO UPDATE SET
                device_name = EXCLUDED.device_name,
                ip_address = EXCLUDED.ip_address,
                port = EXCLUDED.port,
                supports_block_read = EXCLUDED.supports_block_read,
                status = EXCLUDED.status,
                updated_at = NOW(),
                last_seen = NOW()
            RETURNING device_id
        `;

        const result = await db.query(query, [
            device.bacnetDeviceId,
            device.deviceName,
            device.ipAddress,
            device.port || 47808,
            device.supportsBlockRead || false,
            device.status || 'active'
        ]);

        return result.rows[0].device_id;
    }

    async getAllActiveDevices(): Promise<Device[]> {
        const query = `
            SELECT device_id, bacnet_device_id, device_name, ip_address,
                   port, supports_block_read, status
            FROM devices
            WHERE status = 'active'
            ORDER BY device_name
        `;

        const result = await db.query(query);
        return result.rows.map(row => ({
            deviceId: row.device_id,
            bacnetDeviceId: row.bacnet_device_id,
            deviceName: row.device_name,
            ipAddress: row.ip_address,
            port: row.port,
            supportsBlockRead: row.supports_block_read,
            status: row.status
        }));
    }
}
```

## Performance Optimization

### SQLite Configuration
```javascript
// SQLite performance tuning in Node.js application
const dbOptions = {
    // Connection options
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    timeout: 5000,

    // Performance pragmas (set at connection time)
    pragmas: {
        journal_mode: 'WAL',         // Write-Ahead Logging for better concurrency
        synchronous: 'NORMAL',       // Balance between safety and performance
        cache_size: 10000,           // Cache size in pages (default page size is 4KB)
        temp_store: 'memory',        // Store temporary tables in memory
        mmap_size: 268435456,        // Memory-mapped I/O (256MB)
        foreign_keys: 'ON'           // Enable foreign key constraints
    }
};

// Periodic maintenance operations
class DatabaseMaintenance {
    static vacuum(): void {
        db.exec('VACUUM');
        console.log('Database vacuum completed');
    }

    static analyze(): void {
        db.exec('ANALYZE');
        console.log('Database analyze completed');
    }

    static cleanup(): void {
        // Remove old sensor data (older than 90 days)
        const result = db.run(`
            DELETE FROM sensor_data
            WHERE timestamp < datetime('now', '-90 days')
        `);
        console.log(`Cleaned up ${result.changes} old sensor readings`);

        // Remove old polling statistics (older than 1 year)
        const statsResult = db.run(`
            DELETE FROM polling_statistics
            WHERE timestamp < datetime('now', '-365 days')
        `);
        console.log(`Cleaned up ${statsResult.changes} old polling statistics`);
    }
}

// Run maintenance operations weekly
setInterval(() => {
    DatabaseMaintenance.analyze();
    DatabaseMaintenance.cleanup();
}, 7 * 24 * 60 * 60 * 1000); // Weekly

// Run vacuum monthly
setInterval(() => {
    DatabaseMaintenance.vacuum();
}, 30 * 24 * 60 * 60 * 1000); // Monthly
```

### Query Optimization Examples
```sql
-- Efficient queries for common use cases

-- 1. Get latest value for all objects of a device
SELECT
    object_id, object_type, object_instance, value, quality, timestamp
FROM sensor_data s1
WHERE device_id = ?
    AND timestamp = (
        SELECT MAX(timestamp)
        FROM sensor_data s2
        WHERE s2.object_id = s1.object_id
    )
ORDER BY object_type, object_instance;

-- 2. Get hourly averages for the last 24 hours
SELECT
    datetime(timestamp, 'start of hour') as hour,
    AVG(value) as avg_value,
    COUNT(*) as sample_count
FROM sensor_data
WHERE object_id = ?
    AND timestamp > datetime('now', '-24 hours')
GROUP BY datetime(timestamp, 'start of hour')
ORDER BY hour;

-- 3. Get device performance summary
SELECT
    d.device_name,
    COUNT(DISTINCT o.object_id) as total_objects,
    COUNT(DISTINCT CASE WHEN s.timestamp > datetime('now', '-1 hour') THEN s.object_id END) as active_objects,
    MAX(s.timestamp) as last_reading
FROM devices d
LEFT JOIN bacnet_objects o ON d.device_id = o.device_id AND o.enabled = 1
LEFT JOIN sensor_data s ON o.object_id = s.object_id
WHERE d.status = 'active'
GROUP BY d.device_id, d.device_name
ORDER BY d.device_name;

-- 4. Detect objects with stale data (no readings in last hour)
SELECT
    d.device_name,
    o.object_type,
    o.object_instance,
    o.object_name,
    MAX(s.timestamp) as last_reading
FROM devices d
JOIN bacnet_objects o ON d.device_id = o.device_id
LEFT JOIN sensor_data s ON o.object_id = s.object_id
WHERE o.enabled = true
WHERE d.status = 'active'
GROUP BY d.device_id, d.device_name
ORDER BY d.device_name;

-- 4. Detect objects with stale data (no readings in last hour)
SELECT
    d.device_name,
    o.object_type,
    o.object_instance,
    o.object_name,
    MAX(s.timestamp) as last_reading
FROM devices d
JOIN bacnet_objects o ON d.device_id = o.device_id
LEFT JOIN sensor_data s ON o.object_id = s.object_id
WHERE o.enabled = 1
    AND d.status = 'active'
GROUP BY d.device_id, d.device_name, o.object_id, o.object_type, o.object_instance, o.object_name
HAVING MAX(s.timestamp) < datetime('now', '-1 hour') OR MAX(s.timestamp) IS NULL
ORDER BY d.device_name, o.object_type, o.object_instance;
```

## Monitoring and Maintenance

### Database Health Monitoring
```sql
-- Create monitoring views for SQLite
CREATE VIEW database_health AS
SELECT
    'sensor_data' as table_name,
    (SELECT COUNT(*) FROM sensor_data) as row_count,
    (SELECT COUNT(*) FROM sensor_data WHERE timestamp > datetime('now', '-24 hours')) as recent_rows,
    (SELECT COUNT(*) FROM pragma_table_info('sensor_data')) as column_count
UNION ALL
SELECT
    'devices' as table_name,
    (SELECT COUNT(*) FROM devices) as row_count,
    (SELECT COUNT(*) FROM devices WHERE status = 'active') as recent_rows,
    (SELECT COUNT(*) FROM pragma_table_info('devices')) as column_count
UNION ALL
SELECT
    'bacnet_objects' as table_name,
    (SELECT COUNT(*) FROM bacnet_objects) as row_count,
    (SELECT COUNT(*) FROM bacnet_objects WHERE enabled = 1) as recent_rows,
    (SELECT COUNT(*) FROM pragma_table_info('bacnet_objects')) as column_count;

-- Database size information
CREATE VIEW database_size_info AS
SELECT
    name as table_name,
    COUNT(*) as row_count
FROM sqlite_master
WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '%_enum'
GROUP BY name;

-- Index usage information
CREATE VIEW index_info AS
SELECT
    name as index_name,
    tbl_name as table_name,
    sql as definition
FROM sqlite_master
WHERE type = 'index'
    AND name NOT LIKE 'sqlite_%'
ORDER BY tbl_name, name;
```

### Automated Maintenance Scripts
```sql
-- Daily maintenance procedure
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE sensor_data;
    ANALYZE devices;
    ANALYZE bacnet_objects;

    -- Refresh continuous aggregates
    CALL refresh_continuous_aggregate('sensor_data_hourly', NULL, NULL);
    CALL refresh_continuous_aggregate('sensor_data_daily', NULL, NULL);

    -- Log maintenance completion
    INSERT INTO system_events (event_type, message, details)
    VALUES ('maintenance', 'Daily maintenance completed',
            json_build_object('timestamp', NOW(), 'operation', 'daily_maintenance'));
END;
$$ LANGUAGE plpgsql;

-- Schedule daily maintenance (requires pg_cron extension)
-- SELECT cron.schedule('daily-maintenance', '0 2 * * *', 'SELECT daily_maintenance();');
```

## Backup and Recovery

### Backup Strategy
```bash
#!/bin/bash
# backup_sqlite.sh

DB_PATH="./data/t3000_bacnet.db"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/t3000_backup_$DATE.db"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# SQLite backup using .backup command
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress backup
gzip "$BACKUP_FILE"

# Remove backups older than 30 days
find $BACKUP_DIR -name "t3000_backup_*.db.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

```powershell
# backup_sqlite.ps1 (Windows PowerShell version)

$DbPath = ".\data\t3000_bacnet.db"
$BackupDir = ".\backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\t3000_backup_$Date.db"

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir
}

# Copy database file (SQLite file-based backup)
Copy-Item $DbPath $BackupFile

# Compress backup
Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip"
Remove-Item $BackupFile

# Remove backups older than 30 days
Get-ChildItem $BackupDir -Filter "t3000_backup_*.zip" |
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item

Write-Host "Backup completed: $BackupFile.zip"
```

### Recovery Procedures
```bash
#!/bin/bash
# restore_sqlite.sh

BACKUP_FILE=$1
DB_PATH="./data/t3000_bacnet.db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop application first
echo "Stop the T3000 application before restoring!"

# Backup current database
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Restore from backup
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" > "$DB_PATH"
else
    cp "$BACKUP_FILE" "$DB_PATH"
fi

echo "Restore completed from $BACKUP_FILE"
createdb -h localhost -U postgres $DB_NAME

# Enable TimescaleDB extension
psql -h localhost -U postgres -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Restore from backup
if [[ $BACKUP_FILE == *.custom ]]; then
    pg_restore -h localhost -U $DB_USER -d $DB_NAME --verbose $BACKUP_FILE
else
    psql -h localhost -U $DB_USER -d $DB_NAME < $BACKUP_FILE
fi

echo "Restore completed from $BACKUP_FILE"
```

## Integration Examples

### Environment Configuration
```env
# .env file for T3000 BACnet System
DB_PATH=./data/t3000_bacnet.db
DB_BACKUP_PATH=./backups
DB_VERBOSE=false

# SQLite specific settings
SQLITE_JOURNAL_MODE=WAL
SQLITE_CACHE_SIZE=10000
SQLITE_MMAP_SIZE=268435456

# Data retention settings (in days)
SENSOR_DATA_RETENTION_DAYS=90
POLLING_STATS_RETENTION_DAYS=365
SYSTEM_EVENTS_RETENTION_DAYS=180

# BACnet polling settings
BACNET_POLL_INTERVAL=30
BACNET_DISCOVERY_INTERVAL=3600
BACNET_BLOCK_READ_SIZE=50
BACNET_TIMEOUT_MS=5000
```

### Application Integration
```typescript
// app.ts - Main application integration
import { SQLiteConnection, SensorDataRepository, DeviceRepository } from './database';
import { BACnetPollingEngine } from './bacnet';

class T3000BACnetApplication {
    private db: SQLiteConnection;
    private sensorRepo: SensorDataRepository;
    private deviceRepo: DeviceRepository;
    private pollingEngine: BACnetPollingEngine;

    constructor() {
        this.db = new SQLiteConnection({
            filePath: process.env.DB_PATH || './data/t3000_bacnet.db',
            verbose: process.env.DB_VERBOSE === 'true'
        });

        this.sensorRepo = new SensorDataRepository();
        this.deviceRepo = new DeviceRepository();
        this.pollingEngine = new BACnetPollingEngine(this.sensorRepo);
    }

    async start(): Promise<void> {
        try {
            // Verify database connection
            const isHealthy = this.db.healthCheck();
            if (!isHealthy) {
                throw new Error('Database health check failed');
            }

            console.log('Connected to SQLite database successfully');

            // Start device discovery and polling
            await this.pollingEngine.start();

            console.log('T3000 BACnet polling system started');
        } catch (error) {
            console.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    async stop(): Promise<void> {
        await this.pollingEngine.stop();
        this.db.close();
        console.log('T3000 BACnet polling system stopped');
    }
}

// Start the application
const app = new T3000BACnetApplication();

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
});

app.start().catch(console.error);
```

## Next Steps

### Immediate Implementation (Week 1)
1. **Setup Development Environment**
   - Install Node.js and SQLite3/better-sqlite3 packages
   - Create database schema using provided SQL
   - Test basic connectivity and CRUD operations

2. **Initial Data Model Testing**
   - Insert sample data to validate schema
   - Test query performance with mock time-series data
   - Validate foreign key constraints and triggers

### Short-term Goals (Weeks 2-4)
1. **Integration Development**
   - Implement data access layer with SQLite
   - Create performance monitoring utilities
   - Add error handling and transaction management

2. **Production Preparation**
   - Optimize Trendlog Configuration for time-series workloads
   - Set up backup and recovery procedures
   - Create maintenance scripts for data cleanup

### Long-term Maintenance
1. **Operational Excellence**
   - Automated maintenance procedures (VACUUM, ANALYZE)
   - Performance monitoring and alerting
   - Capacity planning and database growth management

2. **Feature Enhancements**
   - Advanced analytics and reporting with SQL views
   - Real-time alerting capabilities
   - Historical trend analysis tools

## SQLite vs TimeScaleDB Comparison

### Advantages of SQLite for T3000
- **Zero Configuration**: No server setup or administration
- **File-based**: Easy backup, deployment, and portability
- **Embedded**: No network latency or connection overhead
- **Lightweight**: Minimal resource usage and fast startup
- **ACID Compliant**: Full transaction support with WAL mode
- **Cross-platform**: Works identically on all platforms

### Considerations
- **Concurrent Writes**: Limited to single writer (readers can be concurrent)
- **Database Size**: Practical limit around 100GB-1TB for optimal performance
- **Advanced Features**: No automatic partitioning or compression
- **Scalability**: Single-node only, no clustering capabilities

### Performance Optimization for Time-series
- **WAL Mode**: Enables concurrent readers during writes
- **Indexes**: Strategic indexing on timestamp and device columns
- **Batch Inserts**: Use transactions for high-throughput writes
- **Periodic Maintenance**: VACUUM and ANALYZE for optimal performance
- **Data Retention**: Manual cleanup scripts for old data

---

**Document Status:** Implementation Ready - SQLite Integration
**Dependencies:** Node.js, SQLite3/better-sqlite3 packages, BACnet devices
**Next Phase:** Begin development environment setup and schema creation
