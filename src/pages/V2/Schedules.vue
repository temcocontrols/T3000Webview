<template>
  <!-- <NewTopToolBar2 :locked="locked" @lockToggle="lockToggle" @navGoBack="navGoBack" @menu-action="handleMenuAction"
    :object="appStateV2.items[appStateV2.activeItemIndex]" :selected-count="appStateV2.selectedTargets?.length"
    :disable-undo="locked || undoHistory.length < 1" :disable-redo="locked || redoHistory.length < 1"
    :disable-paste="locked || !clipboardFull" :zoom="zoom" :rulersGridVisible="rulersGridVisible"
    :deviceModel="deviceModel" @showMoreDevices="showMoreDevices" v-if="!isBuiltInEdge && !locked">
  </NewTopToolBar2> -->

  <div class="schedules-container">
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="schedules" tab="Schedules">
        <div class="flex-container">
          <!-- Left Section: Device Tree -->
          <div class="left-section">
            <a-tree :treeData="deviceTreeData" :defaultExpandedKeys="['0-0']" @select="onDeviceSelect" />
          </div>

          <!-- Right Section: Schedule Table -->
          <div class="right-section">
            <a-table :dataSource="scheduleTableData" :columns="scheduleColumns" :pagination="false" bordered>
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'checkbox'">
                  <a-checkbox v-model:checked="record.checked" />
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
          <a-button type="primary" @click="copyToWeekdays">Copy to Monday - Friday</a-button>
        </div>

        <a-table :dataSource="scheduleData" :columns="columns" :pagination="false" bordered>
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'onOff'">
              <a-switch v-model:checked="record.onOff" />
            </template>
            <template
              v-else-if="['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'holiday1', 'holiday2'].includes(column.key)">
              <a-time-picker v-model:value="record[column.key]" format="HH:mm" :minute-step="1" value-format="HH:mm"
                style="width: 100%" />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button size="small" @click="copyRow(record, index)">
                Copy
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
import dayjs from 'dayjs';
// import NewTopToolBar2 from "src/components/NewUI/NewTopToolBar2.vue";
// import {
//   emptyProject, appState, deviceAppState, deviceModel, rulersGridVisible, user, library, emptyLib, isBuiltInEdge,
//   documentAreaPosition, viewportMargins, viewport, locked, T3_Types, T3000_Data, grpNav, selectPanelOptions, linkT3EntryDialogV2,
//   savedNotify, undoHistory, redoHistory, moveable, appStateV2
// } from '../../lib/T3000/Hvac/Data/T3Data';
// import {
//   topContextToggleVisible, showSettingMenu, toggleModeValue, toggleValueValue, toggleValueDisable, toggleValueShow, toggleNumberDisable, toggleNumberShow, toggleNumberValue,
//   gaugeSettingsDialog, insertCount, selectedTool, isDrawing, snappable, keepRatio, selecto, importJsonDialog, clipboardFull
// } from "src/lib/T3000/Hvac/Data/Constant/RefConstant";
// import Hvac from "src/lib/T3000/Hvac/Hvac";

const zoom =null;// Hvac.IdxPage.zoom;

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

// New device tree data
const deviceTreeData = ref([
  {
    title: 'Controllers',
    key: '0-0',
    children: [
      {
        title: 'T3000',
        key: '0-0-0',
        children: [
          { title: 'Schedule 1', key: '0-0-0-0' },
          { title: 'Schedule 2', key: '0-0-0-1' },
        ],
      },
      {
        title: 'T3-TB',
        key: '0-0-1',
        children: [
          { title: 'Schedule 1', key: '0-0-1-0' },
          { title: 'Schedule 2', key: '0-0-1-1' },
        ],
      },
    ],
  },
]);

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
  }
]);

// New schedule columns
const scheduleColumns = [
  {
    title: '',
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

// Function to handle device selection
const onDeviceSelect = (selectedKeys: string[], info: any) => {
  console.log('Selected', selectedKeys, info);
};

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
.schedules-container {
  padding: 20px;
}

.actions-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}

.calendar-year-view {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
</style>
