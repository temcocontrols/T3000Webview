<template>
  <q-page class="t3-device-db">
    <!-- Top Bar -->
    <div class="top-bar">
      <div class="top-bar-left">
        <q-icon name="storage" size="20px" class="q-mr-sm" />
        <span class="page-title">T3000 Device Database</span>
        <q-separator vertical class="q-mx-md" />
        <q-breadcrumbs>
          <q-breadcrumbs-el label="Home" icon="home" />
          <q-breadcrumbs-el label="Database" />
          <q-breadcrumbs-el label="T3000 Devices" />
        </q-breadcrumbs>
      </div>
      <div class="top-bar-right">
        <q-btn
          flat
          icon="refresh"
          label="Refresh"
          @click="refreshData"
          class="q-mr-sm"
          size="sm"
        />
        <q-btn
          color="primary"
          icon="add"
          label="Create New"
          @click="showCreateDialog"
          :disable="!selectedTable"
          size="sm"
        />
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Panel - Table Navigator -->
      <div class="left-panel">
        <div class="panel-header">
          <h6 class="q-ma-none">Database Tables</h6>
          <q-space />
          <q-btn
            flat
            dense
            icon="expand_more"
            :class="{ 'rotate-180': !showTableGroups }"
            @click="showTableGroups = !showTableGroups"
            size="sm"
          />
        </div>

        <q-separator />

        <div class="table-tree" v-if="showTableGroups">
          <!-- Infrastructure Tables -->
          <q-expansion-item
            icon="business"
            label="Infrastructure"
            default-opened
            class="table-group"
          >
            <q-item
              v-for="table in infrastructureTables"
              :key="table.name"
              clickable
              :active="selectedTable === table.name"
              @click="selectTable(table.name)"
              class="table-item"
            >
              <q-item-section avatar>
                <q-icon :name="table.icon" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ table.label }}</q-item-label>
                <q-item-label caption>{{ table.description }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :label="table.count" color="grey-6" />
              </q-item-section>
            </q-item>
          </q-expansion-item>

          <!-- Device Point Tables -->
          <q-expansion-item
            icon="device_hub"
            label="Device Points"
            default-opened
            class="table-group"
          >
            <q-item
              v-for="table in devicePointTables"
              :key="table.name"
              clickable
              :active="selectedTable === table.name"
              @click="selectTable(table.name)"
              class="table-item"
            >
              <q-item-section avatar>
                <q-icon :name="table.icon" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ table.label }}</q-item-label>
                <q-item-label caption>{{ table.description }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :label="table.count" color="primary" />
              </q-item-section>
            </q-item>
          </q-expansion-item>

          <!-- System Tables -->
          <q-expansion-item
            icon="settings"
            label="System Configuration"
            class="table-group"
          >
            <q-item
              v-for="table in systemTables"
              :key="table.name"
              clickable
              :active="selectedTable === table.name"
              @click="selectTable(table.name)"
              class="table-item"
            >
              <q-item-section avatar>
                <q-icon :name="table.icon" size="20px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ table.label }}</q-item-label>
                <q-item-label caption>{{ table.description }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :label="table.count" color="secondary" />
              </q-item-section>
            </q-item>
          </q-expansion-item>
        </div>
      </div>

      <!-- Right Panel - Data & Operations -->
      <div class="right-panel">
        <!-- Table Header -->
        <div class="data-header" v-if="selectedTable">
          <div class="data-header-left">
            <h5 class="q-ma-none">{{ getSelectedTableInfo()?.label }}</h5>
            <p class="q-ma-none text-grey-6">{{ getSelectedTableInfo()?.description }}</p>
          </div>
          <div class="data-header-right">
            <q-btn-group flat>
              <q-btn
                flat
                icon="view_list"
                :color="viewMode === 'table' ? 'primary' : 'grey-6'"
                @click="viewMode = 'table'"
                dense
                size="sm"
              >
                <q-tooltip>Table View</q-tooltip>
              </q-btn>
              <q-btn
                flat
                icon="view_module"
                :color="viewMode === 'cards' ? 'primary' : 'grey-6'"
                @click="viewMode = 'cards'"
                dense
                size="sm"
              >
                <q-tooltip>Card View</q-tooltip>
              </q-btn>
              <q-btn
                flat
                icon="code"
                :color="viewMode === 'json' ? 'primary' : 'grey-6'"
                @click="viewMode = 'json'"
                dense
                size="sm"
              >
                <q-tooltip>JSON View</q-tooltip>
              </q-btn>
            </q-btn-group>
          </div>
        </div>

        <!-- Data Controls -->
        <div class="data-controls" v-if="selectedTable">
          <div class="data-controls-left">
            <q-input
              v-model="searchQuery"
              placeholder="Search records..."
              outlined
              dense
              style="width: 280px"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" />
              </template>
            </q-input>
            <q-select
              v-model="filterField"
              :options="getFilterOptions()"
              placeholder="Filter by..."
              outlined
              dense
              style="width: 140px"
              class="q-ml-sm"
            />
          </div>
          <div class="data-controls-right">
            <q-btn
              flat
              icon="file_download"
              label="Export"
              @click="exportData"
              class="q-mr-sm"
              size="sm"
            />
            <q-btn
              flat
              icon="upload_file"
              label="Import"
              @click="importData"
              class="q-mr-sm"
              size="sm"
            />
            <q-btn
              color="negative"
              icon="delete"
              label="Delete Selected"
              @click="deleteSelected"
              :disable="selectedRows.length === 0"
              size="sm"
            />
          </div>
        </div>

        <!-- Data Display Area -->
        <div class="data-content" v-if="selectedTable">
          <!-- Table View -->
          <q-table
            v-if="viewMode === 'table'"
            :rows="tableData"
            :columns="tableColumns"
            :loading="loading"
            :pagination="pagination"
            row-key="id"
            selection="multiple"
            v-model:selected="selectedRows"
            @request="onRequest"
            class="data-table"
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  flat
                  dense
                  icon="edit"
                  color="primary"
                  @click="editRecord(props.row)"
                  size="sm"
                />
                <q-btn
                  flat
                  dense
                  icon="visibility"
                  color="info"
                  @click="viewRecord(props.row)"
                  size="sm"
                />
                <q-btn
                  flat
                  dense
                  icon="delete"
                  color="negative"
                  @click="deleteRecord(props.row)"
                  size="sm"
                />
              </q-td>
            </template>
          </q-table>

          <!-- Cards View -->
          <div v-else-if="viewMode === 'cards'" class="cards-container">
            <q-card
              v-for="record in tableData"
              :key="record.id"
              class="record-card"
              :class="{ 'selected': isRowSelected(record) }"
              @click="toggleRowSelection(record)"
            >
              <q-card-section>
                <div class="card-header">
                  <h6 class="q-ma-none">{{ getRecordTitle(record) }}</h6>
                  <q-space />
                  <q-btn-dropdown flat dense icon="more_vert">
                    <q-list>
                      <q-item clickable @click="editRecord(record)">
                        <q-item-section avatar>
                          <q-icon name="edit" />
                        </q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                      <q-item clickable @click="viewRecord(record)">
                        <q-item-section avatar>
                          <q-icon name="visibility" />
                        </q-item-section>
                        <q-item-section>View</q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item clickable @click="deleteRecord(record)">
                        <q-item-section avatar>
                          <q-icon name="delete" color="negative" />
                        </q-item-section>
                        <q-item-section>Delete</q-item-section>
                      </q-item>
                    </q-list>
                  </q-btn-dropdown>
                </div>
                <div class="card-content">
                  <div v-for="(value, key) in getCardFields(record)" :key="key" class="card-field">
                    <span class="field-label">{{ formatFieldName(key) }}:</span>
                    <span class="field-value">{{ value }}</span>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- JSON View -->
          <div v-else-if="viewMode === 'json'" class="json-container">
            <q-scroll-area class="fit">
              <pre class="json-content">{{ JSON.stringify(tableData, null, 2) }}</pre>
            </q-scroll-area>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <q-icon name="table_chart" size="80px" color="grey-4" />
          <h5 class="q-mt-md text-grey-6">Select a table to view data</h5>
          <p class="text-grey-5">Choose a table from the left panel to start managing your T3000 device data</p>
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showDialog" :maximized="dialogMaximized">
      <q-card style="min-width: 600px; max-width: 800px">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            <h6 class="q-ma-none">{{ dialogMode === 'create' ? 'Create New' : 'Edit' }} {{ getSelectedTableInfo()?.label }}</h6>
          </div>
          <q-space />
          <q-btn
            flat
            dense
            :icon="dialogMaximized ? 'fullscreen_exit' : 'fullscreen'"
            @click="dialogMaximized = !dialogMaximized"
          />
          <q-btn flat dense icon="close" @click="showDialog = false" />
        </q-card-section>

        <q-separator />

        <q-card-section class="dialog-content">
          <q-form @submit="saveRecord" class="record-form">
            <div v-for="field in getFormFields()" :key="field.name" class="form-field">
              <q-input
                v-if="field.type === 'text' || field.type === 'number'"
                v-model="formData[field.name]"
                :label="field.label"
                :type="field.type"
                :required="field.required"
                outlined
                class="q-mb-md"
              />
              <q-select
                v-else-if="field.type === 'select'"
                v-model="formData[field.name]"
                :options="field.options"
                :label="field.label"
                :required="field.required"
                outlined
                class="q-mb-md"
              />
              <q-toggle
                v-else-if="field.type === 'boolean'"
                v-model="formData[field.name]"
                :label="field.label"
                class="q-mb-md"
              />
            </div>
          </q-form>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showDialog = false" />
          <q-btn color="primary" label="Save" @click="saveRecord" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Reactive data
const selectedTable = ref('')
const showTableGroups = ref(true)
const viewMode = ref('table')
const searchQuery = ref('')
const filterField = ref('')
const tableData = ref([])
const selectedRows = ref([])
const loading = ref(false)
const showDialog = ref(false)
const dialogMode = ref('create')
const dialogMaximized = ref(false)
const formData = ref({})
const saving = ref(false)

// Pagination
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
})

