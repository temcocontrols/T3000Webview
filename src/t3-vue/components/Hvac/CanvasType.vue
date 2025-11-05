<!--
  This component is a canvas type component that is used to render the objects on the canvas.

-->
<template>
  <div class="moveable-item-canvas flex justify-center object-container" :class="{
    'flex flex-col flex-nowrap': !['Dial', 'Gauge', 'Value'].includes(
      item.type
    ),
    'overflow-hidden': item.type === 'Text',
    [item.type]: item.type,
    'with-bg': item.settings.bgColor,
    'with-title':
      item.settings.title ||
      (item.t3Entry && item.settings.t3EntryDisplayField !== 'none'),
  }">
    {{ item.width }} x {{ item.height }}
    <canvas ref="canvas" :id="`myCanvas${item.id}`" class="canvas-viewport-wrapper" :width="item.width"
      :height="item.height" resize stats></canvas>
  </div>
</template>

<script>
import { defineComponent, computed, onMounted, watch, ref } from "vue";
import IdxUtils from "@common/T3000/Hvac/Opt/Common/IdxUtils";
import paper from "paper";

export default defineComponent({
  name: "CanvasType",
  components: {
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    showArrows: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "autoManualToggle",
    "objectClicked",
    "changeValue",
    "updateWeldModel",
  ],
  setup(props, { emit }) {
    const range = computed(() => {
      return IdxUtils.getEntryRange(props.item?.t3Entry);
    });
    const dispalyText = computed(() => {
      if (!props.item.t3Entry) {
        return "";
      }
      const range = IdxUtils.getEntryRange(props.item.t3Entry);
      if (
        props.item.settings.t3EntryDisplayField === "value" ||
        props.item.settings.t3EntryDisplayField === "control"
      ) {
        if (
          props.item.t3Entry.value !== undefined &&
          props.item.t3Entry.range > 100
        ) {
          const rangeValue = range.options?.find(
            (item) => item.value * 1000 === props.item.t3Entry.value
          );
          return rangeValue?.name;
        } else if (
          props.item.t3Entry.value !== undefined &&
          props.item.t3Entry.digital_analog === 1
        ) {
          return props.item.t3Entry.value / 1000 + " " + range.unit;
        } else if (
          props.item.t3Entry.control !== undefined &&
          props.item.t3Entry.digital_analog === 0
        ) {
          if (props.item.t3Entry.control) {
            return range.on;
          } else {
            return range.off;
          }
        }
      }

      return props.item.t3Entry[props.item.settings.t3EntryDisplayField] || "";
    });

    const processedColors = computed(() => {
      const item = props.item;
      if (!["Gauge", "Dial"].includes(item.type)) {
        return null;
      }
      return item.type === "Gauge"
        ? item.settings.colors.map((i) => [i.offset / 100, i.color])
        : item.settings.colors.map((i, index) => {
          return {
            from: index ? item.settings.colors[index - 1].offset : 0,
            to: i.offset,
            color: [i.color],
          };
        });
    });

    function changeValue(type) {
      if (props.item.t3Entry.auto_manual === 0) return;
      let control = false;
      let newVal = props.item.t3Entry.value;
      const range = IdxUtils.getEntryRange(props.item?.t3Entry);
      if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.range > 100
      ) {
        const rangeOptions = range.options?.filter((item) => item.status === 1);
        const rangeIndex = rangeOptions.findIndex(
          (item) => item.value * 1000 === props.item.t3Entry.value
        );

        if (type === "decrease" && rangeIndex < rangeOptions.length - 1) {
          newVal = rangeOptions[rangeIndex + 1].value * 1000;
        } else if (type === "increase" && rangeIndex > 0) {
          newVal = rangeOptions[rangeIndex - 1].value * 1000;
        } else {
          return;
        }
      } else if (
        props.item.t3Entry.value !== undefined &&
        props.item.t3Entry.digital_analog === 1
      ) {
        if (type === "increase") {
          newVal = props.item.t3Entry.value + 1000;
        } else {
          newVal = props.item.t3Entry.value - 1000;
        }
      } else if (
        props.item.t3Entry.control !== undefined &&
        props.item.t3Entry.digital_analog === 0
      ) {
        control = true;
        if (type === "decrease" && props.item.t3Entry.control === 0) {
          newVal = 1;
        } else if (type === "increase" && props.item.t3Entry.control === 1) {
          newVal = 0;
        } else {
          return;
        }
      }
      emit("changeValue", props.item, newVal, control);
    }

    const objectRef = ref(null);

    function refresh() {
      if (!objectRef.value) return;
      if (props.item?.type === "Duct") {
        objectRef.value.refresh();
      }
    }

    const updateWeldModel = (weldModel, itemList) => {
      // console.log(
      //   "ObjectType.vue -> updateWeldModel | recieve from child",
      //   weldModel,
      //   itemList
      // );
      emit("updateWeldModel", weldModel, itemList);
    };

    // const canvasContainer = ref(null);
    const canvas = ref(null);
    // const tool = ref(null);
    paper.settings.insertItems = false;
    // const project = new Paper.Project(canvas.value);

    const drawObject = () => {
      // const canvas = document.getElementById(`myCanvas${props.item.id}`);

      const circle = new paper.Path.Circle({
        center: [80, 50],
        radius: 30,
        fillColor: "red",
      });

      paper.view.draw();
      // project.activeLayer.addChild(circle);
    };

    onMounted(() => {
      paper.setup(canvas.value);

      paper.view.onResize = function (event) {
      };

      drawObject();
    });

    return {
      range,
      dispalyText,
      processedColors,
      changeValue,
      refresh,
      objectRef,
      updateWeldModel,
      canvas,
    };
  },
});
</script>

