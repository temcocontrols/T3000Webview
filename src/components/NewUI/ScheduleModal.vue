<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
    },
  }">
    <a-modal v-model:visible="scheduleModalVisible" :title="modalTitle" :width="1000" style="border-radius: 0px;"
      wrapClassName="t3-modal" @ok="handleOk" @cancel="handleCancel">
      <!-- Remove the button from here, as it will be moved to the modal footer -->

      <a-alert :message="schInfo" type="info" show-icon class="sch-alert" />

      <a-table :dataSource="scheduleData" :columns="columns" :pagination="false" bordered size="small">
        <template #bodyCell="{ column, record }">
          <!-- Status Column (On/Off) -->
          <template v-if="column.key === 'status'">
            <a-switch :checked="record.status" checked-children="On" un-checked-children="Off" disabled />
          </template>

          <!-- Day Columns (Monday through Holiday2) -->
          <template
            v-else-if="['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'holiday1', 'holiday2'].includes(column.key)">




            <a-time-picker :value="record[column.key] ? dayjs(record[column.key], 'HH:mm') : null" format="HH:mm"
              :minute-step="15" :show-second="false" style="width: 100%;border-radius: 0px;" size="middle"
              placeholder=""
              @change="(time: dayjs.Dayjs | null, timeString: string) => onTimeChange(record, column.key, time)" />












          </template>
        </template>
      </a-table>
      <template #footer>
        <div style="display: flex; justify-content: flex-start; gap: 8px;">
          <a-button class="t3-btn" @click="copyToWeekdays" type="primary">Copy to Monday - Friday</a-button>
          <a-button class="t3-btn" @click="refreshFromT3000">Refresh from T3000</a-button>
          <a-button class="t3-btn" @click="clearAll">Clear All</a-button>
          <a-button class="t3-btn" @click="handleOk">Save</a-button>
          <a-button class="t3-btn" @click="handleCancel">Cancel</a-button>
        </div>
      </template>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Modal, Table, Button, Switch, Select } from 'ant-design-vue';
import { scheduleModalVisible, selectedSchedule, scheduleItemData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import dayjs from 'dayjs';

interface ScheduleItem {
  key: string;
  status: boolean;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  holiday1: string;
  holiday2: string;
}

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

/*
const emit = defineEmits(['update:visible', 'save']);

// Computed property to handle the modal visibility
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});
*/

// Generate time options in 15-minute intervals for 24 hours
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      options.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

// Initial schedule data
const scheduleData = ref<ScheduleItem[]>(Array.from({ length: 8 }, (_, i) => ({
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
})));

// Table column definitions
const columns = [
  {
    title: 'On/Off',
    key: 'status',
  },
  {
    title: 'Monday',
    dataIndex: 'monday',
    key: 'monday',
  },
  {
    title: 'Tuesday',
    dataIndex: 'tuesday',
    key: 'tuesday',
  },
  {
    title: 'Wednesday',
    dataIndex: 'wednesday',
    key: 'wednesday',
  },
  {
    title: 'Thursday',
    dataIndex: 'thursday',
    key: 'thursday',
  },
  {
    title: 'Friday',
    dataIndex: 'friday',
    key: 'friday',
  },
  {
    title: 'Saturday',
    dataIndex: 'saturday',
    key: 'saturday',
  },
  {
    title: 'Sunday',
    dataIndex: 'sunday',
    key: 'sunday',
  },
  {
    title: 'Holiday 1',
    dataIndex: 'holiday1',
    key: 'holiday1',
  },
  {
    title: 'Holiday 2',
    dataIndex: 'holiday2',
    key: 'holiday2',
  },
];

// Event handlers
const onStatusChange = (record: ScheduleItem) => {
  console.log('Status changed:', record);
};

// Event handlers
const onTimeChange = (record: ScheduleItem, key: string, value: Dayjs | string | null) => {
  if (value && typeof value !== 'string') {
    record[key] = value;
  } else if (typeof value === 'string') {
    record[key] = dayjs(value, 'HH:mm');
  } else {
    record[key] = null;
  }
};

const copyToWeekdays = () => {
  scheduleData.value = scheduleData.value.map(record => {
    const mondayValue = record.monday;
    return {
      ...record,
      tuesday: mondayValue,
      wednesday: mondayValue,
      thursday: mondayValue,
      friday: mondayValue,
    };
  });
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

  loadDefaultData();
};

const clearAll = () => {
  scheduleData.value = scheduleData.value.map(record => ({
    ...record,
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: '',
  }));
};

const handleOk = () => {
  // emit('save', scheduleData.value);
  // emit('update:visible', false);
  scheduleModalVisible.value = false;
};

const handleCancel = () => {
  // emit('update:visible', false);
  scheduleModalVisible.value = false;
};

import { onMounted } from 'vue';
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil';

const modalTitle = ref<string>("Schedule full label test title");
const schInfo = ref<string>("T3-TB / Test Schedule / Panel 1 / Schedule 1");

onMounted(() => {
  LogUtil.Debug('= ScheduleModal: onMounted scheduleItemData', scheduleItemData.value);

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

  loadDefaultData();
});

const loadDefaultData = () => {
  if (
    scheduleItemData.value &&
    scheduleItemData.value.t3Entry &&
    Array.isArray(scheduleItemData.value.t3Entry.time)
  ) {
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
    scheduleData.value = newScheduleData;

    LogUtil.Debug(
      '= ScheduleModal: loadDefaultData scheduleData',
      JSON.stringify(scheduleData.value), scheduleData.value
    );
  }
};

</script>

<style>
.button-container {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}

.t3-btn {
  border-radius: 2px;
}

.t3-modal {

  .ant-modal-content {
    /* background-color: #18b5c3 !important; */
    border-radius: 0px !important;
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
}
</style>
