<template>
  <div class="value-element">
    {{ value }}
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ValueEl",
  props: {
    bgColor: {
      type: String,
      default: "black",
    },
    value: {
      type: String,
      default: "",
    },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped>
.value-element {
  background-color: v-bind("bgColor");
}
</style>