// Table definitions
const infrastructureTables = ref([
  {
    name: 'buildings',
    label: 'Buildings',
    description: 'Building infrastructure',
    icon: 'business',
    count: 0
  },
  {
    name: 'floors',
    label: 'Floors',
    description: 'Floor definitions',
    icon: 'layers',
    count: 0
  },
  {
    name: 'rooms',
    label: 'Rooms',
    description: 'Room assignments',
    icon: 'meeting_room',
    count: 0
  },
  {
    name: 'networks',
    label: 'Networks',
    description: 'Network infrastructure',
    icon: 'hub',
    count: 0
  },
  {
    name: 'devices',
    label: 'Devices',
    description: 'T3000 devices',
    icon: 'developer_board',
    count: 0
  }
])

const devicePointTables = ref([
  {
    name: 'input_points',
    label: 'Input Points',
    description: 'Device input data points',
    icon: 'input',
    count: 0
  },
  {
    name: 'output_points',
    label: 'Output Points',
    description: 'Device output control points',
    icon: 'output',
    count: 0
  },
  {
    name: 'variable_points',
    label: 'Variable Points',
    description: 'Variable data points',
    icon: 'code',
    count: 0
  },
  {
    name: 'programs',
    label: 'Programs',
    description: 'Control programs',
    icon: 'smart_toy',
    count: 0
  },
  {
    name: 'pid_controllers',
    label: 'PID Controllers',
    description: 'PID control loops',
    icon: 'tune',
    count: 0
  },
  {
    name: 'schedules',
    label: 'Schedules',
    description: 'Time schedules',
    icon: 'schedule',
    count: 0
  },
  {
    name: 'trendlogs',
    label: 'Trend Logs',
    description: 'Data trending',
    icon: 'trending_up',
    count: 0
  },
  {
    name: 'alarms',
    label: 'Alarms',
    description: 'Alarm definitions',
    icon: 'warning',
    count: 0
  }
])

