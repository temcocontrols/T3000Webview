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
        <path
          d="M 0 0 L 0 100 L 50 100 L 1 50 L 50 0 L 0 0 Z"
          transform="matrix(-1,0,0,1,50,0)"
        />
      </svg>
      <div v-else class="w-full h-full"></div>
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
        <polygon
          points="50 0, 50 100, 0 50"
          transform="matrix(-1,0,0,1,50,0)"
        />
      </svg>
      <div v-else class="w-full h-full"></div>
    </div>
  </div>
</template>

<script>
import { defineComponent, onMounted, ref } from "vue";
import { getElementInfo } from "vue3-moveable";
import { getOverlapSize } from "overlap-area";

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

    function getPoints(info) {
      const { left, top, pos1, pos2, pos3, pos4 } = info;

      return [pos1, pos2, pos4, pos3].map((pos) => [
        left + pos[0],
        top + pos[1],
      ]);
    }
    function isOverlap(partEl) {
      const parentDuct = partEl.closest(".moveable-item.Duct");
      const element1Rect = getElementInfo(partEl);
      const elements = document.querySelectorAll(".moveable-item.Duct");
      for (const el of Array.from(elements)) {
        if (parentDuct.isSameNode(el)) continue;
        const element2Rect = getElementInfo(el);

        const points1 = getPoints(element1Rect);
        const points2 = getPoints(element2Rect);
        const overlapSize = getOverlapSize(points1, points2);
        if (overlapSize > 0) return true;
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
.duct-body,
.duct-start > div,
.duct-end > div {
  background-color: v-bind(bgColor);
}
.duct-start,
.duct-end {
  max-width: 40px;
  min-width: 25px;
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
