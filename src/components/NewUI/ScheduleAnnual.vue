<template>
  <div>
    <a-row :gutter="16">
      <a-col v-for="(month, idx) in months" :key="month" :span="6" style="margin-bottom: 16px">
        <a-card :title="month" size="small">
          <a-row :gutter="[8, 8]">
            <a-col v-for="day in getDaysInMonth(idx)" :key="day" :span="3" style="text-align: center">
              <a-tooltip :title="getHolidayName(currentYear, idx, day)" v-if="isHoliday(currentYear, idx, day)">
                <a-badge color="red" :count="''" style="box-shadow: 0 0 0 2px #fff">
                  <a-checkbox :checked="isSelected(currentYear, idx, day)" @change="onSelect(currentYear, idx, day)">
                    <span style="color: red">{{ day }}</span>
                  </a-checkbox>
                </a-badge>
              </a-tooltip>
              <template v-else>
                <a-checkbox :checked="isSelected(currentYear, idx, day)" @change="onSelect(currentYear, idx, day)">
                  {{ day }}
                </a-checkbox>
              </template>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
    <a-divider />
    <div>
      <h3>Selected Days Summary</h3>
      <ul>
        <li v-for="sel in selectedDays" :key="selKey(sel)">
          {{ months[sel.month] }} {{ sel.day }}, {{ sel.year }}
          <span v-if="getHolidayName(sel.year, sel.month, sel.day)">
            ({{ getHolidayName(sel.year, sel.month, sel.day) }})
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { Row as ARow, Col as ACol, Card as ACard, Checkbox as ACheckbox, Divider as ADivider, Tooltip as ATooltip, Badge as ABadge } from 'ant-design-vue';

defineOptions({
  name: 'ScheduleAnnual',
});

const currentYear = new Date().getFullYear();
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// US Federal Holidays (fixed and some floating, for demo purpose, not exhaustive)
function getUSHolidays(year: number) {
  // Helper for nth weekday of month
  function nthWeekdayOfMonth(n: number, weekday: number, month: number) {
    const first = new Date(year, month, 1).getDay();
    let day = 1 + ((7 + weekday - first) % 7) + (n - 1) * 7;
    return day;
  }
  // Helper for last weekday of month
  function lastWeekdayOfMonth(weekday: number, month: number) {
    const last = new Date(year, month + 1, 0).getDate();
    for (let d = last; d > last - 7; d--) {
      if (new Date(year, month, d).getDay() === weekday) return d;
    }
    return last;
  }
  return [
    { month: 0, day: 1, name: 'New Year\'s Day' },
    { month: 0, day: nthWeekdayOfMonth(3, 1, 0), name: 'Martin Luther King Jr. Day' }, // 3rd Monday Jan
    { month: 1, day: nthWeekdayOfMonth(3, 1, 1), name: 'Presidents\' Day' }, // 3rd Monday Feb
    { month: 4, day: lastWeekdayOfMonth(1, 4), name: 'Memorial Day' }, // Last Monday May
    { month: 6, day: 4, name: 'Independence Day' },
    { month: 8, day: nthWeekdayOfMonth(1, 1, 8), name: 'Labor Day' }, // 1st Monday Sep
    { month: 9, day: nthWeekdayOfMonth(2, 1, 9), name: 'Columbus Day' }, // 2nd Monday Oct
    { month: 10, day: 11, name: 'Veterans Day' },
    { month: 10, day: nthWeekdayOfMonth(4, 4, 10), name: 'Thanksgiving Day' }, // 4th Thursday Nov
    { month: 11, day: 25, name: 'Christmas Day' }
  ];
}

const holidays = computed(() => getUSHolidays(currentYear));

function isHoliday(year: number, month: number, day: number) {
  return holidays.value.some(h => h.month === month && h.day === day);
}
function getHolidayName(year: number, month: number, day: number) {
  const h = holidays.value.find(h => h.month === month && h.day === day);
  return h ? h.name : '';
}

function getDaysInMonth(month: number) {
  return Array.from(
    { length: new Date(currentYear, month + 1, 0).getDate() },
    (_, i) => i + 1
  );
}

type SelectedDay = { year: number; month: number; day: number };
const selectedDays = ref<SelectedDay[]>([]);

function selKey(sel: SelectedDay) {
  return `${sel.year}-${sel.month}-${sel.day}`;
}

function isSelected(year: number, month: number, day: number) {
  return selectedDays.value.some(
    d => d.year === year && d.month === month && d.day === day
  );
}

function onSelect(year: number, month: number, day: number) {
  return (e: any) => {
    const idx = selectedDays.value.findIndex(
      d => d.year === year && d.month === month && d.day === day
    );
    if (e.target.checked && idx === -1) {
      selectedDays.value.push({ year, month, day });
    } else if (!e.target.checked && idx !== -1) {
      selectedDays.value.splice(idx, 1);
    }
  };
}
</script>

<style scoped>
.ant-card {
  min-height: 180px;
}
</style>
