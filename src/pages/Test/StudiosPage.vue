<template>
  <main-layout>
    <div class="container">
      <!-- <h1 class="page-title">AI 创空间</h1> -->

      <!-- Hero Banner -->


      <!-- Search and Filters -->
      <div class="filters-container">
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :md="8">
            <a-input-search
              v-model:value="searchQuery"
              placeholder="搜索创空间应用"
              enter-button
              allow-clear
              @search="onSearch"
            />
          </a-col>

          <a-col :xs="24" :md="16">
            <div class="filters">
              <a-select
                v-model:value="categoryFilter"
                placeholder="应用类别"
                style="width: 120px; margin-right: 12px;"
                @change="onFilterChange"
              >
                <a-select-option value="">全部类别</a-select-option>
                <a-select-option value="image">图像处理</a-select-option>
                <a-select-option value="text">文本生成</a-select-option>
                <a-select-option value="audio">音频处理</a-select-option>
                <a-select-option value="interactive">交互演示</a-select-option>
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

      <!-- Studios Grid -->
      <a-row :gutter="[16, 16]">
        <a-col v-for="studio in filteredStudios" :key="studio.id"
               :xs="24" :sm="12" :md="8">
          <a-card hoverable class="studio-card">
            <template #cover>
              <img :alt="studio.name" :src="studio.image" />
            </template>
            <a-card-meta :title="studio.name">
              <template #description>
                <div>
                  <p class="card-description">{{ studio.description }}</p>
                  <div class="tags-container">
                    <a-tag v-for="tag in studio.tags" :key="tag">{{ tag }}</a-tag>
                  </div>
                  <div class="card-meta">
                    <div class="author-info">
                      <a-avatar :src="studio.avatar" size="small" />
                      <span class="author">{{ studio.author }}</span>
                    </div>
                    <div class="stats">
                      <span><eye-outlined /> {{ studio.views }}</span>
                      <span><like-outlined /> {{ studio.likes }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </a-card-meta>
            <template #actions>
              <a-button type="link">查看应用</a-button>
            </template>
          </a-card>
        </a-col>
      </a-row>

      <!-- Empty State -->
      <a-empty v-if="filteredStudios.length === 0"
               description="没有找到符合条件的创空间" />

      <!-- Pagination -->
      <div class="pagination">
        <a-pagination
          v-model:current="currentPage"
          :total="60"
          :show-size-changer="true"
          :page-size="pageSize"
          :page-size-options="['9', '18', '27', '36']"
          @change="onPageChange"
          @showSizeChange="onPageSizeChange"
        />
      </div>

      <!-- Featured Collections -->
      <div class="collections-section">
        <h2>精选合集</h2>

        <a-row :gutter="[16, 16]">
          <a-col v-for="collection in featuredCollections" :key="collection.id"
                 :xs="24" :sm="12" :lg="8">
            <a-card hoverable class="collection-card">
              <div class="collection-cover">
                <img :src="collection.image" :alt="collection.name" />
                <div class="collection-overlay">
                  <h3>{{ collection.name }}</h3>
                  <p>{{ collection.count }} 个应用</p>
                </div>
              </div>
              <a-card-meta>
                <template #description>
                  <p>{{ collection.description }}</p>
                </template>
              </a-card-meta>
            </a-card>
          </a-col>
        </a-row>
      </div>
    </div>
  </main-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import MainLayout from '../../layouts/MainLayout2.vue'
import { Studio, Collection } from '../../types'
import { EyeOutlined, LikeOutlined } from '@ant-design/icons-vue'

const searchQuery = ref('')
const categoryFilter = ref('')
const sortOrder = ref('popular')
const currentPage = ref(1)
const pageSize = ref(9)

// Mock data for studios
const allStudios = ref<Studio[]>([
  {
    id: 1,
    name: '图像风格迁移',
    description: '将照片转换为不同艺术风格的图像，包括梵高、莫奈等多种风格',
    image: 'https://via.placeholder.com/500x300?text=StyleTransfer',
    avatar: 'https://via.placeholder.com/40',
    author: 'ArtAI Studio',
    category: 'image',
    tags: ['图像处理', '风格迁移', 'AI艺术'],
    views: '5.2k',
    likes: 943
  },
  {
    id: 2,
    name: '智能写作助手',
    description: '基于GPT模型的中文写作助手，可以生成文章、改写文本、润色内容',
    image: 'https://via.placeholder.com/500x300?text=WritingAssistant',
    avatar: 'https://via.placeholder.com/40',
    author: 'NLP Workshop',
    category: 'text',
    tags: ['文本生成', '写作辅助', 'GPT'],
    views: '8.7k',
    likes: 1532
  },
  {
    id: 3,
    name: '人脸动漫化',
    description: '将真实人脸照片转换为动漫风格的肖像，支持多种动漫风格',
    image: 'https://via.placeholder.com/500x300?text=AnimeGAN',
    avatar: 'https://via.placeholder.com/40',
    author: 'AnimeFace',
    category: 'image',
    tags: ['人脸编辑', '动漫风格', 'GAN'],
    views: '12.3k',
    likes: 2845
  },
  {
    id: 4,
    name: '语音克隆工具',
    description: '只需少量音频样本，即可克隆任何声音，生成自然流畅的语音',
    image: 'https://via.placeholder.com/500x300?text=VoiceClone',
    avatar: 'https://via.placeholder.com/40',
    author: 'Voice Lab',
    category: 'audio',
    tags: ['语音合成', '声音克隆', 'TTS'],
    views: '4.5k',
    likes: 876
  },
  {
    id: 5,
    name: '视频人物抠图',
    description: '自动识别视频中的人物，去除背景，可用于视频合成和特效制作',
    image: 'https://via.placeholder.com/500x300?text=VideoMatting',
    avatar: 'https://via.placeholder.com/40',
    author: 'VideoTech',
    category: 'image',
    tags: ['视频处理', '抠图', '人物分割'],
    views: '3.8k',
    likes: 645
  },
  {
    id: 6,
    name: '问答机器人生成器',
    description: '快速构建专属知识库的智能问答机器人，无需编程',
    image: 'https://via.placeholder.com/500x300?text=ChatbotBuilder',
    avatar: 'https://via.placeholder.com/40',
    author: 'AI Assistant',
    category: 'interactive',
    tags: ['聊天机器人', '问答系统', 'RAG'],
    views: '7.2k',
    likes: 1234
  },
  {
    id: 7,
    name: '图片修复增强',
    description: '自动修复和增强老照片，去除划痕、噪点，提升画质和清晰度',
    image: 'https://via.placeholder.com/500x300?text=PhotoRestoration',
    avatar: 'https://via.placeholder.com/40',
    author: 'Photo Labs',
    category: 'image',
    tags: ['图像修复', '超分辨率', '老照片修复'],
    views: '6.3k',
    likes: 1105
  },
  {
    id: 8,
    name: '音频降噪工具',
    description: '智能识别并去除音频中的背景噪音、杂音，提升声音质量',
    image: 'https://via.placeholder.com/500x300?text=AudioDenoise',
    avatar: 'https://via.placeholder.com/40',
    author: 'Audio Engineer',
    category: 'audio',
    tags: ['音频处理', '降噪', '声音增强'],
    views: '2.9k',
    likes: 534
  },
  {
    id: 9,
    name: '3D 人物生成器',
    description: '通过文本描述或图片生成 3D 人物模型，可用于游戏和虚拟现实',
    image: 'https://via.placeholder.com/500x300?text=3DCharacterGen',
    avatar: 'https://via.placeholder.com/40',
    author: '3D Creator',
    category: 'interactive',
    tags: ['3D建模', '人物生成', '游戏资源'],
    views: '5.7k',
    likes: 982
  }
])

const featuredCollections = ref<Collection[]>([
  {
    id: 1,
    name: '创意图像工具集',
    description: '精选图像处理和创作工具，帮助您释放创意潜能',
    image: 'https://via.placeholder.com/600x300?text=CreativeImageTools',
    count: 12
  },
  {
    id: 2,
    name: '内容创作助手',
    description: '提升写作和内容创作效率的智能工具合集',
    image: 'https://via.placeholder.com/600x300?text=ContentCreation',
    count: 8
  },
  {
    id: 3,
    name: '多媒体处理工具箱',
    description: '音视频处理和编辑的全能工具集',
    image: 'https://via.placeholder.com/600x300?text=MultimediaTools',
    count: 10
  }
])

// Filter studios based on search and filters
const filteredStudios = computed(() => {
  let result = allStudios.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(studio =>
      studio.name.toLowerCase().includes(query) ||
      studio.description.toLowerCase().includes(query) ||
      studio.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }

  if (categoryFilter.value) {
    result = result.filter(studio => studio.category === categoryFilter.value)
  }

  // Sort studios
  if (sortOrder.value === 'popular') {
    result = [...result].sort((a, b) => (b.likes || 0) - (a.likes || 0))
  } else if (sortOrder.value === 'newest') {
    // In a real app, we'd sort by date
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
</script>

<style scoped>
.page-title {
  font-size: 28px;
  margin-bottom: 24px;
}

.studios-banner {
  margin-bottom: 32px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  margin-bottom: 32px;
  overflow: hidden;
}

.studios-banner h2 {
  font-size: 28px;
  color: white;
  margin-bottom: 16px;
}

.studios-banner p {
  font-size: 16px;
  margin-bottom: 24px;
  color: rgba(255, 255, 255, 0.8);
}

.banner-image {
  width: 100%;
  max-height: 240px;
  object-fit: contain;
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

.studio-card {
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
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.author-info {
  display: flex;
  align-items: center;
}

.author {
  margin-left: 8px;
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

.collections-section {
  margin-top: 60px;
  margin-bottom: 32px;
}

.collections-section h2 {
  font-size: 24px;
  margin-bottom: 24px;
}

.collection-card {
  height: 100%;
}

.collection-cover {
  position: relative;
  height: 160px;
  overflow: hidden;
}

.collection-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.collection-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0));
  color: white;
}

.collection-overlay h3 {
  margin: 0;
  font-size: 18px;
  color: white;
}

.collection-overlay p {
  margin: 4px 0 0;
  font-size: 14px;
  opacity: 0.8;
}

.collection-card:hover .collection-cover img {
  transform: scale(1.05);
}
</style>
