<template>
  <div class="svg-test">
    <h3>SVG Test Component</h3>
    <svg width="400" height="200" viewBox="0 0 400 200">
      <!-- Simple line -->
      <line x1="10" y1="10" x2="390" y2="10" stroke="#ccc" stroke-width="1"/>

      <!-- Test data -->
      <g v-if="testData.length > 0">
        <path
          :d="generatePath()"
          stroke="#ff6b6b"
          stroke-width="2"
          fill="none"
        />
      </g>

      <!-- Labels -->
      <text x="200" y="30" text-anchor="middle" fill="#ccc">Test Chart</text>
    </svg>

    <p>Data points: {{ testData.length }}</p>
    <pre>{{ JSON.stringify(testData, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Point {
  x: number
  y: number
}

const testData = ref<Point[]>([
  { x: 50, y: 100 },
  { x: 150, y: 80 },
  { x: 250, y: 120 },
  { x: 350, y: 90 }
])

const generatePath = (): string => {
  if (testData.value.length === 0) return ''

  return testData.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
}
</script>

<style scoped>
.svg-test {
  padding: 20px;
  background: #f5f5f5;
  border: 1px solid #ddd;
}
</style>
