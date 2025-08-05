<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
      colorBgBase: '#ffffff',
      colorText: '#000000',
      colorBorder: '#d9d9d9',
    },
  }">
    <a-modal v-model:visible="trendLogModalVisible" :title="null" :width="1400" :footer="null"
      style="border-radius: 0px; top: 5px;" wrapClassName="t3-timeseries-modal" @cancel="handleCancel" centered>
      <TrendLogChart :itemData="itemData" :title="modalTitle" />
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TrendLogChart from './TrendLogChart.vue'

// Props interface
interface Props {
  visible?: boolean
  itemData?: any
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  itemData: null
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// Reactive state
const trendLogModalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const modalTitle = computed(() => {
  return props.itemData?.t3Entry?.description ||
    props.itemData?.t3Entry?.label ||
    props.itemData?.title ||
    'Trend Log Chart'
})

// Event handlers
const handleCancel = () => {
  trendLogModalVisible.value = false
}
</script>

<style>
/* Modal body styling to remove padding and set height */
:deep(.t3-timeseries-modal .ant-modal-body) {
  padding: 0 !important;
  height: calc(85vh - 40px) !important;
  min-height: 600px !important;
}
</style>
