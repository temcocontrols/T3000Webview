<script setup>
import { useQuasar } from "quasar";

const $q = useQuasar();
const props = defineProps({
  params: {
    type: Object,
  },
});
function openEditor() {
  props.params.api.startEditingCell({
    rowIndex: props.params.node.rowIndex,
    colKey: props.params.colKey,
  });
}
</script>

<template>
  <div>
    {{ props.params.value }}
    <q-btn
      v-if="['UNDER_REVIEW', 'REVISION'].includes(props.params.data.status)"
      class="status-message-btn"
      round
      dense
      flat
      size="sm"
      color="primary"
      icon="question_mark"
    />
  </div>
</template>
