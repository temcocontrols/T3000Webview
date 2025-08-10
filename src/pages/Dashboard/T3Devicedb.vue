<template>
  <q-page class="q-pa-md">
    <div class="row q-mb-md">
      <div class="col">
        <h4 class="q-my-none text-primary">
          <q-icon name="storage" class="q-mr-sm" />
          T3000 Device Database Management
        </h4>
        <p class="text-grey-7 q-mb-none">
          Complete CRUD operations for all T3000 database tables
        </p>
      </div>
    </div>

    <!-- Database Status Card -->
    <q-card class="q-mb-md" flat bordered>
      <q-card-section>
        <div class="row items-center">
          <div class="col">
            <div class="text-h6 text-primary">Database Status</div>
          </div>
          <div class="col-auto">
            <q-btn
              @click="checkDatabaseStatus"
              icon="refresh"
              color="primary"
              flat
              round
              :loading="statusLoading"
            >
              <q-tooltip>Refresh Status</q-tooltip>
            </q-btn>
          </div>
        </div>

        <div class="row q-mt-md q-gutter-md">
          <div class="col-md-3 col-sm-6 col-xs-12">
            <q-card flat class="bg-positive text-white">
              <q-card-section>
                <div class="text-h6">{{ dbStats.totalTables }}</div>
                <div class="text-caption">Total Tables</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-md-3 col-sm-6 col-xs-12">
            <q-card flat class="bg-info text-white">
              <q-card-section>
                <div class="text-h6">{{ dbStats.totalRecords }}</div>
                <div class="text-caption">Total Records</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-md-3 col-sm-6 col-xs-12">
            <q-card flat class="bg-warning text-white">
              <q-card-section>
                <div class="text-h6">{{ dbStats.lastUpdate }}</div>
                <div class="text-caption">Last Updated</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-md-3 col-sm-6 col-xs-12">
            <q-card flat :class="dbStats.connected ? 'bg-positive' : 'bg-negative'" class="text-white">
              <q-card-section>
                <div class="text-h6">
                  <q-icon :name="dbStats.connected ? 'check_circle' : 'error'" />
                </div>
                <div class="text-caption">{{ dbStats.connected ? 'Connected' : 'Disconnected' }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Table Selection -->
    <q-card class="q-mb-md" flat bordered>
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="col">
            <div class="text-h6">Table Management</div>
          </div>
          <div class="col-auto">
            <q-btn-group flat>
              <q-btn
                @click="refreshTableData"
                icon="refresh"
                color="primary"
                :loading="loading"
                label="Refresh"
              />
              <q-btn
                @click="exportData"
                icon="download"
                color="positive"
                label="Export"
              />
              <q-btn
                @click="showImportDialog = true"
                icon="upload"
                color="warning"
                label="Import"
              />
            </q-btn-group>
          </div>
        </div>

        <!-- Table Selector -->
        <div class="row q-mb-md">
          <div class="col-md-4 col-sm-6 col-xs-12 q-pr-md">
            <q-select
              v-model="selectedTable"
              :options="tableOptions"
              label="Select Table"
              emit-value
              map-options
              outlined
              @update:model-value="onTableChange"
            >
              <template v-slot:prepend>
                <q-icon name="table_chart" />
              </template>
            </q-select>
          </div>
          <div class="col-md-4 col-sm-6 col-xs-12 q-pr-md">
            <q-input
              v-model="searchText"
              label="Search Records"
              outlined
              debounce="300"
              @update:model-value="onSearchChange"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
              <template v-slot:append>
                <q-btn
                  v-if="searchText"
                  @click="clearSearch"
                  icon="clear"
                  flat
                  round
                  dense
                />
              </template>
            </q-input>
          </div>
          <div class="col-md-4 col-sm-12 col-xs-12">
            <q-btn
              @click="showCreateDialog = true"
              icon="add"
              color="primary"
              label="Add Record"
              :disable="!selectedTable"
              style="width: 100%"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Data Table -->
    <q-card flat bordered v-if="selectedTable">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="col">
            <div class="text-h6">{{ selectedTableInfo.label }} Records</div>
            <div class="text-caption text-grey-7">
              {{ filteredData.length }} of {{ tableData.length }} records
            </div>
          </div>
          <div class="col-auto">
            <q-chip
              :color="selectedTableInfo.category === 'core' ? 'primary' :
                     selectedTableInfo.category === 'points' ? 'secondary' :
                     selectedTableInfo.category === 'control' ? 'positive' : 'warning'"
              text-color="white"
              :label="selectedTableInfo.category"
              dense
            />
          </div>
        </div>

        <q-table
          :rows="paginatedData"
          :columns="tableColumns"
          :loading="loading"
          row-key="id"
          :pagination="pagination"
          @request="onTableRequest"
          binary-state-sort
          flat
          bordered
        >
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn-group flat dense>
                <q-btn
                  @click="editRecord(props.row)"
                  icon="edit"
                  color="primary"
                  size="sm"
                  flat
                  round
                >
                  <q-tooltip>Edit</q-tooltip>
                </q-btn>
                <q-btn
                  @click="deleteRecord(props.row)"
                  icon="delete"
                  color="negative"
                  size="sm"
                  flat
                  round
                >
                  <q-tooltip>Delete</q-tooltip>
                </q-btn>
                <q-btn
                  @click="viewRecord(props.row)"
                  icon="visibility"
                  color="info"
                  size="sm"
                  flat
                  round
                >
                  <q-tooltip>View Details</q-tooltip>
                </q-btn>
              </q-btn-group>
            </q-td>
          </template>

          <template v-slot:no-data>
            <div class="full-width row flex-center q-gutter-sm text-grey-7">
              <q-icon size="2em" name="inbox" />
              <span>No records found for {{ selectedTableInfo.label }}</span>
            </div>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 600px; max-width: 800px;">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingRecord ? 'Edit' : 'Create' }} {{ selectedTableInfo.label }} Record</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveRecord" class="q-gutter-md">
            <div v-for="field in formFields" :key="field.name" class="row">
              <div class="col-12">
                <!-- Text Input -->
                <q-input
                  v-if="field.type === 'text' || field.type === 'email'"
                  v-model="formData[field.name]"
                  :label="field.label"
                  :required="field.required"
                  outlined
                  :type="field.type"
                />

                <!-- Number Input -->
                <q-input
                  v-else-if="field.type === 'number'"
                  v-model.number="formData[field.name]"
                  :label="field.label"
                  :required="field.required"
                  outlined
                  type="number"
                  :step="field.step || 1"
                />

                <!-- Select Input -->
                <q-select
                  v-else-if="field.type === 'select'"
                  v-model="formData[field.name]"
                  :label="field.label"
                  :options="field.options"
                  :required="field.required"
                  outlined
                  emit-value
                  map-options
                />

                <!-- Boolean Toggle -->
                <q-toggle
                  v-else-if="field.type === 'boolean'"
                  v-model="formData[field.name]"
                  :label="field.label"
                  color="primary"
                />

                <!-- Date Input -->
                <q-input
                  v-else-if="field.type === 'date'"
                  v-model="formData[field.name]"
                  :label="field.label"
                  :required="field.required"
                  outlined
                  type="date"
                />

                <!-- Textarea -->
                <q-input
                  v-else-if="field.type === 'textarea'"
                  v-model="formData[field.name]"
                  :label="field.label"
                  :required="field.required"
                  outlined
                  type="textarea"
                  rows="3"
                />
              </div>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            @click="saveRecord"
            :label="editingRecord ? 'Update' : 'Create'"
            color="primary"
            :loading="saving"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- View Record Dialog -->
    <q-dialog v-model="showViewDialog">
      <q-card style="min-width: 500px;">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ selectedTableInfo.label }} Record Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-list>
            <q-item v-for="(value, key) in viewingRecord" :key="key">
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ formatFieldName(key) }}</q-item-label>
                <q-item-label caption>{{ formatFieldValue(value) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
          <q-btn
            @click="editRecord(viewingRecord)"
            label="Edit"
            color="primary"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Import Dialog -->
    <q-dialog v-model="showImportDialog">
      <q-card style="min-width: 400px;">
        <q-card-section class="row items-center">
          <div class="text-h6">Import Data</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-file
            v-model="importFile"
            label="Select JSON file"
            outlined
            accept=".json"
            max-file-size="10485760"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            @click="importData"
            label="Import"
            color="primary"
            :loading="importing"
            :disable="!importFile"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

export default defineComponent({
  name: 'T3DeviceDBPage',

  setup() {
    const $q = useQuasar()

    // Reactive data
    const loading = ref(false)
    const statusLoading = ref(false)
    const saving = ref(false)
    const importing = ref(false)
    const selectedTable = ref('')
    const searchText = ref('')
    const tableData = ref([])
    const showCreateDialog = ref(false)
    const showViewDialog = ref(false)
    const showImportDialog = ref(false)
    const editingRecord = ref(null)
    const viewingRecord = ref(null)
    const formData = ref({})
    const importFile = ref(null)

    // Database statistics
    const dbStats = ref({
      totalTables: 0,
      totalRecords: 0,
      lastUpdate: 'Never',
      connected: false
    })

    // Pagination
    const pagination = ref({
      sortBy: 'id',
      descending: false,
      page: 1,
      rowsPerPage: 10,
      rowsNumber: 0
    })

    // Table definitions
    const tableOptions = ref([
      // Core Infrastructure
      { label: 'Buildings', value: 'buildings', category: 'core' },
      { label: 'Floors', value: 'floors', category: 'core' },
      { label: 'Rooms', value: 'rooms', category: 'core' },
      { label: 'Networks', value: 'networks', category: 'core' },
      { label: 'Devices', value: 'devices', category: 'core' },

      // Data Points
      { label: 'Input Points', value: 'input_points', category: 'points' },
      { label: 'Output Points', value: 'output_points', category: 'points' },
      { label: 'Variable Points', value: 'variable_points', category: 'points' },

      // Control & Automation
      { label: 'Programs', value: 'programs', category: 'control' },
      { label: 'PID Controllers', value: 'pid_controllers', category: 'control' },
      { label: 'Schedules', value: 'schedules', category: 'control' },
      { label: 'Holidays', value: 'holidays', category: 'control' },

      // Monitoring
      { label: 'Trend Logs', value: 'trendlogs', category: 'monitoring' },
      { label: 'Alarms', value: 'alarms', category: 'monitoring' },

      // Extended Features
      { label: 'Graphics', value: 'graphics', category: 'extended' },
      { label: 'Arrays', value: 'arrays', category: 'extended' },
      { label: 'Array Values', value: 'array_values', category: 'extended' },
      { label: 'Network Points', value: 'network_points', category: 'extended' },

      // Support Tables
      { label: 'Units', value: 'units', category: 'support' },
      { label: 'Point Categories', value: 'point_categories', category: 'support' }
    ])

    // Field definitions for each table
    const tableFieldDefinitions = {
      buildings: [
        { name: 'name', label: 'Building Name', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'textarea', required: false },
        { name: 'description', label: 'Description', type: 'textarea', required: false },
        { name: 'protocol', label: 'Protocol', type: 'select', required: false,
          options: [
            { label: 'Modbus TCP/IP', value: 'modbus_tcpip' },
            { label: 'Modbus RS485', value: 'modbus_rs485' },
            { label: 'BACnet IP', value: 'bacnet_ip' },
            { label: 'BACnet MSTP', value: 'bacnet_mstp' }
          ]
        },
        { name: 'ip_domain_tel', label: 'IP/Domain/Tel', type: 'text', required: false },
        { name: 'modbus_tcp_port', label: 'Modbus TCP Port', type: 'number', required: false },
        { name: 'com_port', label: 'COM Port', type: 'text', required: false },
        { name: 'baud_rate', label: 'Baud Rate', type: 'select', required: false,
          options: [
            { label: '9600', value: 9600 },
            { label: '19200', value: 19200 },
            { label: '38400', value: 38400 },
            { label: '57600', value: 57600 },
            { label: '115200', value: 115200 }
          ]
        },
        { name: 'building_path', label: 'Building Path', type: 'text', required: false },
        { name: 'selected', label: 'Selected', type: 'boolean', required: false }
      ],

      devices: [
        { name: 'network_id', label: 'Network ID', type: 'number', required: true },
        { name: 'room_id', label: 'Room ID', type: 'number', required: false },
        { name: 'instance_number', label: 'Instance Number', type: 'number', required: true },
        { name: 'product_type', label: 'Product Type', type: 'number', required: true },
        { name: 'product_model', label: 'Product Model', type: 'text', required: false },
        { name: 'serial_number', label: 'Serial Number', type: 'text', required: false },
        { name: 'hardware_version', label: 'Hardware Version', type: 'text', required: false },
        { name: 'software_version', label: 'Software Version', type: 'text', required: false },
        { name: 'device_name', label: 'Device Name', type: 'text', required: false },
        { name: 'description', label: 'Description', type: 'textarea', required: false },
        { name: 'ip_address', label: 'IP Address', type: 'text', required: false },
        { name: 'modbus_address', label: 'Modbus Address', type: 'number', required: false },
        { name: 'status', label: 'Status', type: 'select', required: false,
          options: [
            { label: 'Online', value: 1 },
            { label: 'Offline', value: 0 },
            { label: 'Error', value: -1 }
          ]
        }
      ],

      input_points: [
        { name: 'device_id', label: 'Device ID', type: 'number', required: true },
        { name: 'point_number', label: 'Point Number', type: 'number', required: true },
        { name: 'panel_number', label: 'Panel Number', type: 'number', required: false },
        { name: 'full_label', label: 'Full Label', type: 'text', required: false },
        { name: 'label', label: 'Label', type: 'text', required: false },
        { name: 'auto_manual', label: 'Auto/Manual', type: 'select', required: false,
          options: [
            { label: 'Auto', value: 0 },
            { label: 'Manual', value: 1 }
          ]
        },
        { name: 'value', label: 'Value', type: 'number', required: false, step: 0.01 },
        { name: 'units_type', label: 'Units Type', type: 'number', required: false },
        { name: 'range_type', label: 'Range Type', type: 'number', required: false },
        { name: 'range_min', label: 'Range Min', type: 'number', required: false, step: 0.01 },
        { name: 'range_max', label: 'Range Max', type: 'number', required: false, step: 0.01 },
        { name: 'calibration', label: 'Calibration', type: 'number', required: false, step: 0.01 },
        { name: 'calibration_sign', label: 'Calibration Sign', type: 'select', required: false,
          options: [
            { label: 'Positive', value: 0 },
            { label: 'Negative', value: 1 }
          ]
        },
        { name: 'filter', label: 'Filter', type: 'number', required: false },
        { name: 'status', label: 'Status', type: 'number', required: false },
        { name: 'signal_type', label: 'Signal Type', type: 'select', required: false,
          options: [
            { label: 'Digital', value: 0 },
            { label: 'Analog', value: 1 }
          ]
        },
        { name: 'decom', label: 'Decommissioned', type: 'boolean', required: false }
      ]
    }

    // Computed properties
    const selectedTableInfo = computed(() => {
      return tableOptions.value.find(table => table.value === selectedTable.value) || {}
    })

    const tableColumns = computed(() => {
      if (!selectedTable.value || !tableData.value.length) return []

      const sampleRecord = tableData.value[0]
      const columns = Object.keys(sampleRecord).map(key => ({
        name: key,
        label: formatFieldName(key),
        field: key,
        align: 'left',
        sortable: true
      }))

      // Add actions column
      columns.push({
        name: 'actions',
        label: 'Actions',
        field: 'actions',
        align: 'center',
        sortable: false
      })

      return columns
    })

    const formFields = computed(() => {
      return tableFieldDefinitions[selectedTable.value] || []
    })

    const filteredData = computed(() => {
      if (!searchText.value) return tableData.value

      const search = searchText.value.toLowerCase()
      return tableData.value.filter(record => {
        return Object.values(record).some(value =>
          value && value.toString().toLowerCase().includes(search)
        )
      })
    })

    const paginatedData = computed(() => {
      const start = (pagination.value.page - 1) * pagination.value.rowsPerPage
      const end = start + pagination.value.rowsPerPage
      return filteredData.value.slice(start, end)
    })

    // Methods
    const checkDatabaseStatus = async () => {
      statusLoading.value = true
      try {
        // Mock API call - replace with actual API endpoint
        const response = await api.get('/api/t3device/status')
        dbStats.value = response.data
      } catch (error) {
        console.error('Failed to check database status:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to check database status'
        })
      } finally {
        statusLoading.value = false
      }
    }

    const onTableChange = async () => {
      if (selectedTable.value) {
        await loadTableData()
      }
    }

    const loadTableData = async () => {
      loading.value = true
      try {
        // Mock API call - replace with actual API endpoint
        const response = await api.get(`/api/t3device/${selectedTable.value}`)
        tableData.value = response.data
        pagination.value.rowsNumber = response.data.length
      } catch (error) {
        console.error('Failed to load table data:', error)
        $q.notify({
          type: 'negative',
          message: `Failed to load ${selectedTableInfo.value.label} data`
        })
        tableData.value = []
      } finally {
        loading.value = false
      }
    }

    const refreshTableData = () => {
      if (selectedTable.value) {
        loadTableData()
      }
    }

    const onSearchChange = () => {
      pagination.value.page = 1
    }

    const clearSearch = () => {
      searchText.value = ''
      pagination.value.page = 1
    }

    const onTableRequest = (props) => {
      pagination.value = props.pagination
    }

    const editRecord = (record) => {
      editingRecord.value = record
      formData.value = { ...record }
      showCreateDialog.value = true
      showViewDialog.value = false
    }

    const viewRecord = (record) => {
      viewingRecord.value = record
      showViewDialog.value = true
    }

    const deleteRecord = async (record) => {
      $q.dialog({
        title: 'Confirm Delete',
        message: `Are you sure you want to delete this ${selectedTableInfo.value.label} record?`,
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await api.delete(`/api/t3device/${selectedTable.value}/${record.id}`)
          await loadTableData()
          $q.notify({
            type: 'positive',
            message: 'Record deleted successfully'
          })
        } catch (error) {
          console.error('Failed to delete record:', error)
          $q.notify({
            type: 'negative',
            message: 'Failed to delete record'
          })
        }
      })
    }

    const saveRecord = async () => {
      saving.value = true
      try {
        if (editingRecord.value) {
          // Update existing record
          await api.put(`/api/t3device/${selectedTable.value}/${editingRecord.value.id}`, formData.value)
          $q.notify({
            type: 'positive',
            message: 'Record updated successfully'
          })
        } else {
          // Create new record
          await api.post(`/api/t3device/${selectedTable.value}`, formData.value)
          $q.notify({
            type: 'positive',
            message: 'Record created successfully'
          })
        }

        showCreateDialog.value = false
        editingRecord.value = null
        formData.value = {}
        await loadTableData()
      } catch (error) {
        console.error('Failed to save record:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to save record'
        })
      } finally {
        saving.value = false
      }
    }

    const exportData = () => {
      if (!tableData.value.length) return

      const dataStr = JSON.stringify(tableData.value, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedTable.value}_export.json`
      link.click()
      URL.revokeObjectURL(url)
    }

    const importData = async () => {
      if (!importFile.value) return

      importing.value = true
      try {
        const text = await importFile.value.text()
        const data = JSON.parse(text)

        // Import data via API
        await api.post(`/api/t3device/${selectedTable.value}/import`, { data })

        $q.notify({
          type: 'positive',
          message: 'Data imported successfully'
        })

        showImportDialog.value = false
        importFile.value = null
        await loadTableData()
      } catch (error) {
        console.error('Failed to import data:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to import data'
        })
      } finally {
        importing.value = false
      }
    }

    const formatFieldName = (fieldName) => {
      return fieldName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatFieldValue = (value) => {
      if (value === null || value === undefined) return 'N/A'
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      if (typeof value === 'number') return value.toLocaleString()
      return value.toString()
    }

    // Lifecycle
    onMounted(() => {
      checkDatabaseStatus()
    })

    // Watch for dialog close to reset form
    watch(showCreateDialog, (newVal) => {
      if (!newVal) {
        editingRecord.value = null
        formData.value = {}
      }
    })

    return {
      // Data
      loading,
      statusLoading,
      saving,
      importing,
      selectedTable,
      searchText,
      tableData,
      showCreateDialog,
      showViewDialog,
      showImportDialog,
      editingRecord,
      viewingRecord,
      formData,
      importFile,
      dbStats,
      pagination,
      tableOptions,

      // Computed
      selectedTableInfo,
      tableColumns,
      formFields,
      filteredData,
      paginatedData,

      // Methods
      checkDatabaseStatus,
      onTableChange,
      loadTableData,
      refreshTableData,
      onSearchChange,
      clearSearch,
      onTableRequest,
      editRecord,
      viewRecord,
      deleteRecord,
      saveRecord,
      exportData,
      importData,
      formatFieldName,
      formatFieldValue
    }
  }
})
</script>

<style scoped>
.q-table {
  border-radius: 8px;
}

.q-card {
  border-radius: 8px;
}
</style>