const systemTables = ref([
  {
    name: 'units',
    label: 'Units',
    description: 'Measurement units',
    icon: 'straighten',
    count: 0
  },
  {
    name: 'point_categories',
    label: 'Point Categories',
    description: 'Point type definitions',
    icon: 'category',
    count: 0
  }
])

// Computed
const tableColumns = computed(() => {
  if (!selectedTable.value) return []

  // Dynamic column generation based on selected table
  const commonColumns = [
    { name: 'id', label: 'ID', field: 'id', sortable: true, align: 'left' },
  ]

  // Add table-specific columns
  const specificColumns = getTableSpecificColumns(selectedTable.value)

  // Add actions column
  const actionsColumn = {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    sortable: false,
    align: 'center'
  }

  return [...commonColumns, ...specificColumns, actionsColumn]
})

// Methods
const selectTable = (tableName) => {
  selectedTable.value = tableName
  selectedRows.value = []
  loadTableData()
}

const getSelectedTableInfo = () => {
  const allTables = [...infrastructureTables.value, ...devicePointTables.value, ...systemTables.value]
  return allTables.find(table => table.name === selectedTable.value)
}

const getTableSpecificColumns = (tableName) => {
  const columnMappings = {
    buildings: [
      { name: 'name', label: 'Name', field: 'name', sortable: true },
      { name: 'address', label: 'Address', field: 'address', sortable: true },
      { name: 'protocol', label: 'Protocol', field: 'protocol', sortable: true },
      { name: 'selected', label: 'Selected', field: 'selected', sortable: true }
    ],
    devices: [
      { name: 'device_name', label: 'Device Name', field: 'device_name', sortable: true },
      { name: 'instance_number', label: 'Instance', field: 'instance_number', sortable: true },
      { name: 'product_type', label: 'Product Type', field: 'product_type', sortable: true },
      { name: 'ip_address', label: 'IP Address', field: 'ip_address', sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true }
    ],
    input_points: [
      { name: 'point_number', label: 'Point #', field: 'point_number', sortable: true },
      { name: 'label', label: 'Label', field: 'label', sortable: true },
      { name: 'value', label: 'Value', field: 'value', sortable: true },
      { name: 'units_type', label: 'Units', field: 'units_type', sortable: true },
      { name: 'status', label: 'Status', field: 'status', sortable: true }
    ],
    // Add more table-specific columns as needed
  }

  return columnMappings[tableName] || [
    { name: 'name', label: 'Name', field: 'name', sortable: true },
    { name: 'created_at', label: 'Created', field: 'created_at', sortable: true }
  ]
}

