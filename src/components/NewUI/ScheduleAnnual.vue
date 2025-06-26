<template>
  <a-modal v-model:open="showModal" title="US Holidays Calendar" width="75vw" style="top: 20px;" :footer="null">
    <div style="display: flex; flex-wrap: wrap; gap: 16px;">
      <div
        v-for="month in 12"
        :key="month"
        style="flex: 1 1 220px; min-width: 220px; max-width: 1fr;"
      >
        <a-calendar
          :fullscreen="false"
          :date-cell-render="dateCellRender"
          :header-render="() => headerRender({ value: month, onChange: () => { } })"
          :value="dayjs(`${currentYear}-${month}-01`)"
          style="width: 100%; min-width: 0; font-size: 12px;"
        />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'
import { Calendar as ACalendar, Card as ACard, Tag } from 'ant-design-vue'
import dayjs from 'dayjs'

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
function getHoliday(date) {
  return usHolidays.find(
    h => dayjs(h.date).isSame(date, 'day')
  )
}

// Render each date cell
import { h } from 'vue'

function dateCellRender(date) {
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
function headerRender({ value, onChange }) {
  return h(
    'div',
    { style: 'padding: 8px 16px;' },
    [
      h(
        'span',
        { style: 'font-weight: bold; font-size: 16px;' },
        value
      )
    ]
  )
}
</script>

<style scoped>
.ant-picker-calendar-date .ant-tag {
  font-size: 10px;
  padding: 2px 4px;
}
</style>
