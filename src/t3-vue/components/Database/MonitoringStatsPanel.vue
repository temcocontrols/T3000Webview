<template>
  <div class="database-monitoring-panel">
    <div class="page-header">
      <h2>Database Health Monitoring</h2>
      <p>Monitor database performance, size, and connection health</p>
    </div>

    <!-- Health Overview -->
    <div class="health-overview q-mb-md">
      <q-card flat bordered class="health-card" :class="healthStatus.class">
        <q-card-section>
          <div class="text-h5">
            <q-icon :name="healthStatus.icon" class="q-mr-sm" />
            {{ healthStatus.status }}
          </div>
          <div class="text-caption">Overall System Health</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid q-mb-md">
      <q-card flat bordered>
        <q-card-section>
          <div class="stat-item">
            <div class="stat-value">{{ stats.databaseSize }}</div>
            <div class="stat-label">Database Size</div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="stat-item">
            <div class="stat-value">{{ stats.totalRecords }}</div>
            <div class="stat-label">Total Records</div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="stat-item">
            <div class="stat-value">{{ stats.activeConnections }}</div>
            <div class="stat-label">Active Connections</div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="stat-item">
            <div class="stat-value">{{ stats.avgQueryTime }}ms</div>
            <div class="stat-label">Avg Query Time</div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Table Statistics -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Table Statistics</div>
        <q-table
          :rows="tableStats"
          :columns="tableColumns"
          row-key="table_name"
          :loading="loading"
        >
          <template v-slot:body-cell-size="props">
            <q-td :props="props">
              {{ formatBytes(props.row.size_bytes) }}
            </q-td>
          </template>

          <template v-slot:body-cell-health="props">
            <q-td :props="props">
              <q-badge
                :color="getHealthColor(props.row.health_score)"
                :label="props.row.health_score + '%'"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Performance Chart -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Performance Trends</div>
        <div class="chart-placeholder">
          <div class="chart-message">
            <q-icon name="timeline" size="3rem" color="grey-5" />
            <div class="q-mt-sm text-grey-6">Performance chart will be displayed here</div>
            <div class="text-caption text-grey-5">Integration with Chart.js or similar charting library</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- System Information -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-h6 q-mb-md">System Information</div>
        <div class="system-info">
          <div class="info-row">
            <span class="info-label">Database Engine:</span>
            <span class="info-value">SQLite {{ stats.sqliteVersion }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Database Path:</span>
            <span class="info-value">{{ stats.databasePath }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Last Backup:</span>
            <span class="info-value">{{ stats.lastBackup }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Last Vacuum:</span>
            <span class="info-value">{{ stats.lastVacuum }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Uptime:</span>
            <span class="info-value">{{ stats.uptime }}</span>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Auto Refresh Controls -->
    <div class="refresh-controls q-mt-md">
      <q-btn
        color="primary"
        icon="refresh"
        label="Refresh Now"
        @click="refreshStats"
      />
      <q-toggle
        v-model="autoRefresh"
        label="Auto Refresh (30s)"
        @update:model-value="toggleAutoRefresh"
        class="q-ml-md"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'

export default {
  name: 'MonitoringStatsPanel',
  setup() {
    const $q = useQuasar()

    const loading = ref(false)
    const autoRefresh = ref(false)
    const refreshInterval = ref(null)

    const stats = ref({
      databaseSize: '45.2 MB',
      totalRecords: '127,543',
      activeConnections: 3,
      avgQueryTime: 12,
      sqliteVersion: '3.42.0',
      databasePath: 'Database/webview_t3_device.db',
      lastBackup: '2025-09-26 08:30:00',
      lastVacuum: '2025-09-25 22:15:00',
      uptime: '2 days, 14 hours'
    })

    const healthStatus = ref({
      status: 'Good',
      icon: 'check_circle',
      class: 'health-good'
    })

    const tableStats = ref([
      {
        table_name: 'APPLICATION_SETTINGS',
        record_count: 15,
        size_bytes: 8192,
        health_score: 98
      },
      {
        table_name: 'DATABASE_PARTITIONS',
        record_count: 3,
        size_bytes: 4096,
        health_score: 95
      },
      {
        table_name: 'TRENDLOG_DATA',
        record_count: 125420,
        size_bytes: 47185920,
        health_score: 87
      },
      {
        table_name: 'T3_DEVICE',
        record_count: 12,
        size_bytes: 16384,
        health_score: 100
      }
    ])

    const tableColumns = [
      { name: 'table_name', label: 'Table Name', field: 'table_name', sortable: true, align: 'left' },
      { name: 'record_count', label: 'Records', field: 'record_count', sortable: true, align: 'right' },
      { name: 'size', label: 'Size', field: 'size_bytes', sortable: true, align: 'right' },
      { name: 'health', label: 'Health', field: 'health_score', sortable: true, align: 'center' }
    ]

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getHealthColor = (score) => {
      if (score >= 95) return 'positive'
      if (score >= 80) return 'warning'
      return 'negative'
    }

    const refreshStats = async () => {
      loading.value = true
      try {
        // TODO: Make actual API calls to get real stats
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call

        $q.notify({
          type: 'positive',
          message: 'Statistics refreshed'
        })
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Failed to refresh statistics'
        })
      } finally {
        loading.value = false
      }
    }

    const toggleAutoRefresh = (enabled) => {
      if (enabled) {
        refreshInterval.value = setInterval(() => {
          refreshStats()
        }, 30000) // 30 seconds
        $q.notify({
          type: 'info',
          message: 'Auto refresh enabled (30s interval)'
        })
      } else {
        if (refreshInterval.value) {
          clearInterval(refreshInterval.value)
          refreshInterval.value = null
        }
        $q.notify({
          type: 'info',
          message: 'Auto refresh disabled'
        })
      }
    }

    onMounted(() => {
      refreshStats()
    })

    onUnmounted(() => {
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
      }
    })

    return {
      loading,
      autoRefresh,
      stats,
      healthStatus,
      tableStats,
      tableColumns,
      formatBytes,
      getHealthColor,
      refreshStats,
      toggleAutoRefresh
    }
  }
}
</script>

<style scoped>
.monitoring-stats-panel {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h2 {
  margin: 0 0 10px 0;
  color: #1976d2;
}

.health-overview {
  display: flex;
  justify-content: center;
}

.health-card {
  min-width: 200px;
  text-align: center;
}

.health-good {
  border-left: 4px solid #4caf50;
}

.health-warning {
  border-left: 4px solid #ff9800;
}

.health-error {
  border-left: 4px solid #f44336;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #1976d2;
  margin-bottom: 5px;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  border: 2px dashed #ddd;
}

.chart-message {
  text-align: center;
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.info-label {
  font-weight: 500;
  color: #666;
}

.info-value {
  color: #333;
}

.refresh-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

@media (max-width: 768px) {
  .monitoring-stats-panel {
    padding: 10px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .info-row {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
