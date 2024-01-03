<script setup>
import { useQuasar } from "quasar";

const $q = useQuasar();
const props = defineProps({
  params: {
    type: Object,
  },
});
function cancelChanges() {
  $q.dialog({
    title: "Cancel changes",
    message: "Are you sure you want to cancel your changes for this row?",
    cancel: { label: "No" },
    ok: { label: "Yes", color: "negative" },
  }).onOk(() => {
    props.params.api.dispatchEvent({
      type: "cancelChanges",
      data: { id: props.params.data.id },
    });
  });
}
</script>

<template>
  <div class="relative">
    {{ props.params.value }}
    <div
      v-if="['UNDER_REVIEW', 'REVISION'].includes(props.params.data.status)"
      class="row-actions"
    >
      <q-btn
        class="status-message-btn"
        round
        dense
        flat
        size="sm"
        color="primary"
        icon="question_mark"
      >
        <q-tooltip>Your changes are under review.</q-tooltip></q-btn
      >
      <q-btn round dense flat size="sm" color="primary" icon="more_vert">
        <q-menu>
          <q-list style="min-width: 100px">
            <q-item clickable v-close-popup @click="cancelChanges()">
              <q-item-section>Cancel changes</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
  </div>
</template>
