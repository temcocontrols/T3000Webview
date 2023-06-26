<template>
  <svg
    v-if="switchIcon"
    xmlns="http://www.w3.org/2000/svg"
    height="100%"
    viewBox="0 0 24 24"
    width="100%"
    :class="{ active: active }"
    class="icon-svg"
  >
    <use class="icon" :xlink:href="`icons.svg#${switchIcon}`"></use>
  </svg>
</template>

<script>
import { switchIcons } from "src/lib/common";
import { computed, defineComponent } from "vue";

export default defineComponent({
  name: "IconSwitch",
  props: {
    item: {
      type: Object,
    },
    active: {
      type: Boolean,
      default: false,
    },
    offColor: {
      type: String,
      default: "#940303",
    },
    onColor: {
      type: String,
      default: "#940303",
    },
    icon: {
      type: String,
      default: "toggle_off",
    },
    textAlign: {
      type: String,
      default: "left",
    },
  },
  setup(props) {
    const switchIcon = computed(() => {
      const item = switchIcons.find((i) => i.value === props.icon);
      if (!item) return {};
      return props.active ? item.icon.on : item.icon.off;
    });
    return { switchIcon };
  },
});
</script>

<style scoped>
.icon-svg {
  padding: 5px;
}
.icon-svg .icon {
  fill: v-bind(offColor);
}

.active.icon-svg .icon {
  fill: v-bind(onColor);
}
</style>
