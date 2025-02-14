<template>
  <div class="drawer-container">
    <div ref="drawingContainer" class="drawing-area"></div>
    <div class="toolbar">
      <button @click="drawCircle">Circle</button>
      <button @click="drawRect">Rectangle</button>
      <button @click="drawOval">Oval</button>
      <button @click="drawSteps">Steps</button>
      <button @click="onCopy">Copy</button>
      <button @click="onPaste">Paste</button>
      <button @click="onDelete">Delete</button>
      <button @click="onUndo">Undo</button>
      <button @click="onRedo">Redo</button>
      <button @click="onFlipHorizontal">Flip H</button>
      <button @click="onFlipVertical">Flip V</button>
      <button @click="onSendToBack">Send To Back</button>
      <button @click="onBringToFront">Bring To Front</button>
      <button @click="onRotate90">Rotate +90</button>
      <button @click="onRotateNeg90">Rotate -90</button>
      <button @click="onGroup">Group</button>
      <button @click="onUnGroup">UnGroup</button>
      <button @click="onZoomIn">Zoom +</button>
      <button @click="onZoomOut">Zoom -</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { SVG, Svg, Element } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.select.js'


const selectOptions = {
  deepSelect: true,
  pointSize: 5,
  rotationPoint: true,
}

interface ShapeInfo {
  element: Element
  // more properties if needed
}

const drawingContainer = ref<HTMLDivElement | null>(null)
let draw: Svg
let selectedShapes: ShapeInfo[] = []

// Initialization
onMounted(() => {
  if (drawingContainer.value) {
    draw = SVG().addTo(drawingContainer.value).size('100%', '100%')
    // Setup selection, movement, etc. as needed

    draw.on('click', (evt) => {
      const shape = evt.target?.instance
      if (shape && typeof shape.selectize === 'function') {
        shape.selectize()
      }
    })
  }
})

// Drawing examples
function drawCircle() {
  const circle = draw.circle(50).fill('#f06').move(50, 50)
  setupShape(circle)
}

function drawRect() {
  const rect = draw.rect(80, 50).fill('#0af').move(150, 50)
  setupShape(rect)
}

function drawOval() {
  const oval = draw.ellipse(80, 50).fill('#fa0').move(250, 50)
  setupShape(oval)
}

function drawSteps() {
  // Example shape created by path
  const steps = draw.path('M10 20 H60 V50 H30 V80 H80').fill('none').stroke({ width: 2, color: '#080' })
  setupShape(steps)
}

// Setup for things like selection or drag
function setupShape(shape: Element) {
  // e.g. shape.draggable() or custom selection
}

// Toolbar actions
function onCopy() { }
function onPaste() { }
function onDelete() { }
function onUndo() { }
function onRedo() { }
function onFlipHorizontal() { }
function onFlipVertical() { }
function onSendToBack() { }
function onBringToFront() { }
function onRotate90() { }
function onRotateNeg90() { }
function onZoomIn() { }
function onZoomOut() { }
function onGroup() { }
function onUnGroup() { }
</script>

<style scoped>
.drawer-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.drawing-area {
  flex: 1;
  border: 1px solid #ccc;
  min-height: 400px;
  position: relative;
}

.toolbar {
  padding: 8px;
}
</style>
