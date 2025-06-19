
import Calendar from '@toast-ui/calendar';
import dayjs from 'dayjs';
import { scheduleModalNVisible, selectedSchedule, currentDate, scheduleItemData, modalTitle, schInfo } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import { reactive, ref, Ref } from 'vue';
import { format } from 'date-fns';
import LogUtil from '../../Util/LogUtil';


interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
}

type ViewType = 'day' | 'week' | 'month';
export type ModalModeType = 'create' | 'edit';

export interface EventFormState {
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

class TuiCalendarUtil {

  calendar: Calendar | null = null;
  selectedEventId: Ref<string | null>;
  calendarRef: Ref<HTMLElement>;
  currentView: Ref;
  events: Ref<CalendarEvent[]>;
  isEventModalVisible: Ref<boolean>;
  modalMode: Ref<ModalModeType>;
  eventForm: EventFormState;

  initVariables = (calendarRef, isEventModalVisible, modalMode, eventForm) => {
    this.selectedEventId = ref<string | null>(null);
    this.calendarRef = calendarRef;
    this.events = ref<CalendarEvent[]>([]);
    this.currentView = ref<ViewType>('week');
    this.isEventModalVisible = isEventModalVisible;
    this.modalMode = modalMode;
    this.eventForm = eventForm;

  };

