<template>
  <div class="weld-element"></div>
  <a>this is a weld element</a>
</template>

<script>
import { defineComponent } from "vue";

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
  setup() {
    return {};
  },
});
</script>

<style scoped>
.weld-element {
  background-color: v-bind("bgColor");
}
</style>
