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
            <div class="q-px-md">
              <q-toolbar class="bg-transparent">
                <!-- Transform Group -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="rotate_right" label="45°" id="btn_try_Roate45">
                    <q-tooltip>Rotate selected shape(s) 45 degrees</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="rotate_90_degrees_cw" label="90°" id="btn_try_Roate90">
                    <q-tooltip>Rotate selected shape(s) 90 degrees</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="flip" label="H" id="btn_try_Flip_Horizontal">
                    <q-tooltip>Flip selected shape(s) horizontally</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="flip" class="rotate-90" label="V" id="btn_try_Flip_Vertical">
                    <q-tooltip>Flip selected shape(s) vertically</q-tooltip>
                  </q-btn>
                </div>

                <q-separator vertical inset />

                <!-- Alignment Group -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="format_align_left" id="btn_try_Align_lefts">
                    <q-tooltip>Align selected shapes to the left</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="format_align_center" id="btn_try_Align_centers">
                    <q-tooltip>Align selected shapes to the center</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="format_align_right" id="btn_try_Align_rights">
                    <q-tooltip>Align selected shapes to the right</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="vertical_align_top" id="btn_try_Align_tops">
                    <q-tooltip>Align selected shapes to the top</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="vertical_align_center" id="btn_try_Align_middles">
                    <q-tooltip>Align selected shapes to the middle</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="vertical_align_bottom" id="btn_try_Align_bottoms">
                    <q-tooltip>Align selected shapes to the bottom</q-tooltip>
                  </q-btn>
                </div>

                <q-separator vertical inset />

                <!-- Size Group -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="height" label="Same" id="btn_try_Same_Height">
                    <q-tooltip>Make selected shapes same height</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="width_normal" label="Same" id="btn_try_Same_Width">
                    <q-tooltip>Make selected shapes same width</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="aspect_ratio" label="Same" id="btn_try_Same_Both">
                    <q-tooltip>Make selected shapes same size in both dimensions</q-tooltip>
                  </q-btn>
                </div>

                <q-separator vertical inset />

                <!-- Z-order and Group -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="vertical_align_top" label="Front" id="btn_try_BringToFront">
                    <q-tooltip>Bring selected shape(s) to front</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="vertical_align_bottom" label="Back" id="btn_try_SendToBack">
                    <q-tooltip>Send selected shape(s) to back</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="group_work" label="Group" id="btn_try_Group"></q-btn>
                  <q-btn flat dense size="sm" icon="layers_clear" label="Ungroup" id="btn_try_UnGroup"></q-btn>
                </div>

                <q-separator vertical inset />

                <!-- Clipboard Operations -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="content_paste" id="btn_try_Paste"></q-btn>
                  <q-btn flat dense size="sm" icon="content_copy" id="btn_try_Copy"></q-btn>
                  <q-btn flat dense size="sm" icon="content_cut" id="btn_try_Cut"></q-btn>
                  <q-btn flat dense size="sm" icon="delete" id="btn_try_Delete"></q-btn>
                  <q-btn flat dense size="sm" icon="content_copy" label="Duplicate" id="btn_try_Duplicate">
                    <q-tooltip>Duplicate selected shape(s)</q-tooltip>
                  </q-btn>
                </div>

                <q-separator vertical inset />

                <!-- History Operations -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="undo" id="btn_try_Undo"></q-btn>
                  <q-btn flat dense size="sm" icon="redo" id="btn_try_Redo"></q-btn>
                </div>

                <q-separator vertical inset />

                <!-- File and Settings -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="save" id="btn_try_Save"></q-btn>
                  <q-btn flat dense size="sm" icon="clear_all" id="btn_try_Clear">
                    <q-tooltip>Clear data</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="format_color_fill" id="btn_try_Lib_SetBackgroundColor">
                    <q-tooltip>Set background color</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="zoom_out_map" label="Reset" id="btn_try_Reset_Scale"></q-btn>
                </div>

                <q-separator vertical inset />

                <!-- Locking -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="lock" id="btn_try_Lib_Lock"></q-btn>
                  <q-btn flat dense size="sm" icon="lock_open" id="btn_try_Lib_UnLock"></q-btn>
                </div>

                <q-separator vertical inset />

                <!-- Library -->
                <div class="row q-gutter-sm">
                  <q-btn flat dense size="sm" icon="library_add" label="Add" id="btn_try_Add_To_Library"></q-btn>
                  <q-btn flat dense size="sm" icon="library_books" label="Load" id="btn_try_Load_Library"></q-btn>
                </div>
              </q-toolbar>
            </div>

          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from "vue-router";
import { useQuasar } from "quasar"
import { tools } from "../../lib/common";
import { user } from "../../lib/T3000/Hvac/Data/T3Data";
import { devVersion } from '../../lib/T3000/Hvac/Data/T3Data'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil';

// Define props using defineProps with TypeScript interface
const props = defineProps<{
  locked: boolean
  grpNav: any[]
  object?: object
  selectedCount: number
  disableUndo?: boolean
  disableRedo?: boolean
  disablePaste?: boolean
  zoom: number
  rulersGridVisible?: boolean
  deviceModel?: any
}>()

// Define emits
const emit = defineEmits<{
  (e: 'navGoBack'): void
  (e: 'lockToggle'): void
  (e: 'menuAction', action: string, val?: any): void
  (e: 'showMoreDevices'): void
}>()

const tab = ref('newui')
const currentDevice = ref(null);
const deviceTabTitle = ref('Device (-)');
const router = useRouter();
const $q = useQuasar();
const showRulersGrid = ref(props.rulersGridVisible ? "Enable" : "Disable");

const navigateTo = (routeName: string) => {
  LogUtil.Debug(router);
  router.push({ path: routeName });
}

function menuActionEmit(action: string, val: any = null) {
  emit("menuAction", action, val);
}

function logout() {
  $q.cookies.remove("token");
  user.value = null;
  localStorage.removeItem("user");
}

watch(() => props.rulersGridVisible, (newVal) => {
  showRulersGrid.value = newVal ? "Enable" : "Disable";
})

const navGoBack = () => {
  emit('navGoBack');
};

const lockToggle = () => {
  emit('lockToggle');
};

const showMoreDevices = () => {
  emit('showMoreDevices');
}

onMounted(() => {
  currentDevice.value = props.deviceModel;
  deviceTabTitle.value = `Device (${props.deviceModel?.data.device})`;
});
</script>
