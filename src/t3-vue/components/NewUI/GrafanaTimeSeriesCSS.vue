<template>
  <div class="grafana-timeseries-container">
    <div class="grafana-panel-header">
      <div class="panel-title">{{ title }} (CSS Version)</div>
    </div>

    <!-- Pure HTML/CSS Chart - NO CANVAS, NO SVG -->
    <div class="css-chart-container" :style="{ height: `${height}px` }">
      <div class="chart-grid">
        <!-- Grid lines with CSS -->
        <div class="grid-lines">
          <div v-for="i in 10" :key="i" class="grid-line-y"></div>
          <div v-for="i in 6" :key="i" class="grid-line-x"></div>
        </div>

        <!-- Data visualization with CSS -->
        <div class="data-container">
          <div
            v-for="series in visibleSeries"
            :key="series.name"
            class="data-series"
          >
            <div
              v-for="(point, index) in series.data"
              :key="index"
              class="data-point"
              :style="{
                left: `${(index / series.data.length) * 100}%`,
                bottom: `${((point.value - 60) / 10) * 100}%`,
                backgroundColor: series.color
              }"
            ></div>

            <!-- CSS Line connections -->
            <div
              v-for="(point, index) in series.data.slice(0, -1)"
              :key="`line-${index}`"
              class="data-line"
              :style="{
                left: `${(index / series.data.length) * 100}%`,
                bottom: `${((point.value - 60) / 10) * 100}%`,
                width: `${100 / series.data.length}%`,
                height: '2px',
                backgroundColor: series.color,
                transform: `rotate(${calculateAngle(point, series.data[index + 1])}deg)`,
                transformOrigin: 'left center'
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface DataPoint {
  timestamp: number
  value: number
}

interface SeriesConfig {
  name: string
  color: string
  data: DataPoint[]
  visible: boolean
}

const props = withDefaults(defineProps<{
  title?: string
  height?: number
}>(), {
  title: 'CSS Time Series',
  height: 400
})

const dataSeries = ref<SeriesConfig[]>([
  {
    name: 'Series 1',
    color: '#FF6B6B',
    data: Array.from({length: 20}, (_, i) => ({
      timestamp: Date.now() - i * 60000,
      value: 62 + Math.sin(i * 0.5) * 3 + Math.random() * 2
    })),
    visible: true
  }
])

const visibleSeries = computed(() => dataSeries.value.filter(s => s.visible))

const calculateAngle = (point1: DataPoint, point2: DataPoint): number => {
  const deltaY = point2.value - point1.value
  const deltaX = 1 // Normalized
  return Math.atan2(deltaY, deltaX) * (180 / Math.PI)
}
</script>

<style scoped>
.grafana-timeseries-container {
  background: #181b1f;
  border: 1px solid #36414b;
  border-radius: 3px;
  color: #d9d9d9;
}

.grafana-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1e2328;
  border-bottom: 1px solid #36414b;
}

.css-chart-container {
  padding: 16px;
  position: relative;
}

.chart-grid {
  position: relative;
  width: 100%;
  height: 100%;
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.grid-line-y {
  position: absolute;
  width: 1px;
  height: 100%;
  background: #36414b;
  left: calc(var(--i) * 10%);
}

.grid-line-x {
  position: absolute;
  height: 1px;
  width: 100%;
  background: #36414b;
  bottom: calc(var(--i) * 20%);
}

.data-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.data-series {
  position: absolute;
  width: 100%;
  height: 100%;
}

.data-point {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transform: translate(-50%, 50%);
}

.data-line {
  position: absolute;
  height: 2px;
}
</style>
