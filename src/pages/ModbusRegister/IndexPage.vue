<template>
  <div class="flex flex-col flex-nowrap h-screen overflow-hidden">
    <user-top-bar class="flex-none">
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
import { ref, onMounted, onBeforeUnmount } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { ServerSideRowModelModule, ModuleRegistry } from "ag-grid-enterprise";
import { useQuasar, debounce } from "quasar";
import api from "../../lib/api";
import {
  globalNav,
  isAdmin,
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
const defaultColDef = ref({
  minWidth: 70,
  suppressMenu: true,
  cellClassRules: cellClassRules,
  editable: () => !!user.value,
});

const triggerFilterChanged = debounce(onFilterChanged, 500);

window.onbeforeunload = () => {
  const state = gridApi.value.getColumnState();
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
};

onMounted(() => {
  globalNav.value.title = "Modbus Register";
  globalNav.value.back = null;
});

function onFilterChanged() {
  gridApi.value.onFilterChanged();
}

function onGridReady(params) {
  gridApi.value = params.api;
  var datasource = getServerSideDatasource();
  // register the datasource with the grid
  params.api.setGridOption("serverSideDatasource", datasource);
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
          if (user.value && !isAdmin(user.value)) {
            res.data = res.data.map((oItem) => {
              if (
                oItem.revisions &&
                oItem.revisions.length > 0 &&
                ["UNDER_REVIEW", "REVISION"].includes(oItem.revisions[0].status)
              ) {
                return { ...oItem.revisions[0], id: oItem.id };
              }
              return oItem;
            });
          }
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
.ag-row .status-message-btn {
  display: none;
}
.ag-row:hover .status-message-btn {
  display: block;
}
</style>
