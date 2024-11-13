<style scoped>
.full-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-area {
  display: flex;
  flex: 1;
}

.side-bar {
  background-color: #f4f4f4;
  width: 106px;
}

.work-area {

  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  width: auto;
  /* background-color: aquamarine; */
  /*
   padding-left: v-bind("documentAreaPosition.workAreaPadding");
   position: fixed;
   margin-top: 37px;
  */
  flex: 1;
  margin-top: 1px;
  position: relative;
}

.document-area {
  position: relative;
  background-color: #e3e4e5;
  height: 100%;
  /* background: red; */
  height: calc(100vh - 38px);
}

.c-ruler {
  width: 20px;
  height: 20px;
  background-color: #ebeced;
  /* background-color: blue; */
  position: absolute;
  overflow: hidden;
  left: 1px;
  top: 1px;
}

.h-ruler {
  position: absolute;
  overflow: hidden;
  background-color: #ebeced;
  /* background-color: #416990; */
  overflow: hidden;
  top: 1px;
  left: 22px;
  width: calc(100vw - v-bind("documentAreaPosition.hRulerWOffset"));
  height: 20px
}

.v-ruler {
  position: absolute;
  overflow: hidden;
  background-color: #ebeced;
  /* background-color: #0f77de; */
  width: 20px;
  left: 1px;
  top: 22px;
  height: calc(100vh - 60px);
}

.hv-grid {
  position: absolute;
  background-color: #ebeced;
  /* background-color: #b25b5b; */
  inset: 22px 0px 0px 22px;
  /* width: calc(100vw - 166px); */
  /* height: calc(100vh - 97px); */
  overflow: hidden;
}

.viewport-wrapper {
  position: relative;
  background-color: transparent;
  scrollbar-width: thin;
  inset: 22px 0px 0px 22px;
  width: calc(100vw - v-bind("documentAreaPosition.wpwWOffset"));
  height: calc(100vh - 60px);
  /* overflow: hidden scroll; */
  overflow: scroll;
}

.viewport {
  /* width: 100%;
  height: calc(100vh - 36px);
  overflow: scroll;
  position: relative;
  background-image: repeating-linear-gradient(#d2d0d0 0 1px, transparent 1px 100%), repeating-linear-gradient(90deg, #d2d0d0 0 1px, transparent 1px 100%);
  background-size: 20px 20px; */

  /* background-color: aqua; */
  /* width: calc(100vw - v-bind("documentAreaPosition.wpWOffset"));
  height: calc(100vh - 68px); */
  width: v-bind("documentAreaPosition.wiewPortWH.width");
  height: v-bind("documentAreaPosition.wiewPortWH.height");
}
</style>

<template>
  <q-page>
    <div class="full-area">

      <div class="top-area">
        <!-- Top Toolbar -->
        <top-toolbar @menu-action="handleMenuAction" :object="appState.items[appState.activeItemIndex]"
          :selected-count="appState.selectedTargets?.length" :disable-undo="locked || undoHistory.length < 1"
          :disable-redo="locked || redoHistory.length < 1" :disable-paste="locked || !clipboardFull" :zoom="zoom" />
      </div>
      <div class="main-area">
        <div class="side-bar" v-if="!locked">
          <!-- Tools Sidebar -->
          <ToolsSidebar v-if="!locked" :selected-tool="selectedTool" :images="library.images"
            :object-lib="library.objLib" @select-tool="selectTool" @delete-lib-item="deleteLibItem"
            @rename-lib-item="renameLibItem" @delete-lib-image="deleteLibImage" @save-lib-image="saveLibImage"
            @tool-dropped="toolDropped" />
        </div>
        <div class="work-area">
          <div class="document-area">
            <div class="c-ruler"></div>
            <div class="h-ruler">
              <HRuler id="h-ruler" :documentArea="documentAreaPosition"></HRuler>
            </div>
            <div class="v-ruler">
              <VRuler id="v-ruler" :documentArea="documentAreaPosition"></VRuler>
            </div>
            <div class="hv-grid">
              <HVGrid id="hv-grid" :documentArea="documentAreaPosition"></HVGrid>
            </div>
            <div class="viewport-wrapper" @scroll="handleScroll">
              <!-- Navigation Buttons -->
              <div class="flex fixed top-20 ml-10 z-50 nav-btns" :class="{ locked: locked }">
                <!-- Go Back Button -->
                <q-btn v-if="grpNav?.length > 1" icon="arrow_back" class="back-btn mr-2" dense round size="md"
                  color="primary" @click="navGoBack">
                  <q-tooltip anchor="top middle" self="bottom middle">
                    <strong>Go back</strong>
                  </q-tooltip>
                </q-btn>
                <!-- Lock/Unlock Button -->
                <q-btn :icon="locked ? 'lock_outline' : 'lock_open'" class="lock-btn" flat round dense size="md"
                  :color="locked ? 'primary' : 'normal'" @click="lockToggle">
                  <q-tooltip anchor="top middle" self="bottom middle">
                    <strong v-if="!locked">Lock</strong>
                    <strong v-else>Unlock</strong>
                  </q-tooltip>
                </q-btn>
              </div>
              <!-- Viewport Area -->
              <div class="viewport" tabindex="0" @mousemove="viewportMouseMoved" @click.right="viewportRightClick"
                @dragover="($event) => {
                  $event.preventDefault();
                }
                  ">
                <!-- Cursor Icon -->
                <q-icon class="cursor-icon" v-if="!locked && selectedTool.name !== 'Pointer'" :name="selectedTool.icon
                  ? selectedTool.icon
                  : selectedTool.type === 'libItem'
                    ? 'space_dashboard'
                    : 'photo'
                  " size="sm" :style="{
                    left: cursorIconPos.x + 10 + 'px',
                    top: cursorIconPos.y + 'px',
                  }" />
                <!-- Vue Selecto for Selectable Items -->
                <vue-selecto ref="selecto" dragContainer=".viewport" :selectableTargets="!locked ? targets : []"
                  :hitRate="20" :selectByClick="!locked" :selectFromInside="true" :toggleContinueSelect="['shift']"
                  :ratio="0" :boundContainer="true" :getElementRect="getElementInfo" @dragStart="onSelectoDragStart"
                  @selectEnd="onSelectoSelectEnd" @dragEnd="onSelectoDragEnd" :dragCondition="selectoDragCondition">
                </vue-selecto>
                <!-- Moveable Component for Draggable/Resizable Items -->
                <div ref="viewport">
                  <vue-moveable ref="moveable" :draggable="!locked" :resizable="!locked" :rotatable="!locked"
                    :keepRatio="keepRatio" :target="appState.selectedTargets" :snappable="snappable && !locked"
                    :snapThreshold="10" :isDisplaySnapDigit="true" :snapGap="true" :snapDirections="{
                      top: true,
                      right: true,
                      bottom: true,
                      left: true,
                    }" :elementSnapDirections="{
                      top: true,
                      right: true,
                      bottom: true,
                      left: true,
                    }" :snapDigit="0" :elementGuidelines="appState.elementGuidelines" :origin="true"
                    :throttleResize="0" :throttleRotate="0" rotationPosition="top" :originDraggable="true"
                    :originRelative="true" :defaultGroupRotate="0" defaultGroupOrigin="50% 50%"
                    :padding="{ left: 0, top: 0, right: 0, bottom: 0 }" @clickGroup="onClickGroup"
                    @drag-start="onDragStart" @drag="onDrag" @drag-end="onDragEnd" @dragGroupStart="onDragGroupStart"
                    @dragGroup="onDragGroup" @dragGroupEnd="onDragGroupEnd" @resizeStart="onResizeStart"
                    @resize="onResize" @resizeEnd="onResizeEnd" @rotateStart="onRotateStart" @rotate="onRotate"
                    @rotateEnd="onRotateEnd" @resizeGroupStart="onResizeGroupStart" @resizeGroup="onResizeGroup"
                    @resizeGroupEnd="onResizeGroupEnd" @rotateGroupStart="onRotateGroupStart"
                    @rotateGroup="onRotateGroup" @rotateGroupEnd="onRotateGroupEnd">
                  </vue-moveable>

                  <!-- Context Menu -->
                  <q-menu v-if="contextMenuShow" touch-position target=".moveable-area" context-menu>
                    <q-list>
                      <!-- Copy Option -->
                      <q-item dense clickable v-close-popup @click="saveSelectedToClipboard">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="content_copy" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Copy</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip>Ctrl + C</q-chip>
                        </q-item-section>
                      </q-item>
                      <q-separator />
                      <!-- Duplicate Option -->
                      <q-item dense clickable v-close-popup @click="duplicateSelected">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="content_copy" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Duplicate</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip>Ctrl + D</q-chip>
                        </q-item-section>
                      </q-item>
                      <q-separator />
                      <!-- Group Option -->
                      <q-item dense clickable v-close-popup @click="groupSelected">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="join_full" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Group</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip>Ctrl + G</q-chip>
                        </q-item-section>
                      </q-item>
                      <q-item dense clickable v-close-popup @click="ungroupSelected">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="join_inner" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Ungroup</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip>Ctrl + Shift + G</q-chip>
                        </q-item-section>
                      </q-item>
                      <q-separator />
                      <!-- Add to Library Option -->
                      <q-item dense clickable v-close-popup @click="addToLibrary">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="library_books" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Add to Library</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip>Ctrl + L</q-chip>
                        </q-item-section>
                      </q-item>
                      <q-separator />
                      <!-- Bring to Front Option -->
                      <q-item dense clickable v-close-popup @click="bringSelectedToFront()">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="flip_to_front" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section class="py-2">Bring to front</q-item-section>
                      </q-item>
                      <!-- Send to Back Option -->
                      <q-item dense clickable v-close-popup @click="sendSelectedToBack()">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="flip_to_back" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section class="py-2">Send to Back</q-item-section>
                      </q-item>
                      <q-separator />
                      <!-- Rotate 90 Degrees Option -->
                      <q-item dense clickable v-close-popup @click="rotate90Selected()">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="autorenew" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>Rotate 90°</q-item-section>
                      </q-item>
                      <!-- Rotate -90 Degrees Option -->
                      <q-item dense clickable v-close-popup @click="rotate90Selected(true)">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="sync" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>Rotate -90°</q-item-section>
                      </q-item>
                      <q-separator />
                      <!-- Delete Option -->
                      <q-item dense clickable v-close-popup @click="deleteSelected">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="delete" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Delete</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip>Delete</q-chip>
                        </q-item-section>
                      </q-item>
                      <!-- Weld Option -->
                      <q-item dense clickable v-close-popup @click="weldSelected">
                        <q-item-section avatar>
                          <q-avatar size="sm" icon="splitscreen" color="grey-7" text-color="white" />
                        </q-item-section>
                        <q-item-section>Weld Selected</q-item-section>
                        <q-item-section side>
                          <q-chip>Ctrl + B</q-chip>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>

                  <div v-for="(item, index) in appState.items" :key="item.id" ref="targets"
                    :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
                    :id="`moveable-item-${item.id}`" @mousedown.right="selectByRightClick" class="moveable-item-wrapper"
                    :class="`moveable-item-index-${index}`">
                    <q-menu v-if="!locked && appState.selectedTargets?.length === 1" touch-position context-menu>
                      <q-list>
                        <q-item dense clickable v-close-popup @click="linkT3EntryDialogAction">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="link" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Link</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item dense clickable v-close-popup @click="saveSelectedToClipboard">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="content_copy" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>
                            <q-item-label>Copy</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-chip>Ctrl + C</q-chip>
                          </q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item dense clickable v-close-popup @click="duplicateObject(item)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="file_copy" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Duplicate</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item dense clickable v-close-popup @click="rotate90(item)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="autorenew" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Rotate 90°</q-item-section>
                        </q-item>
                        <q-item dense clickable v-close-popup @click="rotate90(item, true)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="sync" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Rotate -90°</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item dense clickable v-close-popup @click="flipH(item)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="flip" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Flip horizontal</q-item-section>
                        </q-item>
                        <q-item dense clickable v-close-popup @click="flipV(item)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="flip" color="grey-7" text-color="white"
                              style="transform: rotate(90deg)" />
                          </q-item-section>
                          <q-item-section>Flip vertical</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item dense clickable v-close-popup @click="bringToFront(item)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="flip_to_front" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Bring to front</q-item-section>
                        </q-item>
                        <q-item dense clickable v-close-popup @click="sendToBack(item)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="flip_to_back" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Send to Back</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item dense clickable>
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="transform" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Convert to</q-item-section>
                          <q-item-section side>
                            <q-icon name="keyboard_arrow_right" />
                          </q-item-section>
                          <q-menu anchor="top end" self="top start" auto-close>
                            <q-list>
                              <q-item v-for="t in tools.filter(
                                (i) =>
                                  i.name !== item.type &&
                                  !['Duct', 'Pointer', 'Text'].includes(i.name)
                              )" :key="t.name" dense clickable v-close-popup @click="convertObjectType(item, t.name)">
                                <q-item-section avatar>
                                  <q-avatar size="sm" :icon="t.icon" color="grey-7" text-color="white" />
                                </q-item-section>
                                <q-item-section>{{ t.name }}</q-item-section>
                              </q-item>
                            </q-list>
                          </q-menu>
                        </q-item>
                        <q-separator />
                        <q-item dense clickable v-close-popup @click="removeObject(item)">
                          <q-item-section avatar>
                            <q-avatar size="sm" icon="remove" color="grey-7" text-color="white" />
                          </q-item-section>
                          <q-item-section>Remove</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>

                    <object-type ref="objectsRef" v-if="item.cat !== 'General'" :item="item" :key="item.id + item.type"
                      :class="{
                        link: locked && item.t3Entry,
                      }" :show-arrows="locked && !!item.t3Entry?.range" @object-clicked="objectClicked(item)"
                      @auto-manual-toggle="autoManualToggle(item)" @change-value="changeEntryValue"
                      @update-weld-model="updateWeldModel" />
                    <CanvasShape v-if="
                      item.cat === 'General' ||
                      item.type === 'Weld_General' ||
                      item.type === 'Weld_Duct'
                    " ref="objectsRef" :item="item" :key="item.id + item.type" :class="{
                      link: locked && item.t3Entry,
                    }" :show-arrows="locked && !!item.t3Entry?.range" @object-clicked="objectClicked(item)"
                      @auto-manual-toggle="autoManualToggle(item)" @change-value="changeEntryValue"
                      @update-weld-model="updateWeldModelCanvas">
                    </CanvasShape>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Object config sidebar -->
    <ObjectConfig :object="appState.items[appState.activeItemIndex]" v-if="
      !locked &&
      appState.items[appState.activeItemIndex] &&
      (appState.activeItemIndex || appState.activeItemIndex === 0)
    " @refresh-moveable="refreshMoveable" @T3UpdateEntryField="T3UpdateEntryField"
      @linkT3Entry="linkT3EntryDialogAction" @gaugeSettings="gaugeSettingsDialogAction"
      @mounted="addActionToHistory('Object settings opened')" @no-change="objectSettingsUnchanged" />
  </q-page>
  <!-- Link entry dialog -->
  <q-dialog v-model="linkT3EntryDialog.active">
    <q-card style="min-width: 650px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Link Entry</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="height: 70vh" class="scroll">
        <div class="flex">
          <q-btn icon="refresh" flat @click="reloadPanelsData">
            <q-tooltip anchor="top middle" self="bottom middle">
              <strong>Reload panels data</strong>
            </q-tooltip>
          </q-btn>
          <q-select :option-label="entryLabel" option-value="id" filled use-input hide-selected fill-input
            input-debounce="0" v-model="linkT3EntryDialog.data" :options="selectPanelOptions"
            @filter="selectPanelFilterFn" label="Select Entry" class="grow">
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section class="grow">
                  <q-item-label>{{ entryLabel(scope.opt) }}</q-item-label>
                </q-item-section>
                <q-item-section avatar class="pl-1 min-w-0">
                  <q-chip size="sm" icon="label_important">Panel: {{ scope.opt.pid }}</q-chip>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>
        <div class="flex flex-col items-center mt-4">
          <q-circular-progress v-if="T3000_Data.loadingPanel !== null" indeterminate show-value
            :value="loadingPanelsProgress" size="270px" :thickness="0.22" color="light-blue" track-color="grey-3"
            class="q-ma-md overflow-hidden">
            <div class="text-xl text-center">
              <div>{{ loadingPanelsProgress }}%</div>
              <div>
                Loading Panel #{{
                  T3000_Data.panelsList[T3000_Data.loadingPanel].panel_number
                }}
              </div>
            </div>
          </q-circular-progress>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" :disable="!linkT3EntryDialog.data" color="primary" @click="linkT3EntrySave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <!-- Edit Gauge/Dial dialog -->
  <GaugeSettingsDialog v-model:active="gaugeSettingsDialog.active" :data="gaugeSettingsDialog.data"
    @saved="gaugeSettingsSave" />

  <!-- Import from JSON -->
  <q-dialog v-model="importJsonDialog.active">
    <q-card style="min-width: 450px">
      <q-card-section>
        <div class="text-h6">Import from a JSON file</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <file-upload :types="['application/json']" @uploaded="handleFileUploaded" @file-added="importJsonFileAdded" />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" @click="importJsonDialog.active = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, toRaw, triggerRef } from "vue";