const getFilterOptions = () => {
  if (!selectedTable.value) return []
  return tableColumns.value
    .filter(col => col.name !== 'actions' && col.name !== 'id')
    .map(col => ({ label: col.label, value: col.name }))
}

const loadTableData = async () => {
  if (!selectedTable.value) return

  loading.value = true
  try {
    // API call to fetch table data
    const response = await fetch(`/api/t3_device/${selectedTable.value}`)
    const data = await response.json()
    tableData.value = data.data || []
    pagination.value.rowsNumber = data.total || tableData.value.length
  } catch (error) {
    console.error('Error loading table data:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load table data'
    })
    // Fallback to sample data for demo
    tableData.value = getSampleData(selectedTable.value)
  } finally {
    loading.value = false
  }
}

const getSampleData = (tableName) => {
  const sampleData = {
    buildings: [
      { id: 1, name: 'Main Building', address: '123 Main St', protocol: 'TCP/IP', selected: 1 },
      { id: 2, name: 'Building B', address: '456 Oak Ave', protocol: 'Modbus', selected: 0 }
    ],
    devices: [
      { id: 1, device_name: 'T3-BB-01', instance_number: 1, product_type: 100, ip_address: '192.168.1.100', status: 1 },
      { id: 2, device_name: 'T3-BB-02', instance_number: 2, product_type: 100, ip_address: '192.168.1.101', status: 0 }
    ],
    input_points: [
      { id: 1, point_number: 1, label: 'Zone Temperature', value: 72.5, units_type: 1, status: 1 },
      { id: 2, point_number: 2, label: 'Humidity', value: 45.2, units_type: 8, status: 1 }
    ]
  }

  return sampleData[tableName] || []
}

