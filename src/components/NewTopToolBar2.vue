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

.newui-panel {
  height: 53px;
  padding: 0px;
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
          <q-tab name="file" no-caps label="File" @click="navigateTo('/')" />
          <q-tab name="device" no-caps
            :label="`Device (${deviceModel.data.device === undefined ? '-' : deviceModel.data.device})`"
            @click="navigateTo('/')" />
          <q-tab name="newui" no-caps label="New UI" />
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
          <q-tab-panel name="newui" class="newui-panel">
            <div style="display: block;">
              <button id="btn_try_select">Select</button>

              &nbsp;
              <button id="btn_try_library">Library</button>

              &nbsp;
              <button id="btn_try_line">Line</button>

              &nbsp;
              <button id="btn_try_line1">Line1</button>

              &nbsp;
              <button id="btn_try_wall">Wall</button>

              &nbsp;
              <button id="btn_try_Rect">Rect </button>

              &nbsp;
              <button id="btn_try_Oval">Oval</button>

              &nbsp;
              <button id="btn_try_Image">Image</button>

              &nbsp;
              <button id="btn_try_Circ">Circ</button>

              &nbsp;
              <button id="btn_try_Text">Text</button>

              &nbsp;
              <button id="btn_try_ArrR">ArrR</button>

              &nbsp;
              <button id="btn_try_ArrL">ArrL</button>

              &nbsp;
              <button id="btn_try_ArrT">ArrT</button>

              &nbsp;
              <button id="btn_try_ArrB">ArrB</button>

              &nbsp;
              <button id="btn_try_Roate45">Roate 45</button>

              &nbsp;
              <button id="btn_try_Roate90">Roate 90</button>

              &nbsp;
              <button id="btn_try_Align_lefts">Align_lefts</button>

              &nbsp;
              <button id="btn_try_Align_centers">Align_centers</button>

              &nbsp;
              <button id="btn_try_Align_rights">Align_rights</button>

              &nbsp;
              <button id="btn_try_Align_tops">Align_tops</button>

              &nbsp;
              <button id="btn_try_Align_middles">Align_middles</button>

              &nbsp;
              <button id="btn_try_Align_bottoms">Align_bottoms</button>

              &nbsp;
              <button id="btn_try_Group">Group</button>

              &nbsp;
              <button id="btn_try_UnGroup">Ungroup</button>

              &nbsp;
              <button id="btn_try_Flip_Horizontal">Flip_Horizontal</button>

              &nbsp;
              <button id="btn_try_Flip_Vertical">Flip_Vertical</button>

              &nbsp;
              <button id="btn_try_Same_Height">Same_Height</button>

              &nbsp;
              <button id="btn_try_Same_Width">Same_Width</button>

              &nbsp;
              <button id="btn_try_Same_Both">Same_Both</button>

              &nbsp;
              <button id="btn_try_BringToFront">BringToFront</button>

              &nbsp;
              <button id="btn_try_SendToBack">SendToBack</button>

              &nbsp;
              <button id="btn_try_Paste">Paste</button>

              &nbsp;
              <button id="btn_try_Copy">Copy</button>

              &nbsp;
              <button id="btn_try_Cut">Cut</button>

              &nbsp;
              <button id="btn_try_Delete">Delete</button>

              &nbsp;
              <button id="btn_try_Undo">Undo</button>

              &nbsp;
              <button id="btn_try_Redo">Redo</button>

              &nbsp;
              <button id="btn_try_Save">Save</button>

              &nbsp;
              <button id="btn_try_Duplicate">Duplicate</button>

              &nbsp;
              <button id="btn_try_Clear">Clear</button>

              &nbsp;
              <button id="btn_try_Measure">Measure</button>

              &nbsp;
              <button id="btn_try_AreaMeasure">AreaMeasure</button>

              <!-- <br />
              &nbsp;
              <button id="btn_try_Lib_Select">Select</button>

              &nbsp;
              <button id="btn_try_Lib_Box">Box</button>

              &nbsp;
              <button id="btn_try_Lib_Text">Text</button>

              &nbsp;
              <button id="btn_try_Lib_Icon">Icon</button>

              &nbsp;
              <button id="btn_try_Lib_SwitchIcon">Switch Icon</button>

              &nbsp;
              <button id="btn_try_Lib_Led">Led</button>

              &nbsp;
              <button id="btn_try_Lib_RoomHumidity">Room Humidity</button>

              &nbsp;
              <button id="btn_try_Lib_RoomTemperature">Room Temperature</button> -->

              <!--
              &nbsp;
              <button id="btn_try_Lib_Temperature">Temperature</button>

              &nbsp;
              <button id="btn_try_Lib_Boiler">Boiler</button>

              &nbsp;
              <button id="btn_try_Lib_HeatPump">Heat Pump</button>

              &nbsp;
              <button id="btn_try_Lib_Pump">Pump</button>

              &nbsp;
              <button id="btn_try_Lib_ValueThreeWay">Value Three-Way</button>

              &nbsp;
              <button id="btn_try_Lib_ValueTwoWay">Value Two-Way</button>

              &nbsp;
              <button id="btn_try_Lib_Duct">Duct</button>

              &nbsp;
              <button id="btn_try_Lib_Fan">Fan</button>

              &nbsp;
              <button id="btn_try_Lib_CoolingCoil">Cooling Coil</button>

              &nbsp;
              <button id="btn_try_Lib_HeatingCoil">Heating Coil</button>

              &nbsp;
              <button id="btn_try_Lib_Filter">Filter</button>

              &nbsp;
              <button id="btn_try_Lib_Humidifier">Humidifier</button>

              &nbsp;
              <button id="btn_try_Lib_Humidity">Humidity</button>

              &nbsp;
              <button id="btn_try_Lib_Pressure">Pressure</button>

              &nbsp;
              <button id="btn_try_Lib_Damper">Damper</button>

              &nbsp;
              <button id="btn_try_Lib_Temperature2">Temperature 2</button>

              &nbsp;
              <button id="btn_try_Lib_ThermalWheel">Thermal Wheel</button>

              &nbsp;
              <button id="btn_try_Lib_Enthalpy">Enthalpy</button>

              &nbsp;
              <button id="btn_try_Lib_Flow">Flow</button>

              &nbsp;
              <button id="btn_try_Lib_Guage">Guage</button>

              &nbsp;
              <button id="btn_try_Lib_Dial">Dial</button>

              &nbsp;
              <button id="btn_try_Lib_Value">Value</button>

              &nbsp;
              <button id="btn_try_Lib_IconWithTitle">Icon with Title</button>

              &nbsp;
              <button id="btn_try_Lib_SetBackgroundColor">Background Color</button>

              &nbsp;
              <button id="btn_try_Lib_SetBackgroundImage">Background Image</button>

              &nbsp;
              <button id="btn_try_Lib_ImportSVGSymbol">Import SVG Symbol</button>

              &nbsp;
              <button id="btn_try_Lib_Lock">Lock</button>

              &nbsp;
              <button id="btn_try_Lib_AddNote">Add Note</button>

              &nbsp;
              <button id="btn_try_Lib_AddComment">Add Comment</button>

              &nbsp;
              <button id="btn_try_Lib_Hyperlink">Hyperlink</button> -->
            </div>
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

    const navigateTo = (routeName) => {

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
