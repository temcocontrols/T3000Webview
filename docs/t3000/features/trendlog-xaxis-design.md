# TrendLog Chart X-Axis Design

## Overview

The TrendLog chart X-axis uses **Solution 3: Hybrid Right Edge Rounding**. The right edge is always rounded *forward* to the nearest clean boundary based on the active timebase, then the left edge is computed by subtracting the window duration from that rounded right edge.

---

## Rounding Rules

### Under 1 hour (5m, 10m, 30m)

Right edge rounds **up to the next minute ending in 0 or 5**.

| Now    | Right edge |
|--------|-----------|
| 07:22  | 07:25     |
| 07:25  | 07:25 *(exact boundary, no shift)* |
| 07:25:01 | 07:30   |
| 07:17  | 07:20     |

### 1 hour and above (1h, 4h, 12h, 1d, 4d)

Right edge rounds **up to the next full :00 hour**.

| Now     | Right edge |
|---------|-----------|
| 07:22   | 08:00     |
| 08:00   | 08:00 *(exact boundary, no shift)* |
| 08:00:01 | 09:00   |

### Custom range

No rounding. The user supplies an explicit start and end time; those values are used as-is.

---

## Window Calculation

```
rightEdge  = roundRight(currentTime, timebase)   // applies rules above
leftEdge   = rightEdge - windowDuration(timebase)
```

| Timebase | Window duration | Tick step |
|----------|----------------|-----------|
| 5m       | 5 min          | 1 min     |
| 10m      | 10 min         | 1 min     |
| 30m      | 30 min         | 5 min     |
| 1h       | 60 min         | 10 min    |
| 4h       | 4 h            | 30 min    |
| 12h      | 12 h           | 1 h       |
| 1d       | 24 h           | 2 h       |
| 4d       | 4 days         | 12 h      |

---

## Examples (now = 07:22)

| Timebase | Left edge | Right edge | Ticks (sample) |
|----------|-----------|-----------|----------------|
| 5m       | 07:20     | 07:25     | 07:20, 21, 22, 23, 24, 07:25 |
| 10m      | 07:15     | 07:25     | 07:15, 16 ... 07:25 |
| 30m      | 06:55     | 07:25     | 06:55, 07:00, 05, 10, 15, 20, 07:25 |
| 1h       | 07:00     | 08:00     | 07:00, 10, 20, 30, 40, 50, 08:00 |
| 4h       | 04:00     | 08:00     | 04:00, 04:30 … 08:00 |
| 12h      | Apr28 20:00 | Apr29 08:00 | 20:00, 21:00 … 08:00 |
| 1d       | Apr28 08:00 | Apr29 08:00 | 08:00, 10:00 … 08:00 |
| 4d       | Apr25 08:00 | Apr29 08:00 | Apr25 08:00, 12:00 … |

---

## Live Mode (Auto-Scroll)

When the chart is in **live mode** (`isRealTime = true`, `timeOffset = 0`):

- The right edge is recalculated every second from `Date.now()`.
- When `now` crosses a rounding boundary (e.g. 07:25:00 → 07:25:01) the right edge automatically advances to the next boundary (07:30), and the whole window shifts forward.
- The red dashed **"now" line** marks the exact current time within the window. The small area to the right of the "now" line is the forward tail (at most one step width).

---

## Scroll Behaviour (Left / Right arrows)

| Action | Effect |
|--------|--------|
| **← Left** | Exits live mode (if active), shifts window back by exactly one timebase period. Each additional click shifts another full period back. |
| **→ Right** | Shifts window forward by one timebase period. When `timeOffset` returns to 0, live mode is automatically restored. |
| Disabled for | Custom date range |

---

## Zoom Behaviour (Zoom In / Zoom Out)

Zoom changes the active timebase without affecting the live/historical state.

**Progression (shortest → longest):**

```
5m  →  10m  →  30m  →  1h  →  4h  →  12h  →  1d  →  4d
```

- **Zoom In (↑):** moves one step left in the progression (finer detail).
- **Zoom Out (↓):** moves one step right (wider view).
- Disabled at the ends of the progression and for Custom ranges.

---

## Reset

Clicking **Reset** sets `timebase = 5m`, `timeOffset = 0`, and restores live mode.

---

## Key Tick Label Rules

- Ticks are placed at clean multiples of the tick step within the window.
- On day-crossing timebases (12h, 1d, 4d), whenever the date changes the label shows `MonDD HH:MM`; other labels show only `HH:MM`.
- The right-edge tick label is always shown in **green** to distinguish the rounded boundary from data ticks.
- The exact "now" position is marked with a **red dashed vertical line** when live mode is active.
