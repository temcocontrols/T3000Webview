<template>
  <a-modal v-model:visible="scheduleModalVisible" title="Schedule" :width="1000" @ok="handleOk" @cancel="handleCancel">
    <div class="schedule-calendar-container">
      <div class="calendar-header">
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


    </div>
  </a-modal>

  <a-modal v-model:visible="isEventModalVisible" :title="modalMode === 'create' ? 'Create Event' : 'Edit Event'"
    @ok="handleModalOk" @cancel="handleModalCancel">
    <a-form :model="eventForm" layout="vertical">
      <a-form-item label="Title" name="title">
        <a-input v-model:value="eventForm.title" />
      </a-form-item>
      <a-form-item label="Start Date" name="start">
        <!-- <a-date-picker v-model:value="eventForm.start" :showTime="true" format="YYYY-MM-DD HH:mm" /> -->
      </a-form-item>
      <a-form-item label="End Date" name="end">
        <!-- <a-date-picker v-model:value="eventForm.end" :showTime="true" format="YYYY-MM-DD HH:mm" /> -->
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

        // modalMode.value = 'create';
        // eventForm.title = '';
        // eventForm.start = newStart;
        // eventForm.end = newEnd;
        // eventForm.category = eventInfo.isAllDay ? 'allday' : 'time';
        // scheduleModalVisible.value = false;
        scheduleModalVisible.value = true;
      }
      catch (error) {
        console.error('Error parsing date:', error);
        return;
      }


    });



    console.log('Calendar events registered');
  } catch (error) {
    console.error('Error initializing calendar:', error);
  }
});
</script>

<style scoped>
.schedule-calendar-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  margin-bottom: 20px;
}

.calendar-container {
  width: 100%;
  height: 600px;
  flex-grow: 1;
}
</style>
