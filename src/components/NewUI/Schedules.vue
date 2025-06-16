<template>
  <div class="schedules-container">
    <div class="actions-bar">
      <a-button type="primary" @click="copyToWeekdays">Copy to Monday - Friday</a-button>
    </div>

    <a-table :dataSource="scheduleData" :columns="columns" :pagination="false" bordered>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'onOff'">
          <a-switch v-model:checked="record.onOff" />
        </template>
        <template
          v-else-if="['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'holiday1', 'holiday2'].includes(column.key)">
          <a-time-picker
            v-model:value="record[column.key]"
            format="HH:mm"
            :minute-step="1"
            value-format="HH:mm"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button size="small" @click="copyRow(record, index)">
            Copy
          </a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Table, Button, Switch, TimePicker } from 'ant-design-vue';

defineOptions({
  name: 'SchedulesTable'
});

interface ScheduleItem {
  key: string;
  onOff: boolean;
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

const scheduleData = ref<ScheduleItem[]>([
  {
    key: '1',
    onOff: true,
    monday: '06:00',
    tuesday: '06:00',
    wednesday: '06:00',
    thursday: '06:00',
    friday: '06:00',
    saturday: '08:00',
    sunday: '08:00',
    holiday1: '08:00',
    holiday2: '08:00'
  },
  // ... other schedule data
]);

const columns = [
  {
    title: 'On/Off',
    dataIndex: 'onOff',
    key: 'onOff',
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
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
  }
];

// Function to copy values from Monday to Friday
const copyToWeekdays = (): void => {
  scheduleData.value.forEach(item => {
    const mondayValue = item.monday;
    item.tuesday = mondayValue;
    item.wednesday = mondayValue;
    item.thursday = mondayValue;
    item.friday = mondayValue;
  });
};

// Function to copy a row
const copyRow = (record: ScheduleItem, index: number): void => {
  // Create a deep copy of the record
  const newRow = { ...record };
  // Generate a unique key
  newRow.key = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  // Insert the new row after the current row
  scheduleData.value.splice(index + 1, 0, newRow);
};
</script>

<style scoped>
.schedules-container {
  padding: 20px;
}

.actions-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}
</style>
