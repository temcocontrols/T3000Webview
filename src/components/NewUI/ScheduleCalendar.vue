
<template>
  <div class="schedule-calendar">
    <a-table
      :columns="columns"
      :dataSource="processedData"
      :pagination="pagination"
      :loading="loading"
      :rowSelection="rowSelection"
      :rowKey="rowKey"
      :scroll="scroll"
      @change="handleTableChange"
    >
      <template #[slotName]="data" v-for="slotName in Object.keys($slots)">
        <slot :name="slotName" v-bind="data"></slot>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import type { TableProps, TablePaginationConfig, TableColumnProps } from 'ant-design-vue';

export default defineComponent({
  name: 'ScheduleCalendar',
  props: {
    columns: {
      type: Array as PropType<TableColumnProps[]>,
      required: true,
    },
    dataSource: {
      type: Array as PropType<Record<string, any>[]>,
      default: () => [],
    },
    pagination: {
      type: [Object, Boolean] as PropType<TablePaginationConfig | false>,
      default: () => ({
        current: 1,
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total: number) => `Total ${total} items`,
      }),
    },
    loading: {
      type: Boolean,
      default: false,
    },
    rowSelection: {
      type: Object as PropType<TableProps['rowSelection']>,
      default: undefined,
    },
    rowKey: {
      type: [String, Function] as PropType<string | ((record: any) => string)>,
      default: 'key',
    },
    scroll: {
      type: Object as PropType<{ x?: number | string | true; y?: number | string }>,
      default: () => ({}),
    },
  },
  emits: ['change', 'selection-change', 'row-click'],

  setup(props, { emit }) {
    // Process data to ensure each row has a key
    const processedData = computed(() => {
      return props.dataSource.map((item, index) => {
        return { ...item, key: item.key ?? index.toString() };
      });
    });

    // Handle table change events
    const handleTableChange = (
      pagination: TablePaginationConfig,
      filters: Record<string, any>,
      sorter: any,
    ) => {
      emit('change', { pagination, filters, sorter });
    };

    return {
      processedData,
      handleTableChange,
    };
  },
});
</script>

<style scoped>
.schedule-calendar {
  width: 100%;
}
</style>
