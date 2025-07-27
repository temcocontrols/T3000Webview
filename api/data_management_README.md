# Data Management System for T3000 WebView

This directory contains the SQLite-based data caching and persistence layer for T3000 WebView.

## Architecture Overview

```
[T3-BB Devices] → [T3000 C++] → [Rust API + SQLite] → [Vue3 Frontend]
                                 ├── Port 9104 (WebSocket)
                                 ├── Port 9103 (HTTP API)
                                 └── SQLite Cache DB
```

## Key Features

- **Smart Caching**: Real-time data cached for fast access
- **Historical Storage**: Years of time series data with yearly partitioning
- **Background Collection**: Automatic data polling based on trend log intervals
- **Performance Optimization**: Indexes and views for fast queries
- **Scalable Design**: Handles ~20 devices × 1,960 active monitoring points

## Database Location

The SQLite database will be created at:
```
D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug\Database\webview_data_cache.db
```

## Configuration

- **Cache Duration**: 60 seconds default (configurable per point type)
- **Background Polling**: Based on trend log intervals (15 minutes default)
- **Data Retention**: Unlimited (yearly partitioning for performance)
- **Active Monitoring**: Up to 98 points per device (7 trend logs × 14 items)

## API Endpoints

### Real-time Data
- `GET /api/device/{device_id}/data` - Get all cached data for device
- `GET /api/device/{device_id}/point/{point_type}/{point_number}` - Get specific point data
- `POST /api/device/{device_id}/data` - Update multiple points (from T3000)

### Time Series Data
- `GET /api/timeseries/{device_id}/{point_type}/{point_number}` - Get historical data
- `POST /api/timeseries/batch` - Store multiple time series points

### Configuration
- `GET /api/trend-logs/{device_id}` - Get trend log configurations
- `POST /api/trend-logs/{device_id}` - Update trend log configuration
- `GET /api/monitoring-points/{device_id}` - Get monitoring point definitions

## Data Flow

1. **Background Collector** polls T3000 based on trend log intervals
2. **Real-time Cache** stores latest values for quick frontend access
3. **Historical Storage** persists all time series data for trend analysis
4. **Frontend APIs** serve cached data with T3000 fallback

## Performance Characteristics

- **Cache Hit**: < 50ms (SQLite query)
- **Cache Miss**: 2-5 seconds (T3000 → Hardware → Cache)
- **Historical Query**: < 200ms (optimized with indexes)
- **Background Update**: Every 15 minutes per trend log (configurable)

## Implementation Status

- [x] Database schema design
- [ ] Rust data manager implementation
- [ ] Background data collector
- [ ] API endpoint integration
- [ ] Frontend service integration
- [ ] Testing and optimization
