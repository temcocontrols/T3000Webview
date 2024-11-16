<template>
  <!-- <div :id="`wall_${item.id}`" ref="wallExterior" class="wall-exterior" :width="item.width" :height="item.height"></div> 72.917,56.25 -->
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
              style="font-family: &quot;Arial&quot;, &quot;Helvetica Neue&quot;, Helvetica, sans-serif;" font-size="10"
              font-weight="normal" font-style="normal" text-decoration="none" fill="#000" opacity="1" x="0"
              text-anchor="start" y="8.8" textLength="19.16666603088379">5'&nbsp;1"</tspan>
          </text>
          <g width="19.16666603088379" height="11.199999809265137" transform="scale(1,1) translate(0,0)"></g>
        </g>
      </g>
    </g>
  </g>
  <!-- <g transform="scale(0.96,0.96) translate(0,0)" no-export="1" style="">
      <g width="145.833" height="18.75" transform="scale(1,1) translate(63.542,46.875)" style="user-select: none;">
        <image fill="black" class="cur-ew-resize" width="18.75" height="18.75" transform="scale(1,1) translate(0,0)"
          fill-opacity="1" stroke-width="1" stroke-dasharray="none" stroke="#777777" preserveAspectRatio="none"
          xlink:href="expand-diagonal-handle-2.svg" no-export="1"></image>
        <image fill="black" class="cur-ew-resize" width="18.75" height="18.75"
          transform="scale(1,1) translate(127.083,0)" fill-opacity="1" stroke-width="1" stroke-dasharray="none"
          stroke="#777777" preserveAspectRatio="none" xlink:href="expand-diagonal-handle-2.svg" no-export="1"></image>
        <g fill="white" class="cur-rotate" width="7.292" height="7.292" transform="scale(1,1) translate(110.938,5.729)"
          fill-opacity="0.001" stroke-width="2.5" stroke-dasharray="none" stroke="white">
          <ellipse rx="3.646" ry="3.646" cx="3.646" cy="3.646"></ellipse>
        </g>
        <g fill="white" class="cur-rotate" width="7.292" height="7.292" transform="scale(1,1) translate(110.938,5.729)"
          fill-opacity="0.001" stroke-width="1" stroke-dasharray="none" stroke="black">
          <ellipse rx="3.646" ry="3.646" cx="3.646" cy="3.646"></ellipse>
        </g>
        <g transform="scale(1,1) translate(102.812,-38.413)" pointer-events="visible" fill="black" class="cur-ns-resize"
          fill-opacity="1" stroke="black">
          <path d="M0,4.688 L4.688,0 L9.375,4.688 L4.688,9.375 z" stroke-width="1" stroke-dasharray="none"></path>
          <g></g>
        </g>
      </g>
    </g> -->

</template>

<script>
import { defineComponent, onMounted, computed, ref } from "vue";

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
      let height = props.item.rotate == 90 ? props.item.width : Math.abs(props.item.width * Math.sin(props.item.rotate * Math.PI / 180));
      let trsX = props.item.translate[0];
      let trsY = props.item.translate[1];
      let Mx = 0;
      let My = 0;
      let Lx = props.item.width;
      let Ly = height != 0 ? height : 0;

      return {
        width,
        height,
        trsX,
        trsY,
        Mx,
        My,
        Lx,
        Ly
      };
    });

    onMounted(() => {
    });

    return { svgData };
  },
});
</script>

<style scoped>
.wall-exterior {
  background-color: v-bind("props?.item?.settings?.bgColor");
}
</style>
