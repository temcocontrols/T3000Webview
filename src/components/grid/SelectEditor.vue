<script setup>
import { ref, toRaw, onMounted } from "vue";
const props = defineProps({
  params: {
    type: Object,
  },
});

const KEY_BACKSPACE = "Backspace";
const KEY_DELETE = "Delete";
const KEY_F2 = "F2";

const value = ref(props.params.value);

const selectRef = ref(null);

const selectOptions = ref(props.params.options);
const clearable = ref(props.params.clearable);

onMounted(() => {
  setInitialState(props.params);
});

function selectFilter(val, update, abort) {
  update(() => {
    const keyword = val.toLowerCase();
    selectOptions.value = props.params.options.filter(
      (v) => v.toLowerCase().indexOf(keyword) > -1
    );
  });
}

const getValue = () => {
  return toRaw(value.value);
};

const stopEditing = () => {
  props.params.api.stopEditing();
};

function setInitialState(params) {
  if (params.eventKey === KEY_BACKSPACE || params.eventKey === KEY_DELETE) {
    // if backspace or delete pressed, we clear the cell
    value.value = "";
  } else if (params.eventKey?.length === 1) {
    // if a letter was pressed, we show select popup
    setTimeout(() => {
      selectRef.value?.showPopup();
      selectRef.value?.filter(params.eventKey);
      selectRef.value?.updateInputValue(params.eventKey);
    }, 100);
  } else if (params.eventKey === KEY_F2) {
    // if a letter was pressed, we show select popup
    setTimeout(() => {
      selectRef.value?.showPopup();
    }, 100);
  }
}
</script>

<template>
  <q-select
    ref="selectRef"
    v-model="value"
    dense
    use-input
    hide-selected
    fill-input
    :clearable="clearable"
    new-value-mode="add-unique"
    input-debounce="0"
    :options="selectOptions"
    @filter="selectFilter"
    @update:model-value="stopEditing()"
    @popup-hide="stopEditing()"
  />
</template>
