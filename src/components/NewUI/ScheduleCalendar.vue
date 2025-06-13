
<template>
  <div class="scheduler">
    <div class="calendar-container" ref="calendarContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';

// Define multi-word component name
defineOptions({
  name: 'ScheduleCalendar'
});

// Define types for calendar events
interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date | string;
  end: Date | string;
  category: 'time' | 'milestone' | 'task' | 'allday';
  isReadOnly?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  body?: string;
  location?: string;
}

// Calendar container reference
const calendarContainer = ref<HTMLElement | null>(null);
let calendar: Calendar | null = null;

// Sample calendars
const calendars = [
  {
    id: 'work',
    name: 'Work',
    color: '#ffffff',
    backgroundColor: '#00a9ff',
    borderColor: '#00a9ff',
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#ffffff',
    backgroundColor: '#ff5583',
    borderColor: '#ff5583',
  },
];

// Sample events
const initialEvents: CalendarEvent[] = [
  {
    id: '1',
    calendarId: 'work',
    title: 'Project Meeting',
    start: new Date(new Date().setHours(9, 0, 0)),
    end: new Date(new Date().setHours(10, 0, 0)),
    category: 'time',
  },
  {
    id: '2',
    calendarId: 'personal',
    title: 'Lunch',
    start: new Date(new Date().setHours(12, 0, 0)),
    end: new Date(new Date().setHours(13, 0, 0)),
    category: 'time',
  },
];

onMounted(() => {
  if (calendarContainer.value) {
    calendar = new Calendar(calendarContainer.value, {
      defaultView: 'week',
      useFormPopup: true,
      useDetailPopup: true,
      calendars,
      timezone: {
        zones: [
          {
            timezoneName: 'local',
            displayLabel: 'Local',
          },
        ],
      },
    });

    // Add initial events
    calendar.createEvents(initialEvents);

    // Event handlers
    calendar.on('clickEvent', (event) => {
      console.log('Event clicked', event);
    });

    calendar.on('beforeCreateEvent', (eventData) => {
      // Handle event creation
      const newEvent = {
        ...eventData,
        id: String(new Date().getTime()),
      };
      calendar?.createEvents([newEvent]);
    });
  }
});

onBeforeUnmount(() => {
  calendar?.destroy();
});

// Expose methods to manipulate calendar
const changeView = (viewName: 'month' | 'week' | 'day') => {
  calendar?.changeView(viewName);
};

const today = () => {
  calendar?.today();
};

const prev = () => {
  calendar?.prev();
};

const next = () => {
  calendar?.next();
};

// Expose methods to parent components
defineExpose({
  changeView,
  today,
  prev,
  next,
});
</script>

<style scoped>
.scheduler {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-container {
  flex-grow: 1;
  min-height: 600px;
  border: 1px solid #e5e5e5;
}
</style>
