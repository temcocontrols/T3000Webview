<template>
  <canvas id="myCanvas" ref="myCanvas" width="800" height="600"></canvas>
</template>

<script>
import { fill } from "lodash";
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

    let lineObjects = [];
    lineObjects = points.slice(0, -1).map((point, index) => {
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
        fillColor: "green",
      });

      function makePreviousContinue() {
        // if (index === 0) {
        //   const lastLine = lineObjects[lineObjects.length - 1];
        //   lastLine.endPoint.position = startCircle.position;
        //   lastLine.path.segments[1].point = startCircle.position;

        //   console.log("current line is first line");
        //   console.log("found last line", lastLine);
        // }

        if (index > 0) {
          const previousLine = lineObjects[index - 1];
          previousLine.endPoint.position = startCircle.position;
          previousLine.path.segments[1].point = startCircle.position;

          console.log("current line is not first line");
          console.log("found previous line", previousLine);
        }
      }

      function makeNextContinue() {
        const nextLine = lineObjects[index + 1];
        nextLine.startPoint.position = endCircle.position;
        nextLine.path.segments[0].point = endCircle.position;
      }

      function updateShapes() {
        line.segments[0].point = startCircle.position;
        line.segments[1].point = endCircle.position;
      }

      function updatePreviousLine(newLocation) {
        if (index > 0) {
          const previousLine = lineObjects[index - 1];
          previousLine.endPoint.position = newLocation;
          previousLine.path.segments[1].point = newLocation;
        }
      }

      function updateNextLine(newLocation) {
        if (index === lineObjects.length - 1) {
          const firstLine = lineObjects[0];
          firstLine.startPoint.position = newLocation;
          firstLine.path.segments[0].point = newLocation;
        } else {
          const nextLine = lineObjects[index + 1];
          nextLine.startPoint.position = newLocation;
          nextLine.path.segments[0].point = newLocation;
        }
      }

      startCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
        makePreviousContinue();
      };

      endCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
        makeNextContinue();
      };

      line.onMouseDrag = function (event) {
        const delta = event.delta;
        startCircle.position = startCircle.position.add(delta);
        endCircle.position = endCircle.position.add(delta);
        updateShapes();

        updatePreviousLine(startCircle.position);
        updateNextLine(endCircle.position);
      };

      return {
        name: `Line ${index + 1}`,
        path: line,
        startPoint: startCircle,
        endPoint: endCircle,
      };
    });

    console.log(lineObjects);

    /*
    const path1 = new paper.Path({
      segments: [points[0], points[1]],
      strokeColor: "black",
      strokeWidth: 8,
      fillColor: "#f2f5",
      closed: true,
    });

    const path2 = new paper.Path({
      segments: [points[1], points[2]],
      strokeColor: "black",
      strokeWidth: 8,
      fillColor: "#f2f5",
      closed: true,
    });

    const path3 = new paper.Path({
      segments: [points[2], points[3]],
      strokeColor: "black",
      strokeWidth: 8,
      fillColor: "#f2f5",
      closed: true,
    });

    const path4 = new paper.Path({
      segments: [points[3], points[4]],
      strokeColor: "black",
      strokeWidth: 8,
      fillColor: "#f2f5",
      closed: true,
    });

    const path5 = new paper.Path({
      segments: [points[4], points[5]],
      strokeColor: "black",
      strokeWidth: 8,
      fillColor: "#f2f5",
      closed: true,
    });

    const path6 = new paper.Path({
      segments: [points[5], points[6]],
      strokeColor: "black",
      strokeWidth: 8,
      fillColor: "#f2f5",
      closed: true,
    });

    const path7 = new paper.Path({
      segments: [points[6], points[0]],
      strokeColor: "black",
      strokeWidth: 8,
      fillColor: "#f2f5",
      closed: true,
    });
    */

    const cp1 = new paper.CompoundPath({
      children: lineObjects.map((lineObj) => lineObj.path),
      // children: childrenTest,
      // children: [path1, path2, path3, path4, path5, path6, path7],
      strokeColor: "#90ff",
      strokeWidth: 20,
      fillColor: "#f0f",
    });

    console.log("compoundPath", cp1);

    cp1.onMouseDrag = function (event) {
      console.log("compoundPath dragged");
      const delta = event.delta;
      lineObjects.forEach((lineObj) => {
        console.log("lineObj in compoundPath", lineObj);
        // lineObj.startPoint.position = lineObj.startPoint.position.add(delta);
        // lineObj.endPoint.position = lineObj.endPoint.position.add(delta);
        // lineObj.path.segments[0].point = lineObj.startPoint.position;
        // lineObj.path.segments[1].point = lineObj.endPoint.position;
      });
    };

    var path11 = new paper.Path.Rectangle([100, 20], [100, 100]);
    var path22 = new paper.Path.Rectangle([50, 50], [200, 200]);
    var path33 = new paper.Path.Rectangle([0, 0], [400, 400]);
    // var cp2 = new paper.CompoundPath(path11, path22, path33);

    // cp2.fillColor = "#f0f";

    // const path = new paper.Path({
    //   segments: points,
    //   strokeColor: "black",
    //   strokeWidth: 8,
    //   fillColor: "#f2f5",
    //   closed: true,
    // });

    // path.onMouseDrag = function (event) {
    //   const delta = event.delta;
    //   points.forEach((point, index) => {
    //     point.x += delta.x;
    //     point.y += delta.y;
    //     path.segments[index].point = point;
    //   });
    //   path.position = path.position.add(delta);
    // };

    // points.forEach((point, index) => {
    //   const circle = new paper.Path.Circle({
    //     center: point,
    //     radius: 10,
    //     fillColor: "yellow",
    //   });

    //   circle.onMouseDrag = function (event) {
    //     this.position = this.position.add(event.delta);
    //     path.segments[index].point = this.position;
    //   };
    // });

    // path.segments.forEach((segment, index) => {
    //   console.log("segment", segment);
    //   segment.onMouseDrag = function (event) {
    //     console.log("segment point", this.point);
    //     this.point = this.point.add(event.delta);
    //     path.segments[index].point = this.point;
    //   };
    // });

    // path.onMouseDrag = function (event) {
    //   const delta = event.delta;
    //   path.segments.forEach((segment) => {
    //     segment.point = segment.point.add(delta);
    //   });
    // };

    // console.log("path", path);
    paper.view.draw();
    // paper.view.draw();

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
