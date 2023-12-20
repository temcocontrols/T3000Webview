<template>
  <q-page class="flex justify-center p-4">
    <div class="flex flex-col w-full mx-2">
      <q-table
        :rows="data"
        :columns="columns"
        row-key="id"
        :wrap-cells="true"
        table-header-style="white-space: nowrap;"
        :pagination="pagination"
      />
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from "vue";
import api from "../../lib/api";
import { globalNav } from "../../lib/common";

const data = ref([]);
const pagination = ref({
  sortBy: "id",
  descending: true,
  page: 1,
  rowsPerPage: 30,
  rowsNumber: 30,
});
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
  api
    .get("modbusRegisters?limit=30")
    .then(async (res) => {
      res = await res.json();
      data.value = res.data;
      pagination.value.rowsNumber = res.page.count;
    })
    .catch((err) => {});
});
</script>
<style></style>
