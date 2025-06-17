<template>
  <div class="divider-row"></div>

  <div class="schedules-container">
    <a-tabs v-model:activeKey="activeTab" type="card" class="schedules-tabs" size="small">

      <a-tab-pane key="schedules" tab="Schedules" class="schedules-tab">
        <div class="flex-container">



          <!-- Left Section: Device Tree -->
          <div class="left-section">
            <a-tree :treeData="deviceTreeData" :defaultExpandedKeys="['0-0']" v-model:selectedKeys="deviceSelectedKeys"
              @select="onDeviceSelect">
              <template #title="{ key, title }">
                <MenuUnfoldOutlined v-if="key === '0'" />
                <CheckOutlined v-else-if="deviceSelectedKeys.includes(key)" />
                <MinusOutlined v-else />
                <span style="margin-left: 5px">{{ title }}</span>
              </template>
            </a-tree>
          </div>














          <!-- Right Section: Schedule Table -->
          <div class="right-section">


            <a-table :dataSource="scheduleTableData" :columns="scheduleColumns" :pagination="false" bordered>
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'checkbox'">
                  <!-- <a-checkbox v-model:checked="record.checked" /> -->
                  <a-button type="primary" size="small" class="t3-btn" @click="editSchedule(record)">Edit
                    Schedule</a-button>
                </template>
                <template v-else-if="column.key === 'fullLabel'">
                  <a-input v-model:value="record.fullLabel" />
                </template>
                <template v-else-if="column.key === 'autoManual'">
                  <a-select v-model:value="record.autoManual" style="width: 100%">
                    <a-select-option value="Auto">Auto</a-select-option>
                    <a-select-option value="Manual">Manual</a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'output'">
                  <a-select v-model:value="record.output" style="width: 100%">
                    <a-select-option value="On">On</a-select-option>
                    <a-select-option value="Off">Off</a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'holiday1'">
                  <a-select v-model:value="record.holiday1" style="width: 100%">
                    <a-select-option v-for="ar in ['AR1', 'AR2', 'AR3', 'AR4']" :key="ar" :value="ar">{{ ar
                    }}</a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'state1'">
                  <a-select v-model:value="record.state1" style="width: 100%">
                    <a-select-option value="On">On</a-select-option>
                    <a-select-option value="Off">Off</a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'holiday2'">
                  <a-select v-model:value="record.holiday2" style="width: 100%">
                    <a-select-option v-for="ar in ['AR1', 'AR2', 'AR3', 'AR4']" :key="ar" :value="ar">{{ ar
                    }}</a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'state2'">
                  <a-select v-model:value="record.state2" style="width: 100%">
                    <a-select-option value="On">On</a-select-option>
                    <a-select-option value="Off">Off</a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'label'">
                  <a-input v-model:value="record.label" />
                </template>
              </template>
            </a-table>



















          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="weekly" tab="Weekly">
        <div class="actions-bar">
          <a-button type="primary" size="small" class="t3-btn" @click="copyToWeekdays">Copy to Monday -
            Friday</a-button>

          <a-button size="small" class="t3-btn" style="margin-left: 10px;" @click="loadDefaultData">Load
            Default</a-button>


          <a-button class="t3-btn" size="small" style="margin-left: 10px;"
            @click="scheduleData.push({ key: String(scheduleData.length + 1), onOff: false, monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '', holiday1: '', holiday2: '' })">
            Add Schedule
          </a-button>
          <a-button size="small" class="t3-btn" style="margin-left: 10px;"
            @click="scheduleData.splice(0, scheduleData.length)">Clear All
          </a-button>
        </div>

        <a-table :dataSource="scheduleData" :columns="columns" :pagination="false" bordered>
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'onOff'">
              <a-switch v-model:checked="record.onOff" checked-children="On" un-checked-children="Off"/>

            </template>
            <template
              v-else-if="['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'holiday1', 'holiday2'].includes(column.key)">
              <a-time-picker v-model:value="record[column.key]" format="HH:mm" :minute-step="1" value-format="HH:mm"
                style="width: 100%" />
            </template>
            <template v-else-if="column.key === 'actions'">
              <!-- <a-button size="small" type="link" @click="copyRow(record, index)">
                Copy
              </a-button> -->
              <a-button type="primary" size="small" class="t3-btn" @click="scheduleData.splice(index, 1)">
                Delete
              </a-button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="calendar" tab="Calendar">
        <div class="calendar-year-view">
          <div v-for="month in 12" :key="month" class="calendar-month">
            <h3>{{ getMonthName(month) }}</h3>
            <a-calendar :fullscreen="false" :value="getMonthDate(month)" :headerRender="() => null" />
          </div>
        </div>
      </a-tab-pane>

    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Table, Button, Switch, TimePicker, Tabs, Calendar, Tree, Checkbox, Input, Select } from 'ant-design-vue';
