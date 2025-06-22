
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
  isOn?: boolean;
  backgroundColor?: string;
}

type ViewType = 'day' | 'week' | 'month';
export type ModalModeType = 'create' | 'edit';

export interface EventFormState {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category: string;
  isOn: boolean;
  backgroundColor?: string;
}

interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  isOn?: boolean;
  backgroundColor?: string;
}

// Define proper types for calendar events
type CalendarEventObject = {
  title?: string;
  start?: Date;
  end?: Date;
  isAllDay?: boolean;
  id: string;
  calendarId: string;
  isOn?: boolean;
  backgroundColor?: string;
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
    LogUtil.Debug('= tuiCalendarUtil: initTuiCalendar Calendar ref is set:', this.calendarRef.value);

    if (!this.calendarRef.value) {
      LogUtil.Error('= tuiCalendarUtil: Calendar ref is not available');
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
          // {
          //   id: '1',
          //   name: 'Schedule',
          //   color: '#ffffff',
          //   bgColor: '#1890ff',
          //   borderColor: '#1890ff'
          // }
        ]
      });

      if (!this.calendar) {
        LogUtil.Error('= tuiCalendarUtil: Failed to initialize calendar');
        return;
      }

      LogUtil.Debug('= tuiCalendarUtil: Calendar initialized successfully:', this.calendar);
      currentDate.value = this.calendar.getDate().toDate();

      this.calendar.on('beforeCreateEvent', (eventObj: any) => {
        LogUtil.Debug('= tuiCalendarUtil: Calendar beforeCreateEvent triggered:', eventObj);
        this.modalMode.value = 'create';
        this.eventForm.title = eventObj.title || '';
        this.eventForm.start = eventObj.start || new Date();
        this.eventForm.end = eventObj.end || new Date();
        this.eventForm.category = eventObj.isAllDay ? 'allday' : 'time';
        this.isEventModalVisible.value = true;
      });

      this.calendar.on('beforeUpdateEvent', ({ event, changes }: any) => {
        LogUtil.Debug('= tuiCalendarUtil: Calendar beforeUpdateEvent triggered:', event, changes);
        const { id, calendarId } = event;
        this.calendar?.updateEvent(id, calendarId, changes);
      });

      this.calendar.on('clickEvent', ({ event }: any) => {
        LogUtil.Debug('= tuiCalendarUtil: Calendar clickEvent triggered:', event);
        this.selectedEventId.value = event.id;
        this.modalMode.value = 'edit';
        this.eventForm.title = event.title || '';
        this.eventForm.start = event.start || new Date();
        this.eventForm.end = event.end || new Date();
        this.eventForm.category = event.isAllDay ? 'allday' : 'time';
        this.isEventModalVisible.value = true;
      });

      this.calendar.on('clickTimeGrid', (eventInfo: any) => {
        LogUtil.Debug('= tuiCalendarUtil: Calendar Time grid clicked:', eventInfo);
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
        LogUtil.Debug('= tuiCalendarUtil: Calendar Date selected:', eventInfo);

        try {
          const date4 = eventInfo.start;
          const formatted = date4.toLocaleString('en-US');
          LogUtil.Debug('= tuiCalendarUtil: Selected:', formatted);

          const newStart = dayjs(eventInfo.start).toDate();
          const newEnd = dayjs(eventInfo.end).toDate();
          LogUtil.Debug('= tuiCalendarUtil: Parsed Start:', newStart);
          LogUtil.Debug('= tuiCalendarUtil: Parsed End:', newEnd);

          this.modalMode.value = 'create';
          this.eventForm.title = '';
          this.eventForm.start = newStart;
          this.eventForm.end = newEnd;
          this.eventForm.category = eventInfo.isAllDay ? 'allday' : 'time';
          this.eventForm.isOn = eventInfo.isOn || false;
          scheduleModalNVisible.value = true;
        }
        catch (error) {
          LogUtil.Error('= tuiCalendarUtil: Error parsing date:', error);
          return;
        }
      });

      LogUtil.Debug('= tuiCalendarUtil: Calendar events registered');
    } catch (error) {
      LogUtil.Error('= tuiCalendarUtil: Error initializing calendar:', error);
    }
  }


  resetEventForm = (): void => {
    this.eventForm.id = '';
    this.eventForm.title = '';
    this.eventForm.start = new Date();
    this.eventForm.end = new Date();
    this.eventForm.category = 'time';
    this.eventForm.isOn = false;
    this.eventForm.backgroundColor = '';
  };

  handleModalOk = (): void => {
    LogUtil.Debug('= tuiCalendarUtil: handleModalOk called with eventForm:', this.eventForm);

    if (!this.eventForm.start && !this.eventForm.end && !this.eventForm.isOn) {
      return;
    }

    if (this.modalMode.value === 'create') {
      const newEventId = `event-${Date.now()}`;
      const title = this.eventForm.isOn ? "On" : 'Off';
      const newEvent: CalendarEvent = {
        id: newEventId,
        calendarId: `cal-${newEventId}`, // Unique calendarId for each event
        title: title, // this.eventForm.title,
        start: this.eventForm.start,
        end: this.eventForm.end,
        isAllDay: this.eventForm.category === 'allday',
        isOn: this.eventForm.isOn,
        backgroundColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        color: '#fff',
        borderColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      };

      this.calendar?.createEvents([newEvent]);
      this.events.value.push(newEvent);
    } else if (this.modalMode.value === 'edit' && this.selectedEventId.value) {
      LogUtil.Debug('= tuiCalendarUtil: Editing event with ID:', this.selectedEventId.value);
      const title = this.eventForm.isOn ? "On" : 'Off';
      // Find the original event to get its calendarId
      const originalEvent = this.events.value.find(e => e.id === this.selectedEventId.value);
      const updatedEvent: CalendarEvent = {
        id: this.selectedEventId.value,
        calendarId: originalEvent ? originalEvent.calendarId : '1',
        title: title, // this.eventForm.title,
        start: this.eventForm.start,
        end: this.eventForm.end,
        isAllDay: this.eventForm.category === 'allday',
        isOn: this.eventForm.isOn,
        backgroundColor: this.eventForm.backgroundColor || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        color: '#fff',
        borderColor: this.eventForm.backgroundColor || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      };

      this.calendar?.updateEvent(updatedEvent.id, '1', updatedEvent);

      const eventIndex = this.events.value.findIndex(e => e.id === this.selectedEventId.value);
      if (eventIndex !== -1) {
        this.events.value[eventIndex] = updatedEvent;
      }
    }

    this.isEventModalVisible.value = false;
    this.resetEventForm();


    LogUtil.Debug('= tuiCalendarUtil: All calendar events:', JSON.stringify(this.events.value, null, 2));

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
    // Remove the "Milestone" button and its resizer
    const milestoneStyle = document.createElement('style');
    milestoneStyle.innerHTML = `
      .toastui-calendar-milestone,
      .toastui-calendar-panel-resizer {
      display: none !important;
      }
    `;
    document.head.appendChild(milestoneStyle);

    // Remove the "Task" button and its resizer
    const taskStyle = document.createElement('style');
    taskStyle.innerHTML = `
      .toastui-calendar-task,
      .toastui-calendar-panel-resizer {
      display: none !important;
      }
    `;
    document.head.appendChild(taskStyle);

    // Hide the "All Day" row, label, and its resizer
    const allDayStyle = document.createElement('style');
    allDayStyle.innerHTML = `
      .toastui-calendar-allday-panel,
      .toastui-calendar-allday,
      .toastui-calendar-panel-resizer {
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
      LogUtil.Debug('= tuiCalendarUtil: onMounted Schedule time:', JSON.stringify(scheduleItemData.value.t3Entry.time));
    }
  }

}

export default TuiCalendarUtil
