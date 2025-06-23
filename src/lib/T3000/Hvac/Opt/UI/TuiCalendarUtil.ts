
import Calendar from '@toast-ui/calendar';
import dayjs from 'dayjs';
import { scheduleModalNVisible, selectedSchedule, currentDate, scheduleItemData, modalTitle, schInfo } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import { reactive, ref, Ref } from 'vue';
import { format } from 'date-fns';
import LogUtil from '../../Util/LogUtil';


type ViewType = 'day' | 'week' | 'month';
export type ModalModeType = 'create' | 'edit';

export interface EventFormState {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  // isAllDay: boolean;
  group?: string;
  flagText: string;
  // category: string;
  // isOn: boolean;
  // backgroundColor?: string;
}

interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  // isAllDay: boolean;
  // isOn?: boolean;
  // backgroundColor?: string;
  group?: string;
  flagText: string;
}

// Define proper types for calendar events
// type CalendarEventObject = {
//   id: string;
//   calendarId: string;
//   title?: string;
//   start?: Date;
//   end?: Date;
//   isAllDay?: boolean;
//   // isOn?: boolean;
//   // backgroundColor?: string;
// };

// type CalendarUpdateInfo = {
//   event: CalendarEventObject;
//   changes: Partial<CalendarEventObject>;
// };

