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
              <a-button class="t3-btn" size="small" type="primary" @click="selectAllHolidays">
                Select All Holidays
              </a-button>
              <a-button class="t3-btn" size="small" @click="RefreshFromT3000">Reset</a-button>
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
              <a-tooltip v-if="getHoliday(current)" :title="getHoliday(current).name">
                <div
                  :style="isSelected(current)
                    ? 'background: linear-gradient(135deg, #1890ff 0%, #4bd666 100%); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto; border: 2px solid #2cb481; text-decoration: underline;'
                    : 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: auto; font-weight: bold; text-decoration: underline; background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%); color: white;'">
                  {{ current.date() }}
                </div>
              </a-tooltip>
              <div v-else
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
import { ref, computed } from 'vue'
import { Calendar as ACalendar, Card as ACard, Tag, Row as ARow, Col as ACol, Button as AButton, Modal as AModal, ConfigProvider as AConfigProvider, Tooltip as ATooltip } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { annualScheduleVisible, annualScheduleData, scheduleItemData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'
import { locked } from 'src/lib/T3000/Hvac/Data/T3Data'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil'
import { h } from 'vue'

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
  LogUtil.Debug('= annual: selectAllHolidays Called')

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

  LogUtil.Debug('= annual: selectAllHolidays Completed', annualScheduleData.value)
}

// Check if a date is a holiday
const getHoliday = (date: Dayjs): Holiday | undefined => {
  return usHolidays.value.find(h => dayjs(h.date).isSame(date, 'day'))
}

