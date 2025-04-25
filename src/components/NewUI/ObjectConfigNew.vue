<template>
  <!-- <a-drawer title="" :width="250" :maskClosable="false" :mask="false" :placement="placement" :open="objectConfigShow"
    @close="onClose"> -->
  <div class="item-config flex flex-nowrap column" v-if="item">
    <h3 class="leading-8 font-bold text-white">{{ item.type }}</h3>
    <div class="item-config-inner">
      <div>
        <q-btn v-if="['Gauge', 'Dial'].includes(item.type)" dark outline no-caps stretch icon="settings"
          class="text-white w-full mb-2" label="Settings" @click="gaugeSettings(item)" />
        <q-btn dark outline no-caps stretch class="text-white w-full link-t3-entry" @click="linkT3Entry">
          <div v-if="!item.t3Entry">
            <p>Link with an entry</p>
          </div>
          <div v-if="item.t3Entry" style="text-align: left;width: 100%;">
            <p style="font-size: 13px;">Linked with <q-icon name="dataset_linked" style="font-size: 18px;" /></p>
            <p>{{ item.t3Entry.description }}</p>
          </div>
        </q-btn>
        <!-- <q-expansion-item v-if="item.t3Entry" class="mt-2 border border-solid border-gray-700" dark default-opened
          label="Entry settings" > -->
        <div class="p-1" v-if="item.t3Entry">
          <q-select v-if="item.t3Entry.auto_manual !== undefined" class="mb-1" filled dark
            v-model="item.t3Entry.auto_manual" :options="[
              { label: 'Auto', value: 0 },
              { label: 'Manual', value: 1 },
            ]" label="Auto/Manual" emit-value map-options
            @update:model-value="T3UpdateEntryField('auto_manual', item)" />
          <!-- Digital range values -->
          <q-select class="mb-1" v-if="
            item.t3Entry.range < 101 &&
            item.t3Entry.digital_analog === 0 &&
            item.t3Entry.range
          " :disable="item.t3Entry?.auto_manual === 0" filled dark v-model="item.t3Entry.control" :options="[
            {
              label: getEntryRange(item.t3Entry)?.off,
              value: 0,
            },
            {
              label: getEntryRange(item.t3Entry)?.on,
              value: 1,
            },
          ]" label="Value" emit-value map-options @update:model-value="T3UpdateEntryField('control', item)" />
          <!-- MSV range values -->
          <q-select class="mb-1" v-if="item.t3Entry.range > 100" :disable="item.t3Entry?.auto_manual === 0" filled dark
            v-model="item.t3Entry.value" :options="rangeOptions" label="Value" emit-value map-options
            option-label="name" @update:model-value="T3UpdateEntryField('value', item)" />
          <!-- Program status -->
          <q-select class="mb-1" v-else-if="item.t3Entry.type === 'PROGRAM'" :disable="item.t3Entry?.auto_manual === 0"
            filled dark v-model="item.t3Entry.status" :options="[
              {
                label: 'OFF',
                value: 0,
              },
              {
                label: 'ON',
                value: 1,
              },
            ]" label="Status" emit-value map-options @update:model-value="T3UpdateEntryField('status', item)" />
          <!-- Schedule output -->
          <q-select class="mb-1" v-else-if="item.t3Entry.type === 'SCHEDULE'" :disable="item.t3Entry?.auto_manual === 0"
            filled dark v-model="item.t3Entry.output" :options="[
              {
                label: 'OFF',
                value: 0,
              },
              {
                label: 'ON',
                value: 1,
              },
            ]" label="Output" emit-value map-options @update:model-value="T3UpdateEntryField('output', item)" />
          <!-- Holiday value -->
          <q-select class="mb-1" v-else-if="item.t3Entry.type === 'HOLIDAY'" :disable="item.t3Entry?.auto_manual === 0"
            filled dark v-model="item.t3Entry.value" :options="[
              {
                label: 'OFF',
                value: 0,
              },
              {
                label: 'ON',
                value: 1,
              },
            ]" label="Value" emit-value map-options @update:model-value="T3UpdateEntryField('value', item)" />
          <!-- Analog range value -->
          <q-input class="mb-1" v-if="item.t3Entry.range < 101 && item.t3Entry.digital_analog === 1"
            :disable="item.t3Entry?.auto_manual === 0" filled dark type="number" v-model.number="item.t3Entry.value"
            label="Value" @update:model-value="T3UpdateEntryField('value', item)" :suffix="unitText" />
          <!-- Display field -->
          <q-select filled dark v-model="item.settings.t3EntryDisplayField" :options="t3EntryDisplayFieldOptions"
            label="Display field" emit-value map-options
            @update:model-value="DisplayFieldValueChanged(item.settings.t3EntryDisplayField)" />

        </div>
        <!-- </q-expansion-item> -->
      </div>

      <q-expansion-item class="mb-2 border border-solid border-gray-700" dark default-opened label="General">
        <div class="p-1">
          <div class="grid gap-4 grid-cols-2 mb-4">

            <q-input input-style="width: 100%" @update:model-value="refreshX" label="X"
              v-model.number="item.translate[0]" dark filled type="number" />

            <q-input input-style="width: 100%" @update:model-value="refreshY" label="Y"
              v-model.number="item.translate[1]" dark filled type="number" />

            <q-input input-style="width: 100%" @update:model-value="refreshWidth" label="Width"
              v-model.number="item.width" dark filled type="number" />

            <q-input input-style="width: 100%" @update:model-value="refreshHeight" label="Height"
              v-model.number="item.height" dark filled type="number" />

            <q-input input-style="width: 100%" @update:model-value="refreshRotate" label="Rotate"
              v-model.number="item.rotate" dark filled type="number" />

            <q-input input-style="width: 100%" label="Font size" v-model.number="item.settings.fontSize" dark filled
              type="number" />
          </div>
          <div class="w-full relative mb-2">
            <q-input dark filled v-model="item.settings.title" label="Title" />
            <input type="color" class="absolute top-2 right-2" v-model="item.settings.titleColor" />
          </div>
          <div class="flex flex-nowrap items-center mb-2">
            <input type="color" id="bg-color-input" v-model="item.settings.bgColor" />
            <label class="ml-2" for="bg-color-input">
              {{
                settings.bgColor?.label || "Background color"
              }}
            </label>
          </div>
          <template v-for="(setting, key) in settings" :key="key">
            <template v-if="!['bgColor', 'title', 'titleColor'].includes(key)">
              <div class="flex flex-nowrap justify-center items-center mb-2" v-if="setting.type === 'justifyContent'">
                <div class="mx-1">Align</div>
                <q-btn-group push>
                  <q-btn push icon="format_align_left" :color="item.settings[key] === 'flex-start' ? 'grey-9' : null
                    " text-color="grey-5" @click="item.settings[key] = 'flex-start'" />
                  <q-btn push icon="format_align_center" :color="item.settings[key] === 'center' ? 'grey-9' : null"
                    text-color="grey-5" @click="item.settings[key] = 'center'" />
                  <q-btn push icon="format_align_right" :color="item.settings[key] === 'flex-end' ? 'grey-9' : null"
                    text-color="grey-5" @click="item.settings[key] = 'flex-end'" />
                </q-btn-group>
              </div>
              <div class="flex flex-nowrap justify-center items-center mb-2" v-else-if="setting.type === 'textAlign'">
                <div class="mx-1">Align</div>
                <q-btn-group push>
                  <q-btn push icon="format_align_left" :color="item.settings[key] === 'left' ? 'grey-9' : null"
                    text-color="grey-5" @click="item.settings[key] = 'left'" />
                  <q-btn push icon="format_align_center" :color="item.settings[key] === 'center' ? 'grey-9' : null"
                    text-color="grey-5" @click="item.settings[key] = 'center'" />
                  <q-btn push icon="format_align_right" :color="item.settings[key] === 'right' ? 'grey-9' : null"
                    text-color="grey-5" @click="item.settings[key] = 'right'" />
                </q-btn-group>
              </div>
              <div class="flex flex-nowrap items-center mb-2" v-else-if="setting.type === 'color'">
                <input type="color" id="text-color-input" v-model="item.settings[key]" />
                <label class="ml-2" for="text-color-input">
                  {{
                    setting.label
                  }}
                </label>
              </div>
              <div class="w-full relative mb-2" v-else-if="setting.type === 'text'">
                <q-input autogrow autofocus dark filled v-model="item.settings[key]" :label="setting.label" />
              </div>
              <div class="w-full relative mb-2" v-else-if="setting.type === 'number'">
                <q-input class="mb-1" filled dark type="number" v-model.number="item.settings[key]"
                  :label="setting.label" @update:model-value="updatePropsValue(key)" />
              </div>
              <div class="w-full mb-2" v-else-if="setting.type === 'icon'">
                <q-select filled dark v-model="item.settings[key]" :options="icons" :label="setting.label" emit-value
                  map-options>
                  <template v-slot:prepend>
                    <q-icon :name="item.settings[key] || 'block'" />
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar class="pr-1 min-w-0">
                        <q-icon :name="scope.opt.value || 'block'" />
                      </q-item-section>
                      <q-item-section class="grow">
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
              <div class="w-full mb-2" v-else-if="setting.type === 'iconSwitch'">
                <q-select filled dark v-model="item.settings[key]" :options="switchIcons" :label="setting.label"
                  emit-value map-options>
                  <template v-slot:prepend>
                    <q-icon :name="getSwitchIcon(item.settings[key])" />
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar class="pr-1 min-w-0">
                        <q-icon :name="scope.opt.icon.off || 'block'" />
                      </q-item-section>
                      <q-item-section class="grow">
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
              <q-checkbox v-else-if="setting.type === 'boolean'" dark filled v-model="item.settings[key]"
                class="text-white w-full" :label="setting.label" :disable="(key === 'active' &&
                  ((item.t3Entry && item.t3Entry.auto_manual === 0) ||
                    (item.t3Entry && item.t3Entry.digital_analog === 1))) ||
                  (item.t3Entry && item.t3Entry.decom !== undefined)
                  ">
                <q-tooltip v-if="key === 'active' && item.t3Entry?.auto_manual === 0" anchor="center left"
                  self="center end">
                  Manual changes are not possible as the linked entry is set to
                  auto mode.
                </q-tooltip>
              </q-checkbox>
            </template>
          </template>
        </div>
      </q-expansion-item>

    </div>
  </div>
  <!-- </a-drawer> -->
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUpdated, ref, computed, watch } from 'vue';
import { Drawer as ADrawer, Radio as ARadio, RadioGroup as ARadioGroup, Button as AButton } from 'ant-design-vue';
import T3Util from 'src/lib/T3000/Hvac/Util/T3Util';
import { objectConfigShow } from "src/lib/T3000/Hvac/Data/Constant/RefConstant";
import { isEqual, cloneDeep } from 'lodash';
import { tools, switchIcons } from "src/lib/common";
import T3000 from 'src/lib/T3000/T3000';
import IdxUtils from 'src/lib/T3000/Hvac/Opt/Common/IdxUtils';
import RulerUtil from 'src/lib/T3000/Hvac/Opt/UI/RulerUtil';
import EvtOpt from 'src/lib/T3000/Hvac/Event/EvtOpt';
import T3Gv from 'src/lib/T3000/Hvac/Data/T3Gv';
import DrawUtil from 'src/lib/T3000/Hvac/Opt/Opt/DrawUtil';
import SvgUtil from 'src/lib/T3000/Hvac/Opt/Opt/SvgUtil';
import { appStateV2 } from 'src/lib/T3000/Hvac/Data/T3Data';

