# TrendLog UI Improvements - Implementation Plan

**Date:** December 2, 2025
**Component:** `TrendLogChart.vue`
**Branch:** `feature/t3-was-web`

---

## Overview

This document outlines 9 UI/UX improvements for the TrendLog chart component based on user feedback. The changes focus on reducing clutter, improving readability, and enhancing navigation efficiency.

---

## Tab 1: Remove Redundant Legend

**Tab 1:**
- "This row of items is distracting. Merge it somehow with the list of inputs to the left of the graph."
- Remove the duplicate legend showing colored boxes and item names at the top of the chart canvas

**Solution:**
- Change `display: true` → `display: false` in analog chart legend configuration at line 3025
- Keep the left panel series list as the single source of item names

**To Be:**
- Chart legend at top of canvas completely disappears
- Only left panel shows item names with colors
- Cleaner chart area with no duplicate information
- More vertical space for actual data visualization

---

## Tab 2: Move KB On Button

**Tab 2:**
- "KB On, what is this? Keep the screen simple, put settings in the config if you need this button."
- Remove unclear button from main toolbar
- Relocate keyboard shortcuts setting to proper location

**Solution:**
- Delete KB On button from top toolbar (lines 121-128)
- Add new "Keyboard Shortcuts" card in Config modal at bottom (after line 823)
- Include toggle switch for enable/disable
- Show list of available shortcuts (←/→ scroll, Shift+←/→ zoom)

**To Be:**
- Clean toolbar with fewer, clearer buttons
- Settings properly organized in Config modal
- Users can enable/disable keyboard shortcuts from settings panel
- Keyboard shortcut reference visible when needed

---

## Tab 3: Show Full Item Names

**Tab 3:**
- "Put the long names of the items here, not at Tab9."
- Display full item names in left panel without truncation
- Stop cutting off text with "..." ellipsis
- Show complete names instead of in tooltips

**Solution:**
- Remove CSS truncation from `.series-name` class (lines 10483-10485)
- Delete `white-space: nowrap` property
- Delete `text-overflow: ellipsis` property
- Add `white-space: normal` to allow wrapping
- Add `word-break: break-word` for long words

**To Be:**
- Full item names visible in left panel
- Names wrap to multiple lines if needed
- "Temperature Sensor Room 101 Building A" shows completely
- No more truncated "Temperature Sen..." text
- Users can read entire name without hovering

---

## Tab 4: Compact Digital Channels

**Tab 4:**
- "Digital trend logs can be squished up much more, make them 1/4 as tall as they are now."
- "Show text for which digital item is logged right at Tab4"
- Reduce vertical space wasted by digital channels
- Add clear labeling directly on the mini charts

**Solution:**
- Change height from `70px` to `18px` at line 10826 (70 ÷ 4 = 17.5, rounded to 18)
- Add Y-axis labels showing "High" at top and "Low" at bottom
- Add item name overlay on right side of each mini chart
- Adjust canvas rendering for compact display

**To Be:**
- Each digital channel is only 18px tall (75% space savings)
- Clear "High" and "Low" labels on Y-axis
- Item name visible directly beside chart
- Multiple digital channels fit on screen without scrolling
- Much more efficient use of vertical space

---

## Tab 5: Round Grid Lines

**Tab 5:**
- "Round the grid lines to 10, 20, 30 and so on. Never do as shown with 3.33 and so on, round up to 5."
- Professional-looking grid with whole numbers
- Eliminate ugly decimal values like 3.33, 6.67
- Minimum increment of 5

**Solution:**
- Replace Y-axis `count: 10` configuration with dynamic `stepSize` calculation
- Use nice number array: [5, 10, 20, 50, 100, 200, 500, 1000]
- Calculate appropriate step based on data range
- Ensure minimum step is 5 as requested
- Implement at lines 3098-3145

**To Be:**
- Grid displays professional round numbers only
- Examples: 0, 5, 10, 15, 20 OR 0, 10, 20, 30, 40 OR 0, 50, 100, 150, 200
- Never shows decimals like 3.33, 6.67, 9.99
- Automatically adapts to data range
- Consistent, predictable intervals

---

## Tab 6: Keyboard Navigation

**Tab 6:**
- "Allow the user to scroll left & right, in and out, from the keyboard."
- "Show left and right arrow buttons, in and out buttons for scrolling with the mouse."
- Enable keyboard control for timeline navigation
- Make mouse buttons clear and visible

**Solution:**
- Remap keyboard shortcuts at lines 7080-7105:
  - Plain `←` / `→` keys = Scroll time left/right (currently does zoom - wrong!)
  - `Shift+←` / `Shift+→` = Zoom in/out
- Update button tooltips to show keyboard mappings
- Mouse buttons already exist, just improve labels

