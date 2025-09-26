<template>
  <div class="management-tools-panel">
    <div class="panel-header">
      <h3>Database Management Tools</h3>
      <p>Administrative tools for database maintenance and optimization</p>
    </div>

    <!-- Tools Grid -->
    <div class="tools-grid">
      <!-- Vacuum Tool -->
      <div class="tool-card">
        <div class="tool-icon">
          <q-icon name="cleaning_services" size="2.5rem" color="primary" />
        </div>
        <div class="tool-content">
          <h4>Database Vacuum</h4>
          <p>Reclaim unused space and optimize database file size</p>
          <div class="tool-details">
            <ul>
              <li>Removes deleted record space</li>
              <li>Reduces database file size</li>
              <li>Improves query performance</li>
            </ul>
          </div>
          <q-btn
            color="primary"
            icon="play_arrow"
            label="Run Vacuum"
            @click="runVacuum"
            :loading="loading.vacuum"
            class="tool-button"
          />
        </div>
      </div>

      <!-- Analyze Tool -->
      <div class="tool-card">
        <div class="tool-icon">
          <q-icon name="analytics" size="2.5rem" color="secondary" />
        </div>
        <div class="tool-content">
          <h4>Database Analysis</h4>
          <p>Update query optimizer statistics for better performance</p>
          <div class="tool-details">
            <ul>
              <li>Updates table statistics</li>
              <li>Optimizes query plans</li>
              <li>Improves index usage</li>
            </ul>
          </div>
          <q-btn
            color="secondary"
            icon="play_arrow"
            label="Run Analysis"
            @click="runAnalysis"
            :loading="loading.analyze"
            class="tool-button"
          />
        </div>
      </div>

      <!-- Backup Tool -->
      <div class="tool-card">
        <div class="tool-icon">
          <q-icon name="backup" size="2.5rem" color="accent" />
        </div>
        <div class="tool-content">
          <h4>Database Backup</h4>
          <p>Create a backup copy of the database</p>
          <div class="tool-details">
            <ul>
              <li>Full database backup</li>
              <li>Consistent snapshot</li>
              <li>Recovery preparation</li>
            </ul>
          </div>
          <q-btn
            color="accent"
            icon="play_arrow"
            label="Create Backup"
            @click="runBackup"
            :loading="loading.backup"
            class="tool-button"
          />
        </div>
      </div>

      <!-- Settings Reset Tool -->
      <div class="tool-card">
        <div class="tool-icon">
          <q-icon name="restore" size="2.5rem" color="warning" />
        </div>
        <div class="tool-content">
          <h4>Reset Settings</h4>
          <p>Reset application settings to defaults</p>
          <div class="tool-details">
            <ul>
              <li>Clear user preferences</li>
              <li>Reset to factory defaults</li>
              <li>Preserve system data</li>
            </ul>
          </div>
          <q-btn
            color="warning"
            icon="restore"
            label="Reset Settings"
            @click="showResetDialog = true"
            class="tool-button"
          />
        </div>
      </div>
    </div>

    <!-- Advanced Tools Section -->
    <div class="advanced-tools-section">
      <h4>Advanced Tools</h4>

      <div class="advanced-tools-grid">
        <div class="advanced-tool">
          <div class="tool-header">
            <q-icon name="schedule" size="1.5rem" color="info" />
            <span>Scheduled Cleanup</span>
          </div>
          <p>Configure automated database maintenance tasks</p>
          <q-btn
            flat
            color="info"
            label="Configure"
            @click="showScheduleDialog = true"
          />
        </div>

        <div class="advanced-tool">
          <div class="tool-header">
            <q-icon name="import_export" size="1.5rem" color="positive" />
            <span>Import/Export</span>
          </div>
          <p>Import or export database settings and configurations</p>
          <div class="tool-actions">
            <q-btn
              flat
              color="positive"
              label="Import"
              @click="showImportDialog = true"
            />
            <q-btn
              flat
              color="positive"
              label="Export"
              @click="exportSettings"
            />
          </div>
        </div>

        <div class="advanced-tool">
          <div class="tool-header">
            <q-icon name="security" size="1.5rem" color="deep-purple" />
            <span>Integrity Check</span>
          </div>
          <p>Verify database integrity and consistency</p>
          <q-btn
            flat
            color="deep-purple"
            label="Check Integrity"
            @click="checkIntegrity"
            :loading="loading.integrity"
          />
        </div>
      </div>
    </div>

    <!-- Reset Confirmation Dialog -->
    <q-dialog v-model="showResetDialog">
      <q-card>
        <q-card-section>
          <div class="text-h6">Reset Application Settings</div>
          <p>Are you sure you want to reset all application settings to their default values?</p>
          <p class="text-negative">This action cannot be undone.</p>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            label="Reset"
            color="negative"
            @click="resetSettings"
            :loading="loading.reset"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Schedule Dialog -->
    <q-dialog v-model="showScheduleDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Schedule Cleanup Tasks</div>
        </q-card-section>

        <q-card-section>
          <q-toggle
            v-model="scheduleSettings.enabled"
            label="Enable automatic cleanup"
          />

          <q-select
            v-model="scheduleSettings.frequency"
            :options="frequencyOptions"
            label="Cleanup Frequency"
            outlined
            class="q-mt-md"
            :disable="!scheduleSettings.enabled"
          />

          <q-input
            v-model.number="scheduleSettings.retentionDays"
            label="Retention Days"
            type="number"
            outlined
            class="q-mt-md"
            :disable="!scheduleSettings.enabled"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            label="Save"
            color="primary"
            @click="saveScheduleSettings"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Import Dialog -->
    <q-dialog v-model="showImportDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Import Settings</div>
        </q-card-section>

        <q-card-section>
          <q-file
            v-model="importFile"
            label="Select settings file"
            outlined
            accept=".json"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            label="Import"
            color="primary"
            @click="importSettings"
            :loading="loading.import"
            :disable="!importFile"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const emit = defineEmits<{
  vacuum: []
  analyze: []
  backup: []
}>()

