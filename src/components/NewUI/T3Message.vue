<template>
  <div>
    <a-alert :message="commonMsg" type="error" show-icon closable @close="onClose" v-if="globalMsgShow" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { Alert as AAlert } from 'ant-design-vue';
import { globalMsgShow } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import { globalMsg } from "src/lib/T3000/Hvac/Data/T3Data";
import { commonMsg } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import AntdUtil from 'src/lib/T3000/Hvac/Opt/UI/AntdUtil';

const onClose = (e: MouseEvent) => {
  AntdUtil.CloseGlobalMsg();
};

</script>
