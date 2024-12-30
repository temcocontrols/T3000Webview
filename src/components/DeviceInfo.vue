<style scoped>
.container {
  display: flex;
}

.tree {
  width: 30%;
  border-right: 1px solid #ccc;
  padding: 10px;
}

.panel {
  width: 70%;
  padding: 10px;
}
</style>

<template>

  <div class="q-pa-md row q-col-gutter-sm">
    <q-input class="col-12 col-sm-12" ref="filterRef" filled v-model="filter"
      label="Search - only filters labels that have also '(*)'">
      <template v-slot:append>
        <q-icon v-if="filter !== ''" name="clear" class="cursor-pointer" @click="resetFilter" />
      </template>
    </q-input>
  </div>

  <div class="q-pa-md row q-col-gutter-sm">


    <q-tree class="col-12 col-sm-6" :nodes="simple" node-key="label" tick-strategy="leaf" v-model:selected="selected"
      v-model:ticked="ticked" v-model:expanded="expanded" />
    <div class="col-12 col-sm-6 q-gutter-sm">
      <div class="text-h6">Selected</div>
      <div>{{ selected }}</div>

      <q-separator spaced />

      <div class="text-h6">Ticked</div>
      <div>
        <div v-for="tick in ticked" :key="`ticked-${tick}`">
          {{ tick }}
        </div>
      </div>

      <q-separator spaced />

      <div class="text-h6">Expanded</div>
      <div>
        <div v-for="expand in expanded" :key="`expanded-${expand}`">
          {{ expand }}
        </div>
      </div>
    </div>
  </div>
  <!-- <div class="container">
    <div class="tree">
      <ul>
        <li v-for="node in treeData" :key="node.id">
          {{ node.name }}
          <ul v-if="node.children">
            <li v-for="child in node.children" :key="child.id">
              {{ child.name }}
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="panel">
      <ul>
        <li v-for="item in listData" :key="item.id">
          {{ item.name }}
        </li>
      </ul>
    </div>
  </div> -->
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
    console.log(MockData.DeviceList)
    return {
      selected: ref('Pleasant surroundings'),
      ticked: ref(['Quality ingredients', 'Good table presentation']),
      expanded: ref(['Satisfied customers', 'Good service (disabled node)', 'Pleasant surroundings']),

      simple: MockData.DeviceList
    }
  }
});

</script>
