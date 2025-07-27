-- T3000 WebView Data Cache Schema
-- Optimized for ~20 devices, 1,960 active monitoring points, years of retention

-- Device registry (T3-BB devices)
CREATE TABLE devices (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL UNIQUE, -- Panel ID from T3000
    device_name TEXT NOT NULL,
    device_type TEXT DEFAULT 'T3-BB',
    status INTEGER DEFAULT 1, -- 1=active, 0=inactive
    last_seen INTEGER NOT NULL, -- Unix timestamp
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(device_id)
);

-- Monitoring points configuration (inputs, outputs, variables)
CREATE TABLE monitoring_points (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    point_type INTEGER NOT NULL, -- 1=Output, 2=Input, 3=Variable, 7=Holiday
    point_number INTEGER NOT NULL,
    point_category TEXT NOT NULL, -- 'IN', 'OUT', 'VAR', 'HOL'
    label TEXT,
    description TEXT,
    unit_code INTEGER, -- 0=analog, 1=digital
    unit_symbol TEXT,
    is_active INTEGER DEFAULT 0, -- 1 if actively monitored in trend logs
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES devices(device_id),
    UNIQUE(device_id, point_type, point_number)
);

-- Trend log configurations
CREATE TABLE trend_logs (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    trend_log_index INTEGER NOT NULL, -- 0-6 (7 trend logs per device)
    log_id TEXT NOT NULL, -- MON1, MON2, etc.
    label TEXT,
    hour_interval_time INTEGER DEFAULT 0,
    minute_interval_time INTEGER DEFAULT 15,
    second_interval_time INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id) REFERENCES devices(device_id),
    UNIQUE(device_id, trend_log_index)
);

-- Trend log item assignments (14 items per trend log)
CREATE TABLE trend_log_items (
    id INTEGER PRIMARY KEY,
    trend_log_id INTEGER NOT NULL,
    item_index INTEGER NOT NULL, -- 0-13 (14 items per trend log)
    device_id INTEGER NOT NULL,
    point_type INTEGER NOT NULL,
    point_number INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (trend_log_id) REFERENCES trend_logs(id),
    FOREIGN KEY (device_id, point_type, point_number) REFERENCES monitoring_points(device_id, point_type, point_number),
    UNIQUE(trend_log_id, item_index)
);

-- Real-time data cache (latest values for quick access)
CREATE TABLE realtime_data_cache (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    point_type INTEGER NOT NULL,
    point_number INTEGER NOT NULL,
    value REAL NOT NULL,
    timestamp INTEGER NOT NULL, -- Unix timestamp
    data_type TEXT NOT NULL, -- 'analog' or 'digital'
    unit_code INTEGER,
    is_fresh INTEGER DEFAULT 1, -- 1=fresh, 0=stale
    cache_duration INTEGER DEFAULT 60, -- Seconds to consider fresh
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (device_id, point_type, point_number) REFERENCES monitoring_points(device_id, point_type, point_number),
    UNIQUE(device_id, point_type, point_number)
);

-- Historical time series data (partitioned by year for performance)
CREATE TABLE timeseries_data_2025 (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    point_type INTEGER NOT NULL,
    point_number INTEGER NOT NULL,
    trend_log_id INTEGER, -- NULL for non-trend data
    value REAL NOT NULL,
    timestamp INTEGER NOT NULL, -- Unix timestamp
    interval_seconds INTEGER NOT NULL, -- Actual interval used
    data_quality INTEGER DEFAULT 1, -- 1=good, 0=suspect
    FOREIGN KEY (device_id, point_type, point_number) REFERENCES monitoring_points(device_id, point_type, point_number)
);

-- Indexes for performance (critical for years of data)
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_status ON devices(status, last_seen);

CREATE INDEX idx_monitoring_points_device ON monitoring_points(device_id, is_active);
CREATE INDEX idx_monitoring_points_lookup ON monitoring_points(device_id, point_type, point_number);

CREATE INDEX idx_trend_logs_device ON trend_logs(device_id, is_active);
CREATE INDEX idx_trend_log_items_trend ON trend_log_items(trend_log_id, is_active);
CREATE INDEX idx_trend_log_items_point ON trend_log_items(device_id, point_type, point_number);

CREATE INDEX idx_realtime_cache_lookup ON realtime_data_cache(device_id, point_type, point_number);
CREATE INDEX idx_realtime_cache_freshness ON realtime_data_cache(is_fresh, updated_at);

CREATE INDEX idx_timeseries_2025_lookup ON timeseries_data_2025(device_id, point_type, point_number, timestamp);
CREATE INDEX idx_timeseries_2025_time ON timeseries_data_2025(timestamp);
CREATE INDEX idx_timeseries_2025_trend ON timeseries_data_2025(trend_log_id, timestamp);

-- Views for common queries
CREATE VIEW active_monitoring_points AS
SELECT
    mp.*,
    d.device_name,
    COUNT(tli.id) as trend_log_count
FROM monitoring_points mp
JOIN devices d ON mp.device_id = d.device_id
LEFT JOIN trend_log_items tli ON mp.device_id = tli.device_id
    AND mp.point_type = tli.point_type
    AND mp.point_number = tli.point_number
    AND tli.is_active = 1
WHERE mp.is_active = 1 AND d.status = 1
GROUP BY mp.id;

CREATE VIEW trend_log_summary AS
SELECT
    tl.*,
    d.device_name,
    COUNT(tli.id) as active_items,
    (tl.hour_interval_time * 3600 + tl.minute_interval_time * 60 + tl.second_interval_time) as total_interval_seconds
FROM trend_logs tl
JOIN devices d ON tl.device_id = d.device_id
LEFT JOIN trend_log_items tli ON tl.id = tli.trend_log_id AND tli.is_active = 1
WHERE tl.is_active = 1 AND d.status = 1
GROUP BY tl.id;
