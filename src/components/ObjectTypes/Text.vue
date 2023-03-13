

<template>
  <div ref="editableElement" :contenteditable="true" :style="`font-size: ${fontSize}px; color: ${textColor}`">{{ content
  }}
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'

export default defineComponent({
  name: 'TextEl',
  props: {
    content: {
      type: String,
      default: "Text element"
    },
    fontSize: {
      type: Number,
      default: 16
    },
    color: {
      type: String,
      default: "black"
    },
  },
  setup() {
    const editable = ref(false)
    const editableElement = ref(null)

    onMounted(() => {
      editableElement.value.focus();
    })
    return {
      editable,
      editableElement
    }
  }
})
</script>

<style scoped>
div {
  width: 100%;
  height: 100%;
  margin-top: 15px;
}
</style>
