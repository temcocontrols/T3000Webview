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
          <template v-for="(setting, key) in settings" :key="key">
            <template
              v-if="
                !['Dial', 'Gauge'].includes(item.type) &&
                !['bgColor', 'title', 'titleColor'].includes(key)
              "
            >
              <div
                class="flex flex-nowrap justify-center items-center mb-2"
                v-if="setting.type === 'justifyContent'"
              >
                <div class="mx-1">Align</div>
                <q-btn-group push>
                  <q-btn
                    push
                    icon="format_align_left"
                    :color="
                      item.settings[key] === 'flex-start' ? 'grey-9' : null
                    "
                    text-color="grey-5"
                    @click="item.settings[key] = 'flex-start'"
                  />
                  <q-btn
                    push
                    icon="format_align_center"
                    :color="item.settings[key] === 'center' ? 'grey-9' : null"
                    text-color="grey-5"
                    @click="item.settings[key] = 'center'"
                  />
                  <q-btn
                    push
                    icon="format_align_right"
                    :color="item.settings[key] === 'flex-end' ? 'grey-9' : null"
                    text-color="grey-5"
                    @click="item.settings[key] = 'flex-end'"
                  />
                </q-btn-group>
              </div>
              <div
                class="flex flex-nowrap justify-center items-center mb-2"
                v-else-if="setting.type === 'textAlign'"
              >
                <div class="mx-1">Align</div>
                <q-btn-group push>
                  <q-btn
                    push
                    icon="format_align_left"
                    :color="item.settings[key] === 'left' ? 'grey-9' : null"
                    text-color="grey-5"
                    @click="item.settings[key] = 'left'"
                  />
                  <q-btn
                    push
                    icon="format_align_center"
                    :color="item.settings[key] === 'center' ? 'grey-9' : null"
                    text-color="grey-5"
                    @click="item.settings[key] = 'center'"
                  />
                  <q-btn
                    push
                    icon="format_align_right"
                    :color="item.settings[key] === 'right' ? 'grey-9' : null"
                    text-color="grey-5"
                    @click="item.settings[key] = 'right'"
                  />
                </q-btn-group>
              </div>
              <div
                class="flex flex-nowrap items-center mb-2"
                v-else-if="setting.type === 'color'"
              >
                <input
                  type="color"
                  id="text-color-input"
                  v-model="item.settings[key]"
                />
                <label class="ml-2" for="text-color-input">{{
                  setting.label
                }}</label>
              </div>
              <div
                class="w-full relative mb-2"
                v-else-if="setting.type === 'text'"
              >
                <q-input
                  autogrow
                  autofocus
                  dark
                  filled
                  v-model="item.settings[key]"
                  :label="setting.label"
                />
              </div>
              <div class="w-full mb-2" v-else-if="setting.type === 'icon'">
                <q-select
                  filled
                  dark
                  v-model="item.settings[key]"
                  :options="icons"
                  :label="setting.label"
                  emit-value
                  map-options
                >
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
              <q-checkbox
                v-else-if="setting.type === 'boolean'"
                dark
                filled
                v-model="item.settings[key]"
                class="text-white w-full"
                :label="setting.label"
                :disable="
                  key === 'active' &&
                  ((item.t3Entry && item.t3Entry?.auto_manual === 0) ||
                    item.t3Entry?.digital_analog === 1)
                "
              >
                <q-tooltip
                  v-if="key === 'active' && item.t3Entry?.auto_manual === 0"
                  anchor="center left"
                  self="center end"
                >
                  Manual changes are not possible as the linked entry is set to
                  auto mode.
                </q-tooltip>
              </q-checkbox>
            </template>
          </template>
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
              v-if="item.t3Entry.auto_manual !== undefined"
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
import { defineComponent, computed, onMounted, onBeforeUnmount } from "vue";
import { cloneDeep, isEqual } from "lodash";
import { ranges, icons, tools } from "../lib/common";
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
    function getRangeById(id) {
      return ranges.find((i) => i.id === id);
    }

    function refreshSelecto() {
      emit("refreshSelecto");
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
    return {
      item,
      refreshSelecto,
      T3UpdateEntryField,
      linkT3Entry,
      t3EntryDisplayFieldOptions,
      gaugeSettings,
      getRangeById,
      icons,
      settings,
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
