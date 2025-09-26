<template>
  <q-dialog v-model="isVisible" position="right" maximized>
    <q-card class="database-management-popup">
      <q-card-section class="popup-header">
        <div class="header-content">
          <h3>Database Management</h3>
          <p>TrendLog Settings & Database Tools</p>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          v-close-popup
          class="close-button"
        />
      </q-card-section>

      <q-separator />

      <!-- TrendLog Specific Settings -->
      <q-card-section class="trendlog-settings-section">
        <h4>TrendLog Configuration</h4>

        <!-- Current Device Info -->
        <div class="device-info-card">
          <div class="info-item">
            <span class="label">Device Serial:</span>
            <span class="value">{{ deviceInfo.serial || 'Not selected' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Panel ID:</span>
            <span class="value">{{ deviceInfo.panelId || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="label">TrendLog ID:</span>
            <span class="value">{{ deviceInfo.trendlogId || 'Default' }}</span>
          </div>
        </div>

        <!-- TrendLog Settings -->
        <div class="trendlog-controls">
          <q-expansion-item
            label="View Configuration"
            icon="visibility"
            default-opened
          >
            <div class="expansion-content">
              <div class="setting-row">
                <q-checkbox
                  v-model="trendlogSettings.autoSave"
                  label="Auto-save view selections"
                />
              </div>

              <div class="setting-row">
                <q-input
                  v-model.number="trendlogSettings.refreshInterval"
                  type="number"
                  label="Refresh Interval (seconds)"
                  outlined
                  dense
                  style="width: 200px"
                />
              </div>

              <div class="setting-row">
                <q-select
                  v-model="trendlogSettings.defaultTimeRange"
                  :options="timeRangeOptions"
                  label="Default Time Range"
                  outlined
                  dense
                  style="width: 200px"
                />
              </div>
            </div>
          </q-expansion-item>

          <q-expansion-item
            label="Data Retention"
            icon="schedule"
          >
            <div class="expansion-content">
              <div class="setting-row">
                <q-input
                  v-model.number="trendlogSettings.retentionDays"
                  type="number"
                  label="Data Retention (days)"
                  outlined
                  dense
                  style="width: 200px"
                />
              </div>

              <div class="setting-row">
                <q-toggle
                  v-model="trendlogSettings.autoCleanup"
                  label="Enable automatic cleanup"
                />
              </div>
            </div>
          </q-expansion-item>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <q-btn
            color="primary"
            icon="save"
            label="Save TrendLog Settings"
            @click="saveTrendlogSettings"
          />

          <q-btn
            color="secondary"
            icon="restore"
            label="Reset to Defaults"
            @click="resetTrendlogSettings"
          />
        </div>
      </q-card-section>

      <q-separator />

      <!-- Mini Database Management -->
      <q-card-section class="mini-db-section">
        <h4>Database Quick Tools</h4>

        <!-- Database Stats Summary -->
        <div class="stats-summary">
          <div class="stat-item">
            <div class="stat-value">{{ formatBytes(dbStats.totalSize) }}</div>
            <div class="stat-label">Database Size</div>
          </div>

          <div class="stat-item">
            <div class="stat-value">{{ dbStats.trendlogRecords.toLocaleString() }}</div>
            <div class="stat-label">TrendLog Records</div>
          </div>

          <div class="stat-item">
            <div class="stat-value">{{ dbStats.settingsCount }}</div>
            <div class="stat-label">Settings Stored</div>
          </div>
        </div>

        <!-- Quick Tools -->
        <div class="quick-tools">
          <q-btn-group flat>
            <q-btn
              flat
              icon="cleaning_services"
              label="Vacuum"
              @click="quickVacuum"
              :loading="loading.vacuum"
            />

            <q-btn
              flat
              icon="analytics"
              label="Analyze"
              @click="quickAnalyze"
              :loading="loading.analyze"
            />

            <q-btn
              flat
              icon="refresh"
              label="Refresh Stats"
              @click="refreshStats"
              :loading="loading.stats"
            />
          </q-btn-group>
        </div>

        <!-- Settings Migration -->
        <div class="migration-section">
          <q-expansion-item
            label="localStorage Migration"
            icon="cloud_upload"
          >
            <div class="expansion-content">
              <p>Migrate your browser localStorage data to the database for better reliability.</p>

              <div class="migration-controls">
                <q-btn
                  color="accent"
                  icon="upload"
                  label="Migrate Now"
                  @click="migrateLocalStorage"
                  :loading="loading.migrate"
                />

                <q-btn
                  flat
                  icon="visibility"
                  label="Preview Data"
                  @click="previewLocalStorage"
                />
              </div>
            </div>
          </q-expansion-item>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Link to Full Management -->
      <q-card-section class="full-management-section">
        <div class="management-link">
          <div class="link-content">
            <h5>Need More Control?</h5>
            <p>Access the full database management interface for advanced features including partitioning, detailed monitoring, and comprehensive tools.</p>
          </div>
          <q-btn
            color="primary"
            icon="open_in_new"
            label="Open Full Management"
            @click="openFullManagement"
          />
        </div>
      </q-card-section>

      <!-- Footer Actions -->
      <q-card-actions align="right" class="popup-footer">
        <q-btn
          flat
          label="Close"
          color="primary"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

// Props
const props = defineProps<{
  visible: boolean
  deviceSerial?: number | null
  panelId?: number | null
  trendlogId?: string | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-full-management': []
}>()

// Reactive state
const trendlogSettings = reactive({
  autoSave: true,
  refreshInterval: 30,
  defaultTimeRange: '24h',
  retentionDays: 30,
  autoCleanup: true
})

const dbStats = reactive({
  totalSize: 0,
  trendlogRecords: 0,
  settingsCount: 0
})

const loading = reactive({
  vacuum: false,
  analyze: false,
  stats: false,
  migrate: false
})

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const deviceInfo = computed(() => ({
  serial: props.deviceSerial,
  panelId: props.panelId,
  trendlogId: props.trendlogId
}))

// Options
const timeRangeOptions = [
  { label: '1 Hour', value: '1h' },
  { label: '4 Hours', value: '4h' },
  { label: '12 Hours', value: '12h' },
  { label: '24 Hours', value: '24h' },
  { label: '3 Days', value: '3d' },
  { label: '1 Week', value: '1w' },
  { label: '1 Month', value: '1m' }
]

// Methods
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const saveTrendlogSettings = async () => {
  try {
    // Save settings to database with device context
    const settingsData = {
      ...trendlogSettings,
      deviceSerial: props.deviceSerial,
      panelId: props.panelId,
      trendlogId: props.trendlogId
    }

    console.log('Saving TrendLog settings:', settingsData)
    // API call would go here

    // Show success notification
  } catch (error) {
    console.error('Error saving TrendLog settings:', error)
  }
}

const resetTrendlogSettings = () => {
  trendlogSettings.autoSave = true
  trendlogSettings.refreshInterval = 30
  trendlogSettings.defaultTimeRange = '24h'
  trendlogSettings.retentionDays = 30
  trendlogSettings.autoCleanup = true
}

const quickVacuum = async () => {
  loading.vacuum = true
  try {
    // API call for vacuum
    console.log('Running database vacuum...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
    await refreshStats()
  } finally {
    loading.vacuum = false
  }
}

const quickAnalyze = async () => {
  loading.analyze = true
  try {
    // API call for analyze
    console.log('Running database analysis...')
    await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
  } finally {
    loading.analyze = false
  }
}

const refreshStats = async () => {
  loading.stats = true
  try {
    // Mock data - replace with real API calls
    dbStats.totalSize = Math.floor(Math.random() * 100000000) + 50000000 // 50-150MB
    dbStats.trendlogRecords = Math.floor(Math.random() * 100000) + 50000
    dbStats.settingsCount = Math.floor(Math.random() * 50) + 20
  } finally {
    loading.stats = false
  }
}

const migrateLocalStorage = async () => {
  loading.migrate = true
  try {
    // Collect localStorage data
    const localStorageData: Record<string, any> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            localStorageData[key] = JSON.parse(value)
          }
        } catch {
          localStorageData[key] = localStorage.getItem(key)
        }
      }
    }

    // Send to API for migration
    console.log('Migrating localStorage:', localStorageData)
    // API call would go here

    await refreshStats()
  } finally {
    loading.migrate = false
  }
}

const previewLocalStorage = () => {
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      data[key] = localStorage.getItem(key)
    }
  }

  console.log('localStorage preview:', data)
  // Could show in a dialog
}

