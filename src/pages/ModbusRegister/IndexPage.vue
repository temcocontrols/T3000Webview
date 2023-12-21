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
      class="flex justify-center p-3 flex-1 overflow-hidden"
      :style-fn="() => {}"
    >
      <q-table
        ref="tableRef"
        flat
        bordered
        :rows="data"
        :columns="columns"
        row-key="id"
        :wrap-cells="true"
        table-header-style="white-space: nowrap;"
        v-model:pagination="pagination"
        :filter="filter"
        binary-state-sort
        :loading="loading"
        @request="onRequest"
        class="data-table w-full h-full"
      >
      </q-table>
    </q-page>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import api from "../../lib/api";
import { globalNav } from "../../lib/common";
import UserTopBar from "../../components/UserTopBar.vue";

const tableRef = ref();
const loading = ref(false);
const data = ref([]);
const pagination = ref({
  sortBy: "id",
  descending: true,
  page: 1,
  rowsPerPage: 30,
  rowsNumber: 30,
});
const filter = ref("");
const columns = [
  {
    label: "#",
    name: "id",
    field: "id",
    align: "left",
    sortable: true,
  },
  {
    label: "Register Address",
    name: "register_address",
    field: "register_address",
    align: "left",
    sortable: true,
  },
  {
    label: "Operation",
    name: "operation",
    field: "id",
    align: "left",
    sortable: true,
  },
  {
    label: "Register Length",
    name: "register_length",
    field: "register_length",
    align: "left",
    sortable: true,
  },
  {
    label: "Register Name",
    name: "register_name",
    field: "register_name",
    align: "left",
    sortable: true,
  },
  {
    label: "Data Format",
    name: "data_format",
    field: "data_format",
    align: "left",
    sortable: true,
  },
  {
    label: "Description",
    name: "description",
    field: "description",
    align: "left",
    sortable: false,
  },
  {
    label: "Device Type",
    name: "device_name",
    field: "device_name",
    align: "left",
    sortable: true,
  },
];

onMounted(async () => {
  globalNav.value.title = "Modbus Register";
  globalNav.value.back = null;
  tableRef.value.requestServerInteraction();
});
function onRequest(props) {
  const { page, rowsPerPage, sortBy, descending } = props.pagination;
  const filter = props.filter;

  loading.value = true;
  const fetchCount =
    rowsPerPage === 0 ? pagination.value.rowsNumber : rowsPerPage;
  api
    .get(
      "modbusRegisters?limit=" +
        fetchCount +
        "&offset=" +
        (page - 1) * rowsPerPage +
        "&orderBy=" +
        sortBy +
        "&orderDir=" +
        (descending ? "desc" : "asc") +
        (filter ? "&filter=" + filter : "")
    )
    .then(async (res) => {
      res = await res.json();
      data.value = res.data;
      pagination.value.rowsNumber = res.page.count;
      data.value.splice(0, data.value.length, ...res.data);

      // don't forget to update local pagination object
      pagination.value.page = page;
      pagination.value.rowsPerPage = rowsPerPage;
      pagination.value.sortBy = sortBy;
      pagination.value.descending = descending;
    })
    .catch((err) => {})
    .finally(() => {
      loading.value = false;
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
</style>
