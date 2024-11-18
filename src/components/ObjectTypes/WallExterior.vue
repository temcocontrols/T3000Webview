<template>
  <div :id="`wall_${item.id}`" ref="wallExterior" class="wall-exterior" :width="item.width" :height="item.height"
    :class="{
      'flex flex-col flex-nowrap': true,
      [item.type]: item.type,
      'with-bg': item.settings.bgColor
    }"></div>
</template>

<script>
import { defineComponent, onMounted, computed, ref, watch } from "vue";
import { SVG } from '@svgdotjs/svg.js';

export default defineComponent({
  name: "WallExteriorEl",
  props: {
    item: {
      type: Object,
      default: () => { }
    }
  },
  setup(props, { emit }) {
    const svgData = computed(() => {
      let width = props.item.width;
      // let height = props.item.rotate == 90 ? props.item.width : Math.abs(props.item.width * Math.sin(props.item.rotate * Math.PI / 180));
      let height = props.item.height;
      let trsX = props.item.translate[0];
      let trsY = props.item.translate[1];
      let Mx = 0;
      let My = 0;
      let Lx = props.item.width;
      let Ly = 0;//height != 0 ? height : 0;
      let strokeWidth = props.item.height * 2;

      let path = `M${Mx},${My} L${Lx},${Ly}`;

      return { width, height, trsX, trsY, Mx, My, Lx, Ly, path, strokeWidth };
    });

    onMounted(() => {
      const svgRef = ref(null);
      svgRef.value = SVG().addTo(`#wall_${props.item.id}`).size(props.item.width, props.item.height);
      svgRef.value.path(svgData.value.path).fill('none').stroke({ color: '#000', width: svgData.value.strokeWidth });
      console.log('svgRef default', svgData.value.path);

      watch(svgData, (newData) => {
        console.log('origin:[width, height]', [props.item.width, props.item.height], 'new:[width, height]', [newData.width, newData.height]);
        svgRef.value.clear();
        svgRef.value.size(newData.width, newData.height);

        console.log('svgRef new', newData.path);
        svgRef.value.path(newData.path).fill('none').stroke({ color: '#000', width: newData.strokeWidth });
      }, { deep: true });
    });

    return { svgData };
  },
});
</script>

<style scoped>
.wall-exterior {
  background-color: v-bind("props?.item?.settings?.bgColor");
  border: 1px solid #000;
}
</style>
