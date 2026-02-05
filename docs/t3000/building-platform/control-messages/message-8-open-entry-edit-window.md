# Message 8: OPEN_ENTRY_EDIT_WINDOW

<!-- USER-GUIDE -->
The OPEN_ENTRY_EDIT_WINDOW message opens edit dialogs for schedules, holidays, and programs in the T3000 desktop application. This bridges the web interface with native T3000 editing windows.

**When to Use:**
- User clicks "Edit" button on a schedule
- Double-clicking a holiday entry
- Opening program editor from web interface

<!-- TECHNICAL -->

## Overview

**Action:** `OPEN_ENTRY_EDIT_WINDOW` (8)
**Direction:** Frontend → Backend
**Location:** BacnetWebView.cpp line 2807
**Purpose:** Trigger native T3000 edit dialogs from web interface

## Request Format

**JSON Structure:**
```json
{
  "action": "OPEN_ENTRY_EDIT_WINDOW",
  "panelId": 0,
  "entryIndex": 5,
  "entryType": 12
}
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `panelId` | number | Yes | Panel ID (must match local panel) |
| `entryIndex` | number | Yes | Entry index to edit |
| `entryType` | number | Yes | Entry type constant |

### Entry Types

| Type | Constant | Value | Editor Opened |
|------|----------|-------|---------------|
| Schedule | BAC_SCH | 12 | Weekly Schedule Editor |
| Holiday | BAC_HOL | 13 | Annual Holiday Editor |
| Program | BAC_PRG | 6 | Program Code Editor |

## Response Format

**No response** - This is a one-way command that triggers UI action

## Implementation

**Location:** BacnetWebView.cpp line 2807

```cpp
case OPEN_ENTRY_EDIT_WINDOW:
{
    tempjson["action"] = "OPEN_ENTRY_EDIT_WINDOW";
    int npanel_id = json.get("panelId", Json::nullValue).asInt();
    int entry_index = json.get("entryIndex", Json::nullValue).asInt();
    int entry_type = json.get("entryType", Json::nullValue).asInt();

    if (npanel_id == bac_gloab_panel) // Only for local panel
    {
        switch (entry_type)
        {
        case BAC_SCH:  // Schedule
        {
            if (entry_index < BAC_SCHEDULE_COUNT)
            {
                weekly_list_line = entry_index;
                WeeklyRoutine_Window->OnBnClickedButtonWeeklyScheduleEdit();
            }
        }
        break;
        case BAC_HOL:  // Holiday
        {
            if (entry_index < BAC_HOLIDAY_COUNT)
            {
                annual_list_line = entry_index;
                AnnualRoutine_Window->OnBnClickedButtonAnnualEdit();
            }
        }
        break;
        case BAC_PRG:  // Program
        {
            if (entry_index < BAC_PROGRAM_ITEM_COUNT)
            {
                program_list_line = entry_index;
                Program_Window->OnBnClickedButtonProgramEdit();
            }
        }
        break;
        default:
            break;
        }
    }
}
```

## Behavior

### Local Panel Only

The message **only works for the local panel** (npanel_id == bac_gloab_panel). Remote panel editing is not supported.

### Editor Windows

**Weekly Schedule Editor:**
- Maximum 32 schedules (BAC_SCHEDULE_COUNT)
- Sets `weekly_list_line` to entry_index
- Calls `WeeklyRoutine_Window->OnBnClickedButtonWeeklyScheduleEdit()`

**Annual Holiday Editor:**
- Maximum 32 holidays (BAC_HOLIDAY_COUNT)
- Sets `annual_list_line` to entry_index
- Calls `AnnualRoutine_Window->OnBnClickedButtonAnnualEdit()`

**Program Editor:**
- Maximum 16 programs (BAC_PROGRAM_ITEM_COUNT)
- Sets `program_list_line` to entry_index
- Calls `Program_Window->OnBnClickedButtonProgramEdit()`

## Frontend Usage

### Open Schedule Editor

```typescript
const openScheduleEditor = (panelId: number, scheduleIndex: number) => {
  const message = {
    action: 'OPEN_ENTRY_EDIT_WINDOW',
    panelId: panelId,
    entryIndex: scheduleIndex,
    entryType: 12  // BAC_SCH
  };

  sendMessage(JSON.stringify(message));
};

