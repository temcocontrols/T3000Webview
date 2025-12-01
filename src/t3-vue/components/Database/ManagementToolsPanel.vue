<template>
  <div class="database-tools-panel">
    <div class="page-header">
      <h2>Database Management Tools</h2>
      <p>Database maintenance, optimization, and backup utilities</p>
    </div>

    <!-- Tools Grid -->
    <div class="tools-grid">
      <!-- Database Optimization -->
      <q-card flat bordered class="tool-card">
        <q-card-section>
          <div class="tool-header">
            <q-icon name="speed" size="2rem" color="primary" />
            <div class="tool-title">Database Optimization</div>
          </div>
          <div class="tool-description">
            Optimize database performance and reclaim unused space
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn
            color="primary"
            label="Run VACUUM"
            @click="runVacuum"
            :loading="operations.vacuum"
          />
          <q-btn
            color="secondary"
            label="ANALYZE"
            @click="runAnalyze"
            :loading="operations.analyze"
          />
        </q-card-actions>
      </q-card>

      <!-- Backup & Restore -->
      <q-card flat bordered class="tool-card">
        <q-card-section>
          <div class="tool-header">
            <q-icon name="backup" size="2rem" color="positive" />
            <div class="tool-title">Backup & Restore</div>
          </div>
          <div class="tool-description">
            Create database backups and restore from existing backups
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn
            color="positive"
            label="Create Backup"
            @click="createBackup"
            :loading="operations.backup"
          />
          <q-btn
            color="warning"
            label="Restore"
            @click="showRestoreDialog = true"
          />
        </q-card-actions>
      </q-card>

      <!-- Index Management -->
      <q-card flat bordered class="tool-card">
        <q-card-section>
          <div class="tool-header">
            <q-icon name="account_tree" size="2rem" color="secondary" />
            <div class="tool-title">Index Management</div>
          </div>
          <div class="tool-description">
            Manage database indexes for optimal query performance
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn
            color="secondary"
            label="Rebuild Indexes"
            @click="rebuildIndexes"
            :loading="operations.indexes"
          />
          <q-btn
            flat
            label="View Indexes"
            @click="showIndexes = true"
          />
        </q-card-actions>
      </q-card>

      <!-- Data Export -->
      <q-card flat bordered class="tool-card">
        <q-card-section>
          <div class="tool-header">
            <q-icon name="file_download" size="2rem" color="info" />
            <div class="tool-title">Data Export</div>
          </div>
          <div class="tool-description">
            Export database contents to various formats
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn
            color="info"
            label="Export Settings"
            @click="exportSettings"
          />
          <q-btn
            flat
            label="Export All"
            @click="exportAll"
          />
        </q-card-actions>
      </q-card>

      <!-- Schema Management -->
      <q-card flat bordered class="tool-card">
        <q-card-section>
          <div class="tool-header">
            <q-icon name="schema" size="2rem" color="deep-orange" />
            <div class="tool-title">Schema Management</div>
          </div>
          <div class="tool-description">
            View and manage database schema structure
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn
            color="deep-orange"
            label="View Schema"
            @click="showSchema = true"
          />
          <q-btn
            flat
            label="Generate DDL"
            @click="generateDDL"
          />
        </q-card-actions>
      </q-card>

      <!-- Maintenance Schedule -->
      <q-card flat bordered class="tool-card">
        <q-card-section>
          <div class="tool-header">
            <q-icon name="schedule" size="2rem" color="purple" />
            <div class="tool-title">Maintenance Schedule</div>
          </div>
          <div class="tool-description">
            Configure automated maintenance tasks
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn
            color="purple"
            label="Configure"
            @click="showScheduleDialog = true"
          />
          <q-btn
            flat
            label="View Jobs"
            @click="showJobs = true"
          />
        </q-card-actions>
      </q-card>
    </div>

    <!-- Operation Results -->
    <q-card flat bordered class="q-mt-md" v-if="lastOperation">
      <q-card-section>
        <div class="text-h6 q-mb-sm">Last Operation Result</div>
        <div class="operation-result">
          <div class="result-header">
            <span class="operation-name">{{ lastOperation.name }}</span>
            <q-badge
              :color="lastOperation.success ? 'positive' : 'negative'"
              :label="lastOperation.success ? 'Success' : 'Failed'"
            />
          </div>
          <div class="result-details">
            <div><strong>Duration:</strong> {{ lastOperation.duration }}ms</div>
            <div><strong>Time:</strong> {{ lastOperation.timestamp }}</div>
            <div v-if="lastOperation.message"><strong>Message:</strong> {{ lastOperation.message }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Restore Dialog -->
    <q-dialog v-model="showRestoreDialog" persistent>
      <q-card style="width: 400px">
        <q-card-section>
          <div class="text-h6">Restore Database</div>
          <div class="text-caption text-warning q-mt-sm">
            Warning: This will replace the current database!
          </div>
        </q-card-section>

        <q-card-section>
          <q-file
            v-model="restoreFile"
            label="Select backup file"
            accept=".db,.sqlite,.sql"
            outlined
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showRestoreDialog = false" />
          <q-btn
            color="warning"
            label="Restore"
            @click="restoreDatabase"
            :disable="!restoreFile"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Schedule Configuration Dialog -->
    <q-dialog v-model="showScheduleDialog" persistent>
      <q-card style="width: 500px">
        <q-card-section>
          <div class="text-h6">Maintenance Schedule</div>
        </q-card-section>

        <q-card-section>
          <q-toggle
            v-model="schedule.autoVacuum"
            label="Auto VACUUM (Weekly)"
            class="q-mb-md"
          />
          <q-toggle
            v-model="schedule.autoBackup"
            label="Auto Backup (Daily)"
            class="q-mb-md"
          />
          <q-toggle
            v-model="schedule.autoCleanup"
            label="Auto Cleanup (Daily)"
            class="q-mb-md"
          />

          <q-input
            v-model="schedule.backupRetentionDays"
            label="Backup Retention (Days)"
            type="number"
            outlined
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showScheduleDialog = false" />
          <q-btn color="primary" label="Save" @click="saveSchedule" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Schema Viewer Dialog -->
    <q-dialog v-model="showSchema" maximized>
      <q-card>
        <q-card-section>
          <div class="text-h6">Database Schema</div>
        </q-card-section>

        <q-card-section class="schema-content">
          <pre class="schema-text">{{ schemaText }}</pre>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" @click="showSchema = false" />
          <q-btn color="primary" label="Copy" @click="copySchema" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useQuasar } from 'quasar'