import { useQuasar, useMeta } from "quasar";
import { VueMoveable, getElementInfo } from "vue3-moveable";
import { VueSelecto } from "vue3-selecto";
import KeyController /* , { getCombi, getKey } */ from "keycon";
import { cloneDeep } from "lodash";
import panzoom from "panzoom";
import ObjectType from "../../components/ObjectType.vue";
import GaugeSettingsDialog from "../../components/GaugeSettingsDialog.vue";
import FileUpload from "../../components/FileUpload.vue";
import TopToolbar from "../../components/TopToolbar.vue";
import ToolsSidebar from "../../components/ToolsSidebar.vue";
import ObjectConfig from "../../components/ObjectConfig.vue";
import { tools, T3_Types, getObjectActiveValue, T3000_Data, user, globalNav, demoDeviceData } from "../../lib/common";
import { liveApi } from "../../lib/api";
import CanvasType from "src/components/CanvasType.vue";
import CanvasShape from "src/components/CanvasShape.vue";
import { getOverlapSize } from "overlap-area";
import { startsWith } from "lodash";
import HRuler from "src/components/HRuler.vue";
import VRuler from "src/components/VRuler.vue";
import HVGrid from "src/components/HVGrid.vue";
import { use } from "echarts";

// Meta information for the application
// Set the meta information
const metaData = { title: "HVAC Drawer" };
useMeta(metaData);

// Ruler & Grid default value
const documentAreaPosition = ref(
  {
    workAreaPadding: "110px", hRulerWOffset: "128px", wpwWOffset: "128px", wpWOffset: "136px",
    hRuler: { width: 0, height: 20 },
    vRuler: { width: 20, height: 0 },
    hvGrid: { width: 0, height: 0 },

    //width:  calc(100vw - v-bind("documentAreaPosition.wpWOffset"));
    //height: calc(100vh - 68px);
    wiewPortWH: { width: "calc(100vw - v-bind('documentAreaPosition.wpWOffset'))", height: "calc(100vh - 68px)" }
  });

const keycon = new KeyController(); // Initialize key controller for handling keyboard events
const $q = useQuasar(); // Access Quasar framework instance
const moveable = ref(null); // Reference to the moveable component instance
const selecto = ref(null); // Reference to the selecto component instance
const viewport = ref(null); // Reference to the viewport element
const targets = ref([]); // Array of selected targets
const selectedTool = ref({ ...tools[0], type: "default" }); // Default selected tool
const linkT3EntryDialog = ref({ active: false, data: null }); // State of the link T3 entry dialog

// State variables for drawing and transformations
const isDrawing = ref(false);
const startTransform = ref([0, 0]);
const snappable = ref(true); // Enable snapping for moveable components
const keepRatio = ref(false); // Maintain aspect ratio for resizing

// List of continuous object types
const continuesObjectTypes = ["Duct", "Wall"];

// State of the import JSON dialog
const importJsonDialog = ref({ addedCount: 0, active: false, uploadBtnLoading: false, data: null });
const savedNotify = ref(false); // Notification state for saving
const contextMenuShow = ref(false); // State of the context menu visibility

// Panel options for selection
const selectPanelOptions = ref(T3000_Data.value.panelsData);
let getPanelsInterval = null; // Interval for fetching panel data

// Computed property for loading panels progress
const loadingPanelsProgress = computed(() => {
  if (T3000_Data.value.loadingPanel === null) return 100;
  return parseInt(
    (T3000_Data.value.loadingPanel + 1 / T3000_Data.value.panelsList.length) *
    100
  );
});

const clipboardFull = ref(false); // State of the clipboard

// Dev mode only
if (process.env.DEV) {
  demoDeviceData().then((data) => {
    T3000_Data.value.panelsData = data.data;
    T3000_Data.value.panelsRanges = data.ranges;
    selectPanelOptions.value = T3000_Data.value.panelsData;
  });
}

// Initialization of empty project and library structures
let panzoomInstance = null;
const emptyProject = {
  version: process.env.VERSION,
  items: [],
  selectedTargets: [],
  elementGuidelines: [],
  itemsCount: 0,
  groupCount: 0,
  activeItemIndex: null,
  viewportTransform: { x: 0, y: 0, scale: 1 },
};
const emptyLib = {
  version: process.env.VERSION,
  imagesCount: 0,
  objLibItemsCount: 0,
  images: [],
  objLib: [],
};

// State references for the library and application state
const library = ref(cloneDeep(emptyLib));
const appState = ref(cloneDeep(emptyProject));
const undoHistory = ref([]); // History for undo actions
const redoHistory = ref([]); // History for redo actions
const locked = ref(false); // State to lock or unlock the interface
const grpNav = ref([]); // Navigation history for grouped elements
let lastAction = null; // Store the last action performed
const cursorIconPos = ref({ x: 0, y: 0 }); // Position of the cursor icon
const objectsRef = ref(null); // Reference to objects

