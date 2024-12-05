<template>
  <div ref="drawingArea" class="drawing-area"></div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { SVG } from '@svgdotjs/svg.js';
import Hammer from 'hammerjs';

export default {
  name: 'IndexPage4',
  setup() {
    const drawingArea = ref(null);
    let selectedElement = null;
    let initialRotation = 0;

    onMounted(() => {
      const draw = SVG().addTo(drawingArea.value).size('100%', '100%');
      const rect = draw.rect(100, 100).attr({ fill: '#f06' }).move(50, 50);
      const circle = draw.circle(100).attr({ fill: 'blue' }).move(200, 200);

      const hammer = new Hammer(drawingArea.value);
      hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
      hammer.get('rotate').set({ enable: true });

      hammer.on('tap', (ev) => {
        console.log('tap', ev);
        if (ev.target.instance === rect) {
          selectElement(rect);
        } else if (ev.target.instance === circle) {
          selectElement(circle);
        } else {
          deselectElement();
        }
      });

      hammer.on('panmove', (ev) => {
        if (selectedElement) {
          selectedElement.move(ev.center.x - 50, ev.center.y - 50);
        }
      });

      hammer.on('rotatemove', (ev) => {
        if (selectedElement) {
          selectedElement.rotate(initialRotation + ev.rotation);
        }
      });

      hammer.on('rotateend', (ev) => {
        if (selectedElement) {
          initialRotation += ev.rotation;
        }
      });

      let startX = 0;
      let startY = 0;
      let tempRect = null;

      drawingArea.value.addEventListener('mousedown', (event) => {
        return;
        startX = event.offsetX;
        startY = event.offsetY;
        // tempRect = draw.rect(1, 1).attr({ fill: 'none', stroke: 'red', 'stroke-dasharray': '5,5' }).move(startX, startY);

        const elements = draw.children();
        let insideElement = false;
        elements.forEach((element) => {
          const bbox = element.bbox();
          if (
            event.offsetX >= bbox.x &&
            event.offsetX <= bbox.x2 &&
            event.offsetY >= bbox.y &&
            event.offsetY <= bbox.y2
          ) {
            insideElement = true;
          }
        });

        if (!insideElement) {
          tempRect = draw.rect(1, 1).attr({ fill: 'none', stroke: 'red', 'stroke-dasharray': '5,5' }).move(startX, startY);
        }
      });

      drawingArea.value.addEventListener('mousemove', (event) => {
        if (tempRect) {
          const width = event.offsetX - startX;
          const height = event.offsetY - startY;
          tempRect.size(width, height);
        }
      });

      drawingArea.value.addEventListener('mouseup', () => {
        if (tempRect) {
          tempRect.attr({ 'stroke-dasharray': 'none' });
          tempRect.remove();
        }
      });

      function selectElementsInArea(x, y, width, height) {
        const elements = draw.children();
        elements.forEach((element) => {
          const bbox = element.bbox();
          if (
            bbox.x >= x &&
            bbox.y >= y &&
            bbox.x2 <= x + width &&
            bbox.y2 <= y + height
          ) {
            selectElement(element);
          }
        });
      }

      drawingArea.value.addEventListener('mouseup', (event) => {
        if (tempRect) {
          const width = event.offsetX - startX;
          const height = event.offsetY - startY;
          selectElementsInArea(startX, startY, width, height);
          tempRect.remove();
          tempRect = null;
        }
      });


      function deselectElement() {
        if (selectedElement) {
          selectedElement.stroke({ color: 'none' });
          selectedElement = null;
        }
      }

      function addRotationHandle(element) {
        const bbox = element.bbox();
        console.log('bbox', bbox);
        const handle = draw.circle(10).attr({ fill: 'gray' }).move(bbox.cx - 5, bbox.y - 20);

        handle.on('mousedown', (event) => {
          event.stopPropagation();
          const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - bbox.cx;
            const dy = moveEvent.clientY - bbox.cy;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            element.rotate(angle, bbox.cx, bbox.cy);
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });

        element.on('beforedrag', () => {
          handle.remove();
        });

        element.on('dragend', () => {
          addRotationHandle(element);
        });
      }

      function selectElement(element) {
        console.log('selectElement', element);
        deselectElement();
        selectedElement = element;
        selectedElement.stroke({ color: '#000', width: 2 });
        // addRotationHandle(selectedElement);
      }



      let tempPath = null;
      let tempBox = null;

      drawingArea.value.addEventListener('mousedown', (event) => {
        startX = event.offsetX;
        startY = event.offsetY;
        tempPath = draw.path(`M${startX},${startY}`).attr({ fill: 'none', stroke: 'black' });
        tempBox = draw.rect(10, 10).attr({ fill: 'none', stroke: 'blue', 'stroke-dasharray': '5,5' }).move(startX - 5, startY - 5);
      });

      drawingArea.value.addEventListener('mousemove', (event) => {
        if (tempPath) {
          const x = event.offsetX;
          const y = event.offsetY;
          tempPath.plot(`M${startX},${startY} L${x},${y}`);
          tempBox.move(x - 5, y - 5);
        }
      });

      drawingArea.value.addEventListener('mouseup', () => {
        if (tempPath) {
          tempPath = null;
        }
        if (tempBox) {
          tempBox.remove();
          tempBox = null;
        }
      });
    });

    return {
      drawingArea,
    };
  },
};
</script>

<style>
.drawing-area {
  width: 100%;
  height: 100vh;
  border: 1px solid #ccc;
}
</style>