export default {
  name: 'ManagementToolsPanel',
  setup() {
    const $q = useQuasar()

    const operations = ref({
      vacuum: false,
      analyze: false,
      backup: false,
      indexes: false
    })

    const lastOperation = ref(null)
    const showRestoreDialog = ref(false)
    const showScheduleDialog = ref(false)
    const showSchema = ref(false)
    const showIndexes = ref(false)
    const showJobs = ref(false)

    const restoreFile = ref(null)

    const schedule = ref({
      autoVacuum: true,
      autoBackup: true,
      autoCleanup: true,
      backupRetentionDays: 30
    })

    const schemaText = ref(`
-- Database Schema
CREATE TABLE APPLICATION_SETTINGS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    data_type TEXT DEFAULT 'string',
    description TEXT,
    user_id INTEGER,
    device_serial INTEGER,
    panel_id INTEGER,
    is_read_only INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE DATABASE_PARTITIONS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    partition_type TEXT NOT NULL,
    partition_identifier TEXT NOT NULL,
    partition_start_date TEXT,
    partition_end_date TEXT,
    record_count INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    auto_cleanup_enabled INTEGER DEFAULT 1,
    retention_days INTEGER DEFAULT 30,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_cleanup_at TEXT,
    metadata TEXT
);

-- Indexes
CREATE INDEX IDX_APP_SETTINGS_CATEGORY ON APPLICATION_SETTINGS(category);
CREATE INDEX IDX_APP_SETTINGS_KEY ON APPLICATION_SETTINGS(category, setting_key);
-- ... (additional indexes)
    `)

    const runOperation = async (name, operation) => {
      const startTime = Date.now()

      try {
        operations.value[operation] = true

        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, 2000))

        const duration = Date.now() - startTime
        lastOperation.value = {
          name: name,
          success: true,
          duration: duration,
          timestamp: new Date().toLocaleString(),
          message: `${name} completed successfully`
        }

        $q.notify({
          type: 'positive',
          message: `${name} completed successfully`
        })
      } catch (error) {
        const duration = Date.now() - startTime
        lastOperation.value = {
          name: name,
          success: false,
          duration: duration,
          timestamp: new Date().toLocaleString(),
          message: error.message
        }

        $q.notify({
          type: 'negative',
          message: `${name} failed: ${error.message}`
        })
      } finally {
        operations.value[operation] = false
      }
    }

    const runVacuum = () => runOperation('VACUUM', 'vacuum')
    const runAnalyze = () => runOperation('ANALYZE', 'analyze')
    const rebuildIndexes = () => runOperation('Rebuild Indexes', 'indexes')

    const createBackup = async () => {
      await runOperation('Create Backup', 'backup')
    }

    const restoreDatabase = () => {
      $q.dialog({
        title: 'Confirm Restore',
        message: 'This will replace the current database. Are you sure?',
        cancel: true,
        persistent: true
      }).onOk(() => {
        $q.notify({
          type: 'info',
          message: 'Database restore initiated...'
        })
        showRestoreDialog.value = false
        restoreFile.value = null
      })
    }

    const exportSettings = () => {
      $q.notify({
        type: 'info',
        message: 'Exporting application settings...'
      })
    }

    const exportAll = () => {
      $q.notify({
        type: 'info',
        message: 'Exporting all data...'
      })
    }

    const generateDDL = () => {
      $q.notify({
        type: 'info',
        message: 'DDL generated and copied to clipboard'
      })
    }

    const saveSchedule = () => {
      $q.notify({
        type: 'positive',
        message: 'Maintenance schedule saved'
      })
      showScheduleDialog.value = false
    }

    const copySchema = () => {
      navigator.clipboard.writeText(schemaText.value)
      $q.notify({
        type: 'positive',
        message: 'Schema copied to clipboard'
      })
    }

    return {
      operations,
      lastOperation,
      showRestoreDialog,
      showScheduleDialog,
      showSchema,
      showIndexes,
      showJobs,
      restoreFile,
      schedule,
      schemaText,
      runVacuum,
      runAnalyze,
      rebuildIndexes,
      createBackup,
      restoreDatabase,
      exportSettings,
      exportAll,
      generateDDL,
      saveSchedule,
      copySchema
    }
  }
}
</script>

<style scoped>
.management-tools-panel {
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

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.tool-card {
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.tool-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.tool-description {
  color: #666;
  line-height: 1.4;
}

.operation-result {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.operation-name {
  font-weight: bold;
}

.result-details {
  font-size: 0.9rem;
  color: #666;
}

.result-details > div {
  margin-bottom: 5px;
}

.schema-content {
  max-height: 70vh;
  overflow-y: auto;
}

.schema-text {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .management-tools-panel {
    padding: 10px;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
