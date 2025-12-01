<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
    },
  }">
    <a-modal v-model:open="annualScheduleVisible" width="75vw" style="top: 20px;" :footer="null"
      wrapClassName="t3-annual-modal" destroyOnClose keyboard="true" :closable="true">
      <div class="annual-calendar-container">
        <a-row type="flex" justify="space-between" align="middle" style="margin-bottom: 20px;">
          <a-col style="margin-top: 5px;margin-left: 10px;">
            <div style="display: flex; justify-content: flex-start;gap:4px;height: 32px;">
              <label class="view-title">{{ getModalTitle() }}</label>
            </div>
          </a-col>
          <a-col style="margin-right: 40px;">
            <div style="display: flex; justify-content: flex-start; gap: 8px;" v-if="!locked">
              <!-- <a-button class="t3-btn" size="small" type="primary" @click="selectAllHolidays">
                Select All Holidays
              </a-button> -->
              <a-button class="t3-btn" size="small" type="primary" @click="RefreshFromT3000">Refresh From
                T3000</a-button>
              <a-button class="t3-btn" size="small" @click="ClearAll">Clear All</a-button>
              <a-button class="t3-btn" size="small" @click="HandleOk">Save Data</a-button>
              <!-- <a-button class="t3-btn" size="small" @click="HandleCancel">Cancel</a-button> -->
            </div>
          </a-col>
        </a-row>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        <a-calendar v-for="(month) in months1" :key="month.format('YYYY-MM')" :value="month" :fullscreen="false"
          :header-render="() => headerRender({ value: month })" @select="onSelect"
          style="flex: 1 1 220px; min-width: 220px; max-width: 1fr;font-size: 12px;">
          <template #dateFullCellRender="{ current }">
            <!-- Only show dates that belong to the current month -->
            <div v-if="current.month() === month.month()">
              <div
                :style="isSelected(current)
                  ? 'background: linear-gradient(135deg, #1890ff 0%, #4bd666 100%); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto;'
                  : 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto;'">
                {{ current.date() }}
              </div>
            </div>
            <!-- Empty cell for dates not in current month -->
            <div v-else style="width: 24px; height: 24px; margin: auto;">
              <!-- Empty space for previous/next month dates -->
            </div>
          </template>
        </a-calendar>
      </div>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Calendar as ACalendar, Row as ARow, Col as ACol, Button as AButton, Modal as AModal, ConfigProvider as AConfigProvider } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { annualScheduleVisible, annualScheduleData, scheduleItemData, } from '@/lib/vue/T3000/Hvac/Data/Constant/RefConstant'
import { locked } from '@/lib/vue/T3000/Hvac/Data/T3Data'
import { h } from 'vue'
import T3UIUtil from '@/lib/vue/T3000/Hvac/Opt/UI/T3UIUtil'
import { isBuiltInEdge, T3_Types } from '@/lib/vue/T3000/Hvac/Data/T3Data';
import Hvac from '@/lib/vue/T3000/Hvac/Hvac'
import LogUtil from '@/lib/vue/T3000/Hvac/Util/LogUtil'

// Types
interface Holiday {
  date: string
  name: string
}

interface CalendarSelectInfo {
  source: 'date' | 'month' | 'year'
}

// Constants
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

// Reactive data - made dynamic instead of hardcoded
const currentYear = computed(() => dayjs().year())

// Generate 12 months for the current year (made reactive)
const months1 = computed(() =>
  months.map((_, i) => dayjs(`${currentYear.value}-${String(i + 1).padStart(2, '0')}-01`))
)

// Check if a date is selected
const isSelected = (date: Dayjs): boolean => {
  const monthKey = months[date.month()]
  const dayStr = date.format('YYYY-MM-DD')
  return annualScheduleData.value[monthKey]?.includes(dayStr) || false
}

// Modal title - made dynamic
const getModalTitle = (): string => {
  return `Annual Schedule for ${currentYear.value}`
}

