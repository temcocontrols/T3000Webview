<!--
  This component is a custom cell editor for ag-Grid, utilizing the Quasar `q-select` component to allow users to edit
  cell values with a dropdown select interface.
-->
<template>
  <div>
    <div class="object-title" v-if="item.settings.title" @click.stop="$emit('objectClicked')">
      {{ item.settings.title }}
    </div>
    <div class="object-title" v-else-if="item.t3Entry && item.settings.t3EntryDisplayField !== 'none'">
      <div class="relative">
        <q-btn v-if="
          showArrows &&
          item.type !== 'Switch' &&
          ['value', 'control'].includes(item.settings.t3EntryDisplayField)" class="up-btn absolute" size="sm"
          icon="keyboard_arrow_up" color="grey-4" text-color="black" dense :disable="item.t3Entry?.auto_manual === 0"
          @click="changeValue('increase')" />


        <!-- <div>
          <span @click="$emit('objectClicked')">{{
            dispalyText || item.t3Entry.id
          }}</span>

          <span v-if="item.t3Entry.auto_manual !== undefined" class="mode-icon ml-2 text-lg" @click="autoManualToggle">
            <q-icon v-if="!item.t3Entry.auto_manual">
              <q-tooltip anchor="top middle" self="center middle">
                In auto mode
              </q-tooltip>
            </q-icon>
            <q-icon v-else name="lock" style="font-size: xx-large;color:#659dc5">
              <q-tooltip anchor="top middle" self="center middle">
                In manual mode
              </q-tooltip>
            </q-icon>
          </span>
        </div> -->


        <div>
          <span @click="$emit('objectClicked')">{{
            dispalyText || item.t3Entry.id
          }}</span>

          <span v-if="item.t3Entry.auto_manual !== undefined" class="mode-icon ml-2 text-lg" @click="autoManualToggle">
            <a-tooltip title="In auto mode" v-if="!item.t3Entry.auto_manual">
              <LockOutlined />
            </a-tooltip>
            <a-tooltip title="In manual mode" v-else>
              <UnlockOutlined />
            </a-tooltip>


            <!-- <a-tooltip title="In auto mode" placement="top" v-if="!item.t3Entry.auto_manual">
              <UnlockOutlined />
            </a-tooltip>
            <a-tooltip title="In manual mode" placement="top" v-else>
              <LockOutlined style="font-size: xx-large; color: #659dc5;" />
            </a-tooltip> -->
          </span>
        </div>

        <q-btn v-if="
          showArrows &&
          item.type !== 'Switch' &&
          ['value', 'control'].includes(item.settings.t3EntryDisplayField)" class="down-btn absolute" size="sm"
          icon="keyboard_arrow_down" color="grey-4" text-color="black" dense :disable="item.t3Entry?.auto_manual === 0"
          @click="changeValue('decrease')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import IdxUtils from "src/lib/T3000/Hvac/Opt/Common/IdxUtils";
import Utils2 from "src/lib/T3000/Hvac/Util/Utils2";
import { LockOutlined, UnlockOutlined } from '@ant-design/icons-vue';
import { Tooltip as ATooltip } from 'ant-design-vue';
import { Button as AButton } from 'ant-design-vue';
import IdxPage2 from "src/lib/T3000/Hvac/Opt/Common/IdxPage2";
import DataOpt from "src/lib/T3000/Hvac/Opt/Data/DataOpt";
import T3Util from "src/lib/T3000/Hvac/Util/T3Util";

interface T3Entry {
  id?: string;
  auto_manual?: number;
  description?: string;
  label?: string;
  value?: number;
  range?: number;
  control?: boolean;
  digital_analog?: number;
  [key: string]: any;
}

interface ColorSettings {
  offset: number;
  color: string;
}

interface ItemSettings {
  title?: string;
  bgColor?: string;
  titleColor?: string;
  textColor?: string;
  fontSize?: number;
  justifyContent?: string;
  t3EntryDisplayField?: string;
  colors?: ColorSettings[];
}

interface Item {
  type: string;
  t3Entry?: T3Entry;
  settings: ItemSettings;
}

interface Props {
  item: Item;
  showArrows?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showArrows: false
});

const emit = defineEmits<{
  (e: 'autoManualToggle1'): void;
  (e: 'objectClicked'): void;
  (e: 'changeValue', item: Item, newVal: number, control: boolean): void;
  (e: 'updateWeldModel', weldModel: unknown, itemList: unknown[]): void;
}>();

T3Util.Log('= Object Type 3', props.item);

const range = computed(() => {
  return IdxUtils.getEntryRange(props.item?.t3Entry);
});