type PlacementType = 'top' | 'right' | 'bottom' | 'left';

const placement = ref<PlacementType>('right');

const emit = defineEmits([
  "RefreshSelectedItem",
  "T3UpdateEntryField",
  "linkT3Entry",
  "gaugeSettings",
  "mounted",
  "noChange",
  "update:object",
  "DisplayFieldValueChanged"
]);

// Define interfaces for type safety
interface ItemSettings {
  fontSize: number;
  // title: string;
  titleColor: string;
  bgColor: string;
  fillColor: string;
  justifyContent: string;
  // textAlign: string;
  textColor: string;
  t3EntryDisplayField: string;
  label?: string;
  [key: string]: any; // For additional dynamic settings
}

interface Item {
  type: string;
  translate: [number, number];
  width: number;
  height: number;
  rotate: number;
  settings: ItemSettings;
  t3Entry?: any; // Optional t3Entry property
  [key: string]: any; // For additional dynamic properties
}

interface ObjectConfigProps {
  initialItem?: Item;
  object: any;
  current: any;
}

const props = defineProps<ObjectConfigProps>();

// Object data
let initialObject = ref<Item>(cloneDeep(props.current/*||  defaultItem*/));

console.log("fffff", initialObject);

// Computed properties
const item = computed({
  get() {
    // return initialObject.value;
    return props.current;
  },
  set(newValue) {
    const oldValue = props.current;
    if (newValue === oldValue) return;
    emit("update:object", newValue);
  },
});
console.log("aaaaa", item.value);
const settings = computed(() => {
  return tools.find((i) => i.name === item.value.type)?.settings || {};
});

