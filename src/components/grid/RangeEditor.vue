<script>
import { ref, toRaw, onMounted, computed } from "vue";
import { ranges } from "src/lib/common";
import { cloneDeep } from "lodash"
export default {
  setup(props, ctx) {
    // the current/initial value of the cell (before editing)
    const value = ref(props.params.value);

    /* Component Editor Lifecycle methods */
    // the final value to send to the grid, on completion of editing
    const getValue = () => {
      return toRaw(value.value);
    };

    const rangeEditorDialog = ref(true);

    function cancel() {
      rangeEditorDialog.value = false;
      props.params.stopEditing(true);
    }

    function onHideRangeEditorDialog() {
      props.params.stopEditing();
    }
    const range = ref(null)
    const tab = ref('digital')
    const analogTab = ref('tempSensors')
    const tempSensorsDeg = ref('c')
    const digitalTab = ref('default')
    const customDigitalRanges = ref([])
    const addDigitalRangeDialog = ref({
      active: false,
      id: 22
    })

    const editDigitalRangeDialog = ref({
      active: false,
      data: {}
    })

    const newDigitalRange = ref({})

    const customAnalogRanges = ref([])
    const newAnalogRange = ref({})
    const addAnalogRangeDialog = ref({
      active: false,
      selected: [],
    })
    const editAnalogRangeDialog = ref({
      active: false,
      selected: [],
      data: {}
    })
    const analogRangePointHeaders = [
      {
        name: "voltage",
        label: "Voltage",
        sortable: false,
        field: "voltage",
        align: 'left',
      },
      {
        name: "value",
        label: "Value",
        sortable: false,
        field: "value",
        align: 'left',
      }
    ]

    onMounted(() => {
      customDigitalRanges.value = cloneDeep(props.params.context.project.customRanges?.digital)
      const digitalRange = ranges.digital.find(item => item.label === value.value)
      const cDigitalRange = customDigitalRanges.value.find(item => item.label === value.value)

      customAnalogRanges.value = cloneDeep(props.params.context.project.customRanges?.analog)
      const cAnalogRange = customAnalogRanges.value.find(item => item.label === value.value)
      if (digitalRange) {
        range.value = digitalRange.id
      } else if (cDigitalRange) {
        digitalTab.value = "custom"
        range.value = cDigitalRange.id
      } else if (cAnalogRange) {
        tab.value = 'analog'
        analogTab.value = 'custom'
        range.value = cAnalogRange.id
      } else {
        const tempSensorsRange = ranges.analog.tempSensors.find(item => item.label === value.value && item.unit === props.params.node.data.units)
        if (tempSensorsRange) {
          tab.value = 'analog'
          range.value = tempSensorsRange.id
          if (tempSensorsRange.unit === "Deg.F") {
            tempSensorsDeg.value = "f"
          }
        } else {
          const analogOthersRange = ranges.analog.others.find(item => item.label === value.value)
          if (analogOthersRange) {
            tab.value = 'analog'
            analogTab.value = 'others'
            range.value = analogOthersRange.id
          }
        }
      }
    })

    function save() {
      const data = props.params.node.data
      const digitalRange = ranges.digital.find(item => item.id === range.value)
      const cDigitalRange = customDigitalRanges.value.find(item => item.id === range.value)
      const cAnalogRange = customAnalogRanges.value.find(item => item.id === range.value)
      if (digitalRange) {
        data.value = digitalRange.off
        data.type = "Digital"
        data.units = null
        data.calibration = null
        value.value = digitalRange.label
      } else if (cDigitalRange) {
        data.value = cDigitalRange.off
        data.type = "Digital"
        data.units = null
        data.calibration = null
        value.value = cDigitalRange.label
      } else if (cAnalogRange) {
        data.value = cAnalogRange.points[0].value.toString()
        data.type = "Analog"
        data.units = cAnalogRange.unit
        data.calibration = null
        value.value = cAnalogRange.label
      } else {
        data.type = "Analog"
        if (!parseFloat(data.value)) {
          data.value = "60.00"
        }
        if (!data.sign) {
          data.sign = "-"
        }
        const tempSensorsRange = ranges.analog.tempSensors.find(item => item.id === range.value)
        if (tempSensorsRange) {
          data.units = tempSensorsRange.unit
          value.value = tempSensorsRange.label
        } else {
          const analogOthersRange = ranges.analog.others.find(item => item.id === range.value)
          if (analogOthersRange) {
            data.units = analogOthersRange.unit
            value.value = analogOthersRange.label
          }
        }
      }
      props.params.api.applyTransaction({
        update: [data],
      });
      props.params.stopEditing();
    }
    function addDigitalRangeAction() {
      newDigitalRange.value = { directInvers: false }
      addDigitalRangeDialog.value.active = true
    }
    function addDigitalRange() {
      addDigitalRangeDialog.value.active = false
      addDigitalRangeDialog.value.id = uniqueId(23, customDigitalRanges.value)
      newDigitalRange.value.id = addDigitalRangeDialog.value.id
      newDigitalRange.value.label = `${newDigitalRange.value.off}/${newDigitalRange.value.on}`
      customDigitalRanges.value.push(toRaw(newDigitalRange.value))
      props.params.api.dispatchEvent({
        type: 'digitalRangeAdded',
        data: { rangeData: toRaw(newDigitalRange.value) }
      });
      range.value = cloneDeep(newDigitalRange.value.id)
    }

    function removeDigitalRange(id) {
      customDigitalRanges.value.splice(customDigitalRanges.value.findIndex(item => item.id === id), 1);
      props.params.api.dispatchEvent({
        type: 'digitalRangeRemoved',
        data: { rangeId: id }
      });
    }

    const tempSensorsComputed = computed(() => {
      if (tempSensorsDeg.value === "c") {
        return ranges.analog.tempSensors.filter(item => item.unit === "Deg.C")
      }
      return ranges.analog.tempSensors.filter(item => item.unit === "Deg.F")
    });

    function updateSelectedTempSensorDeg(e) {
      const tempSensorsRange = ranges.analog.tempSensors.find(item => item.id === range.value)
      if (tempSensorsRange && e === "c") {
        range.value = range.value - 1
      } else if (tempSensorsRange && e === "f") {
        range.value = range.value + 1
      }
    }

    function editDigitalRangeAction(item) {
      editDigitalRangeDialog.value.active = true
      editDigitalRangeDialog.value.data = cloneDeep(item)
    }

    function editDigitalRange() {
      editDigitalRangeDialog.value.active = false
      const itemIndex = customDigitalRanges.value.findIndex(item => item.id === editDigitalRangeDialog.value.data.id)
      customDigitalRanges.value[itemIndex] = editDigitalRangeDialog.value.data
      customDigitalRanges.value[itemIndex].label = `${editDigitalRangeDialog.value.data.off}/${editDigitalRangeDialog.value.data.on}`
      props.params.api.dispatchEvent({
        type: 'digitalRangeUpdated',
        data: { rangeData: toRaw(customDigitalRanges.value[itemIndex]) }
      });
    }

    function addAnalogRangeAction() {
      newAnalogRange.value = { label: "Table " + (customAnalogRanges.value.length + 1), signalType: "Thermistor Dry Contact", points: [{ voltage: 0, value: 0 }], selected: [] }
      addAnalogRangeDialog.value.active = true
      addAnalogRangeDialog.value.selected = []

    }

    function addAnalogRange() {
      addAnalogRangeDialog.value.active = false
      newAnalogRange.value.id = uniqueId(50, customAnalogRanges.value)
      customAnalogRanges.value.push(toRaw(newAnalogRange.value))
      props.params.api.dispatchEvent({
        type: 'analogRangeAdded',
        data: { rangeData: toRaw(newAnalogRange.value) }
      });
      range.value = cloneDeep(newAnalogRange.value.id)
    }

    function editAnalogRangeAction(item) {
      editAnalogRangeDialog.value.active = true
      editAnalogRangeDialog.value.selected = []
      editAnalogRangeDialog.value.data = cloneDeep(item)
    }
    function editAnalogRange() {
      editAnalogRangeDialog.value.active = false
      const itemIndex = customAnalogRanges.value.findIndex(item => item.id === editAnalogRangeDialog.value.data.id)
      customAnalogRanges.value[itemIndex] = editAnalogRangeDialog.value.data
      props.params.api.dispatchEvent({
        type: 'analogRangeUpdated',
        data: { rangeData: toRaw(customAnalogRanges.value[itemIndex]) }
      });
    }

    function removeAnalogRange(id) {
      customAnalogRanges.value.splice(customAnalogRanges.value.findIndex(item => item.id === id), 1);
      props.params.api.dispatchEvent({
        type: 'analogRangeRemoved',
        data: { rangeId: id }
      });
    }

    function addNewAnalogPoint(points) {
      if (points.length === 0) {
        points.push({ id: uniqueId(1, points), voltage: 0.0, value: 0 })
      } else {
        const lastPoint = points[points.length - 1]
        points.push({ id: uniqueId(1, points), voltage: lastPoint.voltage + 1, value: lastPoint.value + 1 })
      }

    }

    function deleteSelectedPoints(mode) {
      if (mode === "edit") {
        editAnalogRangeDialog.value.data.points = editAnalogRangeDialog.value.data.points.filter(item => !editAnalogRangeDialog.value.selected.some(sItem => item.value === sItem.value))
        editAnalogRangeDialog.value.selected = []
        if (editAnalogRangeDialog.value.data.points.length === 0) {
          editAnalogRangeDialog.value.data.points.push({ voltage: 0, value: 0 })
        }
      } else {
        newAnalogRange.value.points = newAnalogRange.value.points.filter(item => !addAnalogRangeDialog.value.selected.some(sItem => item.value === sItem.value))
        addAnalogRangeDialog.value.selected = []
        if (newAnalogRange.value.points.length === 0) {
          newAnalogRange.value.points.push({ id: 1, voltage: 0, value: 0 })
        }
      }
    }

    function uniqueId(id, items) {
      if (items.map(item => item.id).includes(id)) {
        id++
        return uniqueId(id, items)
      }

      return id
    }

    const signalTypes = {
      'Thermistor Dry Contact': { unit: "v", min: 0, max: 10000 },
      '4-20 ma': { unit: "ma", min: 4, max: 20 },
      '0-5 V': { unit: "v", min: 0, max: 5 },
      '0-10 V': { unit: "v", min: 0, max: 10 },
      'PT 1K': { unit: "v", min: 0, max: 10000 },
    }

    const signalTypesKeys = Object.keys(signalTypes)

    return {
      value,
      rangeEditorDialog,
      getValue,
      cancel,
      onHideRangeEditorDialog,
      tab,
      analogTab,
      digitalTab,
      range,
      ranges,
      customDigitalRanges,
      save,
      addDigitalRangeAction,
      addDigitalRange,
      addDigitalRangeDialog,
      newDigitalRange,
      removeDigitalRange,
      tempSensorsComputed,
      tempSensorsDeg,
      updateSelectedTempSensorDeg,
      editDigitalRangeDialog,
      editDigitalRangeAction,
      editDigitalRange,
      customAnalogRanges,
      newAnalogRange,
      addAnalogRangeDialog,
      analogRangePointHeaders,
      addAnalogRangeAction,
      addAnalogRange,
      editAnalogRangeAction,
      editAnalogRange,
      removeAnalogRange,
      addNewAnalogPoint,
      editAnalogRangeDialog,
      deleteSelectedPoints,
      signalTypes,
      signalTypesKeys
    };
  },
};
</script>

