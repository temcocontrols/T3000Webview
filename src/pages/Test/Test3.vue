<template>
  <main-layout>
    <div class="container">
      <h1 class="page-title">AI Model</h1>

      <!-- Search and Filters -->
      <div class="filters-container">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="8">
            <a-input-search
              v-model:value="searchQuery"
              placeholder="Model"
              enter-button
              allow-clear
              @search="onSearch"
            />
          </a-col>

          <a-col :xs="24" :md="16">
            <div class="filters">
              <a-select
                v-model:value="categoryFilter"
                placeholder="Model"
                style="width: 120px; margin-right: 12px;"
                @change="onFilterChange"
              >
                <a-select-option value="">Model</a-select-option>
                <a-select-option value="nlp">Model</a-select-option>
                <a-select-option value="cv">Model</a-select-option>
                <a-select-option value="audio">Model</a-select-option>
                <a-select-option value="multimodal">Model</a-select-option>
              </a-select>

              <a-select
                v-model:value="taskFilter"
                placeholder="Test Data"
                style="width: 140px; margin-right: 12px;"
                @change="onFilterChange"
              >
                <a-select-option value="">Test Data</a-select-option>
                <a-select-option value="classification">Test Data</a-select-option>
                <a-select-option value="detection">Test Data</a-select-option>
                <a-select-option value="generation">Test Data</a-select-option>
                <a-select-option value="segmentation">Test Data</a-select-option>
              </a-select>

              <a-select
                v-model:value="sortOrder"
                placeholder="Test Data"
                style="width: 120px"
                @change="onFilterChange"
              >
                <a-select-option value="popular">Test Data</a-select-option>
                <a-select-option value="newest">Test Data</a-select-option>
                <a-select-option value="name">Test Data</a-select-option>
              </a-select>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- Active Filters -->
      <div class="active-filters">
        <a-tag v-if="categoryFilter" closable @close="categoryFilter = ''">
          Test Data: {{ getCategoryLabel(categoryFilter) }}
        </a-tag>

        <a-tag v-if="taskFilter" closable @close="taskFilter = ''">
          Test Data: {{ getTaskLabel(taskFilter) }}
        </a-tag>
      </div>

      <!-- Models Grid -->
      <a-row :gutter="[16, 16]">
        <a-col v-for="model in filteredModels" :key="model.id"
               :xs="24" :sm="12" :md="8" :lg="6">
          <a-card hoverable class="model-card">
            <template #cover>
              <img :alt="model.name" :src="model.image" />
            </template>
            <a-card-meta :title="model.name">
              <template #description>
                <div>
                  <p class="card-description">{{ model.description }}</p>
                  <div class="tags-container">
                    <a-tag v-for="tag in model.tags" :key="tag">{{ tag }}</a-tag>
                  </div>
                  <div class="card-meta">
                    <a-avatar :src="model.avatar" size="small" />
                    <span class="author">{{ model.author }}</span>
                    <div class="stats">
                      <span><star-outlined /> {{ model.stars }}</span>
                      <span><fork-outlined /> {{ model.forks }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </a-card-meta>
          </a-card>
        </a-col>
      </a-row>

      <!-- Empty State -->
      <a-empty v-if="filteredModels.length === 0"
               description="Test Data" />

      <!-- Pagination -->
      <div class="pagination">
        <a-pagination
          v-model:current="currentPage"
          :total="100"
          :show-size-changer="true"
          :page-size="pageSize"
          :page-size-options="['12', '24', '36', '48']"
          @change="onPageChange"
          @showSizeChange="onPageSizeChange"
        />
      </div>
    </div>
  </main-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MainLayout from '../../layouts/MainLayout2.vue'
import { Model } from '../../types'
import { StarOutlined, ForkOutlined } from '@ant-design/icons-vue'

const searchQuery = ref('')
const categoryFilter = ref('')
const taskFilter = ref('')
const sortOrder = ref('popular')
const currentPage = ref(1)
const pageSize = ref(12)

// Mock data for models
const allModels = ref<Model[]>([
  {
    id: 1,
    name: 'BERT Test Data',
    description: 'Test Data',
    image: 'https://via.placeholder.com/400x200?text=BERT',
    avatar: 'https://via.placeholder.com/40',
    author: 'ModelScope Team',
    category: 'nlp',
    task: 'classification',
    tags: ['NLP', 'Test Data', 'Test Data'],
    stars: 1245,
    forks: 320
  },
  {
    id: 2,
    name: 'YOLOv8 Test Data',
    description: 'Test Data YOLO Test Data',
    image: 'https://via.placeholder.com/400x200?text=YOLOv8',
    avatar: 'https://via.placeholder.com/40',
    author: 'CV Team',
    category: 'cv',
    task: 'detection',
    tags: ['Test Data', 'YOLO', 'Test Data'],
    stars: 980,
    forks: 215
  },
  {
    id: 3,
    name: 'Stable Diffusion',
    description: 'Test Data',
    image: 'https://via.placeholder.com/400x200?text=StableDiffusion',
    avatar: 'https://via.placeholder.com/40',
    author: 'AI Lab',
    category: 'cv',
    task: 'generation',
    tags: ['Test Data', 'Test Data', 'Test Data'],
    stars: 2430,
    forks: 560
  },
  {
    id: 4,
    name: 'GPT-2 Test Data',
    description: 'Test Data Transformer Test Data',
    image: 'https://via.placeholder.com/400x200?text=GPT-2',
    avatar: 'https://via.placeholder.com/40',
    author: 'NLP Research',
    category: 'nlp',
    task: 'generation',
    tags: ['NLP', 'Test Data', 'GPT'],
    stars: 1830,
    forks: 420
  },
  {
    id: 5,
    name: 'Test Data',
    description: 'Test Data',
    image: 'https://via.placeholder.com/400x200?text=ASR',
    avatar: 'https://via.placeholder.com/40',
    author: 'Speech AI',
    category: 'audio',
    task: 'recognition',
    tags: ['Test Data', 'Test Data', 'Test Data'],
    stars: 756,
    forks: 182
  },
  {
    id: 6,
    name: 'Test Data',
    description: 'Test Data',
    image: 'https://via.placeholder.com/400x200?text=PoseEstimation',
    avatar: 'https://via.placeholder.com/40',
    author: 'Vision Research',
    category: 'cv',
    task: 'detection',
    tags: ['Test Data', 'Test Data', 'Test Data'],
    stars: 1120,
    forks: 245
  },
  {
    id: 7,
    name: 'Test Data',
    description: 'Test Data',
    image: 'https://via.placeholder.com/400x200?text=SentimentAnalysis',
    avatar: 'https://via.placeholder.com/40',
    author: 'Text Mining Lab',
    category: 'nlp',
    task: 'classification',
    tags: ['Test Data', 'Test Data', 'BERT'],
    stars: 865,
    forks: 193
  },
  {
    id: 8,
    name: 'Test Data',
    description: 'Test Data',
    image: 'https://via.placeholder.com/400x200?text=Segmentation',
    avatar: 'https://via.placeholder.com/40',
    author: 'Segmentation Team',
    category: 'cv',
    task: 'segmentation',
    tags: ['Test Data', 'Test Data', 'Test Data'],
    stars: 732,
    forks: 168
  }
])

// Filter models based on search and filters
const filteredModels = computed(() => {
  let result = allModels.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(model =>
      model.name.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query) ||
      model.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }

  if (categoryFilter.value) {
    result = result.filter(model => model.category === categoryFilter.value)
  }

  if (taskFilter.value) {
    result = result.filter(model => model.task === taskFilter.value)
  }

  // Sort models
  if (sortOrder.value === 'popular') {
    result = [...result].sort((a, b) => (b.stars || 0) - (a.stars || 0))
  } else if (sortOrder.value === 'newest') {
    // In a real app, we'd sort by date, here we'll just use ID as a proxy
    result = [...result].sort((a, b) => b.id - a.id)
  } else if (sortOrder.value === 'name') {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name))
  }

  return result
})