const handleScroll = (event) => {
  document.querySelector('#v-ruler').scroll(0, event.target.scrollTop);
  document.querySelector('#h-ruler').scroll(event.target.scrollLeft, 0);
};

// Lifecycle hook for component mount
onMounted(() => {
  // Set global navigation properties
  globalNav.value.title = "HVAC Drawer";
  globalNav.value.back = null;
  globalNav.value.home = "/";
  isLoggedIn(); // Check if user is logged in

  // Restore app state from local storage if not in a webview
  if (!window.chrome?.webview?.postMessage) {
    const localState = localStorage.getItem("appState");
    if (localState) {
      appState.value = JSON.parse(localState);
    }
  }

  // Save the state before the window is unloaded
  window.addEventListener("beforeunload", function (event) {
    save();
  });

  // Initialize panzoom for viewport
  panzoomInstance = panzoom(viewport.value, {
    maxZoom: 4,
    minZoom: 0.1,
    zoomDoubleClickSpeed: 1,
    filterKey: function (/* e, dx, dy, dz */) {
      // don't let panzoom handle this event:
      return true;
    },
    beforeMouseDown: function (e) {
      // allow mouse-down panning only if altKey is down. Otherwise - ignore
      var shouldIgnore = !e.altKey;
      return shouldIgnore;
    },
  });

  // Update the viewport transform on panzoom transform event
  panzoomInstance.on("transform", function (e) {

    const pzTrs = e.getTransform();
    // pzTrs.x = pzTrs.x < 0 ? 0 : pzTrs.x;
    // pzTrs.y = pzTrs.y < 0 ? 0 : pzTrs.y;

    appState.value.viewportTransform = e.getTransform();
    triggerRef(appState);

    console.log('Panzoom transform:', e.getTransform(), pzTrs);
    restDocumentAreaPosition(e.getTransform());
  });

  // Request initial data and panels list if in a webview
  window.chrome?.webview?.postMessage({
    action: 1, // GET_INITIAL_DATA
  });
  window.chrome?.webview?.postMessage({
    action: 4, // GET_PANELS_LIST
  });

  // Set intervals for fetching panel and entry data if in a webview
  if (window.chrome?.webview?.postMessage) {
    getPanelsInterval = setInterval(window.chrome.webview.postMessage, 10000, {
      action: 4, // GET_PANELS_LIST
    });

    setInterval(function () {
      if (getLinkedEntries().length === 0) return;
      window.chrome?.webview?.postMessage({
        action: 6, // GET_ENTRIES
        data: getLinkedEntries().map((ii) => {
          return {
            panelId: ii.t3Entry.pid,
            index: ii.t3Entry.index,
            type: T3_Types[ii.t3Entry.type],
          };
        }),
      });
    }, 10000);
  }

  // Refresh moveable guides after a short delay
  setTimeout(() => {
    refreshMoveableGuides();
  }, 100);

  // Viewport wrapper scroll event listener
  const div = document.querySelector('.viewport-wrapper');
  div.addEventListener('scroll', handleScroll);

  // Init ruler and grid default value
  documentAreaPosition.value.hRuler = { width: div.clientWidth, height: 20 };
  documentAreaPosition.value.vRuler = { width: 20, height: div.clientHeight };
  documentAreaPosition.value.hvGrid = { width: div.clientWidth, height: div.clientHeight };

  console.log('Document Area Position:', documentAreaPosition.value);
});

// Lifecycle hook for component unmount
onUnmounted(() => {
  if (panzoomInstance?.dispose) return;
  panzoomInstance.dispose();
});

// Handle messages from the webview
window.chrome?.webview?.addEventListener("message", (arg) => {
  console.log("Received a message from webview", arg.data);
  if ("action" in arg.data) {
    // Handle various actions based on message data
    if (arg.data.action === "GET_PANELS_LIST_RES") {
      if (arg.data.data?.length) {
        T3000_Data.value.panelsList = arg.data.data;
        T3000_Data.value.loadingPanel = 0;
        window.chrome?.webview?.postMessage({
          action: 0, // GET_PANEL_DATA
          panelId: T3000_Data.value.panelsList[0].panel_number,
        });
      }
    } else if (arg.data.action === "UPDATE_ENTRY_RES") {
      // Handle update entry response
    } else if (arg.data.action === "GET_INITIAL_DATA_RES") {
      if (arg.data.data) {
        arg.data.data = JSON.parse(arg.data.data);
      }
      appState.value = arg.data.data;
      grpNav.value = [arg.data.entry];
      if (arg.data.library) {
        arg.data.library = JSON.parse(arg.data.library);
        library.value = arg.data.library;
      }
      setTimeout(() => {
        refreshMoveableGuides();
      }, 100);
    } else if (arg.data.action === "LOAD_GRAPHIC_ENTRY_RES") {
      if (arg.data.data) {
        arg.data.data = JSON.parse(arg.data.data);
      }
      appState.value = arg.data.data;
      if (grpNav.value.length > 1) {
        const navItem = grpNav.value[grpNav.value.length - 2];
        if (
          navItem.index !== arg.data.entry.index ||
          navItem.pid !== arg.data.entry.pid
        ) {
          grpNav.value.push(arg.data.entry);
        } else {
          grpNav.value.pop();
        }
      } else {
        grpNav.value.push(arg.data.entry);
      }

      setTimeout(() => {
        refreshMoveableGuides();
      }, 100);
    } else if (arg.data.action === "GET_PANEL_DATA_RES") {
      if (getPanelsInterval && arg.data?.panel_id) {
        clearInterval(getPanelsInterval);
      }
      if (arg.data?.panel_id) {
        if (
          T3000_Data.value.loadingPanel !== null &&
          T3000_Data.value.loadingPanel < T3000_Data.value.panelsList.length - 1
        ) {
          T3000_Data.value.loadingPanel++;
          const index = T3000_Data.value.loadingPanel;
          window.chrome?.webview?.postMessage({
            action: 0, // GET_PANEL_DATA
            panelId: T3000_Data.value.panelsList[index].panel_number,
          });
        }
        if (
          T3000_Data.value.loadingPanel !== null &&
          T3000_Data.value.loadingPanel ===
          T3000_Data.value.panelsList.length - 1
        ) {
          T3000_Data.value.loadingPanel = null;
        }

        T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
          (item) => item.pid !== arg.data.panel_id
        );
        T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
          arg.data.data
        );
        T3000_Data.value.panelsData.sort((a, b) => a.pid - b.pid);
        selectPanelOptions.value = T3000_Data.value.panelsData;
        T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.filter(
          (item) => item.pid !== arg.data.panel_id
        );
        T3000_Data.value.panelsRanges = T3000_Data.value.panelsRanges.concat(
          arg.data.ranges
        );

        refreshLinkedEntries(arg.data.data);
      }
    } else if (arg.data.action === "GET_ENTRIES_RES") {
      arg.data.data.forEach((item) => {
        const itemIndex = T3000_Data.value.panelsData.findIndex(
          (ii) =>
            ii.index === item.index &&
            ii.type === item.type &&
            ii.pid === item.pid
        );
        if (itemIndex !== -1) {
          T3000_Data.value.panelsData[itemIndex] = item;
        }
      });

      if (!linkT3EntryDialog.value.active) {
        selectPanelOptions.value = T3000_Data.value.panelsData;
      }
      refreshLinkedEntries(arg.data.data);
    } else if (arg.data.action === "SAVE_GRAPHIC_DATA_RES") {
      if (arg.data.data?.status === true) {
        if (!savedNotify.value) return;
        $q.notify({
          message: "Saved successfully.",
          color: "primary",
          icon: "check_circle",
          actions: [
            {
              label: "Dismiss",
              color: "white",
              handler: () => {
                /* ... */
              },
            },
          ],
        });
      } else {
        $q.notify({
          message: "Error, not saved!",
          color: "negative",
          icon: "error",
          actions: [
            {
              label: "Dismiss",
              color: "white",
              handler: () => {
                /* ... */
              },
            },
          ],
        });
      }
    } else if (arg.data.action === "SAVE_IMAGE_RES") {
      library.value.imagesCount++;
      library.value.images.push({
        id: "IMG-" + library.value.imagesCount,
        name: arg.data.data.name,
        path: arg.data.data.path,
        online: false,
      });
      saveLib();
    }
  }
});

function viewportMouseMoved(e) {
  // Move object icon with mouse
  cursorIconPos.value.x = e.clientX - viewportMargins.left;
  cursorIconPos.value.y = e.clientY - viewportMargins.top;

  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  // process drawing ducts
  if (
    isDrawing.value &&
    continuesObjectTypes.includes(selectedTool.value.name) &&
    appState.value.activeItemIndex !== null
  ) {
    // Check if the Ctrl key is pressed
    const isCtrlPressed = e.ctrlKey;
    // Calculate the distance and angle between the initial point and mouse cursor
    const mouseX = (e.clientX - viewportMargins.left - appState.value.viewportTransform.x) * scalPercentage;
    const mouseY = (e.clientY - viewportMargins.top - appState.value.viewportTransform.y) * scalPercentage;
    const dx = mouseX - startTransform.value[0];
    const dy = mouseY - startTransform.value[1];
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Rotate in 5-degree increments when Ctrl is held
    if (isCtrlPressed) {
      angle = Math.round(angle / 5) * 5;
    }

    const distance = Math.sqrt(dx * dx + dy * dy) + selectedTool.value.height;

    // Set the scale and rotation of the drawing line
    appState.value.items[appState.value.activeItemIndex].rotate = angle;
    appState.value.items[appState.value.activeItemIndex].width = distance;
    refreshObjects();
  }
}
// Refreshes the guidelines for the moveable elements
function refreshMoveableGuides() {
  appState.value.elementGuidelines = [];
  const lines = document.querySelectorAll(
    `.moveable-item-wrapper:not(moveable-item-index-${appState.value.activeItemIndex}) .moveable-item`
  );
  Array.from(lines).forEach(function (el) {
    appState.value.elementGuidelines.push(el);
  });
}

// Refreshes objects by calling their refresh method, if available
function refreshObjects() {
  if (!objectsRef.value) return;
  for (const obj of objectsRef.value) {
    if (!obj.refresh) continue;
    obj.refresh();
  }
}

// Adds an action to the history for undo/redo functionality
function addActionToHistory(title) {
  if (process.env.DEV) {
    console.log(title); // Log the action title in development mode
  }
  if (title !== "Move Object") {
    setTimeout(() => {
      save(); // Save the current state
      refreshObjects(); // Refresh objects
    }, 200);
  }

  redoHistory.value = []; // Clear redo history
  undoHistory.value.unshift({
    title,
    state: cloneDeep(appState.value),
  });

  // Maintain a maximum of 20 actions in the undo history
  if (undoHistory.value.length > 20) {
    undoHistory.value.pop();
  }
}

// Handles click events on group elements
function onClickGroup(e) {
  selecto.value.clickTarget(e.inputEvent, e.inputTarget);
}

// Starts dragging an element
function onDragStart(e) {
  addActionToHistory("Move Object");
}

