<!-- Component: AppTabs -->
<!--
  This component represents a set of tabs for navigating different sections of an application. It uses the Quasar framework for UI components.
  The `modelValue` prop is used to bind the currently active tab.
  The component emits the `update:modelValue` event when the active tab is changed. The event is emitted with the name of the selected tab as the payload.
  The component includes several tabs, including "Inputs", "Outputs", "Variables", "Programs", "PIDs", "Graphics", "Holidays", "Schedules". Each tab has an associated icon and label.
-->
<script>
export default {
  props: {
    modelValue: {
      type: String,
      required: true,
    },
  },
  setup() {
    const d = new Date();
    return {
      year: d.getFullYear(),
    };
  },
};
</script>

<template>
  <q-tabs
    :model-value="modelValue"
    @update:model-value="(value) => $emit('update:modelValue', value)"
    inline-label
    indicator-color="pink-13"
    class="bg-primary text-white shadow-2"
  >
    <q-tab name="inputs" icon="input" label="Inputs" />
    <q-tab name="outputs" icon="output" label="Outputs" />
    <q-tab name="variables" icon="published_with_changes" label="Variables" />
    <q-tab name="programs" icon="apps" label="Programs" />
    <q-tab name="pids" icon="all_inclusive" label="PIDs" />
    <q-tab name="graphics" icon="photo" label="Graphics" />
    <q-tab name="holidays" icon="deck" label="Holidays" />
    <q-tab name="schedules" icon="schedule" label="Schedules" />
  </q-tabs>
</template>

<style></style>