const refreshData = () => {
  loadTableData()
  loadTableCounts()
}

const loadTableCounts = async () => {
  // Load record counts for each table
  const allTables = [...infrastructureTables.value, ...devicePointTables.value, ...systemTables.value]

  for (const table of allTables) {
    try {
      const response = await fetch(`/api/t3_device/${table.name}/count`)
      const data = await response.json()
      table.count = data.count || 0
    } catch (error) {
      console.error(`Error loading count for ${table.name}:`, error)
      // Fallback to sample counts
      const sampleCounts = { buildings: 2, devices: 5, input_points: 24, output_points: 16 }
      table.count = sampleCounts[table.name] || 0
    }
  }
}

const onRequest = (props) => {
  const { page, rowsPerPage } = props.pagination
  pagination.value.page = page
  pagination.value.rowsPerPage = rowsPerPage
  loadTableData()
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  formData.value = {}
  showDialog.value = true
}

const editRecord = (record) => {
  dialogMode.value = 'edit'
  formData.value = { ...record }
  showDialog.value = true
}

const viewRecord = (record) => {
  $q.dialog({
    title: `View ${getSelectedTableInfo()?.label}`,
    message: `<pre>${JSON.stringify(record, null, 2)}</pre>`,
    html: true,
    style: 'min-width: 400px'
  })
}

const deleteRecord = (record) => {
  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete this ${getSelectedTableInfo()?.label.toLowerCase()}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await fetch(`/api/t3_device/${selectedTable.value}/${record.id}`, {
        method: 'DELETE'
      })
      $q.notify({
        type: 'positive',
        message: 'Record deleted successfully'
      })
      loadTableData()
    } catch (error) {
      console.error('Error deleting record:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to delete record'
      })
    }
  })
}

const deleteSelected = () => {
  if (selectedRows.value.length === 0) return

  $q.dialog({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete ${selectedRows.value.length} selected records?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const promises = selectedRows.value.map(record =>
        fetch(`/api/t3_device/${selectedTable.value}/${record.id}`, {
          method: 'DELETE'
        })
      )
      await Promise.all(promises)
      $q.notify({
        type: 'positive',
        message: `${selectedRows.value.length} records deleted successfully`
      })
      selectedRows.value = []
      loadTableData()
    } catch (error) {
      console.error('Error deleting records:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to delete records'
      })
    }
  })
}

const saveRecord = async () => {
  if (!formData.value) return

  saving.value = true
  try {
    const method = dialogMode.value === 'create' ? 'POST' : 'PUT'
    const url = dialogMode.value === 'create'
      ? `/api/t3_device/${selectedTable.value}`
      : `/api/t3_device/${selectedTable.value}/${formData.value.id}`

    await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData.value)
    })

    $q.notify({
      type: 'positive',
      message: `Record ${dialogMode.value === 'create' ? 'created' : 'updated'} successfully`
    })

    showDialog.value = false
    loadTableData()
  } catch (error) {
    console.error('Error saving record:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to save record'
    })
  } finally {
    saving.value = false
  }
}

