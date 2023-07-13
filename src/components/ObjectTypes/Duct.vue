<template>
  <div class="duct flex flex-nowrap w-full h-full">
    <div class="duct-start" :class="{ shown: showStart }" ref="startElRef">
      <svg
        v-if="showStart"
        viewBox="0 0 50 100"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        <polygon points="50 0, 50 100, 0 50" />
      </svg>
    </div>
    <div class="duct-body grow"></div>
    <div class="duct-end" :class="{ shown: showEnd }" ref="endElRef">
      <svg
        v-if="showEnd"
        viewBox="0 0 50 100"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        <path d="M 0 0 L 0 100 L 50 100 L 1 50 L 50 0 L 0 0 Z" />
      </svg>
    </div>
  </div>
</template>

<script>
import { defineComponent, onMounted, ref } from "vue";

export default defineComponent({
  name: "DuctEl",
  props: {
    bgColor: {
      type: String,
      default: "#808080",
    },
  },
  setup() {
    const startElRef = ref(null);
    const endElRef = ref(null);
    const showStart = ref(true);
    const showEnd = ref(true);
    function isOverlap(partEl) {
      const parentDuct = partEl.closest(".moveable-item.Duct");
      const element1Rect = partEl.getBoundingClientRect();
      const elements = document.querySelectorAll(".moveable-item.Duct");
      for (const el of Array.from(elements)) {
        if (parentDuct.isSameNode(el)) continue;
        const element2Rect = el.getBoundingClientRect();

        const overlap = !(
          element1Rect.right < element2Rect.left ||
          element1Rect.left > element2Rect.right ||
          element1Rect.bottom < element2Rect.top ||
          element1Rect.top > element2Rect.bottom
        );
        if (overlap) {
          return true;
        }
      }
      return false;
    }
    function refresh() {
      if (startElRef.value && endElRef.value) {
        showStart.value = !isOverlap(startElRef.value);
        showEnd.value = !isOverlap(endElRef.value);
      }
    }
    onMounted(() => {
      refresh();
    });
    return {
      startElRef,
      endElRef,
      isOverlap,
      showStart,
      showEnd,
      refresh,
    };
  },
});
</script>

<style scoped>
.duct-body {
  background-color: v-bind(bgColor);
}
.duct-start,
.duct-end {
  max-width: 40px;
}

.duct-end {
  margin-left: -1px;
}
.duct-start {
  margin-right: -1px;
}
.duct svg {
  fill: v-bind(bgColor);
}
</style>
