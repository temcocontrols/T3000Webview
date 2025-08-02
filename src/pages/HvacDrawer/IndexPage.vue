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
  flex: 1;
  margin-top: 1px;
  position: relative;
}

.document-area {
  position: relative;
  background-color: #ebeced;
  height: 100%;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
}

.c-ruler {
  width: 20px;
  height: 20px;
  background-color: #ebeced;
  position: absolute;
  overflow: hidden;
  left: 1px;
  top: 1px;
}

.h-ruler {
  position: absolute;
  overflow: hidden;
  background-color: #ebeced;
  top: 1px;
  left: 22px;
  height: 20px;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));

}

.v-ruler {
  position: absolute;
  overflow: hidden;
  background-color: #ebeced;
  width: 20px;
  left: 1px;
  top: 22px;
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
}

.hv-grid {
  position: absolute;
  background-color: #ebeced;
  inset: 22px 0px 0px 22px;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
  overflow: hidden;
}

.viewport-wrapper {
  position: relative;
  background-color: transparent;
  scrollbar-width: thin;
  inset: 22px 0px 0px 22px;
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
  overflow: hidden;
}

.viewport {
  width: calc(100vw - v-bind("documentAreaPosition.widthOffset"));
  height: calc(100vh - v-bind("documentAreaPosition.heightOffset"));
}

.default-svg {
  width: 100%;
  height: 100%;
}
</style>

