<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
    },
  }">
    <a-modal v-model:visible="scheduleModalNVisible" :title="modalTitle" :width="750" style="height: 600px;"
      wrapClassName="t3-modal" @ok="handleOk" @cancel="handleCancel" destroyOnClose keyboard="true">
      <div class="schedule-calendar-container">
        <!-- <div class="calendar-header"> -->
        <a-row type="flex" justify="space-between" align="middle" style="margin-bottom: 10px;">
          <a-col style="margin-top: 5px;">
            <div style="display: flex; justify-content: flex-start;gap:4px;height: 32px;">
              <!-- <FieldTimeOutlined class="view-title" /> -->
              <label class="view-title">{{ currentViewTitle() }}</label>
            </div>
          </a-col>
          <a-col>
            <div style="display: flex; justify-content: flex-start; gap: 8px;">
              <a-button class="t3-btn" size="small" @click="copyToWeekdays" type="primary">Copy to Monday -
                Friday</a-button>
              <a-button class="t3-btn" size="small" @click="refreshFromT3000">Reset</a-button>
              <a-button class="t3-btn" size="small" @click="clearAll">Clear All</a-button>
              <a-button class="t3-btn" size="small" @click="handleOk">Save Data</a-button>
              <a-button class="t3-btn" size="small" @click="handleCancel">Cancel</a-button>
            </div>
            <!-- <a-button-group>
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
</a-button-group> -->
          </a-col>

          <!-- <a-col>
            <a-radio-group v-model:value="currentView">
              <a-radio-button value="day">Daily</a-radio-button>
              <a-radio-button value="week">Weekly</a-radio-button>
              <a-radio-button value="month">Monthly</a-radio-button>
            </a-radio-group>
          </a-col> -->
        </a-row>
      </div>
      <div ref="calendarRef" class="calendar-container"></div>
      <!-- </div> -->

      <!-- <template #footer>
        <div style="display: flex; justify-content: flex-start; gap: 8px;">
          <a-button class="t3-btn" @click="copyToWeekdays" type="primary">Copy to Monday - Friday</a-button>
          <a-button class="t3-btn" @click="refreshFromT3000">Refresh from T3000</a-button>
          <a-button class="t3-btn" @click="clearAll">Clear All</a-button>
          <a-button class="t3-btn" @click="handleOk">Save Data</a-button>
          <a-button class="t3-btn" @click="handleCancel">Cancel</a-button>
        </div>
      </template> -->





      <template #footer>
        <!-- No footer -->
      </template>





    </a-modal>

    <a-modal v-model:visible="isEventModalVisible" :title="modalMode === 'create' ? 'Create Schedule' : 'Edit Schedule'"
      wrapClassName="t3-sub-modal" @ok="handleModalOk" @cancel="handleModalCancel" destroyOnClose keyboard="true">
      <a-form :model="eventForm" layout="vertical">



        <a-row gutter="16" align="middle" style="margin-bottom: 0;">
          <a-col :span="6">
            <a-form-item label="On/Off" name="isOn" style="margin-bottom: 0;">
              <a-switch v-model:checked="eventForm.isOn" checked-children="On" un-checked-children="Off" />
            </a-form-item>
          </a-col>
          <a-col :span="9">
            <a-form-item label="Start Date" name="start" style="margin-bottom: 0;">
              <a-row gutter="8">
                <a-col>
                  <a-time-picker v-model:value="startTime" :format="'HH:mm'" :minute-step="1" style="width: 140px" />



                </a-col>
              </a-row>
            </a-form-item>
          </a-col>
          <a-col :span="9">
            <a-form-item label="End Date" name="end" style="margin-bottom: 0;">
              <a-row gutter="8">
                <a-col>
                  <a-time-picker v-model:value="endTime" :format="'HH:mm'" :minute-step="1" style="width: 140px" />
                </a-col>
              </a-row>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- <a-form-item label="Category" name="category">
          <a-select v-model:value="eventForm.category">
            <a-select-option value="time">Time</a-select-option>
            <a-select-option value="allday">All Day</a-select-option>
          </a-select>
        </a-form-item> -->
      </a-form>

      <template #footer>
        <a-button key="back" @click="handleModalCancel">Cancel</a-button>
        <a-button v-if="modalMode === 'edit'" key="delete" danger @click="handleDeleteEvent">Delete</a-button>
        <a-button key="submit" type="primary" @click="handleModalOk">Save</a-button>
      </template>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { defineComponent, ref, onMounted, reactive, computed, watch, defineOptions } from 'vue';
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
import { format } from 'date-fns';
import { scheduleModalNVisible, selectedSchedule, currentDate, scheduleItemData, modalTitle, schInfo } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import 'tui-date-picker/dist/tui-date-picker.css';
import 'tui-time-picker/dist/tui-time-picker.css';
import dayjs from 'dayjs';
import 'dayjs/locale/en'; // Import locale you need, 'en' for English
import TuiCalendarUtil, { ModalModeType, EventFormState } from 'src/lib/T3000/Hvac/Opt/UI/TuiCalendarUtil';
dayjs.locale('en'); // Use the imported locale

