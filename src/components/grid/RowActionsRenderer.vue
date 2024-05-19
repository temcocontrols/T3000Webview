<script setup>
import { onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import { user, isAdmin, getModbusRegisterSettings } from "../../lib/common";

const $q = useQuasar();
const props = defineProps({
  params: {
    type: Object,
  },
});

const modbusRegisterSettings = ref(null);

onMounted(() => {
  modbusRegisterSettings.value = getModbusRegisterSettings();
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
      data: props.params.data,
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
      data: props.params.data,
    });
  });
}

function cancelUpdate() {
  $q.dialog({
    title: "Cancel Update",
    message:
      "Are you sure you want to restore the original row and cancel your changes?",
    cancel: { label: "No" },
    ok: { label: "Yes", color: "negative" },
  }).onOk(() => {
    props.params.api.dispatchEvent({
      type: "cancelUpdateRow",
      data: props.params.data,
    });
  });
}

function reviewChanges() {
  props.params.api.dispatchEvent({
    type: "reviewAllRowChanges",
    data: props.params.data,
  });
}

function reviewNewRow() {
  props.params.api.dispatchEvent({
    type: "reviewNewRow",
    data: props.params.data,
  });
}

function togglePrivate() {
  props.params.api.dispatchEvent({
    type: "togglePrivate",
    data: props.params.data,
    node: props.params.node,
  });
}
</script>

<template>
  <div class="relative">
    <span v-if="props.params.data.private">
      <q-icon name="'visibility_off'" class="text-grey-8 pr-1">
        <q-tooltip>Private</q-tooltip>
      </q-icon>
    </span>
    <span>{{
      props.params.data.status === "NEW" ? "" : props.params.value
    }}</span>
    <div
      v-if="
        isAdmin(user) &&
        props.params.context?.activeTab === 'changes' &&
        props.params.context?.liveMode
      "
      class="row-actions"
    >
      <q-btn round dense flat size="sm" color="primary" icon="more_vert">
        <q-menu>
          <q-list style="min-width: 100px">
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
            <q-item clickable v-close-popup @click="deleteRow()">
              <q-item-section>Delete row</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <div v-else class="row-actions">
      <q-btn
        v-if="
          modbusRegisterSettings?.push &&
          !props.params.data.private &&
          ['UPDATED', 'NEW', 'REVISION', 'UNDER_REVIEW'].includes(
            props.params.data.status
          )
        "
        class="status-message-btn"
        round
        dense
        flat
        size="sm"
        color="primary"
        icon="question_mark"
      >
        <q-tooltip v-if="props.params.data.status === 'UPDATED'"
          >This row is updated on the local database, but not on the cloud
          database yet.</q-tooltip
        >
        <q-tooltip v-else-if="props.params.data.status === 'NEW'"
          >This item is only in the local database and not synchronized with the
          cloud database yet.</q-tooltip
        >
        <q-tooltip v-else-if="props.params.data.status === 'REVISION'"
          >This item has been pushed to the public cloud database but it's under
          review so it will show up only for you until it's approved.</q-tooltip
        ><q-tooltip v-else-if="props.params.data.status === 'UNDER_REVIEW'"
          >Your changes to this item has been pushed to the public cloud
          database but it's under review so it will show up only for you until
          it's approved.</q-tooltip
        ></q-btn
      >

      <q-btn round dense flat size="sm" color="primary" icon="more_vert">
        <q-menu>
          <q-list style="min-width: 100px">
            <q-item
              v-if="props.params.data.status === 'UPDATED'"
              clickable
              v-close-popup
              @click="cancelUpdate()"
            >
              <q-item-section>Cancel update</q-item-section>
            </q-item>
            <q-item
              v-else-if="props.params.data.status === 'UNDER_REVIEW'"
              clickable
              v-close-popup
              @click="cancelChanges()"
            >
              <q-item-section>Cancel update</q-item-section>
            </q-item>
            <q-item
              v-if="!props.params.context?.liveMode"
              clickable
              v-close-popup
              @click="togglePrivate()"
            >
              <q-item-section v-if="!props.params.data.private"
                >Make private</q-item-section
              >
              <q-item-section v-else>Make public</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="deleteRow()">
              <q-item-section>Delete row</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
  </div>
</template>
