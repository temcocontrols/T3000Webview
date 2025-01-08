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
          V:25.0108.01
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
          <q-tab name="home" no-caps label="Home" />
          <q-tab name="file" no-caps label="File" />
          <q-tab name="device" no-caps
            :label="`Device (${deviceModel.data.device === undefined ? '-' : deviceModel.data.device})`" />
          <!-- <q-tab name="edit" label="Edit" />
          <q-tab name="object" label="Object" /> -->
          <div style="margin-left: auto;"><q-btn flat color="primary" label="Login" to="/login" /></div>
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="tab" class="tab-panel">

          <q-tab-panel name="home" class="home-panel">
            <div class="container">
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="content_copy" no-caps @click="menuActionEmit('copy')"
                    :disable="selectedCount < 1">Copy
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Copy</strong><em> (Ctrl + C)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="content_paste" no-caps @click="menuActionEmit('paste')"
                    :disable="disablePaste">Paste
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Copy</strong><em> (Ctrl + V)</em>
                    </q-tooltip></q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="undo" no-caps @click="menuActionEmit('undoAction')"
                    :disable="disableUndo">Undo
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Undo</strong><em> (Ctrl + Z)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="redo" no-caps @click="menuActionEmit('redoAction')"
                    :disable="disableRedo">Redo
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Redo</strong><em> (Ctrl + Y)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="delete" no-caps @click="menuActionEmit('deleteSelected')"
                    :disable="selectedCount < 1">Delete
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Delete selected</strong><em> (Delete)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <q-separator color="white" inset vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="join_full" no-caps @click="menuActionEmit('groupSelected')"
                    :disable="selectedCount < 2">Group
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Group selected</strong><em> (Ctrl + G)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="join_inner" no-caps @click="menuActionEmit('ungroupSelected')"
                    :disable="selectedCount < 2">Ungroup
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Ungroup selected</strong><em> (Ctrl + Shift + G)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="library_books" no-caps @click="menuActionEmit('addToLibrary')"
                    :disable="selectedCount < 2">Add to library
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Add selected to library</strong><em> (Ctrl + L)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="file_copy" no-caps @click="menuActionEmit('duplicateSelected')"
                    :disable="selectedCount < 1">Duplicate
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Duplicate selected</strong><em> (Ctrl + D)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <q-separator color="white" inset vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="splitscreen" no-caps @click="menuActionEmit('weldSelected')"
                    :disable="!(selectedCount >= 2)">Weld
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Weld selected</strong><em> (Ctrl + B)</em>
                    </q-tooltip>
                  </q-btn>
                </div>
                <!-- <div class="button-row">
                  <q-btn flat size="sm" icon="splitscreen" no-caps>Unweld</q-btn>
                </div> -->
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="link" no-caps @click="menuActionEmit('link')"
                    :disable="!selectedCount || selectedCount > 1">Link
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Link</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="transform" no-caps :disable="!selectedCount || selectedCount > 1">Convert
                    to
                    <q-menu anchor="top end" self="top start" auto-close>
                      <q-list>
                        <q-item v-for="t in tools.filter(
                          (i) =>
                            i.name !== object.type &&
                            !['Duct', 'Pointer', 'Text'].includes(i.name)
                        )" :key="t.name" dense clickable v-close-popup
                          @click="menuActionEmit('convertObjectType', t.name)">
                          <q-item-section avatar>
                            <q-avatar size="sm" :icon="t.icon" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>{{ t.name }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Convert to</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <q-separator color="white" inset vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="autorenew" no-caps @click="menuActionEmit('rotate90')"
                    :disable="!selectedCount || selectedCount > 1">Rotate 90°
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Rotate 90°</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="sync" no-caps @click="menuActionEmit('rotate-90')"
                    :disable="!selectedCount || selectedCount > 1">Rotate -90°
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Rotate -90°</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip" no-caps @click="menuActionEmit('flipH')"
                    :disable="!selectedCount || selectedCount > 1">Flip horizontal
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Flip horizontal</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip" no-caps @click="menuActionEmit('flipV')"
                    :disable="!selectedCount || selectedCount > 1">Flip
                    vertical
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Flip vertical</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip_to_front" no-caps @click="menuActionEmit('bringToFront')"
                    :disable="!selectedCount || selectedCount > 1">Bring to front
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Bring to front</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip_to_back" no-caps @click="menuActionEmit('sendToBack')"
                    :disable="!selectedCount || selectedCount > 1">Send to back
                    <q-tooltip anchor="top middle" self="center right">
                      <strong>Send to Back</strong>
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
              <q-separator color="white" inset vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-toggle color="blue" false-value="Disable" true-value="Enable" v-model="showRulersGrid" size='xs'
                    @update:model-value="menuActionEmit('toggleRulersGrid', showRulersGrid)" style="margin-top: -3px;">
                    <span style="font-size: 11px;">Rulers & Grid</span>
                    <q-tooltip anchor="top middle" self="center right">
                      Show rulers and grid ({{ showRulersGrid }})
                    </q-tooltip>
                  </q-toggle>
                </div>
                <div class="button-row" style="margin-top: -3px;">
                  <q-btn @click="menuActionEmit('zoomOut')" :disable="zoom <= 10" dense flat size="sm" icon="zoom_out">
                    <q-tooltip anchor="top middle" self="center right">
                      Zoom out
                    </q-tooltip>
                  </q-btn>
                  <div class="flex items-center px-1" style="font-size: 12px;">
                    <input class="zoom-input" @keydown.enter="menuActionEmit('zoomSet', $event.target.value)"
                      :value="zoom" type="number" />%
                  </div>
                  <q-btn @click="menuActionEmit('zoomIn')" :disable="zoom >= 400" dense flat size="sm" icon="zoom_in">
                    <q-tooltip anchor="top middle" self="center right">
                      Zoom in
                    </q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="file" class="file-panel">
            <div class="container">
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="assignment" no-caps label="New Project" style="font-size: 11px;"
                    @click="menuActionEmit('newProject')" />
                  <span class="file-short-cut">(Ctrl + R)</span>
                </div>
              </div>
              <q-separator color="white" inset vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="file_open" no-caps label="Import" style="font-size: 11px;"
                    @click="menuActionEmit('importJsonAction')" />
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="file_open" no-caps label="Export" style="font-size: 11px;"
                    @click="menuActionEmit('exportToJsonAction')" />
                </div>
              </div>
              <q-separator color="white" inset vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="save" no-caps label="Save" @click="menuActionEmit('save')"
                    style="font-size: 11px;" />
                  <span class="file-short-cut">(Ctrl + S)</span>
                </div>
              </div>
              <!-- <q-separator color="white" inset vertical /> -->
            </div>
          </q-tab-panel>

          <q-tab-panel name="device" class="device-panel">
            <div class="row device-row">

              <q-list class="col-8" style="height: 50px;">
                <q-item>
                  <q-item-section top class="col-3">
                    <q-item-label class="q-mt-sm">Current: {{ currentDevice.data.device }}</q-item-label>
                  </q-item-section>

                  <q-item-section top class="col-1">
                    <q-item-label caption class="select-title">
                      Graphic
                    </q-item-label>
                    <q-item-label>
                      <span class="text-weight-medium select-text">{{ currentDevice.data.graphicFull.id }}</span>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section top class="col-3">
                    <q-item-label caption class="select-title">
                      Full label
                    </q-item-label>
                    <q-item-label>
                      <span class="text-weight-medium select-text">{{ currentDevice.data.graphicFull.fullLabel }}</span>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section top>
                    <q-item-label caption class="select-title">
                      Label
                    </q-item-label>
                    <q-item-label>
                      <span class="text-weight-medium select-text">{{ currentDevice.data.graphicFull.label }}</span>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section top>
                    <q-item-label caption class="select-title">
                      Element Count
                    </q-item-label>
                    <q-item-label>
                      <span class="text-weight-medium select-text">{{ currentDevice.data.graphicFull.elementCount
                        }}</span>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section avatar top>
                    <q-item-label caption class="select-title">
                      Action
                    </q-item-label>
                    <!-- <q-icon name="check" color="black" /> -->
                    <!-- <q-btn color="secondary" outline icon-right="check" label="Save" size="xs" /> -->
                    <q-link class="text-primary" style="font-size: 12px;margin-top: 2px;cursor: pointer;"
                      @click="showMoreDevices">Show more devices
                      <q-tooltip anchor="top middle" self="center left">
                        Save the current selection
                      </q-tooltip>
                    </q-link>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, ref, watch, onMounted } from 'vue'
import { useQuasar } from "quasar"
import { tools, user } from "../lib/common"

export default defineComponent({
  name: 'NewTopToolBar',
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
      // console.log('showRulersGrid props,show-rulers-grid', props.rulersGridVisible, showRulersGrid);
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
      // console.log('=== new-top-toolbar currentDevice', currentDevice);
    });

    /*
    watch(() => props.deviceModel, (newVal) => {
      console.log('=== new-top-toolbar newVal', newVal);
      currentDevice.value = newVal;
      deviceTabTitle.value = `Device (${props.deviceModel.data.device})`;
    });
    */

    return {
      tab: ref('home'),
      navGoBack,
      lockToggle,
      menuActionEmit,
      logout,
      tools,
      user,
      showRulersGrid: showRulersGrid,
      showMoreDevices,
      currentDevice,
      deviceTabTitle
    };
  },
});
</script>
