<template>
  <div>
    <canvas ref="canvas" :width="item.width" :height="item.height"></canvas>
  </div>
</template>

<script>
import { ClipperLib } from "clipper-lib";

export default {
  name: "CanvasShape",
  props: {
    item: {
      type: Object,
      required: true,
      default: () => ({ width: 500, height: 500 }),
    },
  },
  mounted() {
    this.drawShapes();
  },
  watch: {
    item: {
      handler() {
        this.drawShapes();
      },
      deep: true,
    },
  },
  methods: {
    drawShapes() {
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Example shapes
      const circle = this.createCircle(150, 150, 50);
      const rectangle = this.createRectangle(100, 100, 200, 100);
      const ellipse = this.createEllipse(300, 300, 100, 50);

      // Perform boolean operations
      const clipper = new ClipperLib.Clipper();
      clipper.AddPaths(circle, ClipperLib.PolyType.ptSubject, true);
      clipper.AddPaths(rectangle, ClipperLib.PolyType.ptClip, true);
      const solution = new ClipperLib.Paths();
      clipper.Execute(ClipperLib.ClipType.ctUnion, solution);

      // Draw shapes
      this.drawPath(ctx, solution, "blue");
      this.drawPath(ctx, ellipse, "red");
    },
    createCircle(cx, cy, r) {
      const steps = 100;
      const path = [];
      for (let i = 0; i < steps; i++) {
        const theta = (i / steps) * 2 * Math.PI;
        path.push({ X: cx + r * Math.cos(theta), Y: cy + r * Math.sin(theta) });
      }
      return [path];
    },
    createRectangle(x, y, width, height) {
      return [
        [
          { X: x, Y: y },
          { X: x + width, Y: y },
          { X: x + width, Y: y + height },
          { X: x, Y: y + height },
        ],
      ];
    },
    createEllipse(cx, cy, rx, ry) {
      const steps = 100;
      const path = [];
      for (let i = 0; i < steps; i++) {
        const theta = (i / steps) * 2 * Math.PI;
        path.push({
          X: cx + rx * Math.cos(theta),
          Y: cy + ry * Math.sin(theta),
        });
      }
      return [path];
    },
    drawPath(ctx, paths, color) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      paths.forEach((path) => {
        ctx.moveTo(path[0].X, path[0].Y);
        path.forEach((point) => {
          ctx.lineTo(point.X, point.Y);
        });
        ctx.closePath();
      });
      ctx.stroke();
    },
  },
};
</script>

<style scoped>
canvas {
  border: 1px solid #000;
}
</style>
