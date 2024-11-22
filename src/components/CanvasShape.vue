<template>
  <div ref="canvasContainer" class="canvas-container">
    <canvas :id="`canvas${item.id}`" ref="canvas" resize stats class="canvas-normal"></canvas>
    <!-- <canvas :id="`hidCanvas${item.id}`" ref="hidCanvas" resize stats class="canvas-hid"></canvas> -->
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import paper from 'paper';

export default {
  name: 'CanvasShape',
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  emits: ["updateWeldModel"],
  setup(props, { emit }) {
    const canvasContainer = ref(null);
    const canvas = ref(null);
    const project = ref(null);
    // const hidCanvas = ref(null);
    // const hidProject = ref(null);

    const initCanvas = () => {
      const canvasEl = document.getElementById(`canvas${props.item.id}`);
      project.value = new paper.Project(canvasEl);
      project?.value?.clear();

      paper.settings.insertItems = false;
      resizeCanvas();
    };

    const resizeCanvas = () => {
      const canvasEl = canvas.value;
      // const hidCanvasEl = hidCanvas.value;

      if (canvasEl) {
        const { width, height } = props.item;
        const ratio = window.devicePixelRatio || 1;

        canvasEl.width = width;//* ratio;
        canvasEl.height = height;// * ratio;
        canvasEl.style.width = `${width}px`;
        canvasEl.style.height = `${height}px`;

        // hidCanvasEl.width = width * ratio;
        // hidCanvasEl.height = height * ratio;
        // hidCanvasEl.style.width = `${width}px`;
        // hidCanvasEl.style.height = `${height}px`;

        // paper.view.viewSize = new paper.Size(canvasEl.width, canvasEl.height);
        project.value.view.viewSize = new paper.Size(canvasEl.width, canvasEl.height);
        draw();
      }
    };

    const gRectangle = (rdType, item, width, height, trsXY) => {
      const { settings, rotate } = item;

      const factor = rdType == "weld" ? 8 : 4;
      const rectangle = new paper.Path.Rectangle({
        point: trsXY,// [2, 2],
        size: [width - factor, height - factor],//[width - 4, height - 4],
        strokeColor: settings.bgColor || '#000',
        strokeWidth: 2,
        fillColor: settings.fillColor,
      });

      if (rdType == "weld") {
        if (rotate) {
          rectangle.rotate(rotate);
        }
      }

      return rectangle;
    }

    const gCircle = (rdType, item, width, height, trsXY) => {
      const { settings, rotate } = item;

      const factor = rdType == "weld" ? 8 : 4;
      const centerX = (width / 2) + trsXY[0];
      const centerY = (height / 2) + trsXY[1];

      const circle = new paper.Path.Circle({
        center: [centerX, centerY],
        radius: Math.min(width - factor, height - factor) / 2,
        strokeColor: settings.bgColor || '#000',
        strokeWidth: 2,
        fillColor: settings.fillColor,
      });

      return circle;
    }

    const gStep = (rdType, item, width, height, trsXY) => {
      const { settings, rotate } = item;

      const strokeWidth = 1;
      const svgStr =
        `<svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            height="${height}"
            width="${width}"
            version="1.1">
            <path d="M 1.6 5.4 L 25.6 5.4 L 30.4 15 L 25.6 24.6 L 1.6 24.6 L 6.4 15 Z" fill="${settings.fillColor}" stroke="${settings.bgColor || '#000'}"
              stroke-width="${strokeWidth}" stroke-miterlimit="10"></path>
          </svg>
          `;
      const step = loadSvgString(svgStr);
      // console.log('CanvasShape.vue->gStep', step);
      return step;
    }

    const gHexagon = (rdType, item, width, height, trsXY) => {
      const { settings, rotate } = item;

      const strokeWidth = 1;
      const svgStr =
        `<svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            height="${height}"
            width="${width}"
            version="1.1">
            <path d="M 6.4 5.4 L 25.6 5.4 L 30.4 15 L 25.6 24.6 L 6.4 24.6 L 1.6 15 Z" fill="${settings.fillColor}" stroke="${settings.bgColor || '#000'}"
              stroke-width="${strokeWidth}" stroke-miterlimit="10">
            </path>
         </svg>
        `;
      const step = loadSvgString(svgStr);
      // console.log('CanvasShape.vue->gStep', step);
      return step;
    }

    const gDuct = (rdType, item, pathPoints, width, height, trsXY) => {
      const { settings, rotate } = item;

      /*
      const factor = rdType == "weld" ? 8 : 4;
      const centerX = (width / 2) + trsXY[0];
      const centerY = (height / 2) + trsXY[1];
      */

      // console.log('CanvasShape.vue->gDuct|settings', settings.bgColor, settings.fillColor);

      const path = new paper.Path({
        segments: pathPoints,
        closed: true,
        strokeColor: '#000',// settings.bgColor || '#000',
        strokeWidth: 2,
        fillColor: "#659dc5",//settings.fillColor || "#659dc5",
      });

      if (rotate) {
        path.rotate(rotate);
      }

      return path;
    }

    const loadSvgString = (svgString) => {
      return paper.project.importSVG(svgString, { applyMatrix: false });
    };

    // Render single shape
    // Selected items from IndexPage.vue
    const renderSingleShape = (items) => {
      items?.map((item, index) => {
        const { width, height, weldModel, cat, type, settings } = item;
        const shapes = [];

        switch (type) {
          case "G_Rectangle":
            shapes.push(gRectangle('', item, width, height, [2, 2]));
            break;
          case "G_Circle":
            shapes.push(gCircle('', item, width, height, [2, 2]));
            break;
          case "G_Step":
            shapes.push(gStep('', item, width, height, [2, 2]));
            break;
          case "G_Hexagon":
            shapes.push(gHexagon('', item, width, height, [2, 2]));
            break;
        }

        shapes?.map((shape, index) => {
          project.value.activeLayer.addChild(shape);
        });
      });
    };

    // Recalculate the shapes' translate and size
    const defaultWidth = ref(props.item.width);
    const defaultHeight = ref(props.item.height);
    const defaultColor = ref(props.item.settings.fillColor);

    const calculateScale = () => {
      const widthScale = props.item.width / defaultWidth.value;
      const heightScale = props.item.height / defaultHeight.value;
      const trsXScale = props.item.translate[0] / defaultWidth.value;
      const trsYScale = props.item.translate[1] / defaultHeight.value;
      return { widthScale, heightScale, trsXScale, trsYScale };
    }

    const minX = ref(0);
    const minY = ref(0);

    // Calculate the new size of the shape when canvas or parent div client rect changed
    const calculateNewSize = (weldItems, currentItem) => {

      // Find the min x and y of the shapes
      minX.value = Math.min(...weldItems.map(item => item.translate[0]));
      minY.value = Math.min(...weldItems.map(item => item.translate[1]));

      // Calculate the scale of the shapes
      const scaleWHXY = calculateScale();

      // console.log('CanvasShape.vue->calculateNewSize|default w h c', defaultWidth.value, defaultHeight.value, defaultColor.value, props.item.width, props.item.height);
      // console.log('CanvasShape.vue->calculateNewSize|min x y', minX, minY);

      let { width, height, cat, type, translate } = currentItem;
      let [trsx, trsy] = translate;

      // 4 pixels for drawing the start and end points circle
      let currentTrsx = trsx - minX.value + 4;
      let currentTrsy = trsy - minY.value + 4;

      // Resize the width and height
      width = width * scaleWHXY.widthScale;
      height = height * scaleWHXY.heightScale;

      trsx *= scaleWHXY.widthScale;
      trsy *= scaleWHXY.heightScale;
      trsx -= minX.value * scaleWHXY.widthScale;
      trsy -= minY.value * scaleWHXY.heightScale;

      currentTrsx = trsx + 4;
      currentTrsy = trsy + 4;

      return { width, height, trsx: currentTrsx, trsy: currentTrsy };
    }

    // Calcuate the duct new points data
    const calculateDuctPathPoints = (weldItems, currentItem) => {

      let { width, height, cat, type, translate, rotate, overlap } = currentItem;
      let [trsx, trsy] = translate;
      const { isStartOverlap, isEndOverlap } = overlap;

      // Calculate the start svg and end svg width
      const getArrowSvgWidth = () => {

        let startW = 25;
        let endW = 25;
        let middle = 0;

        if (width > 50) {
          if (width < 80) {
            startW = endW = width / 2;
          }
          else {
            startW = 40;
            endW = 40;
            middle = (width - 80);
          }
        }

        return { startW, middle, endW };
      }

      const getPathPoints = (startX, startY) => {
        const pointArray = [];

        // const startX = translate[0];
        // const startY = translate[1];
        const svgWidth = getArrowSvgWidth();

        // 1st
        const p1 = [startX, startY];
        pointArray.push(p1);

        // 2nd
        const p21 = [startX + svgWidth.startW, startY + (height / 2)];
        const p22 = [startX, startY + height];

        if (isStartOverlap) {
          pointArray.push(p22);
        }
        else {
          pointArray.push(p21);
          pointArray.push(p22);
        }

        // 3rd
        const p31 = [startX + svgWidth.startW + svgWidth.middle, startY + height];
        const p32 = [startX + width, startY + height];

        if (isEndOverlap) {
          pointArray.push(p32);
        }
        else {
          pointArray.push(p31);
        }

        // 4th
        const p4 = [startX + width, startY + (height / 2)];

        if (!isEndOverlap) {
          pointArray.push(p4);
        }

        // 5th
        const p51 = [startX + width, startY];
        const p52 = [startX + svgWidth.startW + svgWidth.middle, startY];

        if (isEndOverlap) {
          pointArray.push(p51);
        }
        else {
          pointArray.push(p52);
        }

        // console.log(`IndexPage.vue->calculateDuctPathPoints->--#moveable-item-${currentItem.id}-----`);
        // console.log(`IndexPage.vue->calculateDuctPathPoints->--isStartOverlap,isEndOverlap`, isStartOverlap, isEndOverlap);
        // console.log('IndexPage.vue->calculateDuctPathPoints->--pointArray', pointArray);
        // console.log('IndexPage.vue->calculateDuctPathPoints->------------------------------------------------');

        // Make the shape closed
        pointArray.push(p1);

        return pointArray;
      }

      const minX = Math.min(...weldItems.map(item => item.translate[0]));
      const minY = Math.min(...weldItems.map(item => item.translate[1]));

      const scaleWHXY = calculateScale();

      // 4 pixels for drawing the start and end points circle
      let currentTrsx = trsx - minX + 4;
      let currentTrsy = trsy - minY + 4;

      // Resize the width and height
      width = width * scaleWHXY.widthScale;
      height = height * scaleWHXY.heightScale;

      trsx *= scaleWHXY.widthScale;
      trsy *= scaleWHXY.heightScale;
      trsx -= minX * scaleWHXY.widthScale;
      trsy -= minY * scaleWHXY.heightScale;

      currentTrsx = trsx + 4;
      currentTrsy = trsy + 4;

      const pts = getPathPoints(currentTrsx, currentTrsy);

      return { pathPoints: pts, width, height, trsx: currentTrsx, trsy: currentTrsy };
    }

    const getWeldPathItems = (weldItems) => {
      const pathItemList = weldItems?.map((item, index) => {
        let pathItem = null;
        const newSize = calculateNewSize(weldItems, item);

        switch (item.type) {
          case "G_Rectangle":
            pathItem = gRectangle('weld', item, newSize.width, newSize.height, [newSize.trsx, newSize.trsy]);
            break;
          case "G_Circle":
            pathItem = gCircle('weld', item, newSize.width, newSize.height, [newSize.trsx, newSize.trsy]);
            break;
          case "G_Step":
            pathItem = gStep('weld', item, newSize.width, newSize.height, [newSize.trsx, newSize.trsy]);
            break;
          case "G_Hexagon":
            pathItem = gHexagon('weld', item, newSize.width, newSize.height, [newSize.trsx, newSize.trsy]);
            break;
          case "Duct":
            const pts = calculateDuctPathPoints(weldItems, item);
            pathItem = gDuct('weld', item, pts.pathPoints, newSize.width, newSize.height, [newSize.trsx, newSize.trsy]);
            break;
        }

        return {
          type: item.type, pathItem: pathItem, item: item,
          newPos: { width: newSize.width, height: newSize.height, trsx: newSize.trsx - 4, trsy: newSize.trsy - 4 }
        }
      });

      return pathItemList;
    }

    const loadAllPathsFromItem = (item) => {
      let paths = [];
      if (item instanceof paper.Path || item instanceof paper.CompoundPath || item instanceof paper.Path.Circle) {
        paths.push(item);
      } else if (item instanceof paper.Group) {
        item.children.forEach(child => {
          paths = paths.concat(loadAllPathsFromItem(child));
        });
      } else if (item?.children) {
        item?.children.forEach(child => {
          paths = paths.concat(loadAllPathsFromItem(child));
        });
      }
      return paths;
    };

    const uniteArrayPaths = (shapesArray) => {
      let combinedPath = null;
      const processShape = (shape) => {
        if (shape instanceof paper.Path || paper.ClipPath) {

          if (combinedPath) {
            combinedPath = combinedPath.unite(shape, { insert: true });
          } else {
            combinedPath = shape;
          }
        } else if (shape instanceof paper.Group) {
          shape.children.forEach(child => processShape(child));
        } else if (shape instanceof paper.CompoundPath) {
          shape.children.forEach(child => processShape(child));
        }
      };

      shapesArray.forEach(shape => processShape(shape));
      return combinedPath;
    };

    const transferToLinePoints = (pathItemList) => {
      /*
      pathItemList.map((item, index) => {
        console.log('CanvasShape.vue->transferToLinePoints|item', item.type, item.pathItem);
      });
      */

      const allPaPoints = pathItemList.flatMap(item => {
        const paths = loadAllPathsFromItem(item.pathItem);
        const points = paths.flatMap(path => path.segments.map(segment => segment.point));
        const paperPoints = points.map(point => new paper.Point(point));

        // make line closed
        paperPoints.push(paperPoints[0]);

        return { type: item.type, points: paperPoints }
      });
      return allPaPoints;
    }

    // Draw shape base on paper points
    // weldPath was used for controlling the lines's moveable events to dynamically fill the updated shape's inner color
    const getLinePointObjects = (points) => {
      let lpos = [];
      points.slice(0, -1).map((point, index) => {

        const startPoint = point;
        const endPoint = points[index + 1];
        const radius = 4;
        const strokeWidth = 2;

        const startCircle = new paper.Path.Circle({
          center: startPoint,
          radius: radius,
          fillColor: "#4af",// aqua, #4af, "#000", "red"
        });

        const endCircle = new paper.Path.Circle({
          center: endPoint,
          radius: radius,
          fillColor: "#4af",// aqua, #4af, "#000", "red"
        });

        const line = new paper.Path.Line({
          from: startPoint,
          to: endPoint,
          strokeColor: "#000",
          strokeWidth: strokeWidth,
          fillColor: "#f36dc5",
          // dashArray: [5, 2],
        });

        lpos.push({
          name: `Path Line ${index + 1}`,
          path: line,
          startPoint: startCircle,
          endPoint: endCircle,
        });
      });
      return lpos;
    }

    const addLinePointObjectsEvent = (item, lpos, index, weldPath, crossItemList) => {

      const startCircle = item.startPoint;
      const endCircle = item.endPoint;
      const line = item.path;

      function makePreviousContinue() {
        if (index > 0) {
          const previousLine = lpos[index - 1];
          previousLine.endPoint.position = startCircle.position;
          previousLine.path.segments[1].point = startCircle.position;
        } else {
          const lastLine = lpos[lpos.length - 1];
          lastLine.endPoint.position = startCircle.position;
          lastLine.path.segments[1].point = startCircle.position;
        }
      }

      function makeNextContinue() {
        if (index === lpos.length - 1) {
          const firstLine = lpos[0];
          firstLine.startPoint.position = endCircle.position;
          firstLine.path.segments[0].point = endCircle.position;
        } else {
          const nextLine = lpos[index + 1];
          nextLine.startPoint.position = endCircle.position;
          nextLine.path.segments[0].point = endCircle.position;
        }
      }

      function updateWeldPath(itemType) {
        if (weldPath !== null) {

          /*
          console.log(`---------------start--${itemType}--------------------------`);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.segments', weldPath.segments.map(segment => [segment.point.x, segment.point.y]));
          console.log('CanvasShape.vue->updateWeldPath|weldPath.index , index + 1', index, index + 1, points.length, weldPath.segments.length);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.[index].point', [weldPath.segments[index].point.x, weldPath.segments[index].point.y]);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.startCircle.position', [startCircle.position.x, startCircle.position.y]);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.[index + 1].point', [weldPath.segments[index + 1].point.x, weldPath.segments[index + 1].point.y]);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.endCircle.position', [endCircle.position.x, endCircle.position.y]);
          console.log(`---------------end--${itemType}----------------------------`);
          */

          weldPath.segments[index].point = startCircle.position;
          weldPath.segments[index + 1].point = endCircle.position;

          // console.log('**************', index + 2, index + 2 == weldPath.segments.length);

          // Make the welded path's start point move along with the end position of the last line
          if (index + 2 == weldPath.segments.length) {
            // console.log('|||||||||||||||||||||||||||||', weldPath.segments[0].point.x, weldPath.segments[0].point.y);
            weldPath.segments[0].point = endCircle.position;
          }

          if (index == 0) {
            weldPath.segments[weldPath.segments.length - 1].point = startCircle.position;
          }
        }
      }

      function updateShapes() {
        line.segments[0].point = startCircle.position;
        line.segments[1].point = endCircle.position;
      }

      function updatePreviousLine(newLocation) {
        if (index > 0) {
          const previousLine = lpos[index - 1];
          previousLine.endPoint.position = newLocation;
          previousLine.path.segments[1].point = newLocation;
        } else {
          const lastLine = lpos[lpos.length - 1];
          lastLine.endPoint.position = newLocation;
          lastLine.path.segments[1].point = newLocation;
        }
      }

      function updateNextLine(newLocation) {
        if (index === lpos.length - 1) {
          const firstLine = lpos[0];
          firstLine.startPoint.position = newLocation;
          firstLine.path.segments[0].point = newLocation;
        } else {
          const nextLine = lpos[index + 1];
          nextLine.startPoint.position = newLocation;
          nextLine.path.segments[0].point = newLocation;
        }
      }

      function updateCrossLine(type) {
        if (crossItemList === null) {
          return;
        }

        // Find the related point index from the cross path
        const { crossStartIndex, crossEndIndex } = item.crossPathIndex;
        const { crossedStartIndex, crossedEndIndex } = item.crossedPathIndex;

        crossItemList.forEach((crossItem, crossIndex) => {
          const { crossPath, crossLinePoints } = crossItem;

          /*
          console.log('AAAAAAAAAAAAA crossPath', crossItem.crossPath);
          console.log('AAAAAAAAAAAAA cross start path', crossPath.segments[crossStartIndex].point);
          console.log('AAAAAAAAAAAAA cross end path', crossPath.segments[crossEndIndex].point);
          console.log('AAAAAAAAAAAAA cross start point', crossLinePoints[crossedStartIndex]);
          console.log('AAAAAAAAAAAAA cross end point', crossLinePoints[crossedEndIndex]);
          console.log('AAAAAAAAAAAAA cross crossStartIndex，crossEndIndex', crossStartIndex, crossEndIndex);
          */

          // path
          if (crossPath.segments[crossStartIndex] !== null && crossPath.segments[crossStartIndex] !== undefined) {
            crossPath.segments[crossStartIndex].point = startCircle.position;
          }

          if (crossPath.segments[crossEndIndex] !== null && crossPath.segments[crossEndIndex] !== undefined) {
            crossPath.segments[crossEndIndex].point = endCircle.position;
          }

          crossPath.segments[crossPath.segments.length - 1].point = crossPath.segments[0].point;

          // point list
          if (crossLinePoints[crossedStartIndex] !== null && crossLinePoints[crossedStartIndex] !== undefined) {
            crossLinePoints[crossedStartIndex].startPoint.position = startCircle.position;
            crossLinePoints[crossedStartIndex].path.segments[0].point = startCircle.position;
          }

          if (crossLinePoints[crossedEndIndex] !== null && crossLinePoints[crossedEndIndex] !== undefined) {
            crossLinePoints[crossedEndIndex].endPoint.position = endCircle.position;
            crossLinePoints[crossedEndIndex].path.segments[1].point = endCircle.position;
          }

          // Set the previous end point move along with the current start position
          if (crossLinePoints[crossedStartIndex - 1] != null && crossLinePoints[crossedStartIndex - 1] != undefined) {
            crossLinePoints[crossedStartIndex - 1].endPoint.position = startCircle.position;
            crossLinePoints[crossedStartIndex - 1].path.segments[1].point = startCircle.position;
          }

          if (crossEndIndex !== -1) {
            if (crossLinePoints[crossedEndIndex + 1] != null && crossLinePoints[crossedEndIndex + 1] != undefined) {
              crossLinePoints[crossedEndIndex + 1].startPoint.position = endCircle.position;
            }
          }

          // always make the last point move along with the first point
          if (crossLinePoints[crossLinePoints.length - 1] !== null && crossLinePoints[crossLinePoints.length - 1] !== undefined) {
            crossLinePoints[crossLinePoints.length - 1].endPoint.position = crossLinePoints[0].startPoint.position;
          }
        })
      }

      startCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
        updateWeldPath(`startCircle=>[x=${this.position.x},y=${this.position.y}]`);
        makePreviousContinue();
        updateCrossLine("startCircle");
      };

      endCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
        updateWeldPath(`endCircle=>[x=${this.position.x},y=${this.position.y}]`);
        makeNextContinue();
        updateCrossLine("endCircle");
      };

      line.onMouseDrag = function (event) {
        const delta = event.delta;
        startCircle.position = startCircle.position.add(delta);
        endCircle.position = endCircle.position.add(delta);
        updateShapes();
        updateWeldPath(`line=>[x=${startCircle.position.x},y=${startCircle.position.y}], [x=${endCircle.position.x},y=${endCircle.position.y}]`);
        updatePreviousLine(startCircle.position);
        updateNextLine(endCircle.position);
        updateCrossLine("line");
      };
    }

    const addLinePointCrossObjectsEvent = (item, lpos, index, weldPath, crossPath, weldedLinePoints) => {
      function makePreviousContinue() {
        if (index > 0) {
          const previousLine = lpos[index - 1];
          previousLine.endPoint.position = startCircle.position;
          previousLine.path.segments[1].point = startCircle.position;
        } else {
          const lastLine = lpos[lpos.length - 1];
          lastLine.endPoint.position = startCircle.position;
          lastLine.path.segments[1].point = startCircle.position;
        }
      }

      function makeNextContinue() {
        if (index === lpos.length - 1) {
          const firstLine = lpos[0];
          firstLine.startPoint.position = endCircle.position;
          firstLine.path.segments[0].point = endCircle.position;
        } else {
          const nextLine = lpos[index + 1];
          nextLine.startPoint.position = endCircle.position;
          nextLine.path.segments[0].point = endCircle.position;
        }
      }

      function updateCrossPath(itemType) {
        if (crossPath !== null) {

          /*
          console.log(`---------------start--${itemType}--------------------------`);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.segments', weldPath.segments.map(segment => [segment.point.x, segment.point.y]));
          console.log('CanvasShape.vue->updateWeldPath|weldPath.index , index + 1', index, index + 1, points.length, weldPath.segments.length);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.[index].point', [weldPath.segments[index].point.x, weldPath.segments[index].point.y]);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.startCircle.position', [startCircle.position.x, startCircle.position.y]);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.[index + 1].point', [weldPath.segments[index + 1].point.x, weldPath.segments[index + 1].point.y]);
          console.log('CanvasShape.vue->updateWeldPath|weldPath.endCircle.position', [endCircle.position.x, endCircle.position.y]);
          console.log(`---------------end--${itemType}----------------------------`);
          */

          crossPath.segments[index].point = startCircle.position;
          crossPath.segments[index + 1].point = endCircle.position;

          // console.log('**************', index + 2, index + 2 == weldPath.segments.length);

          // Make the welded path's start point move along with the end position of the last line
          if (index + 2 == crossPath.segments.length) {
            // console.log('|||||||||||||||||||||||||||||', weldPath.segments[0].point.x, weldPath.segments[0].point.y);
            crossPath.segments[0].point = endCircle.position;
          }

          if (index == 0) {
            crossPath.segments[crossPath.segments.length - 1].point = startCircle.position;
          }
        }
      }

      function updateShapes() {
        line.segments[0].point = startCircle.position;
        line.segments[1].point = endCircle.position;
      }

      function updatePreviousLine(newLocation) {
        if (index > 0) {
          const previousLine = lpos[index - 1];
          previousLine.endPoint.position = newLocation;
          previousLine.path.segments[1].point = newLocation;
        } else {
          const lastLine = lpos[lpos.length - 1];
          lastLine.endPoint.position = newLocation;
          lastLine.path.segments[1].point = newLocation;
        }
      }

      function updateNextLine(newLocation) {
        if (index === lpos.length - 1) {
          const firstLine = lpos[0];
          firstLine.startPoint.position = newLocation;
          firstLine.path.segments[0].point = newLocation;
        } else {
          const nextLine = lpos[index + 1];
          nextLine.startPoint.position = newLocation;
          nextLine.path.segments[0].point = newLocation;
        }
      }

      const startCircle = item.startPoint;
      const endCircle = item.endPoint;
      const line = item.path;

      startCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
        updateCrossPath(`startCircle=>[x=${this.position.x},y=${this.position.y}]`);
        makePreviousContinue();
      };

      endCircle.onMouseDrag = function (event) {
        this.position = this.position.add(event.delta);
        updateShapes();
        updateCrossPath(`endCircle=>[x=${this.position.x},y=${this.position.y}]`);
        makeNextContinue();
      };

      line.onMouseDrag = function (event) {
        const delta = event.delta;
        startCircle.position = startCircle.position.add(delta);
        endCircle.position = endCircle.position.add(delta);
        updateShapes();
        updateCrossPath(`line=>[x=${startCircle.position.x},y=${startCircle.position.y}], [x=${endCircle.position.x},y=${endCircle.position.y}]`);
        updatePreviousLine(startCircle.position);
        updateNextLine(endCircle.position);
      };

      // Cross path moveable events
      crossPath.onMouseDrag = function (event) {

        const delta = event.delta;
        crossPath.position.x += delta.x;

        // console.log('CCCCCC 1 cross-current', [item.startPoint.position.x, item.startPoint.position.y], [item.endPoint.position.x, item.endPoint.position.y]);

        lpos.map((itm, index) => {

          // console.log(`CCCCCC -------${index} start------------------`)
          // console.log(`CCCCCC 2 cross-${index}`, [itm.startPoint.position.x, itm.startPoint.position.y], [itm.endPoint.position.x, itm.endPoint.position.y]);

          itm.startPoint.position.x += delta.x;
          itm.endPoint.position.x += delta.x;
          itm.path.segments[0].point.x = itm.startPoint.position.x;
          itm.path.segments[1].point.x = itm.endPoint.position.x;

          const { weldStartIndex, weldEndIndex } = itm.weldPathIndex;
          const { weldedStartIndex, weldedEndIndex } = itm.weldedPathIndex;

          /*
          console.log('CCCCCC 3 weld',
            [weldPath.segments[weldStartIndex].point.x, weldPath.segments[weldStartIndex].point.y],
            [weldPath.segments[weldEndIndex].point.x, weldPath.segments[weldEndIndex].point.y]
          );

          console.log('CCCCCC 4 weld-point',
            [weldedLinePoints[weldedStartIndex].startPoint.position.x, weldedLinePoints[weldedStartIndex].startPoint.position.y],
            [weldedLinePoints[weldedEndIndex].endPoint.position.x, weldedLinePoints[weldedEndIndex].endPoint.position.y]
          );

          console.log(`CCCCCC -------${index} end------------------`)
          */

          if (weldPath.segments[weldStartIndex] !== null && weldPath.segments[weldStartIndex] !== undefined) {
            weldPath.segments[weldStartIndex].point = itm.startPoint.position;
          }

          if (weldPath.segments[weldEndIndex] !== null && weldPath.segments[weldEndIndex] !== undefined) {
            weldPath.segments[weldEndIndex].point = itm.endPoint.position;
          }

          if (weldedLinePoints[weldedStartIndex] !== null && weldedLinePoints[weldedStartIndex] !== undefined) {
            weldedLinePoints[weldedStartIndex].startPoint.position = itm.startPoint.position;
            weldedLinePoints[weldedStartIndex].path.segments[0].point = itm.startPoint.position;
          }
          if (weldedLinePoints[weldedEndIndex] !== null && weldedLinePoints[weldedEndIndex] !== undefined) {
            weldedLinePoints[weldedEndIndex].endPoint.position = itm.endPoint.position;
            weldedLinePoints[weldedEndIndex].path.segments[1].point = itm.endPoint.position;
          }
        });
      };
    }

    const setRelatedIndex = (crossLinePoints, weldedLinePoints, weldPath, crossPath) => {
      crossLinePoints.map((lp, index) => {

        const startCircle = lp.startPoint;
        const endCircle = lp.endPoint;

        const weldStartIndex = weldPath.segments.findIndex(segment =>
          segment.point.x.toFixed(4) === startCircle.position.x.toFixed(4) &&
          segment.point.y.toFixed(4) === startCircle.position.y.toFixed(4)
        );

        const weldEndIndex = weldPath.segments.findIndex(segment =>
          segment.point.x.toFixed(4) === endCircle.position.x.toFixed(4) &&
          segment.point.y.toFixed(4) === endCircle.position.y.toFixed(4)
        );

        const weldedStartIndex = weldedLinePoints.findIndex(weldedLinePoint =>
          weldedLinePoint.startPoint.position.x.toFixed(4) === startCircle.position.x.toFixed(4) &&
          weldedLinePoint.startPoint.position.y.toFixed(4) === startCircle.position.y.toFixed(4)
        );

        const weldedEndIndex = weldedLinePoints.findIndex(weldedLinePoint =>
          weldedLinePoint.endPoint.position.x.toFixed(4) === endCircle.position.x.toFixed(4) &&
          weldedLinePoint.endPoint.position.y.toFixed(4) === endCircle.position.y.toFixed(4)
        );

        lp.weldPathIndex = { weldStartIndex: weldStartIndex, weldEndIndex: weldEndIndex };
        lp.weldedPathIndex = { weldedStartIndex: weldedStartIndex, weldedEndIndex: weldedEndIndex };
      });

      weldedLinePoints.map((lp, index) => {
        const startCircle = lp.startPoint;
        const endCircle = lp.endPoint;

        const crossStartIndex = crossPath.segments.findIndex(segment =>
          segment.point.x.toFixed(4) === startCircle.position.x.toFixed(4) &&
          segment.point.y.toFixed(4) === startCircle.position.y.toFixed(4)
        );

        const crossEndIndex = crossPath.segments.findIndex(segment =>
          segment.point.x.toFixed(4) === endCircle.position.x.toFixed(4) &&
          segment.point.y.toFixed(4) === endCircle.position.y.toFixed(4)
        );

        const crossedStartIndex = crossLinePoints.findIndex(crossLinePoint =>
          crossLinePoint.startPoint.position.x.toFixed(4) === startCircle.position.x.toFixed(4) &&
          crossLinePoint.startPoint.position.y.toFixed(4) === startCircle.position.y.toFixed(4)
        );

        const crossedEndIndex = crossLinePoints.findIndex(crossLinePoint =>
          crossLinePoint.endPoint.position.x.toFixed(4) === endCircle.position.x.toFixed(4) &&
          crossLinePoint.endPoint.position.y.toFixed(4) === endCircle.position.y.toFixed(4)
        );

        lp.crossPathIndex = { crossStartIndex: crossStartIndex, crossEndIndex: crossEndIndex };
        lp.crossedPathIndex = { crossedStartIndex: crossedStartIndex, crossedEndIndex: crossedEndIndex };
      })
    }

    const getLinePointCrossObjects = (crossPoints) => {

      let lpos = [];
      crossPoints.slice(0, -1).map((point, index) => {
        const startPoint = point;
        const endPoint = crossPoints[index + 1];
        const radius = 4;
        const strokeWidth = 2;

        const startCircle = new paper.Path.Circle({
          center: startPoint,
          radius: radius,
          fillColor: "#4af",// #4af, aqua, #000,
        });

        const endCircle = new paper.Path.Circle({
          center: endPoint,
          radius: radius,
          fillColor: "#4af",// #4af, aqua, #000,
        });

        const line = new paper.Path.Line({
          from: startPoint,
          to: endPoint,
          strokeColor: "#000",
          strokeWidth: strokeWidth,
          fillColor: "green",// #f36dc5
          // dashArray: [5, 2],
        });

        lpos.push({
          name: `Cross Path Line ${index + 1}`,
          path: line,
          startPoint: startCircle,
          endPoint: endCircle
        });
      });

      return lpos;
    }

    const makeNewPath = (allPaPoints) => {
      const newPathList = allPaPoints.map((itm, index) => {
        const path = new paper.Path({
          segments: itm.points,
          closed: true,
          strokeColor: '#000',
          fillColor: '#f36dc5',
        });
        return path;
      });
      return newPathList;
    }

    // Render welded shape base on compound path
    const renderWeldedShape = (weldSegments, crossPointList) => {

      const check = weldSegments !== null && weldSegments != undefined && weldSegments.length > 0;

      if (!check) {
        return;
      }

      const weldPath = new paper.Path({
        segments: weldSegments,
        closed: true,
        fillColor: "#659dc5",// #f36dc5
      });


      const weldedLinePoints = getLinePointObjects(weldSegments);

      const crossItemList = crossPointList.map((cpt, index) => {
        const crossPath = new paper.Path({
          segments: cpt.pts,
          closed: true,
          fillColor: "#659dc5",// #f36dc5
        });

        const crossLinePoints = getLinePointCrossObjects(cpt.pts);
        setRelatedIndex(crossLinePoints, weldedLinePoints, weldPath, crossPath);

        crossLinePoints.map((item, index) => {
          addLinePointCrossObjectsEvent(item, crossLinePoints, index, weldPath, crossPath, weldedLinePoints);
        });

        return { crossPath: crossPath, crossLinePoints: crossLinePoints };
      });

      weldedLinePoints.map((item, index) => {
        addLinePointObjectsEvent(item, weldedLinePoints, index, weldPath, crossItemList);
      })

      project.value.activeLayer.addChild(weldPath);

      crossItemList.map((item, index) => {
        project?.value?.activeLayer?.addChild(item.crossPath);

        /*
        item.crossLinePoints.map((pt, idx) => {
          project?.value?.activeLayer?.addChild(pt.startPoint);
          project?.value?.activeLayer?.addChild(pt.endPoint);
        });
        */
      });

      weldedLinePoints.map((itm, index) => {
        project?.value?.activeLayer?.addChild(itm.path);
        project?.value?.activeLayer?.addChild(itm.startPoint);
        project?.value?.activeLayer?.addChild(itm.endPoint);
      });
    };

    const checkIfShapesCross = (allPaPoints) => {
      let previousMaxX = -Infinity;
      let previousMaxY = -Infinity;

      for (const item of allPaPoints) {
        const currentMinX = Math.min(...item.points.map(point => point?.x));
        const currentMinY = Math.min(...item.points.map(point => point?.y));

        if (currentMinX > previousMaxX || currentMinY > previousMaxY) {
          previousMaxX = Math.max(...item.points.map(point => point?.x));
          previousMaxY = Math.max(...item.points.map(point => point?.y));
        } else {
          return true;
        }
      }

      return false;
    };

    // Render weld or multiple shapes
    const renderWeldShapes = () => {
      const { weldItems } = props.item;

      const pathItemList = getWeldPathItems(weldItems);
      emit("updateWeldModel", props.item, pathItemList);

      // remerber the previous width and height
      defaultWidth.value = props.item.width;
      defaultHeight.value = props.item.height;

      minX.value = Math.min(...props.item.weldItems.map(item => item.translate[0]));
      minY.value = Math.min(...props.item.weldItems.map(item => item.translate[1]))

      const allPaPoints = transferToLinePoints(pathItemList);

      // Check whether the selected shapes can be welded
      const isOverLapped = checkIfShapesCross(allPaPoints);

      if (!isOverLapped) {
        // if the selected shapes cannot be welded, render the shapes separately
        pathItemList.map((itm, index) => {
          project.value.activeLayer.addChild(itm.pathItem);
        });

        return;
      }

      // Redraw the shapes need to be welded, and make the lines and points moveable
      // Only for debugging
      /*
      allPaPoints.map((itm, index) => {
        const lpos = getLinePointObjects(null, itm.points);
        console.log('CanvasShape.vue->allPaPoints detail ----------', itm.type, itm.points);
        console.log('CanvasShape.vue->lpos', lpos);

        lpos.map((lpo, index) => {
          project.value.activeLayer.addChild(lpo.path);
          project.value.activeLayer.addChild(lpo.startPoint);
          project.value.activeLayer.addChild(lpo.endPoint);
        });
      });

      return;
      */

      // Make new path for boolean operations like union, difference, xor, intersection
      const newPathList = makeNewPath(allPaPoints);

      // Only for debugging
      /*
      newPathList.map((path, index) => {
        project.value.activeLayer.addChild(path);
      });
      */

      // Perform boolean operation
      const boolOptPath = booleanOperation('union', newPathList);

      // Get new path points from boolean operation
      const boolOptSegments = boolOptPath?.segments?.map((segment) => segment.point);

      // Add the first point to the end to make the path closed
      boolOptSegments?.push(boolOptSegments[0]);

      const crossPointList = findCrossRelatedPoints(newPathList, boolOptSegments);

      renderWeldedShape(boolOptSegments, crossPointList);
    };

    const findCrossRelatedPoints = (newPathList, boolOptSegments) => {

      const findCrossPoints = (newPathList) => {
        const crossPoints = [];

        for (let i = 0; i < newPathList.length; i++) {
          for (let j = i + 1; j < newPathList.length; j++) {
            const intersections = newPathList[i].getIntersections(newPathList[j]);
            intersections.forEach(intersection => {
              crossPoints.push(intersection.point);
            });
          }
        }

        return crossPoints;
      };

      const crossPoints = findCrossPoints(newPathList);

      const findCrossPointIndices = (crossPoints, boolOptSegments) => {
        const indices = crossPoints.map(crossPoint => {
          const index = boolOptSegments.findIndex(segment =>
            segment?.x.toFixed(4) === crossPoint?.x.toFixed(4) &&
            segment?.y.toFixed(4) === crossPoint?.y.toFixed(4)
          );
          return { crossPoint, index };
        });
        return indices.sort((a, b) => b.index - a.index);
      };

      const crossPointIndices = findCrossPointIndices(crossPoints, boolOptSegments);

      // console.log('CanvasShape.vue->findCrossRelatedPoints|crossPointIndices', crossPointIndices);

      const segmentsBetweenCrossPoints = [];
      for (let i = crossPointIndices.length - 1; i > 0; i -= 2) {
        const startIndex = crossPointIndices[i].index;
        const endIndex = crossPointIndices[i - 1].index;

        // console.log('CanvasShape.vue->findCrossRelatedPoints|startIndex, endIndex', startIndex, endIndex);
        const segment = [];
        for (let k = startIndex; k <= endIndex; k++) {
          segment.push(boolOptSegments[k]);
        }

        // make the path closed
        segment.push(segment[0]);
        segmentsBetweenCrossPoints.push({ idx: `${startIndex}-${endIndex}`, pts: segment });
      }

      return segmentsBetweenCrossPoints;
    };

    const booleanOperation = (operation, pathList) => {
      if (pathList.length === 0) return [];
      if (pathList.length < 2) return pathList[0];

      let boolOptPath = pathList[0];
      for (let i = 1; i < pathList.length; i++) {
        switch (operation) {
          case 'union':
            boolOptPath = boolOptPath.unite(pathList[i]);
            break;
          case 'difference':
            boolOptPath = boolOptPath.subtract(pathList[i]);
            break;
          case 'xor':
            boolOptPath = boolOptPath.exclude(pathList[i]);
            break;
          case 'intersection':
            boolOptPath = boolOptPath.intersect(pathList[i]);
            break;
          default:
            throw new Error('Invalid boolean operation');
        }
      }
      return boolOptPath;
    };

    const draw = () => {

      const { width, height, weldModel, cat, type, settings } = props.item;
      project?.value?.clear();

      if (type === "Weld_General" || type === "Weld_Duct") {
        renderWeldShapes();
      }
      else {
        renderSingleShape([props.item]);
      }
    };

    onMounted(() => {
      initCanvas();
      watch(() => [props.item.width, props.item.height, props.item.settings], resizeCanvas, { deep: true });
      window.addEventListener('resize', resizeCanvas);
    });

    onBeforeUnmount(() => {
      project.value?.clear();
      window.removeEventListener('resize', resizeCanvas);
    });

    return {
      canvasContainer,
      canvas,
      initCanvas,
      resizeCanvas,
      draw,
      loadSvgString,
      booleanOperation,
    };
  }
};
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
}

.canvas-normal {
  /* background-color: aqua; */
  /* background-color: #f36dc5; */
}

.canvas-hid {
  /* background-color: blueviolet; */
  position: absolute;
  top: 0;
  z-index: -1;
}
</style>
