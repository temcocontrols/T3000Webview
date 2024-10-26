<template>
  <div class="weld-element"></div>
  <a>this is a weld element</a>
</template>

<script>
import { defineComponent, onMounted } from "vue";
import { cloneDeep, isEqual } from "lodash";

export default defineComponent({
  name: "WeldEl",
  props: {
    active: {
      type: Boolean,
      required: false,
      default: false,
    },
    inAlarm: {
      type: Boolean,
      required: false,
      default: false,
    },
    fillColor: {
      type: String,
      default: "#659dc5",
    },
  },
  setup(props, { emit }) {
    console.log("weld element setup", props);
    let initialObject = {};
    onMounted(() => {
      initialObject = cloneDeep(props.object);
      // emit("mounted");
    });
    return {};
  },
});
</script>

<style scoped>
.weld-element {
  background-color: v-bind("bgColor");
}
</style>