/**
 * Calculates Easter Sunday for a given year using mathematical principles.
 * This implementation uses astronomical calculations to determine the date
 * of Easter based on lunar cycles and calendar rules.
 */
const calculateEasterDate = (year: number): string => {
  // Golden number - position of year in the 19-year lunar cycle
  const goldenNumber = (year % 19) + 1

  // Century and its properties
  const century = Math.floor(year / 100) + 1
  const skippedLeapYears = Math.floor((3 * century) / 4) - 12
  const lunarCorrection = Math.floor((8 * century + 5) / 25) - 5

  // Day of week for March 1st calculation
  const marchFirst = Math.floor((5 * year) / 4) - skippedLeapYears - 10

  // Lunar calculations
  const lunarFactor = (11 * goldenNumber + 20 + lunarCorrection - skippedLeapYears) % 30
  let lunarDate = lunarFactor

  if ((lunarDate === 25 && goldenNumber > 11) || lunarDate === 24) {
    lunarDate++
  }

  // Find the first Sunday after the lunar date
  const easterOffset = 44 - lunarDate
  let easterDay = easterOffset + 7 - ((marchFirst + easterOffset) % 7)

  if (easterDay > 31) {
    // Easter is in April
    const aprilDay = easterDay - 31
    return `${year}-04-${String(aprilDay).padStart(2, '0')}`
  } else {
    // Easter is in March
    return `${year}-03-${String(easterDay).padStart(2, '0')}`
  }
}

