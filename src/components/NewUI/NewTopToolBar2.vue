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
  height: 53px;
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

.tool-bar-icon-prefix {
  vertical-align: 2px;
}

.tool-bar-button {
  color: white;
  font-size: 12px;
}

.tool-bar-dropdown {
  color: white;
  font-size: 12px;
  padding: 0 7px;
}

.tool-bar-menu-item {
  font-size: 10px !important;
}

.custom-slider .ant-slider-rail {
  background-color: red; /* 滑块轨道颜色 */
}
.custom-slider .ant-slider-handle {
  border-color: blue; /* 滑块手柄边框颜色 */
  background-color: blue; /* 滑块手柄背景颜色 */
}
.custom-slider .ant-slider-dot {
  border-color: green; /* 滑块点（可选） */
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
        <q-btn v-if="grpNav?.length ?? 0 >= 0" icon="arrow_back" class="back-btn mr-2" dense round size="sm"
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
            <!-- <div id="tool-bar-container"> -->
            <a-row class="bg-transparent">

              <a-col style="max-width: 158px;">
                <a-flex wrap="wrap">
                  <a-button type="text" size="small" id="btn_try_select" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <SelectOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Select
                    <q-tooltip>Select shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Lib_Lock" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <LockOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Lock
                    <q-tooltip>Lock selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_select_all" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <CheckOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Select All
                    <q-tooltip>Select all shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Lib_UnLock" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <UnlockOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Unlock
                    <q-tooltip>Unlock selected shape(s)</q-tooltip>
                  </a-button>
                </a-flex>
              </a-col>

              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>

              <!-- Clipboard Operations -->
              <a-col style="max-width: 225px;">
                <a-flex wrap="wrap">
                  <a-button type="text" size="small" id="btn_try_Paste" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <FileAddOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Paste
                    <q-tooltip>Paste copied shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Copy" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <CopyOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Copy
                    <q-tooltip>Copy selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Cut" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <ScissorOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Cut
                    <q-tooltip>Cut selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Delete" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <DeleteOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Delete
                    <q-tooltip>Delete selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Duplicate" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <BlockOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Duplicate
                    <q-tooltip>Duplicate selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Insert" class="tool-bar-button" style="color: white;"
                    disabled>
                    <template #icon>
                      <PlusOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Insert
                    <q-tooltip>Insert shape</q-tooltip>
                  </a-button>
                </a-flex>
              </a-col>

              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>

              <a-col style="max-width: 128px;">
                <a-flex wrap="wrap">
                  <a-button type="text" size="small" id="btn_try_Undo" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <UndoOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Undo
                    <q-tooltip>Undo last action</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Save" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <SaveOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Save
                    <q-tooltip>Save data</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Redo" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <RedoOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Redo
                    <q-tooltip>Redo last undone action</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Clear" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <ClearOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Reset
                    <q-tooltip>Clear data</q-tooltip>
                  </a-button>
                </a-flex>
              </a-col>

              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>

              <!-- Transform Group -->
              <a-col style="max-width: 170px;">
                <a-flex wrap="wrap" style="height: 50px;padding-top: 5px;">

                  <a-dropdown class="tool-bar-dropdown">
                    <a class="ant-dropdown-link" @click.prevent>
                      <RotateRightOutlined />
                      Rotate
                      <DownOutlined />
                    </a>
                    <template #overlay>
                      <a-menu @click="onClick">
                        <a-menu-item key="r0" style="font-size: 12px;"> 0° </a-menu-item>
                        <a-menu-item key="r45" style="font-size: 12px;"> 45° </a-menu-item>
                        <a-menu-item key="r90" style="font-size: 12px;"> 90° </a-menu-item>
                        <a-menu-item key="r135" style="font-size: 12px;"> 135° </a-menu-item>
                        <a-menu-item key="r180" style="font-size: 12px;"> 180° </a-menu-item>
                        <a-menu-item key="r225" style="font-size: 12px;"> 225° </a-menu-item>
                        <a-menu-item key="r270" style="font-size: 12px;"> 270° </a-menu-item>
                        <a-menu-item key="r360" style="font-size: 12px;"> 360° </a-menu-item>
                        <a-menu-item key="r360" style="font-size: 12px;" disabled> Custom </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>

                  <a-dropdown class="tool-bar-dropdown">
                    <a class="ant-dropdown-link" @click.prevent>
                      <AlignLeftOutlined />
                      Align
                      <DownOutlined />
                    </a>
                    <template #overlay>
                      <a-menu @click="onClick">
                        <a-menu-item style="font-size: 12px;" key="align-left">
                          <template #icon>
                            <AlignLeftOutlined />
                          </template>
                          Align Left
                        </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="align-center">
                          <template #icon>
                            <AlignCenterOutlined />
                          </template>
                          Align Center
                        </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="align-right">
                          <template #icon>
                            <AlignRightOutlined />
                          </template>
                          Align Right
                        </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="align-top">
                          <template #icon>
                            <VerticalAlignTopOutlined />
                          </template>
                          Align Top
                        </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="align-middle">
                          <template #icon>
                            <VerticalAlignMiddleOutlined />
                          </template>
                          Align Middle
                        </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="align-bottom">
                          <template #icon>
                            <VerticalAlignBottomOutlined />
                          </template>
                          Align Bottom
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>

                  <a-dropdown class="tool-bar-dropdown">
                    <a class="ant-dropdown-link" @click.prevent>
                      <SwapOutlined />
                      Flip
                      <DownOutlined />
                    </a>
                    <template #overlay>
                      <a-menu @click="onClick">
                        <a-menu-item style="font-size: 12px;" key="flip-horizontal">
                          <template #icon>
                            <BorderHorizontalOutlined />
                          </template>
                          Flip Horization
                        </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="flip-vertical">
                          <template #icon>
                            <BorderVerticleOutlined />
                          </template>
                          Flip Vertical
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>

                  <a-dropdown class="tool-bar-dropdown">
                    <a class="ant-dropdown-link" @click.prevent>
                      <CompressOutlined />
                      Make same
                      <DownOutlined />
                    </a>
                    <template #overlay>
                      <a-menu @click="onClick">
                        <a-menu-item style="font-size: 12px;" key="make-same-width"> Same Width </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="make-same-height"> Same Height </a-menu-item>
                        <a-menu-item style="font-size: 12px;" key="make-both-same"> Same Both </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>

                </a-flex>
              </a-col>

              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>

              <a-col style="max-width: 190px;">
                <a-flex wrap="wrap">
                  <a-button type="text" size="small" id="btn_try_Group" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <ApartmentOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Group
                    <q-tooltip>Group selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_BringToFront" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <VerticalAlignTopOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Bring to Front
                    <q-tooltip>Bring to front</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_UnGroup" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <NodeIndexOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Ungroup
                    <q-tooltip>Ungroup selected shapes(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_SendToBack" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <VerticalAlignBottomOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Send to Back
                    <q-tooltip>Send to back</q-tooltip>
                  </a-button>
                </a-flex>
              </a-col>

              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>

              <a-col style="max-width: 190px;">
                <a-col :span="24" style="text-align: left;">
                  <a-button type="text" size="small" id="btn_try_Reset_Scale" style="color: white;">Reset Zoom</a-button>
                </a-col>
                <a-row>
                  <a-col :span="12">
                    <a-slider v-model:value="inputValue" :min="0.25" :max="4.00" :step="0.01" class="custom-slider" />
                  </a-col>
                  <a-col :span="4">
                    <a-input-number size="small" v-model:value="inputValue" :min="0.25" :max="4.00" :step="0.01"
                      style="margin-left: 10px;font-size: 10px; width: 60px;" />
                  </a-col>
                </a-row>
              </a-col>

              <!-- Alignment Group -->
              <!-- <a-col :span="4">
                <div class="q-gutter-sm d-flex">
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
              </a-col> -->
              <!--
                <a-col :span="1" class="d-flex justify-center">
                  <q-separator vertical inset />
                </a-col> -->

              <!-- Size Group -->
              <!-- <a-col :span="3">
                <div class="q-gutter-sm d-flex">
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
              </a-col> -->

              <!-- <a-col :span="1" class="d-flex justify-center">
                  <q-separator vertical inset />
                </a-col> -->

              <!-- Z-order and Group -->
              <!-- <a-col :span="4">
                <div class="q-gutter-sm d-flex">
                  <q-btn flat dense size="sm" icon="vertical_align_top" label="Front" id="btn_try_BringToFront">
                    <q-tooltip>Bring selected shape(s) to front</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="vertical_align_bottom" label="Back" id="btn_try_SendToBack">
                    <q-tooltip>Send selected shape(s) to back</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="group_work" label="Group" id="btn_try_Group"></q-btn>
                  <q-btn flat dense size="sm" icon="layers_clear" label="Ungroup" id="btn_try_UnGroup"></q-btn>
                </div>
              </a-col> -->

              <!-- <a-col :span="1" class="d-flex justify-center">
                  <q-separator vertical inset />
                </a-col> -->



              <!-- <a-col :span="1" class="d-flex justify-center">
                  <q-separator vertical inset />
                </a-col> -->

              <!-- History and File Operations -->
              <!-- <a-col :span="6">
                <a-row>
                  <a-col :span="8">
                    <div class="q-gutter-sm d-flex">
                      <q-btn flat dense size="sm" icon="undo" id="btn_try_Undo"></q-btn>
                      <q-btn flat dense size="sm" icon="redo" id="btn_try_Redo"></q-btn>
                    </div>
                  </a-col>
                  <a-col :span="16">
                    <div class="q-gutter-sm d-flex">
                      <q-btn flat dense size="sm" icon="save" id="btn_try_Save"></q-btn>
                      <q-btn flat dense size="sm" icon="clear_all" id="btn_try_Clear">
                        <q-tooltip>Clear data</q-tooltip>
                      </q-btn>
                      <q-btn flat dense size="sm" icon="format_color_fill" id="btn_try_Lib_SetBackgroundColor">
                        <q-tooltip>Set background color</q-tooltip>
                      </q-btn>
                      <q-btn flat dense size="sm" icon="zoom_out_map" label="Reset" id="btn_try_Reset_Scale"></q-btn>
                    </div>
                  </a-col>
                </a-row>
              </a-col> -->
            </a-row>
            <!-- </div> -->

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
import type { MenuProps } from 'ant-design-vue';
import {
  CloseOutlined,
  EditOutlined,
  CopyOutlined,
  ScissorOutlined,
  FileAddOutlined,
  SettingOutlined,
  DeleteOutlined,
  ClearOutlined,
  RightOutlined,
  RotateRightOutlined,
  CompressOutlined,
  ApartmentOutlined,
  NodeIndexOutlined,
  SwapOutlined,
  UndoOutlined,
  RedoOutlined,
  BlockOutlined,
  SaveOutlined,
  LockOutlined,
  UnlockOutlined,
  BgColorsOutlined,
  CheckOutlined,
  GatewayOutlined,
  PlusOutlined,
  DownOutlined,
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  BorderHorizontalOutlined,
  BorderVerticleOutlined,
  SelectOutlined
} from '@ant-design/icons-vue';

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
const inputValue = ref<number>(1.00);

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

const onClick: MenuProps['onClick'] = ({ key }) => {
  console.log(`Click on item ${key}`);
};

onMounted(() => {
  currentDevice.value = props.deviceModel;
  deviceTabTitle.value = `Device (${props.deviceModel?.data.device})`;
});
</script>
