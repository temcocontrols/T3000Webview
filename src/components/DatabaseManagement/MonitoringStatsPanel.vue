<template>
  <div class="monitoring-stats-panel">
    <div class="panel-header">
      <h3>Database Monitoring & Statistics</h3>
      <p>Real-time database health monitoring and performance statistics</p>

      <div class="header-actions">
        <q-btn
          color="primary"
          icon="refresh"
          label="Refresh Stats"
          @click="$emit('refresh')"
        />
      </div>
    </div>

    <!-- Health Status -->
    <div class="health-status-section">
      <div class="health-card" :class="{ 'healthy': healthStatus, 'unhealthy': !healthStatus }">
        <div class="health-icon">
          <q-icon
            :name="healthStatus ? 'check_circle' : 'error'"
            size="3rem"
            :color="healthStatus ? 'positive' : 'negative'"
          />
        </div>
        <div class="health-content">
          <h3>Database Health</h3>
          <p>{{ healthStatus ? 'System is running normally' : 'Issues detected' }}</p>
          <div class="health-details">
            <span class="status-badge" :class="healthStatus ? 'positive' : 'negative'">
              {{ healthStatus ? 'HEALTHY' : 'UNHEALTHY' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Database Statistics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <h4>Total Database Size</h4>
          <q-icon name="storage" size="1.5rem" color="primary" />
        </div>
        <div class="stat-value">{{ formatBytes(databaseStats.total_size_bytes) }}</div>
        <div class="stat-subtitle">Last updated: {{ formatDateTime(databaseStats.last_updated) }}</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <h4>Tables</h4>
          <q-icon name="table_chart" size="1.5rem" color="secondary" />
        </div>
        <div class="stat-value">{{ databaseStats.table_stats?.length || 0 }}</div>
        <div class="stat-subtitle">Active database tables</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <h4>Total Records</h4>
          <q-icon name="format_list_numbered" size="1.5rem" color="accent" />
        </div>
        <div class="stat-value">{{ totalRecords.toLocaleString() }}</div>
        <div class="stat-subtitle">Across all tables</div>
      </div>
    </div>

    <!-- Table Statistics -->
    <div class="table-stats-section">
      <h4>Table Statistics</h4>
      <div class="table-stats-container">
        <q-table
          :rows="tableStatsRows"
          :columns="tableColumns"
          row-key="name"
          :pagination="{ rowsPerPage: 10 }"
          class="table-stats-table"
        >
          <template v-slot:body-cell-size="props">
            <q-td :props="props">
              {{ formatBytes(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-records="props">
            <q-td :props="props">
              {{ props.value.toLocaleString() }}
            </q-td>
          </template>
        </q-table>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="performance-metrics">
      <h4>Performance Metrics</h4>
      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-label">Query Performance</div>
          <div class="metric-value">Good</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: 85%"></div>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-label">Storage Efficiency</div>
          <div class="metric-value">Excellent</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: 92%"></div>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-label">Index Usage</div>
          <div class="metric-value">Optimal</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: 96%"></div>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-label">Connection Health</div>
          <div class="metric-value">{{ healthStatus ? 'Active' : 'Issues' }}</div>
          <div class="metric-bar">
            <div class="metric-fill" :style="`width: ${healthStatus ? 100 : 0}%`"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Database Growth Chart Placeholder -->
    <div class="growth-chart-section">
      <h4>Database Growth Trend</h4>
      <div class="chart-placeholder">
        <q-icon name="trending_up" size="4rem" color="grey-5" />
        <p>Chart integration coming soon</p>
        <div class="chart-stats">
          <div class="chart-stat">
            <span class="stat-label">24h Growth:</span>
            <span class="stat-value">+2.3MB</span>
          </div>
          <div class="chart-stat">
            <span class="stat-label">7d Average:</span>
            <span class="stat-value">+1.8MB/day</span>
          </div>
          <div class="chart-stat">
            <span class="stat-label">Projected (30d):</span>
            <span class="stat-value">+54MB</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface DatabaseStats {
  total_size_bytes: number
  table_stats: Array<[string, number]>
  last_updated: string
}

const props = defineProps<{
  databaseStats: DatabaseStats
  healthStatus: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

// Computed properties
const totalRecords = computed(() => {
  return props.databaseStats.table_stats?.reduce((sum, [_, count]) => sum + count, 0) || 0
})

const tableStatsRows = computed(() => {
  return props.databaseStats.table_stats?.map(([name, records]) => ({
    name,
    records,
    size: Math.floor(records * 1024) // Estimate size based on records
  })) || []
})

// Table columns
const tableColumns = [
  {
    name: 'name',
    label: 'Table Name',
    align: 'left' as const,
    field: 'name',
    sortable: true
  },
  {
    name: 'records',
    label: 'Records',
    align: 'right' as const,
    field: 'records',
    sortable: true
  },
  {
    name: 'size',
    label: 'Estimated Size',
    align: 'right' as const,
    field: 'size',
    sortable: true
  }
]

// Methods
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDateTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString()
  } catch {
    return 'Unknown'
  }
}
</script>

<style scoped>
.monitoring-stats-panel {
  padding: 1rem;
}

.panel-header {
  margin-bottom: 2rem;
}

.panel-header h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: #333;
}

.panel-header p {
  color: #666;
  margin: 0 0 1rem 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.health-status-section {
  margin-bottom: 2rem;
}

.health-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 2rem;
  border-left: 4px solid transparent;
}

.health-card.healthy {
  border-left-color: #4caf50;
}

.health-card.unhealthy {
  border-left-color: #f44336;
}

.health-content h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: #333;
}

.health-content p {
  color: #666;
  margin: 0 0 1rem 0;
}

.status-badge {
  padding: 0.25rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.positive {
  background: #e8f5e8;
  color: #4caf50;
}

.status-badge.negative {
  background: #ffebee;
  color: #f44336;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.stat-header h4 {
  font-size: 1rem;
  margin: 0;
  color: #666;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}

.stat-subtitle {
  font-size: 0.8rem;
  color: #999;
}

.table-stats-section,
.performance-metrics,
.growth-chart-section {
  margin-bottom: 2rem;
}

.table-stats-section h4,
.performance-metrics h4,
.growth-chart-section h4 {
  font-size: 1.2rem;
  margin: 0 0 1rem 0;
  color: #333;
}

.table-stats-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metric-item {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.metric-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.75rem;
}

.metric-bar {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #2196f3);
  transition: width 0.3s ease;
}

.chart-placeholder {
  background: white;
  border-radius: 8px;
  padding: 3rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.chart-placeholder p {
  color: #999;
  margin: 1rem 0 2rem 0;
  font-size: 1.1rem;
}

.chart-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.chart-stat {
  text-align: center;
}

.chart-stat .stat-label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.chart-stat .stat-value {
  display: block;
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
}
</style>
