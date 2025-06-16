<template>
  <div class="schedules-container">
    <div class="actions-bar">
      <a-button type="primary" @click="copyToWeekdays">Copy to Monday - Friday</a-button>
    </div>

    <a-table :dataSource="scheduleData" :columns="columns" :pagination="false" bordered>
      <template #bodyCell="{ column, record }">
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
    monday: '08:00',
    tuesday: '08:00',
    wednesday: '08:00',
    thursday: '08:00',
    friday: '08:00',
    saturday: '10:00',
    sunday: '10:00',
    holiday1: '10:00',
    holiday2: '10:00'
  },
  {
    key: '2',
    onOff: true,
    monday: '17:00',
    tuesday: '17:00',
    wednesday: '17:00',
    thursday: '17:00',
    friday: '17:00',
    saturday: '15:00',
    sunday: '15:00',
    holiday1: '15:00',
    holiday2: '15:00'
  }
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
