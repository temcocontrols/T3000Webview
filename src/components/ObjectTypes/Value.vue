<template>
  <div class="value-element relative flex flex-col flex-nowrap items-center">
    <q-btn
      v-if="showArrows"
      class="up-btn absolute"
      size="sm"
      icon="keyboard_arrow_up"
      color="grey-4"
      text-color="black"
      dense
      :disable="item.t3Entry?.auto_manual === 0"
      @click="$emit('changeValue', 'increase')"
    />
    <div class="w-full">
      {{ dispalyText }}
    </div>
    <q-btn
      v-if="showArrows"
      class="down-btn absolute"
      size="sm"
      icon="keyboard_arrow_down"
      color="grey-4"
      text-color="black"
      dense
      :disable="item.t3Entry?.auto_manual === 0"
      @click="$emit('changeValue', 'decrease')"
    />
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import { getEntryRange } from "src/lib/common";
export default defineComponent({
  name: "ValueEl",
  props: {
    item: {
      type: Object,
      required: true,
    },
    textAlign: {
      type: String,
      default: "left",
    },
    showArrows: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const dispalyText = computed(() => {
      if (!props.item.t3Entry || props.item.t3Entry?.value === undefined) {
        return "";
      }
      const range = getEntryRange(props.item?.t3Entry);
      if (props.item.t3Entry.range > 100) {
        const rangeValue = range.options?.find(
          (item) => item.value * 1000 === props.item.t3Entry.value
        );
        return rangeValue?.name;
      } else if (props.item.t3Entry.digital_analog === 1) {
        return props.item.t3Entry.value / 1000 + " " + range.unit;
      } else if (props.item.t3Entry.digital_analog === 0) {
        if (props.item.t3Entry.control) {
          return range.on;
        } else {
          return range.off;
        }
      }

      return props.item.t3Entry.value || "";
    });
    return { dispalyText };
  },
});
</script>

<style scoped>
.value-element {
  width: 100%;
  text-align: v-bind("textAlign");
}
.up-btn {
  display: none;
  bottom: calc(100% + 5px);
}
.down-btn {
  display: none;
  top: calc(100% + 3px);
}
.object-container:hover .up-btn,
.object-container:hover .down-btn {
  display: inline-flex;
}
</style>
