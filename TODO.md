# T3000 WebView - TODO List

## Time Zone & Daylight Savings Time Handling
**Status:** Pending
**Priority:** High
**Date Added:** 2025-10-31

**Issue:**
- Daylight savings time transitions need special handling
- Customers with many sites in different time zones require multi-timezone support
- Current implementation may not properly handle:
  - DST transitions (spring forward / fall back)
  - Historical data queries across DST boundaries
  - Display of timestamps from devices in different time zones
  - Trendlog data time alignment across multiple sites

**Impact:**
- Historical data queries may show gaps or duplicates during DST transitions
- Multi-site deployments will have inconsistent time displays
- Trendlog data aggregation across time zones may be incorrect

**Suggested Approach:**
1. Store all timestamps in UTC in the database
2. Add timezone field to device configuration
3. Convert to local time only in the UI layer
4. Handle DST transitions in time range queries
5. Add timezone selector for multi-site views
6. Test with data spanning DST transitions

**Related Files:**
- `api/src/t3_device/trendlog_data_service.rs` - Historical data queries
- `src/components/NewUI/TrendLogChart.vue` - Time range selection
- Database schema - May need timezone columns

**Notes:**
- This affects both real-time data display and historical queries
- Need to coordinate with C++ T3000 side for timezone information
- Consider using `chrono-tz` crate for Rust timezone handling
