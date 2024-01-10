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
          <q-select
            v-model="newItem.operation"
            use-input
            hide-selected
            fill-input
            clearable
            new-value-mode="add-unique"
            input-debounce="0"
            :options="selectOperationOptions"
            @filter="selectOperationFilter"
            label="Operation"
          />
          <q-input
            v-model="newItem.register_length"
            label="Register length"
            type="number"
            :rules="[
              (val) => (val && val > 0) || 'Please enter a positive number',
            ]"
          />
          <q-input v-model="newItem.register_name" label="Register name" />
          <q-select
            v-model="newItem.data_format"
            use-input
            hide-selected
            fill-input
            new-value-mode="add-unique"
            input-debounce="0"
            :options="selectDataFormatOptions"
            @filter="selectDataFormatFilter"
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

  <q-dialog v-model="reviewRowChangesDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Review user row changes</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table class="w-full">
          <thead>
            <tr>
              <th class="text-left">Column</th>
              <th class="text-left">Original value</th>
              <th class="text-left">New value</th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="col in [
                'register_address',
                'operation',
                'register_length',
                'register_name',
                'data_format',
                'description',
                'device_name',
              ]"
              :key="col"
            >
              <tr
                v-if="
                  reviewRowChangesDialog.notification.entry[col] !==
                  reviewRowChangesDialog.notification.entry.parent[col]
                "
              >
                <th class="text-left">
                  {{
                    modbusRegColumns.find((c) => c.field === col)?.headerName
                  }}
                </th>
                <td class="text-left">
                  {{ reviewRowChangesDialog.notification.entry.parent[col] }}
                </td>
                <td class="text-left">
                  {{ reviewRowChangesDialog.notification.entry[col] }}
                </td>
              </tr>
            </template>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Cancel"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewRowChangesDialog.active = false"
        />
        <q-btn
          label="Reject"
          color="negative"
          @click="rejectEntryChanges(reviewRowChangesDialog.notification)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveEntryChanges(reviewRowChangesDialog.notification)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="reviewRowAddedDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Review user new row</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table class="w-full">
          <thead>
            <tr>
              <th class="text-left">Register Address</th>
              <th class="text-left">Operation</th>
              <th class="text-left">Register Length</th>
              <th class="text-left">Register Name</th>
              <th class="text-left">Data Format</th>
              <th class="text-left">Description</th>
              <th class="text-left">Device Name</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                class="text-left"
                v-for="col in [
                  'register_address',
                  'operation',
                  'register_length',
                  'register_name',
                  'data_format',
                  'description',
                  'device_name',
                ]"
                :key="col"
              >
                {{ reviewRowAddedDialog.notification.entry[col] }}
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Cancel"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewRowAddedDialog.active = false"
        />
        <q-btn
          label="Reject"
          color="negative"
          @click="rejectEntryChanges(reviewRowAddedDialog.notification)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveEntryChanges(reviewRowAddedDialog.notification)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <div class="flex flex-col flex-nowrap h-screen overflow-hidden">
    <user-top-bar class="flex-none">
      <template v-slot:action-btns v-if="user">
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
      <template v-slot:buttons v-if="user">
        <q-btn flat round dense icon="notifications" class="ml-4 mr-2">
          <q-menu>
            <q-infinite-scroll @load="loadMoreNotifications" :offset="100">
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
                        v-else-if="
                          notification.type === 'USER_CHANGES_REJECTED'
                        "
                      />
                      <q-icon
                        name="account_circle"
                        size="lg"
                        v-else-if="notification.type.startsWith('ADMIN_')"
                      />
                      <q-icon name="chat" size="lg" v-else />
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
                      :class="{
                        'text-gray-400': notification.status !== 'UNREAD',
                      }"
                      >{{ notification.message }}</q-item-label
                    >
                    <q-item-label caption>{{
                      new Date(notification.createdAt).toLocaleString()
                    }}</q-item-label>
                    <div class="flex justify-end mt-1">
                      <q-btn
                        v-if="
                          notification.status === 'UNREAD' &&
                          !notification.type.startsWith('ADMIN_')
                        "
                        flat
                        color="primary"
                        size="0.7rem"
                        label="Mark as read"
                        @click="notificationstatusChange(notification, 'READ')"
                      />
                      <template
                        v-else-if="
                          notification.status === 'UNREAD' &&
                          notification.type.startsWith('ADMIN_')
                        "
                      >
                        <q-btn
                          v-if="notification.type === 'ADMIN_ENTRY_CHANGED'"
                          flat
                          size="0.7rem"
                          label="Review"
                          @click="notificationChangesReviewAction(notification)"
                        />
                        <q-btn
                          v-else-if="notification.type === 'ADMIN_ENTRY_ADDED'"
                          flat
                          size="0.7rem"
                          label="Review"
                          @click="notificationChangesReviewAction(notification)"
                        />
                      </template>
                      <template
                        v-else-if="
                          notification.status !== 'UNREAD' &&
                          notification.type.startsWith('ADMIN_')
                        "
                      >
                        <q-chip
                          v-if="notification.status === 'ADMIN_APPROVED'"
                          dense
                          color="primary"
                          text-color="white"
                          icon="check_circle"
                          size="0.7rem"
                        >
                          Approved
                        </q-chip>
                        <q-chip
                          v-else-if="notification.status === 'ADMIN_REJECTED'"
                          dense
                          color="negative"
                          text-color="white"
                          icon="cancel"
                          size="0.7rem"
                        >
                          Rejected
                        </q-chip>
                        <q-btn
                          flat
                          color="primary"
                          size="0.7rem"
                          label="Archive"
                          @click="
                            notificationstatusChange(notification, 'ARCHIVED')
                          "
                        />
                      </template>
                      <q-btn
                        v-else-if="notification.status === 'READ'"
                        flat
                        size="0.7rem"
                        label="Mark as unread"
                        @click="
                          notificationstatusChange(notification, 'UNREAD')
                        "
                      />
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="p-4 min-w-52">You have no notifications.</div>
              <template v-slot:loading>
                <div class="row justify-center q-my-md">
                  <q-spinner-dots color="primary" size="40px" />
                </div>
              </template>
            </q-infinite-scroll>
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
        @store-refreshed="gridApi.refreshCells({ force: true })"
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
import { ref, onMounted, onBeforeUnmount, onBeforeMount } from "vue";
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
  operation: "",
  register_length: null,
  register_name: "",
  data_format: null,
  description: "",
  device_name: null,
};
const newItem = ref(structuredClone(emptyNewItem));