  initTuiCalendar(
    // calendarRef: any,
    // calendar: any,
    // currentView: any,
    // currentDate: any,
    // modalMode: any,
    // eventForm: any,
    // isEventModalVisible: any
  ) {
    console.log('Calendar ref is set:', this.calendarRef.value);

    if (!this.calendarRef.value) {
      console.error('Calendar ref is not available');
      return;
    }

    try {
      const getRandomColor = () => {
        const colors = [
          '#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#a0d911'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      };

      const originalCreateEvents = Calendar.prototype.createEvents;
      Calendar.prototype.createEvents = function (events) {
        events.forEach(event => {
          event.bgColor = getRandomColor();
          event.color = '#fff';
          event.borderColor = event.bgColor;
        });
        return originalCreateEvents.call(this, events);
      };

      const originalUpdateEvent = Calendar.prototype.updateEvent;
      Calendar.prototype.updateEvent = function (id, calendarId, changes) {
        if (!changes.bgColor) {
          changes.bgColor = getRandomColor();
          changes.color = '#fff';
          changes.borderColor = changes.bgColor;
        }
        return originalUpdateEvent.call(this, id, calendarId, changes);
      };

      this.calendar = new Calendar(this.calendarRef.value, {
        defaultView: this.currentView.value,
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

      if (!this.calendar) {
        console.error('Failed to initialize calendar');
        return;
      }

      console.log('Calendar initialized successfully:', this.calendar);
      currentDate.value = this.calendar.getDate().toDate();

      this.calendar.on('beforeCreateEvent', (eventObj: any) => {
        console.log('Calendar beforeCreateEvent triggered:', eventObj);
        this.modalMode.value = 'create';
        this.eventForm.title = eventObj.title || '';
        this.eventForm.start = eventObj.start || new Date();
        this.eventForm.end = eventObj.end || new Date();
        this.eventForm.category = eventObj.isAllDay ? 'allday' : 'time';
        this.isEventModalVisible.value = true;
      });

      this.calendar.on('beforeUpdateEvent', ({ event, changes }: any) => {
        console.log('Calendar beforeUpdateEvent triggered:', event, changes);
        const { id, calendarId } = event;
        this.calendar?.updateEvent(id, calendarId, changes);
      });

      this.calendar.on('clickEvent', ({ event }: any) => {
        console.log('Calendar clickEvent triggered:', event);
        this.selectedEventId.value = event.id;
        this.modalMode.value = 'edit';
        this.eventForm.title = event.title || '';
        this.eventForm.start = event.start || new Date();
        this.eventForm.end = event.end || new Date();
        this.eventForm.category = event.isAllDay ? 'allday' : 'time';
        this.isEventModalVisible.value = true;
      });

      this.calendar.on('clickTimeGrid', (eventInfo: any) => {
        console.log('Calendar Time grid clicked:', eventInfo);
        this.isEventModalVisible.value = true;
        if (eventInfo.time) {
          const newStart = new Date(eventInfo.time);
          const newEnd = new Date(newStart);
          newEnd.setHours(newStart.getHours() + 1);

          this.modalMode.value = 'create';
          this.eventForm.title = '';
          this.eventForm.start = newStart;
          this.eventForm.end = newEnd;
          this.eventForm.category = 'time';
          this.isEventModalVisible.value = true;
        }
      });

      this.calendar.on('selectDateTime', (eventInfo: any) => {
        this.isEventModalVisible.value = true;
        console.log('Calendar Date selected:', eventInfo);

        try {
          const date4 = eventInfo.start;
          const formatted = date4.toLocaleString('en-US');
          console.log('Selected:', formatted);

          const newStart = dayjs(eventInfo.start).toDate();
          const newEnd = dayjs(eventInfo.end).toDate();
          console.log('Parsed Start:', newStart);
          console.log('Parsed End:', newEnd);

          this.modalMode.value = 'create';
          this.eventForm.title = '';
          this.eventForm.start = newStart;
          this.eventForm.end = newEnd;
          this.eventForm.category = eventInfo.isAllDay ? 'allday' : 'time';
          scheduleModalNVisible.value = true;
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
  }


  resetEventForm = (): void => {
    this.eventForm.id = '';
    this.eventForm.title = '';
    this.eventForm.start = new Date();
    this.eventForm.end = new Date();
    this.eventForm.category = 'time';
  };

  handleModalOk = (): void => {
    if (!this.eventForm.title) {
      return;
    }

    if (this.modalMode.value === 'create') {
      const newEventId = `event-${Date.now()}`;
      const newEvent: CalendarEvent = {
        id: newEventId,
        calendarId: '1',
        title: this.eventForm.title,
        start: this.eventForm.start,
        end: this.eventForm.end,
        isAllDay: this.eventForm.category === 'allday',
      };

      this.calendar?.createEvents([newEvent]);
      this.events.value.push(newEvent);
    } else if (this.modalMode.value === 'edit' && this.selectedEventId.value) {
      const updatedEvent: CalendarEvent = {
        id: this.selectedEventId.value,
        calendarId: '1',
        title: this.eventForm.title,
        start: this.eventForm.start,
        end: this.eventForm.end,
        isAllDay: this.eventForm.category === 'allday',
      };

      this.calendar?.updateEvent(
        updatedEvent.id,
        '1',
        updatedEvent
      );

      const eventIndex = this.events.value.findIndex(e => e.id === this.selectedEventId.value);
      if (eventIndex !== -1) {
        this.events.value[eventIndex] = updatedEvent;
      }
    }

    this.isEventModalVisible.value = false;
    this.resetEventForm();
  };

  handleModalCancel = (): void => {
    this.isEventModalVisible.value = false;
    this.resetEventForm();
  };

  handleDeleteEvent = (): void => {
    if (this.selectedEventId.value) {
      this.calendar?.deleteEvent(this.selectedEventId.value, '1');

      const eventIndex = this.events.value.findIndex(e => e.id === this.selectedEventId.value);
      if (eventIndex !== -1) {
        this.events.value.splice(eventIndex, 1);
      }

      this.isEventModalVisible.value = false;
      this.resetEventForm();
    }
  };

  goToPrev = (): void => {
    this.calendar?.prev();
    if (this.calendar) {
      currentDate.value = this.calendar.getDate().toDate();
    }
  };

  goToNext = (): void => {
    this.calendar?.next();
    if (this.calendar) {
      currentDate.value = this.calendar.getDate().toDate();
    }
  };

  goToToday = (): void => {
    this.calendar?.today();
    if (this.calendar) {
      currentDate.value = this.calendar.getDate().toDate();
    }
  };

  hideUIPanel = () => {
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


  currentViewTitle = () => {
    //MMMM dd, yyyy
    //MMMM yyyy
    return format(currentDate.value, 'MMMM dd, yyyy');
  }

  loadT3Data = () => {
    if (scheduleItemData.value && scheduleItemData.value.t3Entry) {
      const { id, label, description } = scheduleItemData.value.t3Entry;
      modalTitle.value = [id, label, description].filter(Boolean).join(', ');
    }

    if (scheduleItemData.value && scheduleItemData.value.t3Entry) {
      const { command, control, description, id, label, type } = scheduleItemData.value.t3Entry;
      schInfo.value = [command, control, description, id, label, type].filter(Boolean).join(' / ');
    }

    if (scheduleItemData.value && scheduleItemData.value.t3Entry && scheduleItemData.value.t3Entry.time) {
      LogUtil.Debug('= ScheduleModal: onMounted Schedule time:', JSON.stringify(scheduleItemData.value.t3Entry.time));
    }
  }

}

export default TuiCalendarUtil
