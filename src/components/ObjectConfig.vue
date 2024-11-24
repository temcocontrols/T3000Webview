<!--
  Component: ObjectConfig

  This component is responsible for configuring a HVAC object. It allows the user to modify various settings of the object,
  such as its type, settings, and T3 entry. The component provides a form with input fields and selectors for different settings.
  It also handles the updating of the object's properties when the user makes changes.

  Props:
    - object: The object to be configured.
    - tools: An array of tools available for configuring the object.
    - noChange: A flag indicating whether the object's properties should be updated when the user makes changes.

  Emits:
    - refreshMoveable: Emitted when the moveable refreshes.
    - T3UpdateEntryField: Emitted when the T3 entry field is updated. The updated entry field is passed as the event payload.
    - linkT3Entry: Emitted when the T3 entry is linked. The linked entry is passed as the event payload.
    - gaugeSettings: Emitted when the gauge settings are updated. The updated gauge settings are passed as the event payload.
    - mounted: Emitted when the component is mounted.
    - noChange: Emitted when the object's properties should not be updated when the user makes changes.
-->
<template>
  <div class="item-config flex flex-nowrap column" v-if="item">
    <h3 class="leading-8 font-bold text-white">{{ item.type }}</h3>
    <div class="item-config-inner">
      <q-expansion-item class="mb-2 border border-solid border-gray-700" dark default-opened label="General">
        <div class="p-1">
          <div class="grid gap-4 grid-cols-2 mb-4">
            <q-input input-style="width: 100%" @update:model-value="refreshMoveable" label="X"
              v-model.number="item.translate[0]" dark filled type="number" />
            <q-input input-style="width: 100%" @update:model-value="refreshMoveable" label="Y"
              v-model.number="item.translate[1]" dark filled type="number" />

            <q-input input-style="width: 100%" @update:model-value="refreshMoveable" label="Width"
              v-model.number="item.width" dark filled type="number" />
            <q-input input-style="width: 100%" @update:model-value="refreshMoveable" label="Height"
              v-model.number="item.height" dark filled type="number" />
            <q-input input-style="width: 100%" @update:model-value="refreshMoveable" label="Rotate"
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
            <label class="ml-2" for="bg-color-input">{{
              settings.bgColor?.label || "Background color"
              }}</label>
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
                <label class="ml-2" for="text-color-input">{{
                  setting.label
                  }}</label>
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

      <div>
        <q-btn v-if="['Gauge', 'Dial'].includes(item.type)" dark outline no-caps stretch icon="settings"
          class="text-white w-full mb-2" label="Settings" @click="gaugeSettings(item)" />
        <q-btn dark outline no-caps stretch :icon="item.t3Entry ? 'dataset_linked' : undefined"
          class="text-white w-full link-t3-entry" :label="!item.t3Entry
            ? 'Link with an entry'
            : `Linked with ${item.t3Entry.description}`
            " @click="linkT3Entry" />
        <q-expansion-item v-if="item.t3Entry" class="mt-2 border border-solid border-gray-700" dark default-opened
          label="Entry settings">
          <div class="p-1">
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
            <q-select class="mb-1" v-if="item.t3Entry.range > 100" :disable="item.t3Entry?.auto_manual === 0" filled
              dark v-model="item.t3Entry.value" :options="rangeOptions" label="Value" emit-value map-options
              option-label="name" @update:model-value="T3UpdateEntryField('value', item)" />
            <!-- Program status -->
            <q-select class="mb-1" v-else-if="item.t3Entry.type === 'PROGRAM'"
              :disable="item.t3Entry?.auto_manual === 0" filled dark v-model="item.t3Entry.status" :options="[
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
            <q-select class="mb-1" v-else-if="item.t3Entry.type === 'SCHEDULE'"
              :disable="item.t3Entry?.auto_manual === 0" filled dark v-model="item.t3Entry.output" :options="[
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
            <q-select class="mb-1" v-else-if="item.t3Entry.type === 'HOLIDAY'"
              :disable="item.t3Entry?.auto_manual === 0" filled dark v-model="item.t3Entry.value" :options="[
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
            <q-input class="mb-1" v-if="
              item.t3Entry.range < 101 && item.t3Entry.digital_analog === 1
            " :disable="item.t3Entry?.auto_manual === 0" filled dark type="number" v-model.number="item.t3Entry.value"
              label="Value" @update:model-value="T3UpdateEntryField('value', item)" />
            <!-- Display field -->
            <q-select filled dark v-model="item.settings.t3EntryDisplayField" :options="t3EntryDisplayFieldOptions"
              label="Display field" emit-value map-options />
          </div>
        </q-expansion-item>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed, onMounted, onBeforeUnmount } from "vue";
import { cloneDeep, isEqual } from "lodash";
import { getEntryRange, icons, switchIcons, tools } from "../lib/common";
import T3000 from "src/lib/T3000/T3000";

export default defineComponent({
  name: "ToolConfig",
  props: {
    object: {
      type: Object,
      required: true,
    },
  },
  emits: [
    "refreshMoveable",
    "T3UpdateEntryField",
    "linkT3Entry",
    "gaugeSettings",
    "mounted",
    "noChange",
  ],
  setup(props, { emit }) {
    let initialObject = {};
    onMounted(() => {
      initialObject = cloneDeep(props.object);
      emit("mounted");
    });
    const item = computed({
      get() {
        return props.object;
      },
      // setter
      set(newValue, oldValue) {
        if (newValue === oldValue) return;
        emit("update:object", newValue);
      },
    });

    const settings = computed(() => {
      return tools.find((i) => i.name === props.object.type)?.settings || {};
    });
    const rangeOptions = computed(() => {
      const items = getEntryRange(props.object.t3Entry)?.options?.filter(
        (i) => i.status === 1
      );
      const ranges = cloneDeep(items);
      return ranges?.map((ii) => {
        ii.value = ii.value * 1000;
        return ii;
      });
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

    function refreshMoveable() {
      if (item.value.type === "Int_Ext_Wall") {
        item.value.settings.strokeWidth = T3000.Hvac.App.GetExteriorWallStrokeWidth(item.value.height);
      }

      emit("refreshMoveable");
    }
    function T3UpdateEntryField(key, obj) {
      emit("T3UpdateEntryField", key, obj);
    }
    function linkT3Entry() {
      emit("linkT3Entry");
    }
    function gaugeSettings(item) {
      emit("gaugeSettings", item);
    }
    onBeforeUnmount(() => {
      if (isEqual(props.object, initialObject)) {
        emit("noChange");
      }
    });
    function getSwitchIcon(name) {
      const iconItem = switchIcons.find((item) => item.value === name);
      return iconItem?.icon?.off ? iconItem.icon.off : "block";
    }

    function updatePropsValue(key) {
      //T3000.Utils.Log("ObjectConfig=>", "updatePropsValue", "key=", key, "pros.object=", props.object, "item.value=", item.value);
      if (item.value.type === "Int_Ext_Wall") {
        item.value.height = T3000.Hvac.App.GetExteriorWallHeight(item.value.settings.strokeWidth);
        emit("refreshMoveable");
      }
    }

    return {
      item,
      refreshMoveable,
      T3UpdateEntryField,
      linkT3Entry,
      t3EntryDisplayFieldOptions,
      gaugeSettings,
      icons,
      switchIcons,
      settings,
      getEntryRange,
      getSwitchIcon,
      rangeOptions,
      updatePropsValue
    };
  },
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
