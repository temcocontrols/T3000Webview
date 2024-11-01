<template>
  <canvas id="myCanvas" ref="myCanvas" width="800" height="600"></canvas>
</template>

<script>
import paper from "paper";

export default {
  name: "CanvasShape",
  mounted() {
    paper.setup(this.$refs.myCanvas);

    const points = [
      new paper.Point(100, 150),
      new paper.Point(200, 250),
      new paper.Point(300, 200),
      new paper.Point(400, 300),
      new paper.Point(300, 400),
      new paper.Point(200, 350),
      new paper.Point(100, 150), // Closing the shape by connecting back to the first point
    ];

    const lines = [];

    const lineObjects = points.slice(0, -1).map((point, index) => {
      const startPoint = point;
      const endPoint = points[index + 1];

      const startCircle = new paper.Path.Circle({
        center: startPoint,
        radius: 20,
        fillColor: "blue",
      });

      const endCircle = new paper.Path.Circle({
        center: endPoint,
        radius: 20,
        fillColor: "red",
      });

      const line = new paper.Path.Line({
        from: startPoint,
        to: endPoint,
        strokeColor: "black",
        strokeWidth: 8,
      });

      function makeLineClosed() {
        if (index === 0) {
          const lastLine = lineObjects[lineObjects.length - 1];
          lastLine.endPoint.position = startCircle.position;
          lastLine.path.segments[1].point = startCircle.position;

          console.log("current line is first line");
          console.log("found last line", lastLine);
        }
        // if (index === lineObjects.length - 1) {
        //   const firstLine = lineObjects[0];
        //   firstLine.startPoint.position = endCircle.position;
        //   firstLine.path.segments[0].point = endCircle.position;
        // }
        // if (index === 0) {
        //   startCircle.onMouseDrag = function (event) {
        //     this.position = this.position.add(event.delta);
        //     updateShapes();
        //     const lastLine = lineObjects[lineObjects.length - 1];
        //     lastLine.endPoint.position = this.position;
        //     lastLine.path.segments[1].point = this.position;
        //   };
        // }
        // if (index === lineObjects.length - 1) {
        //   endCircle.onMouseDrag = function (event) {
        //     this.position = this.position.add(event.delta);
        //     updateShapes();
        //     const firstLine = lineObjects[0];
        //     firstLine.startPoint.position = this.position;
        //     firstLine.path.segments[0].point = this.position;
        //   };
        // }
      }

      function updateShapes() {
        line.segments[0].point = startCircle.position;
        line.segments[1].point = endCircle.position;

        makeLineClosed();
      }

      function updatePreviousLine(newDelta, newLocation) {
        if (index > 0) {
          const previousLine = lineObjects[index - 1];
          previousLine.endPoint.position = newLocation;
          previousLine.path.segments[1].point = newLocation;
        }
      }

      function updateNextLine(newDelta, newLocation) {
        if (index < lineObjects.length - 1) {
          const nextLine = lineObjects[index + 1];
          nextLine.startPoint.position = newLocation;
          nextLine.path.segments[0].point = newLocation;
        }
      }

      startCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
      };

      endCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
      };

      line.onMouseDrag = function (event) {
        const delta = event.delta;
        startCircle.position = startCircle.position.add(delta);
        endCircle.position = endCircle.position.add(delta);
        updateShapes();
        updatePreviousLine(delta, startCircle.position);
        updateNextLine(delta, endCircle.position);
      };

      return {
        name: `Line ${index + 1}`,
        path: line,
        startPoint: startCircle,
        endPoint: endCircle,
      };
    });

    console.log(lineObjects);

    paper.view.draw();

    // function drawLine(startPoint, endPoint) {
    //   // Create the circle shapes for the points
    //   const startCircle = new paper.Path.Circle({
    //     center: startPoint,
    //     radius: 10,
    //     fillColor: "blue",
    //   });

    //   const endCircle = new paper.Path.Circle({
    //     center: endPoint,
    //     radius: 10,
    //     fillColor: "red",
    //   });

    //   // Create the line connecting the points
    //   const line = new paper.Path.Line({
    //     from: startPoint,
    //     to: endPoint,
    //     strokeColor: "black",
    //     strokeWidth: 8,
    //   });

    //   // Function to update the line and circles
    //   function updateShapes() {
    //     line.segments[0].point = startCircle.position;
    //     line.segments[1].point = endCircle.position;
    //   }

    //   // Enable dragging for the start circle
    //   startCircle.onMouseDrag = function (event) {
    //     this.position = this.position.add(event.delta);
    //     updateShapes();
    //   };

    //   // Enable dragging for the end circle
    //   endCircle.onMouseDrag = function (event) {
    //     this.position = this.position.add(event.delta);
    //     updateShapes();
    //   };

    //   // Enable dragging for the line
    //   line.onMouseDrag = function (event) {
    //     const delta = event.delta;
    //     startCircle.position = startCircle.position.add(delta);
    //     endCircle.position = endCircle.position.add(delta);
    //     updateShapes();
    //   };

    //   return { startCircle, endCircle, line };
    // }

    // // Create the start and end points
    // const startPoint = new paper.Point(100, 50);
    // const endPoint = new paper.Point(300, 100);

    // // Draw the line
    // drawLine(startPoint, endPoint);

    // function drawContinuousLine(points) {
    //   if (points.length < 2) return;

    //   // Create the circles for each point
    //   const circles = points.map((point, index) => {
    //     return new paper.Path.Circle({
    //       center: point,
    //       radius: 20,
    //       fillColor:
    //         index === 0
    //           ? "blue"
    //           : index === points.length - 1
    //           ? "red"
    //           : "green",
    //     });
    //   });

    //   // Create the continuous line connecting the points
    //   const line = new paper.Path({
    //     segments: points,
    //     strokeColor: "black",
    //     strokeWidth: 15,
    //   });

    //   // Function to update the line and circles
    //   function updateShapes() {
    //     line.segments.forEach((segment, index) => {
    //       segment.point = circles[index].position;
    //     });
    //   }

    //   // Enable dragging for each circle
    //   circles.forEach((circle, index) => {
    //     circle.onMouseDrag = function (event) {
    //       this.position = this.position.add(event.delta);
    //       updateShapes();
    //     };
    //   });

    //   // Enable dragging for the line
    //   line.onMouseDrag = function (event) {
    //     const delta = event.delta;
    //     console.log(event);
    //     circles.forEach((circle) => {
    //       circle.position = circle.position.add(delta);
    //     });
    //     updateShapes();
    //   };

    //   // Function to check if a point is near the line
    //   function isPointNearLine(point, line, tolerance = 10) {
    //     return line.getNearestPoint(point).getDistance(point) <= tolerance;
    //   }

    //   // Add mouse down event to detect selected line
    //   paper.view.onMouseDown = function (event) {
    //     if (isPointNearLine(event.point, line)) {
    //       console.log("Line selected");
    //     }
    //   };

    //   return { circles, line };
    // }

    // // Create the points for the continuous line
    // const points = [
    //   new paper.Point(100, 150),
    //   new paper.Point(200, 250),
    //   new paper.Point(300, 200),
    //   new paper.Point(400, 300),
    //   new paper.Point(300, 400),
    //   new paper.Point(200, 350),
    //   new paper.Point(100, 150), // Closing the shape by connecting back to the first point
    // ];

    // // Draw the continuous line
    // drawContinuousLine(points);

    // // Draw the shapes on the canvas
    // paper.view.draw();
  },
};
</script>

<style scoped>
canvas {
  border: 1px solid black;
}
</style>
