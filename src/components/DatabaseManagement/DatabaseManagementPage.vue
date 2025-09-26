<template>
  <div class="database-management-container">
    <!-- Header -->
    <div class="db-management-header">
      <h2 class="page-title">Database Management</h2>
      <p class="page-subtitle">
        Comprehensive database management including settings storage, partitioning, and cleanup tools
      </p>
    </div>

    <!-- Quick Stats Cards -->
    <div class="stats-cards-grid">
      <div class="stats-card">
        <div class="stat-icon">
          <q-icon name="storage" size="2rem" color="primary" />
        </div>
        <div class="stat-content">
          <h3>{{ formatBytes(databaseStats.total_size_bytes) }}</h3>
          <p>Database Size</p>
        </div>
      </div>

      <div class="stats-card">
        <div class="stat-icon">
          <q-icon name="settings" size="2rem" color="secondary" />
        </div>
        <div class="stat-content">
          <h3>{{ applicationSettings.length }}</h3>
          <p>Application Settings</p>
        </div>
      </div>

      <div class="stats-card">
        <div class="stat-icon">
          <q-icon name="auto_awesome" size="2rem" color="accent" />
        </div>
        <div class="stat-content">
          <h3>{{ activePartitions }}</h3>
          <p>Active Partitions</p>
        </div>
      </div>

      <div class="stats-card">
        <div class="stat-icon">
          <q-icon name="health_and_safety" size="2rem" color="positive" />
        </div>
        <div class="stat-content">
          <h3>{{ databaseHealth ? 'Healthy' : 'Issues' }}</h3>
          <p>Database Health</p>
        </div>
      </div>
    </div>

    <!-- Main Content Tabs -->
    <div class="main-content">
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="settings" label="Application Settings" />
        <q-tab name="partitions" label="Database Partitions" />
        <q-tab name="monitoring" label="Monitoring & Stats" />
        <q-tab name="tools" label="Management Tools" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Application Settings Panel -->
        <q-tab-panel name="settings" class="q-pa-md">
          <ApplicationSettingsPanel
            :settings="applicationSettings"
            @refresh="loadApplicationSettings"
            @migrate-localstorage="handleLocalStorageMigration"
          />
        </q-tab-panel>

        <!-- Database Partitions Panel -->
        <q-tab-panel name="partitions" class="q-pa-md">
          <DatabasePartitionsPanel
            :partitions="databasePartitions"
            @refresh="loadDatabasePartitions"
            @cleanup="handlePartitionCleanup"
          />
        </q-tab-panel>

        <!-- Monitoring & Stats Panel -->
        <q-tab-panel name="monitoring" class="q-pa-md">
          <MonitoringStatsPanel
            :database-stats="databaseStats"
            :health-status="databaseHealth"
            @refresh="loadDatabaseStats"
          />
        </q-tab-panel>

        <!-- Management Tools Panel -->
        <q-tab-panel name="tools" class="q-pa-md">
          <ManagementToolsPanel
            @vacuum="handleVacuum"
            @analyze="handleAnalyze"
            @backup="handleBackup"
          />
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <q-btn
        color="primary"
        icon="refresh"
        label="Refresh All"
        @click="refreshAllData"
        :loading="loading.refresh"
      />

      <q-btn
        color="secondary"
        icon="build"
        label="Auto-Cleanup"
        @click="handleAutoCleanup"
        :loading="loading.cleanup"
      />

      <q-btn
        color="accent"
        icon="import_export"
        label="Export Settings"
        @click="handleExportSettings"
      />
    </div>

    <!-- Notifications -->
    <q-banner
      v-if="notification.message"
      :class="`bg-${notification.type} text-white`"
      dense
    >
      <template v-slot:avatar>
        <q-icon
          :name="notification.type === 'positive' ? 'check_circle' :
                 notification.type === 'negative' ? 'error' : 'info'"
        />
      </template>
      {{ notification.message }}
      <template v-slot:action>
        <q-btn
          flat
          color="white"
          icon="close"
          @click="clearNotification"
        />
      </template>
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import ApplicationSettingsPanel from './ApplicationSettingsPanel.vue'
import DatabasePartitionsPanel from './DatabasePartitionsPanel.vue'
import MonitoringStatsPanel from './MonitoringStatsPanel.vue'
import ManagementToolsPanel from './ManagementToolsPanel.vue'

// Reactive state
const activeTab = ref('settings')
const applicationSettings = ref([])
const databasePartitions = ref([])
const databaseStats = ref({
  total_size_bytes: 0,
  table_stats: [],
  last_updated: new Date()
})
const databaseHealth = ref(true)

const loading = reactive({
  refresh: false,
  cleanup: false,
  settings: false,
  partitions: false,
  stats: false
})

const notification = reactive({
  message: '',
  type: 'info' // 'positive', 'negative', 'warning', 'info'
})

// Computed properties
const activePartitions = computed(() => {
  return databasePartitions.value.filter((p: any) => p.is_active).length
})