const rangeOptions = computed(() => {
  const items = IdxUtils.getEntryRange(item.value.t3Entry)?.options?.filter(
    (i) => i.status === 1
  );
  const ranges = cloneDeep(items);
  return ranges?.map((ii) => {
    ii.value = ii.value;
    return ii;
  });
});

const unitText = computed(() => {
  return ` ${IdxUtils.getUnitText(item.value.t3Entry)}`;
});

const t3EntryDisplayFieldOptions = computed(() => {
  const options = [
    { label: "None", value: "none" },
    { label: "ID", value: "id" },
  ];

  if (item.value.t3Entry?.label !== undefined) {
    options.push({ label: "Label", value: "label" });
  }

  if (item.value.t3Entry?.description !== undefined) {
    options.push({ label: "Description", value: "description" });
  }

  if (item.value.t3Entry?.value !== undefined) {
    options.push({
      label: "Value",
      value: item.value.t3Entry?.digital_analog === 1 ? "value" : "control",
    });
  }

  return options;
});

// Functions
const showDrawer = (): void => {
  objectConfigShow.value = true;
};

const onClose = (): void => {
  objectConfigShow.value = false;
};

// Function to refresh x,y, width, height, and rotate values of selected item
function RefreshSelectedItem() {

  T3Util.Log("= V.OCN", "RefreshSelectedItem", item.value);
  T3Util.LogDev("= V.OCN", true, "RefreshSelectedItem", item.value);

  var posX = item.value.translate[0];
  var posY = item.value.translate[1];
  var posWidth = item.value.width;
  var posHeight = item.value.height;
  var rotate = item.value.rotate;

  T3Util.LogDev("= V.OCN Update item posXposYposWidthposHeight", true, `xVal=${posX}`, `yVal=${posY}`, `wVal=${posWidth}`, `hVal=${posHeight}`);

  const xLength = RulerUtil.GetLengthInRulerUnits(posX, false, T3Gv.docUtil.rulerConfig.originx, 0);
  const yLength = RulerUtil.GetLengthInRulerUnits(posY, false, T3Gv.docUtil.rulerConfig.originy, 0);
  const width = RulerUtil.GetLengthInRulerUnits(posWidth, false, null, 0);
  const height = RulerUtil.GetLengthInRulerUnits(posHeight, false, null, 0);

  T3Util.LogDev("= V.OCN Update item position", true, `xVal=${xLength}`, `yVal=${yLength}`, `wVal=${width}`, `hVal=${height}`);

  T3Gv.refreshPosition = false;
  EvtOpt.toolOpt.SetX(xLength.toString());
  EvtOpt.toolOpt.SetY(yLength.toString());
  EvtOpt.toolOpt.SetWidth(width.toString());
  EvtOpt.toolOpt.SetHeight(height.toString());

  EvtOpt.toolOpt.RotateAct(null, rotate);
}