import { FieldTimeOutlined } from '@ant-design/icons-vue';

defineOptions({
  name: 'ScheduleCalendar',
});

const calendarRef = ref<HTMLElement | null>(null);
// let calendar: Calendar | null = null;
const isEventModalVisible = ref<boolean>(false);
const modalMode = ref<ModalModeType>('create');
// const selectedEventId = ref<string | null>(null);
// const currentView = ref<ViewType>('week');
// const currentDate = ref<Date>(new Date());

const eventForm = reactive<EventFormState>({
  id: '',
  title: '',
  start: new Date(),
  end: new Date(),
  category: 'time',
  isOn: false
});

// Computed properties for a-time-picker compatibility
const startTime = computed({
  get: () => dayjs(eventForm.start),
  set: (val) => {
    if (val) eventForm.start = val.toDate();
  }
});
const endTime = computed({
  get: () => dayjs(eventForm.end),
  set: (val) => {
    if (val) eventForm.end = val.toDate();
  }
});

const tcUtil = new TuiCalendarUtil();

const currentViewTitle = (): string => {
  // return format(currentDate.value, 'MMMM yyyy');
  return tcUtil.currentViewTitle();
};

const resetEventForm = (): void => {
  tcUtil.resetEventForm();
};

const handleModalOk = (): void => {
  tcUtil.handleModalOk();
};

const handleModalCancel = (): void => {
  tcUtil.handleModalCancel();
};

const handleDeleteEvent = (): void => {
  tcUtil.handleDeleteEvent();
};

const goToPrev = (): void => {
  tcUtil.goToPrev();
};

const goToNext = (): void => {
  tcUtil.goToNext();
};

const goToToday = (): void => {
  tcUtil.goToToday();
};

const handleOk = (): void => {
  scheduleModalNVisible.value = false;
};

const handleCancel = (): void => {
  scheduleModalNVisible.value = false;
};




const copyToWeekdays = () => {
  // scheduleData.value = scheduleData.value.map(record => {
  //   const mondayValue = record.monday;
  //   return {
  //     ...record,
  //     tuesday: mondayValue,
  //     wednesday: mondayValue,
  //     thursday: mondayValue,
  //     friday: mondayValue,
  //   };
  // });
};

const refreshFromT3000 = () => {

  /*
  scheduleData.value = Array.from({ length: 8 }, (_, i) => ({
    key: (i + 1).toString(),
    status: i % 2 === 0, // true for 1st, 3rd, 5th, ...; false for 2nd, 4th, ...
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: '',
  }))
  */

  // loadDefaultData();
};

const clearAll = () => {
  // scheduleData.value = scheduleData.value.map(record => ({
  //   ...record,
  //   monday: '',
  //   tuesday: '',
  //   wednesday: '',
  //   thursday: '',
  //   friday: '',
  //   saturday: '',
  //   sunday: '',
  //   holiday1: '',
  //   holiday2: '',
  // }));
};

// watch(currentView, (newView) => {
//   if (calendar) {
//     calendar.changeView(newView);
//   }
// });

// const hideUIPanel = () => {
//   // Remove the "Milestone" button from the calendar UI if it exists
//   // Toast UI Calendar does not show a "Milestone" button by default in v2+,
//   // but if you see it, you can hide it via CSS or by not using milestone features.
//   // Here is a CSS-based approach:
//   const style = document.createElement('style');
//   style.innerHTML = `
//       .toastui-calendar-milestone { display: none !important; }
//     `;
//   document.head.appendChild(style);

