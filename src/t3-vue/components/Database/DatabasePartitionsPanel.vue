<template>
  <div class="database-partitions-panel">
    <div class="page-header">
      <h2>Database Partitions Management</h2>
      <p>Manage database partitioning strategies and cleanup policies</p>
    </div>

    <!-- Controls -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="controls-row">
          <q-btn
            color="primary"
            icon="add"
            label="Create Partition"
            @click="showCreateDialog = true"
          />
          <q-btn
            color="secondary"
            icon="cleaning_services"
            label="Run Cleanup"
            @click="runCleanup"
          />
          <q-btn
            color="info"
            icon="refresh"
            label="Refresh"
            @click="loadPartitions"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Partitions Table -->
    <q-card flat bordered>
      <q-card-section>
        <q-table
          :rows="partitions"
          :columns="columns"
          row-key="id"
          :loading="loading"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="props.row.is_active ? 'positive' : 'grey'"
                :label="props.row.is_active ? 'Active' : 'Inactive'"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-size="props">
            <q-td :props="props">
              {{ formatBytes(props.row.size_bytes) }}
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                dense
                color="warning"
                icon="cleaning_services"
                @click="cleanupPartition(props.row)"
                :disable="!props.row.is_active"
              />
              <q-btn
                flat
                round
                dense
                color="negative"
                icon="delete"
                @click="deletePartition(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Create Partition Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="width: 400px">
        <q-card-section>
          <div class="text-h6">Create New Partition</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="partitionForm.table_name"
            label="Table Name"
            outlined
          />

          <q-select
            v-model="partitionForm.partition_type"
            :options="['DAILY', 'WEEKLY', 'MONTHLY']"
            label="Partition Type"
            outlined
            class="q-mt-md"
          />

          <q-input
            v-model="partitionForm.retention_days"
            label="Retention Days"
            type="number"
            outlined
            class="q-mt-md"
          />

          <q-toggle
            v-model="partitionForm.auto_cleanup_enabled"
            label="Enable Auto Cleanup"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showCreateDialog = false" />
          <q-btn color="primary" label="Create" @click="createPartition" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

export default {
  name: 'DatabasePartitionsPanel',
  setup() {
    const $q = useQuasar()

    const partitions = ref([])
    const loading = ref(false)
    const showCreateDialog = ref(false)

    const partitionForm = ref({
      table_name: 'TRENDLOG_DATA',
      partition_type: 'DAILY',
      retention_days: 30,
      auto_cleanup_enabled: true
    })

    const columns = [
      { name: 'table_name', label: 'Table Name', field: 'table_name', sortable: true, align: 'left' },
      { name: 'partition_type', label: 'Type', field: 'partition_type', sortable: true, align: 'center' },
      { name: 'partition_identifier', label: 'Identifier', field: 'partition_identifier', sortable: true, align: 'left' },
      { name: 'record_count', label: 'Records', field: 'record_count', sortable: true, align: 'right' },
      { name: 'size', label: 'Size', field: 'size_bytes', sortable: true, align: 'right' },
      { name: 'retention_days', label: 'Retention', field: 'retention_days', sortable: true, align: 'right' },
      { name: 'status', label: 'Status', field: 'is_active', sortable: true, align: 'center' },
      { name: 'actions', label: 'Actions', field: 'actions', sortable: false, align: 'center' }
    ]

    const loadPartitions = async () => {
      loading.value = true
      try {
        // Mock data
        partitions.value = [
          {
            id: 1,
            table_name: 'TRENDLOG_DATA',
            partition_type: 'DAILY',
            partition_identifier: '2025-09-26',
            record_count: 15420,
            size_bytes: 2048000,
            retention_days: 30,
            is_active: true
          },
          {
            id: 2,
            table_name: 'TRENDLOG_DATA',
            partition_type: 'DAILY',
            partition_identifier: '2025-09-25',
            record_count: 12850,
            size_bytes: 1756000,
            retention_days: 30,
            is_active: true
          }
        ]
      } catch (error) {
        $q.notify({ type: 'negative', message: 'Failed to load partitions' })
      } finally {
        loading.value = false
      }
    }

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const createPartition = () => {
      // TODO: API call
      $q.notify({ type: 'positive', message: 'Partition created successfully' })
      showCreateDialog.value = false
      loadPartitions()
    }

    const cleanupPartition = (partition) => {
      $q.notify({ type: 'info', message: `Cleanup started for ${partition.partition_identifier}` })
    }

    const deletePartition = (partition) => {
      $q.dialog({
        title: 'Confirm Delete',
        message: `Delete partition ${partition.partition_identifier}?`,
        cancel: true
      }).onOk(() => {
        $q.notify({ type: 'positive', message: 'Partition deleted' })
        loadPartitions()
      })
    }

    const runCleanup = () => {
      $q.notify({ type: 'info', message: 'Global cleanup started' })
    }

    onMounted(() => {
      loadPartitions()
    })

    return {
      partitions,
      loading,
      showCreateDialog,
      partitionForm,
      columns,
      loadPartitions,
      formatBytes,
      createPartition,
      cleanupPartition,
      deletePartition,
      runCleanup
    }
  }
}
</script>

<style scoped>
.database-partitions-panel {
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

.controls-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .database-partitions-panel {
    padding: 10px;
  }

  .controls-row {
    flex-direction: column;
  }
}
</style>