// Handles dragging of an element
function onDrag(e) {
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  // item.translate = e.beforeTranslate;
  e.target.style.transform = e.transform;
}

// Ends the dragging of an element
function onDragEnd(e) {
  if (!e.lastEvent) {
    undoHistory.value.shift(); // Remove the last action if dragging was not completed
  } else {
    const item = appState.value.items.find(
      (item) => `moveable-item-${item.id}` === e.target.id
    );
    item.translate = e.lastEvent.beforeTranslate;
    save(); // Save the state after drag end
    refreshObjects(); // Refresh objects
  }
}

// Starts dragging a group of elements
function onDragGroupStart(e) {
  addActionToHistory("Move Group");
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    ev.set(appState.value.items[itemIndex].translate);
  });
}

// Handles dragging of a group of elements
function onDragGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    appState.value.items[itemIndex].translate = ev.beforeTranslate;
  });
}

// Ends the dragging of a group of elements
function onDragGroupEnd(e) {
  if (!e.lastEvent) {
    undoHistory.value.shift(); // Remove the last action if dragging was not completed
  } else {
    refreshObjects(); // Refresh objects
  }
}

// Handles the start of a selecto drag event
function onSelectoDragStart(e) {
  const target = e.inputEvent.target;
  if (
    moveable.value.isMoveableElement(target) ||
    appState.value.selectedTargets.some(
      (t) => t === target || t.contains(target)
    )
  ) {
    e.stop();
  }
}

// Handles the end of a selecto select event
function onSelectoSelectEnd(e) {
  appState.value.selectedTargets = e.selected;
  if (e.selected && !e.inputEvent.ctrlKey) {
    const selectedItems = appState.value.items.filter((i) =>
      e.selected.some((ii) => ii.id === `moveable-item-${i.id}`)
    );
    const selectedGroups = [
      ...new Set(
        selectedItems.filter((iii) => iii.group).map((iiii) => iiii.group)
      ),
    ];
    selectedGroups.forEach((gId) => {
      selectGroup(gId);
    });
  }

  if (appState.value.selectedTargets.length === 1) {
    appState.value.activeItemIndex = appState.value.items.findIndex(
      (item) =>
        `moveable-item-${item.id}` === appState.value.selectedTargets[0].id
    );
  } else {
    appState.value.activeItemIndex = null;
  }

  if (e.isDragStart) {
    e.inputEvent.preventDefault();

    setTimeout(() => {
      moveable.value.dragStart(e.inputEvent);
    });
  }

  if (appState.value.selectedTargets.length > 1 && !locked.value) {
    setTimeout(() => {
      contextMenuShow.value = true;
    }, 100);
  } else {
    contextMenuShow.value = false;
  }
  refreshMoveableGuides(); // Refresh the moveable guidelines after selection
}

// Selects a group of elements by their group ID
function selectGroup(id) {
  const targets = [];
  appState.value.items
    .filter(
      (i) =>
        i.group === id &&
        !appState.value.selectedTargets.some(
          (ii) => ii.id === `moveable-item-${i.id}`
        )
    )
    .forEach((iii) => {
      const target = document.querySelector(`#moveable-item-${iii.id}`);
      targets.push(target);
    });

  appState.value.selectedTargets =
    appState.value.selectedTargets.concat(targets);
  selecto.value.setSelectedTargets(appState.value.selectedTargets);
}

// Starts resizing an element
function onResizeStart(e) {
  addActionToHistory("Resize object");
  const itemIndex = appState.value.items.findIndex(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  e.setOrigin(["%", "%"]);
  e.dragStart && e.dragStart.set(appState.value.items[itemIndex].translate);

  // console.log("IndexPage.vue -> onResizeStart -> e", e);
}

// Handles resizing of an element
function onResize(e) {
  // appState.value.items[itemIndex].width = e.width
  // appState.value.items[itemIndex].height = e.height
  // appState.value.items[itemIndex].translate = e.drag.beforeTranslate;
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  e.target.style.width = `${e.width}px`;
  e.target.style.height = `${e.height}px`;
  e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
}

// Ends the resizing of an element
function onResizeEnd(e) {
  const itemIndex = appState.value.items.findIndex(
    (item) => `moveable-item-${item.id}` === e?.lastEvent?.target?.id
  );

  appState.value.items[itemIndex].width = e.lastEvent.width;
  appState.value.items[itemIndex].height = e.lastEvent.height;
  appState.value.items[itemIndex].translate = e.lastEvent.drag.beforeTranslate;

  refreshObjects(); // Refresh objects after resizing
}

// Starts rotating an element
function onRotateStart(e) {
  addActionToHistory("Rotate object");
}

// Handles rotating of an element
function onRotate(e) {
  // e.target.style.transform = e.drag.transform;
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  item.rotate = e.rotate;
}

// Refreshes objects on rotate end
function onRotateEnd(e) {
  refreshObjects();
}

// refreshes objects on rotate group end
function onRotateGroupEnd(e) {
  refreshObjects();
}

// Maintaining aspect ratio on resize group start
function onResizeGroupStart(e) {
  keepRatio.value = true;
}

// Handles resizing of a group of elements
function onResizeGroup(e) {
  e.events.forEach((ev, i) => {
    ev.target.style.width = `${ev.width}px`;
    ev.target.style.height = `${ev.height}px`;
    ev.target.style.transform = ev.drag.transform;
  });
}

// Ends the resizing of a group of elements and updates the app state
function onResizeGroupEnd(e) {
  e.events.forEach((ev) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.lastEvent.target.id
    );
    appState.value.items[itemIndex].width = ev.lastEvent.width;
    appState.value.items[itemIndex].height = ev.lastEvent.height;
    appState.value.items[itemIndex].translate =
      ev.lastEvent.drag.beforeTranslate;
  });
  refreshObjects();
  keepRatio.value = false;
}

// Starts rotating a group of elements and adds the action to the history
function onRotateGroupStart(e) {
  addActionToHistory("Rotate Group");
  e.events.forEach((ev) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    ev.set(appState.value.items[itemIndex].rotate);
    ev.dragStart && ev.dragStart.set(appState.value.items[itemIndex].translate);
  });
}

// Handles rotating of a group of elements and updates their state
function onRotateGroup(e) {
  e.events.forEach((ev, i) => {
    const itemIndex = appState.value.items.findIndex(
      (item) => `moveable-item-${item.id}` === ev.target.id
    );
    appState.value.items[itemIndex].translate = ev.drag.beforeTranslate;
    appState.value.items[itemIndex].rotate = ev.rotate;
  });
}

// Adds a new object to the app state and updates guidelines
function addObject(item, group = undefined, addToHistory = true) {
  if (addToHistory) {
    addActionToHistory(`Add ${item.type}`);
  }
  appState.value.itemsCount++;
  item.id = appState.value.itemsCount;
  item.group = group;
  if (!item.settings.titleColor) {
    item.settings.titleColor = "inherit";
  }
  if (!item.settings.bgColor) {
    item.settings.bgColor = "inherit";
  }
  if (!item.settings.textColor) {
    item.settings.textColor = "inherit";
  }
  if (!item.settings.fontSize) {
    item.settings.fontSize = 16;
  }
  appState.value.items.push(item);
  const lines = document.querySelectorAll(".moveable-item");
  appState.value.elementGuidelines = [];
  Array.from(lines).forEach(function (el) {
    appState.value.elementGuidelines.push(el);
  });
  return item;
}

const viewportMargins = {
  // top: 36,
  top: 45,
  left: 120,
};

// Adds a library item to the app state and updates selection
function addLibItem(items, size, pos) {
  const elements = [];
  const addedItems = [];
  appState.value.groupCount++;
  items.forEach((item) => {
    addedItems.push(cloneObject(item, appState.value.groupCount));
  });
  setTimeout(() => {
    addedItems.forEach((addedItem) => {
      const el = document.querySelector(`#moveable-item-${addedItem.id}`);
      elements.push(el);
    });
    appState.value.selectedTargets = elements;
    selecto.value.setSelectedTargets(elements);
    appState.value.activeItemIndex = null;
    const scalPercentage = 1 / appState.value.viewportTransform.scale;
    setTimeout(() => {
      moveable.value.request(
        "draggable",
        {
          x:
            (pos.clientX -
              viewportMargins.left -
              appState.value.viewportTransform.x) *
            scalPercentage -
            size.width * scalPercentage,
          y:
            (pos.clientY -
              viewportMargins.top -
              appState.value.viewportTransform.y) *
            scalPercentage -
            size.height * scalPercentage,
        },
        true
      );
      setTimeout(() => {
        refreshMoveable();
      }, 1);
    }, 10);
  }, 10);
  /* setTimeout(() => {
    moveable.value.request(
      "resizable",
      {
        offsetWidth: e.rect.width * scalPercentage,
        offsetHeight: e.rect.height * scalPercentage,
      },
      true
    );
    refreshMoveable();
  }, 60); */
}

// Ends a selecto drag event and handles object drawing based on tool type
function onSelectoDragEnd(e) {
  const size = { width: e.rect.width, height: e.rect.height };
  const pos = {
    clientX: e.clientX,
    clientY: e.clientY,
    top: e.rect.top,
    left: e.rect.left,
  };
  if (
    (selectedTool.value.name === "Pointer" ||
      size.width < 20 ||
      size.height < 20) &&
    !continuesObjectTypes.includes(selectedTool.value.name)
  ) {
    isDrawing.value = false;
    return;
  }
  if (
    continuesObjectTypes.includes(selectedTool.value.name) &&
    size.height < 20
  ) {
    size.height = selectedTool.value.height;
  }

  const item = drawObject(size, pos);
  if (item && continuesObjectTypes.includes(item.type)) {
    setTimeout(() => {
      isDrawing.value = true;
      appState.value.selectedTargets = [];
      appState.value.items[appState.value.activeItemIndex].rotate = 0;
      startTransform.value = cloneDeep(item.translate);
    }, 100);
  }
}

// Draws an object based on the provided size, position, and tool settings
function drawObject(size, pos, tool) {
  tool = tool || selectedTool.value;

  if (tool.type === "libItem") {
    addLibItem(tool.items, size, pos);
    return;
  }
  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  const toolSettings =
    cloneDeep(tools.find((t) => t.name === tool.name)?.settings) || {};
  const objectSettings = Object.keys(toolSettings).reduce((acc, key) => {
    acc[key] = toolSettings[key].value;
    return acc;
  }, {});

  if (tool.name === "G_Rectangle") {
    size.width = 100;
  }

  const tempItem = {
    title: null,
    active: false,
    type: tool.name,
    translate: [
      (pos.left - viewportMargins.left - appState.value.viewportTransform.x) *
      scalPercentage,
      (pos.top - viewportMargins.top - appState.value.viewportTransform.y) *
      scalPercentage,
    ],
    width: size.width * scalPercentage,
    height: size.height * scalPercentage,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: objectSettings,
    zindex: 1,
    t3Entry: null,
  };
  if (tool.type === "Image") {
    tempItem.image = tool;
    tempItem.type = tool.id;
  }

  // copy the first category from tool.cat to item.cat
  if (tool.cat) {
    const [first] = tool.cat;
    tempItem.cat = first;
  }

  const item = addObject(tempItem);
  if (["Value", "Icon", "Switch"].includes(tool.name)) {
    linkT3EntryDialog.value.active = true;
  }

  setTimeout(() => {
    if (locked.value) return;
    appState.value.activeItemIndex = appState.value.items.findIndex(
      (i) => i.id === item.id
    );
  }, 10);
  setTimeout(() => {
    if (locked.value) return;
    const target = document.querySelector(`#moveable-item-${item.id}`);
    appState.value.selectedTargets = [target];
    selecto.value.setSelectedTargets([target]);
  }, 100);
  return item;
}

