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
          <q-tab name="newui" no-caps label="New UI">
          </q-tab>
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
            <div style="display: block; margin-left: 10px; padding-top: 5px;">
              <button id="btn_try_select">Select</button>

              <!-- &nbsp;
              <button id="btn_try_library">Library</button> -->

              &nbsp;
              <button id="btn_try_line">Line</button>

              <!-- &nbsp;
              <button id="btn_try_line1">Line1</button> -->

              &nbsp;
              <button id="btn_try_wall">Wall</button>

              &nbsp;
              <button id="btn_try_Rect">Rect </button>

              &nbsp;
              <button id="btn_try_Oval">Oval</button>

              <!-- &nbsp;
              <button id="btn_try_Image">Image</button> -->

              &nbsp;
              <button id="btn_try_Circ">Circ</button>

              &nbsp;
              <button id="btn_try_Text">Text</button>

              &nbsp;
              <button id="btn_try_ArrR">Arr R</button>

              &nbsp;
              <button id="btn_try_ArrL">Arr L</button>

              &nbsp;
              <button id="btn_try_ArrT">Arr T</button>

              &nbsp;
              <button id="btn_try_ArrB">Arr B</button>

              &nbsp;
              <button id="btn_try_Roate45">R 45</button>

              &nbsp;
              <button id="btn_try_Roate90">R 90</button>

              &nbsp;
              <button id="btn_try_Align_lefts">Align L</button>

              &nbsp;
              <button id="btn_try_Align_centers">Align C</button>

              &nbsp;
              <button id="btn_try_Align_rights">Align R</button>

              &nbsp;
              <button id="btn_try_Align_tops">Align T</button>

              &nbsp;
              <button id="btn_try_Align_middles">Align M</button>

              &nbsp;
              <button id="btn_try_Align_bottoms">Align B</button>

              &nbsp;
              <button id="btn_try_Group">Group</button>

              &nbsp;
              <button id="btn_try_UnGroup">Un-group</button>

              &nbsp;
              <button id="btn_try_Flip_Horizontal">Flip H</button>

              &nbsp;
              <button id="btn_try_Flip_Vertical">Flip V</button>

              &nbsp;
              <button id="btn_try_Same_Height">Same H</button>

              &nbsp;
              <button id="btn_try_Same_Width">Same W</button>

              &nbsp;
              <button id="btn_try_Same_Both">Same B</button>

              &nbsp;
              <button id="btn_try_BringToFront">B To Front</button>

              &nbsp;
              <button id="btn_try_SendToBack">S To Back</button>

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
              <button id="btn_try_Lib_SetBackgroundColor">Bk Color</button>

              &nbsp;
              <button id="btn_try_Lib_SetBackgroundImage">Image</button>

              &nbsp;
              <button id="btn_try_vue_foreignObject">Vue Cpt</button>

              &nbsp;
              <button id="btn_try_x">X</button>

              &nbsp;
              <button id="btn_try_y">Y</button>

              &nbsp;
              <button id="btn_try_w">W</button>

              &nbsp;
              <button id="btn_try_h">H</button>

              &nbsp;
              <button id="btn_try_Lib_Lock">Lock</button>

              &nbsp;
              <button id="btn_try_Lib_UnLock">Un-Lock</button>

              &nbsp;
              <button id="btn_try_Add_To_Library">Add Lib</button>

              &nbsp;
              <button id="btn_try_Load_Library">Load Lib</button>

              &nbsp;
              <button id="btn_try_Duct_1">D1</button>

              &nbsp;
              <button id="btn_try_Duct_2">D2</button>

              &nbsp;
              <button id="btn_try_Duct_3">D3</button>

              &nbsp;
              <button id="btn_try_Duct_4">D4</button>

              &nbsp;
              <button id="btn_try_Duct_5">D5</button>

              &nbsp;
              <button id="btn_try_Duct_6">D6</button>

              &nbsp;
              <button id="btn_try_Duct_7">D7</button>

              &nbsp;
              <button id="btn_try_Duct_8">D8</button>

              &nbsp;
              <button id="btn_try_Duct_9">D9</button>

              &nbsp;
              <button id="btn_try_Duct_10">D10</button>

              &nbsp;
              <button id="btn_try_Duct_11">D11</button>

              &nbsp;
              <button id="btn_try_Duct_12">D12</button>

              &nbsp;
              <button id="btn_try_Reset_Scale">Scale</button>
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
import { tools/*, user*/ } from "../../lib/common";
import { user } from "../../lib/T3000/Hvac/Data/T3Data";
import { devVersion } from '../../lib/T3000/Hvac/Data/T3Data'
import T3Util from 'src/lib/T3000/Hvac/Util/T3Util';

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

      T3Util.Log(router);
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
