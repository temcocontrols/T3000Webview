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
          @update:model-value="() => gridApi.onFilterChanged()"
          @change="() => gridApi.onFilterChanged()"
        >
          <template #prepend>
            <q-icon v-if="filter === ''" name="search" color="white" />
            <q-icon
              v-else
              name="clear"
              color="white"
              class="cursor-pointer"
              @click="filter = ''"
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
        :autoSizeStrategy="autoSizeStrategy"
        :defaultColDef="defaultColDef"
        rowModelType="serverSide"
        :enableBrowserTooltips="true"
        :suppressCsvExport="true"
        :suppressExcelExport="true"
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
import api from "../../lib/api";
import { globalNav, modbusRegColumns } from "../../lib/common";
import UserTopBar from "../../components/UserTopBar.vue";

ModuleRegistry.registerModules([ServerSideRowModelModule]);

const filter = ref("");

const gridApi = ref();
const defaultColDef = ref({
  minWidth: 70,
  suppressMenu: true,
  editable: true,
});

window.onbeforeunload = () => {
  const state = gridApi.value.getColumnState();
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
};

onMounted(() => {
  globalNav.value.title = "Modbus Register";
  globalNav.value.back = null;
});

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
</style>
