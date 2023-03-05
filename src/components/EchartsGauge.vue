<template>
  <v-chart class="chart" :option="options" autoresize />
</template>

<script setup>
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { GaugeChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import VChart, { /* THEME_KEY */ } from 'vue-echarts';
import { computed, /* provide */ } from 'vue';

use([
  CanvasRenderer,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
]);

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  value: {
    type: Number,
    default: 0
  },
  splitNumber: {
    type: Number,
    default: 10
  },
  unit: {
    type: String,
    default: ''
  },
  colors: {
    type: Array,
    default: () => [
      [0.3, '#14BE64'],
      [0.7, '#FFB100'],
      [1, '#fd666d'],
    ]
  },
})

const options = computed(() => {
  return {
    series: [
      {
        type: 'gauge',

        radius: '85%',
        min: props.min,
        max: props.max,
        splitNumber: props.splitNumber,
        axisLine: {
          lineStyle: {
            width: 30,
            color: props.colors,
          },
        },
        pointer: {
          itemStyle: {
            color: 'inherit',
          },
        },
        axisTick: {
          distance: -10,
          length: 10,
          lineStyle: {
            color: '#fff',
            width: 1,
          },
        },
        splitLine: {
          distance: -30,
          length: 30,
          lineStyle: {
            color: '#fff',
            width: 2,
          },
        },
        axisLabel: {
          color: 'inherit',
          distance: -20,
          fontSize: 13,
        },
        detail: {
          valueAnimation: true,
          formatter: `{value} ${props.unit}`,
          color: 'inherit',
          fontSize: 18,
        },
        data: [
          {
            value: props.value,
          },
        ],
      },
    ],
  }
})
</script>

<style scoped>
.chart {
  height: 100%;
}
</style>
