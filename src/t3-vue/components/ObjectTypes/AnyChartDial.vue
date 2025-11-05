<template>
  <div
    class="dial-chart"
    style="height: 100%; max-width: 170px"
    ref="gaugeElement"
  ></div>
</template>

<script>
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
} from "vue";
import anychart from "anychart";

export default defineComponent({
  name: "DialChart",
  props: {
    options: {
      type: Object,
      default: () => null,
    },
  },
  setup(props) {
    const gauge = ref(null);
    const gaugeElement = ref(null);
    const options = computed(() => {
      return props.options;
    });

    onMounted(() => {
      if (!gauge.value && props.options) {
        init();
      }
    });

    onUnmounted(() => {
      if (gauge.value) {
        gauge.value.dispose();
        gauge.value = null;
      }
    });

    watch(options, async (newOptions, _oldOptions) => {
      if (!gauge.value && newOptions) {
        init();
      } else {
        gauge.value.dispose();
        gauge.value = null;
        init();
      }
    });

    function init() {
      if (!gauge.value && props.options) {
        // create data
        var data = [props.options.value];

        // set the gauge type
        gauge.value = anychart.gauges.linear();

        gauge.value.background().fill(false);

        // set the data for the gauge
        gauge.value.data(data);

        // set the layout
        gauge.value.layout("vertical");

        // create a color scale
        var scaleBarColorScale = anychart.scales.ordinalColor().ranges(
          props.options.colors || [
            {
              from: 0,
              to: 30,
              color: ["#14BE64"],
            },
            {
              from: 30,
              to: 70,
              color: ["#FFB100"],
            },
            {
              from: 70,
              to: 100,
              color: ["#fd666d"],
            },
          ]
        );

        // create a Scale Bar
        var scaleBar = gauge.value.scaleBar(0);

        // set the height and offset of the Scale Bar (both as percentages of the gauge height)
        scaleBar.width("60%");
        scaleBar.offset("32.5%");

        // use the color scale (defined earlier) as the color scale of the Scale Bar
        scaleBar.colorScale(scaleBarColorScale);

        // add a marker pointer
        var marker = gauge.value.marker(0);

        // set the offset of the pointer as a percentage of the gauge width
        marker.offset("86%");

        // set the marker type
        marker.type("triangle-left");
        marker.width("20%");
        // marker.stroke({ thickness: 7, color: "#64b5f6" });

        // set the zIndex of the marker
        marker.zIndex(10);

        // configure the scale
        var scale = gauge.value.scale();
        scale.minimum(props.options.min);
        scale.maximum(props.options.max);
        const dialRangeTotal = props.options.max + props.options.min * -1;
        scale.ticks().interval(dialRangeTotal / props.options.ticks || 5);
        scale
          .minorTicks()
          .interval(
            dialRangeTotal / props.options.ticks / props.options.minorTicks || 2
          );

        // configure the axis
        var axis = gauge.value.axis();
        axis.minorTicks(true);
        axis
          .minorTicks()
          .stroke("#cecece")
          .length(5)
          .stroke(props.options.textColor || "#000000");
        axis.width(34);
        // axis.offset("4%");
        axis.padding([1, 0]);
        axis.orientation("left");
        axis.stroke(null);
        axis
          .ticks()
          .length(10)
          .stroke(props.options.textColor || "#000000");

        // format axis labels
        axis.labels().format(function () {
          return Math.round(this.value);
        });
        axis.labels().fontColor(props.options.textColor || "#000000");

        // set paddings
        gauge.value.padding([10, 2, 10, 20]);

        // set the container id
        gauge.value.container(gaugeElement.value);

        // initiate drawing the gauge
        gauge.value.draw();
      }
    }

    return {
      gaugeElement,
    };
  },
});
</script>

<style>
.anychart-credits {
  display: none;
}
</style>
