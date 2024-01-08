<template>
  <q-dialog v-model="createItemDialog" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Add new row</div>
      </q-card-section>
      <q-separator />
      <q-form ref="form" class="q-gutter-md" @submit="saveNewRow">
        <q-card-section
          class="grid grid-cols-2 gap-4 scroll"
          style="max-height: 50vh"
        >
          <q-input
            v-model="newItem.register_address"
            label="Register address"
            type="number"
            :rules="[
              (val) => (val && val > 0) || 'Please enter a positive number',
            ]"
          />
          <q-input v-model="newItem.operation" label="Operation" />
          <q-input
            v-model="newItem.register_length"
            label="Register length"
            type="number"
            :rules="[
              (val) => (val && val > 0) || 'Please enter a positive number',
            ]"
          />
          <q-input v-model="newItem.register_name" label="Register name" />
          <q-input
            v-model="newItem.data_format"
            label="Data format"
            :rules="[
              (val) => (val && val.length > 0) || 'Please enter a data format',
            ]"
          />
          <q-input
            v-model="newItem.device_name"
            label="Device name"
            :rules="[
              (val) => (val && val.length > 0) || 'Please enter a device name',
            ]"
          />
          <q-input
            v-model="newItem.description"
            label="Description"
            type="textarea"
            class="col-span-2"
          />
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="mt-0">
          <q-btn
            label="Cancel"
            color="primary"
            flat
            class="q-ml-sm"
            @click="createItemDialog = false"
          />
          <q-btn label="Submit" type="submit" color="primary" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>

  <div class="flex flex-col flex-nowrap h-screen overflow-hidden">
    <user-top-bar class="flex-none">
      <template v-slot:action-btns>
        <q-btn
          icon="add_circle"
          label="Add New Row"
          @click="createItemDialog = true"
          color="white"
          text-color="grey-8"
          size="0.7rem"
          dense
          class="ml-2"
        ></q-btn
      ></template>
      <template v-slot:search-input>
        <q-input
          class="toolbar-input mr-2"
          dense
          standout="bg-grey-2 text-black"
          v-model="filter"
          placeholder="Search"
          @update:model-value="triggerFilterChanged()"
        >
          <template #prepend>
            <q-icon v-if="filter === ''" name="search" color="white" />
            <q-icon
              v-else
              name="clear"
              color="white"
              class="cursor-pointer"
              @click="
                () => {
                  filter = '';
                  gridApi.onFilterChanged();
                }
              "
            />
          </template>
        </q-input>
      </template>
      <template v-slot:buttons>
        <q-btn flat round dense icon="notifications" class="ml-4 mr-2">
          <q-menu>
            <q-list v-if="notifications.length > 0">
              <q-item
                v-for="notification in notifications"
                :key="notification.id"
                clickable
                class="pt-4 pb-3"
              >
                <q-item-section avatar>
                  <q-avatar>
                    <q-icon
                      name="check_circle"
                      size="lg"
                      v-if="notification.type === 'USER_CHANGES_APPOROVED'"
                    />
                    <q-icon
                      name="cancel"
                      size="lg"
                      v-else-if="notification.type === 'USER_CHANGES_REJECTED'"
                    />
                    <q-badge
                      color="red"
                      rounded
                      floating
                      v-if="notification.status === 'UNREAD'"
                    />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label
                    :class="{ 'text-gray-400': notification.status === 'READ' }"
                    >{{ notification.message }}</q-item-label
                  >
                  <q-item-label caption>{{
                    new Date(notification.createdAt).toLocaleString()
                  }}</q-item-label>
                  <div class="flex justify-end mt-1">
                    <q-btn
                      v-if="notification.status === 'UNREAD'"
                      flat
                      color="primary"
                      size="0.7rem"
                      label="Mark as read"
                      @click="notificationstatusChange(notification, 'READ')"
                    />
                    <q-btn
                      v-else-if="notification.status === 'READ'"
                      flat
                      size="0.7rem"
                      label="Mark as unread"
                      @click="notificationstatusChange(notification, 'UNREAD')"
                    />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="p-4 min-w-52">You have no notifications.</div>
          </q-menu>
          <q-badge
            color="red"
            rounded
            floating
            v-if="notifications.find((n) => n.status === 'UNREAD')"
          />
        </q-btn>
      </template>
    </user-top-bar>
    <q-page
      class="flex justify-center p-2 flex-1 overflow-hidden"
      :style-fn="() => {}"
    >
      <ag-grid-vue
        style="width: 100%; height: 100%"
        class="data-table ag-theme-quartz"
        :columnDefs="modbusRegColumns"
        @grid-ready="onGridReady"
        @firstDataRendered="onFirstDataRendered"
        @cell-value-changed="updateRow"
        :getRowId="getRowId"
        :autoSizeStrategy="autoSizeStrategy"
        :defaultColDef="defaultColDef"
        rowModelType="serverSide"
        :enableBrowserTooltips="true"
        :suppressCsvExport="true"
        :suppressExcelExport="true"
        :columnTypes="columnTypes"
        :components="{
          RowActionsRenderer,
        }"
      ></ag-grid-vue>
    </q-page>
  </div>
</template>

<script setup>
import "ag-grid-enterprise/styles/ag-grid.css";
import "ag-grid-enterprise/styles/ag-theme-quartz.css";
import "ag-grid-enterprise";
import { ref, onMounted, onBeforeUnmount, onBeforeMount, toRaw } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { ServerSideRowModelModule, ModuleRegistry } from "ag-grid-enterprise";
import { useQuasar, debounce } from "quasar";
import api from "../../lib/api";
import {
  globalNav,
  modbusRegColumns,
  cellClassRules,
  columnTypes,
  user,
} from "../../lib/common";
import UserTopBar from "../../components/UserTopBar.vue";

