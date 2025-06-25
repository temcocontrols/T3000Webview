<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
    },
  }">
    <a-modal v-model:visible="scheduleModalNVisible" :title="modalTitle" :width="950" style="top:30px; height: 600px;"
      wrapClassName="t3-modal" @ok="HandleOk" @cancel="HandleCancel" destroyOnClose keyboard="true">
      <div class="schedule-calendar-container">
        <!-- <div class="calendar-header"> -->
        <a-row type="flex" justify="space-between" align="middle" style="margin-bottom: 10px;">
          <a-col style="margin-top: 5px;">
            <div style="display: flex; justify-content: flex-start;gap:4px;height: 32px;">
              <!-- <FieldTimeOutlined class="view-title" /> -->
              <label class="view-title">{{ CurrentViewTitle() }}</label>
            </div>
          </a-col>
          <a-col>
            <div style="display: flex; justify-content: flex-start; gap: 8px;" v-if="!locked">
              <a-button class="t3-btn" size="small" @click="CopyMondayToWeekdays" type="primary">Copy to Monday -
                Friday</a-button>
              <a-button class="t3-btn" size="small" @click="RefreshFromT3000">Reset</a-button>
              <a-button class="t3-btn" size="small" @click="ClearAll">Clear All</a-button>
              <a-button class="t3-btn" size="small" @click="HandleOk">Save Data</a-button>
              <a-button class="t3-btn" size="small" @click="HandleCancel">Cancel</a-button>
            </div>
          </a-col>
        </a-row>
      </div>
      <div ref="calendarRef" class="calendar-container"></div>
      <template #footer>
        <!-- No footer -->
      </template>
    </a-modal>

    <a-modal v-model:visible="isEventModalVisible" :width="300"
      :title="modalMode === 'create' ? 'Create Schedule' : 'Edit Schedule'" wrapClassName="t3-sub-modal"
      @ok="HandleModalOk" @cancel="HandleModalCancel" destroyOnClose keyboard="true">
      <a-form :model="eventForm" layout="vertical">
        <a-row gutter="16" align="middle" style="margin-bottom: 0;font-size: 12px;">
          <a-col :span="6">
            <a-form-item label="On/Off" name="isOnStart" style="margin-bottom: 0;">
              <a-switch :checked="true" :disabled="true" checked-children="On" un-checked-children="Off" />
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="Start Date" name="start" style="margin-bottom: 0;">
              <a-row gutter="8">
                <a-col>
                  <a-time-picker v-model:value="startTime" :format="'HH:mm'" :minute-step="1" style="width: 140px" />
                </a-col>
              </a-row>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row gutter="16" align="middle" style="margin-bottom: 0;font-size: 12px;">
          <a-col :span="6">
            <a-form-item label="On/Off" name="isOnEnd" style="margin-bottom: 0;">
              <a-switch :checked="false" :disabled="true" checked-children="On" un-checked-children="Off" />
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="End Date" name="end" style="margin-bottom: 0;">
              <a-row gutter="8">
                <a-col>
                  <a-time-picker v-model:value="endTime" :format="'HH:mm'" :minute-step="1" style="width: 140px" />
                </a-col>
              </a-row>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-start; gap: 4px;">
          <a-button class="t3-btn" key="back" @click="HandleModalCancel">Cancel</a-button>
          <a-button class="t3-btn" v-if="modalMode === 'edit'" key="delete" danger
            @click="HandleDeleteEvent">Delete</a-button>
          <a-button class="t3-btn" key="submit" type="primary" @click="HandleModalOk">Save</a-button>
        </div>
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
import 'dayjs/locale/en';
import TuiCalendarUtil, { ModalModeType, EventFormState } from 'src/lib/T3000/Hvac/Opt/UI/TuiCalendarUtil';
dayjs.locale('en');
import { locked } from 'src/lib/T3000/Hvac/Data/T3Data';
import { FieldTimeOutlined } from '@ant-design/icons-vue';
import T3UIUtil from 'src/lib/T3000/Hvac/Opt/UI/T3UIUtil';

defineOptions({
  name: 'ScheduleCalendar',
});

const calendarRef = ref<HTMLElement | null>(null);
const isEventModalVisible = ref<boolean>(false);
const modalMode = ref<ModalModeType>('create');

const eventForm = reactive<EventFormState>({
  id: "",
  calendarId: "1",
  title: "",
  start: new Date(),
  end: new Date(),
  group: "",
  flagText: ""
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

const CurrentViewTitle = (): string => {
  return tcUtil.CurrentViewTitle();
};

const HandleModalOk = (): void => {
  tcUtil.HandleModalOk();
};

const HandleModalCancel = (): void => {
  tcUtil.HandleModalCancel();
};

const HandleDeleteEvent = (): void => {
  tcUtil.HandleDeleteEvent();
};

const HandleOk = (): void => {
  scheduleModalNVisible.value = false;
  T3UIUtil.SetNavVisiblity(true);

  // Save the calendar data to T3000
  tcUtil.SaveDataToT3000();
};

const HandleCancel = (): void => {
  scheduleModalNVisible.value = false;
  T3UIUtil.SetNavVisiblity(true);
};

const CopyMondayToWeekdays = () => {
  tcUtil.CopyMondayToWeekdays();
};

const RefreshFromT3000 = () => {
  tcUtil.RefreshFromT3000();
};

const ClearAll = () => {
  tcUtil.ClearAll();
};

onMounted(() => {
  tcUtil.InitVariables(calendarRef, isEventModalVisible, modalMode, eventForm);
  tcUtil.InitTuiCalendar();
  tcUtil.HideUIPanel();
  tcUtil.InitTitle();
  tcUtil.InitDefaultEvents();
});

</script>

<style>
.schedule-calendar-container {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  margin-bottom: 5px;
}

.calendar-container {
  width: 100%;
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

.t3-sub-modal {
  label {
    font-size: 12px !important;
  }
}
</style>
