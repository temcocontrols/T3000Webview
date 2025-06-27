<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
    },
  }">
    <a-modal v-model:open="annualScheduleVisible" width="75vw" style="top: 20px;" :footer="null"
      wrapClassName="t3-annual-modal" destroyOnClose keyboard="true">


      <div class="annual-calendar-container">
        <!-- <div class="calendar-header"> -->
        <a-row type="flex" justify="space-between" align="middle" style="margin-bottom: 20px;">
          <a-col style="margin-top: 5px;margin-left: 10px;">
            <div style="display: flex; justify-content: flex-start;gap:4px;height: 32px;">
              <!-- <FieldTimeOutlined class="view-title" /> -->
              <label class="view-title">{{ getModalTitle() }}</label>
            </div>
          </a-col>
          <a-col>
            <div style="display: flex; justify-content: flex-start; gap: 8px;" v-if="!locked">
              <a-button class="t3-btn" size="small" type="primary" @click="selectAllHolidays">Select All
                Holidays</a-button>
              <a-button class="t3-btn" size="small" @click="RefreshFromT3000">Reset</a-button>
              <a-button class="t3-btn" size="small" @click="ClearAll">Clear All</a-button>
              <a-button class="t3-btn" size="small" @click="HandleOk">Save Data</a-button>
              <a-button class="t3-btn" size="small" @click="HandleCancel">Cancel</a-button>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- <div style="display: flex; flex-wrap: wrap; gap: 16px;">
      <div v-for="(monthName, idx) in months" :key="monthName"
        style="flex: 1 1 220px; min-width: 220px; max-width: 1fr;">
        <a-calendar :fullscreen="false" :date-cell-render="dateCellRender"
          :header-render="() => headerRender({ value: monthName, onChange: () => { } })"
          :value="dayjs(`${currentYear}-${(idx + 1).toString().padStart(2, '0')}-01`)"
          :valid-range="getValidRange(idx + 1)" @select="onSelect"
          style="width: 100%; min-width: 0; font-size: 12px;" />
      </div>
    </div> -->

      <!-- <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 24px;"> -->
      <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        <a-calendar v-for="(month) in months1" :key="month.format('YYYY-MM')" :value="month" :fullscreen="false"
          :header-render="() => headerRender({ value: month, onChange: () => { } })" @select="onSelect"
          style="flex: 1 1 220px; min-width: 220px; max-width: 1fr;font-size: 12px;">
          <template #dateFullCellRender="{ current }">
            <a-tooltip v-if="getHoliday(current)" :title="getHoliday(current).name">
              <div
                :style="isSelected(current)
                  ? 'background: linear-gradient(135deg, #1890ff 0%, rgb(75, 210, 102) 100%); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto; border: 2px solid #rgb(44, 180, 129); text-decoration: underline;'
                  : 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto; font-weight: bold; text-decoration: underline; background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%); color: white;'">
                {{ current.date() }}
              </div>
            </a-tooltip>
            <div v-else
              :style="isSelected(current)
                ? 'background: linear-gradient(135deg, #1890ff 0%, rgb(75, 210, 102) 100%); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto;'
                : 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto;'">
              {{ current.date() }}
            </div>
          </template>
        </a-calendar>
      </div>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Calendar as ACalendar, Card as ACard, Tag } from 'ant-design-vue'