// Custom header renderer
const headerRender = ({ value }: { value: Dayjs }): any => {
  LogUtil.Debug('= annual: headerRender Rendering header for value:', value)

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
  LogUtil.Debug('= annual: onSelect Date selected:', date, 'Source:', source)

  // Find which month calendar this date belongs to
  const calendarMonth = months1.value.find(m => m.month() === date.month() && m.year() === date.year())

  // Only allow selection if the date belongs to the calendar's month
  if (!calendarMonth || date.month() !== calendarMonth.month()) {
    LogUtil.Debug('= annual: onSelect Date not in current month, ignoring selection')
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

  LogUtil.Debug('= annual: onSelect Date toggled:', date, 'Source:', source, annualScheduleData.value)
}

// Action handlers
const RefreshFromT3000 = (): void => {
  LogUtil.Debug('= annual: RefreshFromT3000 Called')

  // Clear all existing data
  Object.keys(annualScheduleData.value).forEach(monthKey => {
    annualScheduleData.value[monthKey] = []
  })

  LogUtil.Debug('= annual: RefreshFromT3000 Completed')
}

const ClearAll = (): void => {
  LogUtil.Debug('= annual: ClearAll Called')

  // Clear all data in annualScheduleData
  Object.keys(annualScheduleData.value).forEach(monthKey => {
    annualScheduleData.value[monthKey] = []
  })

  LogUtil.Debug('= annual: ClearAll Completed', annualScheduleData.value)
}

const HandleCancel = (): void => {
  LogUtil.Debug('= annual: HandleCancel Called')
  annualScheduleVisible.value = false
}

const HandleOk = (): void => {
  LogUtil.Debug('= annual: HandleOk Called')
  annualScheduleVisible.value = false
  LogUtil.Debug('= annual: Data saved', annualScheduleData.value)
}

const PrepareTestData = () => {
  const testData = [
    0x7F, 0x01, 0x04, 0xB0, 0x88, 0x00, 0x02, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]

  LogUtil.Debug('= annual: Test data array created with 46 bytes:', testData)
  return testData
}

const TransferTestDataToDates = () => {
  var dates = PrepareTestData();

  // Convert test data to selected dates
  const selectedDates: string[] = [];

  // Process each month (12 months, 4 bytes each = 48 bytes, but we have 46 bytes)
  // Each month uses 4 bytes (32 bits) to represent up to 31 days
  for (let monthIndex = 0; monthIndex < 12 && (monthIndex * 4 + 3) < dates.length; monthIndex++) {
    const startByteIndex = monthIndex * 4;

    // Get 4 bytes for this month and convert to 32-bit value
    let monthBits = 0;
    for (let byteOffset = 0; byteOffset < 4; byteOffset++) {
      if (startByteIndex + byteOffset < dates.length) {
        // Reverse byte order (little-endian to big-endian)
        monthBits |= (dates[startByteIndex + byteOffset] << (byteOffset * 8));
      }
    }

    // Check each bit (day) in the month
    for (let dayBit = 0; dayBit < 31; dayBit++) {
      if ((monthBits >> dayBit) & 1) {
        // This day is selected
        const day = dayBit + 1;
        const monthKey = months[monthIndex];
        const dateStr = `${currentYear.value}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Validate the date exists in the month
        const testDate = dayjs(dateStr);
        if (testDate.isValid() && testDate.month() === monthIndex) {
          selectedDates.push(dateStr);

          // Add to annualScheduleData
          if (!annualScheduleData.value[monthKey]) {
            annualScheduleData.value[monthKey] = [];
          }
          if (!annualScheduleData.value[monthKey].includes(dateStr)) {
            annualScheduleData.value[monthKey].push(dateStr);
          }
        }
      }
    }
  }

  LogUtil.Debug('= annual: Parsed selected dates from test data:', selectedDates);
  return selectedDates;
}

const transferHexToBinary = (): number[] => {
  LogUtil.Debug('= annual: transferHexToBinary Called with scheduleItemData:', scheduleItemData.value.t3Entry?.data)

  // Convert the raw hex data to a JSON string representation
  const hexDataAsJson = JSON.stringify(scheduleItemData.value.t3Entry?.data || [])
  LogUtil.Debug('= annual: transferHexToBinary - Data as JSON string:', hexDataAsJson)

  const binaryArray: number[] = []

  // Check if scheduleItemData.value.t3Entry.data exists and is a valid array
  if (scheduleItemData.value?.t3Entry?.data && Array.isArray(scheduleItemData.value.t3Entry.data)) {
    // Process each byte in the array
    scheduleItemData.value.t3Entry.data.forEach((byteValue, index) => {
      LogUtil.Debug(`= annual: Processing byte ${index}: ${byteValue} (0x${byteValue.toString(16).padStart(2, '0')})`)

      // Convert each byte to 8 bits (LSB first - bit 0 to bit 7)
      for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
        const bit = (byteValue >> bitPosition) & 1
        binaryArray.push(bit)
      }
    })
  } else {
    LogUtil.Debug('= annual: transferHexToBinary - No valid data found in scheduleItemData.value.t3Entry.data')
  }

  LogUtil.Debug(`= annual: transferHexToBinary Result - Total bits: ${binaryArray.length}`, binaryArray)
  return binaryArray
}

const transferDatesToDisplay = (): void => {
  LogUtil.Debug('= annual: transferDatesToDisplay Called')

  // Check if scheduleItemData.value.t3Entry.data exists and is a valid array
  if (!(scheduleItemData.value as any)?.t3Entry?.data || !Array.isArray((scheduleItemData.value as any).t3Entry.data)) {
    LogUtil.Debug('= annual: transferDatesToDisplay - No valid data found in scheduleItemData.value.t3Entry.data')
    return
  }

  // Clear existing schedule data
  Object.keys(annualScheduleData.value).forEach(monthKey => {
    annualScheduleData.value[monthKey] = []
  })

  const data = (scheduleItemData.value as any).t3Entry.data
  LogUtil.Debug('= annual: Processing raw data:', data)

  // Day offsets for each month (cumulative days from Jan 1st)
  // Based on C++ code: day_in_this_year array
  const dayInThisYear = [
    0,   // January starts at day 0
    31,  // February starts after 31 days (Jan)
    59,  // March starts after 59 days (Jan+Feb)
    90,  // April starts after 90 days
    120, // May starts after 120 days
    151, // June starts after 151 days
    181, // July starts after 181 days
    212, // August starts after 212 days
    243, // September starts after 243 days
    273, // October starts after 273 days
    304, // November starts after 304 days
    334  // December starts after 334 days
  ]

  // Process each month using the continuous bit stream approach
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthKey = months[monthIndex]

    if (monthIndex === 0) {
      // January: Use first 4 bytes directly (days 0-31)
      let monthBits = 0
      for (let byteOffset = 0; byteOffset < 4; byteOffset++) {
        if (byteOffset < data.length) {
          monthBits |= (data[byteOffset] << (byteOffset * 8))
        }
      }

      LogUtil.Debug(`= annual: Month ${monthIndex + 1} (${monthKey}) - Direct bytes - Combined: 0x${monthBits.toString(16)}`)

      // Check each bit for days 1-31
      for (let dayBit = 0; dayBit < 31; dayBit++) {
        if ((monthBits >> dayBit) & 1) {
          const day = dayBit + 1
          const dateStr = `${currentYear.value}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

          if (!annualScheduleData.value[monthKey]) {
            annualScheduleData.value[monthKey] = []
          }
          if (!annualScheduleData.value[monthKey].includes(dateStr)) {
            annualScheduleData.value[monthKey].push(dateStr)
            LogUtil.Debug(`= annual: Added date ${dateStr} (day ${day}) for month ${monthKey}`)
          }
        }
      }
    } else {
      // Other months: Extract from continuous bit stream with offset
      const startDayInYear = dayInThisYear[monthIndex]
      const startByte = Math.floor(startDayInYear / 8)
      const moveBit = startDayInYear % 8

      LogUtil.Debug(`= annual: Month ${monthIndex + 1} (${monthKey}) - Start day: ${startDayInYear}, Start byte: ${startByte}, Move bit: ${moveBit}`)

      // Extract 5 bytes to ensure we have enough data for shifting
      let tempData = BigInt(0)
      for (let i = 0; i < 5 && (startByte + i) < data.length; i++) {
        tempData |= BigInt(data[startByte + i]) << BigInt(i * 8)
      }

      // Shift right by moveBit positions to align month start to bit 0
      tempData = tempData >> BigInt(moveBit)

      // Mask to 32 bits for month data
      const monthBits = Number(tempData & BigInt(0xFFFFFFFF))

      LogUtil.Debug(`= annual: Month ${monthIndex + 1} (${monthKey}) - Shifted bits: 0x${monthBits.toString(16)}`)

      // Check each bit for days 1-31
      for (let dayBit = 0; dayBit < 31; dayBit++) {
        if ((monthBits >> dayBit) & 1) {
          const day = dayBit + 1
          const dateStr = `${currentYear.value}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

          // Validate the date exists in the month
          const testDate = dayjs(dateStr)
          if (testDate.isValid() && testDate.month() === monthIndex) {
            if (!annualScheduleData.value[monthKey]) {
              annualScheduleData.value[monthKey] = []
            }
            if (!annualScheduleData.value[monthKey].includes(dateStr)) {
              annualScheduleData.value[monthKey].push(dateStr)
              LogUtil.Debug(`= annual: Added date ${dateStr} (day ${day}) for month ${monthKey}`)
            }
          }
        }
      }
    }
  }

  LogUtil.Debug('= annual: transferDatesToDisplay Completed - Selected dates loaded:', annualScheduleData.value)
}

// Load test data on component mount
import { onMounted } from 'vue'

onMounted(() => {
  LogUtil.Debug('= annual: Component mounted, loading test data with scheduleItemData', scheduleItemData.value);
  LogUtil.Debug('= annual: Initializing annual schedule data for year:', currentYear.value);
  LogUtil.Debug('= annual: annualScheduleData on mounted:', annualScheduleData.value);

  // Run analysis first to determine correct format
  analyzeDataFormat();

  // Test the continuous bit logic
  testContinuousBitLogic();

  transferDatesToDisplay();

  /*
  const testData = TransferToDates();// PrepareTestData()

  // Parse test data and populate the schedule
  // For demonstration, let's select some random dates based on the test data
  const selectedDates = [
    `${currentYear.value}-01-01`, // New Year's Day
    `${currentYear.value}-01-15`, // MLK Day area
    `${currentYear.value}-02-14`, // Valentine's Day
    `${currentYear.value}-03-17`, // St. Patrick's Day
    `${currentYear.value}-07-04`, // Independence Day
    `${currentYear.value}-10-31`, // Halloween
    `${currentYear.value}-12-25`, // Christmas
  ]

  selectedDates.forEach(dateStr => {
    const dateObj = dayjs(dateStr)
    const monthKey = months[dateObj.month()]

    if (!annualScheduleData.value[monthKey]) {
      annualScheduleData.value[monthKey] = []
    }

    if (!annualScheduleData.value[monthKey].includes(dateStr)) {
      annualScheduleData.value[monthKey].push(dateStr)
    }
  })

  LogUtil.Debug('= annual: Test data loaded into schedule:', annualScheduleData.value)
  */
})

// Test function to analyze the data format
const analyzeDataFormat = (): void => {
  // Use actual data if available, otherwise use test data
  let dataToAnalyze: number[]
  if ((scheduleItemData.value as any)?.t3Entry?.data && Array.isArray((scheduleItemData.value as any).t3Entry.data)) {
    dataToAnalyze = (scheduleItemData.value as any).t3Entry.data
    LogUtil.Debug('= annual: analyzeDataFormat - Using actual scheduleItemData:', dataToAnalyze)
  } else {
    dataToAnalyze = PrepareTestData()
    LogUtil.Debug('= annual: analyzeDataFormat - Using test data:', dataToAnalyze)
  }

  // Expected results for verification
  const expectedResults = {
    January: [1,2,3,4,5,6,7,9,19,29],
    February: [1,5,9,19],
    June: [3]
  }

  LogUtil.Debug('= annual: Expected results:', expectedResults)

  // Analyze January (first 4 bytes)
  const janBytes = dataToAnalyze.slice(0, 4)
  LogUtil.Debug('= annual: Analyzing January bytes:', janBytes, 'hex:', janBytes.map(b => '0x' + b.toString(16).padStart(2, '0')))

  // Analyze February (bytes 4-7)
  const febBytes = dataToAnalyze.slice(4, 8)
  LogUtil.Debug('= annual: Analyzing February bytes:', febBytes, 'hex:', febBytes.map(b => '0x' + b.toString(16).padStart(2, '0')))

  // Analyze June (bytes 20-23)
  const junBytes = dataToAnalyze.slice(20, 24)
  LogUtil.Debug('= annual: Analyzing June bytes:', junBytes, 'hex:', junBytes.map(b => '0x' + b.toString(16).padStart(2, '0')))

  // Test different bit ordering approaches for January
  LogUtil.Debug('= annual: Testing different approaches for January:')

  // Approach 1: LSB first within each byte, bytes in order
  const jan1Results: number[] = []
  for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
    for (let bit = 0; bit < 8; bit++) {
      const day = byteIdx * 8 + bit + 1
      if (day <= 31 && ((janBytes[byteIdx] >> bit) & 1)) {
        jan1Results.push(day)
      }
    }
  }
  LogUtil.Debug('= annual: Approach 1 (LSB first per byte):', jan1Results)

  // Approach 2: MSB first within each byte, bytes in order
  const jan2Results: number[] = []
  for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
    for (let bit = 7; bit >= 0; bit--) {
      const day = byteIdx * 8 + (7 - bit) + 1
      if (day <= 31 && ((janBytes[byteIdx] >> bit) & 1)) {
        jan2Results.push(day)
      }
    }
  }
  LogUtil.Debug('= annual: Approach 2 (MSB first per byte):', jan2Results)

  // Approach 3: 32-bit little-endian combination
  let jan32bit = 0
  for (let i = 0; i < 4; i++) {
    jan32bit |= (janBytes[i] << (i * 8))
  }
  LogUtil.Debug('= annual: 32-bit LE value: 0x' + jan32bit.toString(16))
  const jan3Results: number[] = []
  for (let bit = 0; bit < 31; bit++) {
    if ((jan32bit >> bit) & 1) {
      jan3Results.push(bit + 1)
    }
  }
  LogUtil.Debug('= annual: Approach 3 (32-bit little-endian):', jan3Results)

  // Approach 4: 32-bit big-endian combination
  let jan32bitBE = 0
  for (let i = 0; i < 4; i++) {
    jan32bitBE |= (janBytes[i] << ((3 - i) * 8))
  }
  LogUtil.Debug('= annual: 32-bit BE value: 0x' + jan32bitBE.toString(16))
  const jan4Results: number[] = []
  for (let bit = 0; bit < 31; bit++) {
    if ((jan32bitBE >> bit) & 1) {
      jan4Results.push(bit + 1)
    }
  }
  LogUtil.Debug('= annual: Approach 4 (32-bit big-endian):', jan4Results)

  // Compare with expected
  LogUtil.Debug('= annual: Expected January:', expectedResults.January)
  LogUtil.Debug('= annual: Approach comparisons:')
  LogUtil.Debug('= annual: Approach 1 match:', JSON.stringify(jan1Results.sort((a,b) => a-b)) === JSON.stringify(expectedResults.January.sort((a,b) => a-b)))
  LogUtil.Debug('= annual: Approach 2 match:', JSON.stringify(jan2Results.sort((a,b) => a-b)) === JSON.stringify(expectedResults.January.sort((a,b) => a-b)))
  LogUtil.Debug('= annual: Approach 3 match:', JSON.stringify(jan3Results.sort((a,b) => a-b)) === JSON.stringify(expectedResults.January.sort((a,b) => a-b)))
  LogUtil.Debug('= annual: Approach 4 match:', JSON.stringify(jan4Results.sort((a,b) => a-b)) === JSON.stringify(expectedResults.January.sort((a,b) => a-b)))

  // Test February with the same approaches
  LogUtil.Debug('= annual: Testing February with all approaches:')

  // Feb Approach 1
  const feb1Results: number[] = []
  for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
    for (let bit = 0; bit < 8; bit++) {
      const day = byteIdx * 8 + bit + 1
      if (day <= 31 && ((febBytes[byteIdx] >> bit) & 1)) {
        feb1Results.push(day)
      }
    }
  }
  LogUtil.Debug('= annual: Feb Approach 1:', feb1Results)

  // Feb Approach 3 (32-bit LE)
  let feb32bit = 0
  for (let i = 0; i < 4; i++) {
    feb32bit |= (febBytes[i] << (i * 8))
  }
  const feb3Results: number[] = []
  for (let bit = 0; bit < 31; bit++) {
    if ((feb32bit >> bit) & 1) {
      feb3Results.push(bit + 1)
    }
  }
  LogUtil.Debug('= annual: Feb Approach 3 (32-bit LE):', feb3Results)
  LogUtil.Debug('= annual: Expected February:', expectedResults.February)
  LogUtil.Debug('= annual: Feb Approach 3 match:', JSON.stringify(feb3Results.sort((a,b) => a-b)) === JSON.stringify(expectedResults.February.sort((a,b) => a-b)))

  // Test June
  LogUtil.Debug('= annual: Testing June approach 3:')
  let jun32bit = 0
  for (let i = 0; i < 4; i++) {
    jun32bit |= (junBytes[i] << (i * 8))
  }
  const jun3Results: number[] = []
  for (let bit = 0; bit < 31; bit++) {
    if ((jun32bit >> bit) & 1) {
      jun3Results.push(bit + 1)
    }
  }
  LogUtil.Debug('= annual: Jun Approach 3 (32-bit LE):', jun3Results)
  LogUtil.Debug('= annual: Expected June:', expectedResults.June)
  LogUtil.Debug('= annual: Jun Approach 3 match:', JSON.stringify(jun3Results.sort((a,b) => a-b)) === JSON.stringify(expectedResults.June.sort((a,b) => a-b)))
}

// Debug function to test the continuous bit stream logic
const testContinuousBitLogic = (): void => {
  const testData = PrepareTestData()
  LogUtil.Debug('= annual: testContinuousBitLogic - Test data:', testData)

  // Expected results for verification
  const expectedResults = {
    January: [1,2,3,4,5,6,7,9,19,29],
    February: [1,5,9,19],
    June: [3]
  }

  // Day offsets for each month (from C++ code)
  const dayInThisYear = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

  // Test January (month 0)
  LogUtil.Debug('= annual: Testing January with continuous bit logic:')
  let janBits = 0
  for (let i = 0; i < 4; i++) {
    janBits |= (testData[i] << (i * 8))
  }
  const janResults: number[] = []
  for (let bit = 0; bit < 31; bit++) {
    if ((janBits >> bit) & 1) {
      janResults.push(bit + 1)
    }
  }
  LogUtil.Debug('= annual: January results:', janResults)
  LogUtil.Debug('= annual: Expected January:', expectedResults.January)
  LogUtil.Debug('= annual: January match:', JSON.stringify(janResults.sort((a,b) => a-b)) === JSON.stringify(expectedResults.January.sort((a,b) => a-b)))

  // Test February (month 1)
  LogUtil.Debug('= annual: Testing February with continuous bit logic:')
  const febStartDay = dayInThisYear[1] // 31
  const febStartByte = Math.floor(febStartDay / 8) // 3
  const febMoveBit = febStartDay % 8 // 7
  LogUtil.Debug(`= annual: February - Start day: ${febStartDay}, Start byte: ${febStartByte}, Move bit: ${febMoveBit}`)

  let febTempData = BigInt(0)
  for (let i = 0; i < 5 && (febStartByte + i) < testData.length; i++) {
    febTempData |= BigInt(testData[febStartByte + i]) << BigInt(i * 8)
  }
  febTempData = febTempData >> BigInt(febMoveBit)
  const febBits = Number(febTempData & BigInt(0xFFFFFFFF))

  const febResults: number[] = []
  for (let bit = 0; bit < 31; bit++) {
    if ((febBits >> bit) & 1) {
      febResults.push(bit + 1)
    }
  }
  LogUtil.Debug('= annual: February results:', febResults)
  LogUtil.Debug('= annual: Expected February:', expectedResults.February)
  LogUtil.Debug('= annual: February match:', JSON.stringify(febResults.sort((a,b) => a-b)) === JSON.stringify(expectedResults.February.sort((a,b) => a-b)))

  // Test June (month 5)
  LogUtil.Debug('= annual: Testing June with continuous bit logic:')
  const junStartDay = dayInThisYear[5] // 151
  const junStartByte = Math.floor(junStartDay / 8) // 18
  const junMoveBit = junStartDay % 8 // 7
  LogUtil.Debug(`= annual: June - Start day: ${junStartDay}, Start byte: ${junStartByte}, Move bit: ${junMoveBit}`)

  let junTempData = BigInt(0)
  for (let i = 0; i < 5 && (junStartByte + i) < testData.length; i++) {
    junTempData |= BigInt(testData[junStartByte + i]) << BigInt(i * 8)
  }
  junTempData = junTempData >> BigInt(junMoveBit)
  const junBits = Number(junTempData & BigInt(0xFFFFFFFF))

  const junResults: number[] = []
  for (let bit = 0; bit < 31; bit++) {
    if ((junBits >> bit) & 1) {
      junResults.push(bit + 1)
    }
  }
  LogUtil.Debug('= annual: June results:', junResults)
  LogUtil.Debug('= annual: Expected June:', expectedResults.June)
  LogUtil.Debug('= annual: June match:', JSON.stringify(junResults.sort((a,b) => a-b)) === JSON.stringify(expectedResults.June.sort((a,b) => a-b)))
}

// ...existing code...
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
