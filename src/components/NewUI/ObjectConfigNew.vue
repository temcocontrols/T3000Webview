<template>
  <a-drawer title="Basic Drawer" :maskClosable="false" :mask="false" :placement="placement" :open="objectConfigShow"
    @close="onClose">
    <p>Some contents...</p>
    <p>Some contents...</p>
    <p>Some contents...</p>
  </a-drawer>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUpdated, ref } from 'vue';
import { Drawer as ADrawer, Radio as ARadio, RadioGroup as ARadioGroup, Button as AButton } from 'ant-design-vue';
import T3Util from 'src/lib/T3000/Hvac/Util/T3Util';
import { objectConfigShow } from "src/lib/T3000/Hvac/Data/Constant/RefConstant";

type PlacementType = 'top' | 'right' | 'bottom' | 'left';

const placement = ref<PlacementType>('right');

console.log('ObjectConfigNew props', objectConfigShow.value);

const showDrawer = (): void => {
  objectConfigShow.value = true;
};

const onClose = (): void => {
  objectConfigShow.value = false;
};

onMounted(() => {
  T3Util.Log("= V.OCN", "ObjectConfigNew mounted");
});

onBeforeUnmount(() => {
  T3Util.Log("= V.OCN", "ObjectConfigNew is about to unmount");
});

onUpdated(() => {
  T3Util.Log("= V.OCN", "ObjectConfigNew updated");
});
</script>