// Helper functions
const onSearch = (value: string) => {
  searchQuery.value = value
  currentPage.value = 1
}

const onFilterChange = () => {
  currentPage.value = 1 // Reset to first page when filters change
}

const onPageChange = (page: number) => {
  currentPage.value = page
  // In a real app, would fetch data for the new page
}

const onPageSizeChange = (current: number, size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const getCategoryLabel = (category: string): string => {
  const categories: Record<string, string> = {
    'nlp': 'Test Data',
    'cv': 'Test Data',
    'audio': 'Test Data',
    'multimodal': 'Test Data'
  }
  return categories[category] || category
}

const getTaskLabel = (task: string): string => {
  const tasks: Record<string, string> = {
    'classification': 'Test Data',
    'detection': 'Test Data',
    'generation': 'Test Data',
    'segmentation': 'Test Data',
    'recognition': 'Test Data'
  }
  return tasks[task] || task
}
</script>

<style scoped>
.page-title {
  font-size: 28px;
  margin-bottom: 24px;
}

.filters-container {
  margin-bottom: 16px;
}

.filters {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .filters {
    justify-content: flex-start;
    margin-top: 12px;
  }

  .filters > * {
    margin-bottom: 8px;
  }
}

.active-filters {
  margin: 16px 0;
}

.model-card {
  height: 100%;
}

.card-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 12px;
}

.tags-container {
  margin: 12px 0;
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

.stats {
  display: flex;
  gap: 12px;
}

.pagination {
  margin-top: 32px;
  text-align: center;
}
</style>