//   /**
//    * Remove the "Task" button from the Toast UI Calendar UI if it exists.
//    * Toast UI Calendar v2+ does not show a "Task" button by default,
//    * but if you see it, you can hide it via CSS.
//    */
//   const taskStyle = document.createElement('style');
//   taskStyle.innerHTML = `
//       .toastui-calendar-task { display: none !important; }
//     `;
//   document.head.appendChild(taskStyle);

//   /**
//    * Hide the "All Day" row and label in Toast UI Calendar.
//    * This can be done via CSS since Toast UI Calendar does not provide a direct API to remove it.
//    */
//   const allDayStyle = document.createElement('style');
//   allDayStyle.innerHTML = `
//       .toastui-calendar-allday-panel,
//       .toastui-calendar-allday {
//         display: none !important;
//       }
//     `;
//   document.head.appendChild(allDayStyle);
// };


// // Define proper types for calendar events
// type CalendarEventObject = {
//   title?: string;
//   start?: Date;
//   end?: Date;
//   isAllDay?: boolean;
//   id: string;
//   calendarId: string;
// };

// type CalendarUpdateInfo = {
//   event: CalendarEventObject;
//   changes: Partial<CalendarEventObject>;
// };

// type CalendarEventInfo = {
//   event: CalendarEventObject;
// };

// const initTuiCalendar = () => {
//   console.log('Calendar ref is set:', calendarRef.value);

//   if (!calendarRef.value) {
//     console.error('Calendar ref is not available');
//     return;
//   }

//   try {

//     /**
//      * Make calendar events more colorful by assigning different background colors.
//      * You can customize the color per event or per calendar.
//      * Here, we randomize the bgColor for each event for demonstration.
//      */
//     const getRandomColor = () => {
//       const colors = [
//         '#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#a0d911'
//       ];
//       return colors[Math.floor(Math.random() * colors.length)];
//     };

//     // Patch the event creation to assign a random color
//     const originalCreateEvents = Calendar.prototype.createEvents;
//     Calendar.prototype.createEvents = function (events) {
//       events.forEach(event => {
//         event.bgColor = getRandomColor();
//         event.color = '#fff';
//         event.borderColor = event.bgColor;
//       });
//       return originalCreateEvents.call(this, events);
//     };

//     // Also patch updateEvent to keep color if not set
//     const originalUpdateEvent = Calendar.prototype.updateEvent;
//     Calendar.prototype.updateEvent = function (id, calendarId, changes) {
//       if (!changes.bgColor) {
//         changes.bgColor = getRandomColor();
//         changes.color = '#fff';
//         changes.borderColor = changes.bgColor;
//       }
//       return originalUpdateEvent.call(this, id, calendarId, changes);
//     };

//     // Initialize the calendar with proper options
//     calendar = new Calendar(calendarRef.value, {
//       defaultView: currentView.value,
//       useFormPopup: false,
//       useDetailPopup: false,
//       useCreationPopup: false,
//       week: {
//         showTimezoneCollapseButton: true,
//         timezonesCollapsed: true
//       },
//       month: {
//         visibleWeeksCount: 6
//       },
//       template: {
//         time(event) {
//           return `<span style="color: white;">${event.title}</span>`;
//         }
//       },
//       calendars: [
//         {
//           id: '1',
//           name: 'Schedule',
//           color: '#ffffff',
//           bgColor: '#1890ff',
//           borderColor: '#1890ff'
//         }
//       ]
//     });


//     if (!calendar) {
//       console.error('Failed to initialize calendar');
//       return;
//     }

//     console.log('Calendar initialized successfully:', calendar);
//     currentDate.value = calendar.getDate().toDate();

//     // Register event handlers
//     calendar.on('beforeCreateEvent', (eventObj: CalendarEventObject) => {
//       console.log('Calendar beforeCreateEvent triggered:', eventObj);
//       modalMode.value = 'create';
//       eventForm.title = eventObj.title || '';
//       eventForm.start = eventObj.start || new Date();
//       eventForm.end = eventObj.end || new Date();
//       eventForm.category = eventObj.isAllDay ? 'allday' : 'time';
//       isEventModalVisible.value = true;
//     });

//     calendar.on('beforeUpdateEvent', ({ event, changes }: CalendarUpdateInfo) => {
//       console.log('Calendar beforeUpdateEvent triggered:', event, changes);
//       const { id, calendarId } = event;
//       calendar?.updateEvent(id, calendarId, changes);
//     });

