<template>
  <div :id="`wall_${item.id}`" class="wall-exterior" :class="{
    'flex flex-col flex-nowrap': true,
    [item.type]: item.type,
    'with-bg': item.settings.bgColor
  }" :width="item.width" :height="item.height + 60">
    <!-- <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" :width="item.width"
      :height="item.height">
      <g :transform="`scale(1,1) translate(${svgData.trsX},${svgData.trsY})`">
        <g :width="`${svgData.width}`" :height="`${svgData.height}`" transform="scale(1,1) translate(0,0)">
          <g id="e8e96245-d9f9-41ad-85ea-51209aeb0263">
            <g transform="scale(1,1) translate(0,0)" fill="#000000" stroke="#000000" stroke-opacity="1">
              <path :d="`M${svgData.Mx},${svgData.My} L${svgData.Lx},${svgData.Ly}`" fill="none" stroke-width="12.5"
                stroke-dasharray="none"></path>
              <g>
                <g stroke-dasharray="none">
                  <path d="M-12.5,-12.5L12.5,-12.5L12.5,12.5L-12.5,12.5z" stroke-width="0" fill="none"></path>
                </g>
              </g>
            </g>
            <g no-export="1" transform="scale(1,1) translate(0,0)" stroke="white" fill="none" opacity="0"
              pointer-events="stroke">
              <path :d="`M${svgData.Mx},${svgData.My} L${svgData.Lx},${svgData.Ly}`" fill="none" stroke-width="19.5"
                stroke-dasharray="none"></path>
              <g>
                <g stroke-dasharray="none">
                  <path d="M-19.5,-19.5L19.5,-19.5L19.5,19.5L-19.5,19.5z" stroke-width="0" fill="none"></path>
                </g>
              </g>
            </g>
            <g fill="#9999FF" stroke="#9999FF" stroke-opacity="1" opacity="1" transform="scale(1,1) translate(0,0)">
              <path fill="none" stroke-width="1" stroke-dasharray="none"
                d="M0,-15.5 L0,-43.1 L50.958,-43.1 M76.125,-43.1 L127.083,-43.1 L127.083,-15.5"></path>
              <g>
                <g stroke-dasharray="none">
                  <path d="M-1,-16.5L1,-16.5L1,-14.5L-1,-14.5z" stroke-width="0" fill="none"></path>
                </g>
              </g>
            </g>
            <g width="19.16666603088379" height="11.199999809265137" transform="scale(1,1) translate(53.958,-48.7)"
              style="user-select: none;" opacity="1">
              <rect stroke-width="0" fill="none" visibility="hidden" no-export="1" transform="scale(1,1) translate(0,0)"
                width="19.16666603088379" height="11.199999809265137"></rect><text width="19.16666603088379"
                height="11.199999809265137" transform="scale(1,1) translate(0,0)" xml:space="preserve">
                <tspan xml:space="preserve" text-rendering="optimizeSpeed"
                  style="font-family: &quot;Arial&quot;, &quot;Helvetica Neue&quot;, Helvetica, sans-serif;"
                  font-size="10" font-weight="normal" font-style="normal" text-decoration="none" fill="#000" opacity="1"
                  x="0" text-anchor="start" y="8.8" textLength="19.16666603088379">5'&nbsp;1"</tspan>
              </text>
              <g width="19.16666603088379" height="11.199999809265137" transform="scale(1,1) translate(0,0)"></g>
            </g>
          </g>
        </g>
      </g>
    </svg> -->
  </div>
</template>

<script>
import { defineComponent, onMounted, computed, ref, watch } from "vue";
import { SVG } from '@svgdotjs/svg.js';
import { color } from "echarts";
import T3000 from "src/lib/T3";

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
      // console.log('WallExterior props.item', props.item);

      let width = props.item.width;
      // let height = props.item.rotate == 90 ? props.item.width : Math.abs(props.item.width * Math.sin(props.item.rotate * Math.PI / 180));
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

    onMounted(() => {
      const svgRef = ref(null);
      svgRef.value = SVG().addTo(`#wall_${props.item.id}`).size(props.item.width, props.item.height + 60);
      // svgRef.value.path(svgData.value.path).fill('none').stroke({ color: '#000', width: svgData.value.strokeWidth });
      // console.log('svgRef default', svgData.value.path);

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
        // T3000.Utils.Log('WallExteriorEl', 'refreshSvg', props.item);

        svgRef.value.clear();
        svgRef.value.size(props.item.width, props.item.height + 60);
        renderSvg(newData);
      }

      renderSvg(svgData.value);

      watch(svgData, (newData) => { refreshSvg(newData); }, { deep: true });
    });

    return { svgData };
  },
});
</script>

<style scoped>
.wall-exterior {
  background-color: v-bind("props?.item?.settings?.bgColor");
  /* border: 1px solid #000; */
  margin-top: -60px;
  /* background-color: aqua; */
}
</style>
