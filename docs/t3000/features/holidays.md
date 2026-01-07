# Holidays

<!-- USER-GUIDE -->

Annual holiday and exception day scheduling.

## Overview

Holiday schedules override normal weekly schedules for special events, holidays, and maintenance periods.

## Holiday Calendar

Define holidays and special days:
- New Year's Day
- Independence Day
- Thanksgiving
- Christmas Day
- Maintenance days
- Company events

## Creating Holidays

1. Go to **Holidays** page
2. Add new holiday
3. Set date (or recurring pattern)
4. Define exception schedule
5. Save

## Schedule Priority

1. Holidays (highest priority)
2. Exception schedules
3. Weekly schedules (lowest priority)

## Next Steps

- [Schedules](./schedules) - Weekly schedules
- [Programs](../data-points/programs) - Control programs

<!-- TECHNICAL -->

# Holidays

## Holiday Management API

```typescript
interface Holiday {
  id: number;
  name: string;
  date: string;  // ISO date or recurrence pattern
  recurring: boolean;
  scheduleOverride: ScheduleEvent[];
}

// Get holidays
const holidays = await fetch(
  `http://localhost:9103/api/holidays`
).then(r => r.json());

// Create holiday
await fetch(`http://localhost:9103/api/holidays`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Year\'s Day',
    date: '2026-01-01',
    recurring: true,
    scheduleOverride: [
      { time: '00:00', value: 60 }  // Unoccupied all day
    ]
  })
});
```

### Holiday Detection

```typescript
class HolidayChecker {
  private holidays: Holiday[];

  isHoliday(date: Date): Holiday | null {
    const dateStr = date.toISOString().split('T')[0];

    for (const holiday of this.holidays) {
      if (holiday.recurring) {
        // Check month-day match
        const holidayMD = holiday.date.substring(5);  // "MM-DD"
        const dateMD = dateStr.substring(5);

        if (holidayMD === dateMD) {
          return holiday;
        }
      } else {
        if (holiday.date === dateStr) {
          return holiday;
        }
      }
    }

    return null;
  }
}
```

## Next Steps

- [Schedules API](./schedules)
- [REST API](../api-reference/rest-api)