const dispalyText = computed(() => {
  if (!props.item.t3Entry) {
    return "";
  }

  const range = IdxUtils.getEntryRange(props.item.t3Entry);
  T3Util.Log('= Ot range,t3e', range, props.item.t3Entry);

  if (props.item.settings.t3EntryDisplayField === "description") {
    const description = props.item.t3Entry.description || "";
    const value = props.item.t3Entry.value || "";
    let valueText = "";

    if (props.item.t3Entry.range > 100) {
      const rangeValue = range.options?.find(
        (item) => item.value === props.item.t3Entry.value
      )
      valueText = rangeValue?.name || "";
    }
    else if (props.item.t3Entry.digital_analog === 1) {
      valueText = (value || "") + " " + (range?.unit || "");
    } else if (props.item.t3Entry.digital_analog === 0) {
      if (props.item.t3Entry.control) {
        valueText = range?.on || "";
      } else {
        valueText = range?.off || "";
      }
    }

    return description + " " + valueText;
  }

  if (props.item.settings.t3EntryDisplayField === "label") {
    const description = props.item.t3Entry.label || "";
    const value = props.item.t3Entry.value || "";
    let valueText = "";

    if (props.item.t3Entry.range > 100) {
      const rangeValue = range.options?.find(
        (item) => item.value === props.item.t3Entry.value
      )
      valueText = rangeValue?.name || "";
    }
    else if (props.item.t3Entry.digital_analog === 1) {
      valueText = (value || "") + " " + (range?.unit || "");
    } else if (props.item.t3Entry.digital_analog === 0) {
      if (props.item.t3Entry.control) {
        valueText = range?.on || "";
      } else {
        valueText = range?.off || "";
      }
    }

    return description + " " + valueText;
  }

  if (props.item.settings.t3EntryDisplayField === "value" || props.item.settings.t3EntryDisplayField === "control") {
    if (props.item.t3Entry.value !== undefined && props.item.t3Entry.range > 100) {
      const rangeValue = range.options?.find(
        (item) => item.value === props.item.t3Entry.value
      );
      return rangeValue?.name;
    } else if (props.item.t3Entry.value !== undefined && props.item.t3Entry.digital_analog === 1) {
      return props.item.t3Entry.value + " " + range.unit;
    } else if (props.item.t3Entry.control !== undefined && props.item.t3Entry.digital_analog === 0) {
      if (props.item.t3Entry.control) {
        return range.on;
      } else {
        return range.off;
      }
    }
  }

  const field = props.item.settings.t3EntryDisplayField as keyof T3Entry;
  return props.item.t3Entry[field] || "";
});

const processedColors = computed(() => {
  const item = props.item;
  if (!["Gauge", "Dial"].includes(item.type)) {
    return null;
  }

  if (!item.settings.colors) {
    return null;
  }

  return item.type === "Gauge"
    ? item.settings.colors.map((i) => [i.offset / 100, i.color])
    : item.settings.colors.map((i, index) => {
      return {
        from: index ? item.settings.colors![index - 1].offset : 0,
        to: i.offset,
        color: [i.color],
      };
    });
});

function changeValue(type: string): void {
  if (!props.item.t3Entry || props.item.t3Entry.auto_manual === 0) return;

  let control = false;
  let newVal = props.item.t3Entry.value || 0;
  const range = IdxUtils.getEntryRange(props.item?.t3Entry);

  if (
    props.item.t3Entry.value !== undefined &&
    props.item.t3Entry.range > 100
  ) {
    const rangeOptions = range.options?.filter((item) => item.status === 1);
    if (!rangeOptions) return;

    const rangeIndex = rangeOptions.findIndex(
      (item) => item.value === props.item.t3Entry!.value
    );

    if (type === "decrease" && rangeIndex < rangeOptions.length - 1) {
      newVal = rangeOptions[rangeIndex + 1].value;
    } else if (type === "increase" && rangeIndex > 0) {
      newVal = rangeOptions[rangeIndex - 1].value;
    } else {
      return;
    }
  } else if (
    props.item.t3Entry.value !== undefined &&
    props.item.t3Entry.digital_analog === 1
  ) {
    if (type === "increase") {
      newVal = props.item.t3Entry.value + 1;
    } else {
      newVal = props.item.t3Entry.value - 1;
    }
  } else if (
    props.item.t3Entry.control !== undefined &&
    props.item.t3Entry.digital_analog === 0
  ) {
    control = true;
    if (type === "decrease" && props.item.t3Entry.control === 0) {
      newVal = 1;
    } else if (type === "increase" && props.item.t3Entry.control === 1) {
      newVal = 0;
    } else {
      return;
    }
  }

  emit("changeValue", props.item, newVal, control);
}

const objectRef = ref<{ refresh: () => void } | null>(null);

function refresh(): void {
  if (!objectRef.value) return;
  if (props.item?.type === "Duct") {
    objectRef.value.refresh();
  }
}

function updateWeldModel(weldModel: unknown, itemList: unknown[]): void {
  emit("updateWeldModel", weldModel, itemList);
}

function autoManualToggle(event: Event): void {
  Utils2.StopPropagationAndDefaults(event);
  IdxPage2.autoManualToggle(props.item);
  DataOpt.SaveToLocalStorage();
}

</script>

<style scoped>
.object-title {
  /* text-align: center; */
  min-width: 100%;
  white-space: nowrap;
  line-height: 2.5em;
  color: v-bind("item.settings.titleColor");
}

.with-bg .object-title {
  background-color: rgb(255 255 255 / 40%);
}

.moveable-item {
  height: 100%;
  border-radius: 5px;
  background-color: v-bind("item.settings.bgColor");
  color: v-bind("item.settings.textColor");
  font-size: v-bind("item.settings.fontSize + 'px'");
}

.moveable-item.Duct {
  background-color: transparent;
}
</style>