// Select a tool and set its type
function selectTool(tool, type = "default") {
  selectedTool.value = tool;
  if (typeof tool === "string") {
    selectedTool.value = tools.find((item) => item.name === tool);
  }
  selectedTool.value.type = type;
}

// Refresh the moveable object's rectangle after a short delay
function refreshMoveable() {
  // const targetsCache = cloneDeep(appState.value.selectedTargets);
  // appState.value.selectedTargets = [];
  setTimeout(() => {
    moveable.value.updateRect();
  }, 1);
}

// Rotate an item by 90 degrees, optionally in the negative direction
function rotate90(item, minues = false) {
  if (!item) return;
  addActionToHistory("Rotate object");
  if (!minues) {
    item.rotate = item.rotate + 90;
  } else {
    item.rotate = item.rotate - 90;
  }
  refreshMoveable();
}

// Flip an item horizontally
function flipH(item) {
  addActionToHistory("Flip object H");
  if (item.scaleX === 1) {
    item.scaleX = -1;
  } else {
    item.scaleX = 1;
  }
  refreshMoveable();
}

// Flip an item vertically
function flipV(item) {
  addActionToHistory("Flip object V");
  if (item.scaleY === 1) {
    item.scaleY = -1;
  } else {
    item.scaleY = 1;
  }
  refreshMoveable();
}

// Bring an item to the front by increasing its z-index
function bringToFront(item) {
  addActionToHistory("Bring object to front");
  item.zindex = item.zindex + 1;
}

// Send an item to the back by decreasing its z-index
function sendToBack(item) {
  addActionToHistory("Send object to back");
  item.zindex = item.zindex - 1;
}

// Remove an item from the app state
function removeObject(item) {
  addActionToHistory("Remove object");
  const index = appState.value.items.findIndex((i) => i.id === item.id);
  appState.value.activeItemIndex = null;
  appState.value.items.splice(index, 1);

  appState.value.selectedTargets = [];
}

// Duplicate an item and select the new copy
function duplicateObject(i) {
  addActionToHistory(`Duplicate ${i.type}`);
  appState.value.activeItemIndex = null;
  const item = cloneObject(i);
  appState.value.selectedTargets = [];
  setTimeout(() => {
    selectObject(item);
  }, 10);
}

// Clone an object and adjust its position slightly
function cloneObject(i, group = undefined) {
  const dubItem = cloneDeep(i);
  dubItem.translate[0] = dubItem.translate[0] + 5;
  dubItem.translate[1] = dubItem.translate[1] + 5;
  const item = addObject(dubItem, group, false);
  return item;
}

// Select an object and update the app state
function selectObject(item) {
  const target = document.querySelector(`#moveable-item-${item.id}`);
  appState.value.selectedTargets = [target];
  appState.value.activeItemIndex = appState.value.items.findIndex(
    (ii) => ii.id === item.id
  );
}

// Handle right-click selection
function selectByRightClick(e) {
  // selecto.value.clickTarget(e);
}

// Update a T3 entry field for an object
function T3UpdateEntryField(key, obj) {
  if (!obj.t3Entry) return;
  let fieldVal = obj.t3Entry[key];
  if (key === "value" || key === "control") {
    refreshObjectStatus(obj);
  }
  window.chrome?.webview?.postMessage({
    action: 3, // UPDATE_ENTRY
    field: key,
    value: fieldVal,
    panelId: obj.t3Entry.pid,
    entryIndex: obj.t3Entry.index,
    entryType: T3_Types[obj.t3Entry.type],
  });
}

// Define a condition for drag events in Selecto
function selectoDragCondition(e) {
  return !e.inputEvent.altKey;
}

// Save the linked T3 entry for an object and update its icon if necessary
function linkT3EntrySave() {
  addActionToHistory("Link object to T3000 entry");
  if (
    !appState.value.items[appState.value.activeItemIndex].settings
      .t3EntryDisplayField
  ) {
    if (
      appState.value.items[appState.value.activeItemIndex].label === undefined
    ) {
      appState.value.items[
        appState.value.activeItemIndex
      ].settings.t3EntryDisplayField = "id";
    } else {
      appState.value.items[
        appState.value.activeItemIndex
      ].settings.t3EntryDisplayField = "label";
    }
  }
  appState.value.items[appState.value.activeItemIndex].t3Entry = cloneDeep(
    toRaw(linkT3EntryDialog.value.data)
  );
  // Change the icon based on the linked entry type
  if (appState.value.items[appState.value.activeItemIndex].type === "Icon") {
    let icon = "fa-solid fa-camera-retro";
    if (linkT3EntryDialog.value.data.type === "GRP") {
      icon = "fa-solid fa-camera-retro";
    } else if (linkT3EntryDialog.value.data.type === "SCHEDULE") {
      icon = "schedule";
    } else if (linkT3EntryDialog.value.data.type === "PROGRAM") {
      icon = "fa-solid fa-laptop-code";
    } else if (linkT3EntryDialog.value.data.type === "HOLIDAY") {
      icon = "calendar_month";
    }
    appState.value.items[appState.value.activeItemIndex].settings.icon = icon;
  }
  refreshObjectStatus(appState.value.items[appState.value.activeItemIndex]);
  linkT3EntryDialog.value.data = null;
  linkT3EntryDialog.value.active = false;
}

// Refresh the status of an object based on its T3 entry
function refreshObjectStatus(item) {
  if (item.t3Entry && item.settings?.active !== undefined) {
    item.settings.active = getObjectActiveValue(item);
  }

  if (
    item.t3Entry &&
    item.t3Entry.decom !== undefined &&
    item.settings?.inAlarm !== undefined
  ) {
    item.settings.inAlarm = !!item.t3Entry.decom;
  }
}

// Save the current app state, optionally displaying a notification
function save(notify = false) {
  savedNotify.value = notify;
  const data = cloneDeep(toRaw(appState.value));
  data.selectedTargets = [];
  data.elementGuidelines = [];
  window.chrome?.webview?.postMessage({
    action: 2, // SAVE_GRAPHIC
    data,
  });
  if (!window.chrome?.webview?.postMessage) {
    localStorage.setItem("appState", JSON.stringify(data));
  }
}

// Create a new project, optionally confirming with the user if there's existing data
function newProject() {
  if (appState.value.items?.length > 0) {
    $q.dialog({
      dark: true,
      title: "Do you want to clear the drawing and start over?",
      message: "This will also erase your undo history",
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        appState.value = cloneDeep(emptyProject);
        undoHistory.value = [];
        redoHistory.value = [];
        refreshMoveable();
        if (!window.chrome?.webview?.postMessage) {
          localStorage.removeItem("appState");
        }
      })
      .onCancel(() => { });
    return;
  }
  appState.value = cloneDeep(emptyProject);
  undoHistory.value = [];
  redoHistory.value = [];
  refreshMoveable();
  if (!window.chrome?.webview?.postMessage) {
    localStorage.removeItem("appState");
  }
}

// Handle keyup event for keyboard control
keycon.keyup((e) => {
  // Enable snapping when the "ctrl" key is released
  if (e.key === "ctrl") {
    snappable.value = true;
  }
});

// Handle keydown event for keyboard control
keycon.keydown((e) => {
  if (e.key === "esc") {
    // Select the default tool and navigate back if applicable
    selectTool(tools[0]);
    if (grpNav.value.length > 1) {
      navGoBack();
    }
    // Stop drawing and undo the last action if currently drawing
    if (isDrawing.value) {
      isDrawing.value = false;
      undoAction();
    }
  }
  // Disable snapping when the "ctrl" key is pressed
  if (e.key === "ctrl") {
    snappable.value = false;
  }

  // If no targets are selected, exit the function
  if (appState.value.selectedTargets.length < 1) return;

  // Check for arrow keys to move objects
  if (["up", "down", "left", "right"].includes(e.key)) {
    addActionToHistory("Move object");
  }
  if (e.key === "up") {
    moveable.value.request("draggable", { deltaX: 0, deltaY: -5 }, true);
  } else if (e.key === "down") {
    moveable.value.request("draggable", { deltaX: 0, deltaY: 5 }, true);
  } else if (e.key === "left") {
    moveable.value.request("draggable", { deltaX: -5, deltaY: 0 }, true);
  } else if (e.key === "right") {
    moveable.value.request("draggable", { deltaX: 5, deltaY: 0 }, true);
  } else if (e.key === "delete") {
    deleteSelected();
  }
  // Refresh the moveable object after movement
  if (["up", "down", "left", "right"].includes(e.key)) {
    refreshMoveable();
  }
});

// Save the current state when "Ctrl + S" is pressed
keycon.keydown(["ctrl", "s"], (e) => {
  e.inputEvent.preventDefault();
  save(true);
});

// Undo the last action when "Ctrl + Z" is pressed
keycon.keydown(["ctrl", "z"], (e) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  undoAction();
});

// Redo the last undone action when "Ctrl + Y" is pressed
keycon.keydown(["ctrl", "y"], (e) => {
  e.inputEvent.preventDefault();
  if (locked.value) return;
  redoAction();
});

// Create a new project when "Ctrl + R" is pressed
keycon.keydown(["ctrl", "r"], (e) => {
  e.inputEvent.preventDefault();
  newProject();
});

// Duplicate the selected object when "Ctrl + D" is pressed
keycon.keydown(["ctrl", "d"], (e) => {
  e.inputEvent.preventDefault();
  duplicateSelected();
});

// Group selected objects when "Ctrl + G" is pressed
keycon.keydown(["ctrl", "g"], (e) => {
  e.inputEvent.preventDefault();
  groupSelected();
});

// Ungroup selected objects when "Ctrl + Shift + G" is pressed
keycon.keydown(["ctrl", "shift", "g"], (e) => {
  e.inputEvent.preventDefault();
  ungroupSelected();
});