import dayjs from 'dayjs'
import { annualScheduleVisible, annualScheduleData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'
import { locked } from 'src/lib/T3000/Hvac/Data/T3Data';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/*
// Generate 12 months for the current year
const selectedDates = [
  '2025-01-01',
  '2025-01-20',
  '2025-03-03',
  '2025-03-18',
  '2025-06-05',
  '2025-06-23'
];
*/

const year = 2025;
const months1 = months.map((_, i) => dayjs(`${year}-${String(i + 1).padStart(2, '0')}-01`));

const isSelected = (date) => {
  // Check if the date is selected in annualScheduleData
  const monthKey = months[date.month()];
  const dayStr = date.format('YYYY-MM-DD');
  return annualScheduleData.value[monthKey]?.includes(dayStr) || false;
};

// LogUtil.Debug(`= annual: months1 Generated months for year ${year}:`, months1);

const getModalTitle = () => {

  /*
  return h(
    'div',
    {
      style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;'
    },
    [
      h('span', { style: 'font-size: 18px; font-weight: bold;' }, `Annual Schedule for ${dayjs().year()}`),
      h(
        'a-button',
        {
          type: 'primary',
          onClick: () => {
            // Save logic here
            LogUtil.Debug('= annual: Save button clicked', annualScheduleData.value);
          }
        },
        { default: () => 'Save' }
      )
    ]
  )
  */
  return `Annual Schedule for ${dayjs().year()}`;
}

// US Federal Holidays and Common Major Non-Federal Holidays for the current year
const currentYear = dayjs().year()
function getUsHolidays(currentYear: number) {
  const usHolidays = [
    // Federal Holidays
    { date: `${currentYear}-01-01`, name: "New Year's Day" },
    { date: dayjs(`${currentYear}-01-01`).day(1) > 0 ? dayjs(`${currentYear}-01-01`).day(1).add(14, 'day').format('YYYY-MM-DD') : '', name: "Martin Luther King Jr. Day" }, // 3rd Monday Jan
    { date: dayjs(`${currentYear}-02-01`).day(1) > 0 ? dayjs(`${currentYear}-02-01`).day(1).add(14, 'day').format('YYYY-MM-DD') : '', name: "Presidents' Day" }, // 3rd Monday Feb
    { date: dayjs(`${currentYear}-05-31`).day() === 1 ? dayjs(`${currentYear}-05-31`).format('YYYY-MM-DD') : dayjs(`${currentYear}-05-31`).day(1).subtract(7, 'day').format('YYYY-MM-DD'), name: "Memorial Day" }, // Last Monday May
    { date: `${currentYear}-06-19`, name: "Juneteenth" },
    { date: `${currentYear}-07-04`, name: "Independence Day" },
    { date: dayjs(`${currentYear}-09-01`).day(1) === 1 ? dayjs(`${currentYear}-09-01`).format('YYYY-MM-DD') : dayjs(`${currentYear}-09-01`).day(1).format('YYYY-MM-DD'), name: "Labor Day" }, // 1st Monday Sep
    { date: dayjs(`${currentYear}-10-01`).day(1) > 0 ? dayjs(`${currentYear}-10-01`).day(1).add(7, 'day').format('YYYY-MM-DD') : '', name: "Columbus Day" }, // 2nd Monday Oct
    { date: `${currentYear}-11-11`, name: "Veterans Day" },
    {
      date: (() => { // 4th Thursday Nov
        const firstThursday = dayjs(`${currentYear}-11-01`).day(4) < 4 ? dayjs(`${currentYear}-11-01`).add(4 - dayjs(`${currentYear}-11-01`).day(), 'day') : dayjs(`${currentYear}-11-01`).day(4);
        return firstThursday.add(21, 'day').format('YYYY-MM-DD');
      })(), name: "Thanksgiving Day"
    },
    { date: `${currentYear}-12-25`, name: "Christmas Day" },

    // Major Non-Federal Holidays
    {
      date: (() => { // Easter Sunday (computational)
        // Anonymous Gregorian algorithm
        const Y = currentYear;
        const a = Y % 19;
        const b = Math.floor(Y / 100);
        const c = Y % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      })(), name: "Easter Sunday"
    },
    { date: `${currentYear}-12-31`, name: "New Year's Eve" },
    { date: `${currentYear}-10-31`, name: "Halloween" },
    { date: `${currentYear}-02-14`, name: "Valentine's Day" },
    { date: `${currentYear}-03-17`, name: "St. Patrick's Day" },
    { date: `${currentYear}-05-12`, name: "Mother's Day" }, // 2nd Sunday May (approx, see below)
    { date: `${currentYear}-06-16`, name: "Father's Day" }, // 3rd Sunday June (approx, see below)
    { date: `${currentYear}-07-24`, name: "Pioneer Day (UT)" },
    { date: `${currentYear}-11-01`, name: "All Saints' Day" }
  ];

  // Adjust Mother's Day (2nd Sunday in May)
  usHolidays.forEach(h => {
    if (h.name === "Mother's Day") {
      const mayFirst = dayjs(`${currentYear}-05-01`);
      const firstSunday = mayFirst.day() === 0 ? mayFirst : mayFirst.add(7 - mayFirst.day(), 'day');
      h.date = firstSunday.add(7, 'day').format('YYYY-MM-DD');
    }
    if (h.name === "Father's Day") {
      const juneFirst = dayjs(`${currentYear}-06-01`);
      const firstSunday = juneFirst.day() === 0 ? juneFirst : juneFirst.add(7 - juneFirst.day(), 'day');
      h.date = firstSunday.add(14, 'day').format('YYYY-MM-DD');
    }
  });

  return usHolidays;
}

const usHolidays = getUsHolidays(currentYear);

const selectAllHolidays = () => {
  LogUtil.Debug('= annual: selectAllHolidays Called');
  // Add all US holidays to annualScheduleData without removing existing days
  usHolidays.forEach(holiday => {
    const dateObj = dayjs(holiday.date);
    const monthKey = months[dateObj.month()];
    if (!annualScheduleData.value[monthKey]) {
      annualScheduleData.value[monthKey] = [];
    }
    if (!annualScheduleData.value[monthKey].includes(holiday.date)) {
      annualScheduleData.value[monthKey].push(holiday.date);
    }
  });
  LogUtil.Debug('= annual: selectAllHolidays Completed', annualScheduleData.value);
}

// Helper to check if a date is a US holiday
const getHoliday = (date) => {
  return usHolidays.find(
    h => dayjs(h.date).isSame(date, 'day')
  )
}

// Render each date cell
import { h } from 'vue'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'

const dateCellRender = (date) => {
  // LogUtil.Debug(`= annual: dateCellRender Rendering date cell for:`, date, date.current)

  // Only show content if the date belongs to the current month
  if (date.current.$M !== date.current.$d.getMonth()) {
    return null
  }

  const holiday = getHoliday(date)
  if (holiday) {
    return h(
      Tag,
      { color: 'red', style: 'width:100%;display:block;' },
      { default: () => holiday.name }
    )
  }
  return null
}

// Custom header to show only the current year and allow month selection
const headerRender = ({ value, onChange }) => {
  LogUtil.Debug(`= annual: headerRender Rendering header for value:`, value);
  return h(
    'div',
    { style: 'padding: 0px 0px;margin-left:10px;margin-bottom:5px' },
    [
      h(
        'span',
        { style: 'font-weight: bold; font-size: 14px;' },
        months[value.$d.getMonth()]
      )
    ]
  )
}

const onSelect = (date, { source }) => {
  LogUtil.Debug(`= annual: onSelect Date selected:`, date, `Source:`, source);

  const month = date.month();
  const monthKey = months[month]; // Use month name as key
  const day = date.format('YYYY-MM-DD');
  if (!annualScheduleData.value[monthKey]) {
    annualScheduleData.value[monthKey] = [];
  }
  const idx = annualScheduleData.value[monthKey].indexOf(day);
  if (idx === -1) {
    // Not selected, add it
    annualScheduleData.value[monthKey].push(day);
  } else {
    // Already selected, remove it
    annualScheduleData.value[monthKey].splice(idx, 1);
  }

  LogUtil.Debug(`= annual: onSelect Date toggled:`, date, `Source:`, source, annualScheduleData.value);
}

const getCurrentDay = (month) => {
  const now = dayjs();
  if (month === now.month() + 1) {
    // LogUtil.Debug(`= annual: getCurrentDay Checking current day for month:`, month, now.month(), now);
    return now;
  }
  else {
    return null;
  }
}

const getValidRange = (month) => {
  // Collect all days from annualScheduleData that belong to the given month
  const allDays = [];
  for (let i = 0; i < annualScheduleData.value.length; i++) {
    const days = annualScheduleData.value[i] || [];
    for (const d of days) {
      const dateObj = dayjs(d);
      if (dateObj.month() + 1 === month) {
        allDays.push(dateObj);
      }
    }
  }
  // If no days found, return null
  if (allDays.length === 0) {
    return null;
  }
  return allDays;
}

const RefreshFromT3000 = () => {
  LogUtil.Debug(`= annual: RefreshFromT3000 Called`);
  // Logic to refresh data from T3000
  // For now, just log the action

  for (const monthKey in annualScheduleData.value) {
    if (Object.prototype.hasOwnProperty.call(annualScheduleData.value, monthKey)) {
      annualScheduleData.value[monthKey] = [];
    }
  }
}

const ClearAll = () => {
  LogUtil.Debug(`= annual: ClearAll Called`);
  // Clear all data in annualScheduleData
  for (const monthKey in annualScheduleData.value) {
    if (Object.prototype.hasOwnProperty.call(annualScheduleData.value, monthKey)) {
      annualScheduleData.value[monthKey] = [];
    }
  }
  LogUtil.Debug(`= annual: ClearAll Completed`, annualScheduleData.value);
}

const HandleCancel = () => {
  LogUtil.Debug(`= annual: HandleCancel Called`);
  annualScheduleVisible.value = false;
  // Logic to handle cancel action
  // For now, just log the action
}

const HandleOk = () => {
  LogUtil.Debug(`= annual: HandleOk Called`);
  annualScheduleVisible.value = false;
  // Logic to handle ok action
  // For now, just log the action
  LogUtil.Debug(`= annual: Data saved`, annualScheduleData.value);
}
</script>

<style>
.ant-picker-calendar-date .ant-tag {
  font-size: 10px;
  padding: 2px 4px;
}

.t3-annual-modal {
  .ant-modal-content {
    border-radius: 0px;
    padding: 10px 30px;
  }

  .ant-modal-body {
    border-radius: 0px;
    margin-left: -15px;
    margin-right: -15px;
    margin-top: 20px;
  }

  .ant-modal-header {
    border-radius: 0px;
    margin-left: -15px;
    margin-right: -15px;
  }

  .ant-modal-footer {
    border-radius: 0px;
    margin-left: -15px;
    margin-right: -15px;
  }

  .ant-picker-panel {
    font-size: 11px;
    min-width: 0;
    padding: 0;
  }

  .ant-picker-body .table thead th {
    font-weight: bold;
  }

  .ant-picker-calendar {
    /* background: #0064c8 !important; */
    margin-top: -10px;
  }

  .ant-picker-content {
    /* background: #0064c8; */
    height: 180px;
  }

  .ant-picker-content thead tr th {
    font-weight: bold;
  }

  .annual-calendar-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    padding-top: 10px;
  }
}
</style>
