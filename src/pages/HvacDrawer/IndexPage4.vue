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

      const hammer = new Hammer(drawingArea.value);
      hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
      hammer.get('rotate').set({ enable: true });

      hammer.on('tap', (ev) => {
        if (ev.target.instance === rect) {
          selectElement(rect);
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

      function selectElement(element) {
        deselectElement();
        selectedElement = element;
        selectedElement.stroke({ color: '#000', width: 2 });
      }

      function deselectElement() {
        if (selectedElement) {
          selectedElement.stroke({ color: 'none' });
          selectedElement = null;
        }
      }
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
