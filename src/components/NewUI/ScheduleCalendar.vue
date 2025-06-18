<template>
  <a-modal v-model:visible="scheduleModalVisible" title="Schedule" :width="800" style="top: 20px;height: 600px;"
    @ok="handleOk" @cancel="handleCancel">
    <div class="schedule-calendar-container">
      <!-- <div class="calendar-header"> -->
        <a-row type="flex" justify="space-between" align="middle">
          <a-col>
            <a-button-group>
              <a-button @click="goToPrev">
                <template #icon>
                  <LeftOutlined />
                </template>
              </a-button>
              <a-button @click="goToToday">Today</a-button>
              <a-button @click="goToNext">
                <template #icon>
                  <RightOutlined />
                </template>
              </a-button>
            </a-button-group>
          </a-col>
          <a-col>
            <h2>{{ currentViewTitle }}</h2>
          </a-col>
          <a-col>
            <a-radio-group v-model:value="currentView">
              <a-radio-button value="day">Daily</a-radio-button>
              <a-radio-button value="week">Weekly</a-radio-button>
              <a-radio-button value="month">Monthly</a-radio-button>
            </a-radio-group>
          </a-col>
        </a-row>
      </div>
      <div ref="calendarRef" class="calendar-container"></div>
    <!-- </div> -->
  </a-modal>

  <a-modal v-model:visible="isEventModalVisible" :title="modalMode === 'create' ? 'Create Schedule' : 'Edit Schedule'"
    @ok="handleModalOk" @cancel="handleModalCancel">
    <a-form :model="eventForm" layout="vertical">
      <a-form-item label="On/Off" name="onoff">
        <a-switch v-model:checked="eventForm.title" checked-children="On" un-checked-children="Off" />
      </a-form-item>
      <a-form-item label="Start Date" name="start">
        <!-- <a-date-picker v-model:value="eventForm.start" :showTime="true" format="YYYY-MM-DD HH:mm" /> -->
        <a-row gutter="8">
          <a-col>
            <a-select v-model:value="eventForm.start" :value="dayjs(eventForm.start).format('YYYY-MM-DD')" disabled
              style="width: 120px;">
              <a-select-option :value="dayjs(eventForm.start).format('YYYY-MM-DD')">
                {{ dayjs(eventForm.start).format('YYYY-MM-DD') }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col>
            <a-select v-model:value="eventForm.start" :value="dayjs(eventForm.start).hour()" style="width: 70px"
              @change="val => { eventForm.start = dayjs(eventForm.start).hour(val).toDate() }">
              <a-select-option v-for="h in 24" :key="h - 1" :value="h - 1">
                {{ (h - 1).toString().padStart(2, '0') }}
              </a-select-option>
            </a-select>
            :
            <a-select v-model:value="eventForm.start" :value="dayjs(eventForm.start).minute()" style="width: 70px"
              @change="val => { eventForm.start = dayjs(eventForm.start).minute(val).toDate() }">
              <a-select-option v-for="m in 60" :key="m - 1" :value="m - 1">
                {{ (m - 1).toString().padStart(2, '0') }}
              </a-select-option>
            </a-select>
          </a-col>
        </a-row>
      </a-form-item>
      <a-form-item label="End Date" name="end">
        <!-- <a-date-picker v-model:value="eventForm.end" :showTime="true" format="YYYY-MM-DD HH:mm" /> -->
        <a-row gutter="8">
          <a-col>
            <a-select v-model:value="eventForm.end" :value="dayjs(eventForm.end).format('YYYY-MM-DD')" disabled
              style="width: 120px;">
              <a-select-option :value="dayjs(eventForm.end).format('YYYY-MM-DD')">
                {{ dayjs(eventForm.end).format('YYYY-MM-DD') }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col>
            <a-select v-model:value="eventForm.end" :value="dayjs(eventForm.end).hour()" style="width: 70px"
              @change="val => { eventForm.end = dayjs(eventForm.end).hour(val).toDate() }">
              <a-select-option v-for="h in 24" :key="h - 1" :value="h - 1">
                {{ (h - 1).toString().padStart(2, '0') }}
              </a-select-option>
            </a-select>
            :
            <a-select v-model:value="eventForm.end" :value="dayjs(eventForm.end).minute()" style="width: 70px"
              @change="val => { eventForm.end = dayjs(eventForm.end).minute(val).toDate() }">
              <a-select-option v-for="m in 60" :key="m - 1" :value="m - 1">
                {{ (m - 1).toString().padStart(2, '0') }}
              </a-select-option>
            </a-select>
          </a-col>
        </a-row>
      </a-form-item>
      <a-form-item label="Category" name="category">
        <a-select v-model:value="eventForm.category">
          <a-select-option value="time">Time</a-select-option>
          <a-select-option value="allday">All Day</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button key="back" @click="handleModalCancel">Cancel</a-button>
      <a-button v-if="modalMode === 'edit'" key="delete" danger @click="handleDeleteEvent">Delete</a-button>
      <a-button key="submit" type="primary" @click="handleModalOk">Save</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { defineComponent, ref, onMounted, reactive, computed, watch, defineOptions } from 'vue';
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
import { format } from 'date-fns';
import { scheduleModalVisible, selectedSchedule } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import 'tui-date-picker/dist/tui-date-picker.css';
import 'tui-time-picker/dist/tui-time-picker.css';
import dayjs from 'dayjs';
import 'dayjs/locale/en'; // Import locale you need, 'en' for English
dayjs.locale('en'); // Use the imported locale

interface EventFormState {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: string;
}

interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
}

type ViewType = 'day' | 'week' | 'month';
type ModalModeType = 'create' | 'edit';

interface EventFormState {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: string;
}

interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
}