// State
const loading = reactive({
  vacuum: false,
  analyze: false,
  backup: false,
  reset: false,
  integrity: false,
  import: false
})

const showResetDialog = ref(false)
const showScheduleDialog = ref(false)
const showImportDialog = ref(false)
const importFile = ref<File | null>(null)

const scheduleSettings = reactive({
  enabled: false,
  frequency: 'daily',
  retentionDays: 30
})

// Options
const frequencyOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
]

// Methods
const runVacuum = async () => {
  loading.vacuum = true
  try {
    emit('vacuum')
  } finally {
    loading.vacuum = false
  }
}

const runAnalysis = async () => {
  loading.analyze = true
  try {
    emit('analyze')
  } finally {
    loading.analyze = false
  }
}

const runBackup = async () => {
  loading.backup = true
  try {
    emit('backup')
  } finally {
    loading.backup = false
  }
}

const resetSettings = async () => {
  loading.reset = true
  try {
    // Implement settings reset logic
    console.log('Resetting settings...')
    showResetDialog.value = false
  } finally {
    loading.reset = false
  }
}

const checkIntegrity = async () => {
  loading.integrity = true
  try {
    // Implement integrity check logic
    console.log('Checking database integrity...')
  } finally {
    loading.integrity = false
  }
}

const saveScheduleSettings = () => {
  console.log('Saving schedule settings:', scheduleSettings)
  showScheduleDialog.value = false
}

const importSettings = async () => {
  if (!importFile.value) return

  loading.import = true
  try {
    // Implement import logic
    console.log('Importing settings from:', importFile.value.name)
    showImportDialog.value = false
    importFile.value = null
  } finally {
    loading.import = false
  }
}

const exportSettings = () => {
  // Implement export logic
  const settings = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    settings: {}
  }

  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `t3000_db_settings_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.management-tools-panel {
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
  margin: 0;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.tool-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.tool-icon {
  margin-bottom: 1.5rem;
}

.tool-content h4 {
  font-size: 1.3rem;
  margin: 0 0 1rem 0;
  color: #333;
}

.tool-content p {
  color: #666;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.tool-details {
  text-align: left;
  margin-bottom: 2rem;
}

.tool-details ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #666;
}

.tool-details li {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.tool-button {
  width: 100%;
  padding: 0.75rem;
}

.advanced-tools-section {
  margin-top: 3rem;
}

.advanced-tools-section h4 {
  font-size: 1.2rem;
  margin: 0 0 1.5rem 0;
  color: #333;
}

.advanced-tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.advanced-tool {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: #333;
}

.advanced-tool p {
  color: #666;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.tool-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .advanced-tools-grid {
    grid-template-columns: 1fr;
  }

  .tool-actions {
    flex-direction: column;
  }
}
</style>
