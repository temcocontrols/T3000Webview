# Trend Center Unified Design

## Goal

Unify Trend Logs, Trend Policy, Trend Chart, and Verify Data into one clear user flow rooted at /t3000/trendlogs.

Current issue: users must jump across multiple pages with overlapping responsibilities.

Target result: one Trend Center page with tabs and deep links.

## Scope

Primary entry:
- /t3000/trendlogs

Legacy pages retained for compatibility:
- /t3000/trend-policy
- /t3000/trends/chart
- Dashboard section Verify Data action

Compatibility rule:
- Keep old links working.
- Redirect or route-map old pages to the new tab model.

## Information Architecture

Use /t3000/trendlogs as Trend Center, with internal tabs:

1. Overview
- 24h trend health summary
- quick actions (refresh, verify, open chart)
- monitor status highlights (active/stalled/no data)

2. Monitors
- monitor table (existing trendlogs list)
- monitor input list (existing right panel)
- open chart for selected monitor

3. Points and Tags
- global point picker for INPUT/OUTPUT/VARIABLE
- search and filter
- apply/remove Haystack tags
- save point/tag policy profile

4. Chart
- full chart workspace
- selected monitor and points sidebar
- time range presets and custom range
- compare multiple selected sensors

5. Verify Data
- existing verification UI as full tab view
- optional drawer launch for quick diagnostics

## One-Page Wireframe

Text wireframe for desktop:

------------------------------------------------------------
Trend Center (/t3000/trendlogs)
[Device Selector] [Search] [Refresh] [Verify]

[Overview] [Monitors] [Points and Tags] [Chart] [Verify Data]
------------------------------------------------------------
Tab: Overview
- KPI cards: monitors, active points, stale points, missing samples
- trend quality banner
- quick jumps: Open Monitor, Open Chart, Verify
------------------------------------------------------------
Tab: Monitors
- Left: monitor table (80%)
- Right: monitor inputs list (20%)
- Actions: Open Chart, Verify Selected, Edit Policy
------------------------------------------------------------
Tab: Points and Tags
- Left: device and point filters
- Center: selectable point list with type tabs
- Right: selected points and tag chips
- Actions: Add Tag, Remove Tag, Save Policy
------------------------------------------------------------
Tab: Chart
- Left: selected sensors/points tree
- Right: chart canvas and legend
- Bottom: sampled data quality indicators
------------------------------------------------------------
Tab: Verify Data
- Per-point status, expected vs actual, gap analysis, sparklines
- Actions: Export report, Jump to Chart
------------------------------------------------------------

Mobile behavior:
- tabs become segmented control + drawer for filters
- monitor input panel collapses below monitor list
- chart legend becomes bottom sheet

## User Flows

### Flow A: Quick health check
1. Open /t3000/trendlogs
2. Land on Overview
3. Click Verify Data
4. Inspect stale points and jump to chart

### Flow B: Configure global points and tags
1. Open Points and Tags tab
2. Select devices
3. Filter by INPUT/OUTPUT/VARIABLE
4. Select points
5. Apply Haystack tags
6. Save trend policy profile

### Flow C: Analyze selected sensors
1. From Monitors tab select monitor
2. Open Chart tab with selected monitor context
3. Add/remove points
4. Change time range
5. Export data if needed

## Haystack Tag Strategy

Treat tags as first-class filtering and governance metadata.

Minimum tag set per trended point:
- point type: input/output/variable
- semantic: temp/humidity/pressure/flow/co2/occupancy
- location or equip: zone/site/equip

Suggested fields:
- tags: string[]
- pointRef: serial:type:index
- source: manual | inferred
- updatedAt, updatedBy

Governance rules:
- warn if selected trending points are untagged
- warn if conflicting semantic tags exist on one point
- allow saved smart filters based on tag combinations

## Route and Navigation Consolidation

### Recommended route behavior

Keep:
- /t3000/trendlogs as main route

Map legacy routes to tab-based navigation:
- /t3000/trend-policy -> /t3000/trendlogs?tab=points-tags
- /t3000/trends/chart -> /t3000/trendlogs?tab=chart&serial_number=...&panel_id=...&trendlog_id=...&monitor_id=...

Dashboard Verify Data action:
- open /t3000/trendlogs?tab=verify&serial=...&panel=...

### Query parameter contract

- tab: overview | monitors | points-tags | chart | verify
- serial: number
- panel: number
- trendlogId: string
- monitorId: string
- points: comma-separated pointRefs
- tags: comma-separated tag tokens

## Implementation Mapping (Current Code)

Existing components to reuse:
- Trend center host page: src/t3-react/features/trendlogs/pages/TrendlogsPage.tsx
- Tag and global point selection logic: src/t3-react/features/trendlogs/pages/TrendPolicyPage.tsx
- Chart page/content: src/t3-react/features/trendlogs/pages/TrendChartPage.tsx and src/t3-react/features/trendlogs/components/TrendChartContent.tsx
- Verify data diagnostics: src/t3-react/features/trendlogs/components/TrendlogVerifyDrawer.tsx
- Routes: src/t3-react/app/router/routes.ts
- Breadcrumb labels: src/t3-react/layout/PageHeader.tsx
- Dashboard launch points: src/t3-react/features/dashboard/pages/DashboardPage.tsx

## Phased Delivery Plan

### Phase 1: Navigation unification (low risk)
- Add tab state to TrendlogsPage
- Allow deep-link via query parameter tab
- Add adapters from legacy routes to tab states
- Keep old routes active

Acceptance:
- Users can reach all trend functions from /t3000/trendlogs
- Old URLs still function

### Phase 2: Embed policy and verify modules
- Mount TrendPolicy UI as Points and Tags tab content
- Mount verify component as Verify tab content
- Keep existing Verify drawer for quick access

Acceptance:
- No required context switch for point/tag configuration
- Verify diagnostics accessible from same page

### Phase 3: Chart integration and context sharing
- Open chart tab in-page using shared state
- Pass selected monitor and selected points through shared trend store
- Keep /t3000/trends/chart for C++ compatibility

Acceptance:
- Chart loads with selected monitor context directly from Monitors tab
- C++ launch path unchanged

### Phase 4: Haystack enhancements
- Persist tags with pointRef identities
- Add saved filters and validation warnings
- Add import/export for tag profiles

Acceptance:
- Users can filter and validate trends by semantic tags

## Data Model Notes

If persistence is needed for tags and policy profile:
- Option A: store in existing backend table keyed by serial + pointRef
- Option B: client-side first using local storage, then migrate to backend

Recommended order:
1. Client state MVP
2. API for persistence
3. Multi-user conflict resolution

## UX Design Rules

- One page for all trend actions.
- Keep verify and policy one click away.
- Minimize context switching.
- Keep chart context sticky when switching tabs.
- Always show selected device and selected monitor in top bar.

## Success Metrics

- Reduced navigation hops from dashboard to chart/verify/policy
- Faster first chart render from monitor selection
- Lower percentage of untagged trended points
- Fewer support questions about where to configure trend policy

## Proposed Next Build Tasks

1. Add Trend Center tabs and query-state handling in TrendlogsPage.
2. Add route adapters for /trend-policy and /trends/chart.
3. Move Verify UI into a full tab panel while keeping drawer action.
4. Integrate TrendPolicyPage logic into Points and Tags tab.
5. Add tag persistence API contract and implementation.
