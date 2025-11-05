<template>
  <div>
    <file-upload></file-upload>
  </div>
</template>

<script>
import { defineComponent, computed } from "vue";
import FileUpload from "./FileUpload.vue";
export default defineComponent({
  name: "ObjectType",
  components: {
    FileUpload,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    return {};
  },
});
</script>

<style scoped></style>
