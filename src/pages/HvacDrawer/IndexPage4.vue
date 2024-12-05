<template>
  <div id="app">
    <div ref="svgContainer" class="svg-container"></div>
    <vue3-selecto ref="selecto" :selectable-targets="['.shape']" :selectable-classes="['selected']"
      @select="onSelect" />
    <vue3-moveable ref="moveable" :target="selectedTargets" :draggable="true" :resizable="true" :rotatable="true"
      @drag="onDrag" @resize="onResize" @rotate="onRotate" />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { SVG } from '@svgdotjs/svg.js';
import Vue3Selecto from 'vue3-selecto';
import Vue3Moveable from 'vue3-moveable';

export default {
  components: {
    Vue3Selecto,
    Vue3Moveable,
  },
  setup() {
    const svgContainer = ref(null);
    const selectedTargets = ref([]);

    onMounted(() => {
      const draw = SVG().addTo(svgContainer.value).size('100%', '100%');
      draw.rect(100, 100).move(50, 50).addClass('shape');
      draw.circle(100).move(200, 50).addClass('shape');
      draw.ellipse(150, 100).move(350, 50).addClass('shape');
    });

    const customSelectStyle = (e) => {
      e.selected.forEach((el) => {
        el.style.border = '2px dashed red';
        el.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      });
    };

    const onSelect = (e) => {
      selectedTargets.value = e.selected;
      customSelectStyle(e);
    };

    const onDrag = (e) => {
      e.target.style.transform = e.transform;
    };

    const onResize = (e) => {
      e.target.style.width = `${e.width}px`;
      e.target.style.height = `${e.height}px`;
      e.target.style.transform = e.drag.transform;
    };

    const onRotate = (e) => {
      e.target.style.transform = e.transform;
    };

    return {
      svgContainer,
      selectedTargets,
      onSelect,
      onDrag,
      onResize,
      onRotate,
    };
  },
};
</script>

<style>
.svg-container {
  width: 100%;
  height: 500px;
  border: 1px solid #ccc;
}

.shape {
  cursor: pointer;
}

.selected {
  stroke: blue;
  stroke-width: 2;
}
</style>