const getFormFields = () => {
  if (!selectedTable.value) return []

  const fieldMappings = {
    buildings: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'address', label: 'Address', type: 'text', required: false },
      { name: 'description', label: 'Description', type: 'text', required: false },
      { name: 'protocol', label: 'Protocol', type: 'text', required: false },
      { name: 'ip_domain_tel', label: 'IP/Domain/Tel', type: 'text', required: false },
      { name: 'modbus_tcp_port', label: 'Modbus TCP Port', type: 'number', required: false },
      { name: 'selected', label: 'Selected', type: 'boolean', required: false }
    ],
    devices: [
      { name: 'device_name', label: 'Device Name', type: 'text', required: false },
      { name: 'instance_number', label: 'Instance Number', type: 'number', required: true },
      { name: 'product_type', label: 'Product Type', type: 'number', required: true },
      { name: 'ip_address', label: 'IP Address', type: 'text', required: false },
      { name: 'modbus_address', label: 'Modbus Address', type: 'number', required: false },
      { name: 'status', label: 'Status', type: 'select', options: [
        { label: 'Offline', value: 0 },
        { label: 'Online', value: 1 }
      ], required: false }
    ]
    // Add more table-specific fields as needed
  }

  return fieldMappings[selectedTable.value] || [
    { name: 'name', label: 'Name', type: 'text', required: true }
  ]
}

