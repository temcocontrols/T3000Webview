<template>
  <div class="flex flex-col flex-nowrap h-screen overflow-hidden">
    <user-top-bar class="flex-none">
      <template v-slot:action-btns>
        <q-separator vertical color="white" spaced inset />
        <template v-if="user && isAdmin(user)">
          <q-btn-toggle
            v-model="liveMode"
            no-caps
            rounded
            unelevated
            dense
            size="0.8rem"
            toggle-color="white"
            color="blue-6"
            text-color="white"
            toggle-text-color="black"
            padding="2px 10px"
            :options="[
              { label: 'Offline Mode', value: false },
              { label: 'Live Mode', value: true, disable: !isOnline },
            ]"
          />
          <q-separator vertical color="white" spaced inset />
          <template v-if="liveMode">
            <q-btn-toggle
              v-model="activeTab"
              @update:model-value="triggerFilterChanged()"
              no-caps
              rounded
              unelevated
              dense
              size="0.8rem"
              toggle-color="white"
              color="blue-6"
              text-color="white"
              toggle-text-color="black"
              padding="2px 10px"
              :options="[
                { label: 'All Entries', value: 'all' },
                { label: 'User Pending Changes', value: 'changes' },
              ]"
            />
            <q-separator vertical color="white" spaced inset />
          </template>
        </template>
        <q-btn
          icon="add_circle"
          label="Add New Row"
          @click="createItemDialog = true"
          color="white"
          text-color="grey-8"
          size="0.7rem"
          no-caps
          dense
          padding="3px 5px"
        />
      </template>
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
          <q-menu @show="loadNotifications()">
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
                        @click="notificationStatusChange(notification, 'READ')"
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
                          @click="
                            notificationChangesReviewAction(
                              notification.entry,
                              notification.type
                            )
                          "
                        />
                        <q-btn
                          v-else-if="notification.type === 'ADMIN_ENTRY_ADDED'"
                          flat
                          size="0.7rem"
                          label="Review"
                          @click="
                            notificationChangesReviewAction(
                              notification.entry,
                              notification.type
                            )
                          "
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
                            notificationStatusChange(notification, 'ARCHIVED')
                          "
                        />
                      </template>
                      <q-btn
                        v-else-if="notification.status === 'READ'"
                        flat
                        size="0.7rem"
                        label="Mark as unread"
                        @click="
                          notificationStatusChange(notification, 'UNREAD')
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
          <q-tooltip>Notifications</q-tooltip>
        </q-btn>
        <!-- Disable for now -->
        <!-- <q-btn
          flat
          round
          dense
          icon="settings"
          class="mr-2"
          @click="openSettingsDialog"
        >
          <q-tooltip>Settings</q-tooltip>
        </q-btn> -->
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
        :enableCellChangeFlash="true"
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
          SelectEditor,
        }"
        :context="gridContext"
      ></ag-grid-vue>
    </q-page>
  </div>
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
            v-model.number="newItem.register_address"
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
            v-model.number="newItem.register_length"
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
                  reviewRowChangesDialog.entry[col] !==
                  reviewRowChangesDialog.entry.parent[col]
                "
              >
                <th class="text-left">
                  {{
                    modbusRegColumns.find((c) => c.field === col)?.headerName
                  }}
                </th>
                <td class="text-left">
                  {{ reviewRowChangesDialog.entry.parent[col] }}
                </td>
                <td class="text-left">
                  {{ reviewRowChangesDialog.entry[col] }}
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
          @click="rejectEntryChanges(reviewRowChangesDialog.entry)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveEntryChanges(reviewRowChangesDialog.entry)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="reviewAllRowChangesDialog.active" persistent>
    <q-card style="width: 1000px">
      <q-card-section>
        <div class="text-h6">Review row changes</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table class="w-full">
          <thead>
            <tr>
              <th class="text-left">Actions</th>
              <th class="text-left">User</th>
              <th
                class="text-left"
                v-for="col in modbusRegColumns.filter((c) => c.field !== 'id')"
                :key="col.field"
              >
                {{ col.headerName }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left"></td>
              <td class="text-left font-bold">Original</td>
              <td
                class="text-left font-bold"
                v-for="col in modbusRegColumns.filter((c) => c.field !== 'id')"
                :key="col.field"
              >
                {{ reviewAllRowChangesDialog.entry[col.field] }}
              </td>
            </tr>
            <template
              v-for="rev in reviewAllRowChangesDialog.entry.revisions"
              :key="rev.id"
            >
              <tr>
                <td class="text-left">
                  <div class="flex flex-nowrap gap-2" v-if="!rev.action">
                    <q-btn
                      color="primary"
                      size="sm"
                      dense
                      no-caps
                      label="Approve"
                      class="px-1"
                      @click="approveEntryChanges(rev)"
                    />
                    <q-btn
                      color="negative"
                      size="sm"
                      dense
                      no-caps
                      label="Reject"
                      class="px-1"
                      @click="rejectEntryChanges(rev)"
                    />
                  </div>
                  <div v-else>
                    <q-chip
                      v-if="rev.action === 'APPROVED'"
                      dense
                      color="primary"
                      text-color="white"
                      icon="check_circle"
                      size="0.7rem"
                    >
                      Approved
                    </q-chip>
                    <q-chip
                      v-else
                      dense
                      color="negative"
                      text-color="white"
                      icon="cancel"
                      size="0.7rem"
                    >
                      Rejected
                    </q-chip>
                  </div>
                </td>
                <td class="text-left font-bold text-sky-500">
                  {{ rev.user.name }}
                </td>
                <td
                  class="text-left"
                  v-for="col in modbusRegColumns.filter(
                    (c) => c.field !== 'id'
                  )"
                  :key="col.field"
                  :class="{
                    'bg-yellow-2':
                      rev[col.field] !==
                      reviewAllRowChangesDialog.entry[col.field],
                  }"
                >
                  {{ rev[col.field] }}
                </td>
              </tr>
            </template>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Close"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewAllRowChangesDialog.active = false"
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
                {{ reviewRowAddedDialog.entry[col] }}
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
          @click="rejectEntryChanges(reviewRowAddedDialog.entry)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveEntryChanges(reviewRowAddedDialog.entry)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <!-- Settings dialog -->
  <q-dialog v-model="settingsDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Settings</div>
      </q-card-section>
      <q-separator />
      <q-form ref="form" class="flex flex-col" @submit="saveSettings">
        <q-card-section class="scroll">
          <q-list bordered class="rounded-borders">
            <q-expansion-item
              expand-separator
              icon="perm_identity"
              label="Sync Data"
              caption="Pull & push data to the public modbus registry"
              default-opened
            >
              <q-card>
                <q-card-section>
                  <q-option-group
                    v-model="settingsDialog.settings.syncData"
                    :options="[
                      { label: 'Offline Only', value: 'OFFLINE' },
                      { label: 'Sync Data', value: 'SYNC' },
                    ]"
                  />
                  <div
                    v-if="settingsDialog.settings.syncData === 'SYNC'"
                    class="flex flex-col ml-4"
                  >
                    <q-toggle
                      v-model="settingsDialog.settings.push"
                      label="Push my changes to the public registry"
                    />
                    <q-toggle
                      v-model="settingsDialog.settings.pull"
                      label="Pull data from the public registry"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="mt-0">
          <q-btn
            label="Cancel"
            color="primary"
            flat
            class="q-ml-sm"
            @click="settingsDialog.active = false"
          />
          <q-btn label="Save" type="submit" color="primary" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import "ag-grid-enterprise/styles/ag-grid.css";
