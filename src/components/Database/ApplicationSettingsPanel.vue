<template>
  <div class="database-settings-panel">
    <div class="page-header">
      <h2>Application Settings Management</h2>
      <p>Manage application configuration and user preferences</p>
    </div>

    <!-- Filters and Controls -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="filters-row">
          <q-input
            v-model="filters.search"
            placeholder="Search settings..."
            outlined
            dense
            class="filter-input"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-select
            v-model="filters.category"
            :options="categoryOptions"
            placeholder="All Categories"
            outlined
            dense
            clearable
            class="filter-select"
          />

          <q-select
            v-model="filters.dataType"
            :options="dataTypeOptions"
            placeholder="All Types"
            outlined
            dense
            clearable
            class="filter-select"
          />

          <q-btn
            color="primary"
            icon="add"
            label="Add Setting"
            @click="showAddDialog = true"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Settings Table -->
    <q-card flat bordered>
      <q-card-section>
        <q-table
          :rows="filteredSettings"
          :columns="columns"
          row-key="id"
          :loading="loading"
          :pagination="pagination"
          @request="onRequest"
        >
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                round
                dense
                color="primary"
                icon="edit"
                @click="editSetting(props.row)"
              />
              <q-btn
                flat
                round
                dense
                color="negative"
                icon="delete"
                @click="deleteSetting(props.row)"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-value="props">
            <q-td :props="props">
              <div class="setting-value">
                {{ formatValue(props.row.setting_value, props.row.data_type) }}
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-context="props">
            <q-td :props="props">
              <div class="context-info">
                <q-chip
                  v-if="props.row.user_id"
                  size="sm"
                  color="blue"
                  text-color="white"
                >
                  User: {{ props.row.user_id }}
                </q-chip>
                <q-chip
                  v-if="props.row.device_serial"
                  size="sm"
                  color="purple"
                  text-color="white"
                >
                  Device: {{ props.row.device_serial }}
                </q-chip>
                <q-chip
                  v-if="!props.row.user_id && !props.row.device_serial"
                  size="sm"
                  color="grey"
                  text-color="white"
                >
                  Global
                </q-chip>
              </div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Add/Edit Setting Dialog -->
    <q-dialog v-model="showAddDialog" persistent>
      <q-card style="width: 500px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">{{ editingId ? 'Edit Setting' : 'Add New Setting' }}</div>
        </q-card-section>

        <q-card-section>
          <div class="setting-form">
            <q-input
              v-model="settingForm.category"
              label="Category"
              outlined
              :rules="[val => !!val || 'Category is required']"
            />

            <q-input
              v-model="settingForm.setting_key"
              label="Setting Key"
              outlined
              :rules="[val => !!val || 'Setting key is required']"
              class="q-mt-md"
            />

            <q-input
              v-model="settingForm.setting_value"
              label="Setting Value"
              outlined
              :type="settingForm.data_type === 'number' ? 'number' : 'text'"
              class="q-mt-md"
            />

            <q-select
              v-model="settingForm.data_type"
              :options="dataTypeOptions"
              label="Data Type"
              outlined
              class="q-mt-md"
            />

            <q-input
              v-model="settingForm.description"
              label="Description"
              outlined
              type="textarea"
              rows="3"
              class="q-mt-md"
            />

            <div class="context-section q-mt-md">
              <div class="text-subtitle2 q-mb-sm">Context (Optional)</div>

              <q-input
                v-model="settingForm.user_id"
                label="User ID"
                outlined
                type="number"
                hint="Leave empty for global setting"
              />

              <q-input
                v-model="settingForm.device_serial"
                label="Device Serial"
                outlined
                type="number"
                hint="Leave empty for non-device setting"
                class="q-mt-md"
              />

              <q-input
                v-model="settingForm.panel_id"
                label="Panel ID"
                outlined
                type="number"
                hint="Leave empty for non-panel setting"
                class="q-mt-md"
              />
            </div>

            <q-toggle
              v-model="settingForm.is_read_only"
              label="Read Only"
              class="q-mt-md"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="cancelEdit" />
          <q-btn
            color="primary"
            :label="editingId ? 'Update' : 'Add'"
            @click="saveSetting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'