function refreshX(){
  var posX = item.value.translate[0];
  const xLength = RulerUtil.GetLengthInRulerUnits(posX, false, T3Gv.docUtil.rulerConfig.originx, 0);
  T3Gv.refreshPosition = false;
  EvtOpt.toolOpt.SetX(xLength.toString());
}

function refreshY(){
  var posY = item.value.translate[1];
  const yLength = RulerUtil.GetLengthInRulerUnits(posY, false, T3Gv.docUtil.rulerConfig.originy, 0);
  T3Gv.refreshPosition = false;
  EvtOpt.toolOpt.SetY(yLength.toString());
}

function refreshWidth(){
  var posWidth = item.value.width;
  const width = RulerUtil.GetLengthInRulerUnits(posWidth, false, null, 0);
  T3Gv.refreshPosition = false;
  EvtOpt.toolOpt.SetWidth(width.toString());
}

function refreshHeight(){
  var posHeight = item.value.height;
  const height = RulerUtil.GetLengthInRulerUnits(posHeight, false, null, 0);
  T3Gv.refreshPosition = false;
  EvtOpt.toolOpt.SetHeight(height.toString());
}

function refreshRotate(){
  var rotate = item.value.rotate;
  T3Gv.refreshPosition = false;
  EvtOpt.toolOpt.RotateAct(null, rotate);
}