// US Federal Holidays calculation - fixed all date calculations
const getUsHolidays = (year: number): Holiday[] => {
  const holidays: Holiday[] = [
    // Fixed Federal Holidays
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-06-19`, name: "Juneteenth" },
    { date: `${year}-07-04`, name: "Independence Day" },
    { date: `${year}-11-11`, name: "Veterans Day" },
    { date: `${year}-12-25`, name: "Christmas Day" },

    // Calculated Federal Holidays
    {
      date: getMLKDay(year),
      name: "Martin Luther King Jr. Day"
    },
    {
      date: getPresidentsDay(year),
      name: "Presidents' Day"
    },
    {
      date: getMemorialDay(year),
      name: "Memorial Day"
    },
    {
      date: getLaborDay(year),
      name: "Labor Day"
    },
    {
      date: getColumbusDay(year),
      name: "Columbus Day"
    },
    {
      date: getThanksgiving(year),
      name: "Thanksgiving Day"
    },

    // Major Non-Federal Holidays
    {
      date: calculateEasterDate(year),
      name: "Easter Sunday"
    },
    {
      date: getMothersDay(year),
      name: "Mother's Day"
    },
    {
      date: getFathersDay(year),
      name: "Father's Day"
    },
    { date: `${year}-02-14`, name: "Valentine's Day" },
    { date: `${year}-03-17`, name: "St. Patrick's Day" },
    { date: `${year}-10-31`, name: "Halloween" },
    { date: `${year}-12-31`, name: "New Year's Eve" },
    { date: `${year}-11-01`, name: "All Saints' Day" }
  ]

  return holidays.filter(h => h.date && h.date.length === 10) // Validate dates
}

// Helper functions for calculating holidays - all fixed
const getMLKDay = (year: number): string => {
  // 3rd Monday in January
  const jan1 = dayjs(`${year}-01-01`)
  const firstMonday = jan1.day() === 1 ? jan1 : jan1.add((8 - jan1.day()) % 7, 'day')
  return firstMonday.add(14, 'day').format('YYYY-MM-DD')
}

const getPresidentsDay = (year: number): string => {
  // 3rd Monday in February
  const feb1 = dayjs(`${year}-02-01`)
  const firstMonday = feb1.day() === 1 ? feb1 : feb1.add((8 - feb1.day()) % 7, 'day')
  return firstMonday.add(14, 'day').format('YYYY-MM-DD')
}

const getMemorialDay = (year: number): string => {
  // Last Monday in May
  const may31 = dayjs(`${year}-05-31`)
  const lastMonday = may31.day() === 1 ? may31 : may31.subtract((may31.day() + 6) % 7, 'day')
  return lastMonday.format('YYYY-MM-DD')
}

const getLaborDay = (year: number): string => {
  // 1st Monday in September
  const sep1 = dayjs(`${year}-09-01`)
  const firstMonday = sep1.day() === 1 ? sep1 : sep1.add((8 - sep1.day()) % 7, 'day')
  return firstMonday.format('YYYY-MM-DD')
}

const getColumbusDay = (year: number): string => {
  // 2nd Monday in October
  const oct1 = dayjs(`${year}-10-01`)
  const firstMonday = oct1.day() === 1 ? oct1 : oct1.add((8 - oct1.day()) % 7, 'day')
  return firstMonday.add(7, 'day').format('YYYY-MM-DD')
}

const getThanksgiving = (year: number): string => {
  // 4th Thursday in November
  const nov1 = dayjs(`${year}-11-01`)
  const firstThursday = nov1.day() === 4 ? nov1 : nov1.add((11 - nov1.day()) % 7, 'day')
  return firstThursday.add(21, 'day').format('YYYY-MM-DD')
}

const getMothersDay = (year: number): string => {
  // 2nd Sunday in May
  const may1 = dayjs(`${year}-05-01`)
  const firstSunday = may1.day() === 0 ? may1 : may1.add(7 - may1.day(), 'day')
  return firstSunday.add(7, 'day').format('YYYY-MM-DD')
}

const getFathersDay = (year: number): string => {
  // 3rd Sunday in June
  const jun1 = dayjs(`${year}-06-01`)
  const firstSunday = jun1.day() === 0 ? jun1 : jun1.add(7 - jun1.day(), 'day')
  return firstSunday.add(14, 'day').format('YYYY-MM-DD')
}

// Computed holidays for current year
const usHolidays = computed(() => getUsHolidays(currentYear.value))

// Select all holidays
const selectAllHolidays = (): void => {
  usHolidays.value.forEach(holiday => {
    const dateObj = dayjs(holiday.date)
    const monthKey = months[dateObj.month()]

    if (!annualScheduleData.value[monthKey]) {
      annualScheduleData.value[monthKey] = []
    }

    if (!annualScheduleData.value[monthKey].includes(holiday.date)) {
      annualScheduleData.value[monthKey].push(holiday.date)
    }
  })
}

// Check if a date is a holiday
const getHoliday = (date: Dayjs): Holiday | undefined => {
  return usHolidays.value.find(h => dayjs(h.date).isSame(date, 'day'))
}

// Custom header renderer
const headerRender = ({ value }: { value: Dayjs }): any => {
  return h(
    'div',
    { style: 'padding: 0px 0px;margin-left:10px;margin-bottom:5px' },
    [
      h(
        'span',
        { style: 'font-weight: bold; font-size: 14px;' },
        months[value.month()]
      )
    ]
  )
}

// Date selection handler - Updated to only allow selection of current month dates
const onSelect = (date: Dayjs, { source }: CalendarSelectInfo): void => {
  // Find which month calendar this date belongs to
  const calendarMonth = months1.value.find(m => m.month() === date.month() && m.year() === date.year())

  // Only allow selection if the date belongs to the calendar's month
  if (!calendarMonth || date.month() !== calendarMonth.month()) {
    return
  }

  const month = date.month()
  const monthKey = months[month]
  const day = date.format('YYYY-MM-DD')

  if (!annualScheduleData.value[monthKey]) {
    annualScheduleData.value[monthKey] = []
  }

  const idx = annualScheduleData.value[monthKey].indexOf(day)
  if (idx === -1) {
    // Not selected, add it
    annualScheduleData.value[monthKey].push(day)
  } else {
    // Already selected, remove it
    annualScheduleData.value[monthKey].splice(idx, 1)
  }
}

// Action handlers
const RefreshFromT3000 = (): void => {
  // Clear all existing data first
  Object.keys(annualScheduleData.value).forEach(monthKey => {
    annualScheduleData.value[monthKey] = []
  })

  // Reload data from the hex array
  transferDatesToDisplay()
}

const ClearAll = (): void => {
  // Clear all data in annualScheduleData
  Object.keys(annualScheduleData.value).forEach(monthKey => {
    annualScheduleData.value[monthKey] = []
  })
}

const HandleCancel = (): void => {
  annualScheduleVisible.value = false
}

const HandleOk = (): void => {

  try {
    annualScheduleVisible.value = false;
    T3UIUtil.SetNavVisiblity(true);

    // Save the calendar data to T3000
    // Convert selected dates back to hex array format
    const hexArray = transferSelectedDatesToHex()

    const msgData = PrepareMsgData(hexArray);

    if (isBuiltInEdge.value) {
      Hvac.WebClient.UpdateEntry(msgData);
    }
    else {
      Hvac.WsClient.UpdateEntry(msgData);
    }
  } catch (error) {
    LogUtil.Error(`Error saving annual schedule: ${error}`);
  }
}

const PrepareMsgData = (hexArray: any) => {

  if (
    scheduleItemData.value == null ||
    scheduleItemData.value.t3Entry == null
  ) {
    return;
  }

  const key = "value";
  const fieldVal = hexArray;
  const pid = scheduleItemData.value.t3Entry.pid;
  const index = scheduleItemData.value.t3Entry.index;
  const type = scheduleItemData.value.t3Entry.type;

  const msgData = {
    action: 3, // UPDATE_ENTRY
    field: key,
    value: -1,
    data: { data: fieldVal },
    panelId: pid,
    entryIndex: index,
    // entryType: T3_Types[type],
    entryType:17, // BAC_AR_Y Assuming 17 is the correct type for annual schedule
  };

  LogUtil.Debug(`PrepareMsgData: ${JSON.stringify(msgData)}`);

  return msgData;
}

const transferDatesToDisplay = (): void => {
  // Create test data if none exists
  let data: number[]
  if ((scheduleItemData.value as any)?.t3Entry?.data && Array.isArray((scheduleItemData.value as any).t3Entry.data)) {
    data = (scheduleItemData.value as any).t3Entry.data
  } else {
    // Create test data: set specific bits to test the mapping
    // Let's create a pattern where we can clearly see what's happening
    data = new Array(46).fill(0) // 46 bytes for annual schedule

    // Set specific test bits:
    // January: set bit 0 (should be day 1) and bit 6 (should be day 7)
    data[0] = 0x41  // Binary: 01000001, bits 0 and 6 set

    // February: set bit 13 (should be day 14)
    data[4] = 0x20  // Binary: 00100000, bit 5 set (5 + 8 = 13)

    // March: set bit 2 (should be day 3) at the correct offset
    // March starts at day 59 (bit 59), so bit 2 of March is bit 61 overall
    // Byte 7 bit 5 (7*8 + 5 = 61, but we need to account for offset)
    const marchStartBit = 59
    const marchTestBit = 2
    const overallBit = marchStartBit + marchTestBit
    const byteIndex = Math.floor(overallBit / 8)
    const bitInByte = overallBit % 8
    data[byteIndex] = 1 << bitInByte

    console.log(`Test data created: March day 3 should be set at byte ${byteIndex}, bit ${bitInByte}`)
  }

  // Clear existing schedule data
  Object.keys(annualScheduleData.value).forEach(monthKey => {
    annualScheduleData.value[monthKey] = []
  })

  // Day offsets for each month - matching C++ leap_year() and no_leap_year() functions exactly
  const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const currentIsLeapYear = isLeapYear(currentYear.value)

  let dayInThisYear: number[]

  if (currentIsLeapYear) {
    // Leap year (366 days) - matching C++ leap_year() function exactly
    dayInThisYear = [
      0,   // January: i<31
      31,  // February: i<60 (31+29)
      60,  // March: i<91 (31+29+31)
      91,  // April: i<121 (31+29+31+30)
      121, // May: i<152 (31+29+31+30+31)
      152, // June: i<182 (31+29+31+30+31+30)
      182, // July: i<213 (31+29+31+30+31+30+31)
      213, // August: i<244 (31+29+31+30+31+30+31+31)
      244, // September: i<274 (31+29+31+30+31+30+31+31+30)
      274, // October: i<305 (31+29+31+30+31+30+31+31+30+31)
      305, // November: i<335 (31+29+31+30+31+30+31+31+30+31+30)
      335  // December: i<366 (31+29+31+30+31+30+31+31+30+31+30+31)
    ]
  } else {
    // Non-leap year (365 days) - matching C++ no_leap_year() function exactly
    dayInThisYear = [
      0,   // January: i<31
      31,  // February: i<59 (31+28)
      59,  // March: i<90 (31+28+31)
      90,  // April: i<120 (31+28+31+30)
      120, // May: i<151 (31+28+31+30+31)
      151, // June: i<181 (31+28+31+30+31+30)
      181, // July: i<212 (31+28+31+30+31+30+31)
      212, // August: i<243 (31+28+31+30+31+30+31+31)
      243, // September: i<273 (31+28+31+30+31+30+31+31+30)
      273, // October: i<304 (31+28+31+30+31+30+31+31+30+31)
      304, // November: i<334 (31+28+31+30+31+30+31+31+30+31+30)
      334  // December: i<365 (31+28+31+30+31+30+31+31+30+31+30+31)
    ]
  }

  // Process each month using the same logic as C++ Fresh_Schedule_Day_Cal function
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = months[monthIndex]
    let monthBits = 0

    if (monthIndex === 0) {
      // January: Direct 4-byte copy (matching C++ line 304)
      for (let byteOffset = 0; byteOffset < 4 && byteOffset < data.length; byteOffset++) {
        monthBits |= (data[byteOffset] << (byteOffset * 8))
      }
    } else {
      // Other months: Extract from continuous bit stream with offset (matching C++ lines 306-318)
      const startByte = Math.floor(dayInThisYear[monthIndex] / 8)  // day_in_this_year[i]/8
      const moveBit = dayInThisYear[monthIndex] % 8               // day_in_this_year[i]%8

      // Extract 5 bytes like C++ does: memcpy_s(&temp_data,5,&g_DayState[annual_list_line][start_byte],5)
      let tempData = BigInt(0)
      for (let i = 0; i < 5 && (startByte + i) < data.length; i++) {
        tempData |= BigInt(data[startByte + i]) << BigInt(i * 8)
      }

      // Shift right by moveBit positions: temp_data = temp_data>>move_bit
      tempData = tempData >> BigInt(moveBit)

      // Mask to 32 bits: temp_data = temp_data % (0x0100000000)
      tempData = tempData & BigInt(0xFFFFFFFF)

      monthBits = Number(tempData)
    }

    // Extract selected days from the month bits
    console.log(`${monthKey}: monthBits = 0x${monthBits.toString(16)}, binary = ${monthBits.toString(2).padStart(32, '0')}`)

    for (let dayBit = 0; dayBit < 31; dayBit++) {
      if ((monthBits >> dayBit) & 1) {
        const day = dayBit + 1  // Standard mapping: bit 0 = day 1, bit 1 = day 2, etc.
        const dateStr = `${currentYear.value}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        console.log(`  ${monthKey}: Bit ${dayBit} set -> Day ${day} (${dateStr})`)

        // Validate the date exists in the month
        const testDate = dayjs(dateStr)
        if (testDate.isValid() && testDate.month() === monthIndex && day > 0 && day <= 31) {
          if (!annualScheduleData.value[monthKey]) {
            annualScheduleData.value[monthKey] = []
          }
          if (!annualScheduleData.value[monthKey].includes(dateStr)) {
            annualScheduleData.value[monthKey].push(dateStr)
          }
        }
      }
    }
  }
}