<template>
  <q-dialog @hide="onHideRangeEditorDialog()" v-model="rangeEditorDialog">
    <q-card style="min-width: 700px">
      <q-card-section class="row">
        <div class="text-h6">Select Range</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="cancel()" />
      </q-card-section>
      <q-card-section style="height: 60vh" class="scroll q-pt-none">
        <q-tabs v-model="tab" inline-label class="bg-primary text-white shadow-2">
          <q-tab name="digital" icon="numbers" label="Digital Units" />
          <q-tab name="analog" icon="settings_input_antenna" label="Analog Units" />
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="tab" animated class="bg-slate-200">
          <q-tab-panel name="digital">
            <div class="flex justify-center mb-2">
              <q-btn-toggle v-model="digitalTab" no-caps rounded unelevated toggle-color="primary" color="white"
                text-color="primary" :options="[
                  { label: 'Default', value: 'default' },
                  { label: 'Custom', value: 'custom' }
                ]" class="border border-solid border-color-primary" />
            </div>
            <q-separator />
            <q-tab-panels v-model="digitalTab" animated>
              <q-tab-panel name="default">
                <div class="grid grid-rows-11 grid-flow-col gap-4">
                  <q-radio v-for="item in ranges.digital" :key="item.id" v-model="range" :val="item.id"
                    :label="`${item.id}. ${item.label}`" />
                </div>
              </q-tab-panel>
              <q-tab-panel name="custom">
                <div class="grid grid-rows-3 grid-flow-col gap-4 mb-4" v-if="customDigitalRanges?.length">
                  <div v-for="item in customDigitalRanges" :key="item.id" class="custom-range-container relative">
                    <q-radio v-model="range" :val="item.id" :label="`${item.id}. ${item.label}`" />
                    <div class="actions hidden absolute top-1 right-3">
                      <q-btn round dense color="grey-8" size="sm" icon="edit" @click="editDigitalRangeAction(item)">
                        <q-tooltip>Edit Range</q-tooltip>
                      </q-btn>
                      <q-btn round dense color="red-8" size="sm" icon="delete" class="ml-1"
                        @click="removeDigitalRange(item.id)">
                        <q-tooltip>Delete Range</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>
                <div v-else class="mb-4">No custom ranges.</div>
                <q-btn color="primary" label="Add custom range" @click="addDigitalRangeAction"
                  :disable="customDigitalRanges.length > 5" />
              </q-tab-panel>
            </q-tab-panels>
          </q-tab-panel>
          <q-tab-panel name="analog">
            <div class="flex justify-center mb-2">
              <q-btn-toggle v-model="analogTab" no-caps rounded unelevated toggle-color="primary" color="white"
                text-color="primary" :options="[
                  { label: 'Temp Sensors', value: 'tempSensors' },
                  { label: 'Others', value: 'others' },
                  { label: 'Custom', value: 'custom' }
                ]" class="border border-solid border-color-primary" />
            </div>
            <q-tab-panels v-model="analogTab" animated>
              <q-tab-panel name="tempSensors">
                <div class="row items-center justify-center mb-4">
                  <q-btn-toggle @update:model-value="updateSelectedTempSensorDeg($event)" v-model="tempSensorsDeg"
                    no-caps rounded unelevated toggle-color="primary" color="white" text-color="primary" :options="[
                      { label: 'Deg.C', value: 'c' },
                      { label: 'Deg.F', value: 'f' }
                    ]" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <q-radio v-for="item in tempSensorsComputed" :key="item.id" v-model="range" :val="item.id"
                    :label="`${item.label}`" />
                </div>
              </q-tab-panel>
              <q-tab-panel name="others">
                <div class="grid grid-rows-9 grid-flow-col gap-4">
                  <q-radio v-for="item in ranges.analog.others" :key="item.id" v-model="range" :val="item.id"
                    :label="`${item.id}. ${item.label}`" />
                </div>
              </q-tab-panel>
              <q-tab-panel name="custom">
                <div class="grid grid-rows-3 grid-flow-col gap-4 mb-4" v-if="customAnalogRanges?.length">
                  <div v-for="item in customAnalogRanges" :key="item.id" class="custom-range-container relative">
                    <q-radio v-model="range" :val="item.id" :label="`${item.id}. ${item.label}`" />
                    <div class="actions hidden absolute top-1 right-3">
                      <q-btn round dense color="grey-8" size="sm" icon="edit" @click="editAnalogRangeAction(item)">
                        <q-tooltip>Edit Range</q-tooltip>
                      </q-btn>
                      <q-btn round dense color="red-8" size="sm" icon="delete" class="ml-1"
                        @click="removeAnalogRange(item.id)">
                        <q-tooltip>Delete Range</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </div>
                <div v-else class="mb-4">No custom ranges.</div>
                <q-btn color="primary" label="Add custom range" @click="addAnalogRangeAction()"
                  :disable="customAnalogRanges.length > 5" />
              </q-tab-panel>
            </q-tab-panels>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" @click="cancel()" />
        <q-btn flat :disable="!range" label="Save" @click="save()" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="addDigitalRangeDialog.active">
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center">
        <div class="text-h6">Add Custom Range</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-form class="q-gutter-md" @submit="addDigitalRange()">
        <q-card-section class="scroll q-pt-none">
          <q-input filled v-model="newDigitalRange.off" label="Digital off *" lazy-rules
            :rules="[val => val !== undefined && val !== null && val !== '' || 'Please type digital off value', val => val !== newDigitalRange.on || 'Off value should not be the same as on value']" />

          <q-input filled v-model="newDigitalRange.on" label="Digital on *" lazy-rules :rules="[val => val !== undefined && val !== null && val !== '' || 'Please type digital on value',
          val => val !== newDigitalRange.off || 'On value should not be the same as off value']" />

          <q-toggle v-model="newDigitalRange.directInvers" label="Invers" />

        </q-card-section>

        <q-card-actions align="between" class="text-primary">
          <div></div>
          <div>
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn type="submit" flat label="Save" />
          </div>
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>

  <q-dialog v-model="editDigitalRangeDialog.active">
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center">
        <div class="text-h6">Edit Custom Range</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-form class="q-gutter-md" @submit="editDigitalRange()">
        <q-card-section class="scroll q-pt-none">
          <q-input filled v-model="editDigitalRangeDialog.data.off" label="Digital off *" lazy-rules
            :rules="[val => val !== undefined && val !== null && val !== '' || 'Please type digital off value', val => val !== newDigitalRange.on || 'Off value should not be the same as on value']" />

          <q-input filled v-model="editDigitalRangeDialog.data.on" label="Digital on *" lazy-rules :rules="[val => val !== undefined && val !== null && val !== '' || 'Please type digital on value',
          val => val !== editDigitalRangeDialog.data.off || 'On value should not be the same as off value']" />

          <q-toggle v-model="editDigitalRangeDialog.data.directInvers" label="Invers" />

        </q-card-section>

        <q-card-actions align="between" class="text-primary">
          <div></div>
          <div>
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn type="submit" flat label="Save" />
          </div>
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>

  <!-- Add custom analog range dialog -->
  <q-dialog v-model="addAnalogRangeDialog.active" persistent>
    <q-card style="min-width: 690px">
      <q-card-section class="row items-center">
        <div class="text-h6">Add Custom Range</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-form class="q-gutter-md" @submit="addAnalogRange()">

        <q-card-section class="scroll q-pt-none" style="height: 55vh">
          <div class="flex-nowrap row justify-center mb-4 gap-3">
            <q-input filled v-model="newAnalogRange.label" label="Label" lazy-rules
              :rules="[val => val !== undefined && val !== null && val !== '' || 'This field is required!']" />
            <q-input filled v-model="newAnalogRange.unit" label="Units" lazy-rules />
            <q-select filled v-model="newAnalogRange.signalType" label="Signal Type" :options="signalTypesKeys" />
          </div>
          <q-table :rows="newAnalogRange.points" selection="multiple" v-model:selected="addAnalogRangeDialog.selected"
            :columns="analogRangePointHeaders" row-key="id" hide-pagination :pagination="{ rowsPerPage: 0 }">
            <template v-slot:header-cell-voltage="props">
              <q-th :props="props">
                {{  `${signalTypes[newAnalogRange.signalType].unit === 'v' ? 'Voltage' : 'Current'}`  }}
              </q-th>
            </template>
            <template v-slot:top>
              <q-btn color="primary" label="Add new point" @click="addNewAnalogPoint(newAnalogRange.points)" />
              <q-btn v-if="addAnalogRangeDialog.selected.length" class="q-ml-sm" color="red"
                label="Remove selected points" @click="deleteSelectedPoints('add')" />
            </template>
            <template v-slot:body-cell-voltage="props">
              <q-td :props="props">
                <q-input filled type="number" v-model.number="props.row.voltage"
                  :label="signalTypes[newAnalogRange.signalType].unit === 'v' ? 'Voltage' : 'Current'"
                  :min="signalTypes[newAnalogRange.signalType].min" :max="signalTypes[newAnalogRange.signalType].max"
                  step="0.1" lazy-rules
                  :rules="[val => (props.rowIndex === 0 || val > newAnalogRange.points[props.rowIndex - 1].voltage) || `${signalTypes[newAnalogRange.signalType].unit === 'v' ? 'Voltage' : 'Current'} should be bigger the the previous row voltage!`]" />
              </q-td>
            </template>
            <template v-slot:body-cell-value="props">
              <q-td :props="props">
                <q-input filled type="number" v-model.number="props.row.value" label="Value" min="-100" step="1"
                  lazy-rules
                  :rules="[val => (props.rowIndex === 0 || val > newAnalogRange.points[props.rowIndex - 1].value) || 'Value should be bigger the the previous row value!']" />
              </q-td>
            </template>
          </q-table>

        </q-card-section>

        <q-card-actions align="between" class="text-primary">
          <div></div>
          <div>
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn type="submit" flat label="Save" />
          </div>
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>

  <!-- Edit custom analog range dialog -->
  <q-dialog v-model="editAnalogRangeDialog.active" persistent>
    <q-card style="min-width: 690px">
      <q-card-section class="row items-center">
        <div class="text-h6">Edit Custom Range</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-form class="q-gutter-md" @submit="editAnalogRange()">

        <q-card-section class="scroll q-pt-none" style="height: 55vh">
          <div class="flex-nowrap row justify-center mb-4 gap-4">
            <q-input filled v-model="editAnalogRangeDialog.data.label" label="Label" lazy-rules
              :rules="[val => val !== undefined && val !== null && val !== '' || 'This field is required!']" />
            <q-input filled v-model="editAnalogRangeDialog.data.unit" label="Units" lazy-rules />
            <q-select filled v-model="editAnalogRangeDialog.data.signalType" label="Signal Type"
              :options="signalTypesKeys" />
          </div>
          <q-table :rows="editAnalogRangeDialog.data.points" selection="multiple"
            v-model:selected="editAnalogRangeDialog.selected" :columns="analogRangePointHeaders" row-key="id"
            hide-pagination :pagination="{ rowsPerPage: 0 }">
            <template v-slot:header-cell-voltage="props">
              <q-th :props="props">
                {{  `${signalTypes[editAnalogRangeDialog.data.signalType].unit === 'v' ? 'Voltage' : 'Current'}`  }}
              </q-th>
            </template>
            <template v-slot:top>
              <q-btn color="primary" label="Add new point"
                @click="addNewAnalogPoint(editAnalogRangeDialog.data.points)" />
              <q-btn v-if="editAnalogRangeDialog.selected.length" class="q-ml-sm" color="red"
                label="Remove selected points" @click="deleteSelectedPoints('edit')" />
            </template>
            <template v-slot:body-cell-voltage="props">
              <q-td :props="props">
                <q-input filled type="number" v-model.number="props.row.voltage"
                  :label="signalTypes[editAnalogRangeDialog.data.signalType].unit === 'v' ? 'Voltage' : 'Current'"
                  :min="signalTypes[editAnalogRangeDialog.data.signalType].min"
                  :max="signalTypes[editAnalogRangeDialog.data.signalType].max" step="0.1" lazy-rules
                  :rules="[val => (props.rowIndex === 0 || val > editAnalogRangeDialog.data.points[props.rowIndex - 1].voltage) || `${signalTypes[editAnalogRangeDialog.data.signalType].unit === 'v' ? 'Voltage' : 'Current'} should be bigger the the previous row voltage!`]" />
              </q-td>
            </template>
            <template v-slot:body-cell-value="props">
              <q-td :props="props">
                <q-input filled type="number" v-model.number="props.row.value" label="Value" min="-100" step="1"
                  lazy-rules
                  :rules="[val => (props.rowIndex === 0 || val > editAnalogRangeDialog.data.points[props.rowIndex - 1].value) || 'Value should be bigger the the previous row value!']" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>

        <q-card-actions align="between" class="text-primary">
          <div></div>
          <div>
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn type="submit" flat label="Save" />
          </div>
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.grid-rows-11 {
  grid-template-rows: repeat(11, minmax(0, 1fr));
}

.grid-rows-9 {
  grid-template-rows: repeat(9, minmax(0, 1fr));
}

.custom-range-container:hover .actions {
  display: inline-block !important;
}

.border-color-primary {
  border-color: #1976d2;
}

.q-tab-panel {
  padding-top: 8px;
}
</style>
