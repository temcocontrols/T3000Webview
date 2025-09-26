<template>
  <div class="database-partitions-panel">
    <div class="panel-header">
      <h3>Database Partitions</h3>
      <p>Manage database partitioning and automated cleanup policies</p>

      <div class="header-actions">
        <q-btn
          color="primary"
          icon="auto_awesome"
          label="Auto Cleanup"
          @click="$emit('cleanup')"
        />
        <q-btn
          color="secondary"
          icon="add"
          label="Create Partition"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <!-- Partitions Summary Cards -->
    <div class="partition-summary">
      <div class="summary-card">
        <div class="card-icon">
          <q-icon name="widgets" size="2rem" color="primary" />
        </div>
        <div class="card-content">
          <h4>{{ totalPartitions }}</h4>
          <p>Total Partitions</p>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon">
          <q-icon name="play_circle" size="2rem" color="positive" />
        </div>
        <div class="card-content">
          <h4>{{ activePartitions }}</h4>
          <p>Active</p>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon">
          <q-icon name="archive" size="2rem" color="warning" />
        </div>
        <div class="card-content">
          <h4>{{ archivedPartitions }}</h4>
          <p>Archived</p>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon">
          <q-icon name="storage" size="2rem" color="info" />
        </div>
        <div class="card-content">
          <h4>{{ formatBytes(totalSize) }}</h4>
          <p>Total Size</p>
        </div>
      </div>
    </div>

    <!-- Partitions Table -->
    <div class="partitions-table-container">
      <q-table
        :rows="partitions"
        :columns="partitionColumns"
        row-key="id"
        :pagination="{ rowsPerPage: 10 }"
        class="partitions-table"
      >
        <template v-slot:body-cell-is_active="props">
          <q-td :props="props">
            <q-chip
              :color="props.value ? 'positive' : 'grey'"
              text-color="white"
              size="sm"
            >
              {{ props.value ? 'Active' : 'Inactive' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-is_archived="props">
          <q-td :props="props">
            <q-chip
              :color="props.value ? 'warning' : 'grey'"
              text-color="white"
              size="sm"
            >
              {{ props.value ? 'Archived' : 'Live' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-size_bytes="props">
          <q-td :props="props">
            {{ formatBytes(props.value) }}
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              round
              icon="info"
              color="primary"
              size="sm"
              @click="showPartitionDetails(props.row)"
            >
              <q-tooltip>View details</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Create Partition Dialog -->
    <q-dialog v-model="showCreateDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Create New Partition</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newPartition.table_name"
            label="Table Name"
            outlined
            required
          />

          <q-select
            v-model="newPartition.partition_type"
            :options="partitionTypes"
            label="Partition Type"
            outlined
            class="q-mt-md"
          />

          <q-input
            v-model="newPartition.start_date"
            label="Start Date"
            type="date"
            outlined
            class="q-mt-md"
          />

          <q-input
            v-model="newPartition.end_date"
            label="End Date"
            type="date"
            outlined
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            label="Create"
            color="primary"
            @click="createPartition"
            :loading="createLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

interface Partition {
  id: number
  table_name: string
  partition_type: string
  partition_identifier: string
  partition_start_date: string
  partition_end_date: string
  record_count: number
  size_bytes: number
  is_active: boolean
  is_archived: boolean
  retention_days?: number
  auto_cleanup_enabled: boolean
  created_at: string
  updated_at: string
}

const props = defineProps<{
  partitions: Partition[]
}>()

const emit = defineEmits<{
  refresh: []
  cleanup: []
}>()

// State
const showCreateDialog = ref(false)
const createLoading = ref(false)

const newPartition = reactive({
  table_name: 'TRENDLOG_DATA',
  partition_type: 'DAILY',
  start_date: '',
  end_date: ''
})

// Options
const partitionTypes = ['DAILY', 'WEEKLY', 'MONTHLY']

// Computed properties
const totalPartitions = computed(() => props.partitions.length)
const activePartitions = computed(() => props.partitions.filter(p => p.is_active).length)
const archivedPartitions = computed(() => props.partitions.filter(p => p.is_archived).length)
const totalSize = computed(() => props.partitions.reduce((sum, p) => sum + p.size_bytes, 0))

// Table columns
const partitionColumns = [
  {
    name: 'table_name',
    label: 'Table Name',
    align: 'left' as const,
    field: 'table_name',
    sortable: true
  },
  {
    name: 'partition_type',
    label: 'Type',
    align: 'center' as const,
    field: 'partition_type',
    sortable: true
  },
  {
    name: 'partition_identifier',
    label: 'Identifier',
    align: 'left' as const,
    field: 'partition_identifier',
    sortable: true
  },
  {
    name: 'record_count',
    label: 'Records',
    align: 'right' as const,
    field: 'record_count',
    sortable: true
  },
  {
    name: 'size_bytes',
    label: 'Size',
    align: 'right' as const,
    field: 'size_bytes',
    sortable: true
  },
  {
    name: 'is_active',
    label: 'Status',
    align: 'center' as const,
    field: 'is_active',
    sortable: true
  },
  {
    name: 'is_archived',
    label: 'Archived',
    align: 'center' as const,
    field: 'is_archived',
    sortable: true
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center' as const,
    field: 'actions',
    sortable: false
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

const showPartitionDetails = (partition: Partition) => {
  console.log('Show partition details:', partition)
}

const createPartition = () => {
  console.log('Create partition:', newPartition)
  showCreateDialog.value = false
}
</script>

<style scoped>
.database-partitions-panel {
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
  flex-wrap: wrap;
}

.partition-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-icon {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-content h4 {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.card-content p {
  font-size: 0.9rem;
  color: #666;
  margin: 0.25rem 0 0 0;
}

.partitions-table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
