<template>
  <q-dialog :model-value="active" @update:model-value="$emit('update:active', $event)" @show="defaultStatus">
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add Item</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="height: 50vh" class="scroll">
        <q-select :option-label="entryLabel" option-value="id" filled use-input hide-selected fill-input
          input-debounce="0" v-model="dialog.point" :options="selectPanelOptions" @filter="selectPanelFilterFn"
          label="Select Entry" class="mb-6" />
        <q-select emit-value filled map-options v-model="dialog.type" :options="itemTypes" label="Chart Type"
          class="mb-6" />
        <q-select filled v-model="dialog.unit" :options="itemUnits" label="Unit" class="mb-6" />
        <div class="flex no-wrap gap-3 mb-6">
          <q-input label="Min" v-model.number="dialog.min" filled type="number" class="grow" />
          <q-input label="Max" v-model.number="dialog.max" filled type="number" class="grow" />
        </div>
        <div class="flex flex-col no-wrap">
          <div class="flex no-wrap mb-2">
            <h2 class="leading-5 font-bold grow">Colors: </h2>
            <q-btn size="sm" round color="grey-4" text-color="grey-9" icon="add"
              @click="() => dialog.colors.push({ offset: 1, color: '#000000' })" />
          </div>

          <div class="flex flex-col no-wrap gap-1">
            <div class="flex items-center no-wrap mb-2" v-for="(cItem, index) in dialog.colors" :key="index">
              <q-input label="Offset" v-model.number="cItem.offset" filled type="number" step="0.1" min="0" max="1"
                class="mr-2 w-24" />
              <q-input filled v-model="cItem.color" label="Color" class="grow">
                <template v-slot:append>
                  <q-icon name="colorize" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-color v-model="
                        cItem.color
                      " />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
              <div class="px-8"><q-btn size="xs" round color="red-10" icon="remove"
                  @click="() => dialog.colors.splice(index, 1)" /></div>

            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" :disable="!dialog.point" color="primary" @click="addItemSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { PROPERTIES } from 'moveable';
import { defineComponent, onMounted, ref, toRaw } from 'vue'
const emptyItemDialog = {
  point: null,
  active: false, type: "gauge", unit: "%", min: 0, max: 100,
  colors: [
    { offset: 0.3, color: '#14BE64' },
    { offset: 0.7, color: '#FFB100' },
    { offset: 1, color: '#fd666d' },
  ]
}

export default defineComponent({
  name: 'AddEditDashboardItem',
  props: {
    active: Boolean,
    data: {
      type: Object,
      default: () => emptyItemDialog
    },
    panelsData: Array,
    action: String
  },
  emits: ['update:active', 'itemAdded', 'itemEdited'],
  setup(props, { emit }) {
    const itemUnits = [
      "%",
      "%RH",
      "Volts",
      "KV",
      "Amps",
      "ma",
      "Watts",
      "KWatts",
      "KWH",
      "°C",
      "°F",
      "FPM",
      "Pascals",
      "KPascals",
      "lbs/sqr.inch",
      "Inches ofWC",
      "CFM",
      "Seconds",
      "Minutes",
      "Hours",
      "Days",
      "Time",
      "p/min",
      "Ohms",
      "Counts",
      "%Open",
      "Kg",
      "L/Hour",
      "GPH",
      "GAL",
      "CF",
      "BTU",
      "CMH",
    ];
    const itemTypes = [
      {
        label: "Gauge",
        value: "gauge",
      },
      {
        label: "Dial",
        value: "dial",
      },
    ];



    const dialog = ref(emptyItemDialog)
    const selectPanelOptions = ref([])
    onMounted(() => {
      defaultStatus()
    })

    function defaultStatus() {
      if (PROPERTIES.action === "Edit") {
        dialog.value = props.data
      } else {
        dialog.value = structuredClone(emptyItemDialog)
      }
      selectPanelOptions.value = props.panelsData;
    }

    function selectPanelFilterFn(val, update) {
      if (val === "") {
        update(() => {
          selectPanelOptions.value = props.panelsData;

          // here you have access to "ref" which
          // is the Vue reference of the QSelect
        });
        return;
      }

      update(() => {
        const keyword = val.toUpperCase();
        selectPanelOptions.value = props.panelsData.filter(
          (item) =>
            item.command.toUpperCase().indexOf(keyword) > -1 ||
            item.description.toUpperCase().indexOf(keyword) > -1 ||
            item.label.toUpperCase().indexOf(keyword) > -1
        );
      });
    }

    function addItemSave() {
      const addItemData = structuredClone(toRaw(dialog.value))
      const colors = addItemData.type === "gauge" ?
        addItemData.colors.map(item => [item.offset, item.color]) :
        addItemData.colors.map(item => item.color).reverse().toString()
      emit('itemAdded', {
        type: addItemData.type,
        unit: addItemData.unit,
        min: addItemData.min,
        max: addItemData.max,
        colors,
        t3Entry: addItemData.point,
      })
    }

    function entryLabel(option) {
      let prefix = (option.description && option.id !== option.description) || (!option.description && option.id !== option.label) ? option.id + ' - ' : ''
      prefix = !option.description && !option.label ? option.id : prefix
      return prefix + (option.description || option.label)
    }

    return { dialog, itemUnits, itemTypes, selectPanelOptions, defaultStatus, selectPanelFilterFn, addItemSave, entryLabel }
  }
})
</script>

