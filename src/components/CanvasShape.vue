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

    const drawShapes = () => {
      canvas.value.clear();
      drawCircle();
      drawRectangle();
      drawEllipse();
    };

    const drawCircle = () => {
      const width = 100; //props.item.width;
      const height = 100; //props.item.height;
      const radius = Math.min(width, height) / 2;
      const circle = new fabric.Circle({
        radius: radius,
        fill: "red",
        left: (width - radius * 2) / 2,
        top: (height - radius * 2) / 2,
      });
      canvas.value.add(circle);
    };

    const drawRectangle = () => {
      const width = 150; // props.item.width;
      const height = 180; // props.item.height;
      const rect = new fabric.Rect({
        width: width / 2,
        height: height / 2,
        fill: "blue",
        left: width / 4,
        top: height / 4,
      });
      canvas.value.add(rect);
    };

    const drawEllipse = () => {
      const width = 200; // props.item.width;
      const height = 140; // props.item.height;
      const ellipse = new fabric.Ellipse({
        rx: width / 4,
        ry: height / 4,
        fill: "green",
        left: width / 4,
        top: height / 4,
      });
      canvas.value.add(ellipse);
    };

    const resizeCanvas = () => {
      canvas.value.setWidth(props.item.width);
      canvas.value.setHeight(props.item.height);
      canvas.value.renderAll();
    };

    const disableParentMoveEvent = () => {
      canvas.value.on("object:moving", (e) => {
        console.log("object:moving");
        e.e.stopPropagation();
      });
    };

    const setAllActived = () => {
      canvas.value.discardActiveObject();
      const selection = new fabric.ActiveSelection(canvas.value.getObjects(), {
        canvas: canvas.value,
      });
      canvas.value.setActiveObject(selection);
      canvas.value.requestRenderAll();
    };

    const performBooleanOperation = () => {
      canvas.value.discardActiveObject();
      const selection = new fabric.ActiveSelection(canvas.value.getObjects(), {
        canvas: canvas.value,
      });
      canvas.value.setActiveObject(selection);
      canvas.value.requestRenderAll();

      const activeObjects = canvas.value.getActiveObjects();
      // if (activeObjects.length < 2) return;

      const [first, ...rest] = activeObjects;
      let result = first;

      rest.forEach((obj) => {
        result = fabric.util.booleanOperations.intersect(result, obj);
      });

      canvas.value.remove(...activeObjects);
      canvas.value.add(result);
      canvas.value.setActiveObject(result);
    };

    const handleBooleanOperations = () => {
      setAllActived();
      const activeObject = canvas.value.getActiveObject();
      console.log("activeObject", activeObject);
      if (!activeObject) return;

      // Example boolean operation: union
      const objects = canvas.value
        .getObjects()
        .filter((obj) => obj !== activeObject);
      const union = new fabric.PathGroup(
        [activeObject.toPath(), ...objects.map((obj) => obj.toPath())],
        {
          fill: "purple",
        }
      );

      this.canvas.clear();
      this.canvas.add(union);
    };

    const enableCrossPointsAndLines = () => {
      canvas.value.on("mouse:down", (e) => {
        if (!e.target) return;

        const pointer = canvas.value.getPointer(e.e);
        const crossPoint = new fabric.Circle({
          radius: 5,
          fill: "yellow",
          left: pointer.x - 5,
          top: pointer.y - 5,
          selectable: true,
        });

        canvas.value.add(crossPoint);
        canvas.value.setActiveObject(crossPoint);
      });
    };

    //enableCrossPointsAndLines();

    const addBorderToShapes = () => {
      const objects = canvas.value.getObjects();
      objects.forEach((obj) => {
        obj.set({
          stroke: "black",
          strokeWidth: 5,
          selectable: true,
        });

        obj.on("mousedown", () => {
          console.log("Shape clicked:", obj);
        });
      });
      canvas.value.renderAll();
    };

    const hideControlsForAllShapes = () => {
      const objects = canvas.value.getObjects();
      objects.forEach((obj) => {
        obj.setControlsVisibility({
          mt: false, // middle top
          mb: false, // middle bottom
          ml: false, // middle left
          mr: false, // middle right
          bl: false, // bottom left
          br: false, // bottom right
          tl: false, // top left
          tr: false, // top right
          mtr: false, // middle top rotate
        });
      });
      canvas.value.renderAll();
    };

    const hideClipPathForAllShapes = () => {
      const objects = canvas.value.getObjects();
      objects.forEach((obj) => {
        obj.clipPath = null;
      });
      canvas.value.renderAll();
    };

    const hideOuterBorder = () => {
      const objects = canvas.value.getObjects();
      objects.forEach((obj) => {
        obj.set({
          stroke: null,
        });
      });
      canvas.value.renderAll();
    };

    const makeStrokeSelectable = () => {
      const objects = canvas.value.getObjects();
      objects.forEach((obj) => {
        obj.on("mousedown", (e) => {
          if (e.target) {
            e.target.set({
              stroke: "red",
              strokeWidth: 5,
            });
            canvas.value.setActiveObject(e.target);
            canvas.value.renderAll();
          }
        });
      });
    };

    const convertOuterBorderToLineAndPoints = () => {
      const objects = canvas.value.getObjects();
      objects.forEach((obj) => {
        const points = obj.get("points") || [];
        console.log("points", points);
        const lines = [];

        for (let i = 0; i < points.length; i++) {
          const startPoint = points[i];
          const endPoint = points[(i + 1) % points.length];
          const line = new fabric.Line(
            [startPoint.x, startPoint.y, endPoint.x, endPoint.y],
            {
              stroke: "black",
              strokeWidth: 2,
              selectable: true,
            }
          );
          lines.push(line);
        }

        lines.forEach((line) => canvas.value.add(line));
        points.forEach((point) => {
          const circle = new fabric.Circle({
            radius: 3,
            fill: "red",
            left: point.x - 3,
            top: point.y - 3,
            selectable: true,
          });
          canvas.value.add(circle);
        });

        canvas.value.remove(obj);
      });
      canvas.value.renderAll();
    };

    const checkIntersectionForAllShapes = () => {
      const objects = canvas.value.getObjects();
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const obj1 = objects[i];
          const obj2 = objects[j];
          if (obj1.intersectsWithObject(obj2)) {
            console.log(`Object ${i} intersects with Object ${j}`);
            const intersectionPoints =
              fabric.Intersection.intersectPolygonPolygon(
                obj1.get("points"),
                obj2.get("points")
              ).points;

            intersectionPoints.forEach((point) => {
              const circle = new fabric.Circle({
                radius: 3,
                fill: "red",
                left: point.x - 3,
                top: point.y - 3,
                selectable: false,
              });
              canvas.value.add(circle);
            });
          }
        }
      }
    };

    const getAllShapesPath = () => {
      const objects = canvas.value.getObjects();
      console.log("objects", objects);
      const paths = objects.map((obj) => obj.toPath().path);
      console.log(paths);
      return paths;
    };

    onMounted(() => {
      canvas.value = new fabric.Canvas(`myCanvas${props.item.id}`);
      drawShapes();
      // handleBooleanOperations();
      setAllActived();
      addBorderToShapes();
      hideControlsForAllShapes();
      hideClipPathForAllShapes();
      // hideOuterBorder();
      makeStrokeSelectable();
      // convertOuterBorderToLineAndPoints();

      disableParentMoveEvent();
      // checkIntersectionForAllShapes();
      getAllShapesPath();
    });

    watch(
      () => [props.item.width, props.item.height],
      ([newWidth, newHeight]) => {
        resizeCanvas();
        drawShapes();
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
