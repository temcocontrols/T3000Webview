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
}

.tool-btns {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  height: 53px;
  width: 105px;
  color: #fff;
}

.tab-panel {
  background-color: #2a2a2a;
  color: #fff;
}

.home-panel {
  .container {
    display: flex;
  }

  .sub-div {
    display: flex;
    flex-direction: column;
    padding-top: 2px;
  }

  .button-row {
    display: flex;
  }

  .q-btn {
    padding: 4px 10px;
  }
}

.file-panel {
  .container {
    display: flex;
    height: 53px;
  }

  .sub-div {
    display: flex;
    flex-direction: row;
    gap: 10px;
    padding: 10px;
  }

  .button-row {
    display: flex;
    gap: 5px;
  }
}

.right-panel-card {
  box-shadow: none;
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

.color-idic-20b2aa {
  background-color: #20B2AA;
  width: 16px;
  height: 16px;
  display: inline-block;
  margin-right: 8px;
}

.color-idic-ffffff {
  background-color: #FFFFFF;
  width: 16px;
  height: 16px;
  display: inline-block;
  margin-right: 8px;
}

.color-idic-0aacb4 {
  background-color: #0AACB4;
  width: 16px;
  height: 16px;
  display: inline-block;
  margin-right: 8px;
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
          <q-tab name="calendar" no-caps label="Calendar" @click="navigateTo('/hvac/calendar')"></q-tab>
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
                    style="color: white;margin-left: 18px;">
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
                  <a-button type="text" size="small" id="btn_try_Copy" class="tool-bar-button"
                    style="color: white;margin-left: 6px;">
                    <template #icon>
                      <CopyOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Copy
                    <q-tooltip>Copy selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Cut" class="tool-bar-button"
                    style="color: white;margin-left: 25px;">
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
                    Clear
                    <q-tooltip>Clear draw area data</q-tooltip>
                  </a-button>
                </a-flex>
              </a-col>
              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>
              <!-- Transform Group -->
              <a-col style="max-width: 186px;">
                <a-flex wrap="wrap" style="height: 50px;padding-top: 5px;">
                  <a-dropdown class="tool-bar-dropdown">
                    <a class="ant-dropdown-link" @click.prevent>
                      <RotateRightOutlined />
                      Rotate
                      <DownOutlined />
                    </a>
                    <template #overlay>
                      <a-menu @click="onClick">
                        <a-menu-item key="rotate-0" style="font-size: 12px;"> 0° </a-menu-item>
                        <a-menu-item key="rotate-45" style="font-size: 12px;"> 45° </a-menu-item>
                        <a-menu-item key="rotate-90" style="font-size: 12px;"> 90° </a-menu-item>
                        <a-menu-item key="rotate-135" style="font-size: 12px;"> 135° </a-menu-item>
                        <a-menu-item key="rotate-180" style="font-size: 12px;"> 180° </a-menu-item>
                        <a-menu-item key="rotate-225" style="font-size: 12px;"> 225° </a-menu-item>
                        <a-menu-item key="rotate-270" style="font-size: 12px;"> 270° </a-menu-item>
                        <a-menu-item key="rotate-360" style="font-size: 12px;"> 360° </a-menu-item>
                        <a-menu-item key="rotate-cus" style="font-size: 12px;" disabled> Custom </a-menu-item>
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
                    <a class="ant-dropdown-link" @click.prevent style="margin-left: 16px;">
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
              <a-col style="max-width: 193px;">
                <a-flex wrap="wrap">
                  <a-button type="text" size="small" id="btn_try_Group" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <ApartmentOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Group
                    <q-tooltip>Group selected shape(s)</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_BringToFront" class="tool-bar-button"
                    style="color: white; margin-left: 13px;">
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
              <a-col style="max-width: 108px;">
                <a-flex wrap="wrap">
                  <a-button type="text" size="small" id="btn_try_Add_To_Library" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <FileAddOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Add to Library
                    <q-tooltip>Add selected shape(s) to library</q-tooltip>
                  </a-button>
                  <a-button type="text" size="small" id="btn_try_Load_Library" class="tool-bar-button" style="color: white;">
                    <template #icon>
                      <CopyOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Load library
                    <q-tooltip>Load library</q-tooltip>
                  </a-button>
                </a-flex>
              </a-col>
              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>
              <a-col style="max-width: 111px;">
                <a-flex wrap="wrap" style="height: 50px;padding-top: 5px;">
                  <a-dropdown class="tool-bar-dropdown">
                    <a class="ant-dropdown-link" @click.prevent>
                      <BgColorsOutlined />
                      Background
                      <DownOutlined />
                    </a>
                    <template #overlay>
                      <a-menu @click="onClick">
                        <a-menu-item key="bg-color-20B2AA" style="font-size: 12px;">
                          <span class="color-idic-20b2aa"></span> #20B2AA
                        </a-menu-item>
                        <a-menu-item key="bg-color-FFFFFF" style="font-size: 12px;">
                          <span class="color-idic-ffffff"></span> #FFFFFF
                        </a-menu-item>
                        <a-menu-item key="bg-color-0AACB4" style="font-size: 12px;">
                          <span class="color-idic-0aacb4"></span> #0AACB4
                        </a-menu-item>
                        <a-menu-item key="bg-color-custom" style="font-size: 12px;" disabled> Custom Color...
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <a-col :span="24">
                    <a-button type="text" size="small" id="btn_try_ZoomOut" class="tool-bar-button"
                      :disabled="zoom <= 10" style="color: white;margin-top: 5px;"
                      :onClick="() => zoomChange(inputValue - 0.01)">
                      <template #icon>
                        <ZoomOutOutlined class="tool-bar-icon-prefix" />
                      </template>
                      <q-tooltip>
                        Zoom out
                      </q-tooltip>
                    </a-button>
                    <div style="display: inline-flex; align-items: center; ">
                      <a-input-number size="small" v-model:value="inputValue" :min="0.25" :max="4.00" :step="0.01"
                        style="font-size: 10px; width: 54px; height: 20px;line-height: 22px;border-radius: 0px;"
                        @pressEnter="(e) => zoomSpecify(e.target.value)" @step="(value) => zoomChange(value)" />
                    </div>
                    <a-button type="text" size="small" id="btn_try_ZoomIn" class="tool-bar-button"
                      :disabled="zoom >= 400" style="color: white;margin-top: 5px;"
                      :onClick="() => zoomChange(inputValue + 0.01)">
                      <template #icon>
                        <ZoomInOutlined class="tool-bar-icon-prefix" />
                      </template>
                      <q-tooltip>
                        Zoom in
                      </q-tooltip>
                    </a-button>
                  </a-col>
                </a-flex>
              </a-col>
              <a-col style="max-width: 166px;">
                <a-flex wrap="wrap" style="height: 50px;padding-top: 5px;">
                  <a-checkbox v-model:checked="showRulers" style="color: white; font-size: 12px; margin-bottom: 2px;"
                    @change="toggleRulers">
                    Rulers
                    <q-tooltip>Toggle rulers visibility</q-tooltip>
                  </a-checkbox>
                  <a-button type="text" size="small" id="btn_try_Reset_Scale" class="tool-bar-button"
                    style="color: white;">
                    <template #icon>
                      <GatewayOutlined class="tool-bar-icon-prefix" />
                    </template>
                    Reset Zoom
                    <q-tooltip>Reset view to default</q-tooltip>
                  </a-button>
                  <a-checkbox v-model:checked="showGrid" style="color: white; font-size: 12px; margin-bottom: 2px;"
                    @change="toggleGrid">
                    Grid
                    <q-tooltip>Toggle grid visibility</q-tooltip>
                  </a-checkbox>
                </a-flex>
              </a-col>
              <a-col class="d-flex justify-center" style="max-width: 1%;">
                <a-divider type="vertical" style="border-color: #FFFFFF;height: 30px;margin-top: 10px;" />
              </a-col>
            </a-row>
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
import { user, devVersion } from '../../lib/T3000/Hvac/Data/T3Data'
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil';
import type { MenuProps } from 'ant-design-vue';
import CtxMenuUtil from 'src/lib/T3000/Hvac/Doc/CtxMenuUtil';
import T3UIUtil from 'src/lib/T3000/Hvac/Opt/UI/T3UIUtil';
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
  SelectOutlined,
  ZoomOutOutlined,
  ZoomInOutlined
} from '@ant-design/icons-vue';
import T3Gv from 'src/lib/T3000/Hvac/Data/T3Gv';
import { zoomScale, showRulers, showGrid } from 'src/lib/T3000/Hvac/Data/Constant/RefConstant';
import DataOpt from 'src/lib/T3000/Hvac/Opt/Data/DataOpt';

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
// const showRulersGrid = ref(props.rulersGridVisible ? "Enable" : "Disable");

const inputValue = zoomScale;

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

// watch(() => props.rulersGridVisible, (newVal) => {
//   showRulersGrid.value = newVal ? "Enable" : "Disable";
// })

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
  new CtxMenuUtil().HandleMenuClick(`${key}`, {});
};

