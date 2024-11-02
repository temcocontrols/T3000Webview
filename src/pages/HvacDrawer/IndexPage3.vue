<template>
  <div id="canvas-container">
    <canvas id="canvas"></canvas>
  </div>
</template>

<script>
import * as fabric from 'fabric';

export default {
  name: 'IndexPage3',
  mounted() {
    this.initCanvas();
  },
  methods: {
    initCanvas() {
      const canvas = new fabric.Canvas('canvas');
      const circle = new fabric.Circle({
        radius: 50,
        fill: 'red',
        left: 100,
        top: 100
      });
      canvas.add(circle);
    }
  }
};
</script>

<style scoped>
#canvas-container {
  width: 100%;
  height: 100%;
}

canvas {
  border: 1px solid #000;
}
</style>
