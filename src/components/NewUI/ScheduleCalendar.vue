<template>
  <div class="calendar-container">
    <header class="header">
      <h2>Calendar</h2>
    </header>
    <article class="content">
      <aside class="sidebar">
        <div class="sidebar-item">
          <input class="checkbox-all" type="checkbox" id="all" value="all" v-model="viewAll">
          <label class="checkbox checkbox-all" for="all">View all</label>
        </div>
        <hr>
        <div v-for="calendar in calendars" :key="calendar.id" class="sidebar-item">
          <input type="checkbox" :id="calendar.id.toString()" :value="calendar.id"
            v-model="selectedCalendarIds">
          <label class="checkbox checkbox-calendar"
            :class="`checkbox-${calendar.id}`"
            :for="calendar.id.toString()">{{ calendar.name }}</label>
        </div>
      </aside>
      <section class="app-column">
        <nav class="navbar">
          <div class="dropdown" ref="dropdownRef">
            <div class="dropdown-trigger">
              <button class="button is-rounded" @click="toggleDropdown">
                <span class="button-text">{{ viewModeLabel }}</span>
                <span class="dropdown-icon toastui-calendar-icon toastui-calendar-ic-dropdown-arrow"></span>
              </button>
            </div>
            <div class="dropdown-menu" v-show="isDropdownOpen">
              <div class="dropdown-content">
                <a href="#" class="dropdown-item" @click.prevent="setViewMode('month')">Monthly</a>
                <a href="#" class="dropdown-item" @click.prevent="setViewMode('week')">Weekly</a>
                <a href="#" class="dropdown-item" @click.prevent="setViewMode('day')">Daily</a>
              </div>
            </div>
          </div>
          <button class="button is-rounded today" @click="moveToToday">Today</button>
          <button class="button is-rounded prev" @click="moveToPrev">
            <span>←</span>
          </button>
          <button class="button is-rounded next" @click="moveToNext">
            <span>→</span>
          </button>
          <span class="navbar--range">{{ currentRangeText }}</span>
          <div class="nav-checkbox">
            <input class="checkbox-collapse" type="checkbox" id="collapse" v-model="isCollapsed">
            <label for="collapse">Collapse duplicate events and disable the detail popup</label>
          </div>
        </nav>
        <main ref="calendarContainer"></main>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';

interface CalendarInfo {
  id: number;
  name: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  dragBackgroundColor: string;
}

interface CalendarEvent {
  id: string;
  calendarId: number;
  title: string;
  start: Date;
  end: Date;
  isAllday?: boolean;
  category: 'allday' | 'time';
  isVisible?: boolean;
  state?: string;
}

// Calendar configuration
const calendarContainer = ref<HTMLElement | null>(null);
const calendar = ref<Calendar | null>(null);
const viewMode = ref<'month' | 'week' | 'day'>('month');
const isDropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const currentRangeText = ref('');
const isCollapsed = ref(false);

// Calendar filtering
const viewAll = ref(true);
const calendars = ref<CalendarInfo[]>([
  { id: 1, name: 'My Calendar', color: '#ffffff', backgroundColor: '#9e5fff', borderColor: '#9e5fff', dragBackgroundColor: '#9e5fff' },
  { id: 2, name: 'Work', color: '#ffffff', backgroundColor: '#00a9ff', borderColor: '#00a9ff', dragBackgroundColor: '#00a9ff' },
  { id: 3, name: 'Family', color: '#ffffff', backgroundColor: '#ff5583', borderColor: '#ff5583', dragBackgroundColor: '#ff5583' },
  { id: 4, name: 'Friends', color: '#ffffff', backgroundColor: '#03bd9e', borderColor: '#03bd9e', dragBackgroundColor: '#03bd9e' },
  { id: 5, name: 'Travel', color: '#ffffff', backgroundColor: '#bbdc00', borderColor: '#bbdc00', dragBackgroundColor: '#bbdc00' }
]);
const selectedCalendarIds = ref<number[]>([1, 2, 3, 4, 5]);

// Sample events
const events = ref<CalendarEvent[]>([
  {
    id: '1',
    calendarId: 1,
    title: 'Meeting with team',
    start: new Date(new Date().setHours(9, 0)),
    end: new Date(new Date().setHours(10, 30)),
    category: 'time',
  },
  {
    id: '2',
    calendarId: 2,
    title: 'Project deadline',
    start: new Date(new Date().setHours(12, 0)),
    end: new Date(new Date().setHours(13, 30)),
    category: 'time',
  }
]);

const viewModeLabel = computed(() => {
  switch (viewMode.value) {
    case 'month': return 'Monthly';
    case 'week': return 'Weekly';
    case 'day': return 'Daily';
    default: return 'Monthly';
  }
});

// Initialize calendar
onMounted(() => {
  // Create calendar instance
  if (calendarContainer.value) {
    calendar.value = new Calendar(calendarContainer.value, {
      defaultView: viewMode.value,
      calendars: calendars.value,
      useDetailPopup: !isCollapsed.value,
      useFormPopup: true,
      isReadOnly: false,
      usageStatistics: false
    });

    // Add events
    calendar.value.createEvents(events.value);

    // Set initial range text
    updateRangeText();

    // Add event listeners for date range changes
    calendar.value.on('afterRenderSchedule', updateRangeText);

    // Handle clicks outside dropdown
    document.addEventListener('click', handleClickOutside);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  calendar.value?.destroy();
});

// Calendar controls
function moveToToday() {
  calendar.value?.today();
  updateRangeText();
}

function moveToPrev() {
  calendar.value?.prev();
  updateRangeText();
}

function moveToNext() {
  calendar.value?.next();
  updateRangeText();
}

function setViewMode(mode: 'month' | 'week' | 'day') {
  viewMode.value = mode;
  calendar.value?.changeView(mode);
  isDropdownOpen.value = false;
  updateRangeText();
}

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
}

function updateRangeText() {
  if (calendar.value) {
    const dateRange = calendar.value.getDateRangeStart().toDateString() +
      ' - ' + calendar.value.getDateRangeEnd().toDateString();
    currentRangeText.value = dateRange;
  }
}

// Watch for changes
watch(selectedCalendarIds, (newIds) => {
  calendars.value.forEach(cal => {
    calendar.value?.setCalendarVisibility(cal.id, newIds.includes(cal.id));
  });
});

watch(viewAll, (checked) => {
  if (checked) {
    selectedCalendarIds.value = calendars.value.map(cal => cal.id);
  } else {
    selectedCalendarIds.value = [];
  }
});

watch(isCollapsed, (collapsed) => {
  calendar.value?.setOptions({
    useDetailPopup: !collapsed
  });
});
</script>

<style scoped>
.calendar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.header {
  padding: 12px;
  border-bottom: 1px solid #e5e5e5;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  padding: 12px;
  border-right: 1px solid #e5e5e5;
}

.sidebar-item {
  margin-bottom: 8px;
}

.app-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 8px;
}

.button {
  cursor: pointer;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 6px 12px;
  background: white;
}

.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
}

.dropdown-item {
  display: block;
  padding: 8px 12px;
  text-decoration: none;
  color: #333;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

main {
  flex: 1;
  min-height: 600px;
}

.checkbox-1 {
  color: #9e5fff;
}
.checkbox-2 {
  color: #00a9ff;
}
.checkbox-3 {
  color: #ff5583;
}
.checkbox-4 {
  color: #03bd9e;
}
.checkbox-5 {
  color: #bbdc00;
}
</style>
