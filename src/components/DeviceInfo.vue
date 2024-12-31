<style scoped>
.dvcontainer {
  max-width: 99%;
}

.graphic-label {
  margin-top: 11px;
}
</style>

<template>

  <div class=".dvcontainer">
    <div class="q-pa-sm row ">
      <q-input class="col-12 col-sm-12" ref="filterRef" filled v-model="filter"
        label="Search - only filters labels that have also '(*)'">
        <template v-slot:append>
          <q-icon v-if="filter !== ''" name="clear" class="cursor-pointer" @click="resetFilter" />
        </template>
      </q-input>
    </div>

    <div class="q-pa-sm row">
      <q-tree class="col-12 col-sm-4" :nodes="simple" node-key="label" tick-strategy="leaf" v-model:selected="selected"
        v-model:ticked="ticked" v-model:expanded="expanded" />

      <div class="col-12 col-sm-8">

        <q-list style="background: #f0f0f0;font-weight: 600;font-size: 13px;">
          <q-item style="padding: 0; min-height: 35px;">
            <q-item-section top class="col-1">
              <q-item-label></q-item-label>
            </q-item-section>
            <q-item-section top class="col-1">
              <q-item-label class="q-mt-sm">Graphic</q-item-label>
            </q-item-section>
            <q-item-section top class="col-4">
              <q-item-label class="q-mt-sm">Full Label</q-item-label>
            </q-item-section>
            <q-item-section top class="col-3">
              <q-item-label class="q-mt-sm">Label</q-item-label>
            </q-item-section>
            <q-item-section top class="col-2">
              <q-item-label class="q-mt-sm">Element Count</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-separator color="grey" style="margin-top: 2px;margin-bottom: 2px;" />

        <q-list v-for="graphic in graphicList" :key="graphic.id">
          <q-item tag="label" style="padding:0px;min-height: 35px;border-bottom: 1px solid #f0f0f0;font-size: 13px;">
            <q-item-section top class="col-1">
              <q-radio v-model="color" val="blue" color="blue" checked-icon="task_alt"
                unchecked-icon="panorama_fish_eye" />
            </q-item-section>
            <q-item-section top class="col-1">
              <q-item-label class="graphic-label">{{ graphic.id }}</q-item-label>
            </q-item-section>
            <q-item-section top class="col-4">
              <q-item-label class="graphic-label">{{ graphic.fullLabel }}</q-item-label>
            </q-item-section>
            <q-item-section top class="col-3">
              <q-item-label class="graphic-label">{{ graphic.label }}</q-item-label>
            </q-item-section>
            <q-item-section top class="col-2">
              <q-item-label class="graphic-label">{{ graphic.elementCount }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, ref } from 'vue'
import MockData from 'src/lib/T3000/Hvac/Data/MockData'

export default defineComponent({
  name: 'NewTopBar',

  props: {
    locked: {
      type: Boolean,
      default: false
    },
    grpNav: {
      type: Array,
      default: () => []
    }
  },

  emits: ["navGoBack", "lockToggle"],

  data() {
    return {
      treeData: [
        { id: 1, name: 'Node 1', children: [{ id: 2, name: 'Child 1' }, { id: 3, name: 'Child 2' }] },
        { id: 4, name: 'Node 2', children: [{ id: 5, name: 'Child 3' }] }
      ],
      listData: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ]
    };
  },

  setup(props, { emit }) {
    console.log('==== device', MockData.DeviceList)

    const filter = ref('de');
    const filterRef = ref(null);
    const selected = ref('Pleasant surroundings');
    const ticked = ref(['Quality ingredients', 'Good table presentation']);
    const expanded = ref(['All Devices', 'Satisfied customers', 'Good service (disabled node)', 'Pleasant surroundings']);
    const simple = MockData.DeviceList;
    const color = ref('cyan');
    const graphicList = MockData.GraphicList;


    const myFilterMethod = (node, filter) => {
      const filt = filter.toLowerCase()
      return node.label && node.label.toLowerCase().indexOf(filt) > -1 && node.label.toLowerCase().indexOf('(*)') > -1
    }

    const resetFilter = () => {
      filter.value = ''
      filterRef.value.focus()
    }


    return {
      filter,
      filterRef,
      selected,
      ticked,
      expanded,
      simple,
      myFilterMethod,
      resetFilter,
      color,
      graphicList
    }
  }
});

</script>
