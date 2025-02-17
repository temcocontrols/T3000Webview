<template>
  <div :id="`wall_${item.id}`" class="wall-exterior" :class="{
    'flex flex-col flex-nowrap': true,
    [item.type]: item.type,
    'with-bg': item.settings.bgColor
  }" :width="getNewWidthHeight().width" :height="getNewWidthHeight().height">
  </div>
</template>

<script>
import { defineComponent, onMounted, computed, ref, watch } from "vue";
import { SVG } from '@svgdotjs/svg.js';
import { color } from "echarts";

export default defineComponent({
  name: "WallExteriorEl",
  props: {
    item: {
      type: Object,
      default: () => { }
    }
  },
  emits: ["updateWeldModel"],
  setup(props, { emit }) {
    const svgData = computed(() => {
      let width = props.item.width;
      let height = props.item.height;
      let trsX = props.item.translate[0];
      let trsY = props.item.translate[1];
      let Mx = 0;
      let My = props.item.height + 60;
      let Lx = props.item.width;
      let Ly = props.item.height + 60;
      let strokeWidth = props.item.settings.strokeWidth;
      let rotate = props.item.rotate;
      let showDimensions = props.item.showDimensions;
      let path = `M${Mx},${My} L${Lx},${Ly}`;

      return { width, height, trsX, trsY, Mx, My, Lx, Ly, path, strokeWidth, rotate };
    });

    const getNewPathL = (p1x, p1y, p1width, p1height, pjx, pjy) => {

      const p2x = p1x + p1width;
      const p2y = p1y + p1height;

      // Get the minimum x and y
      const minX = Math.min(p1x, p2x, pjx);
      const minY = Math.min(p1y, p2y, pjy);

      const p1NewX = Math.abs(p1x - minX);
      const p1NewY = Math.abs(p1y - minY);

      const p2NewX = Math.abs(p2x - minX);
      const p2NewY = Math.abs(p2y - minY);

      const p3NewX = Math.abs(pjx - minX);
      const p3NewY = Math.abs(pjy - minY);

      return {
        p1: { x: p1NewX, y: p1NewY }, p2: { x: p2NewX, y: p2NewY }, p3: { x: p3NewX, y: p3NewY },
        min: { x: minX, y: minY }
      };
    }

    const getNewWidthHeight = () => {
      return { width: props.item.width, height: props.item.height + 60, margin: -60 };
      const joinWall = props.item.joinWall != null && props.item.joinWall != undefined ? props.item.joinWall[0] : null;

      if (joinWall === null) {
        return { width: props.item.width, height: props.item.height + 60, margin: -60 };
      }
      else {

        const p1x = props.item.translate[0];
        const p1y = props.item.translate[1];

        const p2x = props.item.translate[0] + props.item.width;
        const p2y = props.item.translate[1];

        const p3x = joinWall.x;
        const p3y = joinWall.y;

        const maxX = Math.max(p1x, p2x, p3x);
        const maxY = Math.max(p1y, p2y, p3y);

        const minX = Math.min(p1x, p2x, p3x);
        const minY = Math.min(p1y, p2y, p3y);

        const width = Math.abs(maxX - minX);
        const height = Math.abs(maxY - minY);

        console.log('AutoJoinWall getNewWidthHeight', 'width', width, 'height', height);

        return { width, height: height, margin: -60 };
      }
    }

    const margin = computed(() => {
      return getNewWidthHeight().margin + 'px';
    });

    onMounted(() => {
      const svgRef = ref(null);

      // Calculate new width and height
      const newWidthHeight = getNewWidthHeight();

      svgRef.value = SVG().addTo(`#wall_${props.item.id}`).size(newWidthHeight.width, newWidthHeight.height);

      const renderSvg = (data) => {
        const allGroup = svgRef.value.group();

        const pathGroup = allGroup.group();
        const guidGroup = allGroup.group();
        const textGroup = allGroup.group();

        // Path data
        pathGroup.path(data.path).fill('none').stroke({ color: '#000', width: data.strokeWidth });

        const drawDimensions = () => {
          // Guid data
          const leftRight = 5;
          const topBottom = props.item.height + 5;
          const leftMiddle = (data.width / 2 - 20 - leftRight) < leftRight ? leftRight : (data.width / 2 - 20 - leftRight);
          const rightMiddle = (data.width / 2 - leftRight + 3 * 20) > (data.width - leftRight) ? (data.width - leftRight) : (data.width / 2 - leftRight + 3 * 20);

          let guidPath = `M${leftRight},${data.My - topBottom} L${leftRight},${data.My - topBottom - 35} L${leftMiddle},${data.My - topBottom - 35}
                        M${rightMiddle},${data.My - topBottom - 35} L${data.width - leftRight},${data.My - topBottom - 35} L${data.width - leftRight},${data.My - topBottom}`;
          guidGroup.path(guidPath).fill('none').stroke({ color: '#848687', width: 1 })
            .fill('none').stroke({ width: 1, color: '#848687' });

          // Text data
          const rectWidth = 80;
          const rectHeight = 12;
          const rectX = (data.width - 2 * leftRight - 20) / 2;
          const rectY = data.My - topBottom - 40;

          textGroup.rect(rectWidth, rectHeight)
            .move(rectX, rectY)
            .fill('none')
            .stroke({ width: 0 })
            .attr({ visibility: 'hidden', 'no-export': 1 });

          const formattedWidth = data.width.toFixed(2);
          const formattedHeight = data.rotate.toFixed(2);
          let textPath = `${formattedWidth}' ${formattedHeight}"`;

          textGroup.text(textPath)
            .font({ family: 'Arial', size: 10, anchor: 'start', fill: '#000' })
            .move(rectX, rectY);
        }

        if (props.item.showDimensions) {
          drawDimensions();
        }
      }

      const refreshSvg = (newData) => {
        console.log('AutoJoinWall refreshSvg', svgData);

        svgRef.value.clear();

        const newWidthHeight = getNewWidthHeight();
        svgRef.value.size(newWidthHeight.width, newWidthHeight.height);
        renderSvg(newData);
      }

      renderSvg(svgData.value);

      watch(svgData, (newData) => { refreshSvg(newData); }, { deep: true });
    });

    return { svgData, getNewWidthHeight, margin };
  },
});
</script>

<style scoped>
.wall-exterior {
  background-color: v-bind("props?.item?.settings?.bgColor");
  margin-top: v-bind("margin");
}
</style>