<style scoped>
.canvas-viewport-wrapper {
  background-color: rgb(136, 80, 197);
  width: v-bind("item.width + 'px'");
  height: v-bind("item.height + 'px'");
}

.object-title {
  text-align: center;
  min-width: 100%;
  white-space: nowrap;
  line-height: 2.5em;
  color: v-bind("item.settings.titleColor");
}

.with-bg .object-title {
  background-color: rgb(255 255 255 / 40%);
}

.moveable-item {
  height: 100%;
  border-radius: 5px;
  background-color: v-bind("item.settings.bgColor");
  color: v-bind("item.settings.textColor");
  font-size: v-bind("item.settings.fontSize + 'px'");
}

.moveable-item.Duct {
  background-color: transparent;
}

.object-container {
  width: 100%;
}

.moveable-item.Gauge .object-container,
.moveable-item.Dial .object-container {
  height: 100%;
}

.moveable-item.Gauge.with-title .object-container,
.moveable-item.Dial.with-title .object-container {
  height: calc(100% - 41px);
}

.moveable-item.Value.with-title,
.moveable-item.Icon.with-title,
.moveable-item.Switch.with-title {
  display: flex;
}

.moveable-item.Icon.with-title,
.moveable-item.Switch.with-title {
  display: flex;
  flex-direction: row-reverse;
}

.moveable-item.Value .object-container,
.moveable-item.Icon.with-title .object-container,
.moveable-item.Switch.with-title .object-container {
  height: 100%;
  display: flex;
  align-items: center;
}

.moveable-item.Value .object-container {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
  padding: 10px;
}

.moveable-item.Icon.with-title .object-container,
.moveable-item.Switch.with-title .object-container {
  width: auto;
}

.moveable-item.Value.with-title .object-title,
.moveable-item.Icon.with-title .object-title,
.moveable-item.Switch.with-title .object-title {
  min-width: auto;
  padding: 10px;
  line-height: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.moveable-item.Icon.with-title .object-title,
.moveable-item.Switch.with-title .object-title {
  flex-grow: 1;
  justify-content: v-bind("item.settings.justifyContent");
}

.moveable-item.Value.with-title .object-title .mode-icon,
.moveable-item.Icon.with-title .object-title .mode-icon,
.moveable-item.Switch.with-title .object-title .mode-icon {
  display: none;
}

.moveable-item.Icon.with-bg .object-title,
.moveable-item.Switch.with-bg .object-title {
  background-color: transparent;
}

.moveable-item.link {
  cursor: pointer;
}

.img-object {
  max-width: none;
  width: 100%;
}

.up-btn {
  display: none;
  bottom: 100%;
  z-index: 1;
}

.down-btn {
  display: none;
  top: 100%;
  z-index: 1;
}

.moveable-item.Icon .up-btn,
.moveable-item.Switch .up-btn {
  bottom: calc(100% + 5px);
}

.moveable-item.Icon .down-btn,
.moveable-item.Switch .down-btn {
  top: calc(100% + 3px);
}

.object-title:hover .up-btn,
.object-title:hover .down-btn {
  display: inline-flex;
}

.Duct .object-container {
  max-height: 100%;
}
</style>
