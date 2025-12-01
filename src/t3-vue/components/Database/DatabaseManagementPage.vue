<template>
  <div class="database-page">
    <div class="page-header">
      <h2>Database Management Dashboard</h2>
      <p>Manage application settings, database partitions, and system health</p>
    </div>

    <div class="management-grid">
      <!-- Quick Stats Cards -->
      <div class="stats-row">
        <q-card class="stat-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Application Settings</div>
            <div class="text-h4 text-primary">{{ stats.settingsCount }}</div>
            <div class="text-caption text-grey">Total configuration items</div>
          </q-card-section>
          <q-card-actions>
            <q-btn flat color="primary" @click="navigateToSettings">
              Manage Settings
            </q-btn>
          </q-card-actions>
        </q-card>

        <q-card class="stat-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Database Partitions</div>
            <div class="text-h4 text-secondary">{{ stats.partitionsCount }}</div>
            <div class="text-caption text-grey">Active partitions</div>
          </q-card-section>
          <q-card-actions>
            <q-btn flat color="secondary" @click="navigateToPartitions">
              Manage Partitions
            </q-btn>
          </q-card-actions>
        </q-card>

        <q-card class="stat-card" flat bordered>
          <q-card-section>
            <div class="text-h6">Database Size</div>
            <div class="text-h4 text-positive">{{ stats.databaseSize }}</div>
            <div class="text-caption text-grey">Total storage used</div>
          </q-card-section>
          <q-card-actions>
            <q-btn flat color="positive" @click="navigateToMonitoring">
              View Monitoring
            </q-btn>
          </q-card-actions>
        </q-card>

        <q-card class="stat-card" flat bordered>
          <q-card-section>
            <div class="text-h6">System Health</div>
            <div class="text-h4" :class="stats.healthStatus === 'Good' ? 'text-positive' : 'text-negative'">
              {{ stats.healthStatus }}
            </div>
            <div class="text-caption text-grey">Overall system status</div>
          </q-card-section>
          <q-card-actions>
            <q-btn flat color="info" @click="navigateToTools">
              Management Tools
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>

      <!-- Quick Actions -->
      <div class="actions-section">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6 q-mb-md">Quick Actions</div>
            <div class="action-buttons">
              <q-btn
                color="primary"
                icon="add"
                label="Add Setting"
                @click="showAddSettingDialog = true"
                class="q-mr-sm q-mb-sm"
              />
              <q-btn
                color="secondary"
                icon="storage"
                label="Create Partition"
                @click="showCreatePartitionDialog = true"
                class="q-mr-sm q-mb-sm"
              />
              <q-btn
                color="positive"
                icon="backup"
                label="Database Backup"
                @click="performBackup"
                class="q-mr-sm q-mb-sm"
              />
              <q-btn
                color="warning"
                icon="build"
                label="Optimize Database"
                @click="optimizeDatabase"
                class="q-mr-sm q-mb-sm"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Recent Activity -->
      <div class="activity-section">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6 q-mb-md">Recent Activity</div>
            <q-list>
              <q-item v-for="activity in recentActivity" :key="activity.id">
                <q-item-section avatar>
                  <q-icon :name="activity.icon" :color="activity.color" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ activity.description }}</q-item-label>
                  <q-item-label caption>{{ activity.timestamp }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Add Setting Dialog -->
    <q-dialog v-model="showAddSettingDialog">
      <q-card style="width: 400px">
        <q-card-section>
          <div class="text-h6">Quick Add Setting</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="newSetting.key" label="Setting Key" />
          <q-input v-model="newSetting.value" label="Setting Value" class="q-mt-md" />
          <q-select
            v-model="newSetting.category"
            label="Category"
            :options="['UI', 'Device', 'User', 'System']"
            class="q-mt-md"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showAddSettingDialog = false" />
          <q-btn color="primary" label="Add" @click="addSetting" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Create Partition Dialog -->
    <q-dialog v-model="showCreatePartitionDialog">
      <q-card style="width: 400px">
        <q-card-section>
          <div class="text-h6">Quick Create Partition</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="newPartition.tableName" label="Table Name" />
          <q-select
            v-model="newPartition.type"
            label="Partition Type"
            :options="['DAILY', 'WEEKLY', 'MONTHLY']"
            class="q-mt-md"
          />
          <q-input
            v-model="newPartition.retentionDays"
            label="Retention Days"
            type="number"
            class="q-mt-md"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showCreatePartitionDialog = false" />
          <q-btn color="secondary" label="Create" @click="createPartition" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

export default {
  name: 'DatabaseManagementPage',
  setup() {
    const router = useRouter()
    const $q = useQuasar()

    const stats = ref({
      settingsCount: 0,
      partitionsCount: 0,
      databaseSize: '0 MB',
      healthStatus: 'Good'
    })

    const recentActivity = ref([
      { id: 1, icon: 'settings', color: 'primary', description: 'Application setting updated', timestamp: '5 minutes ago' },
      { id: 2, icon: 'storage', color: 'secondary', description: 'Database partition created', timestamp: '1 hour ago' },
      { id: 3, icon: 'backup', color: 'positive', description: 'Database backup completed', timestamp: '2 hours ago' }
    ])

    const showAddSettingDialog = ref(false)
    const showCreatePartitionDialog = ref(false)

    const newSetting = ref({
      key: '',
      value: '',
      category: 'UI'
    })

    const newPartition = ref({
      tableName: 'TRENDLOG_DATA',
      type: 'DAILY',
      retentionDays: 30
    })

    const loadStats = async () => {
      try {
        // Load basic stats from API or mock data for now
        stats.value = {
          settingsCount: 12,
          partitionsCount: 3,
          databaseSize: '45.2 MB',
          healthStatus: 'Good'
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
      }
    }

    const navigateToSettings = () => {
      router.push({ name: 'database-settings' })
    }

    const navigateToPartitions = () => {
      router.push({ name: 'database-partitions' })
    }

    const navigateToMonitoring = () => {
      router.push({ name: 'database-monitoring' })
    }

    const navigateToTools = () => {
      router.push({ name: 'database-tools' })
    }

    const addSetting = () => {
      // TODO: Implement API call to add setting
      $q.notify({
        type: 'positive',
        message: 'Setting added successfully'
      })
      showAddSettingDialog.value = false
      newSetting.value = { key: '', value: '', category: 'UI' }
    }

    const createPartition = () => {
      // TODO: Implement API call to create partition
      $q.notify({
        type: 'positive',
        message: 'Partition created successfully'
      })
      showCreatePartitionDialog.value = false
      newPartition.value = { tableName: 'TRENDLOG_DATA', type: 'DAILY', retentionDays: 30 }
    }

    const performBackup = () => {
      $q.notify({
        type: 'info',
        message: 'Database backup initiated...'
      })
    }

    const optimizeDatabase = () => {
      $q.notify({
        type: 'info',
        message: 'Database optimization started...'
      })
    }

    onMounted(() => {
      loadStats()
    })

    return {
      stats,
      recentActivity,
      showAddSettingDialog,
      showCreatePartitionDialog,
      newSetting,
      newPartition,
      navigateToSettings,
      navigateToPartitions,
      navigateToMonitoring,
      navigateToTools,
      addSetting,
      createPartition,
      performBackup,
      optimizeDatabase
    }
  }
}
</script>

<style scoped>
.database-page {
  padding: 20px;
  max-width: 1200px;
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

.management-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card {
  min-height: 150px;
}

.actions-section,
.activity-section {
  width: 100%;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 768px) {
  .database-page {
    padding: 10px;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
