<template>
  <a-modal v-model:visible="scheduleModalVisible" title="Schedule" :width="1000" @ok="handleOk" @cancel="handleCancel">
    <!-- Remove the button from here, as it will be moved to the modal footer -->
    <a-table :dataSource="scheduleData" :columns="columns" :pagination="false" bordered size="small">
      <template #bodyCell="{ column, record }">
        <!-- Status Column (On/Off) -->
        <template v-if="column.key === 'status'">
          <a-switch v-model:checked="record.status" @change="onStatusChange(record)" checked-children="On"
            un-checked-children="Off" />
        </template>

        <!-- Day Columns (Monday through Holiday2) -->
        <template
          v-else-if="['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'holiday1', 'holiday2'].includes(column.key)">
          <a-select v-model:value="record[column.key]" style="width: 100%"
            @change="(value) => onTimeChange(record, column.key, value)">
            <a-select-option v-for="time in timeOptions" :key="time" :value="time">
              {{ time }}
            </a-select-option>
          </a-select>
        </template>
      </template>
    </a-table>
    <template #footer>
      <div style="display: flex; justify-content: flex-start; gap: 8px;">
        <a-button class="t3-btn" @click="copyToWeekdays">Copy to Monday - Friday</a-button>
        <a-button class="t3-btn" @click="refreshFromT3000">Refresh from T3000</a-button>
        <a-button class="t3-btn" @click="clearAll">Clear All</a-button>
        <a-button class="t3-btn" @click="handleOk">Save</a-button>
        <a-button class="t3-btn" @click="handleCancel">Cancel</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Modal, Table, Button, Switch, Select } from 'ant-design-vue';
import { scheduleModalVisible, selectedSchedule } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';

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
  status: false,
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
    width: 80,
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

const onTimeChange = (record: ScheduleItem, key: string, value: string) => {
  console.log(`Time changed for ${key}:`, value);
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
  scheduleData.value = Array.from({ length: 8 }, (_, i) => ({
    key: (i + 1).toString(),
    status: false,
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
};

const clearAll = () => {
  scheduleData.value = scheduleData.value.map(record => ({
    ...record,
    status: false,
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
</script>

<style scoped>
.button-container {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}

.t3-btn {
  border-radius: 2px;
}
</style>