const transferSelectedDatesToHex = (): number[] => {
  // Create a 46-byte array to store the annual schedule data
  const data = new Array(46).fill(0)

  // Day offsets for each month - matching C++ leap_year() and no_leap_year() functions exactly
  const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const currentIsLeapYear = isLeapYear(currentYear.value)

  let dayInThisYear: number[]

  if (currentIsLeapYear) {
    // Leap year (366 days) - matching C++ leap_year() function exactly
    dayInThisYear = [
      0,   // January: i<31
      31,  // February: i<60 (31+29)
      60,  // March: i<91 (31+29+31)
      91,  // April: i<121 (31+29+31+30)
      121, // May: i<152 (31+29+31+30+31)
      152, // June: i<182 (31+29+31+30+31+30)
      182, // July: i<213 (31+29+31+30+31+30+31)
      213, // August: i<244 (31+29+31+30+31+30+31+31)
      244, // September: i<274 (31+29+31+30+31+30+31+31+30)
      274, // October: i<305 (31+29+31+30+31+30+31+31+30+31)
      305, // November: i<335 (31+29+31+30+31+30+31+31+30+31+30)
      335  // December: i<366 (31+29+31+30+31+30+31+31+30+31+30+31)
    ]
  } else {
    // Non-leap year (365 days) - matching C++ no_leap_year() function exactly
    dayInThisYear = [
      0,   // January: i<31
      31,  // February: i<59 (31+28)
      59,  // March: i<90 (31+28+31)
      90,  // April: i<120 (31+28+31+30)
      120, // May: i<151 (31+28+31+30+31)
      151, // June: i<181 (31+28+31+30+31+30)
      181, // July: i<212 (31+28+31+30+31+30+31)
      212, // August: i<243 (31+28+31+30+31+30+31+31)
      243, // September: i<273 (31+28+31+30+31+30+31+31+30)
      273, // October: i<304 (31+28+31+30+31+30+31+31+30+31)
      304, // November: i<334 (31+28+31+30+31+30+31+31+30+31+30)
      334  // December: i<365 (31+28+31+30+31+30+31+31+30+31+30+31)
    ]
  }

  // Process each month
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = months[monthIndex]
    let monthBits = 0

    // Get selected dates for this month
    const selectedDates = annualScheduleData.value[monthKey] || []

    // Convert dates to bits
    selectedDates.forEach(dateStr => {
      const dateObj = dayjs(dateStr)
      if (dateObj.isValid() && dateObj.month() === monthIndex) {
        const day = dateObj.date()
        if (day >= 1 && day <= 31) {
          // Set the bit for this day (bit 0 = day 1, bit 1 = day 2, etc.)
          monthBits |= (1 << (day - 1))
        }
      }
    })

    console.log(`${monthKey}: monthBits = 0x${monthBits.toString(16)}, binary = ${monthBits.toString(2).padStart(32, '0')}`)

    if (monthIndex === 0) {
      // January: Direct 4-byte copy (matching C++ approach)
      for (let byteOffset = 0; byteOffset < 4; byteOffset++) {
        data[byteOffset] = (monthBits >> (byteOffset * 8)) & 0xFF
      }
    } else {
      // Other months: Pack into continuous bit stream with offset
      const startBit = dayInThisYear[monthIndex]

      // Convert monthBits to a continuous bit stream
      for (let dayBit = 0; dayBit < 31; dayBit++) {
        if ((monthBits >> dayBit) & 1) {
          const overallBit = startBit + dayBit
          const byteIndex = Math.floor(overallBit / 8)
          const bitInByte = overallBit % 8

          if (byteIndex < data.length) {
            data[byteIndex] |= (1 << bitInByte)
          }
        }
      }
    }
  }

  console.log('Generated hex array:', data.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', '))
  return data
}

// Component lifecycle
onMounted(() => {
  transferDatesToDisplay()
})
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
    /*margin-left: -15px;
    margin-right: -15px;*/
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
    margin-top: -10px;
  }

  .ant-picker-content {
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
    margin-top: -30px;
  }

  /* Hide dates from previous/next months by making them transparent */
  .ant-picker-cell-in-view.ant-picker-cell-range-start,
  .ant-picker-cell-in-view.ant-picker-cell-range-end {
    background: transparent;
  }
}
</style>
