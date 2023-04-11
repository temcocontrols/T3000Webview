<template>
  <div class="value-element">
    {{ dispalyText }}
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import { ranges } from "src/lib/common";
export default defineComponent({
  name: "ValueEl",
  props: {
    bgColor: {
      type: String,
      default: "black",
    },
    item: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const dispalyText = computed(() => {
      if (!props.item.t3Entry) {
        return "";
      }
      if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.digital_analog === 1
      ) {
        const range = ranges.find(
          (i) => i.analog && i.id === props.item.t3Entry.range
        );
        return props.item.t3Entry.value / 1000 + " " + range.unit;
      } else if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.digital_analog === 0
      ) {
        const range = ranges.find((i) => i.id === props.item.t3Entry.range);
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
  background-color: v-bind("bgColor");
}
</style>
