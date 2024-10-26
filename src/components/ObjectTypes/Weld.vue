<template>
  <div class="weld-element">
    <a>this is a weld element</a>
    <br />
    {{ propsData.settings.active }}{{ propsData.settings.inAlarm
    }}{{ propsData.settings.fillColor }}
    <span
      >id:{{ propsData.id }}, x:{{ propsData.translate[0] }}, y:{{
        propsData.translate[1]
      }}, rotate:{{ propsData.rotate }}, width:{{ propsData.width }}, height:{{
        propsData.height
      }},
    </span>
    <div
      v-for="(item, index) in itemList"
      :key="item.id"
      :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
      :class="`weld-item-index-${index}`"
      :id="`weld-item-${item.id}`"
    >
      {{ item.name }}
      x:{{ item.translate[0] }}, y:{{ item.translate[1] }}, w:{{ item.width }},
      h:{{ item.height }}, r:{{ item.rotate }}
      <weld-type ref="objectsRef" :item="item" :key="item.id + item.type" />
    </div>
  </div>
</template>

<script>
import { ref, computed, defineComponent, onMounted } from "vue";
import { cloneDeep, isEqual } from "lodash";
import WeldType from "../WeldType.vue";

export default defineComponent({
  name: "WeldEl",
  components: {
    "weld-type": WeldType,
  },
  props: {
    // active: {
    //   type: Boolean,
    //   required: false,
    //   default: false,
    // },
    // inAlarm: {
    //   type: Boolean,
    //   required: false,
    //   default: false,
    // },
    // fillColor: {
    //   type: String,
    //   default: "#659dc5",
    // },
    // weldItems: {
    //   type: Array,
    //   default: new Array(),
    // },
    weldModel: {
      type: Object,
      default: () => {},
    },
  },

  setup(props, { emit }) {
    console.log("Weld Parent", props);
    const propsData = computed(() => props.weldModel);
    const itemList = ref(cloneDeep(props.weldModel.settings.weldItems));
    return {
      itemList,
      propsData,
    };
  },
});
</script>

<style scoped>
.weld-element {
  background-color: v-bind("bgColor");
}
</style>
