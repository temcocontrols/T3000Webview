<!-- Component: AppCard -->
<!--
  This component represents an application card. It displays an image, name, description, and user information.
  The image is loaded from a file server using the `fileServerUrl` prop. The `app` prop is used to display the application's details.
  The `showPrivateStatus` prop determines whether to show the private status of the application.
  The component emits the `viewApp` event when the card is clicked. The event is emitted with the `app.id` as the payload.
  The component emits the `deleteApp` event when the delete button is clicked. The event is emitted with the `app.id` as the payload.
  The component emits the `editApp` event when the edit button is clicked. The event is emitted with the `app.id` as the payload.
  The component emits the `showApp` event when the show button is clicked. The event is emitted with the `app.id` as the payload.
  The component emits the `shareApp` event when the share button is clicked. The event is emitted with the `app.id` as the payload.
  The component emits the `duplicateApp` event when the duplicate button is clicked. The event is emitted with the `app.id` as the payload.
-->
<template>
  <q-card class="app-card">
    <q-btn
      v-if="showActions"
      class="app-card-action-btn hidden absolute right-2.5 top-2.5"
      :id="'app-card-action-btn-' + app.id"
      dense
      flat
      size="md"
      round
      color="primary"
      icon="more_vert"
    >
      <q-menu
        @update:model-value="actionMenuToggle('app-card-action-btn-' + app.id)"
      >
        <q-list style="min-width: 70px">
          <q-item dense :to="'/apps-library/' + app.id + '/edit'">
            <q-item-section avatar>
              <q-icon name="edit" />
            </q-item-section>
            <q-item-section>Edit</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup dense @click="deleteAppAction(app)">
            <q-item-section avatar>
              <q-icon name="delete" />
            </q-item-section>
            <q-item-section>Delete</q-item-section>
          </q-item>
          <q-separator />
          <q-item
            clickable
            v-close-popup
            dense
            @click="updateApp(app, { private: false })"
            v-if="app.private === true"
          >
            <q-item-section avatar>
              <q-icon name="visibility" />
            </q-item-section>
            <q-item-section>Make public</q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            dense
            @click="updateApp(app, { private: true })"
            v-if="app.private === false"
          >
            <q-item-section avatar>
              <q-icon name="visibility_off" />
            </q-item-section>
            <q-item-section>Make private</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
    <div class="relative" style="height: 205px; width: 100%">
      <img
        class="app-image"
        v-if="app.image"
        :src="fileServerUrl + app.image.path + '?w=208&h=205'"
      />
      <img v-else src="../assets/placeholder.png" />
    </div>
    <q-card-section>
      <div class="text-h6">{{ app.name }}</div>
      <div class="text-subtitle2">by {{ app.user.name }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      {{ app.description }}
      <div class="text-right" v-if="showPrivateStatus">
        <q-chip v-if="app.private" icon="visibility_off" size="md"
          >Private</q-chip
        >
        <q-chip v-else icon="visibility" size="md">Public</q-chip>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { liveApi } from "../lib/api";
import { useQuasar } from "quasar";

const props = defineProps({
  app: {
    type: Object,
    required: true,
  },
  showActions: {
    type: Boolean,
    required: false,
    default: false,
  },
  showPrivateStatus: {
    type: Boolean,
    required: false,
    default: false,
  },
});
const emit = defineEmits(["updated", "deleted"]);
const fileServerUrl = process.env.API_URL + "/file/";
const $q = useQuasar();
function deleteAppAction(app) {
  $q.dialog({
    title: "Delete Application",
    message: `Are you sure you want to delete (${app.name}) application?`,
    ok: {
      label: "Delete",
      color: "red-8",
      flat: true,
    },
    cancel: true,
    persistent: true,
  })
    .onOk(() => {
      $q.loading.show();
      liveApi
        .delete(`t3Apps/${app.id}`)
        .then(() => {
          $q.loading.hide();
          $q.notify({
            message: "App has been deleted successfully.",
            color: "primary",
            icon: "done",
          });
          emit("deleted", app);
        })
        .catch((err) => {
          $q.loading.hide();
          $q.notify({
            message: "Error: App couldn't be deleted! " + err,
            color: "negative",
            icon: "error",
            timeout: 0,
            actions: [{ label: "Dismiss", color: "grey-5", handler: () => {} }],
          });
        });
    })
    .onCancel(() => {
      // console.log('>>>> Cancel')
    })
    .onDismiss(() => {
      // console.log('I am triggered on both OK and Cancel')
    });
}
function updateApp(app, data) {
  liveApi
    .patch(`t3Apps/${app.id}`, { json: data })
    .then(() => {
      $q.loading.hide();
      $q.notify({
        message: "App has been updated successfully.",
        color: "primary",
        icon: "done",
      });
      emit("deleted", app);
    })
    .catch((err) => {
      $q.loading.hide();
      $q.notify({
        message: "Error: App couldn't be updated! " + err,
        color: "negative",
        icon: "error",
        timeout: 0,
        actions: [{ label: "Dismiss", color: "grey-5", handler: () => {} }],
      });
    });
}
function actionMenuToggle(id) {
  document.getElementById(id).classList.toggle("active");
}
</script>

<style scoped>
.app-card {
  display: relative;
}
.app-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}
.app-card:hover .app-card-action-btn,
.app-card .app-card-action-btn.active {
  z-index: 1;
  display: inline-flex !important;
}
</style>