<template>
  <q-page style="background-color: #ebeced;">
    <div class="full-area">

      <div class="top-area">
        <!-- Top Toolbar -->
        <top-toolbar @menu-action="handleMenuAction" :object="appState.items[appState.activeItemIndex]"
          :selected-count="appState.selectedTargets?.length" :disable-undo="locked || undoHistory.length < 1"
          :disable-redo="locked || redoHistory.length < 1" :disable-paste="locked || !clipboardFull" :zoom="zoom"
          :rulersGridVisible="rulersGridVisible" v-if="isBuiltInEdge" />

        <NewTopToolBar :locked="locked" @lockToggle="lockToggle" @navGoBack="navGoBack" @menu-action="handleMenuAction"
          :object="appState.items[appState.activeItemIndex]" :selected-count="appState.selectedTargets?.length"
          :disable-undo="locked || undoHistory.length < 1" :disable-redo="locked || redoHistory.length < 1"
          :disable-paste="locked || !clipboardFull" :zoom="zoom" :rulersGridVisible="rulersGridVisible"
          :deviceModel="deviceModel" @showMoreDevices="showMoreDevices" v-if="!isBuiltInEdge && !locked">
        </NewTopToolBar>
      </div>

      <div class="main-area">
        <div class="side-bar" v-if="!locked">
          <!-- Tools Sidebar -->
          <ToolsSidebar v-if="!locked" :selected-tool="selectedTool" :images="library.images"
            :object-lib="library.objLib" @select-tool="selectTool" @delete-lib-item="deleteLibItem"
            @rename-lib-item="renameLibItem" @delete-lib-image="deleteLibImage" @save-lib-image="saveLibImage"
            @tool-dropped="toolDropped" :isBuiltInEdge="isBuiltInEdge" />
        </div>
        <div class="work-area">
          <div class="document-area">
            <div class="c-ruler" v-if="!locked && rulersGridVisible"></div>
            <div class="h-ruler" v-if="!locked && rulersGridVisible">
              <HRuler id="h-ruler" :documentArea="documentAreaPosition"></HRuler>
            </div>
            <div class="v-ruler" v-if="!locked && rulersGridVisible">
              <VRuler id="v-ruler" :documentArea="documentAreaPosition"></VRuler>
            </div>
            <div class="hv-grid" v-if="!locked && rulersGridVisible">
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
                  :color="locked ? 'primary' : 'normal'" @click="lockToggle" v-if="isBuiltInEdge">
                  <q-tooltip anchor="top middle" self="bottom middle">
                    <strong v-if="!locked">Lock</strong>
                    <strong v-else>Unlock</strong>
                  </q-tooltip>
                </q-btn>
              </div>
              <div>
                <q-btn :icon="locked ? 'lock_outline' : 'lock_open'" class="lock-btn" flat round dense size="md"
                  :color="locked ? 'primary' : 'normal'" @click="lockToggle" v-if="!isBuiltInEdge && locked">
                  <q-tooltip anchor="top middle" self="bottom middle">
                    <strong v-if="!locked">Lock</strong>
                    <strong v-else>Unlock</strong>
                  </q-tooltip>
                </q-btn>
              </div>
              <!-- Viewport Area -->
              <div class="viewport" tabindex="0" @mousemove="viewportMouseMoved" @click.right="viewportRightClick"
                @click.left="viewportLeftClick" @dragover="($event) => {
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
                    left: cursorIconPos.x + 0 + 'px',
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
                    @rotateGroup="onRotateGroup" @rotateGroupEnd="onRotateGroupEnd"
                    :renderDirections='["n", "nw", "ne", "s", "se", "sw", "e", "w"]'>
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


                        <q-item dense v-if="topContextToggleVisible">
                          <span style="margin-top: 8px">Mode:</span>
                          <q-toggle :label="toggleModeValue" v-model="toggleModeValue" color="blue"
                            @click="toggleClicked(item, 'mode', $event)" false-value="Auto" true-value="Manual" />
                        </q-item>
                        <q-separator />
                        <q-item dense :disable="toggleValueDisable" v-if="toggleValueShow">
                          <span style="margin-top: 8px">Value:</span>
                          <q-toggle :disable="toggleValueDisable" :label="toggleValueValue" v-model="toggleValueValue"
                            color="blue" @click="toggleClicked(item, 'value', $event)" false-value="Off"
                            true-value="On" />
                        </q-item>
                        <q-item dense :disable="toggleNumberDisable" v-if="toggleNumberShow">
                          <span style="margin-top: 8px">Value:</span>
                          <q-input style="margin-left: 15px;margin-top:-5px" :disable="toggleNumberDisable" dense
                            type="number" v-model="toggleNumberValue"
                            @click="toggleClicked(item, 'number-value', $event)" />
                        </q-item>
                        <q-separator />









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
                                  i.name !== (item?.type ?? '') &&
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

                    <q-menu v-if="showSettingMenu && appState.selectedTargets?.length === 0" touch-position
                      context-menu>
                      <q-list>
                        <q-item dense>
                          <span style="margin-top: 8px">Mode:</span>
                          <q-toggle :label="toggleModeValue" v-model="toggleModeValue" color="blue"
                            @click="toggleClicked(item, 'mode', $event)" false-value="Auto" true-value="Manual" />
                        </q-item>
                        <q-separator />
                        <q-item dense :disable="toggleValueDisable" v-if="toggleValueShow">
                          <span style="margin-top: 8px">Value:</span>
                          <q-toggle :disable="toggleValueDisable" :label="toggleValueValue" v-model="toggleValueValue"
                            color="blue" @click="toggleClicked(item, 'value', $event)" false-value="Off"
                            true-value="On" />
                        </q-item>
                        <q-item dense :disable="toggleNumberDisable" v-if="toggleNumberShow">
                          <span style="margin-top: 8px">Value:</span>
                          <q-input style="margin-left: 15px;margin-top:-5px" :disable="toggleNumberDisable" dense
                            type="number" v-model="toggleNumberValue"
                            @click="toggleClicked(item, 'number-value', $event)" />
                        </q-item>
                        <q-separator />
                      </q-list>

                    </q-menu>

                    <object-type ref="objectsRef" v-if="(item?.type ?? '') !== 'Int_Ext_Wall'" :item="item"
                      :key="item.id + (item?.type ?? '')" :class="{ link: locked && item.t3Entry, }"
                      :show-arrows="locked && !!item.t3Entry?.range" @object-clicked="objectClicked(item)"
                      @auto-manual-toggle="autoManualToggle(item)" @change-value="changeEntryValue"
                      @update-weld-model="updateWeldModel" @click.right="ObjectRightClicked(item, $event)" />

                    <CanvasShape v-if="
                      (item?.type ?? '') === 'Weld_General' ||
                      (item?.type ?? '') === 'Weld_Duct'" ref="objectsRef" :item="item"
                      :key="item.id + (item?.type ?? '')" :class="{ link: locked && item.t3Entry, }"
                      :show-arrows="locked && !!item.t3Entry?.range" @object-clicked="objectClicked(item)"
                      @auto-manual-toggle="autoManualToggle(item)" @change-value="changeEntryValue"
                      @update-weld-model="updateWeldModelCanvas">
                    </CanvasShape>

                    <WallExterior v-if="(item?.type ?? '') === 'Int_Ext_Wall'" ref="objectsRef" :item="item"
                      :key="item.id + (item?.type ?? '') + item.index" :class="{ link: locked && item.t3Entry, }"
                      :show-arrows="locked && !!item.t3Entry?.range" @object-clicked="objectClicked(item)"
                      @auto-manual-toggle="autoManualToggle(item)" @change-value="changeEntryValue"
                      @update-weld-model="updateWeldModelCanvas">
                    </WallExterior>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Object config sidebar -->
    <ObjectConfig :object="appState.items[appState.activeItemIndex]" v-if="!locked && appState.items[appState.activeItemIndex] &&
      (appState.activeItemIndex || appState.activeItemIndex === 0) &&
      (appState.selectedTargets.length > 0)" @refresh-moveable="refreshMoveable"
      @T3UpdateEntryField="T3UpdateEntryField" @linkT3Entry="linkT3EntryDialogAction"
      @gaugeSettings="gaugeSettingsDialogAction" @mounted="addActionToHistory('Object settings opened')"
      @no-change="objectSettingsUnchanged" @DisplayFieldValueChanged="DisplayFieldValueChanged" />
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

  <q-dialog v-model="insertT3EntryDialog.active">
    <!-- <a>This is a test q-dialog></a> -->
    <q-card style="min-width: 650px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Insert Entry</div>
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
          <q-select :option-label="entryLabel" label="Type or select Entry" option-value="id" filled use-input
            hide-selected fill-input input-debounce="0" v-model="insertT3EntryDialog.data" :options="selectPanelOptions"
            @filter="selectPanelFilterFn" class="grow" @update:model-value="insertT3EntrySelect(value)" autofocus
            @focus="insertT3DefaultLoadData">
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

  <q-dialog v-model="deviceModel.active">
    <q-card style="min-width: 900px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Devices List</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-separator />
      <DeviceInfo :deviceModel="deviceModel" @updateDeviceModel="updateDeviceModel" @testSendMsg="testSendMsg">
      </DeviceInfo>
    </q-card>
  </q-dialog>