//     calendar.on('clickEvent', ({ event }: CalendarEventInfo) => {
//       console.log('Calendar clickEvent triggered:', event);
//       selectedEventId.value = event.id;
//       modalMode.value = 'edit';
//       eventForm.title = event.title || '';
//       eventForm.start = event.start || new Date();
//       eventForm.end = event.end || new Date();
//       eventForm.category = event.isAllDay ? 'allday' : 'time';
//       isEventModalVisible.value = true;
//     });

//     // Handle clicking on a time slot to create a new event
//     calendar.on('clickTimeGrid', (eventInfo) => {
//       console.log('Calendar Time grid clicked:', eventInfo);
//       isEventModalVisible.value = true;
//       if (eventInfo.time) {
//         const newStart = new Date(eventInfo.time);
//         const newEnd = new Date(newStart);
//         newEnd.setHours(newStart.getHours() + 1);

//         modalMode.value = 'create';
//         eventForm.title = '';
//         eventForm.start = newStart;
//         eventForm.end = newEnd;
//         eventForm.category = 'time';
//         isEventModalVisible.value = true;
//       }
//     });

//     // Handle creating events in month view by clicking on a date
//     calendar.on('selectDateTime', (eventInfo) => {
//       isEventModalVisible.value = true;
//       console.log('Calendar Date selected:', eventInfo);

//       try {

//         const date4 = eventInfo.start; // This is a native Date object

//         // Using native JS
//         const formatted = date4.toLocaleString('en-US');
//         console.log('Selected:', formatted);

//         // const newStart = new Date(eventInfo.start);
//         // const newEnd = new Date(eventInfo.end);

//         const newStart = dayjs(eventInfo.start).toDate();
//         const newEnd = dayjs(eventInfo.end).toDate();
//         console.log('Parsed Start:', newStart);
//         console.log('Parsed End:', newEnd);

//         modalMode.value = 'create';
//         eventForm.title = '';
//         eventForm.start = newStart;
//         eventForm.end = newEnd;
//         eventForm.category = eventInfo.isAllDay ? 'allday' : 'time';
//         scheduleModalNVisible.value = true;
//       }
//       catch (error) {
//         console.error('Error parsing date:', error);
//         return;
//       }
//     });

//     // hideUIPanel();
//     console.log('Calendar events registered');
//   } catch (error) {
//     console.error('Error initializing calendar:', error);
//   }
// }


onMounted(() => {
  tcUtil.initVariables(calendarRef, isEventModalVisible, modalMode, eventForm);
  tcUtil.initTuiCalendar();
  tcUtil.hideUIPanel();
  tcUtil.loadT3Data();
});













</script>

<style>
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
.toastui-calendar-layout.toastui-calendar-week-view {
  height: 400px !important;
}

.toastui-calendar-panel.toastui-calendar-time {
  height: 350px !important;
}


.toastui-calendar-week-view .toastui-calendar-panel:not(.toastui-calendar-time) {
  overflow-y: hidden !important;
  height: 50px !important;
}


.t3-btn {
  border-radius: 0px !important;
}

.t3-modal {

  .ant-modal-content {
    /* background-color: #18b5c3 !important; */
    border-radius: 0px !important;
    padding: 10px 30px !important;
  }

  .ant-modal-body {
    border-radius: 0px !important;
    margin-left: -15px !important;
    margin-right: -15px !important;
  }

  .ant-modal-header {
    border-radius: 0px !important;
    margin-left: -15px;
    margin-right: -15px;
  }

  .ant-table {
    border-radius: 0px !important;
    margin-left: -15px;
    margin-right: -15px;
  }

  .ant-modal-footer {
    border-radius: 0px !important;
    margin-left: -15px;
    margin-right: -15px;
  }

  .ant-table-cell {
    padding: 5px 4px !important;
  }

  .ant-table-thead {
    height: 38px !important;

    .ant-table-cell {
      background-color: #eff3f8;
    }
  }

  .sch-alert {
    margin-bottom: 10px;
    margin-left: -15px;
    margin-right: -15px;
    border-radius: 0px;
  }

  .ant-modal-title {
    font-size: 14px;
  }
}

.view-title {
  height: 32px;
  line-height: 32px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  background-clip: border-box;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
