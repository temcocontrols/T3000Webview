<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Calendar as ACalendar, Select as ASelect, Spin as ASpin, Tooltip as ATooltip } from 'ant-design-vue'
import Holidays from 'date-holidays'
import moment, { Moment } from 'moment'
// import 'ant-design-vue/dist/antd.css'

interface Holiday {
  date: Moment
  name: string
}

// Props & State
const currentYear = moment().year()
const year = ref<number>(currentYear)
const holidays = ref<Holiday[]>([])
const loading = ref<boolean>(true)
const monthList = Array.from({ length: 12 }, (_, i) => i)

// Fetch holidays for selected year
const fetchHolidays = (y: number) => {
  const hd = new Holidays('US')
  return hd.getHolidays(y).map((h: any) => ({
    date: moment(h.date),
    name: h.name,
  }))
}

const getHolidayForDate = (date: Moment) =>
  holidays.value.filter((h) => h.date.isSame(date, 'day'))

const yearOptions = computed(() =>
  Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
)

const loadHolidays = () => {
  loading.value = true
  setTimeout(() => {
    holidays.value = fetchHolidays(year.value)
    loading.value = false
  }, 100)
}

onMounted(loadHolidays)
watch(year, loadHolidays)
</script>

<template>
  <div style="padding: 24px;">
    <div style="margin-bottom: 24px; display: flex; align-items: center;">
      <span style="margin-right: 8px; font-weight: 500;">Year:</span>
      <a-select v-model:value="year" style="width: 100px">
        <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
      </a-select>
    </div>
    <a-spin :spinning="loading">
      <div style="
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: flex-start;
        ">
        <div v-for="month in monthList" :key="month" style="
            width: 300px;
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 8px;
            background: #fafafa;
          ">
          <h4 style="text-align: center; margin-bottom: 8px;">
            {{ moment([year, month]).format('MMMM') }}
          </h4>
          <a-calendar :fullscreen="false" :value="moment([year, month])" :header-render="() => null" :date-cell-render="(date: Moment) => {
            const dayHolidays = getHolidayForDate(date)
            if (!dayHolidays.length) return null
            return h(
              ATooltip,
              { title: dayHolidays.map(h => h.name).join(', ') },
              {
                default: () => h(
                  'div',
                  {
                    style: {
                      background: '#ff7875',
                      color: 'white',
                      borderRadius: '4px',
                      padding: '0 2px',
                      fontSize: '12px',
                      textAlign: 'center',
                    }
                  },
                  dayHolidays.map(h => h.name.split(' ')[0]).join(', ')
                )
              }
            )
          }" />
        </div>
      </div>
    </a-spin>
  </div>
</template>