import "ag-grid-enterprise/styles/ag-theme-quartz.css";
import "ag-grid-enterprise";
import {
  ref,
  onMounted,
  onBeforeUnmount,
  onBeforeMount,
  watch,
  toRaw,
} from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { ServerSideRowModelModule, ModuleRegistry } from "ag-grid-enterprise";
import { useQuasar, debounce } from "quasar";
import { liveApi, localApi } from "../../lib/api";
import {
  globalNav,
  modbusRegColumns,
  cellClassRules,
  columnTypes,
  user,
  operationOptions,
  dataFormatOptions,
  isAdmin,
  getModbusRegisterSettings,
} from "../../lib/common";
import UserTopBar from "../../components/UserTopBar.vue";

import RowActionsRenderer from "../../components/grid/RowActionsRenderer.vue";
import SelectEditor from "../../components/grid/SelectEditor.vue";

ModuleRegistry.registerModules([ServerSideRowModelModule]);

const $q = useQuasar();
const filter = ref("");

const gridApi = ref();
const getRowId = ref();
const defaultColDef = ref({
  minWidth: 70,
  suppressHeaderMenuButton: true,
  cellClassRules: cellClassRules,
  editable: () => true,
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

const reviewRowChangesDialog = ref({ active: false, entry: null });

const reviewRowAddedDialog = ref({ active: false, entry: null });

const reviewAllRowChangesDialog = ref({ active: false, entry: null });

const triggerFilterChanged = debounce(onFilterChanged, 500);

const selectDataFormatOptions = ref(dataFormatOptions);

const selectOperationOptions = ref(operationOptions);

const activeTab = ref("all");

const gridContext = ref({ activeTab });

const isOnline = ref(null);
const liveMode = ref(false);
let dismissOfflineNotif = null;
let intervalIsOnline = null;

const settings = ref({
  syncData: "OFFLINE",
  push: false,
  pull: false,
});

const settingsDialog = ref({
  active: false,
  settings: structuredClone(toRaw(settings.value)),
});

window.onbeforeunload = () => {
  const state = gridApi.value.getColumnState();
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
};

onBeforeMount(() => {
  getRowId.value = (params) => `${params.data.id}`;
});

onMounted(() => {
  heathCheck();
  globalNav.value.title = "Modbus Register";
  globalNav.value.back = null;
});

function heathCheck() {
  const socket = new WebSocket(process.env.API_WS_URL);
  socket.onopen = function () {
    if (dismissOfflineNotif) {
      dismissOfflineNotif();
    }
    intervalIsOnline = setInterval(() => {
      socket.send("statusCheck");
    }, 5000);
    isOnline.value = true;
  };

  socket.onclose = function (e) {
    clearisOnlineState();
    setTimeout(function () {
      heathCheck();
    }, 5000);
  };

  socket.onerror = function (err) {
    if (socket.readyState === WebSocket.CLOSED) {
      clearisOnlineState();
      setTimeout(function () {
        heathCheck();
      }, 5000);
      return;
    }
    socket.close();
  };
}

function clearisOnlineState() {
  if (intervalIsOnline) clearInterval(intervalIsOnline);
  if (isOnline.value) {
    if (dismissOfflineNotif) dismissOfflineNotif();
    dismissOfflineNotif = $q.notify({
      icon: "wifi_off",
      type: "negative",
      message: "You are offline!",
      timeout: 0,
      actions: [{ label: "Close", color: "white", handler: heathCheck }],
    });
  }
  isOnline.value = false;
}

function loadNotifications() {
  getNotifications().then((res) => {
    notifications.value = res;
  });
}

function onFilterChanged() {
  gridApi.value.onFilterChanged();
}

function onGridReady(params) {
  gridApi.value = params.api;
  const localState = localStorage.getItem("modbusRegisterGridState");
  if (localState && localState !== "undefined") {
    params.api.applyColumnState({
      state: JSON.parse(localState),
      applyOrder: true,
    });
  }
  var datasource = getServerSideDatasource();
  // register the datasource with the grid
  params.api.setGridOption("serverSideDatasource", datasource);
  params.api.addEventListener("cancelChanges", async (ev) => {
    if (isOnline.value === false && liveMode.value) {
      $q.notify({
        type: "negative",
        message: "You are offline!",
      });
      return;
    }
    await liveApi
      .patch("modbus-registers/" + ev.data.id + "/cancel", {})
      .then(async (_res) => {
        gridApi.value.refreshServerSide();
        $q.notify({
          type: "positive",
          message: "The row changes has been cancelled successfully",
        });
      });
  });

  params.api.addEventListener("deleteRow", async (ev) => {
    const api = liveMode.value ? liveApi : localApi;
    await api.delete("modbus-registers/" + ev.data.id).then(async (_res) => {
      gridApi.value.refreshServerSide();
      $q.notify({
        type: "positive",
        message: "The row has been deleted successfully",
      });
    });
  });

  params.api.addEventListener("reviewNewRow", async (ev) => {
    reviewRowAddedDialog.value = { active: true, entry: ev.data };
  });

  params.api.addEventListener("reviewAllRowChanges", async (ev) => {
    reviewAllRowChangesDialog.value = { active: true, entry: ev.data };
  });
}
function onFirstDataRendered(params) {}

onBeforeUnmount(() => {
  const state = gridApi.value.getColumnState();
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
});

const autoSizeStrategy = {
  type: "fitGridWidth",
  defaultMinWidth: 50,
};

function getServerSideDatasource() {
  const api = liveMode.value ? liveApi : localApi;
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
          "modbus-registers?limit=" +
            limit +
            "&offset=" +
            request.startRow +
            "&order_by=" +
            sortCol.colDef.field +
            "&order_dir=" +
            (request.sortModel[0]?.sort || "desc") +
            (filter.value ? "&filter=" + filter.value : "") +
            (activeTab.value === "changes" ? "&hasChanges=1" : "")
        )
        .then(async (res) => {
          res = await res.json();
          params.success({
            rowData: res.data,
            rowCount: res.count,
          });
        })
        .catch((_err) => {
          params.fail();
        });
    },
  };
}