</template>

<script setup>

import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, toRaw, triggerRef } from "vue";
import { useQuasar, useMeta } from "quasar";
import { VueMoveable, getElementInfo } from "vue3-moveable";
import { VueSelecto } from "vue3-selecto";
import KeyController from "keycon";
import { cloneDeep } from "lodash";
import ObjectType from "../../components/ObjectType.vue";
import GaugeSettingsDialog from "../../components/GaugeSettingsDialog.vue";
import FileUpload from "../../components/FileUpload.vue";
import TopToolbar from "../../components/TopToolbar.vue";
import ToolsSidebar from "../../components/ToolsSidebar.vue";
import ObjectConfig from "../../components/ObjectConfig.vue";
import { tools, demoDeviceData } from "../../lib/common";
import { liveApi } from "../../lib/api";
import CanvasType from "src/components/CanvasType.vue";
import CanvasShape from "src/components/CanvasShape.vue";
import { getOverlapSize } from "overlap-area";
import HRuler from "src/components/HRuler.vue";
import VRuler from "src/components/VRuler.vue";
import HVGrid from "src/components/HVGrid.vue";
import { use } from "echarts";
import WallExterior from "src/components/ObjectTypes/WallExterior.vue";
import NewTopBar from "src/components/NewTopBar.vue";
import T3000 from "src/lib/T3000/T3000";
import DeviceInfo from "src/components/DeviceInfo.vue";
import NewTopToolBar from "src/components/NewTopToolBar.vue";

// New import for Data
import Data from "src/lib/T3000/Hvac/Data/Data";
import { insertT3EntryDialog } from "src/lib/T3000/Hvac/Data/Data";
import Hvac from "src/lib/T3000/Hvac/Hvac"
import IdxUtils from "src/lib/T3000/Hvac/Opt/Common/IdxUtils"

import {
  emptyProject, appState, deviceAppState, deviceModel, rulersGridVisible, /*user,*/ library, emptyLib, isBuiltInEdge,
  documentAreaPosition, viewportMargins, viewport, locked, T3_Types, T3000_Data, grpNav, selectPanelOptions, linkT3EntryDialog,
  savedNotify, undoHistory, redoHistory, moveable
} from '../../lib/T3000/Hvac/Data/T3Data'
import IdxPage from "src/lib/T3000/Hvac/Opt/Common/IdxPage";

import { user } from "../../lib/T3000/Hvac/Data/T3Data";
import DataOpt from "src/lib/T3000/Hvac/Opt/Data/DataOpt";

// Meta information for the application
// Set the meta information
const metaData = { title: "HVAC Drawer" };
useMeta(metaData);
const keycon = new KeyController(); // Initialize key controller for handling keyboard events
const $q = useQuasar(); // Access Quasar framework instance
const selecto = ref(null); // Reference to the selecto component instance
const targets = ref([]); // Array of selected targets
const selectedTool = ref({ ...tools[0], type: "default" }); // Default selected tool

// State variables for drawing and transformations
const isDrawing = ref(false);
const startTransform = ref([0, 0]);
const snappable = ref(true); // Enable snapping for moveable components
const keepRatio = ref(false); // Maintain aspect ratio for resizing

// List of continuous object types
const continuesObjectTypes = ["Duct", "Wall", "Int_Ext_Wall"];