import {
  CloseOutlined,
  EditOutlined,
  CopyOutlined,
  ScissorOutlined,
  FileAddOutlined,
  SettingOutlined,
  DeleteOutlined,
  ClearOutlined,
  RightOutlined,
  RotateRightOutlined,
  CompressOutlined,
  AlignLeftOutlined,
  ApartmentOutlined,
  NodeIndexOutlined,
  SwapOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  UndoOutlined,
  RedoOutlined,
  BlockOutlined,
  SaveOutlined,
  LockOutlined,
  UnlockOutlined,
  BgColorsOutlined,
  CheckOutlined,
  FolderOutlined,
  MinusOutlined,
  MenuUnfoldOutlined,
  GatewayOutlined
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

defineOptions({
  name: 'SchedulesTable'
});

const activeTab = ref('schedules');

// Original schedule data
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

/** 1st tab Schedules */

// Add this near your other ref declarations
const deviceSelectedKeys = ref<string[]>(['0-0']);

// New device tree data
const deviceTreeData = ref([
  {
    title: 'All Devices',
    key: '0',
    children: [
      {
        title: 'T3000',
        key: '0-0',
      },
      {
        title: 'T3-TB',
        key: '0-1',
      },
    ],
  },
]);

// Function to handle device selection
const onDeviceSelect = (selectedKeys: string[], info: any) => {
  console.log('Selected', selectedKeys, info);
  deviceSelectedKeys.value = selectedKeys; // Update selected keys

  // Update scheduleTableData based on the selected device
  const deviceId = selectedKeys.length > 0 ? selectedKeys[0] : '';

  // Generate new schedule data based on the selected device
  const newScheduleData = Array(8).fill(null).map((_, index) => {
    const num = index + 1;
    const deviceName = deviceId === '0-0' ? 'T3000' : deviceId === '0-1' ? 'T3-TB' : 'Unknown';

    return {
      key: String(num),
      checked: false,
      num: num,
      fullLabel: `${deviceName} Schedule ${num}`,
      autoManual: index % 2 === 0 ? 'Auto' : 'Manual',
      output: index % 2 === 0 ? 'On' : 'Off',
      holiday1: `AR${(index % 4) + 1}`,
      state1: index % 2 === 0 ? 'On' : 'Off',
      holiday2: `AR${((index + 1) % 4) + 1}`,
      state2: index % 2 === 0 ? 'Off' : 'On',
      label: `${deviceName.substring(0, 1)}SCH${num}`
    };
  });

  // Update the schedule table data
  scheduleTableData.value = newScheduleData;
};

// Function to edit a schedule
const editSchedule = (record: ScheduleTableItem): void => {
  // Switch to the weekly tab
  activeTab.value = 'weekly';

  // Log the schedule being edited
  console.log('Editing schedule:', record);

  // Additional functionality can be added here to use the record data
  // such as highlighting the relevant schedule in the weekly view
};

// Function to load default schedule data
const loadDefaultData = (): void => {
  scheduleData.value = [
    {
      key: '1',
      onOff: true,
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      holiday1: '',
      holiday2: ''
    },
    {
      key: '2',
      onOff: false,
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      holiday1: '',
      holiday2: ''
    },
    {
      key: '3',
      onOff: true,
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      holiday1: '',
      holiday2: ''
    },
    {
      key: '4',
      onOff: true,
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      holiday1: '',
      holiday2: ''
    },
    {
      key: '5',
      onOff: false,
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      holiday1: '',
      holiday2: ''
    },
    {
      key: '6',
      onOff: true,
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      holiday1: '',
      holiday2: ''
    }
  ];
};


const scheduleData = ref<ScheduleItem[]>([
  {
    key: '1',
    onOff: true,
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: ''
  },
  {
    key: '2',
    onOff: false,
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: ''
  },
  {
    key: '3',
    onOff: true,
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: ''
  },
  {
    key: '4',
    onOff: true,
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: ''
  },
  {
    key: '5',
    onOff: false,
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: ''
  },
  {
    key: '6',
    onOff: true,
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
    holiday1: '',
    holiday2: ''
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
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
  }
];






// New schedule table data
interface ScheduleTableItem {
  key: string;
  checked: boolean;
  num: number;
  fullLabel: string;
  autoManual: string;
  output: string;
  holiday1: string;
  state1: string;
  holiday2: string;
  state2: string;
  label: string;
}

const scheduleTableData = ref<ScheduleTableItem[]>([
  {
    key: '1',
    checked: false,
    num: 1,
    fullLabel: 'Schedule 1',
    autoManual: 'Auto',
    output: 'On',
    holiday1: 'AR1',
    state1: 'On',
    holiday2: 'AR2',
    state2: 'Off',
    label: 'SCH1'
  },
  {
    key: '2',
    checked: false,
    num: 2,
    fullLabel: 'Schedule 2',
    autoManual: 'Manual',
    output: 'Off',
    holiday1: 'AR2',
    state1: 'Off',
    holiday2: 'AR3',
    state2: 'On',
    label: 'SCH2'
  },
  {
    key: '3',
    checked: false,
    num: 3,
    fullLabel: 'Schedule 3',
    autoManual: 'Auto',
    output: 'On',
    holiday1: 'AR3',
    state1: 'On',
    holiday2: 'AR4',
    state2: 'Off',
    label: 'SCH3'
  },
  {
    key: '4',
    checked: false,
    num: 4,
    fullLabel: 'Schedule 4',
    autoManual: 'Manual',
    output: 'Off',
    holiday1: 'AR4',
    state1: 'Off',
    holiday2: 'AR1',
    state2: 'On',
    label: 'SCH4'
  },
  {
    key: '5',
    checked: false,
    num: 5,
    fullLabel: 'Schedule 5',
    autoManual: 'Auto',
    output: 'On',
    holiday1: 'AR1',
    state1: 'Off',
    holiday2: 'AR2',
    state2: 'On',
    label: 'SCH5'
  },
  {
    key: '6',
    checked: false,
    num: 6,
    fullLabel: 'Schedule 6',
    autoManual: 'Manual',
    output: 'On',
    holiday1: 'AR2',
    state1: 'On',
    holiday2: 'AR3',
    state2: 'Off',
    label: 'SCH6'
  },
  {
    key: '7',
    checked: false,
    num: 7,
    fullLabel: 'Schedule 7',
    autoManual: 'Auto',
    output: 'Off',
    holiday1: 'AR3',
    state1: 'Off',
    holiday2: 'AR4',
    state2: 'On',
    label: 'SCH7'
  },
  {
    key: '8',
    checked: false,
    num: 8,
    fullLabel: 'Schedule 8',
    autoManual: 'Manual',
    output: 'Off',
    holiday1: 'AR4',
    state1: 'On',
    holiday2: 'AR1',
    state2: 'Off',
    label: 'SCH8'
  }
]);

// New schedule columns
const scheduleColumns = [
  {
    title: 'Action',
    key: 'checkbox',
    width: 50,
  },
  {
    title: 'NUM',
    dataIndex: 'num',
    key: 'num',
    width: 70,
  },
  {
    title: 'Full Label',
    dataIndex: 'fullLabel',
    key: 'fullLabel',
  },
  {
    title: 'Auto/Manual',
    dataIndex: 'autoManual',
    key: 'autoManual',
  },
  {
    title: 'Output',
    dataIndex: 'output',
    key: 'output',
  },
  {
    title: 'Holiday1',
    dataIndex: 'holiday1',
    key: 'holiday1',
  },
  {
    title: 'State1',
    dataIndex: 'state1',
    key: 'state1',
  },
  {
    title: 'Holiday2',
    dataIndex: 'holiday2',
    key: 'holiday2',
  },
  {
    title: 'State2',
    dataIndex: 'state2',
    key: 'state2',
  },
  {
    title: 'Label',
    dataIndex: 'label',
    key: 'label',
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

// Calendar helpers
const currentYear = ref(dayjs().year());

const getMonthName = (month: number): string => {
  return dayjs().month(month - 1).format('MMMM');
};

const getMonthDate = (month: number) => {
  return dayjs().year(currentYear.value).month(month - 1).date(1);
};

/* top tool bar section */
// Toggle the lock state of the application
function lockToggle(): void {
  // Hvac.IdxPage2.lockToggle();
}

// Navigate back in the group navigation history
function navGoBack(): void {
  // Hvac.IdxPage2.navGoBack();
}

// Handle the menu action for the top toolbar
function handleMenuAction(action: string, val?: any): void {
}

function showMoreDevices(): void {
  // Hvac.IdxPage2.showMoreDevices();
}

</script>

<style scoped>
.divider-row {
  margin-top: 35px;
}

.schedules-container {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

  :deep(.ant-tabs-tab) {
    font-size: 13px;
  }

  :deep() {
    font-size: 13px;
  }
}

.schedules-tab {
  font-size: 13px;
}

.weekly-tab {
  font-size: 13px;
}

.calendar-tab {
  font-size: 13px;
}

.actions-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}

.calendar-year-view {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

.calendar-month {
  border: 1px solid #f0f0f0;
  border-radius: 2px;
  padding: 8px;
}

.flex-container {
  display: flex;
  gap: 20px;
}

.left-section {
  flex: 1;
  max-width: 300px;
  border: 1px solid #f0f0f0;
  padding: 10px;
  border-radius: 4px;
}

.right-section {
  flex: 3;
}

.t3-btn {
  border-radius: 2px;
}
</style>
