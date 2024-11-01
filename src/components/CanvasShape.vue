<template>
  <canvas id="myCanvas" ref="myCanvas" width="800" height="600"></canvas>
</template>

<script>
import paper from "paper";

export default {
  name: "CanvasShape",
  mounted() {
    paper.setup(this.$refs.myCanvas);

    // Create the start and end points
    const startPoint = new paper.Point(100, 50);
    const endPoint = new paper.Point(300, 100);

    // Create the circle shapes for the points
    const startCircle = new paper.Path.Circle({
      center: startPoint,
      radius: 10,
      fillColor: "blue",
    });

    const endCircle = new paper.Path.Circle({
      center: endPoint,
      radius: 10,
      fillColor: "red",
    });

    // Create the line connecting the points
    const line = new paper.Path.Line({
      from: startPoint,
      to: endPoint,
      strokeColor: "black",
      strokeWidth: 8,
    });

    // Function to update the line and circles
    function updateShapes() {
      line.segments[0].point = startCircle.position;
      line.segments[1].point = endCircle.position;
    }

    // Enable dragging for the start circle
    startCircle.onMouseDrag = function (event) {
      this.position = this.position.add(event.delta);
      updateShapes();
    };

    // Enable dragging for the end circle
    endCircle.onMouseDrag = function (event) {
      this.position = this.position.add(event.delta);
      updateShapes();
    };

    // Enable dragging for the line
    line.onMouseDrag = function (event) {
      const delta = event.delta;
      startCircle.position = startCircle.position.add(delta);
      endCircle.position = endCircle.position.add(delta);
      updateShapes();
    };

    // Draw the shapes on the canvas
    paper.view.draw();
  },
};
</script>

<style scoped>
canvas {
  border: 1px solid black;
}
</style>