// State of the import JSON dialog
const importJsonDialog = ref({ addedCount: 0, active: false, uploadBtnLoading: false, data: null });
// const savedNotify = ref(false); // Notification state for saving
const contextMenuShow = ref(false); // State of the context menu visibility

// Computed property for loading panels progress
const loadingPanelsProgress = computed(() => {
  if (T3000_Data.value.loadingPanel === null) return 100;
  return parseInt(
    (T3000_Data.value.loadingPanel + 1 / T3000_Data.value.panelsList.length) *
    100
  );
});

const clipboardFull = ref(false); // State of the clipboard

const zoom = Hvac.IdxPage.zoom;

// Dev mode only

if (process.env.DEV) {
  demoDeviceData().then((data) => {
    T3000_Data.value.panelsData = data.data;
    T3000_Data.value.panelsRanges = data.ranges;
    selectPanelOptions.value = T3000_Data.value.panelsData;
  });
}

let lastAction = null; // Store the last action performed
const cursorIconPos = ref({ x: 0, y: 0 }); // Position of the cursor icon
const objectsRef = ref(null); // Reference to objects

// Lifecycle hook for component mount
onMounted(() => {
  Hvac.IdxPage.initQuasar($q);
  Hvac.IdxPage.initPage();
});

function updateDeviceModel(isActive, data) {
  deviceModel.value.active = isActive;
  deviceModel.value.data = data;

  // load device appstate
  // Hvac.DeviceOpt.refreshDeviceAppState();
}

function showMoreDevices() {

  // clear the dirty selection data
  Hvac.DeviceOpt.clearDirtyCurrentDevice();

  deviceModel.value.active = true;

  // clear the shape selection
  appState.value.selectedTarget = [];
  appState.value.selectedTargets = [];
  appState.value.activeItemIndex = null;

  // refresh the graphic panel data
  Hvac.DeviceOpt.refreshGraphicPanelElementCount(deviceModel.value.data);
}


onBeforeUnmount(() => {

})