function updateRow(event) {
  if (isOnline.value === false && liveMode.value) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  let api = liveMode.value ? liveApi : localApi;
  const updateData = {
    [event.colDef.field]: event.newValue,
  };
  api
    .patch("modbus-registers/" + event.data.id, { json: updateData })
    .then(async (res) => {
      res = await res.json();
      if (res) {
        gridApi.value.refreshServerSide();
        setTimeout(() => {
          gridApi.value.refreshCells({
            force: true,
            rowNodes: [event.node],
            suppressFlash: true,
          });
        }, 500);

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
  if (isOnline.value === false && liveMode.value) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  let api = liveMode.value ? liveApi : localApi;
  api
    .post("modbus-registers", { json: newItem.value })
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
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  try {
    const res = await liveApi.get(
      "modbus-register-notifications?offset=" + offset + "&limit=" + limit
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return [];
  }
}
function notificationStatusChange(notification, status) {
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  liveApi
    .patch(
      "modbus-register-notifications" + "/" + notification.id + "/status",
      {
        json: { status: status },
      }
    )
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

function notificationChangesReviewAction(entry, type) {
  if (type === "ADMIN_ENTRY_CHANGED") {
    reviewRowChangesDialog.value = { active: true, entry };
  } else if (type === "ADMIN_ENTRY_ADDED") {
    reviewRowAddedDialog.value = { active: true, entry };
  }
}

function loadMoreNotifications(_index, done) {
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  if (notifications.value.length < 10) return done(true);
  getNotifications(notifications.value.length, 10).then((data) => {
    if (data.length > 0) {
      notifications.value = notifications.value.concat(data);
      done();
    } else {
      done(true);
    }
  });
}
function rejectEntryChanges(entry) {
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  liveApi
    .patch("modbus-registers/" + entry.id + "/reject")
    .then(async (_res) => {
      $q.notify({
        type: "positive",
        message: "Successfully rejected",
      });
      gridApi.value.refreshServerSide();
    });
  reviewRowAddedDialog.value.active = false;
  reviewRowChangesDialog.value.active = false;
  entry.action = "REJECTED";
  updateEntryRelatedNotificationStatus(entry, "ADMIN_REJECTED");
}

function approveEntryChanges(entry) {
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  liveApi
    .patch("modbus-registers/" + entry.id + "/approve")
    .then(async (_res) => {
      $q.notify({
        type: "positive",
        message: "Successfully approved",
      });
      gridApi.value.refreshServerSide();
      entry.action = "APPROVED";
    });
  reviewRowAddedDialog.value.active = false;
  reviewRowChangesDialog.value.active = false;
  updateEntryRelatedNotificationStatus(entry, "ADMIN_APPROVED");
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

function updateEntryRelatedNotificationStatus(entry, status) {
  const notification = notifications.value.find(
    (n) =>
      n.entryId === entry.id &&
      n.userRefId === entry.userId &&
      n.group === "ADMINS" &&
      n.status === "UNREAD"
  );
  if (notification) {
    notification.status = status;
  }
}

watch(liveMode, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    var datasource = getServerSideDatasource();
    // register the datasource with the grid
    gridApi.value.setGridOption("serverSideDatasource", datasource);
    onFilterChanged();
  }
});

watch(user, (newVal, oldVal) => {
  if (newVal) {
    loadNotifications();
    settings.value = getModbusRegisterSettings() || settings.value;
  }
});

function openSettingsDialog() {
  settingsDialog.value.active = true;
  settingsDialog.value.settings = structuredClone(toRaw(settings.value));
}

function saveSettings() {
  settingsDialog.value.active = false;
  settings.value = structuredClone(toRaw(settingsDialog.value.settings));
  localStorage.setItem(
    "modbusRegisterSettings",
    JSON.stringify(toRaw(settings.value))
  );
  $q.notify({
    type: "positive",
    message: "Settings saved successfully",
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
