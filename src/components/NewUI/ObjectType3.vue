<!--
  This component is a custom cell editor for ag-Grid, utilizing the Quasar `q-select` component to allow users to edit
  cell values with a dropdown select interface.

  Props:
  - params: An object containing various parameters for the cell editor, this prop is atumatically passed from ag-Grid.

  Methods:
  - selectFilter: Filters the select options based on the user's input.
  - getValue: Returns the current value of the editor.
  - stopEditing: Stops the editing process and commits the value if it has changed.
  - setInitialState: Sets the initial state of the editor based on the key event that triggered the editor.

  Component Structure:
  - It handles different key events (Backspace, Delete, F2, and alphanumeric keys) to initialize the editor state and display the select dropdown.
  - The `q-select` component from Quasar is used to provide a searchable, filterable dropdown interface for selecting values.
  - The options for the select dropdown can be provided as a static array or a function.
  - The component manages the editing lifecycle by integrating with ag-Grid's API to stop editing when necessary.
-->
<template>
  <div class="moveable-item" :class="{
    'flex flex-col flex-nowrap': !['Dial', 'Gauge', 'Value'].includes(item.type),
    'overflow-hidden': item.type === 'Text',
    [item.type]: item.type,
    'with-bg': item.settings.bgColor,
    'with-title': item.settings.title || (item.t3Entry && item.settings.t3EntryDisplayField !== 'none'),
  }">
    <div class="object-title" :class="{ grow: ['Icon', 'Switch'].includes(item.type) }" v-if="item.settings.title"
      @click.stop="$emit('objectClicked')">
      {{ item.settings.title }}
    </div>
    <div class="object-title" :class="{ grow: ['Icon', 'Switch'].includes(item.type) }"
      v-else-if="item.t3Entry && item.settings.t3EntryDisplayField !== 'none'">
      <div class="relative">
        <q-btn v-if="
          showArrows &&
          item.type !== 'Switch' &&
          ['value', 'control'].includes(item.settings.t3EntryDisplayField)" class="up-btn absolute" size="sm"
          icon="keyboard_arrow_up" color="grey-4" text-color="black" dense :disable="item.t3Entry?.auto_manual === 0"
          @click="changeValue('increase')" />
        <div>
          <span @click="$emit('objectClicked')">{{
            dispalyText || item.t3Entry.id
            }}</span>

          <span v-if="item.t3Entry.auto_manual !== undefined" class="mode-icon ml-2 text-lg" @click="autoManualToggle">
            <!-- <q-icon v-if="!item.t3Entry.auto_manual" name="motion_photos_auto">
              <q-tooltip anchor="top middle" self="center middle">
                In auto mode
              </q-tooltip>
            </q-icon>
            <q-icon v-else name="swipe_up">
              <q-tooltip anchor="top middle" self="center middle">
                In manual mode
              </q-tooltip>
            </q-icon> -->
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

<script>
import { defineComponent, computed, ref } from "vue";
import IdxUtils from "src/lib/T3000/Hvac/Opt/Common/IdxUtils";
import { event } from "jquery";
import Utils2 from "src/lib/T3000/Hvac/Util/Utils2";
import IdxPage from "src/lib/T3000/Hvac/Opt/Common/IdxPage";
import Hvac from "src/lib/T3000/Hvac/Hvac";
import WebClient from "src/lib/T3000/Hvac/Opt/Socket/WebSocketClient";