export default {
  name: 'ApplicationSettingsPanel',
  setup() {
    const $q = useQuasar()

    const settings = ref([])
    const loading = ref(false)
    const showAddDialog = ref(false)
    const editingId = ref(null)

    const filters = ref({
      search: '',
      category: null,
      dataType: null
    })

    const settingForm = ref({
      category: '',
      setting_key: '',
      setting_value: '',
      data_type: 'string',
      description: '',
      user_id: null,
      device_serial: null,
      panel_id: null,
      is_read_only: false
    })

    const pagination = ref({
      sortBy: 'category',
      descending: false,
      page: 1,
      rowsPerPage: 10,
      rowsNumber: 0
    })

    const categoryOptions = ['UI', 'Device', 'User', 'System', 'TrendLog', 'HVAC']
    const dataTypeOptions = ['string', 'number', 'boolean', 'object']

    const columns = [
      {
        name: 'category',
        label: 'Category',
        field: 'category',
        sortable: true,
        align: 'left'
      },
      {
        name: 'setting_key',
        label: 'Key',
        field: 'setting_key',
        sortable: true,
        align: 'left'
      },
      {
        name: 'value',
        label: 'Value',
        field: 'setting_value',
        sortable: false,
        align: 'left'
      },
      {
        name: 'data_type',
        label: 'Type',
        field: 'data_type',
        sortable: true,
        align: 'center'
      },
      {
        name: 'context',
        label: 'Context',
        field: 'context',
        sortable: false,
        align: 'left'
      },
      {
        name: 'actions',
        label: 'Actions',
        field: 'actions',
        sortable: false,
        align: 'center'
      }
    ]

    const filteredSettings = computed(() => {
      let filtered = settings.value

      if (filters.value.search) {
        const search = filters.value.search.toLowerCase()
        filtered = filtered.filter(setting =>
          setting.category.toLowerCase().includes(search) ||
          setting.setting_key.toLowerCase().includes(search) ||
          setting.setting_value.toLowerCase().includes(search)
        )
      }

      if (filters.value.category) {
        filtered = filtered.filter(setting => setting.category === filters.value.category)
      }

      if (filters.value.dataType) {
        filtered = filtered.filter(setting => setting.data_type === filters.value.dataType)
      }

      return filtered
    })

    const loadSettings = async () => {
      loading.value = true
      try {
        // Mock data for now - replace with actual API call
        settings.value = [
          {
            id: 1,
            category: 'UI',
            setting_key: 'theme',
            setting_value: 'dark',
            data_type: 'string',
            description: 'Application theme preference',
            user_id: null,
            device_serial: null,
            panel_id: null,
            is_read_only: false
          },
          {
            id: 2,
            category: 'Device',
            setting_key: 'sample_rate',
            setting_value: '30',
            data_type: 'number',
            description: 'Device sampling rate in seconds',
            user_id: null,
            device_serial: 12345,
            panel_id: 1,
            is_read_only: false
          },
          {
            id: 3,
            category: 'User',
            setting_key: 'dashboard_layout',
            setting_value: '{"widgets": ["chart", "table"]}',
            data_type: 'object',
            description: 'User dashboard configuration',
            user_id: 1,
            device_serial: null,
            panel_id: null,
            is_read_only: false
          }
        ]
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Failed to load settings'
        })
      } finally {
        loading.value = false
      }
    }

    const formatValue = (value, dataType) => {
      if (dataType === 'object') {
        try {
          const obj = JSON.parse(value)
          return JSON.stringify(obj, null, 2)
        } catch {
          return value
        }
      }
      return value
    }

    const editSetting = (setting) => {
      editingId.value = setting.id
      settingForm.value = { ...setting }
      showAddDialog.value = true
    }

    const deleteSetting = (setting) => {
      $q.dialog({
        title: 'Confirm Delete',
        message: `Are you sure you want to delete the setting "${setting.setting_key}"?`,
        cancel: true,
        persistent: true
      }).onOk(() => {
        // TODO: Implement API call to delete setting
        settings.value = settings.value.filter(s => s.id !== setting.id)
        $q.notify({
          type: 'positive',
          message: 'Setting deleted successfully'
        })
      })
    }

    const saveSetting = () => {
      // TODO: Implement API call to save setting
      if (editingId.value) {
        // Update existing setting
        const index = settings.value.findIndex(s => s.id === editingId.value)
        if (index !== -1) {
          settings.value[index] = { ...settingForm.value }
        }
        $q.notify({
          type: 'positive',
          message: 'Setting updated successfully'
        })
      } else {
        // Add new setting
        const newSetting = {
          ...settingForm.value,
          id: Date.now(), // Temporary ID
          created_at: new Date().toISOString()
        }
        settings.value.push(newSetting)
        $q.notify({
          type: 'positive',
          message: 'Setting added successfully'
        })
      }

      cancelEdit()
    }

    const cancelEdit = () => {
      showAddDialog.value = false
      editingId.value = null
      settingForm.value = {
        category: '',
        setting_key: '',
        setting_value: '',
        data_type: 'string',
        description: '',
        user_id: null,
        device_serial: null,
        panel_id: null,
        is_read_only: false
      }
    }

    const onRequest = (props) => {
      // TODO: Implement server-side pagination
      console.log('Table request:', props)
    }

    onMounted(() => {
      loadSettings()
    })

    return {
      settings,
      loading,
      showAddDialog,
      editingId,
      filters,
      settingForm,
      pagination,
      categoryOptions,
      dataTypeOptions,
      columns,
      filteredSettings,
      formatValue,
      editSetting,
      deleteSetting,
      saveSetting,
      cancelEdit,
      onRequest
    }
  }
}
</script>

<style scoped>
.application-settings-panel {
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

.filters-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-input {
  flex: 2;
  min-width: 200px;
}

.filter-select {
  flex: 1;
  min-width: 150px;
}

.setting-value {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-info {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.setting-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.context-section {
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .application-settings-panel {
    padding: 10px;
  }

  .filters-row {
    flex-direction: column;
  }

  .filter-input,
  .filter-select {
    width: 100%;
  }
}
</style>