function T3UpdateEntryField(key, obj) {
  emit("T3UpdateEntryField", key, obj);
}

function linkT3Entry() {
  T3Util.LogDev("LINKE-T3-ENTRY", true);
  emit("linkT3Entry");
}

function gaugeSettings(obj) {
  emit("gaugeSettings", obj);
}

function getSwitchIcon(name) {
  const iconItem = switchIcons.find((item) => item.value === name);
  return iconItem?.icon?.off ? iconItem.icon.off : "block";
}

function updatePropsValue(key) {
  if (item.value.type === "Int_Ext_Wall") {
    item.value.height = T3000.Hvac.PageMain.GetExteriorWallHeight(item.value.settings.strokeWidth);
    emit("RefreshSelectedItem");
  }
}

function DisplayFieldValueChanged(value) {
  emit("DisplayFieldValueChanged", value);

  T3Util.LogDev("= P.OCN", true, "display field value changed", value, appStateV2.value);
  SvgUtil.RenderAllSVGObjects();
  T3Util.LogDev("= P.OCN", true, "display field value changed", value);
}

function getEntryRange(entry) {
  return IdxUtils.getEntryRange(entry);
}

onMounted(() => {
  T3Util.LogDev("= V.OCN", true, "ObjectConfigNew mounted", props.current);

  /*
  var selectedItem = DrawUtil.GetSelectObjectCoords();
  initialObject.value.translate[0] = selectedItem.x;
  initialObject.value.translate[1] = selectedItem.y;
  initialObject.value.width = selectedItem.width;
  initialObject.value.height = selectedItem.height;
  */

  // Add action to history for undo/redo
  // emit("mounted");
});

onBeforeUnmount(() => {
  if (isEqual(props.object, initialObject.value)) {
    emit("noChange");
  }
  T3Util.Log("= V.OCN", "ObjectConfigNew is about to unmount");
});

onUpdated(() => {
  T3Util.Log("= V.OCN", "ObjectConfigNew updated");
});

</script>

<style scoped>
.item-config {
  background-color: #2a2a2a;
  align-self: stretch;
  overflow-y: hidden;
  max-height: 100vh;
  width: 250px;
  padding: 10px;
  padding-top: 0;
  position: absolute;
  right: 0;
  top: 37px;
  height: calc(100% - 37px);
  color: #ffffff99;
}

.item-config-inner {
  overflow-y: auto;
  max-height: calc(100vh - 45px);
  scrollbar-width: thin;
}

.item-config-inner::-webkit-scrollbar {
  display: none;
}
</style>