// Lifecycle hook for component unmount
onUnmounted(() => {
  Hvac.IdxPage.clearAutoSaveInterval();
  Hvac.WsClient.clearInitialDataInterval();
  Hvac.IdxPage.clearIdx();
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

    // const distance = Math.sqrt(dx * dx + dy * dy) + selectedTool.value.height;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Set the scale and rotation of the drawing line
    appState.value.items[appState.value.activeItemIndex].rotate = angle;
    appState.value.items[appState.value.activeItemIndex].width = distance;
    refreshObjects();
  }
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
    // console.log(title); // Log the action title in development mode
  }
  if (title !== "Move Object") {
    setTimeout(() => {
      save(false, false); // Save the current state
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

    console.log('= IdxPage onDragEnd:', e, item.translate);
    save(false, false); // Save the state after drag end
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
  if (e?.selected && !e?.inputEvent?.ctrlKey) {
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

  IdxUtils.refreshMoveableGuides(); // Refresh the moveable guidelines after selection

  setTimeout(() => {
    T3000.Hvac.PageMain.SetWallDimensionsVisible("select", isDrawing.value, appState, null);
  }, 100);
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
}

// Handles resizing of an element
function onResize(e) {
  const item = appState.value.items.find(
    (item) => `moveable-item-${item.id}` === e.target.id
  );
  e.target.style.width = `${e.width}px`;
  e.target.style.height = `${e.height}px`;
  e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
}

// Ends the resizing of an element
function onResizeEnd(e) {

  // Fix bug for when double clicking on the selected object, also clicked the resize button accidentally
  if (e.lastEvent === null || e.lastEvent === undefined) {
    return;
  }

  const itemIndex = appState.value.items.findIndex((item) => `moveable-item-${item.id}` === e?.lastEvent?.target?.id);

  appState.value.items[itemIndex].width = e.lastEvent.width;
  appState.value.items[itemIndex].height = e.lastEvent.height;
  appState.value.items[itemIndex].translate = e.lastEvent.drag.beforeTranslate;

  // T3000.Utils.Log('onResizeEnd', `current item:`, appState.value.items[itemIndex], `itemIndex:${itemIndex}`, `width:${e.lastEvent.width}`, `height:${e.lastEvent.height}`, `translate:${e.lastEvent.drag.beforeTranslate}`);
  T3000.Hvac.PageMain.UpdateExteriorWallStroke(appState, itemIndex, e.lastEvent.height);

  // Refresh objects after resizing
  refreshObjects();
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
    addActionToHistory(`Add ${item?.type ?? ''}`);
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
        Hvac.IdxPage.refreshMoveable();
      }, 1);
    }, 10);
  }, 10);
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
  if (item && continuesObjectTypes.includes(item?.type ?? '')) {
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
    showDimensions: true
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

// Rotate an item by 90 degrees, optionally in the negative direction
function rotate90(item, minues = false) {
  if (!item) return;
  addActionToHistory("Rotate object");
  if (!minues) {
    item.rotate = item.rotate + 90;
  } else {
    item.rotate = item.rotate - 90;
  }
  Hvac.IdxPage.refreshMoveable();
}

// Flip an item horizontally
function flipH(item) {
  addActionToHistory("Flip object H");
  if (item.scaleX === 1) {
    item.scaleX = -1;
  } else {
    item.scaleX = 1;
  }
  Hvac.IdxPage.refreshMoveable();
}

// Flip an item vertically
function flipV(item) {
  addActionToHistory("Flip object V");
  if (item.scaleY === 1) {
    item.scaleY = -1;
  } else {
    item.scaleY = 1;
  }
  Hvac.IdxPage.refreshMoveable();
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
  Hvac.IdxPage.T3UpdateEntryField(key, obj);
}

// Trigger the save event when user changed the "Display Field" value
function DisplayFieldValueChanged(value) {
  save(false, true);
}

// Define a condition for drag events in Selecto
function selectoDragCondition(e) {
  return !e.inputEvent.altKey;
}

// Save the linked T3 entry for an object and update its icon if necessary
function linkT3EntrySave() {
  addActionToHistory("Link object to T3000 entry");

  if (!appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField) {
    if (appState.value.items[appState.value.activeItemIndex].label === undefined) {
      appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField = "description";
    } else {
      appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField = "label";
    }
  }

  // set the default to be divided by 1000
  const checkHasValue = linkT3EntryDialog.value.data.value !== undefined && linkT3EntryDialog.value.data.value !== null && linkT3EntryDialog.value.data.value >= 1000;
  if (checkHasValue) {
    linkT3EntryDialog.value.data.value = linkT3EntryDialog.value.data.value / 1000;
  }

  appState.value.items[appState.value.activeItemIndex].t3Entry = cloneDeep(toRaw(linkT3EntryDialog.value.data));

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

  IdxUtils.refreshObjectStatus(appState.value.items[appState.value.activeItemIndex]);
  linkT3EntryDialog.value.data = null;
  linkT3EntryDialog.value.active = false;
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

const insertCount = ref(0);

// Insert Key Function
function insertT3EntrySelect(value) {
  addActionToHistory("Insert object to T3000 entry");

  const posIncrease = insertCount.value * 80;

  // Add a shape to graphic area
  const size = { width: 60, height: 60 };
  const pos = { clientX: 300, clientY: 100, top: 100, left: 200 + posIncrease };
  const tempTool = tools.find((item) => item.name === 'Pump');
  const item = drawObject(size, pos, tempTool);

  // Set the added shape to active
  const itemIndex = appState.value.items.findIndex((i) => i.id === item.id);
  appState.value.activeItemIndex = itemIndex;

  // Link to T3 entry
  insertT3EntryOnSave();

  insertCount.value++;
}

function insertT3EntryOnSave() {
  addActionToHistory("Link object to T3000 entry");
  if (!appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField) {
    if (appState.value.items[appState.value.activeItemIndex].label === undefined) {
      appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField = "description";
    } else {
      appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField = "label";
    }
  }

  appState.value.items[appState.value.activeItemIndex].t3Entry = cloneDeep(
    toRaw(insertT3EntryDialog.value.data)
  )

  // Change the icon based on the linked entry type
  if (appState.value.items[appState.value.activeItemIndex].type === "Icon") {
    let icon = "fa-solid fa-camera-retro";
    if (insertT3EntryDialog.value.data.type === "GRP") {
      icon = "fa-solid fa-camera-retro";
    } else if (insertT3EntryDialog.value.data.type === "SCHEDULE") {
      icon = "schedule";
    } else if (insertT3EntryDialog.value.data.type === "PROGRAM") {
      icon = "fa-solid fa-laptop-code";
    } else if (insertT3EntryDialog.value.data.type === "HOLIDAY") {
      icon = "calendar_month";
    }
    appState.value.items[appState.value.activeItemIndex].settings.icon = icon;
  }
  IdxUtils.refreshObjectStatus(appState.value.items[appState.value.activeItemIndex]);
  insertT3EntryDialog.value.data = null;
  insertT3EntryDialog.value.active = false;
}

function insertT3DefaultLoadData() {
}

// Save the current app state, optionally displaying a notification
function save(notify = false, saveToT3 = false) {
  Hvac.IdxPage.save(notify, saveToT3);
}

function refreshMoveable() {
  Hvac.IdxPage.refreshMoveable();
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
        Hvac.IdxPage.newProject();
      })
      .onCancel(() => { });
    return;
  }

  Hvac.IdxPage.newProject();
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
    Hvac.IdxPage.refreshMoveable();
  }
});