import RowActionsRenderer from "../../components/grid/RowActionsRenderer.vue";

ModuleRegistry.registerModules([ServerSideRowModelModule]);

const $q = useQuasar();
const filter = ref("");

const gridApi = ref();
const getRowId = ref();
const defaultColDef = ref({
  minWidth: 70,
  suppressMenu: true,
  cellClassRules: cellClassRules,
  editable: () => !!user.value,
});

const createItemDialog = ref(false);

const emptyNewItem = {
  register_address: null,
  operation: null,
  register_length: null,
  register_name: null,
  data_format: null,
  description: null,
  device_name: null,
};
const newItem = ref(structuredClone(emptyNewItem));

const notifications = ref([]);

const triggerFilterChanged = debounce(onFilterChanged, 500);

window.onbeforeunload = () => {
  const state = gridApi.value.getColumnState();
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
};

onBeforeMount(() => {
  getRowId.value = (params) => `${params.data.id}`;
});

onMounted(() => {
  globalNav.value.title = "Modbus Register";
  globalNav.value.back = null;

  getNotifications().then((res) => {
    notifications.value = res;
  });
});

function onFilterChanged() {
  gridApi.value.onFilterChanged();
}

function onGridReady(params) {
  gridApi.value = params.api;
  var datasource = getServerSideDatasource();
  // register the datasource with the grid
  params.api.setGridOption("serverSideDatasource", datasource);
  params.api.addEventListener("cancelChanges", async (ev) => {
    await api
      .patch("modbusRegisters/" + ev.data.id + "/cancel", {})
      .then(async (res) => {
        gridApi.value.refreshServerSide();
        $q.notify({
          type: "positive",
          message: "The row changes has been cancelled successfully",
        });
      });
  });

  params.api.addEventListener("deleteRow", async (ev) => {
    await api.delete("modbusRegisters/" + ev.data.id).then(async (res) => {
      gridApi.value.refreshServerSide();
      $q.notify({
        type: "positive",
        message: "The row has been deleted successfully",
      });
    });
  });
}
function onFirstDataRendered(params) {
  const localState = localStorage.getItem("modbusRegisterGridState");
  if (localState) {
    params.api.applyColumnState({
      state: JSON.parse(localState),
      applyOrder: true,
    });
  }
}

onBeforeUnmount(() => {
  const state = gridApi.value.getColumnState();
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
});

const autoSizeStrategy = {
  type: "fitGridWidth",
  defaultMinWidth: 90,
};

function getServerSideDatasource() {
  return {
    getRows: (params) => {
      const request = params.request;
      if (request.endRow == undefined || request.startRow == undefined) {
        return "";
      }
      var limit = request.endRow - request.startRow;
      const sortCol = params.api.getColumn(request.sortModel[0]?.colId || 1);
      api
        .get(
          "modbusRegisters?limit=" +
            limit +
            "&offset=" +
            request.startRow +
            "&orderBy=" +
            sortCol.colDef.field +
            "&orderDir=" +
            (request.sortModel[0]?.sort || "desc") +
            (filter.value ? "&filter=" + filter.value : "")
        )
        .then(async (res) => {
          res = await res.json();
          params.success({
            rowData: res.data,
            rowCount: res.page.count,
          });
        })
        .catch((err) => {
          params.fail();
        });
    },
  };
}

function updateRow(event) {
  if (!user.value) {
    return;
  }
  const updateData = {
    [event.colDef.field]: event.newValue,
  };
  api
    .patch("modbusRegisters/" + event.data.id, { json: updateData })
    .then(async (res) => {
      res = await res.json();
      if (res) {
        gridApi.value.refreshServerSide();
        $q.notify({
          type: "positive",
          message: "Successfully updated",
        });
      }
    })
    .catch((err) => {
      $q.notify({
        type: "negative",
        message: "Update failed! " + err.message,
      });
      console.log(err);
    });
}

function saveNewRow() {
  if (!user.value) {
    return;
  }
  api
    .post("modbusRegisters", { json: newItem.value })
    .then(async (res) => {
      res = await res.json();
      gridApi.value.applyServerSideTransaction({
        addIndex: 0,
        add: [res],
      });
      $q.notify({
        type: "positive",
        message: "Successfully added",
      });
    })
    .catch((err) => {
      $q.notify({
        type: "negative",
        message: "Save failed! " + err.message,
      });
    });

  newItem.value = structuredClone(emptyNewItem);
  createItemDialog.value = false;
}

function getNotifications() {
  return api
    .get("modbusRegisterNotifications")
    .then(async (res) => {
      const data = await res.json();
      return data;
    })
    .catch((err) => {
      console.log(err);
      return [];
    });
}
function notificationstatusChange(notification, status) {
  api
    .patch("modbusRegisterNotifications" + "/" + notification.id + "/status", {
      json: { status: status },
    })
    .then(async (res) => {
      notification.status = status;
    })
    .catch((err) => {
      console.log(err);
      $q.notify({
        type: "negative",
        message: err.message,
      });
    });
}
</script>

<style>
.toolbar-input {
  color: white;
  width: 30%;
}
.toolbar-input input {
  color: white;
}
.q-field--focused.toolbar-input input,
.q-field--focused.toolbar-input .q-icon {
  color: black !important;
}

.data-table {
  max-height: 100%;
}
.ag-row .row-actions {
  visibility: hidden;
  position: absolute;
  top: 0;
  right: 0;
}
.ag-row:hover .row-actions {
  visibility: visible;
}
</style>