const notifications = ref([]);

const reviewRowChangesDialog = ref({ active: false, notification: null });

const reviewRowAddedDialog = ref({ active: false, notification: null });

const triggerFilterChanged = debounce(onFilterChanged, 500);

const dataFormatOptions = [
  "8 Bit Unsigned Integer",
  "8 Bit Signed Integer",
  "16 Bit Unsigned Integer",
  "16 Bit Signed Integer",
  "16 Bit Unsigned Integer/10",
  "16 Bit Signed Integer/10",
  "16 Bit Unsigned Integer/100",
  "16 Bit Signed Integer/100",
  "32 Bit Unsigned Integer HI_LO",
  "32 Bit Unsigned Integer LO_HI",
  "32 Bit Signed Integer HI_LO",
  "32 Bit Signed Integer LO_HI",
  "Floating HI_LO/10",
  "Floating LO_HI/10",
  "Floating HI_LO/100",
  "Floating LO_HI/100",
  "Floating HI_LO/1000",
  "Floating LO_HI/1000",
  "Character String LO_HI",
  "Character String HI_LO",
  "32 Bit Float_ABCD",
  "32 Bit Float_CDAB",
  "32 Bit Float_BADC",
  "32 Bit Float_DCBA",
];
const selectDataFormatOptions = ref(dataFormatOptions);

const operationOptions = [
  "03 Read Holding Registers (4x)",
  "06 Read Write Single Register",
  "16 Read Write Multiple Registers",
  "03_06 Read Holding and Write Single",
  "03_16 Read Holding and Write Multiple",
  "01 Read Coils (0x)",
  "02 Read Discrete Inputs (1x)",
  "04 Read Input Registers (3x)",
  "05 Write Single Coil",
  "15 Write Multiple Coil",
];
const selectOperationOptions = ref(operationOptions);

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
      .then(async (_res) => {
        gridApi.value.refreshServerSide();
        $q.notify({
          type: "positive",
          message: "The row changes has been cancelled successfully",
        });
      });
  });

  params.api.addEventListener("deleteRow", async (ev) => {
    await api.delete("modbusRegisters/" + ev.data.id).then(async (_res) => {
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
        .catch((_err) => {
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

async function getNotifications(offset = 0, limit = 10) {
  try {
    const res = await api.get(
      "modbusRegisterNotifications?offset=" + offset + "&limit=" + limit
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return [];
  }
}
function notificationstatusChange(notification, status) {
  api
    .patch("modbusRegisterNotifications" + "/" + notification.id + "/status", {
      json: { status: status },
    })
    .then(async (_res) => {
      notification.status = status;
      if (status === "ARCHIVED") {
        notifications.value = notifications.value.filter(
          (n) => n.id !== notification.id
        );
      }
    })
    .catch((err) => {
      console.log(err);
      $q.notify({
        type: "negative",
        message: err.message,
      });
    });
}

function notificationChangesReviewAction(notification) {
  if (notification.type === "ADMIN_ENTRY_CHANGED") {
    reviewRowChangesDialog.value = { active: true, notification };
  } else if (notification.type === "ADMIN_ENTRY_ADDED") {
    reviewRowAddedDialog.value = { active: true, notification };
  }
}

function loadMoreNotifications(_index, done) {
  getNotifications(notifications.value.length, 10).then((data) => {
    if (data.length > 0) {
      notifications.value = notifications.value.concat(data);
      done();
    } else {
      done(true);
    }
  });
}
function rejectEntryChanges(notification) {
  api
    .patch("modbusRegisters/" + notification.entryId + "/reject")
    .then(async (_res) => {
      $q.notify({
        type: "positive",
        message: "Successfully rejected",
      });
    });
  reviewRowAddedDialog.value.active = false;
  reviewRowChangesDialog.value.active = false;
  notificationChangeStatus(notification, "ADMIN_REJECTED");
}

function approveEntryChanges(notification) {
  console.log(notification);
  api
    .patch("modbusRegisters/" + notification.entryId + "/approve")
    .then(async (_res) => {
      $q.notify({
        type: "positive",
        message: "Successfully approved",
      });
    });
  reviewRowAddedDialog.value.active = false;
  reviewRowChangesDialog.value.active = false;
  notificationChangeStatus(notification, "ADMIN_APPROVED");
}

async function notificationChangeStatus(notification, status) {
  const res = await api.patch(
    "modbusRegisterNotifications/" + notification.id + "/status",
    {
      json: { status },
    }
  );
  notification.status = status;
  return await res.json();
}

function selectDataFormatFilter(val, update, abort) {
  update(() => {
    const keyword = val.toLowerCase();
    selectDataFormatOptions.value = dataFormatOptions.filter(
      (v) => v.toLowerCase().indexOf(keyword) > -1
    );
  });
}

function selectOperationFilter(val, update, abort) {
  update(() => {
    const keyword = val.toLowerCase();
    selectOperationOptions.value = operationOptions.filter(
      (v) => v.toLowerCase().indexOf(keyword) > -1
    );
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