// Save the current state when "Ctrl + S" is pressed
keycon.keydown(["ctrl", "s"], (e) => {
  e.inputEvent.preventDefault();
  save(true, true);
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

// Insert function
keycon.keydown(["insert"], (e) => {
  // T3000.Hvac.KiOpt.InitKeyInsertOpt(insertT3EntryDialog.value);
  T3000.Hvac.KiOpt.InsertT3EntryDialog();
  // console.log('IndexPage keycon ', Data.insertT3EntryDialog.value)
});

// Open the dialog to link a T3 entry
function linkT3EntryDialogAction() {
  linkT3EntryDialog.value.active = true;
  if (!appState.value.items[appState.value.activeItemIndex]?.t3Entry) return;
  linkT3EntryDialog.value.data = cloneDeep(appState.value.items[appState.value.activeItemIndex]?.t3Entry);
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

  const title = selectedItems.map((item) => item?.type ?? "").join("-");
  let previous = selectedItems[0].zindex;

  selectedItems.forEach((item) => {
    item.zindex = previous - 1;
    previous = item.zindex;
  });

  const isAllDuct = selectedItems.every((item) => (item?.type ?? "") === "Duct");

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

  if (selectedItems1.some((item) => (item?.type ?? "") === "Weld")) {
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
  const isAllDuct = selectedItems.every((item) => (item?.type ?? "") === "Duct");

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

  Hvac.IdxPage.refreshMoveable();
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
  Hvac.IdxPage.refreshMoveable();
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
  Hvac.IdxPage.refreshMoveable();
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

    console.log('= Idx saveLibImage file', file);
    console.log('= Idx saveLibImage user', user.value);

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

  if (isBuiltInEdge.value) {
    Hvac.WebClient.SaveImage(message);
  }
  else {
    Hvac.WsClient.SaveImage(message);
  }
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
          IdxUtils.refreshMoveableGuides();
        }, 100);
        Hvac.IdxPage.refreshMoveable();
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
    IdxUtils.refreshMoveableGuides();
  }, 100);
  Hvac.IdxPage.refreshMoveable();
}

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
      save(true, true);
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
      Hvac.IdxPage.zoomAction("out");
      break;
    case "zoomIn":
      Hvac.IdxPage.zoomAction();
      break;
    case "zoomSet":
      Hvac.IdxPage.zoomAction("set", val);
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
    case "toggleRulersGrid":
      toggleRulersGrid(val);
      break;
    default:
      break;
  }
}

// Reload panel data by requesting the panels list
function reloadPanelsData() {
  T3000_Data.value.loadingPanel = null;

  /*
  window.chrome?.webview?.postMessage({
    action: 4, // GET_PANELS_LIST
  });
  */

  if (isBuiltInEdge.value) {
    Hvac.WebClient.GetPanelsList();
  }
  else {
    Hvac.WsClient.GetPanelsList();
  }
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
  IdxPage.restDocumentAreaPosition();
}

// Handle object click events based on t3Entry type
function objectClicked(item) {
  if (!locked.value) return;
  if (item.t3Entry?.type === "GRP") {

    const message = {
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    };

    // Use this value for saving the swtiched grp related data
    DataOpt.SaveGrpSwitch(message);

    if (isBuiltInEdge.value) {
      Hvac.WebClient.LoadGraphicEntry(message);
    }
    else {
      Hvac.WsClient.LoadGraphicEntry(message);
    }

    /*
    window.chrome?.webview?.postMessage({
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.t3Entry.pid,
      entryIndex: item.t3Entry.index,
    });
    */

  } else if (["SCHEDULE", "PROGRAM", "HOLIDAY"].includes(item.t3Entry?.type)) {

    const message = {
      action: 8, // OPEN_ENTRY_EDIT_WINDOW
      panelId: item.t3Entry.pid,
      entryType: T3_Types[item.t3Entry.type],
      entryIndex: item.t3Entry.index,
    };

    if (isBuiltInEdge.value) {
      Hvac.WebClient.OpenEntryEditWindow(message);
    }
    else {
      Hvac.WsClient.OpenEntryEditWindow(message);
    }

    /*
    window.chrome?.webview?.postMessage({
      action: 8, // OPEN_ENTRY_EDIT_WINDOW
      panelId: item.t3Entry.pid,
      entryType: T3_Types[item.t3Entry.type],
      entryIndex: item.t3Entry.index,
    });
    */
  } else if (
    item.t3Entry?.auto_manual === 1 &&
    item.t3Entry?.digital_analog === 0 &&
    item.t3Entry?.range
  ) {
    item.t3Entry.control = item.t3Entry.control === 1 ? 0 : 1;
    T3UpdateEntryField("control", item);
  }

  setTheSettingContextMenuVisible();
}

