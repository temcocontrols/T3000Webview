<template>
  <div class="weld-element flex justify-center object-container">
    <!-- <a>this is a weld element</a> -->
    <!-- <br />
    {{ propsData.settings.active }}{{ propsData.settings.inAlarm
    }}{{ propsData.settings.fillColor }}
    <span
      >id:{{ propsData.id }}, x:{{ propsData.translate[0] }}, y:{{
        propsData.translate[1]
      }}, rotate:{{ propsData.rotate }}, width:{{ propsData.width }}, height:{{
        propsData.height
      }},
    </span> -->
    <div
      v-for="(item, index) in itemList"
      :key="item.id"
      :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
      :class="`weld-item-index-${index}`"
      :id="`weld-item-${item.id}`"
    >
      <!-- {{ item.name }}
      x:{{ item.translate[0] }}, y:{{ item.translate[1] }}, w:{{ item.width }},
      h:{{ item.height }}, r:{{ item.rotate }} -->
      <weld-type ref="objectsRef" :item="item" :key="item.id + item.type" />
    </div>
  </div>
</template>

<script>
import { ref, computed, defineComponent, onMounted } from "vue";
import { cloneDeep, isEqual } from "lodash";
import WeldType from "../WeldType.vue";
import { get } from "lodash";

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
    const settings = computed(() => props.weldModel.settings);

    const recalculateTranslations = () => {
      const items = cloneDeep(props.weldModel.settings.weldItems);
      if (items.length === 0) return items;

      const firstItem = items[0];
      const firstX = firstItem.translate[0];
      const firstY = firstItem.translate[1];

      return items.map((item, index) => {
        if (index === 0) {
          item.translate[0] = 0;
          item.translate[1] = 0;
        } else {
          item.translate[0] -= firstX;
          item.translate[1] -= firstY;
        }
        return item;
      });
    };

    const getWeldModelDimensions = () => {
      const { width, height } = props.weldModel;
      return { width, height };
    };

    console.log("Weld Model", props.weldModel, getWeldModelDimensions());

    const itemList = computed(() => recalculateTranslations());
    const dimension = computed(() => getWeldModelDimensions());

    return {
      itemList,
      propsData,
      settings,
      dimension,
    };
  },
});
</script>

<style scoped>
.weld-element {
  height: 100%;
  border-radius: 5px;
  background-color: v-bind("settings?.bgColor");
  color: v-bind("settings?.textColor");
  font-size: v-bind("settings?.fontSize + 'px'");

  display: flex;
  justify-content: flex-start;
}
</style>
