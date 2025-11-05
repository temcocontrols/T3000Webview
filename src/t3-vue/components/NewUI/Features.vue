<template>
  <div class="features-section">
    <h2>Why Choose Our Platform</h2>
    <p class="subtitle">Everything you need to build and deploy AI models</p>

    <a-row :gutter="[48, 48]" class="feature-row">
      <a-col :xs="24" :sm="12" :md="8" v-for="(feature, index) in features" :key="index">
        <div class="feature-card">
          <div class="feature-icon">
            <component :is="feature.icon" />
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import {
  CloudOutlined,
  RocketOutlined,
  TeamOutlined,
  ApiOutlined,
  SafetyOutlined,
  BarChartOutlined
} from '@ant-design/icons-vue'

export default {
  name:'FeaturesView',
  components: {
    CloudOutlined,
    RocketOutlined,
    TeamOutlined,
    ApiOutlined,
    SafetyOutlined,
    BarChartOutlined
  },
  setup() {
    const features = [
      {
        icon: 'CloudOutlined',
        title: 'Cloud Infrastructure',
        description: 'Run your models on our powerful cloud infrastructure without worrying about setup'
      },
      {
        icon: 'RocketOutlined',
        title: 'One-Click Deployment',
        description: 'Deploy your models instantly with a single click'
      },
      {
        icon: 'TeamOutlined',
        title: 'Collaboration',
        description: 'Work together with your team on projects in real-time'
      },
      {
        icon: 'ApiOutlined',
        title: 'API Integration',
        description: 'Connect your models to applications with our simple API'
      },
      {
        icon: 'SafetyOutlined',
        title: 'Security',
        description: 'Enterprise-grade security to protect your models and data'
      },
      {
        icon: 'BarChartOutlined',
        title: 'Analytics',
        description: 'Track usage and performance with detailed analytics'
      }
    ]

    return { features }
  }
}
</script>

<style scoped>
.features-section {
  padding: 80px 50px;
  background: #fff;
  text-align: center;
}

.features-section h2 {
  font-size: 36px;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 18px;
  color: #666;
  margin-bottom: 60px;
}

.feature-row {
  margin-top: 40px;
}

.feature-card {
  padding: 24px;
  height: 100%;
  transition: all 0.3s;
}

.feature-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 36px;
  color: #1890ff;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  margin-bottom: 12px;
}

.feature-card p {
  color: #666;
}
</style>
