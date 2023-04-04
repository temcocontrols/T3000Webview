<template>
  <div class="item-config flex flex-nowrap column" v-if="item">
    <div class="item-config-inner">
      <q-expansion-item
        class="mb-2 border border-solid border-gray-700"
        dark
        default-opened
        label="General"
      >
        <div class="p-1">
          <div class="grid gap-4 grid-cols-2 mb-4">
            <q-input
              input-style="width: 100%"
              @update:model-value="refreshSelecto"
              label="X"
              v-model.number="item.translate[0]"
              dark
              filled
              type="number"
            />
            <q-input
              input-style="width: 100%"
              @update:model-value="refreshSelecto"
              label="Y"
              v-model.number="item.translate[1]"
              dark
              filled
              type="number"
            />

            <q-input
              input-style="width: 100%"
              @update:model-value="refreshSelecto"
              label="Width"
              v-model.number="item.width"
              dark
              filled
              type="number"
            />
            <q-input
              input-style="width: 100%"
              @update:model-value="refreshSelecto"
              label="Height"
              v-model.number="item.height"
              dark
              filled
              type="number"
            />
            <q-input
              input-style="width: 100%"
              @update:model-value="refreshSelecto"
              label="Rotate"
              v-model.number="item.rotate"
              dark
              filled
              type="number"
            />
            <q-input
              input-style="width: 100%"
              label="Font size"
              v-model.number="item.settings.fontSize"
              dark
              filled
              type="number"
            />
          </div>
          <div
            class="flex flex-nowrap items-center mb-2"
            v-if="item.settings.textColor !== undefined"
          >
            <input
              type="color"
              id="text-color-input"
              v-model="item.settings.textColor"
            />
            <label class="ml-2" for="text-color-input">Text Color</label>
          </div>
          <div class="w-full mb-2" v-if="item.settings.icon !== undefined">
            <q-select
              filled
              dark
              v-model="item.settings.icon"
              :options="icons"
              label="Icon"
              emit-value
              map-options
            >
              <template v-slot:prepend>
                <q-icon :name="item.settings.icon" />
              </template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar class="pr-1 min-w-0">
                    <q-icon :name="scope.opt.value" />
                  </q-item-section>
                  <q-item-section class="grow">
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <div
            class="flex flex-nowrap items-center mb-2"
            v-if="item.settings.offColor !== undefined"
          >
            <input
              type="color"
              id="off-color-input"
              v-model="item.settings.offColor"
            />
            <label class="ml-2" for="off-color-input">Off Color</label>
          </div>
          <div
            class="flex flex-nowrap items-center mb-2"
            v-if="item.settings.onColor !== undefined"
          >
            <input
              type="color"
              id="on-color-input"
              v-model="item.settings.onColor"
            />
            <label class="ml-2" for="on-color-input">On Color</label>
          </div>
          <div class="w-full relative mb-2">
            <q-input dark filled v-model="item.settings.title" label="Title" />
            <input
              type="color"
              class="absolute top-2 right-2"
              v-model="item.settings.titleColor"
            />
          </div>
          <div class="flex flex-nowrap items-center mb-2">
            <input
              type="color"
              id="bg-color-input"
              v-model="item.settings.bgColor"
            />
            <label class="ml-2" for="bg-color-input">Background Color</label>
          </div>
          <q-checkbox
            v-if="!item.t3Entry && item.settings.active !== undefined"
            dark
            filled
            v-model="item.settings.active"
            class="text-white w-full"
            label="Active"
            :disable="
              (item.t3Entry && item.t3Entry?.auto_manual === 0) ||
              item.t3Entry?.digital_analog === 1
            "
          >
            <q-tooltip
              v-if="item.t3Entry?.auto_manual === 0"
              anchor="center left"
              self="center end"
            >
              Can't activate it because the linked entry is in auto mode
            </q-tooltip></q-checkbox
          >
          <q-checkbox
            dark
            filled
            v-model="item.settings.inAlarm"
            class="text-white w-full"
            label="In alarm"
            v-if="item.settings.inAlarm !== undefined"
          />
        </div>
      </q-expansion-item>

      <div>
        <q-btn
          v-if="['Gauge', 'Dial'].includes(item.type)"
          dark
          outline
          no-caps
          stretch
          icon="settings"
          class="text-white w-full mb-2"
          label="Settings"
          @click="gaugeSettings(item)"
        />
        <q-btn
          dark
          outline
          no-caps
          stretch
          :icon="item.t3Entry ? 'dataset_linked' : undefined"
          class="text-white w-full"
          :label="
            !item.t3Entry
              ? 'Link with an entry'
              : `Linked with ${item.t3Entry.description}`
          "
          @click="linkT3Entry"
        />
        <q-expansion-item
          v-if="item.t3Entry"
          class="mt-2 border border-solid border-gray-700"
          dark
          default-opened
          label="Entry settings"
        >
          <div class="p-1">
            <q-select
              class="mb-1"
              filled
              dark
              v-model="item.t3Entry.auto_manual"
              :options="[
                { label: 'Auto', value: 0 },
                { label: 'Manual', value: 1 },
              ]"
              label="Auto/Manual"
              emit-value
              map-options
              @update:model-value="T3UpdateEntryField('auto_manual', item)"
            />
            <q-select
              class="mb-1"
              v-if="item.t3Entry.digital_analog === 0 && item.t3Entry.range"
              :disable="item.t3Entry?.auto_manual === 0"
              filled
              dark
              v-model="item.t3Entry.control"
              :options="[
                {
                  label: getRangeById(item.t3Entry.range).off,
                  value: 0,
                },
                {
                  label: getRangeById(item.t3Entry.range).on,
                  value: 1,
                },
              ]"
              label="Value"
              emit-value
              map-options
              @update:model-value="T3UpdateEntryField('control', item)"
            />
            <!-- Program status -->
            <q-select
              class="mb-1"
              v-if="item.t3Entry.type === 'PROGRAM'"
              :disable="item.t3Entry?.auto_manual === 0"
              filled
              dark
              v-model="item.t3Entry.status"
              :options="[
                {
                  label: 'OFF',
                  value: 0,
                },
                {
                  label: 'ON',
                  value: 1,
                },
              ]"
              label="Status"
              emit-value
              map-options
              @update:model-value="T3UpdateEntryField('status', item)"
            />
            <!-- Schedule output -->
            <q-select
              class="mb-1"
              v-else-if="item.t3Entry.type === 'SCHEDULE'"
              :disable="item.t3Entry?.auto_manual === 0"
              filled
              dark
              v-model="item.t3Entry.output"
              :options="[
                {
                  label: 'OFF',
                  value: 0,
                },
                {
                  label: 'ON',
                  value: 1,
                },
              ]"
              label="Output"
              emit-value
              map-options
              @update:model-value="T3UpdateEntryField('output', item)"
            />
            <!-- Holiday value -->
            <q-select
              class="mb-1"
              v-else-if="item.t3Entry.type === 'HOLIDAY'"
              :disable="item.t3Entry?.auto_manual === 0"
              filled
              dark
              v-model="item.t3Entry.value"
              :options="[
                {
                  label: 'OFF',
                  value: 0,
                },
                {
                  label: 'ON',
                  value: 1,
                },
              ]"
              label="Value"
              emit-value
              map-options
              @update:model-value="T3UpdateEntryField('value', item)"
            />
            <!-- Analog range value -->
            <q-input
              class="mb-1"
              v-if="item.t3Entry.digital_analog === 1"
              :disable="item.t3Entry?.auto_manual === 0"
              filled
              dark
              type="number"
              v-model.number="item.t3Entry.value"
              label="Value"
              @update:model-value="T3UpdateEntryField('value', item)"
            />
            <!-- Display field -->
            <q-select
              filled
              dark
              v-model="item.settings.t3EntryDisplayField"
              :options="t3EntryDisplayFieldOptions"
              label="Display field"
              emit-value
              map-options
            />
          </div>
        </q-expansion-item>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import { ranges, icons } from "../lib/common";
