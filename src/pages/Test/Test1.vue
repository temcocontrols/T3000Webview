<template>
  <main-layout>
    <Hero/>
    <section class="section">
      <h2>Popular Models</h2>
      <div class="model-list">
        <div v-for="model in popularModels" :key="model.id">
          {{ model.name }}
        </div>
      </div>

      <h2>Featured Studios</h2>
      <div class="studio-list">
        <div v-for="studio in featuredStudios" :key="studio.id">
          {{ studio.name }}
        </div>
      </div>
    </section>
  </main-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MainLayout from '../../layouts/MainLayout2.vue'
import { Model, Studio } from '../../types'
// These imports are commented out in the original code
import Hero from '../../components/NewUI/Hero.vue'

// Define component name
defineOptions({
  name: 'Test1View'
})

const popularModels = ref<Model[]>([
  {
    id: 1,
    name: 'BERT',
    description: '',
    image: 'https://via.placeholder.com/400x200?text=BERT',
    avatar: 'https://via.placeholder.com/40',
    author: 'ModelScope Team',
    category: 'NLP'
  },
  {
    id: 2,
    name: 'YOLOv8',
    description: '',
    image: 'https://via.placeholder.com/400x200?text=YOLOv8',
    avatar: 'https://via.placeholder.com/40',
    author: 'CV Team',
    category: ''
  },
  {
    id: 3,
    name: 'Stable Diffusion',
    description: '',
    image: 'https://via.placeholder.com/400x200?text=StableDiffusion',
    avatar: 'https://via.placeholder.com/40',
    author: 'AI Lab',
    category: ''
  },
  {
    id: 4,
    name: 'GPT-2 ',
    description: ' Transformer ',
    image: 'https://via.placeholder.com/400x200?text=GPT-2',
    avatar: 'https://via.placeholder.com/40',
    author: 'NLP Research',
    category: ''
  }
])

const featuredStudios = ref<Studio[]>([
  {
    id: 1,
    name: '',
    description: '',
    image: 'https://via.placeholder.com/400x200?text=WritingAssistant',
    avatar: 'https://via.placeholder.com/40',
    author: 'AIWriter',
    views: '1.2k',
    likes: 245
  },
  {
    id: 2,
    name: '',
    description: '',
    image: 'https://via.placeholder.com/400x200?text=FaceAnime',
    avatar: 'https://via.placeholder.com/40',
    author: 'AnimeStudio',
    views: '3.5k',
    likes: 720
  },
  {
    id: 3,
    name: '',
    description: '',
    image: 'https://via.placeholder.com/400x200?text=TextToSpeech',
    avatar: 'https://via.placeholder.com/40',
    author: 'VoiceAI',
    views: '2.8k',
    likes: 532
  }
])
</script>

<style scoped>
.hero-section {
  padding: 80px 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.hero-title {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 24px;
  margin-bottom: 16px;
}

.hero-description {
  font-size: 18px;
  color: #555;
  margin-bottom: 32px;
}

.hero-image {
  width: 100%;
  border-radius: 8px;
}

.stats-section {
  padding: 40px 0;
  background: #f7f7f7;
}

.stats-card {
  text-align: center;
}

.stats-number {
  font-size: 36px;
  color: #1890ff;
  margin-bottom: 0;
}

.section {
  padding: 60px 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 28px;
  margin: 0;
}

.view-all {
  color: #1890ff;
}

.card-description {
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-meta {
  display: flex;
  align-items: center;
  margin-top: 16px;
}

.author {
  margin-left: 8px;
  margin-right: auto;
  color: #666;
}

.stats-info {
  display: flex;
  gap: 12px;
}

.author-info {
  display: flex;
  align-items: center;
}

.bg-light {
  background-color: #f7f7f7;
}

.feature-item {
  text-align: center;
  padding: 20px;
}

.feature-icon {
  font-size: 48px;
  color: #1890ff;
  margin-bottom: 16px;
}

.feature-item h3 {
  font-size: 20px;
  margin-bottom: 12px;
}

.features-row {
  margin-top: 40px;
}

.cta-section {
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  color: white;
  text-align: center;
  padding: 80px 0;
}

.cta-section h2 {
  font-size: 32px;
  margin-bottom: 16px;
  color: white;
}

.cta-section p {
  font-size: 18px;
  margin-bottom: 32px;
}
</style>
