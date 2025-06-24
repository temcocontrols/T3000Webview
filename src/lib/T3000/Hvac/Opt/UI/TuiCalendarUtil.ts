
import Calendar from '@toast-ui/calendar';
import dayjs from 'dayjs';
import { scheduleModalNVisible, selectedSchedule, currentDate, scheduleItemData, modalTitle, schInfo, tuiEvents, topNavVisible, leftNavVisible, rightNavVisible } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import { reactive, ref, Ref } from 'vue';
import { format } from 'date-fns';
import LogUtil from '../../Util/LogUtil';
import T3UIUtil from './T3UIUtil';


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

  static GetTimeTemplate(event: CalendarEvent): string {
    // LogUtil.Debug('= tuiCalendarUtil: GetTimeTemplate called for event:', event);

    const eventObj = tuiEvents.value.find(e => e.id === event.id);
    const flagText = eventObj ? eventObj.flagText : '';

    const startStr = event.start ? dayjs(event.start).format('HH:mm') : '';
    const endStr = event.end ? dayjs(event.end).format('HH:mm') : '';

    let title = '';
    if (!flagText) {
      // flagText is empty: show both start and end
      title = `On: ${startStr}&#10;Off: ${endStr}`;
    } else if (flagText === 'end-empty') {
      // Only show start, end is empty
      title = `On: ${startStr}`;
    } else if (flagText === 'start-empty') {
      // Only show end, start is empty
      title = `Off: ${endStr}`;
    }

    /*
    return `
      <span
        title="On: ${event.start ? dayjs(event.start).format('HH:mm') : ''}&#10;Off: ${event.end ? dayjs(event.end).format('HH:mm') : ''}"
        style="display: inline-block; cursor: pointer;">
        <span>On: ${event.start ? dayjs(event.start).format('HH:mm') : ''}</span><br/>
        <span>Off: ${event.end ? dayjs(event.end).format('HH:mm') : ''}</span>
      </span>
    `;
    */

    return `
      <span
        title="${title}"
        style="display: inline-block; cursor: pointer;">
        ${flagText === 'start-empty'
        ? `<span>Off: ${event.end ? dayjs(event.end).format('HH:mm') : ''}</span>`
        : flagText === 'end-empty'
          ? `<span>On: ${event.start ? dayjs(event.start).format('HH:mm') : ''}</span>`
          : `
              <span>On: ${event.start ? dayjs(event.start).format('HH:mm') : ''}</span><br/>
              <span>Off: ${event.end ? dayjs(event.end).format('HH:mm') : ''}</span>
            `
      }
      </span>
    `;
  }

  InitVariables(calendarRef, isEventModalVisible, modalMode, eventForm) {
    this.selectedEventId = ref<string | null>(null);
    this.calendarRef = calendarRef;
    this.events = ref<CalendarEvent[]>([]);
    this.currentView = ref<ViewType>('week');
    this.isEventModalVisible = isEventModalVisible;
    this.modalMode = modalMode;
    this.eventForm = eventForm;
  };

  DefaultCalendarOptions() {
    const calendarOptions = {
      defaultView: this.currentView.value,
      useFormPopup: false,
      useDetailPopup: false,
      week: {
        showTimezoneCollapseButton: true,
        timezonesCollapsed: true,
        dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Holiday1', 'Holiday2'],
        visibleWeeksCount: 1, // Show only one week with all days
        visibleEventCount: 9, // Show 9 days in week view (7 days + 2 holidays)
        // Note: If your version of toast-ui/calendar does not support more than 7 days in week view,
        // you may need to use a custom rendering or fork the library.
      },
      month: {
        visibleWeeksCount: 6
      },
      template: {
        time(event) {
          // LogUtil.Debug('= tuiCalendarUtil: Template time called for event:', tuiEvents.value);
          return TuiCalendarUtil.GetTimeTemplate(event);
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
    };
    return calendarOptions;
  }

  InitTuiCalendar() {
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

    this.calendar = new Calendar(this.calendarRef.value, this.DefaultCalendarOptions());

    if (!this.calendar) {
      LogUtil.Error('= tuiCalendarUtil: Failed to initialize calendar');
      return;
    }

    currentDate.value = this.calendar.getDate().toDate();

    this.BindBeforeCreateEvent();
    this.BindBeforeUpdateEvent();

    this.BindClickEvent();
    this.BindSelectDateTime();

    LogUtil.Debug('= tuiCalendarUtil: Calendar initialized successfully:', this.calendar);
  }

  BindBeforeCreateEvent() {
    this.calendar.on('beforeCreateEvent', (eventObj: any) => {
      LogUtil.Debug('= tuiCalendarUtil: Calendar beforeCreateEvent triggered:', eventObj);
      this.modalMode.value = 'create';
      this.eventForm.title = eventObj.title || '';
      this.eventForm.start = eventObj.start || new Date();
      this.eventForm.end = eventObj.end || new Date();
      this.isEventModalVisible.value = true;
    });
  }

  BindBeforeUpdateEvent() {
    this.calendar.on('beforeUpdateEvent', ({ event, changes }: any) => {
      LogUtil.Debug('= tuiCalendarUtil: Calendar beforeUpdateEvent triggered:', event, changes);
      const { id, calendarId } = event;
      this.calendar?.updateEvent(id, calendarId, changes);
    });
  }

  BindClickEvent() {
    //Update event click handler
    this.calendar.on('clickEvent', ({ event }: any) => {
      LogUtil.Debug('= tuiCalendarUtil: Calendar clickEvent triggered:', event);
      this.selectedEventId.value = event.id;
      this.modalMode.value = 'edit';
      this.eventForm.title = event.title || '';
      this.eventForm.start = event.start || new Date();
      this.eventForm.end = event.end || new Date();

      this.SetEventModalVisiblity(true);
    });
  }

  BindSelectDateTime() {
    // Create event on date selection
    this.calendar.on('selectDateTime', (eventInfo: any) => {
      LogUtil.Debug('= tuiCalendarUtil: Calendar Date selected:', topNavVisible, leftNavVisible, rightNavVisible, eventInfo);

      const date4 = eventInfo.start;
      const formatted = date4.toLocaleString('en-US');
      const newStart = dayjs(eventInfo.start).toDate();
      const newEnd = dayjs(eventInfo.end).toDate();
      this.modalMode.value = 'create';
      this.eventForm.title = '';
      this.eventForm.start = newStart;
      this.eventForm.end = newEnd;

      const dayNames = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Holiday1', 'Holiday2'
      ];
      const baseDate = dayjs(eventInfo.start).startOf('week'); // Sunday
      const dayOfWeek = dayjs(eventInfo.start).day(); // 0 (Sunday) - 6 (Saturday)
      let group = dayNames[dayOfWeek];
      let id = `${group}-${dayOfWeek}-${Date.now()}`;
      this.eventForm.id = id;
      this.eventForm.group = group;

      this.SetEventModalVisiblity(true);
    });
  }

  SetEventModalVisiblity(visible: boolean) {
    this.isEventModalVisible.value = visible;
  }

  ResetEventForm(): void {
    this.eventForm.id = '';
    this.eventForm.title = '';
    this.eventForm.start = new Date();
    this.eventForm.end = new Date();
    this.eventForm.flagText = '';
    this.eventForm.group = '';
    this.eventForm.calendarId = '1'; // Default calendar ID
  }

  HandleModalOk(): void {
    LogUtil.Debug('= tuiCalendarUtil: handleModalOk called with eventForm:', this.eventForm);

    if (!this.eventForm.start && !this.eventForm.end) {
      return;
    }

    if (this.modalMode.value === 'create') {
      this.ModalCreateEvent();
      LogUtil.Debug('= tuiCalendarUtil: Creating new event with title:', this.eventForm);

    } else if (this.modalMode.value === 'edit' && this.selectedEventId.value) {
      this.ModalEditEvent();
      LogUtil.Debug('= tuiCalendarUtil: Editing existing event with ID:', this.selectedEventId.value);
    }

    this.ResetEventForm();
    this.SetEventModalVisiblity(false);

    // Copy events to tuiEvents for global access
    tuiEvents.value = this.events.value;

    LogUtil.Debug('= tuiCalendarUtil: All calendar events:', tuiEvents.value, this.events.value);
  }

  ModalCreateEvent() {
    // const newEventId = `event-${Date.now()}`;
    const newEvent: CalendarEvent = {
      id: this.eventForm.id,
      calendarId: `1`,
      title: this.eventForm.title,
      start: this.eventForm.start,
      end: this.eventForm.end,
      flagText: this.eventForm.flagText || '',
      group: this.eventForm.group || '',
    };

    this.calendar?.createEvents([newEvent]);
    this.events.value.push(newEvent);

    if (this.calendar) {
      // Clear any selection highlight from mouse drag or click
      this.calendar.clearGridSelections?.();
    }
  }

  ModalEditEvent() {
    // Find the original event to get its calendarId
    const originalEvent = this.events.value.find(e => e.id === this.selectedEventId.value);
    LogUtil.Debug('= tuiCalendarUtil: Editing event with ID: Before', this.selectedEventId.value, originalEvent, this.eventForm);

    const updatedEvent: CalendarEvent = {
      id: this.selectedEventId.value,
      calendarId: `1`,
      title: this.eventForm.title,
      start: this.eventForm.start,
      end: this.eventForm.end,

      // When do updating event, we need to keep the original flagText and group
      flagText: originalEvent.flagText || '',
      group: originalEvent.group || '',
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

  HandleModalCancel(): void {
    this.isEventModalVisible.value = false;
    this.ResetEventForm();
  }

  HandleDeleteEvent(): void {
    LogUtil.Debug('= tuiCalendarUtil: handleDeleteEvent called with selectedEventId:', this.selectedEventId.value);

    if (this.selectedEventId.value) {
      this.calendar?.deleteEvent(this.selectedEventId.value, `1`);

      const eventIndex = this.events.value.findIndex(e => e.id === this.selectedEventId.value);
      if (eventIndex !== -1) {
        this.events.value.splice(eventIndex, 1);
      }

      this.isEventModalVisible.value = false;
      this.ResetEventForm();

      LogUtil.Debug('= tuiCalendarUtil: Event deleted successfully:', this.events.value);
      LogUtil.Debug('= tuiCalendarUtil: Remaining events:',);

      if (this.calendar) {
        this.calendar.render();
      }
    }
  }

  HideUIPanel() {
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

  CurrentViewTitle = () => {
    //MMMM dd, yyyy
    //MMMM yyyy
    return format(currentDate.value, 'MMMM dd, yyyy');
  }

  InitTitle() {
    if (scheduleItemData.value && scheduleItemData.value.t3Entry) {
      const { id, label, description } = scheduleItemData.value.t3Entry;
      modalTitle.value = [id, label, description].filter(Boolean).join(', ');
    }

    if (scheduleItemData.value && scheduleItemData.value.t3Entry) {
      const { command, control, description, id, label, type } = scheduleItemData.value.t3Entry;
      schInfo.value = [command, control, description, id, label, type].filter(Boolean).join(' / ');
    }

    LogUtil.Debug('= tuiCalendarUtil: InitTitle called, modalTitle, schInfo:', modalTitle.value, 'schInfo:', schInfo.value, scheduleItemData.value.t3Entry);
  }

  InitTestData() {
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
      // [
      //   { hours: 2, minutes: 59, tflag: 0 },
      //   { hours: 3, minutes: 0, tflag: 0 },
      //   { hours: 9, minutes: 0, tflag: 0 },
      //   { hours: 21, minutes: 0, tflag: 0 },
      //   { hours: 23, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 }
      // ],
      // [
      //   { hours: 2, minutes: 59, tflag: 0 },
      //   { hours: 3, minutes: 0, tflag: 0 },
      //   { hours: 9, minutes: 0, tflag: 0 },
      //   { hours: 21, minutes: 0, tflag: 0 },
      //   { hours: 23, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 }
      // ],
      // [
      //   { hours: 2, minutes: 59, tflag: 0 },
      //   { hours: 3, minutes: 0, tflag: 0 },
      //   { hours: 9, minutes: 0, tflag: 0 },
      //   { hours: 21, minutes: 0, tflag: 0 },
      //   { hours: 23, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 }
      // ],
      // [
      //   { hours: 2, minutes: 59, tflag: 0 },
      //   { hours: 3, minutes: 0, tflag: 0 },
      //   { hours: 9, minutes: 0, tflag: 0 },
      //   { hours: 21, minutes: 0, tflag: 0 },
      //   { hours: 23, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 }
      // ],
      // [
      //   { hours: 0, minutes: 0, tflag: 1 },
      //   { hours: 23, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 }
      // ],
      // [
      //   { hours: 0, minutes: 0, tflag: 1 },
      //   { hours: 0, minutes: 56, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 }
      // ],
      // [
      //   { hours: 0, minutes: 0, tflag: 1 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 23, minutes: 0, tflag: 0 }
      // ],
      // [
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 0, minutes: 0, tflag: 0 },
      //   { hours: 22, minutes: 0, tflag: 0 }
      // ]
    ];

    return testTimeArr;
  }

  InitT3Data() {
    let timeArr = scheduleItemData.value?.t3Entry?.time || [];

    // Use test data temporarily
    timeArr = this.InitTestData();
    return timeArr;
  }

  InitDefaultEvents(): void {
    // Use test data temporarily
    const testTimeArr = this.InitT3Data();
    const events = this.ConvertTimeArrayToEvents(testTimeArr);

    // Replace current events and render in calendar
    this.events.value = events;
    tuiEvents.value = events;
    this.calendar?.createEvents(events);
  }

  /**
   * Copies Monday's time array to Tuesday, Wednesday, Thursday, and Friday.
   * Modifies scheduleItemData.value.t3Entry.time in-place if available.
   */
  CopyMondayToWeekdays(): void {

    /*
    let timeArr = this.InitT3Data();

    // If timeArr has only 1 item (Monday), create/reset Tuesday-Friday as deep copies of Monday
    if (Array.isArray(timeArr)) {
      if (timeArr.length === 1) {
        for (let i = 1; i <= 4; i++) {
          timeArr[i] = timeArr[0].map(slot => ({ ...slot }));
        }
      } else if (timeArr.length >= 5) {
        for (let i = 1; i <= 4; i++) {
          timeArr[i] = timeArr[0].map(slot => ({ ...slot }));
        }
      }
    }
    */

    /*
    // If scheduleItemData.value.t3Entry.time exists, update it as well
    if (scheduleItemData.value && scheduleItemData.value.t3Entry && Array.isArray(scheduleItemData.value.t3Entry.time)) {
      for (let i = 1; i <= 4; i++) {
      scheduleItemData.value.t3Entry.time[i] = timeArr[0].map(slot => ({ ...slot }));
      }
    }
    */

    /*
    const events = this.ConvertTimeArrayToEvents(timeArr);

    // Replace current events and render in calendar
    this.events.value = events;
    tuiEvents.value = events;

    this.calendar?.clear();
    this.calendar?.createEvents(events);
    */

    // Find the "Monday" group events
    const mondayEvents = this.events.value.filter(e => e.group === 'Monday');

    LogUtil.Debug('= tuiCalendarUtil: CopyMondayToWeekdays called, found Monday events:', this.events.value, mondayEvents);

    // Days to copy to
    const targetDays = ['Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Remove existing events for Tuesday-Friday
    this.events.value = this.events.value.filter(
      e => !targetDays.includes(e.group || '')
    );

    // For each target day, clone Monday's events and update fields
    targetDays.forEach((day, dayIdx) => {
      mondayEvents.forEach((event, idx) => {
        // Calculate the new date for the target day
        const baseDate = dayjs(event.start).startOf('week'); // Sunday
        const dayOffset = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Holiday1', 'Holiday2'].indexOf(day);
        const newStart = dayjs(baseDate).add(dayOffset, 'day').hour(dayjs(event.start).hour()).minute(dayjs(event.start).minute()).second(0).toDate();
        const newEnd = dayjs(baseDate).add(dayOffset, 'day').hour(dayjs(event.end).hour()).minute(dayjs(event.end).minute()).second(0).toDate();

        this.events.value.push(
          reactive({
            ...event,
            id: `${day}-${dayIdx}-${idx}-${Date.now()}`,
            group: day,
            start: newStart,
            end: newEnd,
          })
        );
      });
    });

    // Sync tuiEvents and calendar UI
    tuiEvents.value = [...this.events.value];
    this.calendar?.clear();
    this.calendar?.createEvents(this.events.value);

    LogUtil.Debug('= tuiCalendarUtil: CopyMondayToWeekdays completed, updated events:', this.events.value, tuiEvents.value);
  }

  RefreshFromT3000(): void {
    this.calendar?.clear();
    this.InitDefaultEvents();
  }

  ClearAll(): void {
    this.calendar?.clear();
    this.InitDefaultEvents();
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
          group: dayNames[outputIdx] || `Day${outputIdx + 1}`,
          flagText: flagText
        });
      }
    }

    LogUtil.Debug('= tuiCalendarUtil: Converted events:', events);
    return events;
  }

  // Unused methods, kept for reference
  GoToPrev(): void {
    this.calendar?.prev();
    if (this.calendar) {
      currentDate.value = this.calendar.getDate().toDate();
    }
  }

  GoToNext(): void {
    this.calendar?.next();
    if (this.calendar) {
      currentDate.value = this.calendar.getDate().toDate();
    }
  }

  GoToToday(): void {
    this.calendar?.today();
    if (this.calendar) {
      currentDate.value = this.calendar.getDate().toDate();
    }
  }
}

export default TuiCalendarUtil
