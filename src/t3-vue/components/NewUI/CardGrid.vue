<template>
  <div class="card-grid-section">
    <div class="section-header">
      <h2>Popular Studios</h2>
      <a-input-search
        v-model:value="searchValue"
        placeholder="Search studios"
        style="width: 300px"
        @search="onSearch"
      />
    </div>
    
    <div class="filters">
      <a-select
        v-model:value="selectedCategory"
        style="width: 150px"
        placeholder="Category"
      >
        <a-select-option value="all">All Categories</a-select-option>
        <a-select-option value="nlp">NLP</a-select-option>
        <a-select-option value="cv">Computer Vision</a-select-option>
        <a-select-option value="audio">Audio Processing</a-select-option>
      </a-select>
      
      <a-select
        v-model:value="selectedSort"
        style="width: 150px; margin-left: 16px"
        placeholder="Sort By"
      >
        <a-select-option value="popular">Most Popular</a-select-option>
        <a-select-option value="recent">Most Recent</a-select-option>
        <a-select-option value="name">Name A-Z</a-select-option>
      </a-select>
    </div>
    
    <a-row :gutter="[24, 24]" class="card-grid">
      <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="(card, index) in cards" :key="index">
        <a-card hoverable>
          <template #cover>
            <img :src="card.image" :alt="card.title" />
          </template>
          <a-card-meta :title="card.title">
            <template #description>
              <div class="card-description">
                <p>{{ card.description }}</p>
                <div class="card-footer">
                  <a-avatar :src="card.avatar" />
                  <span>{{ card.author }}</span>
                  <a-tag color="blue">{{ card.category }}</a-tag>
                </div>
              </div>
            </template>
          </a-card-meta>
        </a-card>
      </a-col>
    </a-row>
    
    <div class="pagination">
      <a-pagination
        v-model:current="currentPage"
        :total="100"
        show-size-changer
        :page-size="pageSize"
        @change="onPageChange"
      />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  setup() {
    const searchValue = ref('')
    const selectedCategory = ref('all')
    const selectedSort = ref('popular')
    const currentPage = ref(1)
    const pageSize = ref(12)
    
    // This would come from an API in a real application
    const cards = ref([
      {
        title: 'Image Generation Studio',
        description: 'Create stunning images using AI models with one click',
        image: 'https://via.placeholder.com/300x200',
        avatar: 'https://via.placeholder.com/40',
        author: 'AI Team',
        category: 'CV'
      },
      {
        title: 'Text Summarization',
        description: 'Automatically generate summaries from long documents',
        image: 'https://via.placeholder.com/300x200',
        avatar: 'https://via.placeholder.com/40',
        author: 'NLP Group',
        category: 'NLP'
      },
      // Add more cards as needed
    ])
    
    const onSearch = (value) => {
      console.log('Search:', value)
      // Implement search logic
    }
    
    const onPageChange = (page, pageSize) => {
      console.log('Page:', page, 'Size:', pageSize)
      // Implement pagination logic
    }
    
    return {
      searchValue,
      selectedCategory,
      selectedSort,
      currentPage,
      pageSize,
      cards,
      onSearch,
      onPageChange
    }
  }
}
</script>

<style scoped>
.card-grid-section {
  padding: 50px;
  background: #f5f5f5;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 32px;
  margin: 0;
}

.filters {
  margin-bottom: 24px;
}

.card-grid {
  margin-top: 24px;
}

.card-description p {
  margin-bottom: 12px;
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination {
  margin-top: 40px;
  text-align: center;
}
</style>