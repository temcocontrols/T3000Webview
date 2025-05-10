<template>
  <a-alert message="Warning Text Warning Text Warning TextW arning Text Warning Text Warning TextWarning Text"
    type="warning" closable @close="onClose" v-if="globalMsgShow" />
  <!-- <a-alert message="Error Text"
    description="Error Description Error Description Error Description Error Description Error Description Error Description"
    type="error" closable @close="onClose" /> -->
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { Alert as AAlert } from 'ant-design-vue';
import { globalMsgShow } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';

const onClose = (e: MouseEvent) => {
  console.log(e, 'I was closed.');
  globalMsgShow.value = false;
};
</script>
