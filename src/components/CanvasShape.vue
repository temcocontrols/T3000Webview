<template>
  <canvas id="myCanvas" ref="myCanvas" width="1000" height="800"></canvas>
  <div class="buttons">
    <button @click="performUnion">Union</button>
    <button @click="performDifference">Difference</button>
    <button @click="performIntersection">Intersection</button>
  </div>
</template>

<script>
import paper from "paper";

let path1 = null;
let path2 = null;

export default {
  name: "CanvasShape",
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  mounted() {
    paper.setup(this.$refs.myCanvas);

    paper.settings.insertItems = true;

    const points1 = [
      // new paper.Point(100, 150),
      // new paper.Point(200, 250),
      // new paper.Point(300, 200),
      // new paper.Point(400, 300),
      // new paper.Point(300, 400),
      // new paper.Point(200, 350),
      // new paper.Point(100, 150), // Closing the shape by connecting back to the first point
      new paper.Point(80, 150),
      new paper.Point(200, 250),
      new paper.Point(80, 350),
      new paper.Point(600, 350),
      new paper.Point(700, 250),
      new paper.Point(600, 150),
      new paper.Point(80, 150),
    ];

    let lineObjects = [];
    lineObjects = points1.slice(0, -1).map((point, index) => {
      const startPoint = point;
      const endPoint = points1[index + 1];

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
        if (index > 0) {
          const previousLine = lineObjects[index - 1];
          previousLine.endPoint.position = startCircle.position;
          previousLine.path.segments[1].point = startCircle.position;
        } else {
          const lastLine = lineObjects[lineObjects.length - 1];
          lastLine.endPoint.position = startCircle.position;
          lastLine.path.segments[1].point = startCircle.position;
        }
      }

      function makeNextContinue() {
        if (index === lineObjects.length - 1) {
          const firstLine = lineObjects[0];
          firstLine.startPoint.position = endCircle.position;
          firstLine.path.segments[0].point = endCircle.position;
        } else {
          const nextLine = lineObjects[index + 1];
          nextLine.startPoint.position = endCircle.position;
          nextLine.path.segments[0].point = endCircle.position;
        }
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
        } else {
          const lastLine = lineObjects[lineObjects.length - 1];
          lastLine.endPoint.position = newLocation;
          lastLine.path.segments[1].point = newLocation;
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

    const points2 = [
      new paper.Point(400, 300),
      new paper.Point(400, 550),
      new paper.Point(580, 650),
      new paper.Point(760, 550),
      new paper.Point(760, 300),
      new paper.Point(400, 300),
      // new paper.Point(100, 150),
    ];

    let lineObjects2 = [];
    lineObjects2 = points2.slice(0, -1).map((point, index) => {
      const startPoint = point;
      const endPoint = points2[index + 1];

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
        if (index > 0) {
          const previousLine = lineObjects2[index - 1];
          previousLine.endPoint.position = startCircle.position;
          previousLine.path.segments[1].point = startCircle.position;
        } else {
          const lastLine = lineObjects2[lineObjects2.length - 1];
          lastLine.endPoint.position = startCircle.position;
          lastLine.path.segments[1].point = startCircle.position;
        }
      }

      function makeNextContinue() {
        if (index === lineObjects2.length - 1) {
          const firstLine = lineObjects2[0];
          firstLine.startPoint.position = endCircle.position;
          firstLine.path.segments[0].point = endCircle.position;
        } else {
          const nextLine = lineObjects2[index + 1];
          nextLine.startPoint.position = endCircle.position;
          nextLine.path.segments[0].point = endCircle.position;
        }
      }

      function updateShapes() {
        line.segments[0].point = startCircle.position;
        line.segments[1].point = endCircle.position;
      }

      function updatePreviousLine(newLocation) {
        if (index > 0) {
          const previousLine = lineObjects2[index - 1];
          previousLine.endPoint.position = newLocation;
          previousLine.path.segments[1].point = newLocation;
        } else {
          const lastLine = lineObjects2[lineObjects2.length - 1];
          lastLine.endPoint.position = newLocation;
          lastLine.path.segments[1].point = newLocation;
        }
      }

      function updateNextLine(newLocation) {
        if (index === lineObjects2.length - 1) {
          const firstLine = lineObjects2[0];
          firstLine.startPoint.position = newLocation;
          firstLine.path.segments[0].point = newLocation;
        } else {
          const nextLine = lineObjects2[index + 1];
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

    console.log(lineObjects2);

    path1 = new paper.Path({
      segments: points1,
      closed: true,
      fillColor: "blue",
    });

    // points1.forEach((point, index) => {
    //   const circle = new paper.Path.Circle({
    //     center: point,
    //     radius: 10,
    //     fillColor: "yellow",
    //   });
    //   circle.onMouseDrag = function (event) {
    //     this.position = this.position.add(event.delta);
    //     path1.segments[index].point = this.position;
    //   };
    // });
    // path1.segments.forEach((segment, index) => {
    //   segment.onMouseDrag = function (event) {
    //     console.log("path.segments", path.segments);
    //     this.point = this.point.add(event.delta);
    //     points[index] = this.point;
    //     path1.segments[index].point = this.point;
    //   };
    // });

    path2 = new paper.Path({
      segments: points2,
      closed: true,
      fillColor: "red",
    });

    paper.view.draw();
  },
  methods: {
    clearPaths() {
      path1.remove();
      path2.remove();
    },
    performUnion(event) {
      console.log("perform", event);
      event.stopPropagation();
      const unionPath = path1.unite(path2);
      unionPath.fillColor = "green";

      //finde the intersection points
      console.log("the unionpath children is", unionPath.children);
      console.log("the unionpath segments is", unionPath.segments);

      const unionSegments = unionPath.segments.map((segment) => segment.point);

      let unionLineObjects = [];
      unionLineObjects = unionSegments.slice(0, -1).map((point, index) => {
        const startPoint = point;
        const endPoint = unionSegments[index + 1];

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

        function updateShapes() {
          line.segments[0].point = startCircle.position;
          line.segments[1].point = endCircle.position;
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
        };

        return {
          name: `Union Line ${index + 1}`,
          path: line,
          startPoint: startCircle,
          endPoint: endCircle,
        };
      });

      console.log(unionLineObjects);

      const unionCompoundPath = new paper.CompoundPath({
        children: unionLineObjects.map((lineObj) => lineObj.path),
        strokeColor: "black",
        strokeWidth: 8,
        fillColor: "green",
      });

      unionCompoundPath.onMouseDrag = function (event) {
        const delta = event.delta;
        unionLineObjects.forEach((lineObj) => {
          // lineObj.startPoint.position = lineObj.startPoint.position.add(delta);
          // lineObj.endPoint.position = lineObj.endPoint.position.add(delta);
          // lineObj.path.segments[0].point = lineObj.startPoint.position;
          // lineObj.path.segments[1].point = lineObj.endPoint.position;
        });
      };

      const newPath = new paper.Path({
        segments: unionSegments,
        closed: true,
        fillColor: "red",
      });

      let newLineObjects = [];
      newLineObjects = unionSegments.slice(0, -1).map((point, index) => {
        const startPoint = point;
        const endPoint = unionSegments[index + 1];

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

        function updateShapes() {
          line.segments[0].point = startCircle.position;
          line.segments[1].point = endCircle.position;
          newPath.segments[index].point = startCircle.position;
          newPath.segments[index + 1].point = endCircle.position;
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
          console.log("new line moveable event", event, line);
          const delta = event.delta;
          startCircle.position = startCircle.position.add(delta);
          endCircle.position = endCircle.position.add(delta);
          updateShapes();
        };

        return {
          name: `New Line ${index + 1}`,
          path: line,
          startPoint: startCircle,
          endPoint: endCircle,
        };
      });

      console.log(newLineObjects);

      unionPath.remove();
      path1.remove();
      path2.remove();
    },
    performDifference(event) {
      event.stopPropagation();
      const differencePath = path1.subtract(path2);
      differencePath.fillColor = "yellow";
      path1.remove();
      path2.remove();
    },
    performIntersection(event) {
      event.stopPropagation();
      const intersectionPath = path1.intersect(path2);
      intersectionPath.fillColor = "purple";
      path1.remove();
      path2.remove();
    },
  },
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
  /*
    // Ensure the paths are closed to fill the inner color
    lineObjects.forEach((lineObj) => {
      lineObj.path.closed = true;
    });

    const cp1 = new paper.CompoundPath({
      children: lineObjects.map((lineObj) => lineObj.path),
      strokeColor: "#90ff",
      strokeWidth: 20,
      fillColor: "#f0f",
    });

    cp1.onMouseDrag = function (event) {
      // const delta = event.delta;
      // lineObjects.forEach((lineObj) => {
      //   lineObj.startPoint.position = lineObj.startPoint.position.add(delta);
      //   lineObj.endPoint.position = lineObj.endPoint.position.add(delta);
      //   lineObj.path.segments[0].point = lineObj.startPoint.position;
      //   lineObj.path.segments[1].point = lineObj.endPoint.position;
      // });
    };
    */
  // const path = new paper.Path({
  //   segments: points,
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
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
  //   segment.onMouseDrag = function (event) {
  //     console.log("path.segments", path.segments);
  //     this.point = this.point.add(event.delta);
  //     points[index] = this.point;
  //     path.segments[index].point = this.point;
  //   };
  // });
  // const path1 = new paper.Path({
  //   segments: [
  //     lineObjects[0].startPoint.position,
  //     lineObjects[1].startPoint.position,
  //   ],
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
  // const path2 = new paper.Path({
  //   segments: [
  //     lineObjects[1].startPoint.position,
  //     lineObjects[2].startPoint.position,
  //   ],
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
  // const path3 = new paper.Path({
  //   segments: [
  //     lineObjects[2].startPoint.position,
  //     lineObjects[3].startPoint.position,
  //   ],
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
  // const path4 = new paper.Path({
  //   segments: [
  //     lineObjects[3].startPoint.position,
  //     lineObjects[4].startPoint.position,
  //   ],
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
  // const path5 = new paper.Path({
  //   segments: [
  //     lineObjects[4].startPoint.position,
  //     lineObjects[5].startPoint.position,
  //   ],
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
  // const path6 = new paper.Path({
  //   segments: [
  //     lineObjects[5].startPoint.position,
  //     lineObjects[0].startPoint.position,
  //   ],
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
  // const compoundPath = new paper.CompoundPath({
  //   children: [path1, path2, path3, path4, path5, path6],
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  // });
  // compoundPath.closed = true;
  // compoundPath.setClosed(true);
  // compoundPath.fillColor = "#f2f5";
  // compoundPath.children.forEach((path, index) => {
  //   path.onClick = function (event) {
  //     console.log("path clicked", index);
  //   };
  //   path.onMouseDrag = function (event) {
  //     const delta = event.delta;
  //     lineObjects[index].startPoint.position =
  //       lineObjects[index].startPoint.position.add(delta);
  //     lineObjects[index].endPoint.position =
  //       lineObjects[index].endPoint.position.add(delta);
  //     lineObjects[index].path.segments[0].point =
  //       lineObjects[index].startPoint.position;
  //     lineObjects[index].path.segments[1].point =
  //       lineObjects[index].endPoint.position;
  //   };
  // });
  // const polygon = new paper.Path({
  //   segments: points,
  //   strokeColor: "black",
  //   strokeWidth: 8,
  //   fillColor: "#f2f5",
  //   closed: true,
  // });
  // // Enable dragging for each point in the polygon
  // points.forEach((point, index) => {
  //   const circle = new paper.Path.Circle({
  //     center: point,
  //     radius: 10,
  //     fillColor: "yellow",
  //   });
  //   circle.onMouseDrag = function (event) {
  //     this.position = this.position.add(event.delta);
  //     polygon.segments[index].point = this.position;
  //   };
  // });
  // Draw the shapes on the canvas
  // compoundPath.onMouseDrag = function (event) {
  //   const delta = event.delta;
  //   lineObjects.forEach((lineObj) => {
  //     lineObj.startPoint.position = lineObj.startPoint.position.add(delta);
  //     lineObj.endPoint.position = lineObj.endPoint.position.add(delta);
  //     lineObj.path.segments[0].point = lineObj.startPoint.position;
  //     lineObj.path.segments[1].point = lineObj.endPoint.position;
  //   });
  // };
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
};
</script>

<style scoped>
canvas {
  border: 1px solid black;
}
.buttons {
  position: absolute;
  top: 20px;
  left: 100px;
}
</style>
