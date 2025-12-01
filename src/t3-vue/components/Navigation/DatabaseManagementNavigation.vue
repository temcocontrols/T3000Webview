<template>
  <q-btn-dropdown
    flat
    color="primary"
    icon="settings"
  label="Database"
  class="database-nav"
  >
    <q-list>
  <q-item clickable v-close-popup @click="navigateTo('database')">
        <q-item-section avatar>
          <q-icon name="dashboard" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Dashboard</q-item-label>
          <q-item-label caption>Main management overview</q-item-label>
        </q-item-section>
      </q-item>

      <q-separator />

  <q-item clickable v-close-popup @click="navigateTo('database-settings')">
        <q-item-section avatar>
          <q-icon name="tune" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Application Settings</q-item-label>
          <q-item-label caption>Manage app configuration</q-item-label>
        </q-item-section>
      </q-item>

  <q-item clickable v-close-popup @click="navigateTo('database-partitions')">
        <q-item-section avatar>
          <q-icon name="storage" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Database Partitions</q-item-label>
          <q-item-label caption>Partition management & cleanup</q-item-label>
        </q-item-section>
      </q-item>

  <q-item clickable v-close-popup @click="navigateTo('database-monitoring')">
        <q-item-section avatar>
          <q-icon name="monitoring" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Health Monitoring</q-item-label>
          <q-item-label caption>Database stats & performance</q-item-label>
        </q-item-section>
      </q-item>

  <q-item clickable v-close-popup @click="navigateTo('database-tools')">
        <q-item-section avatar>
          <q-icon name="build" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Management Tools</q-item-label>
          <q-item-label caption>Backup, vacuum, optimize</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script>
import { useRouter } from 'vue-router'

export default {
  name: 'DatabaseManagementNavigation',
  setup() {
    const router = useRouter()

    const navigateTo = (routeName) => {
      router.push({ name: routeName })
    }

    return {
      navigateTo
    }
  }
}
</script>

<style scoped>
.database-nav {
  margin-left: 10px;
}
</style>
