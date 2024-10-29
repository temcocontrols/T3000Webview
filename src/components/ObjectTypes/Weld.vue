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
import { computed, defineComponent, onMounted, onUpdated } from "vue";
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
  emits: ["updateWeldModel"],
  setup(props, { emit }) {
    const weldData = computed(() => props.weldModel);
    let defaultWidth = weldData.value.width;
    let defaultHeight = weldData.value.height;
    const defaultColor = weldData.value.settings.fillColor;
    const items = weldData.value.settings.weldItems;

    const recalculateScale = () => {
      const widthScale = weldData.value.width / defaultWidth;
      const heightScale = weldData.value.height / defaultHeight;
      const tranXScale = weldData.value.translate[0] / defaultWidth;
      const tranYScale = weldData.value.translate[1] / defaultHeight;

      // console.log(
      //   "Weld.vue -> setup -> recalculateScale",
      //   "orgin-(w,h)",
      //   defaultWidth,
      //   defaultHeight,
      //   "changed-(w,h)",
      //   weldData.value.width,
      //   weldData.value.height,
      //   "dw",
      //   defaultWidth,
      //   "dh",
      //   defaultHeight,
      //   "sw",
      //   widthScale,
      //   "sh",
      //   heightScale,
      //   "tx",
      //   tranXScale,
      //   "ty",
      //   tranYScale
      // );

      return { widthScale, heightScale, tranXScale, tranYScale };
    };

    const recalculateWHAndTranslate = () => {
      // console.log("Weld.vue -> recalculateWHAndTranslate | items", items);

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
          // console.log("weld color changed", item);
          if (item.type === "Duct") {
            item.settings.bgColor = weldData.value.settings.fillColor;
          } else {
            item.settings.fillColor = weldData.value.settings.fillColor;
          }
        }

        return item;
      });
    };

    const itemList = computed(() => {
      var newWeldChild = recalculateWHAndTranslate();
      // console.log(
      //   "Weld.vue -> setup -> recalculateWHAndTranslate | send to parent",
      //   weldData.value.width,
      //   weldData.value.height,
      //   newWeldChild
      // );
      emit("updateWeldModel", weldData.value, newWeldChild);
      defaultWidth = weldData.value.width;
      defaultHeight = weldData.value.height;
      return newWeldChild;
    });

    onMounted(() => {
      // console.log("weld mounted", itemList);
    });

    // onUpdated(() => {
    //   console.log(
    //     "Weld.vue -> onUpdated | emit to parent",
    //     weldData.value,
    //     itemList.value
    //   );
    //   emit("updateWeldModel", weldData.value, itemList.value);
    // });

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