export default defineComponent({
  name: "ToolConfig",
  props: {
    object: {
      type: Object,
      required: true,
    },
  },
  emits: [
    "refreshSelecto",
    "T3UpdateEntryField",
    "linkT3Entry",
    "gaugeSettings",
  ],
  setup(props, { emit }) {
    const t3EntryDisplayFieldOptions = computed(() => {
      return [
        { label: "None", value: "none" },
        {
          label: "Value",
          value: item.value.t3Entry?.digital_analog === 1 ? "value" : "control",
        },
        { label: "Label", value: "label" },
        { label: "Description", value: "description" },
      ];
    });
    const item = computed({
      get() {
        return props.object;
      },
      // setter
      set(newValue) {
        if (!newValue) return;
        emit("update:object", newValue);
      },
    });
    function getRangeById(id) {
      return ranges.find((i) => i.id === id);
    }

    function refreshSelecto() {
      emit("refreshSelecto");
    }
    function T3UpdateEntryField(key, obj) {
      emit("T3UpdateEntryField", { key, obj });
    }
    function linkT3Entry() {
      emit("linkT3Entry");
    }
    function gaugeSettings(item) {
      emit("gaugeSettings", item);
    }
    return {
      item,
      refreshSelecto,
      T3UpdateEntryField,
      linkT3Entry,
      t3EntryDisplayFieldOptions,
      gaugeSettings,
      getRangeById,
      icons,
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
  padding-top: 34px;
  position: absolute;
  right: 0;
  top: 36px;
  height: calc(100% - 36px);
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