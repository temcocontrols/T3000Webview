<template>
  <a-modal v-model:visible="scheduleModalVisible" title="Schedule" :width="1000" @ok="handleOk" @cancel="handleCancel">
    <div class="schedule-calendar-container">
      <div class="calendar-header">
        <a-row type="flex" justify="space-between" align="middle">
          <a-col>
            <a-button-group>
              <a-button @click="goToPrev">
                <template #icon><left-outlined /></template>
              </a-button>
              <a-button @click="goToToday">Today</a-button>
              <a-button @click="goToNext">
                <template #icon><right-outlined /></template>
              </a-button>
            </a-button-group>
          </a-col>
          <a-col>
            <h2>{{ currentViewTitle }}</h2>
          </a-col>
          <a-col>
            <a-radio-group v-model:value="currentView">
              <a-radio-button value="day">Day</a-radio-button>
              <a-radio-button value="week">Week</a-radio-button>
              <a-radio-button value="month">Month</a-radio-button>
              <a-radio-button value="year">Year</a-radio-button>
            </a-radio-group>
          </a-col>
        </a-row>
      </div>

      <div ref="calendarRef" class="calendar-container"></div>

      <a-modal v-model:visible="isEventModalVisible" :title="modalMode === 'create' ? 'Create Event' : 'Edit Event'"
        @ok="handleModalOk" @cancel="handleModalCancel">
        <a-form :model="eventForm" layout="vertical">
          <a-form-item label="Title" name="title">
            <a-input v-model:value="eventForm.title" />
          </a-form-item>
          <a-form-item label="Start Date" name="start">
            <a-date-picker v-model:value="eventForm.start" :showTime="true" format="YYYY-MM-DD HH:mm" />
          </a-form-item>
          <a-form-item label="End Date" name="end">
            <a-date-picker v-model:value="eventForm.end" :showTime="true" format="YYYY-MM-DD HH:mm" />
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
    </div>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, computed, watch } from 'vue';
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
import { format } from 'date-fns';
import { scheduleModalVisible, selectedSchedule } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';

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

type ViewType = 'day' | 'week' | 'month' | 'year';
type ModalModeType = 'create' | 'edit';

export default defineComponent({
  name: 'ScheduleCalendar',
  components: {
    LeftOutlined,
    RightOutlined
  },
  setup() {
    const calendarRef = ref<HTMLElement | null>(null);
    let calendar: Calendar | null = null;
    const isEventModalVisible = ref<boolean>(false);
    const modalMode = ref<ModalModeType>('create');
    const selectedEventId = ref<string | null>(null);
    const currentView = ref<ViewType>('week');
    const currentDate = ref<Date>(new Date());

    const state = reactive<{
      eventForm: EventFormState,
      events: CalendarEvent[]
    }>({
      eventForm: {
        id: '',
        title: '',
        start: new Date(),
        end: new Date(),
        category: 'time',
      },
      events: [],
    });

    const currentViewTitle = computed<string>(() => {
      return format(currentDate.value, 'MMMM yyyy');
    });

    const resetEventForm = (): void => {
      state.eventForm = {
        id: '',
        title: '',
        start: new Date(),
        end: new Date(),
        category: 'time',
      };
    };

    const handleModalOk = (): void => {
      if (!state.eventForm.title) {
        return;
      }

      if (modalMode.value === 'create') {
        const newEventId = `event-${Date.now()}`;
        const newEvent: CalendarEvent = {
          id: newEventId,
          calendarId: '1',
          title: state.eventForm.title,
          start: state.eventForm.start,
          end: state.eventForm.end,
          isAllDay: state.eventForm.category === 'allday',
        };

        calendar?.createEvents([newEvent]);
        state.events.push(newEvent);
      } else if (modalMode.value === 'edit' && selectedEventId.value) {
        const updatedEvent: CalendarEvent = {
          id: selectedEventId.value,
          calendarId: '1',
          title: state.eventForm.title,
          start: state.eventForm.start,
          end: state.eventForm.end,
          isAllDay: state.eventForm.category === 'allday',
        };

        calendar?.updateEvent(
          updatedEvent.id,
          '1',
          updatedEvent
        );

        const eventIndex = state.events.findIndex(e => e.id === selectedEventId.value);
        if (eventIndex !== -1) {
          state.events[eventIndex] = updatedEvent;
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

        const eventIndex = state.events.findIndex(e => e.id === selectedEventId.value);
        if (eventIndex !== -1) {
          state.events.splice(eventIndex, 1);
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
      if (calendarRef.value) {
        calendar = new Calendar(calendarRef.value, {
          defaultView: currentView.value,
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

        if (calendar) {
          currentDate.value = calendar.getDate().toDate();

          calendar.on('beforeCreateEvent', (eventObj: any) => {
            modalMode.value = 'create';
            state.eventForm.title = eventObj.title || '';
            state.eventForm.start = eventObj.start || new Date();
            state.eventForm.end = eventObj.end || new Date();
            state.eventForm.category = eventObj.isAllDay ? 'allday' : 'time';
            isEventModalVisible.value = true;
          });

          calendar.on('beforeUpdateEvent', ({ event, changes }: any) => {
            const { id, calendarId } = event;
            calendar.updateEvent(id, calendarId, changes);
          });

          calendar.on('clickEvent', ({ event }: any) => {
            selectedEventId.value = event.id;
            modalMode.value = 'edit';
            state.eventForm.title = event.title;
            state.eventForm.start = event.start;
            state.eventForm.end = event.end;
            state.eventForm.category = event.isAllDay ? 'allday' : 'time';
            isEventModalVisible.value = true;
          });
        }
      }
    });

    return {
      calendarRef,
      scheduleModalVisible,
      isEventModalVisible,
      modalMode,
      currentView,
      currentDate,
      currentViewTitle,
      eventForm: state.eventForm,
      events: state.events,
      handleModalOk,
      handleModalCancel,
      handleDeleteEvent,
      goToPrev,
      goToNext,
      goToToday,
      handleOk,
      handleCancel
    };
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
