<template>
  <q-dialog v-model="showDialog" maximized persistent>
    <q-card>
      <q-toolbar class="bg-primary text-white">
        <q-toolbar-title>
          <q-icon name="settings" class="q-mr-sm" />
          Database Management
        </q-toolbar-title>
        <q-btn flat icon="close" @click="close" />
      </q-toolbar>

      <q-card-section class="no-padding">
        <q-tabs v-model="activeTab" class="text-primary" align="justify">
          <q-tab name="dashboard" label="Dashboard" icon="dashboard" />
          <q-tab name="settings" label="Settings" icon="tune" />
          <q-tab name="partitions" label="Partitions" icon="storage" />
          <q-tab name="monitoring" label="Monitoring" icon="monitoring" />
          <q-tab name="tools" label="Tools" icon="build" />
        </q-tabs>
      </q-card-section>

      <q-card-section class="popup-content">
        <q-tab-panels v-model="activeTab" animated>
          <q-tab-panel name="dashboard" class="no-padding">
            <DatabaseManagementPage />
          </q-tab-panel>

          <q-tab-panel name="settings" class="no-padding">
            <ApplicationSettingsPanel />
          </q-tab-panel>

          <q-tab-panel name="partitions" class="no-padding">
            <DatabasePartitionsPanel />
          </q-tab-panel>

          <q-tab-panel name="monitoring" class="no-padding">
            <MonitoringStatsPanel />
          </q-tab-panel>

          <q-tab-panel name="tools" class="no-padding">
            <ManagementToolsPanel />
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, defineProps, defineEmits } from 'vue'
import DatabaseManagementPage from './Database/DatabaseManagementPage.vue'
import ApplicationSettingsPanel from './Database/ApplicationSettingsPanel.vue'
import DatabasePartitionsPanel from './Database/DatabasePartitionsPanel.vue'
import MonitoringStatsPanel from './Database/MonitoringStatsPanel.vue'
import ManagementToolsPanel from './Database/ManagementToolsPanel.vue'

export default {
  name: 'DatabaseManagementPopup',
  components: {
    DatabaseManagementPage,
    ApplicationSettingsPanel,
    DatabasePartitionsPanel,
    MonitoringStatsPanel,
    ManagementToolsPanel
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    initialTab: {
      type: String,
      default: 'dashboard'
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const showDialog = ref(props.modelValue)
    const activeTab = ref(props.initialTab)

    const close = () => {
      showDialog.value = false
      emit('update:modelValue', false)
    }

    // Watch for prop changes
    const updateDialog = (newValue) => {
      showDialog.value = newValue
    }

    return {
      showDialog,
      activeTab,
      close,
      updateDialog
    }
  },
  watch: {
    modelValue(newValue) {
      this.updateDialog(newValue)
    }
  }
}
</script>

<style scoped>
.popup-content {
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.no-padding {
  padding: 0;
}

/* Override Quasar tab panel padding */
:deep(.q-tab-panel) {
  padding: 0;
}
</style>
