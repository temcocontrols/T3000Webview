<template>
  <div class="application-settings-panel">
    <div class="panel-header">
      <h3>Application Settings</h3>
      <p>Manage application configuration settings (localStorage replacement)</p>

      <div class="header-actions">
        <q-btn
          color="primary"
          icon="cloud_upload"
          label="Migrate localStorage"
          @click="showMigrationDialog = true"
        />
        <q-btn
          color="secondary"
          icon="add"
          label="Add Setting"
          @click="showAddDialog = true"
        />
      </div>
    </div>

    <!-- Settings Table -->
    <div class="settings-table-container">
      <q-table
        :rows="settings"
        :columns="columns"
        row-key="id"
        :pagination="pagination"
        :loading="loading"
        binary-state-sort
        :filter="filter"
        class="settings-table"
      >
        <template v-slot:top-right>
          <q-input
            borderless
            dense
            debounce="300"
            v-model="filter"
            placeholder="Search settings..."
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
        </template>

        <template v-slot:body-cell-setting_value="props">
          <q-td :props="props">
            <div class="value-cell">
              <code class="json-preview">{{ formatJsonPreview(props.value) }}</code>
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="primary"
                size="sm"
                @click="showValueDialog(props.row)"
              >
                <q-tooltip>View full value</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <div class="action-buttons">
              <q-btn
                flat
                dense
                round
                icon="edit"
                color="primary"
                size="sm"
                @click="editSetting(props.row)"
              >
                <q-tooltip>Edit setting</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                size="sm"
                @click="deleteSetting(props.row)"
                :disable="props.row.is_readonly"
              >
                <q-tooltip>Delete setting</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Migration Dialog -->
    <q-dialog v-model="showMigrationDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Migrate localStorage Data</div>
          <p>This will migrate existing localStorage data to the database.</p>
        </q-card-section>

        <q-card-section>
          <q-textarea
            v-model="localStorageData"
            label="localStorage JSON Data"
            rows="10"
            outlined
            placeholder='{"key1": "value1", "key2": {"nested": "object"}}'
          />
          <q-btn
            flat
            color="primary"
            label="Load from Browser"
            @click="loadLocalStorageFromBrowser"
            class="q-mt-sm"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            label="Migrate"
            color="primary"
            @click="performMigration"
            :loading="migrationLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add/Edit Setting Dialog -->
    <q-dialog v-model="showAddDialog">
      <q-card style="min-width: 600px">
        <q-card-section>
          <div class="text-h6">{{ editingItem ? 'Edit' : 'Add' }} Setting</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="formData.category"
            label="Category"
            outlined
            required
          />
          <q-input
            v-model="formData.setting_key"
            label="Setting Key"
            outlined
            required
            class="q-mt-md"
          />
          <q-textarea
            v-model="formData.setting_value"
            label="Setting Value (JSON)"
            rows="5"
            outlined
            required
            class="q-mt-md"
          />
          <q-input
            v-model="formData.description"
            label="Description"
            outlined
            class="q-mt-md"
          />

          <div class="row q-gutter-md q-mt-md">
            <q-input
              v-model.number="formData.user_id"
              label="User ID (optional)"
              type="number"
              outlined
            />
            <q-input
              v-model.number="formData.device_serial"
              label="Device Serial (optional)"
              type="number"
              outlined
            />
            <q-input
              v-model.number="formData.panel_id"
              label="Panel ID (optional)"
              type="number"
              outlined
            />
          </div>

          <q-checkbox
            v-model="formData.is_readonly"
            label="Read-only setting"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            :label="editingItem ? 'Update' : 'Create'"
            color="primary"
            @click="saveSetting"
            :loading="saveLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Value Viewer Dialog -->
    <q-dialog v-model="showValueViewer">
      <q-card style="min-width: 600px; max-width: 800px">
        <q-card-section>
          <div class="text-h6">Setting Value</div>
          <div class="text-subtitle2">{{ viewerData.category }} → {{ viewerData.setting_key }}</div>
        </q-card-section>

        <q-card-section>
          <pre class="json-viewer">{{ JSON.stringify(JSON.parse(viewerData.setting_value || '{}'), null, 2) }}</pre>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

