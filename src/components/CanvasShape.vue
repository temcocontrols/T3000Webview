<template>
  <div ref="canvasContainer" class="canvas-container">
    <canvas :id="`canvas${item.id}`" ref="canvas" resize stats class="canvas-normal"></canvas>
    <canvas :id="`hidCanvas${item.id}`" ref="hidCanvas" resize stats class="canvas-hid"></canvas>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import paper from 'paper';
import { first } from 'lodash';

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
    const hidCanvas = ref(null);
    const hidProject = ref(null);


    const initCanvas = () => {
      const canvasEl = document.getElementById(`canvas${props.item.id}`);
      project.value = new paper.Project(canvasEl);
      project?.value?.clear();

      paper.settings.insertItems = false;
      resizeCanvas();
    };

    const resizeCanvas = () => {
      const container = canvasContainer.value;
      const canvasElement = canvas.value;
      canvasElement.width = container.clientWidth;
      canvasElement.height = container.clientHeight;
      // canvasElement.width = props.item.width;
      // canvasElement.height = props.item.height;
      // console.log('CanvasShap.vue->container | cw,ch', container.clientWidth, container.clientHeight);
      // console.log('CanvasShap.vue->container | iw,ih', props.item.width, props.item.height);
      draw();
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
      console.log('CanvasShape.vue->gStep', step);
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
      console.log('CanvasShape.vue->gStep', step);
      return step;
    }

    const loadSvgString = (svgString) => {
      return paper.project.importSVG(svgString, { applyMatrix: false });
    };

    // Render single shape
    // Selected items from IndexPage.vue
    const renderSingleShape = (items) => {
      items?.map((item, index) => {
        console.log('CanvasShape.vue->renderSingleShape|item', item);

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
    const itemData = computed(() => props.item);
    const defaultWidth = itemData.value.width;
    const defaultHeight = itemData.value.height;
    const defaultColor = itemData.value.settings.fillColor;

    const reCalculateScale = () => {
      const widthScale = itemData.value.width / defaultWidth;
      const heightScale = itemData.value.height / defaultHeight;
      const tranXScale = itemData.value.translate[0] / defaultWidth;
      const tranYScale = itemData.value.translate[1] / defaultHeight;
      return { widthScale, heightScale, tranXScale, tranYScale };
    }

    const getWeldPathItems = (weldItems) => {

      const scaleWHXY = reCalculateScale();
      console.log('CanvasShape.vue->getWeldPathItems|scaleWHXY', scaleWHXY);
      console.log('CanvasShape.vue->reCalculateScale|default w h c', defaultWidth, defaultHeight, defaultColor);

      // First shape's translate & add 2 pixels for stroke width
      let firstTrsX = weldItems.length > 1 ? weldItems[0].translate[0] : 0;
      let firstTrsY = weldItems.length > 1 ? weldItems[0].translate[1] : 0;

      const minX = Math.min(...weldItems.map(item => item.translate[0]));
      const minY = Math.min(...weldItems.map(item => item.translate[1]));

      const pathItemList = weldItems?.map((item, index) => {
        let { width, height, cat, type, translate } = item;
        let [trsx, trsy] = translate;
        // console.log('CanvasShape.vue->getWeldPathItems|w,h,trx,try', width, height, trsx, trsy, cat, type);

        let currentTrsx = trsx - firstTrsX + 4;
        let currentTrsy = trsy - firstTrsY + 4;

        let pathItem = null;
        if (type === 'G_Rectangle') {
          // Resize the width and height
          width = width * scaleWHXY.widthScale;
          height = height * scaleWHXY.heightScale;

          trsx *= scaleWHXY.widthScale;
          trsy *= scaleWHXY.heightScale;
          trsx -= firstTrsX * scaleWHXY.widthScale;
          trsy -= firstTrsY * scaleWHXY.heightScale;

          currentTrsx = trsx + 4;
          currentTrsy = trsy + 4;

          pathItem = gRectangle('weld', item, width, height, [currentTrsx, currentTrsy]);
        }
        if (type === 'G_Circle') {
          width = width * scaleWHXY.widthScale;
          height = height * scaleWHXY.heightScale;

          trsx *= scaleWHXY.widthScale;
          trsy *= scaleWHXY.heightScale;
          trsx -= firstTrsX * scaleWHXY.widthScale;
          trsy -= firstTrsY * scaleWHXY.heightScale;

          currentTrsx = trsx + 4;
          currentTrsy = trsy + 4;

          pathItem = gCircle('weld', item, width, height, [currentTrsx, currentTrsy]);
        }
        if (type === 'G_Step') {
          pathItem = gStep('weld', item, width, height, [currentTrsx, currentTrsy]);
        }
        if (type === 'G_Hexagon') {
          pathItem = gHexagon('weld', item, width, height, [currentTrsx, currentTrsy]);
        }

        // console.log(`CanvasShape.vue->getWeldPathItems| ${type}`, paItem);
        return { type: type, pathItem: pathItem, item: item, newPos: { width: width, height: height, trsx: currentTrsx - 4, trsy: currentTrsy - 4 } }
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
      } else if (item.children) {
        item.children.forEach(child => {
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
    const getLinePointObjects = (weldPath, points) => {
      console.log('CanvasShape.vue->updateWeldPath|weldPath.default', weldPath?.segments.map(segment => [segment.point.x, segment.point.y]));
      let lpos = [];
      lpos = points.slice(0, -1).map((point, index) => {

        const startPoint = point;
        const endPoint = points[index + 1];
        const radius = 4;
        const strokeWidth = 2;

        console.log(`CanvasShape.vue->getLinePointObjects|point, Path Line ${index + 1}`, startPoint, endPoint);

        const startCircle = new paper.Path.Circle({
          center: startPoint,
          radius: radius,
          fillColor: "aqua",// "#4af",// "#000",// "blue",
        });

        const endCircle = new paper.Path.Circle({
          center: endPoint,
          radius: radius,
          fillColor: "aqua",//"#4af",//"#000",// "red",
        });

        const line = new paper.Path.Line({
          from: startPoint,
          to: endPoint,
          strokeColor: "#000",
          strokeWidth: strokeWidth,
          fillColor: "#f36dc5",
          // dashArray: [5, 2],
        });

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

        startCircle.onMouseDrag = function (event) {
          this.position = this.position.add(event.delta);
          updateShapes();
          makePreviousContinue();
          updateWeldPath(`startCircle=>[x=${this.position.x},y=${this.position.y}]`);
        };

        endCircle.onMouseDrag = function (event) {
          this.position = this.position.add(event.delta);
          updateShapes();
          makeNextContinue();
          updateWeldPath(`endCircle=>[x=${this.position.x},y=${this.position.y}]`);
        };

        line.onMouseDrag = function (event) {
          const delta = event.delta;
          startCircle.position = startCircle.position.add(delta);
          endCircle.position = endCircle.position.add(delta);
          updateShapes();
          updatePreviousLine(startCircle.position);
          updateNextLine(endCircle.position);
          updateWeldPath(`line=>[x=${startCircle.position.x},y=${startCircle.position.y}], [x=${endCircle.position.x},y=${endCircle.position.y}]`);
        };

        return {
          name: `Path Line ${index + 1}`,
          path: line,
          startPoint: startCircle,
          endPoint: endCircle,
        };
      });
      return lpos;
    }

    /*
    const getWeldedLinePointObjects = (weldPath, weldSegments) => {
      let linePoints = [];
      linePoints = weldSegments.slice(0, -1).map((point, index) => {
        const startPoint = point;
        const endPoint = weldSegments[index + 1];
        const radius = 4;
        const strokeWidth = 2;

        const startCircle = new paper.Path.Circle({
          center: startPoint,
          radius: radius,
          fillColor: "blue",
        });

        const endCircle = new paper.Path.Circle({
          center: endPoint,
          radius: radius,
          fillColor: "red",
        });

        const line = new paper.Path.Line({
          from: startPoint,
          to: endPoint,
          strokeColor: "black",
          strokeWidth: strokeWidth,
          fillColor: "green",
        });

        function updateShapes() {
          line.segments[0].point = startCircle.position;
          line.segments[1].point = endCircle.position;
          weldPath.segments[index].point = startCircle.position;
          weldPath.segments[index + 1].point = endCircle.position;
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
          name: `Welded Line ${index + 1}`,
          path: line,
          startPoint: startCircle,
          endPoint: endCircle,
        };
      });

      //make line closed
      linePoints.push(linePoints[0]);
      return linePoints;
    }
    */

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
    const renderWeldedShape = (weldSegments) => {

      let weldPath = null;
      const check = weldSegments !== null && weldSegments != undefined && weldSegments.length > 0;

      if (!check) {
        console.log('CanvasShape.vue->weld segments is null or undefined');
        return;
      }

      weldPath = new paper.Path({
        segments: weldSegments,
        closed: true,
        fillColor: "#659dc5",// "#f36dc5",
      });

      console.log('CanvasShape.vue->weldPath', weldPath);

      // const weldedLinePoints = getWeldedLinePointObjects(weldPath, weldSegments);
      const weldedLinePoints = getLinePointObjects(weldPath, weldSegments);
      console.log('CanvasShape.vue->weldedLinePoints', weldedLinePoints);

      project.value.activeLayer.addChild(weldPath);

      weldedLinePoints.map((itm, index) => {
        // console.log(`CanvasShape.vue->weldedLinePoints|itm ${itm.name}`, itm.startPoint, itm.endPoint, itm.path);
        project.value.activeLayer.addChild(itm.path);
        project.value.activeLayer.addChild(itm.startPoint);
        project.value.activeLayer.addChild(itm.endPoint);
      });

      return weldPath;
    };

    const checkIfShapesCross = (allPaPoints) => {
      let previousMaxX = -Infinity;
      let previousMaxY = -Infinity;

      for (const item of allPaPoints) {
        const currentMinX = Math.min(...item.points.map(point => point.x));
        const currentMinY = Math.min(...item.points.map(point => point.y));

        if (currentMinX > previousMaxX || currentMinY > previousMaxY) {
          previousMaxX = Math.max(...item.points.map(point => point.x));
          previousMaxY = Math.max(...item.points.map(point => point.y));
        } else {
          return true; // Shapes are crossed
        }
      }

      return false; // Shapes are not crossed
    };

    // Render weld or multiple shapes
    const renderWeldShapes = () => {
      const { weldItems } = props.item;

      console.log('CanvasShape.vue->start to render welded shapes', props.item, props.item.width, props.item.height);
      console.log('CanvasShape.vue->props.item.weldItems', props.item.weldItems);

      const pathItemList = getWeldPathItems(weldItems);
      console.log('CanvasShape.vue->paItemList', pathItemList);

      emit("updateWeldModel", props.item, pathItemList);

      const allPaPoints = transferToLinePoints(pathItemList);
      console.log('CanvasShape.vue->allPaPoints', allPaPoints);

      // Check whether the selected shapes can be welded
      const isOverLapped = checkIfShapesCross(allPaPoints);

      if (!isOverLapped) {
        console.log('CanvasShape.vue->Shapes are not crossed');

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
      console.log('CanvasShape.vue->boolOptPath', boolOptPath);

      // Get new path points from boolean operation
      const boolOptSegments = boolOptPath?.segments?.map((segment) => segment.point);

      // Add the first point to the end to make the path closed
      boolOptSegments?.push(boolOptSegments[0]);
      console.log('CanvasShape.vue->boolOptSegments', boolOptSegments);

      const rwd = renderWeldedShape(boolOptSegments);
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

      if (type === "Weld_General") {
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
  background-color: #f36dc5;
}

.canvas-hid {
  /* background-color: blueviolet; */
  position: absolute;
  top: 0;
  z-index: -1;
}
</style>
