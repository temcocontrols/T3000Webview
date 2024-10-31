<template>
  <div>
    <canvas
      :id="`myCanvas${item.id}`"
      :width="item.width"
      :height="item.height"
      resize
      stats
    ></canvas>
  </div>
</template>

<script>
import { defineComponent, onMounted, watch, ref } from "vue";
import * as fabric from "fabric";

export default defineComponent({
  name: "CanvasShape",
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const canvas = ref(null);

    const drawCircle = () => {
      canvas.value.clear();
      const width = props.item.width;
      const height = props.item.height;
      const radius = Math.min(width, height) / 2;
      const circle = new fabric.Circle({
        radius: radius,
        fill: "red",
        left: (width - radius * 2) / 2,
        top: (height - radius * 2) / 2,
      });
      canvas.value.add(circle);
    };

    const resizeCanvas = () => {
      canvas.value.setWidth(props.item.width);
      canvas.value.setHeight(props.item.height);
      canvas.value.renderAll();
    };

    onMounted(() => {
      canvas.value = new fabric.Canvas(`myCanvas${props.item.id}`);
      drawCircle();
    });

    watch(
      () => [props.item.width, props.item.height],
      ([newWidth, newHeight]) => {
        resizeCanvas();
        drawCircle();
      }
    );

    return {
      canvas,
    };
  },
});
</script>

<style scoped>
canvas {
  border: 1px solid #000;
  background-color: aqua;
}
</style>