// Copy selected objects to clipboard when "Ctrl + C" is pressed
keycon.keydown(["ctrl", "c"], (e) => {
  if (!document.activeElement.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  saveSelectedToClipboard();
});

// Paste objects from clipboard when "Ctrl + V" is pressed
keycon.keydown(["ctrl", "v"], (e) => {
  if (!document.activeElement.matches(".viewport")) return;
  e.inputEvent.preventDefault();
  pasteFromClipboard();
});

// Weld selected objects when "Ctrl + W" is pressed
keycon.keydown(["ctrl", "b"], (e) => {
  e.inputEvent.preventDefault();
  weldSelected();
});

// Open the dialog to link a T3 entry
function linkT3EntryDialogAction() {
  linkT3EntryDialog.value.active = true;
  if (!appState.value.items[appState.value.activeItemIndex]?.t3Entry) return;
  linkT3EntryDialog.value.data = cloneDeep(
    appState.value.items[appState.value.activeItemIndex]?.t3Entry
  );
}

// Delete selected objects from the app state
function deleteSelected() {
  addActionToHistory("Remove selected objects");
  if (appState.value.selectedTargets.length > 0) {
    appState.value.selectedTargets.forEach((el) => {
      const iIndex = appState.value.items.findIndex(
        (item) => `moveable-item-${item.id}` === el.id
      );
      if (iIndex !== -1) {
        appState.value.items.splice(iIndex, 1);
      }
    });
    appState.value.selectedTargets = [];
    appState.value.activeItemIndex = null;
  }
}

function drawWeldObject(selectedItems) {
  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  // Calculate the bounding box for the selected items
  const firstX = selectedItems[0].translate[0];
  const firstY = selectedItems[0].translate[1];
  const minX = Math.min(...selectedItems.map((item) => item.translate[0]));
  const minY = Math.min(...selectedItems.map((item) => item.translate[1]));
  const maxX = Math.max(
    ...selectedItems.map((item) => item.translate[0] + item.width)
  );
  const maxY = Math.max(
    ...selectedItems.map((item) => item.translate[1] + item.height)
  );

  const transX = firstX < minX ? firstX : minX;

  const title = selectedItems.map((item) => item?.type ?? "").join("-");

  let previous = selectedItems[0].zindex;
  selectedItems.forEach((item) => {
    item.zindex = previous - 1;
    previous = item.zindex;
  });

  const tempItem = {
    title: `Weld-${title}`,
    active: false,
    type: "Weld",
    translate: [transX, minY],
    width: (maxX - minX) * scalPercentage,
    height: (maxY - minY) * scalPercentage,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: {
      active: false,
      fillColor: "#659dc5",
      fontSize: 16,
      inAlarm: false,
      textColor: "inherit",
      titleColor: "inherit",
      weldItems: cloneDeep(selectedItems),
    },
    zindex: 1,
    t3Entry: null,
    id: appState.value.itemsCount + 1,
  };

  addObject(tempItem);
}

// Draw weld objects with canvas
function drawWeldObjectCanvas(selectedItems) {
  const scalPercentage = 1 / appState.value.viewportTransform.scale;

  // Calculate the bounding box for the selected items
  const firstX = selectedItems[0].translate[0];
  const firstY = selectedItems[0].translate[1];
  const minX = Math.min(...selectedItems.map((item) => item.translate[0]));
  let minY = Math.min(...selectedItems.map((item) => item.translate[1]));
  const maxX = Math.max(
    ...selectedItems.map((item) => item.translate[0] + item.width)
  );
  const maxY = Math.max(
    ...selectedItems.map((item) => item.translate[1] + item.height)
  );
  let newMinX = firstX < minX ? firstX : minX;

  const boundingBox = selectedItems.reduce(
    (acc, item) => {
      const rad = (item.rotate * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const corners = [
        { x: item.translate[0], y: item.translate[1] },
        {
          x: item.translate[0] + item.width * cos,
          y: item.translate[1] + item.width * sin,
        },
        {
          x: item.translate[0] - item.height * sin,
          y: item.translate[1] + item.height * cos,
        },
        {
          x: item.translate[0] + item.width * cos - item.height * sin,
          y: item.translate[1] + item.width * sin + item.height * cos,
        },
      ];

      corners.forEach((corner) => {
        acc.minX = Math.min(acc.minX, corner.x);
        acc.minY = Math.min(acc.minY, corner.y);
        acc.maxX = Math.max(acc.maxX, corner.x);
        acc.maxY = Math.max(acc.maxY, corner.y);
      });

      return acc;
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  const transX = boundingBox.minX;
  const transY = boundingBox.minY;
  const width = boundingBox.maxX - boundingBox.minX;
  const height = boundingBox.maxY - boundingBox.minY;

  // console.log('IndexPage.vue->drawWeldObjectCanvas->boundingBox', boundingBox, transX, transY, width, height);

  const title = selectedItems.map((item) => item?.type ?? "").join("-");
  let previous = selectedItems[0].zindex;

  selectedItems.forEach((item) => {
    item.zindex = previous - 1;
    previous = item.zindex;
  });

  const isAllDuct = selectedItems.every((item) => item.type === "Duct");

  if (isAllDuct) {
    // Get the new pos for all ducts
    const overlapList = checkIsOverlap(selectedItems);

    selectedItems.forEach((item) => {
      const overlapItem = overlapList.find((pos) => pos.id === item.id);
      if (overlapItem) {
        item.overlap = {
          isStartOverlap: overlapItem.isStartOverlap,
          isEndOverlap: overlapItem.isEndOverlap,
        };
      }
    });
  }

  const newWidth = (maxX - minX) * scalPercentage + 8;
  const newHeight = (maxY - minY) * scalPercentage + 8;

  const tempItem = {
    title: `Weld-${title}`,
    active: false,
    cat: "General",
    type: isAllDuct ? "Weld_Duct" : "Weld_General",
    translate: [newMinX, minY],
    width: newWidth,
    height: newHeight,
    // translate: [transX, minY],
    // width: width * scalPercentage,
    // height: height * scalPercentage,
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    settings: {
      active: false,
      fillColor: "#659dc5",
      fontSize: 16,
      inAlarm: false,
      textColor: "inherit",
      titleColor: "inherit",
    },
    weldItems: cloneDeep(selectedItems),
    zindex: 1,
    t3Entry: null,
    id: appState.value.itemsCount + 1,
  };

  addObject(tempItem);
}

function getDuctPoints(info) {
  const { left, top, pos1, pos2, pos3, pos4 } = info;
  return [pos1, pos2, pos4, pos3].map((pos) => [left + pos[0], top + pos[1]]);
}

function isDuctOverlap(partEl) {
  const parentDuct = partEl.closest(".moveable-item.Duct");
  const element1Rect = getElementInfo(partEl);
  const elements = document.querySelectorAll(".moveable-item.Duct");
  for (const el of Array.from(elements)) {
    if (parentDuct.isSameNode(el)) continue;
    const element2Rect = getElementInfo(el);

    const points1 = getDuctPoints(element1Rect);
    const points2 = getDuctPoints(element2Rect);
    const overlapSize = getOverlapSize(points1, points2);
    if (overlapSize > 0) return true;
  }
  return false;
}

function checkIsOverlap(selectedItems) {
  const itemList = [];

  selectedItems.map((item) => {
    const { width, height, translate, rotate } = item;

    // const element = document.querySelector(`#moveable-item-${item.id}`);
    // const elRect = element.getBoundingClientRect();
    // const elInfo = getElementInfo(element);

    const startEl = document.querySelector(
      `#moveable-item-${item.id} .duct-start`
    );
    const endEl = document.querySelector(`#moveable-item-${item.id} .duct-end`);

    const isStartOverlap = isDuctOverlap(startEl);
    const isEndOverlap = isDuctOverlap(endEl);

    itemList.push({
      id: item.id,
      isStartOverlap: isStartOverlap,
      isEndOverlap: isEndOverlap,
    });
  });

  return itemList;
}

// Weld selected objects into one shape
function weldSelected() {
  if (appState.value.selectedTargets.length < 2) return;

  const selectedItems1 = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );

  if (selectedItems1.some((item) => item.type === "Weld")) {
    $q.notify({
      type: "warning",
      message: "Currently not supported!",
    });
    return;
  }

  addActionToHistory("Weld selected objects");

  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );

  // Check whether the selected items's type are all General
  const isAllGeneral = selectedItems.every((item) => item.cat === "General");
  const isAllDuct = selectedItems.every((item) => item.type === "Duct");
  // console.log('IndexPage.vue->weldSelected->isAllGeneral,isAllDuct', isAllGeneral, isAllDuct);

  if (isAllGeneral || isAllDuct) {
    drawWeldObjectCanvas(selectedItems);
  } else {
    drawWeldObject(selectedItems);
  }

  selectedItems.forEach((item) => {
    const index = appState.value.items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      appState.value.items.splice(index, 1);
    }
  });

  refreshMoveable();
}

// Filter function for selecting panels in the UI
function selectPanelFilterFn(val, update) {
  if (val === "") {
    update(() => {
      selectPanelOptions.value = T3000_Data.value.panelsData;

      // here you have access to "ref" which
      // is the Vue reference of the QSelect
    });
    return;
  }

  update(() => {
    const keyword = val.toUpperCase();
    selectPanelOptions.value = T3000_Data.value.panelsData.filter(
      (item) =>
        item.command.toUpperCase().indexOf(keyword) > -1 ||
        item.description?.toUpperCase().indexOf(keyword) > -1 ||
        item.label?.toUpperCase().indexOf(keyword) > -1
    );
  });
}

// Undo the last action
function undoAction() {
  if (undoHistory.value.length < 1) return;
  redoHistory.value.unshift({
    title: lastAction,
    state: cloneDeep(appState.value),
  });
  appState.value = cloneDeep(undoHistory.value[0].state);
  undoHistory.value.shift();
  refreshMoveable();
}

// Redo the last undone action
function redoAction() {
  if (redoHistory.value.length < 1) return;
  undoHistory.value.unshift({
    title: lastAction,
    state: cloneDeep(appState.value),
  });
  appState.value = cloneDeep(redoHistory.value[0].state);
  redoHistory.value.shift();
  refreshMoveable();
}

// Handle file upload (empty function, add implementation as needed)
function handleFileUploaded(data) { }

// Read a file and return its data as a promise
function readFile(file) {
  return new Promise((resolve, reject) => {
    var fr = new FileReader();
    fr.onload = () => {
      resolve(fr.result);
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Save an image to the library or online storage
async function saveLibImage(file) {
  if (user.value) {
    liveApi
      .post("hvacTools", {
        json: {
          name: file.name,
          fileId: file.id,
        },
      })
      .then(async (res) => {
        $q.notify({
          color: "positive",
          message: "Image successfully saved",
        });
        const oItem = await res.json();
        addOnlineLibImage(oItem);
      })
      .catch((err) => {
        $q.notify({
          color: "negative",
          message: err.message,
        });
      });

    return;
  }

  library.value.imagesCount++;

  const message = {
    action: 9, // SAVE_IMAGE
    filename: file.name,
    fileLength: file.size,
    fileData: await readFile(file.data),
  };

  window.chrome?.webview?.postMessage(message);
}

const gaugeSettingsDialog = ref({
  active: false,
  data: { settings: tools.find((tool) => tool.name === "Gauge")?.settings },
});

// Open the gauge settings dialog with the provided item data
function gaugeSettingsDialogAction(item) {
  gaugeSettingsDialog.value.active = true;
  gaugeSettingsDialog.value.data = item;
}

// Save the gauge settings and update the app state
function gaugeSettingsSave(item) {
  const itemIndex = appState.value.items.findIndex((i) => i.id === item.id);
  appState.value.items[itemIndex] = item;
  gaugeSettingsDialog.value.active = false;
  gaugeSettingsDialog.value.data = {};
}

// Open the import JSON dialog
function importJsonAction() {
  importJsonDialog.value.active = true;
}

// Export the current app state to a JSON file
function exportToJsonAction() {
  const content = cloneDeep(toRaw(appState.value));
  content.selectedTargets = [];
  content.elementGuidelines = [];

  const a = document.createElement("a");
  const file = new Blob([JSON.stringify(content)], {
    type: "application/json",
  });
  a.href = URL.createObjectURL(file);
  a.download = "HVAC_Drawer_Project.json";
  a.click();
}

// Get all items linked to a T3 entry
function getLinkedEntries() {
  const items = appState.value.items;
  if (items.length === 0) return [];
  return toRaw(appState.value).items.filter((i) => i.t3Entry);
}

// Handle the addition of an imported JSON file
async function importJsonFileAdded(file) {
  const blob = await file.data.text();
  importJsonDialog.value.data = blob;
  executeImportFromJson();
}

// Execute the import of the JSON data into the app state
function executeImportFromJson() {
  const importedState = JSON.parse(importJsonDialog.value.data);
  if (!importedState.items?.[0].type) {
    $q.notify({
      message: "Error, Invalid json file",
      color: "negative",
      icon: "error",
      actions: [
        {
          label: "Dismiss",
          color: "white",
          handler: () => {
            /* ... */
          },
        },
      ],
    });
    return;
  }

  if (appState.value.items?.length > 0) {
    $q.dialog({
      dark: true,
      title: "You have unsaved drawing!",
      message: `Before proceeding with the import, please note that any unsaved drawing will be lost,
           and your undo history will also be erased. Are you sure you want to proceed?`,
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        undoHistory.value = [];
        redoHistory.value = [];
        importJsonDialog.value.active = false;
        appState.value = importedState;
        importJsonDialog.value.data = null;
        setTimeout(() => {
          refreshMoveableGuides();
        }, 100);
        refreshMoveable();
      })
      .onCancel(() => {
        importJsonDialog.value.active = false;
      });
    return;
  }
  undoHistory.value = [];
  redoHistory.value = [];
  importJsonDialog.value.active = false;
  appState.value = importedState;
  importJsonDialog.value.data = null;
  setTimeout(() => {
    refreshMoveableGuides();
  }, 100);
  refreshMoveable();
}

// Computed property for zoom control
const zoom = computed({
  // Getter for zoom value
  get() {
    return parseInt(appState.value.viewportTransform.scale * 100);
  },
  // Setter for zoom value
  set(newValue) {
    if (!newValue) return;
    appState.value.viewportTransform.scale = newValue / 100;
    panzoomInstance.smoothZoomAbs(
      appState.value.viewportTransform.x,
      appState.value.viewportTransform.y,
      newValue / 100
    );
  },
});

// Duplicate the selected items in the app state
function duplicateSelected() {
  if (appState.value.selectedTargets.length < 1) return;
  addActionToHistory("Duplicate the selected objects");
  const elements = [];
  const dupGroups = {};
  appState.value.selectedTargets.forEach((el) => {
    const item = appState.value.items.find(
      (i) => `moveable-item-${i.id}` === el.id
    );
    if (item) {
      let group = undefined;
      if (item.group) {
        if (!dupGroups[`${item.group}`]) {
          appState.value.groupCount++;
          dupGroups[`${item.group}`] = appState.value.groupCount;
        }

        group = dupGroups[`${item.group}`];
      }
      const dupItem = cloneObject(item, group);
      setTimeout(() => {
        const dupElement = document.querySelector(
          `#moveable-item-${dupItem.id}`
        );
        elements.push(dupElement);
      }, 10);
    }
  });
  setTimeout(() => {
    appState.value.selectedTargets = elements;
    selecto.value.setSelectedTargets(elements);
    appState.value.activeItemIndex = null;
  }, 20);
}

// Group the selected items together
function groupSelected() {
  if (appState.value.selectedTargets.length < 2) return;
  addActionToHistory("Group the selected objects");
  if (appState.value.selectedTargets.length > 0) {
    appState.value.groupCount++;
    appState.value.selectedTargets.forEach((el) => {
      const item = appState.value.items.find(
        (i) => `moveable-item-${i.id}` === el.id
      );
      if (item) {
        item.group = appState.value.groupCount;
      }
    });
  }
}

// Ungroup the selected items
function ungroupSelected() {
  if (appState.value.selectedTargets.length < 2) return;
  addActionToHistory("Ungroup the selected objects");
  if (appState.value.selectedTargets.length > 0) {
    appState.value.selectedTargets.forEach((el) => {
      const item = appState.value.items.find(
        (i) => `moveable-item-${i.id}` === el.id
      );
      if (item) {
        item.group = undefined;
      }
    });
  }
}

// Control zoom actions for the app
function zoomAction(action = "in", val = null) {
  if (action === "out") {
    zoom.value -= 10;
  } else if (action === "set") {
    zoom.value = val;
  } else {
    zoom.value += 10;
  }
}

// Handle the menu action for the top toolbar
function handleMenuAction(action, val) {
  const item = appState.value.items[appState.value.activeItemIndex];
  switch (action) {
    case "newProject":
      newProject();
      break;
    case "importJsonAction":
      importJsonAction();
      break;
    case "exportToJsonAction":
      exportToJsonAction();
      break;
    case "save":
      save(true);
      break;
    case "undoAction":
      undoAction();
      break;
    case "redoAction":
      redoAction();
      break;
    case "duplicateSelected":
      duplicateSelected();
      break;
    case "groupSelected":
      groupSelected();
      break;
    case "ungroupSelected":
      ungroupSelected();
      break;
    case "addToLibrary":
      addToLibrary();
      break;
    case "deleteSelected":
      deleteSelected();
      break;
    case "weldSelected":
      weldSelected();
      break;
    case "duplicateObject":
      duplicateObject(item);
      break;
    case "rotate90":
      rotate90(item);
      break;
    case "rotate-90":
      rotate90(item, true);
      break;
    case "flipH":
      flipH(item);
      break;
    case "flipV":
      flipV(item);
      break;
    case "bringToFront":
      bringToFront(item);
      break;
    case "sendToBack":
      sendToBack(item);
      break;
    case "removeObject":
      removeObject(item);
      break;
    case "zoomOut":
      zoomAction("out");
      break;
    case "zoomIn":
      zoomAction();
      break;
    case "zoomSet":
      zoomAction("set", val);
      break;
    case "copy":
      saveSelectedToClipboard();
      break;
    case "paste":
      pasteFromClipboard();
      break;
    case "link":
      linkT3EntryDialogAction();
      break;
    case "convertObjectType":
      convertObjectType(item, val);
      break;
    default:
      break;
  }
}

// Reload panel data by requesting the panels list
function reloadPanelsData() {
  T3000_Data.value.loadingPanel = null;
  window.chrome?.webview?.postMessage({
    action: 4, // GET_PANELS_LIST
  });
}

// Refresh linked entries with updated panel data
function refreshLinkedEntries(panelData) {
  appState.value.items
    .filter((i) => i.t3Entry?.type)
    .forEach((item) => {
      const linkedEntry = panelData.find(
        (ii) =>
          ii.index === item.t3Entry.index &&
          ii.type === item.t3Entry.type &&
          ii.pid === item.t3Entry.pid
      );
      if (linkedEntry && linkedEntry.id) {
        item.t3Entry = linkedEntry;
        refreshObjectStatus(item);
      }
    });
}

// Create a label for an entry with optional prefix
function entryLabel(option) {
  let prefix =
    (option.description && option.id !== option.description) ||
      (!option.description && option.id !== option.label)
      ? option.id + " - "
      : "";
  prefix = !option.description && !option.label ? option.id : prefix;
  return prefix + (option.description || option.label || "");
}

// Toggle the lock state of the application
function lockToggle() {
  appState.value.activeItemIndex = null;
  appState.value.selectedTargets = [];
  locked.value = !locked.value;
  if (locked.value) {
    selectTool("Pointer");
  }

  // Update the document area position based on the lock state
  restDocumentAreaPosition();
}

function restDocumentAreaPosition(pzXY) {
  const div = document.querySelector('.full-area');
  documentAreaPosition.value.workAreaPadding = locked.value ? "0px" : "110px";
  documentAreaPosition.value.hRulerWOffset = locked.value ? "24px" : "128px";
  documentAreaPosition.value.wpwWOffset = locked.value ? "24px" : "128px";
  documentAreaPosition.value.wpWOffset = locked.value ? "26px" : "136px";
  documentAreaPosition.value.hRuler = { width: div.clientWidth, height: 20 };
  documentAreaPosition.value.vRuler = { width: 20, height: div.clientHeight };
  documentAreaPosition.value.hvGrid = { width: div.clientWidth, height: div.clientHeight };

  documentAreaPosition.value.wiewPortWH = { width: "calc(100vw - v-bind('documentAreaPosition.wpWOffset'))", height: "calc(100vh - 68px)" };

  console.log("IndexPage.vue -> lockToggle -> documentAreaPosition [full-area]", documentAreaPosition.value);
  console.log('IndexPage.vue -> lockToggle -> pzXY', pzXY);
}

// Handle object click events based on t3Entry type
function objectClicked(item) {
  // console.log("IndexPage.vue -> objectClicked -> item", item);

  if (!locked.value) return;
  if (item.t3Entry?.type === "GRP") {
    window.chrome?.webview?.postMessage({
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    });
  } else if (["SCHEDULE", "PROGRAM", "HOLIDAY"].includes(item.t3Entry?.type)) {
    window.chrome?.webview?.postMessage({
      action: 8, // OPEN_ENTRY_EDIT_WINDOW
      panelId: item.t3Entry.pid,
      entryType: T3_Types[item.t3Entry.type],
      entryIndex: item.t3Entry.index,
    });
  } else if (
    item.t3Entry?.auto_manual === 1 &&
    item.t3Entry?.digital_analog === 0 &&
    item.t3Entry?.range
  ) {
    item.t3Entry.control = item.t3Entry.control === 1 ? 0 : 1;
    T3UpdateEntryField("control", item);
  }
}

// Navigate back in the group navigation history
function navGoBack() {
  if (grpNav.value.length > 1) {
    const item = grpNav.value[grpNav.value.length - 2];
    window.chrome?.webview?.postMessage({
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.pid,
      entryIndex: item.index,
    });
  } else {
    window.chrome?.webview?.postMessage({
      action: 1, // GET_INITIAL_DATA
    });
  }
}

// Remove the latest undo history entry
function objectSettingsUnchanged() {
  undoHistory.value.shift();
}

// Add selected items to the library
async function addToLibrary() {
  if (appState.value.selectedTargets.length < 1 || locked.value) return;
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );
  let isOnline = false;
  const libItems = cloneDeep(selectedItems);
  library.value.objLibItemsCount++;
  let createdItem = null;
  if (user.value) {
    isOnline = true;
    liveApi
      .post("hvacObjectLibs", {
        json: {
          label: "Item " + library.value.objLibItemsCount,
          items: libItems.map((i) => {
            delete i.id;
            return i;
          }),
        },
      })
      .then(async (res) => {
        createdItem = await res.json();
        $q.notify({
          type: "positive",
          message: "Successfully saved to library",
        });

        library.value.objLib.push({
          id: createdItem?.id || library.value.objLibItemsCount,
          label: "Item " + library.value.objLibItemsCount,
          items: createdItem.items,
          online: isOnline,
        });
        saveLib();
      })
      .catch((err) => {
        $q.notify({
          type: "negative",
          message: err.message,
        });
      });
  }
  library.value.objLib.push({
    id: createdItem?.id || library.value.objLibItemsCount,
    label: "Item " + library.value.objLibItemsCount,
    items: libItems,
    online: isOnline,
  });
  saveLib();
}

// Bring selected objects to the front by increasing their z-index
function bringSelectedToFront() {
  addActionToHistory("Bring selected objects to front");
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );
  selectedItems.forEach((item) => {
    item.zindex = item.zindex + 1;
  });
}

// Send selected objects to the back by decreasing their z-index
function sendSelectedToBack() {
  addActionToHistory("Send selected objects to back");
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );
  selectedItems.forEach((item) => {
    item.zindex = item.zindex - 1;
  });
}

// Rotate selected objects by 90 degrees
function rotate90Selected(minues = false) {
  moveable.value.request(
    "rotatable",
    {
      deltaRotate: minues ? -90 : 90,
    },
    true
  );
  refreshMoveable();
}

// Save selected items to the clipboard
function saveSelectedToClipboard() {
  if (locked.value) return;
  if (appState.value.selectedTargets.length === 0) return;
  const selectedItems = appState.value.items.filter((i) =>
    appState.value.selectedTargets.some(
      (ii) => ii.id === `moveable-item-${i.id}`
    )
  );

  localStorage.setItem("clipboard", JSON.stringify(selectedItems));
  clipboardFull.value = true;
}

// Paste items from the clipboard into the application state
function pasteFromClipboard() {
  if (locked.value) return;
  let items = [];
  const clipboard = localStorage.getItem("clipboard");
  if (clipboard) {
    items = JSON.parse(clipboard);
  }
  if (!items) return;
  addActionToHistory("Paste");
  const elements = [];
  const addedItems = [];
  items.forEach((item) => {
    addedItems.push(cloneObject(item));
  });
  setTimeout(() => {
    addedItems.forEach((addedItem) => {
      const el = document.querySelector(`#moveable-item-${addedItem.id}`);
      elements.push(el);
    });
    appState.value.selectedTargets = elements;
    selecto.value.setSelectedTargets(elements);
    appState.value.activeItemIndex = null;
  }, 10);
}

// Saves the library data to the webview
function saveLib() {
  // Filter out online images and objects from the library
  const libImages = toRaw(library.value.images.filter((item) => !item.online));
  const libObjects = toRaw(library.value.objLib.filter((item) => !item.online));

  // Post a message to the webview with the saved data
  window.chrome?.webview?.postMessage({
    action: 10, // SAVE_LIBRARY_DATA
    data: { ...toRaw(library.value), images: libImages, objLib: libObjects },
  });
}

// Toggles the auto/manual mode of an item
function autoManualToggle(item) {
  if (!locked.value) return;
  item.t3Entry.auto_manual = item.t3Entry.auto_manual ? 0 : 1;
  T3UpdateEntryField("auto_manual", item);
}

// Deletes a library item
function deleteLibItem(item) {
  if (user.value && item.online) {
    // Delete the item from the API
    liveApi
      .delete("hvacObjectLibs/" + item.id)
      .then(async () => {
        $q.notify({
          type: "positive",
          message: "Successfully deleted",
        });
      })
      .catch((err) => {
        $q.notify({
          type: "negative",
          message: err.message,
        });
      });
  }

  // Remove the item from the local library
  const itemIndex = library.value.objLib.findIndex(
    (obj) => obj.name === item.name
  );
  if (itemIndex !== -1) {
    library.value.objLib.splice(itemIndex, 1);
  }
  saveLib();
}

// Renames a library item
function renameLibItem(item, name) {
  if (user.value && item.online) {
    // Update the item on the API
    liveApi
      .patch("hvacObjectLibs/" + item.id, {
        json: {
          label: name,
        },
      })
      .then(async () => {
        $q.notify({
          type: "positive",
          message: "Successfully updated",
        });
      })
      .catch((err) => {
        $q.notify({
          type: "negative",
          message: err.message,
        });
      });
  }

  // Update the local library
  const itemIndex = library.value.objLib.findIndex(
    (obj) => obj.name === item.name
  );
  if (itemIndex !== -1) {
    library.value.objLib[itemIndex].label = name;
  }
  saveLib();
}

// Deletes a library image
function deleteLibImage(item) {
  if (item.online) {
    // Delete the image from the API
    liveApi
      .delete("hvacTools/" + item.dbId || item.id.slice(4))
      .then(async () => {
        $q.notify({
          type: "positive",
          message: "Successfully deleted",
        });
      })
      .catch((err) => {
        $q.notify({
          type: "negative",
          message: err.message,
        });
      });
  }

  // Remove the image from the local library
  const itemIndex = library.value.images.findIndex(
    (obj) => obj.name === item.name
  );
  if (itemIndex !== -1) {
    library.value.images.splice(itemIndex, 1);
    if (!item.online) {
      // Delete the image from the webview
      const imagePath = cloneDeep(library.value.images[itemIndex].path);
      window.chrome?.webview?.postMessage({
        action: 11, // DELETE_IMAGE
        data: toRaw(imagePath),
      });
      saveLib();
    }
  }
}

// Updates an entry value
function changeEntryValue(refItem, newVal, control) {
  const key = control ? "control" : "value";
  const item = appState.value.items.find((i) => i.id === refItem.id);
  item.t3Entry[key] = newVal;
  T3UpdateEntryField(key, item);
}

// Converts an object to a different type
function convertObjectType(item, type) {
  if (!item) {
    item = appState.value.items[appState.value.activeItemIndex];
  }
  if (!item) return;
  addActionToHistory("Convert object to " + type);

  // Get the default settings for the new type
  const toolSettings =
    cloneDeep(tools.find((tool) => tool.name === type)?.settings) || {};
  const defaultSettings = Object.keys(toolSettings).reduce((acc, key) => {
    acc[key] = toolSettings[key].value;
    return acc;
  }, {});

  // Merge the default settings with the item's current settings
  const newSettings = {};
  for (const key in defaultSettings) {
    if (Object.hasOwnProperty.call(defaultSettings, key)) {
      if (item.settings[key] !== undefined) {
        newSettings[key] = item.settings[key];
      } else {
        newSettings[key] = defaultSettings[key];
      }
    }
  }
  const mainSettings = ["bgColor", "textColor", "title", "t3EntryDisplayField"];
  for (const mSetting of mainSettings) {
    if (newSettings[mSetting] === undefined) {
      newSettings[mSetting] = item.settings[mSetting];
    }
  }
  item.type = type;
  item.settings = newSettings;
}

// Handles a tool being dropped
function toolDropped(ev, tool) {
  drawObject(
    { width: 60, height: 60 },
    {
      clientX: ev.clientX,
      clientY: ev.clientY,
      top: ev.clientY,
      left: ev.clientX,
    },
    tool
  );
}

const updateWeldModel = (weldModel, itemList) => {
  appState.value.items.map((item) => {
    if (item.type === "Weld" && item.id === weldModel.id) {
      item.settings.weldItems = itemList;
    }
  });
};

const updateWeldModelCanvas = (weldModel, pathItemList) => {
  // console.log('IndexPage.vue->updateWeldModelCanvas->weldModel', weldModel, pathItemList);

  appState.value.items.map((item) => {
    if (
      (item.type === "Weld_General" || item.type === "Weld_Duct") &&
      item.id === weldModel.id
    ) {
      // Update the weld items's new width, height, translate
      const firstTrsx = item?.weldItems[0]?.translate[0];
      const firstTrsy = item?.weldItems[0]?.translate[1];

      item?.weldItems?.forEach((weldItem) => {
        const pathItem = pathItemList?.find(
          (itx) => itx?.item?.id === weldItem?.id
        );
        // console.log('IndexPage.vue->updateWeldModelCanvas->pathItem', pathItem);
        // console.log('IndexPage.vue->updateWeldModelCanvas->weldItem', weldModel.width, weldModel.height);
        if (pathItem) {
          weldItem.width = pathItem.newPos.width;
          weldItem.height = pathItem.newPos.height;
          weldItem.translate[0] = firstTrsx + pathItem.newPos.trsx;
          weldItem.translate[1] = firstTrsy + pathItem.newPos.trsy;
        }
      });
    }
  });
};

// Handles a right-click event on the viewport
function viewportRightClick(ev) {
  ev.preventDefault();
  selectTool(tools[0]);
  if (isDrawing.value) {
    isDrawing.value = false;
    undoAction();
    setTimeout(() => {
      refreshObjects();
    }, 10);
  }
}

// Checks if the user is logged in
function isLoggedIn() {
  const hasToken = $q.cookies.has("token");
  if (!hasToken) {
    user.value = null;
    return;
  }

  // Get the user's data from the API
  liveApi
    .get("hvacTools")
    .then(async (res) => {
      const data = await res.json();
      if (data.length > 0) {
        data?.forEach((oItem) => {
          addOnlineLibImage(oItem);
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });

  liveApi
    .get("hvacObjectLibs")
    .then(async (res) => {
      const data = await res.json();
      if (data.length > 0) {
        data.forEach((oItem) => {
          library.value.objLib.push({
            id: oItem.id,
            label: oItem.label,
            items: oItem.items,
            online: true,
          });
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
  liveApi
    .get("me")
    .then(async (res) => {
      user.value = await res.json();
    })
    .catch((err) => {
      // Not logged in
    });
}

// Adds the online images to the library
function addOnlineLibImage(oItem) {
  const iIndex = library.value.images.findIndex(
    (obj) => obj.id === "IMG-" + oItem.id
  );
  if (iIndex !== -1) {
    library.value.images.splice(iIndex, 1);
  }
  library.value.images.push({
    id: "IMG-" + oItem.id,
    dbId: oItem.id,
    name: oItem.name,
    path: process.env.API_URL + "/file/" + oItem.file.path,
    online: true,
  });
}
</script>
<style>
.viewport .selected {
  color: #fff;
  background: #333;
}

#moveable-item {
  position: relative;
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

.moveable-item-wrapper:has(.Duct) {
  transform-origin: 20px center;
}

.moveable-item-wrapper:has(.Wall) {
  transform-origin: 10px center;
}

.menu-dropdown {
  max-width: 300px !important;
}

.moveable-item-wrapper {
  position: relative;
}

.nav-btns {
  left: 7rem;
}

.nav-btns.locked {
  left: 1rem;
}

.cursor-icon {
  position: absolute;
  z-index: 1;
  color: #adadad;
  display: none;
}

.viewport:hover .cursor-icon {
  display: block;
}
</style>
