<template>
  <main-layout>
    <template #header>
      <div class="page-header">
        <h1>HVAC Dashboard</h1>
      </div>
    </template>

    <div class="hvac-content">
      <div class="dashboard-cards">
        <div class="card" v-for="(unit, index) in hvacUnits" :key="index">
          <div class="card-header">
            <h3>{{ unit.name }}</h3>
            <span class="status" :class="{ active: unit.isActive }">
              {{ unit.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="card-body">
            <div class="reading">
              <div class="label">Temperature</div>
              <div class="value">{{ unit.temperature }}°C</div>
            </div>
            <div class="reading">
              <div class="label">Humidity</div>
              <div class="value">{{ unit.humidity }}%</div>
            </div>
            <div class="reading">
              <div class="label">Mode</div>
              <div class="value">{{ unit.mode }}</div>
            </div>
          </div>
          <div class="card-footer">
            <button @click="toggleUnit(index)" class="btn">
              {{ unit.isActive ? 'Turn Off' : 'Turn On' }}
            </button>
            <button @click="openDetails(unit)" class="btn">Details</button>
          </div>
        </div>
      </div>
    </div>
  </main-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import MainLayout from '../../layouts/MainLayout2.vue';

interface HvacUnit {
  id: number;
  name: string;
  temperature: number;
  humidity: number;
  mode: string;
  isActive: boolean;
}

export default defineComponent({
  name: 'HvacIndex',
  components: {
    MainLayout
  },
  setup() {
    const hvacUnits = ref<HvacUnit[]>([
      {
        id: 1,
        name: 'Zone 1 - Office',
        temperature: 23.5,
        humidity: 45,
        mode: 'Cooling',
        isActive: true
      },
      {
        id: 2,
        name: 'Zone 2 - Conference Room',
        temperature: 22.0,
        humidity: 40,
        mode: 'Heating',
        isActive: false
      },
      {
        id: 3,
        name: 'Zone 3 - Lobby',
        temperature: 24.0,
        humidity: 42,
        mode: 'Ventilation',
        isActive: true
      },
    ]);

    const toggleUnit = (index: number) => {
      hvacUnits.value[index].isActive = !hvacUnits.value[index].isActive;
    };

    const openDetails = (unit: HvacUnit) => {
      console.log('Opening details for unit:', unit.id);
      // Implementation for opening details view
    };

    return {
      hvacUnits,
      toggleUnit,
      openDetails
    };
  }
});
</script>

<style scoped>
.hvac-content {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: white;
  overflow: hidden;
}

.card-header {
  padding: 15px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: 15px;
}

.card-footer {
  padding: 15px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  background-color: #f0f0f0;
  color: #666;
}

.status.active {
  background-color: #e6f7e6;
  color: #28a745;
}

.reading {
  margin-bottom: 10px;
}

.label {
  font-size: 0.8rem;
  color: #666;
}

.value {
  font-size: 1.2rem;
  font-weight: bold;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

.btn:hover {
  background-color: #0056b3;
}
</style>
