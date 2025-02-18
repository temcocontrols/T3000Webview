
<template>
  <div id="app">
    <div class="toolbar">
      <!-- Shape Tools -->
      <button @click="addRectangle">Rectangle</button>
      <button @click="addCircle">Circle</button>
      <button @click="addEllipse">Ellipse</button>
      <button @click="addLine">Line</button>
      <button @click="addPolygon">Polygon</button>
      <button @click="startWallDrawing">Wall</button>

      <!-- Action Tools -->
      <button @click="copyElements">Copy</button>
      <button @click="pasteElements">Paste</button>
      <button @click="deleteSelectedElements">Delete</button>
      <button @click="undo">Undo</button>
      <button @click="redo">Redo</button>
      <button @click="flipSelectedElements">Flip</button>
      <button @click="moveSelectedElements">Move</button>
      <button @click="zoomIn">Zoom In</button>
      <button @click="zoomOut">Zoom Out</button>
      <button @click="sendToBack">Send to Back</button>
      <button @click="bringToFront">Bring to Front</button>
      <button @click="rotateSelectedElements(90)">Rotate 90°</button>
      <button @click="rotateSelectedElements(-90)">Rotate -90°</button>
      <button @click="groupElements">Group</button>
      <button @click="ungroupElements">Ungroup</button>
      <button @click="weldElements">Weld</button>
      <button @click="addToLibrary">Add to Library</button>
    </div>

    <div id="canvas-container" ref="canvasContainer"></div>

    <!-- Properties Drawer -->
    <div class="properties-drawer" v-if="showPropertiesDrawer">
      <h3>Properties</h3>
      <label>
        X:
        <input type="number" v-model.number="elementProps.x" @input="updateElementProperties" />
      </label>
      <label>
        Y:
        <input type="number" v-model.number="elementProps.y" @input="updateElementProperties" />
      </label>
      <label>
        Width:
        <input type="number" v-model.number="elementProps.width" @input="updateElementProperties" />
      </label>
      <label>
        Height:
        <input type="number" v-model.number="elementProps.height" @input="updateElementProperties" />
      </label>
      <label>
        Fill Color:
        <input type="color" v-model="elementProps.fill" @input="updateElementProperties" />
      </label>
      <!-- Add more properties as needed -->
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, reactive, watch } from 'vue';
import { SVG, Svg, G, Element as SvgElement, extend as SVGextend, PointArray } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.select.js';
import '@svgdotjs/svg.draggable.js';
import '@svgdotjs/svg.draw.js';
import '@svgdotjs/svg.resize.js';

