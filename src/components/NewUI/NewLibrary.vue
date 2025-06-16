<template>
  <div class="library-container">
    <a-row :gutter="[16, 16]">
      <a-col v-for="card in cards" :key="card.id" :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
        <a-card :title="card.title" hoverable>
          <template #cover v-if="card.imageUrl">
            <img alt="card cover" :src="card.imageUrl" />
          </template>
          <a-card-meta :title="card.subtitle" :description="card.description">
            <template #avatar v-if="card.avatarUrl">
              <a-avatar :src="card.avatarUrl" />
            </template>
          </a-card-meta>
          <div class="card-details">
            <div v-if="card.tags && card.tags.length" class="card-tags">
              <a-tag v-for="(tag, index) in card.tags" :key="index" :color="tag.color">
                {{ tag.name }}
              </a-tag>
            </div>
            <a-button type="primary" @click="viewDetails(card.id)">View Details</a-button>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { message } from 'ant-design-vue';

// TypeScript interface for our card data structure
interface Tag {
  name: string;
  color?: string;
}

interface CardItem {
  id: number | string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  avatarUrl?: string;
  tags?: Tag[];
}

// Sample data
const cards = ref<CardItem[]>([
  {
    id: 1,
    title: "Project Alpha",
    subtitle: "Web Application",
    description: "A comprehensive web application for business management",
    imageUrl: "https://via.placeholder.com/300x200",
    avatarUrl: "https://joeschmoe.io/api/v1/random",
    tags: [
      { name: "Vue", color: "green" },
      { name: "TypeScript", color: "blue" }
    ]
  },
  {
    id: 2,
    title: "Project Beta",
    subtitle: "Mobile App",
    description: "A cross-platform mobile application built with React Native",
    imageUrl: "https://via.placeholder.com/300x200",
    avatarUrl: "https://joeschmoe.io/api/v1/random",
    tags: [
      { name: "React", color: "cyan" },
      { name: "Mobile", color: "orange" }
    ]
  },
  {
    id: 3,
    title: "Project Gamma",
    subtitle: "Backend Service",
    description: "Scalable backend service using Node.js and MongoDB",
    imageUrl: "https://via.placeholder.com/300x200",
    avatarUrl: "https://joeschmoe.io/api/v1/random",
    tags: [
      { name: "Node.js", color: "green" },
      { name: "MongoDB", color: "purple" }
    ]
  },
  {
    id: 4,
    title: "Project Delta",
    subtitle: "Data Visualization",
    description: "Interactive dashboards and data visualizations",
    imageUrl: "https://via.placeholder.com/300x200",
    avatarUrl: "https://joeschmoe.io/api/v1/random",
    tags: [
      { name: "D3.js", color: "magenta" },
      { name: "Analytics", color: "blue" }
    ]
  }
]);

// View details method
const viewDetails = (id: number | string) => {
  message.info(`Viewing details for card ${id}`);
  // You could implement router navigation here
  // router.push(`/details/${id}`);
};
</script>

<style scoped>
.library-container {
  padding: 24px;
}

.card-details {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
