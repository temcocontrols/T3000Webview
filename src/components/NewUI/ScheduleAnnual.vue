<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
    },
  }">
    <a-modal v-model:open="annualScheduleVisible" :title="getModalTitle()" width="75vw" style="top: 20px;"
      :footer="null" wrapClassName="t3-annual-modal">
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
            <div :style="isSelected(current) ?
              'background: #1890ff; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto;' :
              'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto;'">
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
  return `Annual Schedule for ${dayjs().year()}`;
}

// US Federal Holidays for the current year
const currentYear = dayjs().year()
const usHolidays = [
  { date: `${currentYear}-01-01`, name: "New Year's Day" },
  { date: `${currentYear}-01-15`, name: "Martin Luther King Jr. Day" }, // 3rd Monday Jan
  { date: `${currentYear}-02-19`, name: "Presidents' Day" }, // 3rd Monday Feb
  { date: `${currentYear}-05-27`, name: "Memorial Day" }, // Last Monday May
  { date: `${currentYear}-06-19`, name: "Juneteenth" },
  { date: `${currentYear}-07-04`, name: "Independence Day" },
  { date: `${currentYear}-09-02`, name: "Labor Day" }, // 1st Monday Sep
  { date: `${currentYear}-10-14`, name: "Columbus Day" }, // 2nd Monday Oct
  { date: `${currentYear}-11-11`, name: "Veterans Day" },
  { date: `${currentYear}-11-28`, name: "Thanksgiving Day" }, // 4th Thursday Nov
  { date: `${currentYear}-12-25`, name: "Christmas Day" }
]

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
  if (!annualScheduleData.value[monthKey].includes(day)) {
    annualScheduleData.value[monthKey].push(day);
  }

  LogUtil.Debug(`= annual: onSelect Date selected:`, date, `Source:`, source, annualScheduleData.value);
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
}
</style>
