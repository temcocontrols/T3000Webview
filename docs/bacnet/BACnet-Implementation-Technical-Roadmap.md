# BACnet Implementation Technical Roadmap

**Date:** July 29, 2025
**Project:** T3000 BACnet Data Polling System
**Document Type:** Technical Implementation Plan

## Overview

This document provides a detailed technical roadmap for implementing the BACnet-based data polling system that will replace Temco's proprietary trend log structures with standard BACnet protocols and TimeScaleDB storage.

## Architecture Overview

### System Components

```mermaid
graph TB
    A[BACnet Device Discovery] --> B[Device Capability Assessment]
    B --> C{Block Read Support?}
    C -->|Yes| D[Block Read Polling]
    C -->|No| E[Individual Point Polling]
    D --> F[Data Validation]
    E --> F
    F --> G[TimeScaleDB Storage]
    G --> H[T3000 UI Integration]
    H --> I[Trend Visualization]

    J[Configuration Management] --> A
    K[Error Handling & Retry] --> D
    K --> E
    L[Performance Monitoring] --> G
```

### Technology Stack

#### Database Layer
```
TimeScaleDB Components:
- PostgreSQL base with time-series extensions
- Hypertables for time-series optimization
- Continuous aggregates for historical data
- Data retention policies
- Compression for long-term storage
```

#### BACnet Protocol Layer
```
BACnet Library Options:
1. BACnet4J (Java-based, mature)
2. BACpypes (Python-based, flexible)
3. OpenBAC (C/C++, performance-focused)
4. Node-BACnet (JavaScript/Node.js)
5. Custom implementation based on YABE
```

#### Application Layer
```
Core Services:
- Device Discovery Service
- Polling Orchestrator
- Data Validation Engine
- Storage Manager
- Configuration Service
- Monitoring and Alerting
```

## Technical Implementation Details

### 1. TimeScaleDB Setup and Configuration

#### Installation Requirements
```sql
-- TimeScaleDB Installation (PostgreSQL Extension)
-- 1. Install PostgreSQL 14+
-- 2. Install TimescaleDB extension
-- 3. Create database and enable extension

CREATE DATABASE t3000_timeseries;
\c t3000_timeseries
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

#### Schema Design
```sql
-- Device registry table
CREATE TABLE devices (
    device_id SERIAL PRIMARY KEY,
    bacnet_device_id INTEGER UNIQUE NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    ip_address INET,
    port INTEGER DEFAULT 47808,
    vendor_id INTEGER,
    model_name VARCHAR(255),
    firmware_version VARCHAR(100),
    supports_block_read BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Object registry table
CREATE TABLE bacnet_objects (
    object_id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(device_id),
    object_type VARCHAR(50) NOT NULL, -- AI, AO, DI, DO, etc.
    object_instance INTEGER NOT NULL,
    object_name VARCHAR(255),
    description TEXT,
    units VARCHAR(50),
    cov_increment REAL,
    poll_interval INTEGER DEFAULT 30, -- seconds
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, object_type, object_instance)
);

