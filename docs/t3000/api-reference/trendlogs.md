# Trend Logging API

<!-- USER-GUIDE -->

## Overview

The Trend Logging API manages historical data collection and retrieval. Configure trendlogs to record sensor values, control outputs, and system performance over time.

## Common Operations

### Get All Trendlogs

```typescript
const trendlogs = await fetch('http://localhost:9103/api/t3_device/devices/1/trendlogs')
  .then(res => res.json());
```

### Get Trendlog Data

```typescript
const data = await fetch('http://localhost:9103/api/t3_device/trendlogs/1/data?start=2026-01-01&end=2026-01-09')
  .then(res => res.json());

console.log(data);
// [
//   { timestamp: "2026-01-09T08:00:00Z", value: 72.5 },
//   { timestamp: "2026-01-09T08:05:00Z", value: 72.3 }
// ]
```

### Update Trendlog Configuration

```typescript
await fetch('http://localhost:9103/api/t3_device/trendlogs/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sample_rate: 300,  // 5 minutes
    enabled: true
  })
});
```

---

<!-- TECHNICAL -->

#### Trendlog Endpoints

##### GET /api/t3_device/devices/:id/trendlogs

**Description**: Get all trendlogs for a device

**Parameters**:
- `id` (path, integer) - Device ID

**Request:**
```http
GET /api/t3_device/devices/1/trendlogs HTTP/1.1
```

**Response:**
```json
[
  {
    "id": 1,
    "device_id": 1,
    "panel": 5,
    "index": 1,
    "label": "Room Temp Log",
    "input_index": 1,
    "sample_rate": 300,
    "buffer_size": 1000,
    "enabled": true,
    "status": "RUNNING"
  }
]
```

**Used By**: [TrendlogTable.tsx](src/t3-react/features/trends/components/TrendlogTable.tsx)

---

##### GET /api/t3_device/trendlogs/:id/data

**Description**: Get historical data from trendlog

**Parameters**:
- `id` (path, integer) - Trendlog ID
- `start` (query, string) - Start date (ISO 8601)
- `end` (query, string) - End date (ISO 8601)
- `limit` (query, integer, optional) - Max records (default: 1000)

**Request:**
```http
GET /api/t3_device/trendlogs/1/data?start=2026-01-01T00:00:00Z&end=2026-01-09T23:59:59Z&limit=5000 HTTP/1.1
```

**Response:**
```json
{
  "trendlog_id": 1,
  "label": "Room Temp Log",
  "start": "2026-01-01T00:00:00Z",
  "end": "2026-01-09T23:59:59Z",
  "total_records": 2592,
  "data": [
    {
      "timestamp": "2026-01-09T08:00:00Z",
      "value": 72.5,
      "quality": "GOOD"
    },
    {
      "timestamp": "2026-01-09T08:05:00Z",
      "value": 72.3,
      "quality": "GOOD"
    }
  ]
}
```

**Used By**: [TrendChart.tsx](src/t3-react/features/trends/components/TrendChart.tsx)

**Errors**:
- `404` - Trendlog not found
- `400` - Invalid date range

---

##### PUT /api/t3_device/trendlogs/:id

**Description**: Update trendlog configuration

**Parameters**:
- `id` (path, integer) - Trendlog ID

**Request:**
```http
PUT /api/t3_device/trendlogs/1 HTTP/1.1
Content-Type: application/json

{
  "label": "Zone 1 Temperature",
  "sample_rate": 600,
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

**Used By**: [EditTrendlogDialog.tsx](src/t3-react/features/trends/components/EditTrendlogDialog.tsx)

---

##### POST /api/t3_device/trendlogs/:id/clear

**Description**: Clear all data from trendlog

**Parameters**:
- `id` (path, integer) - Trendlog ID

**Request:**
```http
POST /api/t3_device/trendlogs/1/clear HTTP/1.1
```

**Response:**
```json
{
  "success": true,
  "records_deleted": 2592
}
```

**Used By**: [ClearTrendlogButton.tsx](src/t3-react/features/trends/components/ClearTrendlogButton.tsx)

---

##### GET /api/t3_device/trendlogs/:id/export

**Description**: Export trendlog data as CSV

**Parameters**:
- `id` (path, integer) - Trendlog ID
- `start` (query, string) - Start date
- `end` (query, string) - End date

**Request:**
```http
GET /api/t3_device/trendlogs/1/export?start=2026-01-01&end=2026-01-09 HTTP/1.1
```

**Response:**
```csv
timestamp,value,quality
2026-01-09T08:00:00Z,72.5,GOOD
2026-01-09T08:05:00Z,72.3,GOOD
```

**Used By**: [ExportTrendlogButton.tsx](src/t3-react/features/trends/components/ExportTrendlogButton.tsx)

---

#### Database Schema

```sql
CREATE TABLE TRENDLOGS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    panel INTEGER NOT NULL,
    index_ INTEGER NOT NULL,
    label TEXT,
    input_index INTEGER,
    sample_rate INTEGER DEFAULT 300,
    buffer_size INTEGER DEFAULT 1000,
    enabled INTEGER DEFAULT 1,
    status TEXT,
    FOREIGN KEY (device_id) REFERENCES DEVICES(id) ON DELETE CASCADE
);

CREATE TABLE TRENDLOG_DATA (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trendlog_id INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    value REAL,
    quality TEXT DEFAULT 'GOOD',
    FOREIGN KEY (trendlog_id) REFERENCES TRENDLOGS(id) ON DELETE CASCADE
);

CREATE INDEX idx_trendlog_data_timestamp ON TRENDLOG_DATA(trendlog_id, timestamp);
```

##### TypeScript Types

```typescript
export interface Trendlog {
  id: number;
  device_id: number;
  panel: number;
  index: number;
  label: string;
  input_index: number;
  sample_rate: number;
  buffer_size: number;
  enabled: boolean;
  status: string;
}

export interface TrendlogDataPoint {
  timestamp: string;
  value: number;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
}
```