// type CalendarEventInfo = {
//   event: CalendarEventObject;
// };

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

  defaultCalendarOptions = () => {
    const calendarOptions = {
      defaultView: this.currentView.value,
      useFormPopup: false,
      useDetailPopup: false,
      week: {
        showTimezoneCollapseButton: true,
        timezonesCollapsed: true
      },
      month: {
        visibleWeeksCount: 6
      },
      template: {
        time(event: CalendarEvent) {
          console.log('= tuiCalendarUtil: Template time called for event:', event);
          return `
            <span
              title="On: ${event.start ? dayjs(event.start).format('HH:mm') : ''}&#10;Off: ${event.end ? dayjs(event.end).format('HH:mm') : ''}"
              style="display: inline-block; cursor: pointer;">
              <span>On: ${event.start ? dayjs(event.start).format('HH:mm') : ''}</span><br/>
              <span>Off: ${event.end ? dayjs(event.end).format('HH:mm') : ''}</span>
            </span>
          `;
        }
      },
      calendars: [
        {
          id: '1',//By default, the calendar ID is '1', currently only one calendar is supported
          name: 'Schedule',
          color: '#ffffff',
          bgColor: '#1890ff',
          borderColor: '#1890ff'
        }
      ]
    };
    //this.calendar = new Calendar(this.calendarRef.value, calendarOptions);
    return calendarOptions;
  }

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


    const getRandomColor = () => {
      const colors = [
        '#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#a0d911'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    };

    const originalCreateEvents = Calendar.prototype.createEvents;
    Calendar.prototype.createEvents = function (events) {
      LogUtil.Debug('= tuiCalendarUtil: Calendar.prototype.createEvents:', events);
      events.forEach(event => {
        event.backgroundColor = getRandomColor();
        event.color = '#fff';
        event.borderColor = event.backgroundColor;
      });
      return originalCreateEvents.call(this, events);
    };

    const originalUpdateEvent = Calendar.prototype.updateEvent;
    Calendar.prototype.updateEvent = function (id, calendarId, changes) {
      LogUtil.Debug('= tuiCalendarUtil: Calendar.prototype.updateEvent:', id, calendarId, changes);
      if (!changes.backgroundColor) {
        changes.backgroundColor = getRandomColor();
        changes.color = '#fff';
        changes.borderColor = changes.backgroundColor;
      }
      return originalUpdateEvent.call(this, id, calendarId, changes);
    };

    /*
    this.calendar = new Calendar(this.calendarRef.value, {
      defaultView: this.currentView.value,
      useFormPopup: false,
      useDetailPopup: false,
      // useCreationPopup: false,
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
    */

    this.calendar = new Calendar(this.calendarRef.value, this.defaultCalendarOptions());

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
      // this.eventForm.category = eventObj.isAllDay ? 'allday' : 'time';
      this.isEventModalVisible.value = true;
    });

    this.calendar.on('beforeUpdateEvent', ({ event, changes }: any) => {
      LogUtil.Debug('= tuiCalendarUtil: Calendar beforeUpdateEvent triggered:', event, changes);
      const { id, calendarId } = event;
      this.calendar?.updateEvent(id, calendarId, changes);
    });

    //Update event click handler
    this.calendar.on('clickEvent', ({ event }: any) => {
      LogUtil.Debug('= tuiCalendarUtil: Calendar clickEvent triggered:', event);
      this.selectedEventId.value = event.id;
      this.modalMode.value = 'edit';
      this.eventForm.title = event.title || '';
      this.eventForm.start = event.start || new Date();
      this.eventForm.end = event.end || new Date();
      // this.eventForm.category = event.isAllDay ? 'allday' : 'time';
      this.isEventModalVisible.value = true;
    });

    /*
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
    */

    // Create event on date selection
    this.calendar.on('selectDateTime', (eventInfo: any) => {
      this.isEventModalVisible.value = true;
      LogUtil.Debug('= tuiCalendarUtil: Calendar Date selected:', eventInfo);


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
      // this.eventForm.category = eventInfo.isAllDay ? 'allday' : 'time';
      // this.eventForm.isOn = eventInfo.isOn || false;
      scheduleModalNVisible.value = true;

    });
  }


  resetEventForm = (): void => {
    this.eventForm.id = '';
    this.eventForm.title = '';
    this.eventForm.start = new Date();
    this.eventForm.end = new Date();
    // this.eventForm.category = 'time';
    // this.eventForm.isOn = false;
    // this.eventForm.backgroundColor = '';
  };

  createEvent = () => {
    const newEventId = `event-${Date.now()}`;
    // const title = this.eventForm.isOn ? "On" : 'Off';
    const newEvent: CalendarEvent = {
      id: newEventId,
      calendarId: `1`,
      title: this.eventForm.title,
      start: this.eventForm.start,
      end: this.eventForm.end,
      flagText: this.eventForm.flagText || '',
      // isAllDay: this.eventForm.category === 'allday',
      // isOn: this.eventForm.isOn,
      // backgroundColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      // color: '#fff',
      // borderColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    };

    this.calendar?.createEvents([newEvent]);
    this.events.value.push(newEvent);

    if (this.calendar) {
      // Clear any selection highlight from mouse drag or click
      this.calendar.clearGridSelections?.();
    }
  }

  editEvent = () => {
    LogUtil.Debug('= tuiCalendarUtil: Editing event with ID:', this.selectedEventId.value);
    // const title = this.eventForm.isOn ? "On" : 'Off';
    // Find the original event to get its calendarId
    const originalEvent = this.events.value.find(e => e.id === this.selectedEventId.value);
    const updatedEvent: CalendarEvent = {
      id: this.selectedEventId.value,
      calendarId: `1`,
      title: this.eventForm.title,
      start: this.eventForm.start,
      end: this.eventForm.end,
      flagText: this.eventForm.flagText || '',
      // isAllDay: this.eventForm.category === 'allday',
      // isOn: this.eventForm.isOn,
      // backgroundColor: this.eventForm.backgroundColor || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      // color: '#fff',
      // borderColor: this.eventForm.backgroundColor || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    };

    this.calendar?.updateEvent(updatedEvent.id, '1', updatedEvent);

    const eventIndex = this.events.value.findIndex(e => e.id === this.selectedEventId.value);
    if (eventIndex !== -1) {
      this.events.value[eventIndex] = updatedEvent;
    }

    if (this.calendar) {
      // Clear any selection highlight from mouse drag or click
      this.calendar.clearGridSelections?.();
    }
  }

  handleModalOk = (): void => {
    LogUtil.Debug('= tuiCalendarUtil: handleModalOk called with eventForm:', this.eventForm);

    if (!this.eventForm.start && !this.eventForm.end) {
      return;
    }

    if (this.modalMode.value === 'create') {
      this.createEvent();
      LogUtil.Debug('= tuiCalendarUtil: Creating new event with title:', this.eventForm);

    } else if (this.modalMode.value === 'edit' && this.selectedEventId.value) {
      this.editEvent();
      LogUtil.Debug('= tuiCalendarUtil: Editing existing event with ID:', this.selectedEventId.value);
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

    LogUtil.Debug('= tuiCalendarUtil: handleDeleteEvent called with selectedEventId:', this.selectedEventId.value);

    if (this.selectedEventId.value) {
      this.calendar?.deleteEvent(this.selectedEventId.value, `1`);

      const eventIndex = this.events.value.findIndex(e => e.id === this.selectedEventId.value);
      if (eventIndex !== -1) {
        this.events.value.splice(eventIndex, 1);
      }

      this.isEventModalVisible.value = false;
      this.resetEventForm();

      LogUtil.Debug('= tuiCalendarUtil: Event deleted successfully:', this.events.value);
      LogUtil.Debug('= tuiCalendarUtil: Remaining events:',);

      if (this.calendar) {
        // Remove all events and re-add from the current events array to refresh the UI
        this.calendar.render();
        // this.calendar.createEvents(this.events.value);
      }
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

  initDefaultData = () => {
    LogUtil.Debug('= tuiCalendarUtil: loadT3Data called with scheduleItemData:', JSON.stringify(scheduleItemData.value, null, 2));
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

    this.initT3Data();
  }

  initT3TestData = () => {
    const testTimeArr = [
      [
        { hours: 2, minutes: 59, tflag: 0 },
        { hours: 3, minutes: 0, tflag: 0 },
        { hours: 9, minutes: 0, tflag: 0 },
        { hours: 21, minutes: 0, tflag: 0 },
        { hours: 23, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 2, minutes: 59, tflag: 0 },
        { hours: 3, minutes: 0, tflag: 0 },
        { hours: 9, minutes: 0, tflag: 0 },
        { hours: 21, minutes: 0, tflag: 0 },
        { hours: 23, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 2, minutes: 59, tflag: 0 },
        { hours: 3, minutes: 0, tflag: 0 },
        { hours: 9, minutes: 0, tflag: 0 },
        { hours: 21, minutes: 0, tflag: 0 },
        { hours: 23, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 2, minutes: 59, tflag: 0 },
        { hours: 3, minutes: 0, tflag: 0 },
        { hours: 9, minutes: 0, tflag: 0 },
        { hours: 21, minutes: 0, tflag: 0 },
        { hours: 23, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 2, minutes: 59, tflag: 0 },
        { hours: 3, minutes: 0, tflag: 0 },
        { hours: 9, minutes: 0, tflag: 0 },
        { hours: 21, minutes: 0, tflag: 0 },
        { hours: 23, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 0, minutes: 0, tflag: 1 },
        { hours: 23, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 0, minutes: 0, tflag: 1 },
        { hours: 0, minutes: 56, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 0, minutes: 0, tflag: 1 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 23, minutes: 0, tflag: 0 }
      ],
      [
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 0, minutes: 0, tflag: 0 },
        { hours: 22, minutes: 0, tflag: 0 }
      ]
    ];

    return testTimeArr;
  }

  initDefaultEvents = (): void => {

    /*
    const defaultEvents: CalendarEvent[] = [
      {
        id: `event-${Date.now()}-1`,
        calendarId: '1',
        title: 'On',
        start: dayjs().startOf('day').add(9, 'hour').toDate(),
        end: dayjs().startOf('day').add(10, 'hour').toDate(),
        isAllDay: false,
        isOn: true,
        group: dayjs().format('dddd'),
      },
      {
        id: `event-${Date.now()}-2`,
        calendarId: '1',
        title: 'Off',
        start: dayjs().startOf('day').add(18, 'hour').toDate(),
        end: dayjs().startOf('day').add(19, 'hour').toDate(),
        isAllDay: false,
        isOn: false,
        group: dayjs().format('dddd'),
      }
    ];

    this.events.value = [...defaultEvents];
    this.calendar?.createEvents(defaultEvents);

    LogUtil.Debug('= tuiCalendarUtil: Default events initialized:', JSON.stringify(this.events.value, null, 2));
    */

    // Use test data temporarily
    const testTimeArr = this.initT3TestData();

    // const events = this.convertTimeArrayToEvents(scheduleItemData.value?.t3Entry?.time || []);
    const events = this.ConvertTimeArrayToEvents(testTimeArr);

    // Replace current events and render in calendar
    this.events.value = events;
    this.calendar?.createEvents(events);
  }

  /*
  [{
    "key": "1",
    "status": true,
    "monday": "02:59",
    "tuesday": "02:59",
    "wednesday": "02:59",
    "thursday": "02:59",
    "friday": "02:59",
    "saturday": "00:00",
    "sunday": "00:00",
    "holiday1": "00:00",
    "holiday2": "00:00"
  }]
  */
  initT3Data = () => {
    LogUtil.Debug('= tuiCalendarUtil: initT3Data called with scheduleItemData:', JSON.stringify(scheduleItemData.value, null, null));
    if (scheduleItemData.value && scheduleItemData.value.t3Entry && Array.isArray(scheduleItemData.value.t3Entry.time)) {
      const dayKeys = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'holiday1',
        'holiday2',
      ];

      // scheduleItemData.value.t3Entry.time is an array of days, each with 8 rows (schedules)
      // We need to transpose it so each row contains all days
      const time = scheduleItemData.value.t3Entry.time;
      const rowCount = time[0]?.length || 0;

      // Create a new array to trigger reactivity
      const newScheduleData = Array.from({ length: rowCount }, (_, rowIdx) => {
        const item: any = {
          key: (rowIdx + 1).toString(),
          status: rowIdx % 2 === 0, // fallback if no status info
        };
        dayKeys.forEach((day, dayIdx) => {
          const t = time[dayIdx]?.[rowIdx];
          if (t && typeof t.hours === 'number' && typeof t.minutes === 'number') {
            // Use dayjs to create a time string in "HH:mm" format
            const hour = t.hours.toString().padStart(2, '0');
            const minute = t.minutes.toString().padStart(2, '0');
            item[day] = `${hour}:${minute}`;
          } else {
            item[day] = '';
          }
        });
        return item;
      });

      LogUtil.Debug('= tuiCalendarUtil: Transformed T3 schedule data:', newScheduleData);
    }
  }

  initT3DataToMonFriDays = () => {
    // Extract time array from scheduleItemData
    const timeArr = scheduleItemData.value?.t3Entry?.time;
    if (!Array.isArray(timeArr) || timeArr.length < 8) {
      LogUtil.Error('= tuiCalendarUtil: Invalid or missing time array in scheduleItemData');
      return;
    }

    // Map day index to dayjs weekday (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayMap = [1, 2, 3, 4, 5]; // Monday to Friday

    // Use current week as base
    const baseDate = dayjs().startOf('week'); // Sunday

    const events: CalendarEvent[] = [];

    // For each day (Monday to Friday)
    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      const dayTimes = timeArr[dayIdx];
      if (!Array.isArray(dayTimes)) continue;

      // For each time slot (up to 8 per day)
      for (let slotIdx = 0; slotIdx < dayTimes.length - 1; slotIdx++) {
        const startTime = dayTimes[slotIdx];
        const endTime = dayTimes[slotIdx + 1];

        // Only create event if start and end are not both 0:0 and not the same
        if (
          startTime &&
          endTime &&
          (startTime.hours !== 0 || startTime.minutes !== 0 || endTime.hours !== 0 || endTime.minutes !== 0) &&
          (startTime.hours !== endTime.hours || startTime.minutes !== endTime.minutes)
        ) {
          const start = baseDate
            .add(dayMap[dayIdx], 'day')
            .hour(startTime.hours)
            .minute(startTime.minutes)
            .second(0)
            .toDate();
          const end = baseDate
            .add(dayMap[dayIdx], 'day')
            .hour(endTime.hours)
            .minute(endTime.minutes)
            .second(0)
            .toDate();

          events.push({
            id: `event-${dayIdx}-${slotIdx}-${Date.now()}`,
            calendarId: '1',
            title: slotIdx % 2 === 0 ? 'On' : 'Off',
            start,
            end,
            flagText: slotIdx % 2 === 0 ? 'On' : 'Off',
            // isAllDay: false,
            // isOn: slotIdx % 2 === 0,
            // backgroundColor: slotIdx % 2 === 0 ? '#52c41a' : '#f5222d',
            group: dayjs(start).format('dddd'),
          });
        }
      }
    }

    // Replace current events and render in calendar
    this.events.value = events;
    this.calendar?.createEvents(events);
  }

  /**
   * Converts a 2D array of time objects to TUI Calendar events.
   * The input array is ordered: [Monday, Tuesday, ..., Sunday, Holiday1, Holiday2].
   * For TUI Calendar, Sunday should be first, then Monday-Friday, then Holiday1, Holiday2.
   * @param timeArr - 2D array: [days][slots], each slot is {hours, minutes}
   * @returns CalendarEvent[]
   */
  ConvertTimeArrayToEvents(timeArr: { hours: number; minutes: number, tflag: number }[][]): CalendarEvent[] {
    // Input order: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Holiday1, Holiday2]
    // Output order: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Holiday1, Holiday2]
    const inputToOutputIdx = [6, 0, 1, 2, 3, 4, 5, 7, 8]; // Map input idx to output idx
    const dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Holiday1', 'Holiday2'
    ];
    const baseDate = dayjs().startOf('week'); // Sunday

    const events: CalendarEvent[] = [];

    for (let outputIdx = 0; outputIdx < inputToOutputIdx.length; outputIdx++) {
      const inputIdx = inputToOutputIdx[outputIdx];
      const slots = timeArr[inputIdx];
      if (!Array.isArray(slots) || slots.length < 2) continue;

      // Each pair (on/off) is slots[0]-slots[1], slots[2]-slots[3], ...
      for (let i = 0; i < slots.length - 1; i += 2) {
        let startTime = slots[i];
        let endTime = slots[i + 1];

        // 1. Both start and end are 00:00 with tflag 0 => skip
        if (
          startTime &&
          endTime &&
          startTime.hours === 0 && startTime.minutes === 0 && startTime.tflag === 0 &&
          endTime.hours === 0 && endTime.minutes === 0 && endTime.tflag === 0
        ) {
          continue;
        }

        // 2. If one of start or end is 00:00 with tflag 0, set it to the other (make both the same as the one not 00:00 and not tflag 0)
        let flagText = '';
        if (
          startTime &&
          startTime.hours === 0 && startTime.minutes === 0 && startTime.tflag === 0 &&
          !(endTime.hours === 0 && endTime.minutes === 0 && endTime.tflag === 0)
        ) {
          startTime = { ...endTime };
          endTime = { ...endTime };
          flagText = 'start-empty';

        } else if (
          endTime &&
          endTime.hours === 0 && endTime.minutes === 0 && endTime.tflag === 0 &&
          !(startTime.hours === 0 && startTime.minutes === 0 && startTime.tflag === 0)
        ) {
          endTime = { ...startTime };
          startTime = { ...startTime };
          flagText = 'end-empty';
        }

        let start: Date, end: Date;

        if (outputIdx === 7 || outputIdx === 8) {
          console.log('= tuiCalendarUtil: Processing outputIdx:', outputIdx, 'inputIdx:', inputIdx, 'slots:', slots, 'group', dayNames[outputIdx]);

          // For Holiday1 and Holiday2, use only the hours and minutes (max date)
          // Use a far future date for holidays (e.g., year 9999)
          start = new Date(9999, 0, 1, startTime.hours, startTime.minutes, 0, 0);
          end = new Date(9999, 0, 1, endTime.hours, endTime.minutes, 0, 0);
        } else {
          // For other days, use baseDate + outputIdx
          let eventDate = baseDate.add(outputIdx, 'day');
          start = eventDate.hour(startTime.hours).minute(startTime.minutes).second(0).toDate();
          end = eventDate.hour(endTime.hours).minute(endTime.minutes).second(0).toDate();
        }

        const startStr = `${startTime.hours.toString().padStart(2, '0')}:${startTime.minutes.toString().padStart(2, '0')}`;
        const endStr = `${endTime.hours.toString().padStart(2, '0')}:${endTime.minutes.toString().padStart(2, '0')}`;
        const titleStr = `${startStr} - ${endStr}`;

        events.push({
          id: `${dayNames[outputIdx]}-${outputIdx}-${i}`,
          calendarId: '1',
          title: titleStr,
          start: start,
          end: end,
          // isAllDay: false,
          group: dayNames[outputIdx] || `Day${outputIdx + 1}`,
          flagText: flagText
        });
      }
    }

    LogUtil.Debug('= tuiCalendarUtil: Converted events:', events);

    return events;
  }
}

export default TuiCalendarUtil
