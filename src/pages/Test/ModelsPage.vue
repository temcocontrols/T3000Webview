<template>
  <main-layout>
    <div class="container">
      <h1 class="page-title">AI 模型库</h1>

      <!-- Search and Filters -->
      <div class="filters-container">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="8">
            <a-input-search
              v-model:value="searchQuery"
              placeholder="搜索模型名称、描述或标签"
              enter-button
              allow-clear
              @search="onSearch"
            />
          </a-col>

          <a-col :xs="24" :md="16">
            <div class="filters">
              <a-select
                v-model:value="categoryFilter"
                placeholder="类别"
                style="width: 120px; margin-right: 12px;"
                @change="onFilterChange"
              >
                <a-select-option value="">全部类别</a-select-option>
                <a-select-option value="nlp">自然语言处理</a-select-option>
                <a-select-option value="cv">计算机视觉</a-select-option>
                <a-select-option value="audio">语音技术</a-select-option>
                <a-select-option value="multimodal">多模态</a-select-option>
              </a-select>

              <a-select
                v-model:value="taskFilter"
                placeholder="任务"
                style="width: 140px; margin-right: 12px;"
                @change="onFilterChange"
              >
                <a-select-option value="">全部任务</a-select-option>
                <a-select-option value="classification">分类</a-select-option>
                <a-select-option value="detection">检测</a-select-option>
                <a-select-option value="generation">生成</a-select-option>
                <a-select-option value="segmentation">分割</a-select-option>
              </a-select>

              <a-select
                v-model:value="sortOrder"
                placeholder="排序方式"
                style="width: 120px"
                @change="onFilterChange"
              >
                <a-select-option value="popular">最热门</a-select-option>
                <a-select-option value="newest">最新发布</a-select-option>
                <a-select-option value="name">名称</a-select-option>
              </a-select>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- Active Filters -->
      <div class="active-filters">
        <a-tag v-if="categoryFilter" closable @close="categoryFilter = ''">
          类别: {{ getCategoryLabel(categoryFilter) }}
        </a-tag>

        <a-tag v-if="taskFilter" closable @close="taskFilter = ''">
          任务: {{ getTaskLabel(taskFilter) }}
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
               description="没有找到符合条件的模型" />

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
    name: 'BERT 中文预训练模型',
    description: '基于大规模中文语料训练的语言表示模型，适用于多种 NLP 任务',
    image: 'https://via.placeholder.com/400x200?text=BERT',
    avatar: 'https://via.placeholder.com/40',
    author: 'ModelScope Team',
    category: 'nlp',
    task: 'classification',
    tags: ['NLP', '预训练', '中文'],
    stars: 1245,
    forks: 320
  },
  {
    id: 2,
    name: 'YOLOv8 目标检测',
    description: '最新的 YOLO 系列模型，更快更准确的目标检测，支持多种目标类别',
    image: 'https://via.placeholder.com/400x200?text=YOLOv8',
    avatar: 'https://via.placeholder.com/40',
    author: 'CV Team',
    category: 'cv',
    task: 'detection',
    tags: ['目标检测', 'YOLO', '计算机视觉'],
    stars: 980,
    forks: 215
  },
  {
    id: 3,
    name: 'Stable Diffusion',
    description: '文本到图像的生成模型，可创建高质量艺术图像，支持多种风格和提示词',
    image: 'https://via.placeholder.com/400x200?text=StableDiffusion',
    avatar: 'https://via.placeholder.com/40',
    author: 'AI Lab',
    category: 'cv',
    task: 'generation',
    tags: ['图像生成', '扩散模型', 'AI艺术'],
    stars: 2430,
    forks: 560
  },
  {
    id: 4,
    name: 'GPT-2 中文模型',
    description: '基于 Transformer 的语言生成模型中文版，可用于文章生成、对话等任务',
    image: 'https://via.placeholder.com/400x200?text=GPT-2',
    avatar: 'https://via.placeholder.com/40',
    author: 'NLP Research',
    category: 'nlp',
    task: 'generation',
    tags: ['NLP', '文本生成', 'GPT'],
    stars: 1830,
    forks: 420
  },
  {
    id: 5,
    name: '语音识别模型',
    description: '中文普通话语音识别模型，准确率高，支持实时转录',
    image: 'https://via.placeholder.com/400x200?text=ASR',
    avatar: 'https://via.placeholder.com/40',
    author: 'Speech AI',
    category: 'audio',
    task: 'recognition',
    tags: ['语音识别', '中文', '实时'],
    stars: 756,
    forks: 182
  },
  {
    id: 6,
    name: '人体姿态估计',
    description: '实时人体姿态估计模型，可检测17个关键点，适用于健身、舞蹈等应用',
    image: 'https://via.placeholder.com/400x200?text=PoseEstimation',
    avatar: 'https://via.placeholder.com/40',
    author: 'Vision Research',
    category: 'cv',
    task: 'detection',
    tags: ['姿态估计', '人体检测', '关键点'],
    stars: 1120,
    forks: 245
  },
  {
    id: 7,
    name: '中文情感分析',
    description: '基于BERT的中文文本情感分析模型，可分析正面、负面和中性情感',
    image: 'https://via.placeholder.com/400x200?text=SentimentAnalysis',
    avatar: 'https://via.placeholder.com/40',
    author: 'Text Mining Lab',
    category: 'nlp',
    task: 'classification',
    tags: ['情感分析', '中文', 'BERT'],
    stars: 865,
    forks: 193
  },
  {
    id: 8,
    name: '图像分割模型',
    description: '高精度语义分割模型，支持多种常见场景和物体的精细分割',
    image: 'https://via.placeholder.com/400x200?text=Segmentation',
    avatar: 'https://via.placeholder.com/40',
    author: 'Segmentation Team',
    category: 'cv',
    task: 'segmentation',
    tags: ['语义分割', '计算机视觉', '实例分割'],
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
    'nlp': '自然语言处理',
    'cv': '计算机视觉',
    'audio': '语音技术',
    'multimodal': '多模态'
  }
  return categories[category] || category
}

const getTaskLabel = (task: string): string => {
  const tasks: Record<string, string> = {
    'classification': '分类',
    'detection': '检测',
    'generation': '生成',
    'segmentation': '分割',
    'recognition': '识别'
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
