<style scoped>
.tool-bar-container {
  display: flex;
}

.left-panel {
  width: 105px;
  background-color: #2a2a2a;
}

.right-panel {
  flex-grow: 1;
}

.right-tab {
  background-color: #2a2a2a;
}

.tool-title {
  width: 105px;
  height: 36px;
  padding-left: 10px;
  padding-top: 10px;
  color: #fff;
  /* background: red; */
}

.tool-btns {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  height: 54px;
  width: 105px;
  color: #fff;
  /* background-color: aqua; */
}

.tab-panel {
  background-color: #2a2a2a;
  color: #fff;
}

.home-panel {
  .container {
    display: flex;
    /* flex-wrap: wrap; */
    /* gap: 10px; */
  }

  .sub-div {
    display: flex;
    flex-direction: column;
    /* gap: 10px; */
    /* border: 1px solid #ccc; */
    padding-top: 2px;
  }

  .button-row {
    display: flex;
    /* gap: 5px; */
  }

  .q-btn {
    padding: 4px 10px;
  }
}

.file-panel {
  .container {
    display: flex;
    /* flex-wrap: wrap; */
    /* gap: 10px; */
    height: 53px;
  }

  .sub-div {
    display: flex;
    flex-direction: row;
    gap: 10px;
    /* border: 1px solid #ccc; */
    padding: 10px;
  }

  .button-row {
    display: flex;
    gap: 5px;
  }
}

.right-panel-card {
  box-shadow: none;
  /* border: 1px solid #ccc; */
  border-radius: 0px;
}

.home-panel {
  padding: 0px;
}

.file-panel {
  padding: 0px;

  .short-cut {
    padding-top: 8px;
    font-size: 12px;
  }
}

.file-short-cut {
  padding-top: 8px;
  font-size: 10px;
}

.zoom-input {
  background: transparent;
  width: 27px;
  -moz-appearance: textfield;
  appearance: textfield;
}

.zoom-input::-webkit-outer-spin-button,
.zoom-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.device-panel {
  padding: 0px;
  height: 53px;
}

.device-row {
  background-color: #e5e7eb;
  color: #2a2a2a;
}
</style>

<template>
  <div class="tool-bar-container">
    <div class="left-panel">
      <div class="tool-title">
        <p style="font-size: 12px;">T3000 Havc</p>
        <span style=" margin-left:0px; font-size: 10px; color:gray; z-index: 99;position:absolute;margin-top: 0px;">
          {{ devVersion }}
        </span>
      </div>
      <div class="tool-btns">
        <q-btn dense flat round icon="menu" size="sm" @click="lockToggle" />
        <q-btn :icon="locked ? 'lock_outline' : 'lock_open'" class="lock-btn" flat round dense size="sm"
          :color="locked ? 'primary' : 'normal'" @click="lockToggle">
          <q-tooltip anchor="top middle" self="bottom middle">
            <strong v-if="!locked">Lock</strong>
            <strong v-else>Unlock</strong>
          </q-tooltip>
        </q-btn>
        <q-btn v-if="grpNav?.length >= 0" icon="arrow_back" class="back-btn mr-2" dense round size="sm"
          @click="navGoBack">
          <q-tooltip anchor="top middle" self="bottom middle">
            <strong>Go back</strong>
          </q-tooltip>
        </q-btn>
      </div>
    </div>
    <div class="right-panel">
      <q-card class="right-panel-card">
        <q-tabs v-model="tab" dense class="right-tab text-white" active-color="#fff" indicator-color="#fff" align="left"
          narrow-indicator>
          <q-tab name="home" no-caps label="Home" @click="navigateTo('/')" />
          <q-tab name="file" no-caps label="File"  @click="navigateTo('/')"/>
          <q-tab name="device" no-caps
            :label="`Device (${deviceModel.data.device === undefined ? '-' : deviceModel.data.device})`"  @click="navigateTo('/')"/>
          <q-tab name="newui" no-caps label="New UI"/>
          <!-- <q-tab name="edit" label="Edit" />
          <q-tab name="object" label="Object" /> -->
          <div style="margin-left: auto;"><q-btn flat color="primary" label="Login" to="/login" /></div>
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="tab" class="tab-panel">

          <q-tab-panel name="home" class="home-panel">

          </q-tab-panel>

          <q-tab-panel name="file" class="file-panel">

          </q-tab-panel>

          <q-tab-panel name="device" class="device-panel">

          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, ref, watch, onMounted } from 'vue'
import { useRouter } from "vue-router";
import { useQuasar } from "quasar"
import { tools, user } from "../lib/common"
import { devVersion } from '../lib/T3000/Hvac/Data/T3Data'

export default defineComponent({
  name: 'NewTopToolBar2',
  props: {
    locked: {
      type: Boolean,
      default: false
    },
    grpNav: {
      type: Array,
      default: () => []
    },
    object: {
      type: Object,
      required: false,
    },
    selectedCount: {
      type: Number,
      required: true,
    },
    disableUndo: {
      type: Boolean,
      required: false,
    },
    disableRedo: {
      type: Boolean,
      required: false,
    },
    disablePaste: {
      type: Boolean,
      required: false,
    },
    zoom: {
      type: Number,
      required: true,
    },
    rulersGridVisible: {
      type: Boolean,
      required: false,
    },
    deviceModel: {
      type: Object,
      required: false,
    },
  },
  emits: ["navGoBack", "lockToggle", "menuAction", "showMoreDevices"],
  setup(props, { emit }) {

    const currentDevice = ref(null);
    const deviceTabTitle = ref('Device (-)');
    const router = useRouter();

    const navigateTo=(routeName)=> {

      console.log(router);
      router.push({ path: routeName });
    }

    const $q = useQuasar();
    function menuActionEmit(action, val = null) {
      emit("menuAction", action, val);
    }

    function logout() {
      $q.cookies.remove("token");
      user.value = null;
      localStorage.removeItem("user");
    }

    const showRulersGrid = ref(props.rulersGridVisible ? "Enable" : "Disable");
    watch(() => props.rulersGridVisible, (newVal) => {
      showRulersGrid.value = newVal ? "Enable" : "Disable";
    })

    const navGoBack = () => {
      // Emit event to parent to navigate back
      emit('navGoBack');
    };

    const lockToggle = () => {
      // Emit event to parent to toggle lock
      emit('lockToggle');
    };

    const showMoreDevices = () => {
      emit('showMoreDevices');
    }

    onMounted(() => {
      currentDevice.value = props.deviceModel;
      deviceTabTitle.value = `Device (${props.deviceModel.data.device})`;
    });



    return {
      tab: ref('newui'),
      navGoBack,
      lockToggle,
      menuActionEmit,
      logout,
      tools,
      user,
      showRulersGrid: showRulersGrid,
      showMoreDevices,
      currentDevice,
      deviceTabTitle,
      devVersion,
      navigateTo
    };
  },
});
</script>
