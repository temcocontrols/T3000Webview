<template>
  <teleport to="body">
    <a-menu v-if="visible" class="t3-context-menu" :style="menuStyle" v-bind="$attrs" @click="handleMenuClick">
      <slot></slot>
    </a-menu>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { Menu } from 'ant-design-vue';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
}

const props = withDefaults(defineProps<ContextMenuProps>(), {
  visible: true,
  x: 0,
  y: 0
});

const emit = defineEmits(['update:visible', 'click']);

const menuRef = ref<HTMLElement | null>(null);
const adjustedPosition = ref({ x: props.x, y: props.y });

const menuStyle = computed(() => ({
  position: 'fixed',
  left: `${adjustedPosition.value.x}px`,
  top: `${adjustedPosition.value.y}px`,
  zIndex: 1001
}));

const handleMenuClick = (event: any) => {
  emit('click', event);
  emit('update:visible', false);
};

const handleClickOutside = (event: MouseEvent) => {
  if (props.visible) {
    emit('update:visible', false);
  }
};

const adjustPosition = () => {
  if (!menuRef.value) return;

  setTimeout(() => {
    const menu = document.querySelector('.t3-context-menu');
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let { x, y } = props;

    if (x + rect.width > windowWidth) {
      x = windowWidth - rect.width - 5;
    }

    if (y + rect.height > windowHeight) {
      y = windowHeight - rect.height - 5;
    }

    adjustedPosition.value = { x, y };
  });
};

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    adjustPosition();
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });
  } else {
    document.removeEventListener('mousedown', handleClickOutside);
  }
});

watch(() => [props.x, props.y], () => {
  adjustedPosition.value = { x: props.x, y: props.y };
  if (props.visible) {
    adjustPosition();
  }
});

onMounted(() => {
  if (props.visible) {
    document.addEventListener('mousedown', handleClickOutside);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.t3-context-menu {
  min-width: 160px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
}
</style>
