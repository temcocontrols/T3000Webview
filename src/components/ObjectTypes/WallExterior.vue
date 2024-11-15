<template>
  <div :id="`wall_${item.id}`" ref="wallExterior" class="wall-exterior" :width="item.width" :height="item.height"></div>
</template>

<script>
import { defineComponent, onMounted } from "vue";
import { SVG } from '@svgdotjs/svg.js';

export default defineComponent({
  name: "WallExteriorEl",
  props: {
    // bgColor: {
    //   type: String,
    //   default: "#000",
    // },
    // strokeColor: {
    //   type: String,
    //   default: "#000",
    // },
    // strokeWidth: {
    //   type: Number,
    //   default: 19.5,
    // },
    item: {
      type: Object,
      default: () => { }
    }
  },
  setup(props, { emit }) {
    onMounted(() => {
      console.log('WallExteriorEl', props);
      const draw = SVG().addTo(`#wall_${props?.item?.id}`).size('100%', '100%');

      // draw.rect(100, 100).attr({
      //   fill: props?.item?.settings?.bgColor,
      //   stroke: props?.item?.settings?.strokeColor,
      //   'stroke-width': props?.item?.settings?.strokeWidth
      // });

      var line = draw.line(0, 0, props?.item?.translate[0], props?.item?.translate[1]);
      line.stroke({ color: props?.item?.settings?.strokeColor, width: props?.item?.settings?.strokeWidth });
    });

    return {};
  },
});
</script>

<style scoped>
.wall-exterior {
  background-color: v-bind("props?.item?.settings?.bgColor");
}
</style>