// Utility functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const showNotification = (message: string, type: string = 'info') => {
  notification.message = message
  notification.type = type
  setTimeout(() => {
    clearNotification()
  }, 5000)
}

const clearNotification = () => {
  notification.message = ''
  notification.type = 'info'
}

// API functions
const loadApplicationSettings = async () => {
  try {
    loading.settings = true
    const response = await api.get('/api/db_management/settings')
    if (response.data.success) {
      applicationSettings.value = response.data.settings || []
    }
  } catch (error) {
    console.error('Error loading application settings:', error)
    showNotification('Failed to load application settings', 'negative')
  } finally {
    loading.settings = false
  }
}

const loadDatabasePartitions = async () => {
  try {
    loading.partitions = true
    const response = await api.get('/api/db_management/partitions')
    if (response.data.success) {
      databasePartitions.value = response.data.partitions || []
    }
  } catch (error) {
    console.error('Error loading database partitions:', error)
    showNotification('Failed to load database partitions', 'negative')
  } finally {
    loading.partitions = false
  }
}

const loadDatabaseStats = async () => {
  try {
    loading.stats = true
    const [statsResponse, healthResponse] = await Promise.all([
      api.get('/api/db_management/stats'),
      api.get('/api/db_management/health')
    ])

    if (statsResponse.data.success) {
      databaseStats.value = statsResponse.data.stats
    }

    if (healthResponse.data.success) {
      databaseHealth.value = healthResponse.data.healthy
    }
  } catch (error) {
    console.error('Error loading database stats:', error)
    showNotification('Failed to load database statistics', 'negative')
  } finally {
    loading.stats = false
  }
}

const refreshAllData = async () => {
  try {
    loading.refresh = true
    await Promise.all([
      loadApplicationSettings(),
      loadDatabasePartitions(),
      loadDatabaseStats()
    ])
    showNotification('All data refreshed successfully', 'positive')
  } catch (error) {
    showNotification('Error refreshing data', 'negative')
  } finally {
    loading.refresh = false
  }
}

// Event handlers
const handleLocalStorageMigration = async (localStorageData: Record<string, any>) => {
  try {
    const response = await api.post('/api/db_management/settings/migrate', {
      data: localStorageData
    })

    if (response.data.success) {
      showNotification(
        `Successfully migrated ${response.data.migrated_count} localStorage items`,
        'positive'
      )
      await loadApplicationSettings()
    } else {
      showNotification('Migration failed', 'negative')
    }
  } catch (error) {
    console.error('Error migrating localStorage:', error)
    showNotification('Error during localStorage migration', 'negative')
  }
}

const handlePartitionCleanup = async () => {
  try {
    loading.cleanup = true
    const response = await api.post('/api/db_management/partitions/cleanup')

    if (response.data.success) {
      showNotification(response.data.message, 'positive')
      await loadDatabasePartitions()
      await loadDatabaseStats()
    } else {
      showNotification('Cleanup failed', 'negative')
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
    showNotification('Error during partition cleanup', 'negative')
  } finally {
    loading.cleanup = false
  }
}

const handleAutoCleanup = async () => {
  await handlePartitionCleanup()
}

const handleVacuum = async () => {
  try {
    const response = await api.post('/api/db_management/tools/vacuum')
    if (response.data.success) {
      showNotification('Database vacuum completed successfully', 'positive')
      await loadDatabaseStats()
    } else {
      showNotification('Vacuum failed', 'negative')
    }
  } catch (error) {
    showNotification('Error during database vacuum', 'negative')
  }
}

const handleAnalyze = async () => {
  try {
    const response = await api.post('/api/db_management/tools/analyze')
    if (response.data.success) {
      showNotification('Database analysis completed successfully', 'positive')
    } else {
      showNotification('Analysis failed', 'negative')
    }
  } catch (error) {
    showNotification('Error during database analysis', 'negative')
  }
}

const handleBackup = async () => {
  try {
    const response = await api.post('/api/db_management/tools/backup')
    if (response.data.success) {
      showNotification('Database backup completed successfully', 'positive')
    } else {
      showNotification(response.data.message || 'Backup failed', 'warning')
    }
  } catch (error) {
    showNotification('Error during database backup', 'negative')
  }
}

const handleExportSettings = () => {
  const settingsData = JSON.stringify(applicationSettings.value, null, 2)
  const blob = new Blob([settingsData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `t3000_settings_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showNotification('Settings exported successfully', 'positive')
}

// Lifecycle
onMounted(() => {
  refreshAllData()
})
</script>

<style scoped>
.database-management-container {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.db-management-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 0.5rem;
  color: #1976d2;
}

.page-subtitle {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

.stats-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content h3 {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.stat-content p {
  font-size: 0.9rem;
  color: #666;
  margin: 0.25rem 0 0 0;
}

.main-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  overflow: hidden;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .stats-cards-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .page-title {
    font-size: 2rem;
  }
}
</style>
