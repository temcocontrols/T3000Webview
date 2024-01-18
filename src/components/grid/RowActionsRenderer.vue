<script setup>
import { useQuasar } from "quasar";
import { user, isAdmin } from "../../lib/common";

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

function deleteRow() {
  $q.dialog({
    title: "Delete",
    message: "Are you sure you want to delete this row?",
    cancel: { label: "No" },
    ok: { label: "Yes", color: "negative" },
  }).onOk(() => {
    props.params.api.dispatchEvent({
      type: "deleteRow",
      data: { id: props.params.data.id },
    });
  });
}

function reviewChanges() {
  $q.dialog({
    title: "Review changes",
    message: "Not handeled yet",
  });
  props.params.api.dispatchEvent({
    type: "reviewChanges",
    data: { id: props.params.data.id },
  });
}

function reviewNewRow() {
  $q.dialog({
    title: "Review changes",
    message: "Not handeled yet",
  });
  props.params.api.dispatchEvent({
    type: "reviewNewRow",
    data: { id: props.params.data.id },
  });
}
</script>

<template>
  <div class="relative">
    {{ props.params.value }}
    <div
      v-if="
        ['UNDER_REVIEW', 'REVISION'].includes(props.params.data.status) &&
        user?.id === props.params.data.userId
      "
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
        <q-tooltip v-if="props.params.data.status === 'UNDER_REVIEW'"
          >Your changes are under review.</q-tooltip
        >
        <q-tooltip v-else>Your item is under review.</q-tooltip></q-btn
      >

      <q-btn round dense flat size="sm" color="primary" icon="more_vert">
        <q-menu>
          <q-list style="min-width: 100px">
            <q-item
              v-if="props.params.data.status === 'UNDER_REVIEW'"
              clickable
              v-close-popup
              @click="cancelChanges()"
            >
              <q-item-section>Cancel changes</q-item-section>
            </q-item>
            <q-item v-else clickable v-close-popup @click="deleteRow()">
              <q-item-section>Delete row</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <div v-else-if="isAdmin(user)" class="row-actions">
      <q-btn round dense flat size="sm" color="primary" icon="more_vert">
        <q-menu>
          <q-list style="min-width: 100px">
            <template v-if="props.params.context?.activeTab === 'changes'">
              <q-item
                v-if="props.params.data.status === 'REVISION'"
                clickable
                v-close-popup
                @click="reviewNewRow()"
              >
                <q-item-section>Review the new row</q-item-section>
              </q-item>
              <q-item v-else clickable v-close-popup @click="reviewChanges()">
                <q-item-section>Review changes</q-item-section>
              </q-item>
            </template>
            <q-item v-else clickable v-close-popup @click="deleteRow()">
              <q-item-section>Delete row</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
  </div>
</template>