// Updates an entry value
function changeEntryValue(refItem, newVal, control) {
  const key = control ? "control" : "value";
  const item = appState.value.items.find((i) => i.id === refItem.id);
  item.t3Entry[key] = newVal;
  T3UpdateEntryField(key, item);
}

// Toggles the auto/manual mode of an item
function autoManualToggle(item) {
  if (!locked.value) return;
  item.t3Entry.auto_manual = item.t3Entry.auto_manual ? 0 : 1;
  T3UpdateEntryField("auto_manual", item);
}

const topContextToggleVisible = ref(false);

const showSettingMenu = ref(false);
const toggleModeValue = ref('Auto');
const toggleValueValue = ref('Off');
const toggleValueDisable = ref(false);
const toggleValueShow = ref(false);

const toggleNumberDisable = ref(false);
const toggleNumberShow = ref(false);
const toggleNumberValue = ref(0);


function ObjectRightClicked(item, ev) {
  if (item.t3Entry !== null) {

    showSettingMenu.value = true;
    // Load the default auto_manual value
    if (item.t3Entry.auto_manual === 1) {
      toggleModeValue.value = "Manual";
      toggleValueDisable.value = false;
      toggleNumberDisable.value = false;
    }
    else {
      toggleModeValue.value = "Auto";
      toggleValueDisable.value = true;
      toggleNumberDisable.value = true;
    }

    // Show on/off value field only if the digital_analog is 0, otherwise show different value field (Input / Dropdown)

    if (item.t3Entry.digital_analog === 0) {
      toggleValueShow.value = true;
    }
    else {
      toggleValueShow.value = false;
    }

    // Load the default control value
    if (item.t3Entry.control === 1) {
      toggleValueValue.value = "On";
    }
    else {
      toggleValueValue.value = "Off";
    }

    // Set digital_analog field and value
    if (item.t3Entry.digital_analog === 1 && item.t3Entry.range !== 101) {
      toggleNumberShow.value = true;
      toggleNumberValue.value = item.t3Entry.value * 1;/// 1000;
    }
    else {
      toggleNumberShow.value = false;
    }
  }
  else {
    showSettingMenu.value = false;
  }
}

function toggleClicked(item, type, ev) {
  if (type === "mode") {

    // Disable the value field if the mode is set to Auto
    if (toggleModeValue.value === "Auto") {
      toggleValueDisable.value = true;
      toggleNumberDisable.value = true;
    }
    else {
      toggleValueDisable.value = false;
      toggleNumberDisable.value = false;
    }

    item.t3Entry.auto_manual = toggleModeValue.value === "Auto" ? 0 : 1;
    T3UpdateEntryField("auto_manual", item);
  }

  if (type == "value") {
    item.t3Entry.control = toggleValueValue.value === "Off" ? 0 : 1;
    T3UpdateEntryField("control", item);
  }

  if (type === "number-value") {
    item.t3Entry.value = toggleNumberValue.value * 1;// * 1000;
    T3UpdateEntryField("value", item);
  }

  save(false, true);

  // console.log('toggleClicked->after item', item.t3Entry)
}

function setTheSettingContextMenuVisible() {

  if (appState.value.selectedTargets.length > 1) {
    topContextToggleVisible.value = false;
    toggleValueShow.value = false;
    toggleNumberShow.value = false;

  } else {
    if (appState.value.selectedTargets.length === 1) {
      const selectedItem = appState.value.items.find(
        (item) => `moveable-item-${item.id}` === appState.value.selectedTargets[0].id
      )

      if (selectedItem.t3Entry !== null) {
        topContextToggleVisible.value = true;
        ObjectRightClicked(selectedItem, null);
      }
      else {
        topContextToggleVisible.value = false;
        toggleValueShow.value = false;
        toggleNumberShow.value = false;
      }
    }
  }
}

