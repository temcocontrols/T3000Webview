<template>
  <div v-if="item.title" @click="$emit('objectClicked')">
    {{ item.title }}
    <q-icon name="edit" onclick="alert('icon-edit-clicked')"/>
  </div>
</template>

<script>
import { defineComponent, computed, ref } from "vue";
import IdxUtils from "src/lib/T3000/Hvac/Opt/IdxUtils";

export default defineComponent({
  name: "AntdTest",
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
    "autoManualToggle",
    "objectClicked",
    "changeValue",
    "updateWeldModel",
  ],
  setup(props, { emit }) {

    console.log('ObjectType2 props', props.item);
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

    return {
      range,
      dispalyText,
      processedColors,
      changeValue,
      refresh,
      objectRef,
      updateWeldModel,
    };
  },
});
</script>

<style scoped></style>