const openFullManagement = () => {
  emit('open-full-management')
}

// Lifecycle
onMounted(() => {
  refreshStats()
})
</script>

<style scoped>
.database-management-popup {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  padding: 1.5rem;
}

.header-content h3 {
  margin: 0 0 0.25rem 0;
  color: #333;
  font-size: 1.5rem;
}

.header-content p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.close-button {
  color: #666;
}

.trendlog-settings-section,
.mini-db-section,
.full-management-section {
  padding: 1.5rem;
}

.trendlog-settings-section h4,
.mini-db-section h4 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.2rem;
}

.device-info-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  color: #333;
  font-family: monospace;
}

.trendlog-controls {
  margin-bottom: 2rem;
}

.expansion-content {
  padding: 1rem 0;
}

.setting-row {
  margin-bottom: 1rem;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
}

.quick-tools {
  margin-bottom: 1.5rem;
}

.migration-section .expansion-content {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.migration-controls {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.management-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  gap: 1rem;
}

.link-content h5 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.link-content p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.popup-footer {
  background: #f8f9fa;
  padding: 1rem 1.5rem;
}

@media (max-width: 768px) {
  .stats-summary {
    grid-template-columns: 1fr;
  }

  .management-link {
    flex-direction: column;
    text-align: center;
  }

  .quick-actions,
  .migration-controls {
    flex-direction: column;
  }
}
</style>