defineOptions({
  name: 'ScheduleCalendar',
});

const calendarRef = ref<HTMLElement | null>(null);
let calendar: Calendar | null = null;
const isEventModalVisible = ref<boolean>(false);
const modalMode = ref<ModalModeType>('create');
const selectedEventId = ref<string | null>(null);
const currentView = ref<ViewType>('week');
const currentDate = ref<Date>(new Date());

const eventForm = reactive<EventFormState>({
  id: '',
  title: '',
  start: new Date(),
  end: new Date(),
  category: 'time',
});

const events = ref<CalendarEvent[]>([]);

const currentViewTitle = computed<string>(() => {
  return format(currentDate.value, 'MMMM yyyy');
});

const resetEventForm = (): void => {
  eventForm.id = '';
  eventForm.title = '';
  eventForm.start = new Date();
  eventForm.end = new Date();
  eventForm.category = 'time';
};

const handleModalOk = (): void => {
  if (!eventForm.title) {
    return;
  }

  if (modalMode.value === 'create') {
    const newEventId = `event-${Date.now()}`;
    const newEvent: CalendarEvent = {
      id: newEventId,
      calendarId: '1',
      title: eventForm.title,
      start: eventForm.start,
      end: eventForm.end,
      isAllDay: eventForm.category === 'allday',
    };

    calendar?.createEvents([newEvent]);
    events.value.push(newEvent);
  } else if (modalMode.value === 'edit' && selectedEventId.value) {
    const updatedEvent: CalendarEvent = {
      id: selectedEventId.value,
      calendarId: '1',
      title: eventForm.title,
      start: eventForm.start,
      end: eventForm.end,
      isAllDay: eventForm.category === 'allday',
    };

    calendar?.updateEvent(
      updatedEvent.id,
      '1',
      updatedEvent
    );

    const eventIndex = events.value.findIndex(e => e.id === selectedEventId.value);
    if (eventIndex !== -1) {
      events.value[eventIndex] = updatedEvent;
    }
  }

  isEventModalVisible.value = false;
  resetEventForm();
};

const handleModalCancel = (): void => {
  isEventModalVisible.value = false;
  resetEventForm();
};

const handleDeleteEvent = (): void => {
  if (selectedEventId.value) {
    calendar?.deleteEvent(selectedEventId.value, '1');

    const eventIndex = events.value.findIndex(e => e.id === selectedEventId.value);
    if (eventIndex !== -1) {
      events.value.splice(eventIndex, 1);
    }

    isEventModalVisible.value = false;
    resetEventForm();
  }
};

const goToPrev = (): void => {
  calendar?.prev();
  if (calendar) {
    currentDate.value = calendar.getDate().toDate();
  }
};

const goToNext = (): void => {
  calendar?.next();
  if (calendar) {
    currentDate.value = calendar.getDate().toDate();
  }
};

const goToToday = (): void => {
  calendar?.today();
  if (calendar) {
    currentDate.value = calendar.getDate().toDate();
  }
};

const handleOk = (): void => {
  scheduleModalVisible.value = false;
};

const handleCancel = (): void => {
  scheduleModalVisible.value = false;
};

watch(currentView, (newView) => {
  if (calendar) {
    calendar.changeView(newView);
  }
});

const hideUIPanel = () => {
  // Remove the "Milestone" button from the calendar UI if it exists
  // Toast UI Calendar does not show a "Milestone" button by default in v2+,
  // but if you see it, you can hide it via CSS or by not using milestone features.
  // Here is a CSS-based approach:
  const style = document.createElement('style');
  style.innerHTML = `
      .toastui-calendar-milestone { display: none !important; }
    `;
  document.head.appendChild(style);

  /**
   * Remove the "Task" button from the Toast UI Calendar UI if it exists.
   * Toast UI Calendar v2+ does not show a "Task" button by default,
   * but if you see it, you can hide it via CSS.
   */
  const taskStyle = document.createElement('style');
  taskStyle.innerHTML = `
      .toastui-calendar-task { display: none !important; }
    `;
  document.head.appendChild(taskStyle);

  /**
   * Hide the "All Day" row and label in Toast UI Calendar.
   * This can be done via CSS since Toast UI Calendar does not provide a direct API to remove it.
   */
  const allDayStyle = document.createElement('style');
  allDayStyle.innerHTML = `
      .toastui-calendar-allday-panel,
      .toastui-calendar-allday {
        display: none !important;
      }
    `;
  document.head.appendChild(allDayStyle);
};