// Usage
openScheduleEditor(0, 5);  // Edit schedule #5
```

### Open Holiday Editor

```typescript
const openHolidayEditor = (panelId: number, holidayIndex: number) => {
  const message = {
    action: 'OPEN_ENTRY_EDIT_WINDOW',
    panelId: panelId,
    entryIndex: holidayIndex,
    entryType: 13  // BAC_HOL
  };

  sendMessage(JSON.stringify(message));
};
```

### Open Program Editor

```typescript
const openProgramEditor = (panelId: number, programIndex: number) => {
  const message = {
    action: 'OPEN_ENTRY_EDIT_WINDOW',
    panelId: panelId,
    entryIndex: programIndex,
    entryType: 6  // BAC_PRG
  };

  sendMessage(JSON.stringify(message));
};
```

### Add Edit Buttons to Tables

```typescript
const renderEditButton = (entryType: number, entryIndex: number) => {
  return (
    <button
      onClick={() => {
        openEditor(currentPanelId, entryIndex, entryType);
      }}
    >
      Edit
    </button>
  );
};

const openEditor = (panelId: number, index: number, type: number) => {
  const message = {
    action: 'OPEN_ENTRY_EDIT_WINDOW',
    panelId: panelId,
    entryIndex: index,
    entryType: type
  };

  sendMessage(JSON.stringify(message));
};
```

## Limitations

### Local Panel Only

**Not supported:**
```json
{
  "action": "OPEN_ENTRY_EDIT_WINDOW",
  "panelId": 5,  // Remote panel - will be ignored
  "entryIndex": 0,
  "entryType": 12
}
```

The command is silently ignored for remote panels.

### No Response

This message does not send a response. The web interface cannot detect:
- Whether the dialog opened successfully
- Whether the user saved or canceled
- What changes were made

### Limited Entry Types

Only 3 entry types supported:
- Schedules (BAC_SCH = 12)
- Holidays (BAC_HOL = 13)
- Programs (BAC_PRG = 6)

Other types (inputs, outputs, variables, etc.) are ignored.

## Validation

### Index Range Checks

```typescript
const validateEditRequest = (entryType: number, entryIndex: number): boolean => {
  switch (entryType) {
    case 12:  // BAC_SCH
      return entryIndex >= 0 && entryIndex < 32;
    case 13:  // BAC_HOL
      return entryIndex >= 0 && entryIndex < 32;
    case 6:   // BAC_PRG
      return entryIndex >= 0 && entryIndex < 16;
    default:
      return false;
  }
};

// Usage
if (validateEditRequest(entryType, entryIndex)) {
  openEditor(panelId, entryIndex, entryType);
} else {
  showError('Invalid entry type or index');
}
```

## Use Cases

### Schedule Management

```typescript
// Schedule table with edit buttons
schedules.forEach((schedule, index) => {
  renderScheduleRow({
    name: schedule.label,
    status: schedule.status,
    onEdit: () => openScheduleEditor(panelId, index)
  });
});
```

### Holiday Calendar

```typescript
// Holiday list with edit capability
holidays.forEach((holiday, index) => {
  renderHolidayItem({
    date: holiday.date,
    name: holiday.name,
    onEdit: () => openHolidayEditor(panelId, index)
  });
});
```

### Program Editor Access

```typescript
// Program table with code editor link
programs.forEach((program, index) => {
  renderProgramRow({
    label: program.label,
    status: program.on_off ? 'Running' : 'Stopped',
    onEditCode: () => openProgramEditor(panelId, index)
  });
});
```

## See Also

- [Platform Overview](../overview.md) - Architecture
- [Data Structures](../data-structures.md) - Entry type constants