export default defineComponent({
  name: "ObjectType3",
  components: {

  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    showArrows: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "autoManualToggle1",
    "objectClicked",
    "changeValue",
    "updateWeldModel",
  ],
  setup(props, { emit }) {

    console.log('= Object Type', props.item);

    const range = computed(() => {
      return IdxUtils.getEntryRange(props.item?.t3Entry);
    });

    const dispalyText = computed(() => {

      if (!props.item.t3Entry) {
        return "";
      }

      const range = IdxUtils.getEntryRange(props.item.t3Entry);
      console.log('= Ot range,t3e', range, props.item.t3Entry);

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
            // (item) => item.value * 1000 === props.item.t3Entry.value
            (item) => item.value === props.item.t3Entry.value
          );
          return rangeValue?.name;
        } else if (props.item.t3Entry.value !== undefined && props.item.t3Entry.digital_analog === 1) {
          // return props.item.t3Entry.value / 1000 + " " + range.unit;
          return props.item.t3Entry.value + " " + range.unit;
        } else if (props.item.t3Entry.control !== undefined && props.item.t3Entry.digital_analog === 0) {
          if (props.item.t3Entry.control) {
            return range.on;
          } else {
            return range.off;
          }
        }
      }

      return props.item.t3Entry[props.item.settings.t3EntryDisplayField] || "";
    })

    const processedColors = computed(() => {
      const item = props.item;
      if (!["Gauge", "Dial"].includes(item.type)) {
        return null;
      }
      return item.type === "Gauge"
        ? item.settings.colors.map((i) => [i.offset / 100, i.color])
        : item.settings.colors.map((i, index) => {
          return {
            from: index ? item.settings.colors[index - 1].offset : 0,
            to: i.offset,
            color: [i.color],
          };
        });
    })

    function changeValue(type) {
      if (props.item.t3Entry.auto_manual === 0) return;
      let control = false;
      let newVal = props.item.t3Entry.value;
      const range = IdxUtils.getEntryRange(props.item?.t3Entry);
      if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.range > 100
      ) {
        const rangeOptions = range.options?.filter((item) => item.status === 1);
        const rangeIndex = rangeOptions.findIndex(
          // (item) => item.value * 1000 === props.item.t3Entry.value
          (item) => item.value === props.item.t3Entry.value
        );

        if (type === "decrease" && rangeIndex < rangeOptions.length - 1) {
          //newVal = rangeOptions[rangeIndex + 1].value * 1000;
          newVal = rangeOptions[rangeIndex + 1].value;
        } else if (type === "increase" && rangeIndex > 0) {
          //newVal = rangeOptions[rangeIndex - 1].value * 1000;
          newVal = rangeOptions[rangeIndex - 1].value;
        } else {
          return;
        }
      } else if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.digital_analog === 1
      ) {
        if (type === "increase") {
          // newVal = props.item.t3Entry.value + 1000;
          newVal = props.item.t3Entry.value + 1;
        } else {
          // newVal = props.item.t3Entry.value - 1000;
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

    const objectRef = ref(null);

    function refresh() {
      if (!objectRef.value) return;
      if (props.item?.type === "Duct") {
        objectRef.value.refresh();
      }
    }

    const updateWeldModel = (weldModel, itemList) => {
      emit("updateWeldModel", weldModel, itemList);
    }

    const autoManualToggle = (event) => {
      Utils2.StopPropagationAndDefaults(event);
    }

    return {
      range,
      dispalyText,
      processedColors,
      changeValue,
      refresh,
      objectRef,
      updateWeldModel,
      autoManualToggle
    };
  },
});
</script>

<style scoped>
.object-title {
  text-align: center;
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

.object-container {
  width: 100%;
}

.moveable-item.Gauge .object-container,
.moveable-item.Dial .object-container {
  height: 100%;
}

.moveable-item.Gauge.with-title .object-container,
.moveable-item.Dial.with-title .object-container {
  height: calc(100% - 41px);
}

.moveable-item.Value.with-title,
.moveable-item.Icon.with-title,
.moveable-item.Switch.with-title {
  display: flex;
}

.moveable-item.Icon.with-title,
.moveable-item.Switch.with-title {
  display: flex;
  flex-direction: row-reverse;
}

.moveable-item.Value .object-container,
.moveable-item.Icon.with-title .object-container,
.moveable-item.Switch.with-title .object-container {
  height: 100%;
  display: flex;
  align-items: center;
}

.moveable-item.Value .object-container {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
  padding: 10px;
}

.moveable-item.Icon.with-title .object-container,
.moveable-item.Switch.with-title .object-container {
  width: auto;
}

.moveable-item.Value.with-title .object-title,
.moveable-item.Icon.with-title .object-title,
.moveable-item.Switch.with-title .object-title {
  min-width: auto;
  padding: 10px;
  line-height: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.moveable-item.Icon.with-title .object-title,
.moveable-item.Switch.with-title .object-title {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
}

.moveable-item.Value.with-title .object-title .mode-icon,
.moveable-item.Icon.with-title .object-title .mode-icon,
.moveable-item.Switch.with-title .object-title .mode-icon {
  display: none;
}

.moveable-item.Icon.with-bg .object-title,
.moveable-item.Switch.with-bg .object-title {
  background-color: transparent;
}

.moveable-item.link {
  cursor: pointer;
}

.img-object {
  max-width: none;
  width: 100%;
}

.up-btn {
  display: none;
  bottom: 100%;
  z-index: 1;
}

.down-btn {
  display: none;
  top: 100%;
  z-index: 1;
}

.moveable-item.Icon .up-btn,
.moveable-item.Switch .up-btn {
  bottom: calc(100% + 5px);
}

.moveable-item.Icon .down-btn,
.moveable-item.Switch .down-btn {
  top: calc(100% + 3px);
}

.object-title:hover .up-btn,
.object-title:hover .down-btn {
  display: inline-flex;
}

.Duct .object-container {
  max-height: 100%;
}
</style>
