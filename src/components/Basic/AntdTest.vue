
<template>
  <div class="antd-test-container">
    <a-button type="primary" @click="handleClick">{{ buttonText }}</a-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Button as AButton } from 'ant-design-vue';

// Define reactive data
const buttonText = ref('Antd Button');
const clickCount = ref(0);

// Define methods
const handleClick = () => {
  clickCount.value++;
  console.log(`Button clicked ${clickCount.value} times`);
};
</script>

<style scoped>
.antd-test-container {
  padding: 20px;
  display: flex;
  justify-content: center;
}
</style>
