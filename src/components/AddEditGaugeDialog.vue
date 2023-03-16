<template>
  <q-dialog :model-value="active" @update:model-value="$emit('update:active', $event)" @show="defaultStatus">
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <template v-if="action === 'Add'"> Add Item </template>
          <template v-else> Edit {{ dialog.type }} </template>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="height: 50vh" class="scroll">
        <q-select emit-value filled map-options v-model="dialog.type" :options="itemTypes" label="Chart Type"
          class="mb-6" />
        <div class="flex no-wrap gap-3 mb-6">
          <q-input label="Min" v-model.number="dialog.settings.min" filled type="number" class="grow" />
          <q-input label="Max" v-model.number="dialog.settings.max" filled type="number" class="grow" />
        </div>
        <div class="flex no-wrap gap-3 mb-6">
          <q-input v-if="dialog.type === 'Gauge'" label="Thickness ( px )" v-model.number="dialog.settings.thickness"
            filled type="number" class="grow" />
          <q-input label="Ticks" v-model.number="dialog.settings.ticks" filled type="number" class="grow" />
          <q-input label="Minor ticks" v-model.number="dialog.settings.minorTicks" filled type="number" class="grow" />
        </div>
        <div class="flex flex-col no-wrap">
          <div class="flex no-wrap mb-2">
            <h2 class="leading-5 font-bold grow">{{ dialog.type }} colors:</h2>
            <q-btn size="sm" round color="grey-4" text-color="grey-9" icon="add" @click="
              () =>
                dialog.settings.colors.push({ offset: 100, color: '#000000' })
            " />
          </div>

          <div class="flex flex-col no-wrap gap-1">
            <div class="flex items-center no-wrap mb-2" v-for="(cItem, index) in dialog.settings.colors" :key="index">
              <q-input label="Offset" v-model.number="cItem.offset" filled type="number" step="1" min="0" max="100"
                class="mr-2 w-24" />
              <div class="flex flex-nowrap items-center grow">
                <input type="color" id="bg-color-input" v-model="cItem.color" />
                <label class="ml-2" for="bg-color-input">Color</label>
              </div>
              <div class="px-8">
                <q-btn size="xs" round color="red-10" icon="remove"
                  @click="() => dialog.settings.colors.splice(index, 1)" />
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" color="primary" @click="itemSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent, onMounted, ref, toRaw } from "vue";

export default defineComponent({
  name: "AddEditDashboardItem",
  props: {
    active: Boolean,
    item: {
      type: Object,
      default: () => emptyItemDialog,
    },
    panelsData: Array,
    action: String,
  },
  emits: ["update:active", "itemSaved"],
  setup(props, { emit }) {
    const emptyItemDialog = {
      t3Entry: null,
      active: false,
      type: "Gauge",
      settings: {
        min: 0,
        max: 100,
        colors: [],
      },
    };
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
        value: "Gauge",
      },
      {
        label: "Dial",
        value: "Dial",
      },
    ];

    const dialog = ref(emptyItemDialog);
    onMounted(() => {
      defaultStatus();
    });

    function defaultStatus() {
      if (props.action === "Edit") {
        dialog.value = structuredClone(toRaw(props.item));
      } else {
        dialog.value = structuredClone(emptyItemDialog);
      }
    }

    function itemSave() {
      const item = structuredClone(toRaw(dialog.value));
      emit("itemSaved", item);
    }

    function entryLabel(option) {
      let prefix =
        (option.description && option.id !== option.description) ||
          (!option.description && option.id !== option.label)
          ? option.id + " - "
          : "";
      prefix = !option.description && !option.label ? option.id : prefix;
      return prefix + (option.description || option.label);
    }

    return {
      dialog,
      itemUnits,
      itemTypes,
      defaultStatus,
      itemSave,
      entryLabel,
    };
  },
});
</script>
