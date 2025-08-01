<template>
  <div class="trend-log-page">
    <div class="page-header">
      <h1 class="page-title">Trend Log Analysis</h1>
      <p class="page-description">Real-time and historical data visualization for T3000 systems</p>
    </div>

    <div class="chart-wrapper">
      <TrendLogChart
        :itemData="currentItemData"
        :title="pageTitle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineOptions } from 'vue'
import TrendLogChart from 'src/components/NewUI/TrendLogChart.vue'
import { scheduleItemData } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant'

// Define component name
defineOptions({
  name: 'TrendLogIndexPage'
})

// Page state
const pageTitle = ref('T3000 Trend Log Analysis')

// Use the same item data as the modal, or provide a default
const currentItemData = computed(() => {
  return scheduleItemData.value || {
    t3Entry: {
      description: 'Trend Log Chart',
      label: 'T3000 Data Analysis',
      id: 'trend-log-1',
      pid: 1
    },
    title: 'Trend Log Analysis'
  }
})

onMounted(() => {
  // Any page-specific initialization can go here
})
</script>

<style scoped>
.trend-log-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  background: #f5f5f5;
  overflow: hidden;
}

.page-header {
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  padding: 16px 24px 12px;
  flex-shrink: 0;
}

.page-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  line-height: 1.2;
}

.page-description {
  margin: 0;
  font-size: 14px;
  color: #8c8c8c;
  line-height: 1.4;
}

.chart-wrapper {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  overflow: hidden;
}

/* Ensure the chart component fills the available space */
.chart-wrapper :deep(.trendlog-chart-component) {
  height: 100%;
  background: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px 8px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-description {
    font-size: 13px;
  }

  .chart-wrapper {
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 8px 12px 6px;
  }

  .page-title {
    font-size: 18px;
  }

  .page-description {
    font-size: 12px;
  }

  .chart-wrapper {
    padding: 4px;
  }
}
</style>
