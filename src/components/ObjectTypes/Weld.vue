<template>
  <!-- <div>
    <a>this is a weld element</a>
    <br />
    {{ weldData.settings.active }},{{ weldData.settings.inAlarm }},{{
      weldData.settings.fillColor
    }}
    <span
      >id:{{ weldData.id }},x:{{ weldData.translate[0] }},y:{{
        weldData.translate[1]
      }}, rotate:{{ weldData.rotate }}, width:{{ weldData.width }},height:{{
        weldData.height
      }}
    </span>
  </div> -->
  <div class="weld-element flex justify-center object-container">
    <div
      v-for="(item, index) in itemList"
      :key="item.id"
      :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
      :class="`weld-item-index-${index}`"
      :id="`weld-item-${item.id}`"
    >
      <!-- {{ item.name }}, x:{{ item.translate[0] }}, y:{{ item.translate[1] }},
      w:{{ item.width }}, h:{{ item.height }}, r:{{ item.rotate }}, col{{
        item
      }} -->
      <weld-type ref="objectsRef" :item="item" :key="item.id + item.type" />
    </div>
  </div>
</template>

<script>
import { computed, defineComponent, onMounted } from "vue";
import { cloneDeep } from "lodash";
import WeldType from "../WeldType.vue";

export default defineComponent({
  name: "WeldEl",
  components: { WeldType },
  props: {
    weldModel: {
      type: Object,
      default: () => {},
    },
  },
  setup(props) {
    const weldData = computed(() => props.weldModel);
    const defaultWidth = cloneDeep(weldData.value.width);
    const defaultHeight = cloneDeep(weldData.value.height);
    const defaultColor = cloneDeep(weldData.value.settings.fillColor);
    console.log(weldData.value, defaultWidth, defaultHeight, defaultColor);

    const recalculateScale = () => {
      const widthScale = weldData.value.width / defaultWidth;
      const heightScale = weldData.value.height / defaultHeight;
      const tranXScale = weldData.value.translate[0] / defaultWidth;
      const tranYScale = weldData.value.translate[1] / defaultHeight;
      return { widthScale, heightScale, tranXScale, tranYScale };
    };

    const recalculateWHAndTranslate = () => {
      const items = cloneDeep(props.weldModel.settings.weldItems);
      // console.log("weld item with new props", items);

      if (items.length === 0) return items;

      var changed = recalculateScale();

      const firstItem = items[0];
      const firstX = firstItem.translate[0];
      const firstY = firstItem.translate[1];

      return items.map((item, index) => {
        if (index === 0) {
          item.width = item.width * changed.widthScale;
          item.height = item.height * changed.heightScale;
          item.translate[0] = 0;
          item.translate[1] = 0;
        } else {
          item.width = item.width * changed.widthScale;
          item.height = item.height * changed.heightScale;
          item.translate[0] *= changed.widthScale;
          item.translate[1] *= changed.heightScale;
          item.translate[0] -= firstX * changed.widthScale;
          item.translate[1] -= firstY * changed.heightScale;
        }

        if (weldData.value.settings.fillColor !== defaultColor) {
          item.settings.bgColor = weldData.value.settings.fillColor;
        }

        return item;
      });
    };

    const itemList = computed(() => {
      var newWeldChild = recalculateWHAndTranslate();
      // console.log("weld-item-list", newWeldChild);
      return newWeldChild;
    });

    onMounted(() => {
      // console.log("weld mounted", itemList);
    });

    return {
      itemList,
      weldData,
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