const zoomChange = (value: number) => {
  // Round the value to two decimal places
  value = Number(value.toFixed(2));

  if (value < 0.25 || value > 4.00) {
    T3UIUtil.ShowZoomInOutError("Zoom value must be between 0.25 and 4.00");
    return;
  }

  LogUtil.Debug(`Zoom changed to: ${value}`);
  inputValue.value = value;

  T3Gv.docUtil.ZoomChange(inputValue.value, 0.01);
};

const zoomSpecify = (value: string) => {
  // Convert string to number
  let numValue = parseFloat(value);

  // Check if it's a valid number
  if (isNaN(numValue)) {
    T3UIUtil.ShowZoomInOutError("Please enter a valid number");
    return;
  }

  // Round the value to two decimal places
  numValue = Number(numValue.toFixed(2));

  if (numValue < 0.25 || numValue > 4.00) {
    T3UIUtil.ShowZoomInOutError("Zoom value must be between 0.25 and 4.00");
    return;
  }

  LogUtil.Debug(`Zoom specify to: ${numValue}`);
  inputValue.value = numValue;

  T3Gv.docUtil.ZoomSpecify(inputValue.value, false);
}

const toggleRulers = () => {
  T3Gv.docUtil.docConfig.showRulers = showRulers.value;
  T3Gv.docUtil.UpdateRulerVisibility();
  DataOpt.SaveToLocalStorage();
  LogUtil.Debug('= v.NewTopBar: toggleRulers / showRulers', T3Gv.docUtil.docConfig.showRulers);
};

const toggleGrid = () => {
  T3Gv.docUtil.docConfig.showGrid = showGrid.value;
  T3Gv.docUtil.UpdateGridVisibility();
  DataOpt.SaveToLocalStorage();
  LogUtil.Debug('= v.NewTopBar: toggleGrid / showGrid', T3Gv.docUtil.docConfig.showGrid);
};

onMounted(() => {
  currentDevice.value = props.deviceModel;
  deviceTabTitle.value = `Device (${props.deviceModel?.data.device})`;

  const docInfo = T3Gv?.docUtil?.svgDoc?.docInfo || {};
  const docConfig = T3Gv?.docUtil?.docConfig || {};
  LogUtil.Debug('= v.NewTopBar: onMounted / docInfo, docConfig, zoomScale', docInfo, docConfig, zoomScale.value);
});
</script>