**To Be:**
- Intuitive keyboard controls: arrow keys scroll timeline forward/backward
- Shift+arrows zoom in/out for detailed view
- Mouse buttons have updated tooltips: "Scroll left (← key)", "Zoom in (Shift+← key)"
- Navigation matches user mental model
- Both keyboard and mouse users can navigate efficiently

---

## Tab 7: Multi-Line Date Labels

**Tab 7:**
- "Trend start time: Show date below time so it stands out better."
- Make date more prominent and readable on X-axis
- Separate time and date visually
- Improve clarity of timeline start point

**Solution:**
- Modify `formatXAxisTick()` callback function at lines 2399-2444
- Return string array `[timeStr, dateStr]` for first tick only
- First tick shows two lines: time on top, date below
- Other ticks show time only (no date repetition)

**To Be:**
- First X-axis label displays as two lines:
  - Top line: **14:30**
  - Bottom line: **2025-12-02**
- Remaining ticks show time only: 14:35, 14:40, 14:45...
- Date stands out prominently at timeline start
- More readable than single-line "2025-12-02 14:30" format
- Users immediately see what date they're viewing

---

## Tab 8: Round Start Times

**Tab 8:**
- "Start the time at a nice even 14:40, as you have it. Always round to the nearest minute or 5, 10 and so on like the vertical scale."
- Clean, predictable time intervals
- No messy seconds like 14:37:23
- Consistent with grid line rounding logic
- Round to 5-minute increments

**Solution:**
- Create new `roundToNearest5Minutes()` helper function
- Function rounds minutes to nearest 5 (0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
- Sets seconds and milliseconds to 0
- Apply function to `offsetStartTime` and `offsetEndTime` at lines 4803-4804

**To Be:**
- Time ranges always start/end at clean 5-minute intervals
- Examples: 14:35, 14:40, 14:45, 14:50, 14:55, 15:00
- Never shows messy times like 14:37:23 or 08:43:51
- Professional, predictable timeline
- Consistent with grid rounding logic from Tab 5
- Easier for users to communicate about specific time windows

---

## Tab 9: Remove Hover Tooltips

**Tab 9:**
- "Get rid of this" (referring to hover tooltips that appear on mouse over)
- Remove popup information boxes that appear when hovering over chart
- Less visual clutter and distraction
- Full names should be in left panel (Tab 3), not tooltips

**Solution:**
- Set `enabled: false` in tooltip configuration for analog chart (line 3038)
- Set `enabled: false` in tooltip configuration for digital charts (line 3190)
- Completely disable Chart.js tooltip plugin

**To Be:**
- No tooltips appear when mouse hovers over chart
- Cleaner, less cluttered interaction
- Users see full item names in left panel (from Tab 3) instead of tooltips
- No popup boxes interrupting chart viewing
- Focus remains on the data visualization itself
- Less distraction when exploring different time periods

---

## Implementation Summary

### Visual Clean-up
- **Tab 1:** Remove redundant legend
- **Tab 2:** Remove unclear KB On button
- **Tab 9:** Remove distracting tooltips

### Space Efficiency
- **Tab 4:** 75% vertical space savings on digital channels

### Readability Improvements
- **Tab 3:** Full item names visible
- **Tab 5:** Professional grid numbers
- **Tab 7:** Clear date/time separation
- **Tab 8:** Clean time intervals

### Usability Enhancement
- **Tab 6:** Intuitive keyboard + mouse navigation

---

## Testing Checklist

After implementation, verify:

- [ ] Chart legend no longer appears at top of canvas (Tab 1)
- [ ] KB On button removed from toolbar (Tab 2)
- [ ] Keyboard Shortcuts card appears in Config modal (Tab 2)
- [ ] Full item names visible in left panel, wrapping if needed (Tab 3)
- [ ] Digital channels are 18px tall with High/Low labels (Tab 4)
- [ ] Grid shows round numbers (5, 10, 15, 20...) never decimals (Tab 5)
- [ ] Arrow keys scroll timeline, Shift+arrows zoom (Tab 6)
- [ ] First X-axis label shows time and date on separate lines (Tab 7)
- [ ] Time ranges start at :00, :05, :10, :15, etc. (Tab 8)
- [ ] No tooltips appear on hover (Tab 9)

---

## File Modified

**Path:** `src/t3-vue/components/NewUI/TrendLogChart.vue`

**Lines Changed:**
- 121-128: Delete KB On button
- 823+: Add Keyboard Shortcuts card
- 3025: Legend display false
- 3038: Disable analog tooltip
- 3098-3145: Y-axis stepSize calculation
- 3190: Disable digital tooltip
- 2399-2444: Multi-line X-axis labels
- 4803-4804: Round start/end times
- 7080-7105: Remap keyboard shortcuts
- 10483-10485: Series name CSS wrapping
- 10826: Digital channel height 18px

---

**Status:** Ready for implementation
