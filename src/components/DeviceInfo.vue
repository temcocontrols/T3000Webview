<style scoped>
.dvcontainer {
  max-width: 99%;
}

.graphic-label {
  margin-top: 11px;
}

::v-deep .q-input .q-field__control {
  border-radius: 0;
  /* background-color: #cef; */
  height: 35px;
}

::v-deep .q-input .q-field__marginal {
  border-radius: 0;
  /* background-color: #cef; */
  height: 35px;
}
</style>

<template>

  <div class=".dvcontainer">
    <div class="q-pa-sm row ">
    </div>

    <div class="q-pa-sm row">

      <div class="col-12 col-sm-4">
        <q-input ref="filterRef" filled v-model="filter" placeholder="Search here">
          <template v-slot:append>
            <q-icon v-if="filter !== ''" name="clear" class="cursor-pointer" @click="resetFilter" />
          </template>
        </q-input>

        <q-separator color="grey" style="margin-top: 2px;margin-bottom: 2px;" />

        <q-tree :nodes="simple" node-key="label" v-model:selected="selected" v-model:ticked="ticked"
          v-model:expanded="expanded" :filter="filter" :accordion=true style="max-height: 326px;overflow-y: auto;"
          selected-color="primary" @update:selected="treeSelected" />

      </div>

      <div class="col-12 col-sm-8" style="padding-left: 5px;">
        <q-list style="background: #f0f0f0;font-weight: 600;font-size: 13px;">
          <q-item style="padding: 0; min-height: 35px;">
            <q-item-section top class="col-1">
              <q-item-label style="margin-left: 5px;margin-top: 2px;">
                <q-btn class="gt-xs" size="12px" flat dense round icon="remove" @click="clearGraphicSelection">
                  <q-tooltip anchor="top middle" self="center right">
                    Clear selection
                  </q-tooltip>
                </q-btn>
              </q-item-label>
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
              <q-radio v-model="selectedDevice.graphic" :val=graphic.id color="blue" checked-icon="task_alt"
                unchecked-icon="panorama_fish_eye" @update:model-value="updateGraphicSelection" />
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

    const filter = ref('');
    const filterRef = ref(null);
    const selected = ref('Pleasant surroundings');
    const ticked = ref(['Quality ingredients', 'Good table presentation']);
    const expanded = ref(["All Devices"]);
    const simple = MockData.DeviceList;
    const color = ref('cyan');
    const graphicList = MockData.GraphicList;
    const selectedDevice = ref({ device: "", graphic: 3 });

    const myFilterMethod = (node, filter) => {
      const filt = filter.toLowerCase()
      return node.label && node.label.toLowerCase().indexOf(filt) > -1 && node.label.toLowerCase().indexOf('(*)') > -1
    }

    const resetFilter = () => {
      filter.value = ''
      filterRef.value.focus()
    }

    const clearGraphicSelection = () => {
      selectedDevice.value.graphic = 0;
      console.log('==== graphic-clear 1 selectedDevice:', [selectedDevice.value.device, selectedDevice.value.graphic]);

    }

    const updateGraphicSelection = (val) => {
      selectedDevice.value.graphic = val;
      console.log('==== graphic-selected 1 val:', val);
      console.log('==== graphic-selected 2 selectedDevice:', [selectedDevice.value.device, selectedDevice.value.graphic]);
    }

    const treeSelected = (target) => {
      console.log('==== tree-selected 1 target:', target)

      // Clear the icon for all nodes
      const clearIcons = (nodes) => {
        nodes.forEach(node => {
          if (node.label === 'All Devices') {
            node.icon = 'devices';
          } else {
            if (node.icon === undefined || node.icon === null) {
            } else {
              node.icon = 'horizontal_rule';
            }
          }
          if (node.children) {
            clearIcons(node.children);
          }
        });
      };

      const findAllNodes = (nodes, target) => {
        for (const node of nodes) {
          if (node.label === target) {
            return node;
          }
          if (node.children) {
            const found = findAllNodes(node.children, target);
            if (found) {
              return found;
            }
          }
        }
        return null;
      };

      clearIcons(simple);

      const selectedNode = findAllNodes(simple, target);
      if (selectedNode) {
        selectedNode.icon = 'check';
        selectedDevice.value.device = selectedNode.label;
      }

      clearGraphicSelection();

      console.log('==== graphic-selected 2 selectedDevice:', [selectedDevice.value.device, selectedDevice.value.graphic]);
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
      graphicList,
      selectedDevice,
      clearGraphicSelection,
      treeSelected,
      updateGraphicSelection
    }
  }
});

</script>
