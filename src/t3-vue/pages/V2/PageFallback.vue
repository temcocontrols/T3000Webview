<template>
  <q-page class="page-fallback">
    <div class="fallback-container">
      <div class="fallback-header">
        <q-icon name="warning" size="64px" color="warning" />
        <h3 class="fallback-title">Page Unavailable</h3>
      </div>

      <div class="fallback-content">
        <p class="fallback-message">
          We're having trouble loading this page right now. This could be due to:
        </p>

        <ul class="issue-list">
          <li>Network connectivity issues</li>
          <li>Server maintenance</li>
          <li>Temporary loading problems</li>
        </ul>

        <div class="fallback-actions">
          <q-btn
            @click="retryPage"
            color="primary"
            icon="refresh"
            size="lg"
            class="q-ma-sm"
          >
            Try Again
          </q-btn>

          <q-btn
            @click="goHome"
            color="secondary"
            icon="home"
            size="lg"
            outline
            class="q-ma-sm"
          >
            Go to Home
          </q-btn>

          <q-btn
            @click="reloadApp"
            color="warning"
            icon="refresh"
            size="lg"
            outline
            class="q-ma-sm"
          >
            Reload App
          </q-btn>
        </div>

        <div class="help-section">
          <q-expansion-item
            icon="help"
            label="Need Help?"
            class="q-mt-lg"
          >
            <div class="help-content">
              <p><strong>Still having issues?</strong></p>
              <ul>
                <li>Check your internet connection</li>
                <li>Try refreshing your browser</li>
                <li>Clear your browser cache</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </q-expansion-item>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const retryPage = () => {
  // Force reload the current route
  router.go(0);
};

const goHome = () => {
  router.push('/');
};

const reloadApp = () => {
  window.location.reload();
};
</script>

<style scoped>
.page-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.fallback-container {
  max-width: 500px;
  text-align: center;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid #dee2e6;
}

.fallback-header {
  margin-bottom: 32px;
}

.fallback-title {
  color: #495057;
  margin: 16px 0 0 0;
  font-size: 28px;
  font-weight: 600;
}

.fallback-content {
  text-align: left;
}

.fallback-message {
  color: #6c757d;
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.issue-list {
  color: #6c757d;
  margin: 16px 0 32px 20px;
  line-height: 1.6;
}

.issue-list li {
  margin-bottom: 8px;
}

.fallback-actions {
  text-align: center;
  margin: 32px 0;
}

.help-section {
  margin-top: 32px;
}

.help-content {
  padding: 16px;
  text-align: left;
}

.help-content ul {
  margin: 12px 0 0 20px;
}

.help-content li {
  margin-bottom: 8px;
  color: #6c757d;
}

/* Responsive design */
@media (max-width: 600px) {
  .fallback-container {
    margin: 16px;
    padding: 24px;
  }

  .fallback-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fallback-actions .q-btn {
    width: 100%;
  }
}
</style>