-- Main time-series data table
CREATE TABLE sensor_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id INTEGER NOT NULL,
    object_id INTEGER NOT NULL REFERENCES bacnet_objects(object_id),
    object_type VARCHAR(50) NOT NULL,
    object_instance INTEGER NOT NULL,
    value DOUBLE PRECISION,
    quality VARCHAR(50) DEFAULT 'good',
    raw_value JSONB, -- Store original BACnet value for debugging
    poll_duration_ms INTEGER, -- Performance tracking
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('sensor_data', 'timestamp', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes for common queries
CREATE INDEX idx_sensor_data_device_time ON sensor_data (device_id, timestamp DESC);
CREATE INDEX idx_sensor_data_object_time ON sensor_data (object_id, timestamp DESC);
CREATE INDEX idx_sensor_data_type_time ON sensor_data (object_type, timestamp DESC);

-- Continuous aggregates for common queries
CREATE MATERIALIZED VIEW sensor_data_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS hour,
    device_id,
    object_id,
    object_type,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as sample_count
FROM sensor_data
GROUP BY hour, device_id, object_id, object_type;

-- Data retention policy
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');
```

### 2. BACnet Implementation Strategy

#### Device Discovery Implementation
```typescript
interface BACnetDevice {
    deviceId: number;
    ipAddress: string;
    port: number;
    vendorId: number;
    modelName: string;
    firmwareVersion: string;
    supportsBlockRead: boolean;
    objects: BACnetObject[];
}

interface BACnetObject {
    objectType: 'AI' | 'AO' | 'DI' | 'DO' | 'AV' | 'BV';
    objectInstance: number;
    objectName: string;
    description?: string;
    units?: string;
    presentValue?: any;
}

class BACnetDiscovery {
    async discoverDevices(networkRange: string): Promise<BACnetDevice[]> {
        // Implementation for WHO-IS broadcast and I-AM responses
    }

    async enumerateObjects(device: BACnetDevice): Promise<BACnetObject[]> {
        // Implementation for object enumeration
    }

    async testBlockReadSupport(device: BACnetDevice): Promise<boolean> {
        // Test if device supports ReadPropertyMultiple
    }
}
```

#### Polling Engine Implementation
```typescript
class BACnetPollingEngine {
    private devices: Map<number, BACnetDevice> = new Map();
    private pollingIntervals: Map<number, NodeJS.Timer> = new Map();

    async startPolling(device: BACnetDevice, intervalSeconds: number) {
        const interval = setInterval(async () => {
            try {
                if (device.supportsBlockRead) {
                    await this.performBlockRead(device);
                } else {
                    await this.performIndividualReads(device);
                }
            } catch (error) {
                await this.handlePollingError(device, error);
            }
        }, intervalSeconds * 1000);

        this.pollingIntervals.set(device.deviceId, interval);
    }

    private async performBlockRead(device: BACnetDevice): Promise<void> {
        // Implementation for ReadPropertyMultiple
        // Group objects by type for efficient reading
        const objectGroups = this.groupObjectsForBlockRead(device.objects);

        for (const group of objectGroups) {
            const startTime = performance.now();
            const results = await this.bacnetClient.readPropertyMultiple(
                device.ipAddress,
                device.port,
                group
            );
            const duration = performance.now() - startTime;

            await this.storeResults(device, results, duration);
        }
    }

    private async performIndividualReads(device: BACnetDevice): Promise<void> {
        // Fallback for devices without block read support
        for (const object of device.objects) {
            try {
                const startTime = performance.now();
                const value = await this.bacnetClient.readProperty(
                    device.ipAddress,
                    device.port,
                    object.objectType,
                    object.objectInstance,
                    'present-value'
                );
                const duration = performance.now() - startTime;

                await this.storeResult(device, object, value, duration);
            } catch (error) {
                await this.handleObjectError(device, object, error);
            }
        }
    }
}
```

### 3. Data Storage and Management

#### Data Ingestion Pipeline
```typescript
class DataStorageManager {
    private db: Pool; // PostgreSQL connection pool
    private batchBuffer: SensorReading[] = [];
    private batchSize = 1000;
    private flushInterval = 5000; // 5 seconds

    constructor() {
        // Setup periodic batch flush
        setInterval(() => this.flushBatch(), this.flushInterval);
    }

    async storeSensorReading(reading: SensorReading): Promise<void> {
        this.batchBuffer.push(reading);

        if (this.batchBuffer.length >= this.batchSize) {
            await this.flushBatch();
        }
    }

    private async flushBatch(): Promise<void> {
        if (this.batchBuffer.length === 0) return;

        const batch = this.batchBuffer.splice(0);

        try {
            await this.db.query(`
                INSERT INTO sensor_data (
                    timestamp, device_id, object_id, object_type,
                    object_instance, value, quality, raw_value, poll_duration_ms
                ) VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
            `, batch.flatMap(r => [
                r.timestamp, r.deviceId, r.objectId, r.objectType,
                r.objectInstance, r.value, r.quality, r.rawValue, r.pollDuration
            ]));
        } catch (error) {
            console.error('Batch insert failed:', error);
            // Implement retry logic or dead letter queue
        }
    }
}
```

### 4. Performance Optimization Strategies

#### Block Read Optimization
```typescript
class BlockReadOptimizer {
    // Group objects to maximize block read efficiency
    groupObjectsForBlockRead(objects: BACnetObject[]): BACnetObject[][] {
        const groups: BACnetObject[][] = [];
        const maxObjectsPerRead = 50; // Configurable based on device capabilities

        // Group by object type first for better performance
        const typeGroups = objects.reduce((acc, obj) => {
            if (!acc[obj.objectType]) acc[obj.objectType] = [];
            acc[obj.objectType].push(obj);
            return acc;
        }, {} as Record<string, BACnetObject[]>);

        // Split each type group into chunks
        Object.values(typeGroups).forEach(typeObjects => {
            for (let i = 0; i < typeObjects.length; i += maxObjectsPerRead) {
                groups.push(typeObjects.slice(i, i + maxObjectsPerRead));
            }
        });

        return groups;
    }
}
```

#### Network Optimization
```typescript
class NetworkOptimizer {
    private connectionPool: Map<string, BACnetConnection> = new Map();

    async getConnection(ipAddress: string, port: number): Promise<BACnetConnection> {
        const key = `${ipAddress}:${port}`;

        if (!this.connectionPool.has(key)) {
            const connection = new BACnetConnection(ipAddress, port);
            await connection.connect();
            this.connectionPool.set(key, connection);
        }

        return this.connectionPool.get(key)!;
    }

    // Implement connection health monitoring and recycling
    async monitorConnections(): Promise<void> {
        for (const [key, connection] of this.connectionPool) {
            if (!connection.isHealthy()) {
                await connection.reconnect();
            }
        }
    }
}
```

## Integration Points with T3000

### 1. UI Component Integration

#### Trend Log Icon Implementation
```typescript
// Icon component for trend logs
const TrendLogIcon: React.FC<{ size?: number; className?: string }> = ({
    size = 16,
    className = ''
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={`trend-icon ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M3 17L9 11L13 15L21 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M21 7H16M21 7V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <rect
            x="2"
            y="3"
            width="20"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
        />
    </svg>
);
```

#### Data Visualization Components
```typescript
interface TrendChartProps {
    deviceId: number;
    objectId: number;
    timeRange: { start: Date; end: Date };
    aggregation?: 'raw' | 'hourly' | 'daily';
}

const TrendChart: React.FC<TrendChartProps> = ({
    deviceId,
    objectId,
    timeRange,
    aggregation = 'raw'
}) => {
    const { data, loading, error } = useTrendData({
        deviceId,
        objectId,
        timeRange,
        aggregation
    });

    // Implement Chart.js or similar visualization
    return (
        <div className="trend-chart">
            {loading && <div>Loading trend data...</div>}
            {error && <div>Error: {error.message}</div>}
            {data && <LineChart data={data} />}
        </div>
    );
};
```

### 2. Configuration Management

#### Auto-Configuration Service
```typescript
class AutoConfigurationService {
    async generatePointConfiguration(devices: BACnetDevice[]): Promise<PointConfiguration> {
        const config: PointConfiguration = {
            logicalGroups: [],
            pollingSchedules: [],
            alertRules: []
        };

        // AI-assisted grouping logic
        for (const device of devices) {
            const groups = await this.analyzeAndGroupPoints(device);
            config.logicalGroups.push(...groups);
        }

        return config;
    }

    private async analyzeAndGroupPoints(device: BACnetDevice): Promise<LogicalGroup[]> {
        // Implement AI-assisted point grouping
        // Group by location, function, system type, etc.
        return [];
    }
}
```

## Error Handling and Resilience

### Error Recovery Strategies
```typescript
class ErrorHandler {
    private retryQueue: Map<string, RetryItem> = new Map();

    async handlePollingError(device: BACnetDevice, error: Error): Promise<void> {
        const key = `${device.deviceId}-${Date.now()}`;

        if (this.isTransientError(error)) {
            // Add to retry queue with exponential backoff
            this.retryQueue.set(key, {
                device,
                retryCount: 0,
                maxRetries: 5,
                nextRetry: Date.now() + 1000
            });
        } else {
            // Log permanent error and mark device as problematic
            await this.markDeviceProblematic(device, error);
        }
    }

    private isTransientError(error: Error): boolean {
        // Classify errors as transient (network issues) or permanent (configuration issues)
        return error.message.includes('timeout') ||
               error.message.includes('connection') ||
               error.message.includes('unreachable');
    }
}
```

## Testing Strategy

### Integration Testing
```typescript
describe('BACnet Polling Integration', () => {
    let pollingEngine: BACnetPollingEngine;
    let mockDevice: BACnetDevice;

    beforeEach(() => {
        pollingEngine = new BACnetPollingEngine();
        mockDevice = createMockDevice();
    });

    test('should perform block reads when supported', async () => {
        mockDevice.supportsBlockRead = true;

        await pollingEngine.startPolling(mockDevice, 30);

        // Verify block read calls
        expect(mockBacnetClient.readPropertyMultiple).toHaveBeenCalled();
    });

    test('should fallback to individual reads', async () => {
        mockDevice.supportsBlockRead = false;

        await pollingEngine.startPolling(mockDevice, 30);

        // Verify individual read calls
        expect(mockBacnetClient.readProperty).toHaveBeenCalledTimes(
            mockDevice.objects.length
        );
    });
});
```

## Deployment Considerations

### Infrastructure Requirements
```yaml
# Docker Compose for development environment
version: '3.8'
services:
  timescaledb:
    image: timescale/timescaledb:latest-pg14
    environment:
      POSTGRES_DB: t3000_timeseries
      POSTGRES_USER: t3000_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data

  polling_service:
    build: ./polling-service
    environment:
      DATABASE_URL: postgresql://t3000_user:secure_password@timescaledb:5432/t3000_timeseries
    depends_on:
      - timescaledb
    networks:
      - bacnet_network

volumes:
  timescale_data:

networks:
  bacnet_network:
    driver: bridge
```

## Monitoring and Observability

### Metrics and Monitoring
```typescript
class PollingMetrics {
    private metrics = {
        devicesPolled: new Map<number, number>(),
        pollErrors: new Map<number, number>(),
        pollDuration: new Map<number, number[]>(),
        dataPointsCollected: 0
    };

    recordPollSuccess(deviceId: number, duration: number, pointCount: number): void {
        this.metrics.devicesPolled.set(deviceId,
            (this.metrics.devicesPolled.get(deviceId) || 0) + 1);

        if (!this.metrics.pollDuration.has(deviceId)) {
            this.metrics.pollDuration.set(deviceId, []);
        }
        this.metrics.pollDuration.get(deviceId)!.push(duration);

        this.metrics.dataPointsCollected += pointCount;
    }

    getHealthReport(): HealthReport {
        return {
            totalDevices: this.metrics.devicesPolled.size,
            totalDataPoints: this.metrics.dataPointsCollected,
            averagePollTime: this.calculateAveragePollTime(),
            errorRate: this.calculateErrorRate()
        };
    }
}
```

## Next Steps

### Immediate Actions (Week 1)
1. **Environment Setup**
   - Install TimeScaleDB in development environment
   - Set up basic database schema
   - Research and select BACnet library

2. **YABE Analysis**
   - Download and analyze YABE source code
   - Document block read implementation
   - Extract reusable patterns and approaches

3. **Device Inventory**
   - Get comprehensive device list from Fandu
   - Document device capabilities and limitations
   - Plan testing approach

### Short-term Goals (Weeks 2-4)
1. **Core Implementation**
   - Basic device discovery
   - Simple polling implementation
   - Data storage pipeline
   - Error handling framework

2. **Testing Infrastructure**
   - Unit tests for core components
   - Integration tests with mock devices
   - Performance benchmarking tools

### Medium-term Goals (Weeks 5-8)
1. **Advanced Features**
   - Block read optimization
   - AI-assisted configuration
   - UI integration
   - Performance monitoring

2. **Production Readiness**
   - Comprehensive error handling
   - Deployment automation
   - Documentation and training materials

---

**Document Status:** Technical Roadmap - Ready for Implementation
**Review Required:** Architecture approval and resource allocation
**Dependencies:** TimeScaleDB setup, BACnet library selection, device access