const exportData = () => {
  // Export functionality
  const dataStr = JSON.stringify(tableData.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedTable.value}_export.json`
  link.click()
  URL.revokeObjectURL(url)
}

const importData = () => {
  // Import functionality - open file dialog
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.csv'
  input.onchange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result)
          // Process imported data
          console.log('Imported data:', data)
          $q.notify({
            type: 'positive',
            message: 'Data imported successfully'
          })
        } catch (error) {
          $q.notify({
            type: 'negative',
            message: 'Invalid file format'
          })
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const getRecordTitle = (record) => {
  return record.name || record.label || record.device_name || `Record ${record.id}`
}

const getCardFields = (record) => {
  const excludeFields = ['id', 'created_at', 'updated_at']
  const fields = {}

  Object.keys(record).forEach(key => {
    if (!excludeFields.includes(key) && record[key] !== null && record[key] !== '') {
      fields[key] = record[key]
    }
  })

  return fields
}

const formatFieldName = (fieldName) => {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

const isRowSelected = (record) => {
  return selectedRows.value.some(row => row.id === record.id)
}

const toggleRowSelection = (record) => {
  const index = selectedRows.value.findIndex(row => row.id === record.id)
  if (index > -1) {
    selectedRows.value.splice(index, 1)
  } else {
    selectedRows.value.push(record)
  }
}

// Lifecycle
onMounted(() => {
  loadTableCounts()
})
</script>

<style lang="scss" scoped>
.t3-device-db {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-size: 13px;

  // Global text size overrides
  :deep(.q-btn) {
    font-size: 13px;
  }

  :deep(.q-badge) {
    font-size: 11px;
  }

  :deep(.q-item-label) {
    font-size: 13px;
  }

  :deep(.q-item-label--caption) {
    font-size: 11px;
  }

  :deep(.q-breadcrumbs) {
    font-size: 12px;
  }

  :deep(.q-tooltip) {
    font-size: 11px;
  }

  :deep(.q-pagination) {
    font-size: 12px;
  }
}

.top-bar {
  height: 56px;
  padding: 0 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 30px;

  .top-bar-left {
    display: flex;
    align-items: center;

    .page-title {
      font-size: 14px;
      font-weight: 500;
      color: #1a1a1a;
    }
  }

  .top-bar-right {
    display: flex;
    align-items: center;
  }
}

.main-content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.left-panel {
  width: 320px;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;

  .panel-header {
    height: 48px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    background: white;
    border-bottom: 1px solid #e0e0e0;

    h6 {
      color: #1a1a1a;
      font-weight: 500;
      font-size: 13px;
    }
  }

  .table-tree {
    flex: 1;
    overflow-y: auto;

    .table-group {
      :deep(.q-expansion-item__content) {
        padding: 0;
      }
    }

    .table-item {
      padding: 6px 14px;
      margin: 0 6px;
      border-radius: 4px;
      font-size: 13px;

      &:hover {
        background: rgba(25, 118, 210, 0.04);
      }

      &.q-item--active {
        background: rgba(25, 118, 210, 0.12);
        color: #1976d2;
      }
    }
  }
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
}

.data-header {
  height: 70px;
  padding: 14px 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .data-header-left {
    h5 {
      color: #1a1a1a;
      font-weight: 500;
      margin-bottom: 2px;
      font-size: 14px;
    }

    p {
      font-size: 12px;
    }
  }
}

.data-controls {
  height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  font-size: 13px;

  .data-controls-left {
    display: flex;
    align-items: center;
  }

  .data-controls-right {
    display: flex;
    align-items: center;
  }
}

.data-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  font-size: 13px;

  .data-table {
    :deep(.q-table__container) {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 13px;
    }

    :deep(.q-table th) {
      font-size: 12px;
      font-weight: 500;
    }

    :deep(.q-table td) {
      font-size: 13px;
    }
  }

  .cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 14px;

    .record-card {
      border: 1px solid #e0e0e0;
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover {
        border-color: #1976d2;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &.selected {
        border-color: #1976d2;
        background: rgba(25, 118, 210, 0.04);
      }

      .card-header {
        display: flex;
        align-items: center;
        margin-bottom: 10px;

        h6 {
          color: #1a1a1a;
          font-weight: 500;
          font-size: 14px;
        }
      }

      .card-field {
        display: flex;
        margin-bottom: 6px;

        .field-label {
          font-weight: 500;
          color: #666;
          min-width: 110px;
          margin-right: 6px;
          font-size: 12px;
        }

        .field-value {
          color: #1a1a1a;
          flex: 1;
          font-size: 12px;
        }
      }
    }
  }

  .json-container {
    height: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 4px;

    .json-content {
      padding: 14px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #1a1a1a;
    }
  }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  h5 {
    margin-bottom: 6px;
    font-size: 14px;
  }

  p {
    font-size: 13px;
  }
}

.dialog-header {
  display: flex;
  align-items: center;

  .dialog-title h6 {
    color: #1a1a1a;
    font-weight: 500;
    font-size: 15px;
  }
}

.dialog-content {
  max-height: 60vh;
  overflow-y: auto;

  .record-form {
    .form-field {
      margin-bottom: 14px;

      :deep(.q-field__label) {
        font-size: 12px;
      }

      :deep(.q-field__control) {
        font-size: 12px;
      }

      :deep(.q-field__control input) {
        font-size: 12px;
      }

      :deep(.q-field__control textarea) {
        font-size: 12px;
      }
    }
  }

  :deep(.q-dialog) {
    .q-card {
      .q-card__section {
        font-size: 13px;
      }
    }

    .q-dialog__inner h6 {
      font-size: 14px;
      margin: 0 0 12px 0;
    }

    .q-dialog__inner p {
      font-size: 12px;
    }
  }
}

.rotate-180 {
  transform: rotate(180deg);
}

@media (max-width: 1024px) {
  .left-panel {
    width: 260px;
  }

  .data-controls {
    flex-direction: column;
    height: auto;
    padding: 14px 20px;

    .data-controls-left,
    .data-controls-right {
      width: 100%;
      justify-content: space-between;
      margin-bottom: 6px;
    }
  }

  .cards-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    height: 180px;
  }

  .top-bar {
    flex-direction: column;
    height: auto;
    padding: 14px;

    .top-bar-left,
    .top-bar-right {
      width: 100%;
      justify-content: center;
      margin-bottom: 6px;
    }

    .page-title {
      font-size: 14px;
    }
  }
}
</style>