onMounted(() => {
  console.log('Calendar ref is set:', calendarRef.value);

  if (!calendarRef.value) {
    console.error('Calendar ref is not available');
    return;
  }

  try {
    // Define proper types for calendar events
    type CalendarEventObject = {
      title?: string;
      start?: Date;
      end?: Date;
      isAllDay?: boolean;
      id: string;
      calendarId: string;
    };

    type CalendarUpdateInfo = {
      event: CalendarEventObject;
      changes: Partial<CalendarEventObject>;
    };

    type CalendarEventInfo = {
      event: CalendarEventObject;
    };

    // Initialize the calendar with proper options
    calendar = new Calendar(calendarRef.value, {
      defaultView: currentView.value,
      useFormPopup: false,
      useDetailPopup: false,
      useCreationPopup: false,
      week: {
        showTimezoneCollapseButton: true,
        timezonesCollapsed: true
      },
      month: {
        visibleWeeksCount: 6
      },
      template: {
        time(event) {
          return `<span style="color: white;">${event.title}</span>`;
        }
      },
      calendars: [
        {
          id: '1',
          name: 'Schedule',
          color: '#ffffff',
          bgColor: '#1890ff',
          borderColor: '#1890ff'
        }
      ]
    });


    if (!calendar) {
      console.error('Failed to initialize calendar');
      return;
    }

    console.log('Calendar initialized successfully:', calendar);
    currentDate.value = calendar.getDate().toDate();

    // Register event handlers
    calendar.on('beforeCreateEvent', (eventObj: CalendarEventObject) => {
      console.log('Calendar beforeCreateEvent triggered:', eventObj);
      modalMode.value = 'create';
      eventForm.title = eventObj.title || '';
      eventForm.start = eventObj.start || new Date();
      eventForm.end = eventObj.end || new Date();
      eventForm.category = eventObj.isAllDay ? 'allday' : 'time';
      isEventModalVisible.value = true;
    });

    calendar.on('beforeUpdateEvent', ({ event, changes }: CalendarUpdateInfo) => {
      console.log('Calendar beforeUpdateEvent triggered:', event, changes);
      const { id, calendarId } = event;
      calendar?.updateEvent(id, calendarId, changes);
    });

    calendar.on('clickEvent', ({ event }: CalendarEventInfo) => {
      console.log('Calendar clickEvent triggered:', event);
      selectedEventId.value = event.id;
      modalMode.value = 'edit';
      eventForm.title = event.title || '';
      eventForm.start = event.start || new Date();
      eventForm.end = event.end || new Date();
      eventForm.category = event.isAllDay ? 'allday' : 'time';
      isEventModalVisible.value = true;
    });

    // Handle clicking on a time slot to create a new event
    calendar.on('clickTimeGrid', (eventInfo) => {
      console.log('Calendar Time grid clicked:', eventInfo);
      isEventModalVisible.value = true;
      if (eventInfo.time) {
        const newStart = new Date(eventInfo.time);
        const newEnd = new Date(newStart);
        newEnd.setHours(newStart.getHours() + 1);

        modalMode.value = 'create';
        eventForm.title = '';
        eventForm.start = newStart;
        eventForm.end = newEnd;
        eventForm.category = 'time';
        isEventModalVisible.value = true;
      }
    });

    // Handle creating events in month view by clicking on a date
    calendar.on('selectDateTime', (eventInfo) => {
      isEventModalVisible.value = true;
      console.log('Calendar Date selected:', eventInfo);

      try {

        const date4 = eventInfo.start; // This is a native Date object

        // Using native JS
        const formatted = date4.toLocaleString('en-US');
        console.log('Selected:', formatted);

        // const newStart = new Date(eventInfo.start);
        // const newEnd = new Date(eventInfo.end);

        const newStart = dayjs(eventInfo.start).toDate();
        const newEnd = dayjs(eventInfo.end).toDate();
        console.log('Parsed Start:', newStart);
        console.log('Parsed End:', newEnd);

        modalMode.value = 'create';
        eventForm.title = '';
        eventForm.start = newStart;
        eventForm.end = newEnd;
        eventForm.category = eventInfo.isAllDay ? 'allday' : 'time';
        scheduleModalVisible.value = true;
      }
      catch (error) {
        console.error('Error parsing date:', error);
        return;
      }
    });

    hideUIPanel();
    console.log('Calendar events registered');
  } catch (error) {
    console.error('Error initializing calendar:', error);
  }
});
</script>

<style scoped>
.schedule-calendar-container {
  width: 100%;
  /* height: 100%; */
  display: flex;
  flex-direction: column;
}

.calendar-header {
  margin-bottom: 5px;
}

.calendar-container {
  width: 100%;
  /* height: 400px; */
  flex-grow: 1;
}

/* Set Toast UI Calendar week view layout height */
:deep(.toastui-calendar-layout.toastui-calendar-week-view) {
  height: 400px !important;
}

:deep(.toastui-calendar-panel.toastui-calendar-time) {
  height: 350px !important;
}

</style>
