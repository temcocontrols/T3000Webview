# Schedules

Time-based control schedules for automated equipment operation.

## Overview

Schedules automate equipment operation based on time of day and day of week. Common uses include occupancy schedules, setpoint changes, and equipment start/stop times.

## Schedule Types

- **Weekly Schedules**: Different times for each day of week
- **Exception Schedules**: Override for holidays/special events
- **Annual Schedules**: Yearly calendar events

## Creating Schedules

1. Navigate to **Schedules** page
2. Click **Add Schedule**
3. Set times for each day
4. Assign to outputs/variables
5. Enable schedule

## Example Schedule

Monday-Friday:
- 6:00 AM: Occupied mode, 72F
- 6:00 PM: Unoccupied mode, 65F

Saturday-Sunday:
- All day: Unoccupied mode, 60F

## Next Steps

- [Holidays](./holidays) - Holiday/exception schedules
- [Programs](../data-points/programs) - Schedule programs
