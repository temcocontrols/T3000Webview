<template>
  <div id="canvas-container">
    <canvas id="canvas" width=1000 height=500></canvas>
  </div>
</template>

<script>
import * as fabric from 'fabric';
import paper from 'paper';

export default {
  name: 'IndexPage3',
  mounted() {
    this.initCanvas();
    this.initPaper();
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
    },

    initPaper() {
      paper.setup('canvas');
      paper.settings.insertItems = false;

      const project = new paper.Project('canvas');

      const rectangle = new paper.Path.Rectangle({
        point: [75, 75],
        size: [100, 50],
        fillColor: 'blue'
      });

      project.activeLayer.addChild(rectangle);
      paper.view.draw();
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