export default defineComponent({
  name: 'DrawingApp',
  setup() {
    const canvasContainer = ref<HTMLDivElement | null>(null);
    const draw = ref<Svg>();
    const selectedElements = ref<SvgElement[]>([]);
    const copiedElements = ref<SvgElement[]>([]);
    const undoStack = ref<SvgElement[]>([]);
    const redoStack = ref<SvgElement[]>([]);

    // Properties Drawer
    const showPropertiesDrawer = ref(false);
    const elementProps = reactive({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: '#000000',
    });

    onMounted(() => {
      draw.value = SVG().addTo(canvasContainer.value!).size('100%', '100%');

      // Background Grid (Optional)
      // draw.value.rect('100%', '100%').fill('#ffffff');

      // Initialize event listeners
      draw.value.on('click', (event) => {
        if (event.target.instance !== draw.value) {
          event.stopPropagation();
          toggleSelectElement(event.target.instance);
        } else {
          deselectAll();
        }
      });
    });

    // Selection logic
    const toggleSelectElement = (element: SvgElement, exclusive = false) => {
      if (exclusive) {
        deselectAll();
      }

      if (selectedElements.value.includes(element)) {
        element.selectize(false).resize('stop');
        selectedElements.value = selectedElements.value.filter((el) => el !== element);
      } else {
        element.selectize({ deepSelect: true }).resize();
        selectedElements.value.push(element);
      }

      updatePropertiesDrawer();
    };

    const deselectAll = () => {
      selectedElements.value.forEach((el) => el.selectize(false).resize('stop'));
      selectedElements.value = [];
      updatePropertiesDrawer();
    };

    const updatePropertiesDrawer = () => {
      if (selectedElements.value.length === 1) {
        const el = selectedElements.value[0];
        elementProps.x = +el.attr('x') || 0;
        elementProps.y = +el.attr('y') || 0;
        elementProps.width = +el.attr('width') || 0;
        elementProps.height = +el.attr('height') || 0;
        elementProps.fill = el.attr('fill') || '#000000';
        showPropertiesDrawer.value = true;
      } else {
        showPropertiesDrawer.value = false;
      }
    };

    // Update element properties from the drawer
    const updateElementProperties = () => {
      if (selectedElements.value.length === 1) {
        const el = selectedElements.value[0];
        el.attr({
          x: elementProps.x,
          y: elementProps.y,
          width: elementProps.width,
          height: elementProps.height,
          fill: elementProps.fill,
        });
      }
    };

    // Shape Creation Methods
    const addRectangle = () => {
      const rect = draw.value!.rect(100, 100).fill('#f06');
      initializeElement(rect);
    };

    const addCircle = () => {
      const circle = draw.value!.circle(100).fill('#0f9');
      initializeElement(circle);
    };

    const addEllipse = () => {
      const ellipse = draw.value!.ellipse(100, 60).fill('#09f');
      initializeElement(ellipse);
    };

    const addLine = () => {
      const line = draw.value!.line(0, 0, 100, 100).stroke({ width: 2, color: '#000' });
      initializeElement(line);
    };

    const addPolygon = () => {
      const polygon = draw.value!
        .polygon('60,20 100,40 100,80 60,100 20,80 20,40')
        .fill('#ffcc00');
      initializeElement(polygon);
    };

    // Initialize element with common properties
    const initializeElement = (element: SvgElement) => {
      element.draggable();
      element.on('click', (event) => {
        event.stopPropagation();
        toggleSelectElement(element, event.shiftKey ? false : true);
      });
    };

    // Clipboard Actions
    const copyElements = () => {
      copiedElements.value = selectedElements.value.map((el) => el.clone());
    };

    const pasteElements = () => {
      copiedElements.value.forEach((el) => {
        const clone = el.clone().addTo(draw.value!);
        clone.dmove(10, 10); // Offset pasted element
        initializeElement(clone);
      });
    };

    // Delete Elements
    const deleteSelectedElements = () => {
      selectedElements.value.forEach((el) => el.remove());
      selectedElements.value = [];
      updatePropertiesDrawer();
    };

    // Flip Elements
    const flipSelectedElements = () => {
      selectedElements.value.forEach((el) => {
        el.transform({ scaleX: -1 }, true);
      });
    };

    // Move Elements (Placeholder)
    const moveSelectedElements = () => {
      // Implement move logic
    };

    // Zoom
    const zoomLevel = ref(1);
    const zoomIn = () => {
      zoomLevel.value *= 1.2;
      draw.value!.zoom(zoomLevel.value);
    };

    const zoomOut = () => {
      zoomLevel.value *= 0.8;
      draw.value!.zoom(zoomLevel.value);
    };

    // Send to Back / Bring to Front
    const sendToBack = () => {
      selectedElements.value.forEach((el) => el.backward());
    };

    const bringToFront = () => {
      selectedElements.value.forEach((el) => el.front());
    };

    // Rotate Elements
    const rotateSelectedElements = (angle: number) => {
      selectedElements.value.forEach((el) => {
        const bbox = el.bbox();
        el.rotate(angle, bbox.cx, bbox.cy);
      });
    };

    // Group / Ungroup Elements
    const groupElements = () => {
      if (selectedElements.value.length > 1) {
        const group = draw.value!.group();
        selectedElements.value.forEach((el) => {
          group.add(el);
        });
        deselectAll();
        initializeElement(group);
        toggleSelectElement(group);
      }
    };

    const ungroupElements = () => {
      selectedElements.value.forEach((el) => {
        if (el instanceof G) {
          const children = el.children();
          el.remove();
          children.forEach((child) => {
            draw.value!.add(child);
            initializeElement(child);
          });
        }
      });
      deselectAll();
    };

    // Weld Elements (Placeholder)
    const weldElements = () => {
      // Implement weld logic
    };

    // Add to Library (Placeholder)
    const addToLibrary = () => {
      // Implement library logic
    };

    // Undo / Redo (Simplified)
    const undo = () => {
      // Implement undo logic
    };

    const redo = () => {
      // Implement redo logic
    };

    // Wall Drawing Logic
    const isDrawing = ref(false);
    const wallPath = ref<SvgElement>();
    const wallPoints = ref<[number, number][]>([]);
    const alignmentGuide = ref<SvgElement | null>(null);

    const startWallDrawing = () => {
      isDrawing.value = true;
      wallPoints.value = [];
      draw.value!.on('mousedown', onWallMouseDown);
    };

    const onWallMouseDown = (event: MouseEvent) => {
      const { offsetX, offsetY } = event;
      wallPoints.value.push([offsetX, offsetY]);

      if (!wallPath.value) {
        wallPath.value = draw.value!.polyline().fill('none').stroke({ width: 2, color: '#000' });
      }

      draw.value!.on('mousemove', onWallMouseMove);
      draw.value!.on('dblclick', finishWallDrawing);
    };

    const onWallMouseMove = (event: MouseEvent) => {
      const { offsetX, offsetY } = event;
      let currentPoint: [number, number] = [offsetX, offsetY];

      const lastPoint = wallPoints.value[wallPoints.value.length - 1];

      // Snap to straight lines
      if (Math.abs(currentPoint[0] - lastPoint[0]) < 10) {
        currentPoint[0] = lastPoint[0];
      }
      if (Math.abs(currentPoint[1] - lastPoint[1]) < 10) {
        currentPoint[1] = lastPoint[1];
      }

      const tempPoints = [...wallPoints.value, currentPoint];
      wallPath.value!.plot(tempPoints);

      // Show alignment guide
      showAlignmentGuide(lastPoint, currentPoint);
    };

    const finishWallDrawing = () => {
      isDrawing.value = false;
      wallPath.value!.plot(wallPoints.value);
      initializeElement(wallPath.value!);
      wallPath.value = undefined;
      wallPoints.value = [];
      draw.value!.off('mousedown', onWallMouseDown);
      draw.value!.off('mousemove', onWallMouseMove);
      draw.value!.off('dblclick', finishWallDrawing);
      removeAlignmentGuide();
    };

    const showAlignmentGuide = (start: [number, number], end: [number, number]) => {
      removeAlignmentGuide();
      alignmentGuide.value = draw.value!.line(start[0], start[1], end[0], end[1]).stroke({
        width: 1,
        color: '#00f',
        dasharray: '5,5',
      });
    };

    const removeAlignmentGuide = () => {
      if (alignmentGuide.value) {
        alignmentGuide.value.remove();
        alignmentGuide.value = null;
      }
    };

    // Clean up on unmount
    onMounted(() => {
      draw.value!.off('mousedown', onWallMouseDown);
      draw.value!.off('mousemove', onWallMouseMove);
      draw.value!.off('dblclick', finishWallDrawing);
    });

    return {
      canvasContainer,
      addRectangle,
      addCircle,
      addEllipse,
      addLine,
      addPolygon,
      startWallDrawing,
      copyElements,
      pasteElements,
      deleteSelectedElements,
      undo,
      redo,
      flipSelectedElements,
      moveSelectedElements,
      zoomIn,
      zoomOut,
      sendToBack,
      bringToFront,
      rotateSelectedElements,
      groupElements,
      ungroupElements,
      weldElements,
      addToLibrary,
      showPropertiesDrawer,
      elementProps,
      updateElementProperties,
    };
  },
});
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 10px;
  background-color: #f0f0f0;
}

.toolbar button {
  padding: 5px 10px;
}

#canvas-container {
  flex: 1;
  background-color: #ffffff;
}

.properties-drawer {
  position: absolute;
  right: 0;
  top: 60px;
  width: 250px;
  background-color: #fff;
  padding: 15px;
  border-left: 1px solid #ccc;
  z-index: 100;
}

.properties-drawer h3 {
  margin-top: 0;
}

.properties-drawer label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.properties-drawer input[type='number'],
.properties-drawer input[type='color'] {
  width: 100px;
}
</style>