// Props
interface Setting {
  id: number
  category: string
  setting_key: string
  setting_value: string
  user_id?: number
  device_serial?: number
  panel_id?: number
  description?: string
  data_type: string
  is_readonly: boolean
  created_at: string
  updated_at: string
  created_by: string
}

const props = defineProps<{
  settings: Setting[]
}>()

const emit = defineEmits<{
  refresh: []
  'migrate-localstorage': [data: Record<string, any>]
}>()

// State
const filter = ref('')
const loading = ref(false)
const showMigrationDialog = ref(false)
const showAddDialog = ref(false)
const showValueViewer = ref(false)
const migrationLoading = ref(false)
const saveLoading = ref(false)
const localStorageData = ref('')
const editingItem = ref<Setting | null>(null)

const pagination = ref({
  sortBy: 'category',
  descending: false,
  page: 1,
  rowsPerPage: 10
})

const formData = reactive({
  category: '',
  setting_key: '',
  setting_value: '',
  description: '',
  user_id: null as number | null,
  device_serial: null as number | null,
  panel_id: null as number | null,
  is_readonly: false
})

const viewerData = reactive({
  category: '',
  setting_key: '',
  setting_value: ''
})

// Table columns
const columns = [
  {
    name: 'category',
    required: true,
    label: 'Category',
    align: 'left',
    field: 'category',
    sortable: true
  },
  {
    name: 'setting_key',
    required: true,
    label: 'Key',
    align: 'left',
    field: 'setting_key',
    sortable: true
  },
  {
    name: 'setting_value',
    required: true,
    label: 'Value',
    align: 'left',
    field: 'setting_value',
    sortable: false
  },
  {
    name: 'description',
    label: 'Description',
    align: 'left',
    field: 'description',
    sortable: true
  },
  {
    name: 'data_type',
    label: 'Type',
    align: 'center',
    field: 'data_type',
    sortable: true
  },
  {
    name: 'created_by',
    label: 'Created By',
    align: 'center',
    field: 'created_by',
    sortable: true
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    field: 'actions',
    sortable: false
  }
]

// Methods
const formatJsonPreview = (value: string): string => {
  try {
    const parsed = JSON.parse(value)
    const stringified = JSON.stringify(parsed)
    return stringified.length > 50 ? stringified.substring(0, 50) + '...' : stringified
  } catch {
    return value.length > 50 ? value.substring(0, 50) + '...' : value
  }
}

const showValueDialog = (row: Setting) => {
  viewerData.category = row.category
  viewerData.setting_key = row.setting_key
  viewerData.setting_value = row.setting_value
  showValueViewer.value = true
}

const editSetting = (row: Setting) => {
  editingItem.value = row
  formData.category = row.category
  formData.setting_key = row.setting_key
  formData.setting_value = row.setting_value
  formData.description = row.description || ''
  formData.user_id = row.user_id || null
  formData.device_serial = row.device_serial || null
  formData.panel_id = row.panel_id || null
  formData.is_readonly = row.is_readonly
  showAddDialog.value = true
}

const deleteSetting = async (row: Setting) => {
  // Implement delete functionality
  console.log('Delete setting:', row)
}

const loadLocalStorageFromBrowser = () => {
  try {
    const data: Record<string, any> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            data[key] = JSON.parse(value)
          }
        } catch {
          data[key] = localStorage.getItem(key)
        }
      }
    }
    localStorageData.value = JSON.stringify(data, null, 2)
  } catch (error) {
    console.error('Error loading localStorage:', error)
  }
}

const performMigration = () => {
  try {
    const data = JSON.parse(localStorageData.value)
    emit('migrate-localstorage', data)
    showMigrationDialog.value = false
    localStorageData.value = ''
  } catch (error) {
    console.error('Invalid JSON data:', error)
  }
}

const saveSetting = () => {
  // Implement save functionality
  console.log('Save setting:', formData)
  showAddDialog.value = false
  resetForm()
}

const resetForm = () => {
  editingItem.value = null
  formData.category = ''
  formData.setting_key = ''
  formData.setting_value = ''
  formData.description = ''
  formData.user_id = null
  formData.device_serial = null
  formData.panel_id = null
  formData.is_readonly = false
}
</script>

<style scoped>
.application-settings-panel {
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

.settings-table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.value-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.json-preview {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.json-viewer {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 1rem;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
  }
}
</style>
