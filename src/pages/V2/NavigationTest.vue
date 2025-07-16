<template>
  <div class="navigation-test-page">
    <h2>T3000 Navigation Test</h2>

    <div class="navigation-links">
      <h3>Safe Navigation Links:</h3>

      <div class="link-section">
        <h4>Grafana Demo</h4>
        <button @click="navigateToGrafanaDemo" class="nav-button">
          Go to Grafana Demo
        </button>
        <p class="description">
          Navigate to the Grafana integration demo with proper error handling.
        </p>
      </div>

      <div class="link-section">
        <h4>HVAC Drawer</h4>
        <button @click="navigateToHvacDrawer" class="nav-button">
          Go to HVAC Drawer
        </button>
        <p class="description">
          Navigate to the HVAC drawer page (has Selecto components).
        </p>
      </div>

      <div class="link-section">
        <h4>Main Dashboard</h4>
        <button @click="navigateToMain" class="nav-button">
          Go to Main Dashboard
        </button>
        <p class="description">
          Navigate to the main application dashboard.
        </p>
      </div>

      <div class="link-section">
        <h4>Manual Data Load Test</h4>
        <button @click="testDataLoading" class="nav-button">
          Test Data Loading
        </button>
        <p class="description">
          Manually trigger data loading to test the API and mock data generation.
        </p>
      </div>
    </div>

    <div class="info-section">
      <h3>Navigation Error Prevention</h3>
      <ul>
        <li>This page includes enhanced error handling for Selecto/Gesto navigation issues</li>
        <li>Navigation between pages with different component types is now safer</li>
        <li>Router errors related to component cleanup are handled gracefully</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { onErrorCaptured } from 'vue';

const router = useRouter();

// Enhanced navigation with error handling
const navigateWithErrorHandling = async (path: string) => {
  try {
    console.log(`[NavigationTest] Navigating to: ${path}`);
    await router.push(path);
  } catch (error: any) {
    if (error.message && (error.message.includes('gesto') || error.message.includes('selecto'))) {
      console.warn('[NavigationTest] Selecto navigation error (safely handled):', error.message);
      // Try navigation again after a short delay
      setTimeout(() => {
        router.push(path);
      }, 200);
    } else {
      console.error('[NavigationTest] Navigation error:', error);
    }
  }
};

const navigateToGrafanaDemo = () => {
  navigateWithErrorHandling('/new/grafana-demo');
};

const navigateToHvacDrawer = () => {
  navigateWithErrorHandling('/hvac/t2');
};

const navigateToMain = () => {
  navigateWithErrorHandling('/');
};

const testDataLoading = async () => {
  console.log('[NavigationTest] Testing data loading...');

  // Import and test the T3000 API
  const { t3000Api } = await import('../components/NewUI/chart/api');

  try {
    const testResponse = await t3000Api.getData({
      deviceId: 123,
      timeRange: {
        from: { valueOf: () => Date.now() - 30 * 60 * 1000 }, // 30 minutes ago
        to: { valueOf: () => Date.now() }
      },
      channels: [1, 2, 3, 4, 5] // Test with multiple channels
    });

    console.log('[NavigationTest] Test API response:', testResponse);
  } catch (error) {
    console.error('[NavigationTest] Test API error:', error);
  }
};

// Capture any component errors
onErrorCaptured((error, instance, info) => {
  console.warn('[NavigationTest] Error captured:', error, info);
  return false; // Prevent error propagation
});
</script>

<style scoped>
.navigation-test-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.navigation-links {
  margin: 20px 0;
}

.link-section {
  margin: 20px 0;
  padding: 16px;
  border: 1px solid #e7e7e7;
  border-radius: 4px;
  background: #f8f9fa;
}

.nav-button {
  padding: 12px 24px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 8px 0;
}

.nav-button:hover {
  background: #0d7ae4;
}

.description {
  color: #666;
  font-size: 14px;
  margin: 8px 0;
}

.info-section {
  margin: 30px 0;
  padding: 16px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
}

.info-section ul {
  margin: 16px 0;
}

.info-section li {
  margin: 8px 0;
  color: #1976d2;
}
</style>
