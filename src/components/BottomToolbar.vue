<style scoped>
.document-toolbar {
  display: flex;
  padding: 0 10px;
  /* background-color: #f5f5f5; */
  border-bottom: 1px solid #e0e0e0;
  height: 36px;
  color: #444;
  width: 100%;
  justify-content: space-between;
}

.doc-detail {
  height: 36px;
  background: #F5F6F7;
  border-radius: 6px;
  background: red;
  border-radius: 6px;
  padding: 6px 4px;
  align-self: flex-start;
}

.doc-detail label {
  margin-right: 5px;
}

.doc-detail input {
  width: 55px;
  margin-right: 10px;
  border-radius: 2px;
}

.doc-slider {
  width: 250px;
  align-self: flex-end;
  display: flex;
}

#qsl {
  width: 150px;
}

#qslInput {
  width: 38px;
  margin-left: 10px;
  height: 28px;
  border-radius: 5px;
}
</style>
<template>
  <div class="document-toolbar">
    <div class="doc-detail">
      <label>Left</label>
      <input type="text" />
      <label>Top</label>
      <input type="text" />
      <label>Width</label>
      <input type="text" />
      <label>Height</label>
      <input type="text" />
      <label>Rotate</label>
      <input type="text" />
    </div>
    <div class="doc-slider">
      <q-slider id="qsl" v-model="model" color="grey-2" inner-track-color="white" track-color="grey" :min="25"
        :max="400" :step="5" selection-color="grey-1" @change="onChange" @pan="onPan" @update="onUpdate" />
      <input id="qslInput" type="text" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { QSlider } from 'quasar';
// import T3000 from 'src/lib/T3000';

export default defineComponent({
  name: 'BottomToolbar',
  components: {
    QSlider
  },
  props: {
    left: {
      type: Number,
      default: 0
    },
    top: {
      type: Number,
      default: 0
    },
    width: {
      type: Number,
      default: 0
    },
    height: {
      type: Number,
      default: 0
    },
    rotate: {
      type: Number,
      default: 0
    }
  },
  emits: ["bottomSliderbarEvent"],
  setup(props, { emit }) {
    const model = ref(25);

    const onChange = () => {
      T3000.Utils.Log("--------------------------------")
      emit('bottomSliderbarEvent', "change", model.value);
    }

    const onPan = () => {
      emit('bottomSliderbarEvent', "pan", model.value);
    }

    const onUpdate = () => {
      emit('bottomSliderbarEvent', "update", model.value);
    }

    return {
      model, onChange, onPan, onUpdate
    };
  },
});
</script>
