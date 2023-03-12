

<template>
  <div class="box-element"></div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TextEl',
  props: {
    bgColor: {
      type: String,
      default: "black"
    },
  },
  setup() {

    return {
    }
  }
})
</script>

<style scoped>
.box-element {
  width: 100%;
  height: 100%;
  background-color: v-bind("bgColor");
  ;
}
</style>