// Navigate back in the group navigation history
function navGoBack() {
  if (grpNav.value.length > 1) {
    const item = grpNav.value[grpNav.value.length - 2];

    /*
    window.chrome?.webview?.postMessage({
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.pid,
      entryIndex: item.index,
    });
    */

    const message = {
      action: 7, // LOAD_GRAPHIC_ENTRY
      panelId: item.pid,
      entryIndex: item.index,
    };

    DataOpt.RemoveLatestGrpSwitch();

    if (isBuiltInEdge.value) {
      Hvac.WebClient.LoadGraphicEntry(message);
    }
    else {
      Hvac.WsClient.LoadGraphicEntry(message);
    }
  } else {

    /*
    window.chrome?.webview?.postMessage({
      action: 1, // GET_INITIAL_DATA
    });
    */

    if (isBuiltInEdge.value) {
      Hvac.WebClient.GetInitialData();
    }
    else {
      const currentDevice = Hvac.DeviceOpt.getCurrentDevice();
      const panelId = currentDevice.panelId;
      const graphicId = currentDevice.graphic;
      Hvac.WsClient.GetInitialData(panelId, graphicId, true);
    }
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
        IdxUtils.saveLib();
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
  IdxUtils.saveLib();
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
  Hvac.IdxPage.refreshMoveable();
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

// // Saves the library data to the webview
// function saveLib() {
//   // Filter out online images and objects from the library
//   const libImages = toRaw(library.value.images.filter((item) => !item.online));
//   const libObjects = toRaw(library.value.objLib.filter((item) => !item.online));

//   // Post a message to the webview with the saved data
//   window.chrome?.webview?.postMessage({
//     action: 10, // SAVE_LIBRARY_DATA
//     data: { ...toRaw(library.value), images: libImages, objLib: libObjects },
//   });
// }


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
  IdxUtils.saveLib();
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
  IdxUtils.saveLib();
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

      if (library.value.images.length <= 0) {
        return;
      }

      const imagePath = cloneDeep(library.value.images[itemIndex].path);

      /*
      window.chrome?.webview?.postMessage({
        action: 11, // DELETE_IMAGE
        data: toRaw(imagePath),
      });
      */

      if (isBuiltInEdge.value) {
        Hvac.WebClient.DeleteImage(toRaw(imagePath));
      }
      else {
        Hvac.WsClient.DeleteImage(toRaw(imagePath));
      }

      IdxUtils.saveLib();
    }
  }
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

function toggleRulersGrid(val) {
  rulersGridVisible.value = val === "Enable" ? true : false;
  appState.value.rulersGridVisible = rulersGridVisible.value;
  save(false, false);
}

// Handles a tool being dropped
function toolDropped(ev, tool) {
  const size = tool.name === "Int_Ext_Wall" ? { width: 200, height: 10 } : { width: 60, height: 60 };
  drawObject(
    //{ width: 60, height: 60 },
    size,
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
    if ((item?.type ?? "") === "Weld" && item.id === weldModel.id) {
      item.settings.weldItems = itemList;
    }
  });
};

const updateWeldModelCanvas = (weldModel, pathItemList) => {
  appState.value.items.map((item) => {
    if (
      ((item?.type ?? "") === "Weld_General" || (item?.type ?? "") === "Weld_Duct") &&
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

function viewportLeftClick(ev) {
  // console.log('IndexPage.vue->viewportLeftClick->ev', ev);
  ev.preventDefault();

  const check = !locked.value && selectedTool.value.name !== 'Pointer' && selectedTool.value.name != "Wall" && !isDrawing.value
    && selectedTool.value.name != "Int_Ext_Wall" && selectedTool.value.name != "Duct";

  if (check) {
    // console.log('IndexPage.vue->viewportLeftClick->locked,selectedTool', locked, selectedTool);

    // Manually create a shape at the mouse current position

    var ePosition = {
      rect: { width: 60, height: 60, top: ev.clientY, left: ev.clientX },
      clientX: ev.clientX,
      clientY: ev.clientY
    };

    onSelectoDragEnd(ePosition);

    // Release the tool
    selectTool(tools[0]);
  }
}

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

    //clear empty drawing object
    T3000.Hvac.PageMain.ClearItemsWithZeroWidth(appState);
    T3000.Hvac.PageMain.SetWallDimensionsVisible("all", isDrawing.value, appState, false);
  }
}

// // Checks if the user is logged in
// function isLoggedIn() {
//   const hasToken = $q.cookies.has("token");
//   if (!hasToken) {
//     user.value = null;
//     return;
//   }

//   // Get the user's data from the API
//   liveApi
//     .get("hvacTools")
//     .then(async (res) => {
//       const data = await res.json();
//       if (data.length > 0) {
//         data?.forEach((oItem) => {
//           addOnlineLibImage(oItem);
//         });
//       }
//     })
//     .catch((err) => {
//       console.log(err);
//     });

//   liveApi
//     .get("hvacObjectLibs")
//     .then(async (res) => {
//       const data = await res.json();
//       if (data.length > 0) {
//         data.forEach((oItem) => {
//           library.value.objLib.push({
//             id: oItem.id,
//             label: oItem.label,
//             items: oItem.items,
//             online: true,
//           });
//         });
//       }
//     })
//     .catch((err) => {
//       console.log(err);
//     });
//   liveApi
//     .get("me")
//     .then(async (res) => {
//       user.value = await res.json();
//     })
//     .catch((err) => {
//       // Not logged in
//     });
// }

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

.moveable-item-wrapper:has(.Int_Ext_Wall) {
  transform-origin: 0 100%;
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
