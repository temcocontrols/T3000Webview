<template>
  <q-page>
    <div>
      <div class="tools flex column">
        <q-list class="rounded-borders text-primary">
          <q-item v-for="tool in tools" :key="tool.name" @click="selectTool(tool.name)" clickable v-ripple
            :active="selectedTool.name === tool.name" active-class="active-tool">
            <q-tooltip anchor="center right" self="center left">
              {{ tool.label }}
            </q-tooltip>
            <q-item-section>
              <q-icon :name="tool.icon" size="sm" />
            </q-item-section>
          </q-item>
          <q-item v-for="tool in customTools" :key="tool.name" @click="selectTool(tool.name, 'custom', tool.svg)"
            clickable v-ripple :active="selectedTool.name === tool.name" active-class="active-tool">
            <q-tooltip anchor="center right" self="center left">
              {{ tool.label }}
            </q-tooltip>
            <q-item-section>
              <q-icon name="dashboard_customize" size="sm" />
            </q-item-section>
          </q-item>
          <q-item @click="uploadObjectDialog.active = true" clickable v-ripple>
            <q-tooltip anchor="center right" self="center left">
              Add custom SVG
            </q-tooltip>
            <q-item-section>
              <q-icon name="add_circle_outline" size="sm" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div class="viewport-wrapper">
        <q-toolbar class="toolbar text-white shadow-2">
          <!-- File menu -->
          <q-btn-dropdown no-caps stretch flat content-class="menu-dropdown" label="File">
            <q-list>
              <q-item clickable v-close-popup @click="newProject">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="assignment" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>New Project</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip>Ctrl + R</q-chip>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="importJsonAction">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="file_open" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Import</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="exportToJsonAction">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="file_open" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Export</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="save">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="save" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Save</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip>Ctrl + S</q-chip>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <!--  Edit menu -->
          <q-btn-dropdown no-caps stretch flat content-class="menu-dropdown" label="Edit">
            <q-list>
              <q-item dense clickable v-close-popup @click="undoAction" :disable="undoHistory.length < 1">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="undo" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Undo</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip>Ctrl + Z</q-chip>
                </q-item-section>
              </q-item>
              <q-item dense clickable v-close-popup @click="redoAction" :disable="redoHistory.length < 1">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="redo" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Redo</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip>Ctrl + Y</q-chip>
                </q-item-section>
              </q-item>
              <q-separator inset spaced />
              <q-item dense clickable v-close-popup @click="deleteSelected"
                :disable="appState.selectedTargets.length < 1">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="delete" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Delete selected</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <!-- Object menu -->
          <q-btn-dropdown no-caps stretch flat content-class="menu-dropdown" label="Object"
            :disable="appState.activeItemIndex === null">
            <q-list>
              <q-item dense clickable v-close-popup @click="
                duplicateObject(appState.items[appState.activeItemIndex])
              ">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="file_copy" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>Duplicate</q-item-section>
              </q-item>
              <q-item dense clickable v-close-popup @click="rotate90(appState.items[appState.activeItemIndex])">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="autorenew" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>Rotate 90°</q-item-section>
              </q-item>
              <q-item dense clickable v-close-popup @click="
                rotate90(appState.items[appState.activeItemIndex], true)
              ">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="sync" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>Rotate -90°</q-item-section>
              </q-item>
              <q-separator />
              <q-item dense clickable v-close-popup @click="flipH(appState.items[appState.activeItemIndex])">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="flip" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>Flip horizontal</q-item-section>
              </q-item>
              <q-item dense clickable v-close-popup @click="flipV(appState.items[appState.activeItemIndex])">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="flip" color="grey-7" text-color="white" style="transform: rotate(90deg)" />
                </q-item-section>
                <q-item-section>Flip vertical</q-item-section>
              </q-item>
              <q-separator />
              <q-item dense clickable v-close-popup @click="bringToFront(appState.items[appState.activeItemIndex])">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="flip_to_front" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>Bring to front</q-item-section>
              </q-item>
              <q-item dense clickable v-close-popup @click="sendToBack(appState.items[appState.activeItemIndex])">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="flip_to_back" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>Send to Back</q-item-section>
              </q-item>
              <q-separator />
              <q-item dense clickable v-close-popup @click="removeObject(appState.items[appState.activeItemIndex])">
                <q-item-section avatar>
                  <q-avatar size="sm" icon="remove" color="grey-7" text-color="white" />
                </q-item-section>
                <q-item-section>Remove</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-space />
          <div class="flex">
            <q-btn @click="zoom = zoom - 10" dense flat size="sm" icon="zoom_out" />
            <div class="px-1">
              <input class="zoom-input" @keydown.enter="changeZoomValue" :value="zoom" type="number" />%
            </div>
            <q-btn @click="zoom = zoom + 10" dense flat size="sm" icon="zoom_in" />
          </div>


        </q-toolbar>
        <div class="viewport">
          <vue-selecto ref="selecto" dragContainer=".viewport" v-bind:selectableTargets="targets" v-bind:hitRate="100"
            v-bind:selectByClick="true" v-bind:selectFromInside="true" v-bind:toggleContinueSelect="['shift']"
            v-bind:ratio="0" :boundContainer="true" @dragStart="onSelectoDragStart" @selectEnd="onSelectoSelectEnd"
            @dragEnd="onSelectoDragEnd" :dragCondition="selectoDragCondition">
          </vue-selecto>
          <div ref="viewport">
            <vue-moveable ref="movable" v-bind:draggable="true" v-bind:resizable="true" v-bind:rotatable="true"
              v-bind:target="appState.selectedTargets" :snappable="true" :snapThreshold="10" :isDisplaySnapDigit="true"
              :snapGap="true" :snapDirections="{
                top: true,
                right: true,
                bottom: true,
                left: true,
              }" :elementSnapDirections="{
  top: true,
  right: true,
  bottom: true,
  left: true,
}" :snapDigit="0" :elementGuidelines="appState.elementGuidelines" :origin="true" :throttleResize="0"
              :throttleRotate="0" rotationPosition="top" :originDraggable="true" :originRelative="true"
              :defaultGroupRotate="0" defaultGroupOrigin="50% 50%" :padding="{ left: 0, top: 0, right: 0, bottom: 0 }"
              @clickGroup="onClickGroup" @drag-start="onDragStart" @drag="onDrag" @drag-end="onDragEnd"
              @dragGroupStart="onDragGroupStart" @dragGroup="onDragGroup" @dragGroupEnd="onDragGroupEnd"
              @resizeStart="onResizeStart" @resize="onResize" @resizeEnd="onResizeEnd" @rotateStart="onRotateStart"
              @rotate="onRotate" @resizeGroupStart="onResizeGroupStart" @resizeGroup="onResizeGroup"
              @resizeGroupEnd="onResizeGroupEnd" @rotateGroupStart="onRotateGroupStart" @rotateGroup="onRotateGroup">
            </vue-moveable>

            <div v-for="item in appState.items" :key="item.id" ref="targets"
              :style="`position: absolute; transform: translate(${item.translate[0]}px, ${item.translate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}); width: ${item.width}px; height: ${item.height}px; z-index: ${item.zindex};`"
              :id="`movable-item-${item.id}`" @mousedown.right="selectByRightClick" class="movable-item-wrapper">
              <q-menu touch-position context-menu>
                <q-list>
                  <q-item dense clickable v-close-popup @click="duplicateObject(item)">
                    <q-item-section avatar>
                      <q-avatar size="sm" icon="file_copy" color="grey-7" text-color="white" />
                    </q-item-section>
                    <q-item-section>Duplicate</q-item-section>
                  </q-item>
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
                  <q-item dense clickable v-close-popup @click="removeObject(item)">
                    <q-item-section avatar>
                      <q-avatar size="sm" icon="remove" color="grey-7" text-color="white" />
                    </q-item-section>
                    <q-item-section>Remove</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
              <object-type :item="item" />
            </div>
          </div>
        </div>
      </div>
      <div class="item-config flex flex-nowrap column" v-if="appState.activeItemIndex || appState.activeItemIndex === 0">
        <div class="item-config-inner">
          <q-expansion-item class="mb-2 border border-solid border-gray-700" dark default-opened label="General">
            <div class="grid gap-4 grid-cols-2 mb-4">
              <q-input input-style="width: 60px" @update:model-value="refreshSelecto" label="X" v-model.number="
                appState.items[appState.activeItemIndex].translate[0]
              " dark filled type="number" />
              <q-input input-style="width: 60px" @update:model-value="refreshSelecto" label="Y" v-model.number="
                appState.items[appState.activeItemIndex].translate[1]
              " dark filled type="number" />

              <q-input input-style="width: 60px" @update:model-value="refreshSelecto" label="Width"
                v-model.number="appState.items[appState.activeItemIndex].width" dark filled type="number" />
              <q-input input-style="width: 60px" @update:model-value="refreshSelecto" label="Height"
                v-model.number="appState.items[appState.activeItemIndex].height" dark filled type="number" />
              <q-input input-style="width: 60px" @update:model-value="refreshSelecto" label="Rotate"
                v-model.number="appState.items[appState.activeItemIndex].rotate" dark filled type="number" />
              <q-input v-if="
                appState.items[appState.activeItemIndex].settings.fontSize !==
                undefined
              " input-style="width: 60px" label="Font size" v-model.number="
  appState.items[appState.activeItemIndex].settings.fontSize
" dark filled type="number" />
            </div>
            <q-input class="w-full mb-2" v-if="appState.items[appState.activeItemIndex].settings.textColor !== undefined"
              dark filled v-model="appState.items[appState.activeItemIndex].settings.textColor" label="Text Color">
              <template v-slot:append>
                <q-icon name="colorize" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-color v-model="
                      appState.items[appState.activeItemIndex].settings.textColor
                    " />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-input class="w-full mb-2" dark filled v-model="appState.items[appState.activeItemIndex].settings.title"
              label="Title">
            </q-input>
            <q-input class="w-full mb-2" dark filled
              v-model="appState.items[appState.activeItemIndex].settings.titleColor" label="Title Color">
              <template v-slot:append>
                <q-icon name="colorize" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-color v-model="
                      appState.items[appState.activeItemIndex].settings.titleColor
                    " />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-input class="w-full mb-2" dark filled v-model="appState.items[appState.activeItemIndex].settings.bgColor"
              label="Background Color">
              <template v-slot:append>
                <q-icon name="colorize" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-color v-model="
                      appState.items[appState.activeItemIndex].settings.bgColor
                    " />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-checkbox v-if="
              !appState.items[appState.activeItemIndex].t3Entry &&
              appState.items[appState.activeItemIndex].settings.active !==
              undefined
            " dark filled v-model="appState.items[appState.activeItemIndex].settings.active" class="text-white w-full"
              label="Active" :disable="
                (appState.items[appState.activeItemIndex].t3Entry &&
                  appState.items[appState.activeItemIndex].t3Entry
                    ?.auto_manual === 0) ||
                appState.items[appState.activeItemIndex].t3Entry
                  ?.digital_analog === 1
              ">
              <q-tooltip v-if="
                appState.items[appState.activeItemIndex].t3Entry
                  ?.auto_manual === 0
              " anchor="center left" self="center end">
                Can't activate it because the linked entry is in auto mode
              </q-tooltip></q-checkbox>
            <q-checkbox dark filled v-model="appState.items[appState.activeItemIndex].settings.inAlarm"
              class="text-white w-full" label="In alarm" v-if="
                appState.items[appState.activeItemIndex].settings.inAlarm !==
                undefined
              " />
          </q-expansion-item>

          <div>
            <q-btn v-if="
              ['Gauge', 'Dial'].includes(
                appState.items[appState.activeItemIndex].type
              )
            " dark outline no-caps stretch icon="settings" class="text-white w-full mb-2" label="Settings" @click="
  gaugeSettingsDialogAction(
    appState.items[appState.activeItemIndex]
  )
" />
            <q-btn dark outline no-caps stretch :icon="
              appState.items[appState.activeItemIndex].t3Entry
                ? 'dataset_linked'
                : undefined
            " class="text-white w-full" :label="
  !appState.items[appState.activeItemIndex].t3Entry
    ? 'Link with an entry'
    : `Linked with ${appState.items[appState.activeItemIndex].t3Entry
      .description
    }`
" @click="linkT3EntryDialogAction" />
            <q-expansion-item v-if="appState.items[appState.activeItemIndex].t3Entry"
              class="mt-2 border border-solid border-gray-700" dark default-opened label="Entry settings">
              <q-select class="mb-1" filled dark v-model="
                appState.items[appState.activeItemIndex].t3Entry.auto_manual
              " :options="[
  { label: 'Auto', value: 0 },
  { label: 'Manual', value: 1 },
]" label="Auto/Manual" emit-value map-options @update:model-value="
  T3UpdateEntryField(
    'auto_manual',
    appState.items[appState.activeItemIndex]
  )
" />
              <q-select class="mb-1" v-if="
                appState.items[appState.activeItemIndex].t3Entry
                  .digital_analog === 0 &&
                appState.items[appState.activeItemIndex].t3Entry.range
              " :disable="
  appState.items[appState.activeItemIndex].t3Entry
    ?.auto_manual === 0
" filled dark v-model="
  appState.items[appState.activeItemIndex].t3Entry.control
" :options="[
  {
    label: getRangeById(
      appState.items[appState.activeItemIndex].t3Entry.range
    ).off,
    value: 0,
  },
  {
    label: getRangeById(
      appState.items[appState.activeItemIndex].t3Entry.range
    ).on,
    value: 1,
  },
]" label="Value" emit-value map-options @update:model-value="
  T3UpdateEntryField(
    'control',
    appState.items[appState.activeItemIndex]
  )
" />
              <!-- Program status -->
              <q-select class="mb-1" v-if="
                appState.items[appState.activeItemIndex].t3Entry.type ===
                'PROGRAM'
              " :disable="
  appState.items[appState.activeItemIndex].t3Entry
    ?.auto_manual === 0
" filled dark v-model="
  appState.items[appState.activeItemIndex].t3Entry.status
" :options="[
  {
    label: 'OFF',
    value: 0,
  },
  {
    label: 'ON',
    value: 1,
  },
]" label="Status" emit-value map-options @update:model-value="
  T3UpdateEntryField(
    'status',
    appState.items[appState.activeItemIndex]
  )
" />
              <!-- Schedule output -->
              <q-select class="mb-1" v-else-if="
                appState.items[appState.activeItemIndex].t3Entry.type ===
                'SCHEDULE'
              " :disable="
  appState.items[appState.activeItemIndex].t3Entry
    ?.auto_manual === 0
" filled dark v-model="
  appState.items[appState.activeItemIndex].t3Entry.output
" :options="[
  {
    label: 'OFF',
    value: 0,
  },
  {
    label: 'ON',
    value: 1,
  },
]" label="Output" emit-value map-options @update:model-value="
  T3UpdateEntryField(
    'output',
    appState.items[appState.activeItemIndex]
  )
" />
              <!-- Holiday value -->
              <q-select class="mb-1" v-else-if="
                appState.items[appState.activeItemIndex].t3Entry.type ===
                'HOLIDAY'
              " :disable="
  appState.items[appState.activeItemIndex].t3Entry
    ?.auto_manual === 0
" filled dark v-model="appState.items[appState.activeItemIndex].t3Entry.value" :options="[
  {
    label: 'OFF',
    value: 0,
  },
  {
    label: 'ON',
    value: 1,
  },
]" label="Value" emit-value map-options @update:model-value="
  T3UpdateEntryField(
    'value',
    appState.items[appState.activeItemIndex]
  )
" />
              <!-- Analog range value -->
              <q-input class="mb-1" v-if="
                appState.items[appState.activeItemIndex].t3Entry
                  .digital_analog === 1
              " :disable="
  appState.items[appState.activeItemIndex].t3Entry
    ?.auto_manual === 0
" filled dark type="number" v-model.number="
  appState.items[appState.activeItemIndex].t3Entry.value
" label="Value" @update:model-value="
  T3UpdateEntryField(
    'value',
    appState.items[appState.activeItemIndex]
  )
" />
              <!-- Display field -->
              <q-select filled dark v-model="
                appState.items[appState.activeItemIndex].settings.t3EntryDisplayField
              " :options="t3EntryDisplayFieldOptions" label="Display field" emit-value map-options />
            </q-expansion-item>
          </div>
        </div>
      </div>
      <div v-else></div>
    </div>
  </q-page>
  <!-- Link entry dialog -->
  <q-dialog v-model="linkT3EntryDialog.active">
    <q-card style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Link Entry</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section style="height: 70vh" class="scroll">
        <q-select option-label="description" option-value="id" filled use-input hide-selected fill-input
          input-debounce="0" v-model="linkT3EntryDialog.data" :options="selectPanelOptions" @filter="selectPanelFilterFn"
          label="Select Entry" />
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn flat label="Save" :disable="!linkT3EntryDialog.data" color="primary" @click="linkT3EntrySave" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Upload custom object dialog -->
  <q-dialog v-model="uploadObjectDialog.active">
    <q-card style="min-width: 450px">
      <q-card-section>
        <div class="text-h6">Upload custom SVG</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <file-upload :types="['image/svg+xml']" @uploaded="handleFileUploaded" @file-added="customObjectFileAdded"
          @file-removed="uploadObjectDialog.uploadBtnDisabled = true" />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" @click="uploadObjectDialog.active = false" />
        <q-btn :disabled="uploadObjectDialog.uploadBtnDisabled" :loading="uploadObjectDialog.uploadBtnLoading" flat
          label="Save" @click="saveCustomObject()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <!-- Edit Gauge/Dial dialog -->
  <AddEditDashboardItem action="Edit" v-model:active="gaugeSettingsDialog.active" :item="gaugeSettingsDialog.data"
    :panels-data="T3000_Data.panelsData" @item-saved="gaugeSettingsSave" />

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

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted, toRaw, triggerRef } from "vue";
import { useQuasar, useMeta } from "quasar";
import { VueMoveable } from "vue3-moveable";
import { VueSelecto } from "vue3-selecto";
import KeyController /* , { getCombi, getKey } */ from "keycon";
import { cloneDeep } from "lodash";
import panzoom from "panzoom";
import ObjectType from "../components/ObjectType.vue";
import AddEditDashboardItem from "../components/AddEditGaugeDialog.vue";
import FileUpload from "../components/FileUpload.vue";
import { tools, T3_Types, ranges } from "../lib/common";

// Remove when deploy
const demoDeviceData = () => {
  if (process.env.DEV) {
    return import("../lib/demo-data").then((exps) => {
      return exps.default;
    });
  }
  return undefined;
};

export default defineComponent({
  name: "IndexPage",
  components: {
    VueMoveable,
    VueSelecto,
    ObjectType,
    FileUpload,
    AddEditDashboardItem,
  },
  setup() {
    const metaData = {
      title: "HVAC Drawer",
    };
    useMeta(metaData);
    const keycon = new KeyController();
    const $q = useQuasar();
    const movable = ref(null);
    const selecto = ref(null);
    const viewport = ref(null);
    const targets = ref([]);
    const selectedTool = ref({ name: "Pointer", type: "default", svg: null });
    const linkT3EntryDialog = ref({ active: false, data: null });
    const T3000_Data = ref({ panelsData: [], panelsList: [] });
    const uploadObjectDialog = ref({
      addedCount: 0,
      active: false,
      uploadBtnDisabled: true,
      uploadBtnLoading: false,
      svg: null,
    });

    const importJsonDialog = ref({
      addedCount: 0,
      active: false,
      uploadBtnLoading: false,
      svg: null,
    });
    const customTools = ref([]);

    const selectPanelOptions = ref(T3000_Data.value.panelsData);
    let getPanelsInterval = null

    // Remove when deploy
    if (process.env.DEV) {
      demoDeviceData().then((data) => {
        T3000_Data.value.panelsData = data;
      });
      selectPanelOptions.value = T3000_Data.value.panelsData;
    }

    let panzoomInstance = null;
    const emptyProject = {
      items: [],
      selectedTargets: [],
      elementGuidelines: [],
      itemsCount: 0,
      activeItemIndex: null,
      viewportTransform: { x: 0, y: 0, scale: 1 },
    };
    const appState = ref(cloneDeep(emptyProject));
    const undoHistory = ref([]);
    const redoHistory = ref([]);
    let lastAction = null;
    onMounted(() => {
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
      panzoomInstance.on("transform", function (e) {
        appState.value.viewportTransform = e.getTransform();
        triggerRef(appState)
      });

      refreshMovable()

      window.chrome?.webview?.postMessage({
        action: 1,
      });
      window.chrome?.webview?.postMessage({
        action: 4, // GET_PANELS_LIST
      });
      if (window.chrome?.webview?.postMessage) {
        getPanelsInterval = setInterval(window.chrome.webview.postMessage, 10000, {
          action: 4, // GET_PANELS_LIST
        });

        setInterval(function () {
          if (getLinkedEntries().length === 0) return;
          window.chrome?.webview?.postMessage({
            action: 6, // GET_ENTRIES
            data: getLinkedEntries().map(ii => { return { panelId: ii.t3Entry.pid, index: ii.t3Entry.index, type: T3_Types[ii.t3Entry.type] } })
          });
        }, 5000);

      }
    });
    onUnmounted(() => {
      if (panzoomInstance?.dispose) return;
      panzoomInstance.dispose();
    });

    window.chrome?.webview?.addEventListener("message", (arg) => {
      console.log("Recieved webview message", arg.data);
      if ("action" in arg.data) {
        if (arg.data.action === "GET_PANELS_LIST_RES") {
          if (arg.data.data) {
            T3000_Data.value.panelsList = arg.data.data;
            T3000_Data.value.panelsList.forEach((panel, index) => {
              setTimeout(() => {
                window.chrome?.webview?.postMessage({
                  action: 0, // GET_PANEL_DATA
                  panelId: panel.panel_number,
                });
              }, 5000 * index);

            });
          }
        } else if (arg.data.action === "UPDATE_ENTRY_RES") {
        } else if (arg.data.action === "GET_INITIAL_DATA_RES") {
          if (arg.data.data) {
            arg.data.data = JSON.parse(arg.data.data);
          }
          appState.value = arg.data.data;
          setTimeout(() => {
            refreshMovable()
          }, 100);
        } else if (arg.data.action === "GET_PANEL_DATA_RES") {
          if (getPanelsInterval && arg.data?.panel_id) {
            // clearInterval(getPanelsInterval);
          }
          T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
            (item) => item.pid !== arg.data.panel_id
          );
          T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
            arg.data.data
          );
          selectPanelOptions.value = T3000_Data.value.panelsData;
          appState.value.items
            .filter((i) => i.t3Entry?.type)
            .forEach((item) => {
              item.t3Entry = arg.data.data.find(
                (ii) =>
                  ii.index === item.t3Entry.index &&
                  ii.type === item.t3Entry.type &&
                  ii.pid === item.t3Entry.pid
              );
              refreshObjectActiveValue(item);
            });
        } else if (arg.data.action === "GET_ENTRIES_RES") {
          /* arg.data.data.forEach(item => {
            const itemIndex = T3000_Data.value.panelsData.findIndex(
              (ii) =>
                ii.index === item.index &&
                ii.type === item.type &&
                ii.pid === item.pid
            );
            if (itemIndex !== -1) {
              T3000_Data.value.panelsData.splice(itemIndex, 1)
              T3000_Data.value.panelsData.push(item)
            }
          })
          T3000_Data.value.panelsData = T3000_Data.value.panelsData.filter(
            (item) => item.pid !== arg.data.panel_id
          );
          T3000_Data.value.panelsData = T3000_Data.value.panelsData.concat(
            arg.data.data
          );
          selectPanelOptions.value = T3000_Data.value.panelsData;
          appState.value.items
            .filter((i) => i.t3Entry?.type)
            .forEach((item) => {
              console.log("arg.data.data", arg.data.data)
              item.t3Entry = arg.data.data.find(
                (ii) =>
                  ii.index === item.t3Entry.index &&
                  ii.type === item.t3Entry.type &&
                  ii.pid === item.t3Entry.pid
              );
              refreshObjectActiveValue(item);
            }); */
        } else if (arg.data.action === "SAVE_GRAPHIC_DATA_RES") {
          if (arg.data.data?.status === true) {
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
        }
      }
    });

    function refreshMovable() {
      const lines = document.querySelectorAll(".movable-item");
      Array.from(lines).forEach(function (el) {
        appState.value.elementGuidelines.push(el);
      });
    }

    function addActionToHistory(title) {
      console.log(title);
      // save();
      redoHistory.value = [];
      undoHistory.value.unshift({
        title,
        state: cloneDeep(appState.value),
      });

      if (undoHistory.value.length > 20) {
        undoHistory.value.pop();
      }
    }

    function onClickGroup(e) {
      selecto.value.clickTarget(e.inputEvent, e.inputTarget);
    }

    function onDragStart(e) {
      addActionToHistory("Move Object");
    }
    function onDrag(e) {
      const item = appState.value.items.find(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      // item.translate = e.beforeTranslate;
      e.target.style.transform = e.transform;
    }

    function onDragEnd(e) {
      if (!e.lastEvent) {
        undoHistory.value.shift();
      } else {
        const item = appState.value.items.find(
          (item) => `movable-item-${item.id}` === e.target.id
        );
        item.translate = e.lastEvent.beforeTranslate;
      }
    }

    function onDragGroupStart(e) {
      addActionToHistory("Move Group");
      e.events.forEach((ev, i) => {
        const itemIndex = appState.value.items.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        ev.set(appState.value.items[itemIndex].translate);
      });
    }
    function onDragGroup(e) {
      e.events.forEach((ev, i) => {
        const itemIndex = appState.value.items.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        appState.value.items[itemIndex].translate = ev.beforeTranslate;
      });
    }
    function onDragGroupEnd(e) {
      if (!e.lastEvent) {
        undoHistory.value.shift();
      }
    }
    function onSelectoDragStart(e) {
      const target = e.inputEvent.target;
      if (
        movable.value.isMoveableElement(target) ||
        appState.value.selectedTargets.some(
          (t) => t === target || t.contains(target)
        )
      ) {
        e.stop();
      }
    }
    function onSelectoSelectEnd(e) {
      appState.value.selectedTargets = e.selected;
      if (appState.value.selectedTargets.length === 1) {
        appState.value.activeItemIndex = appState.value.items.findIndex(
          (item) =>
            `movable-item-${item.id}` === appState.value.selectedTargets[0].id
        );
      } else {
        appState.value.activeItemIndex = null;
      }

      if (e.isDragStart) {
        e.inputEvent.preventDefault();

        setTimeout(() => {
          movable.value.dragStart(e.inputEvent);
        });
      }
    }

    function onResizeStart(e) {
      addActionToHistory("Resize object");
      const itemIndex = appState.value.items.findIndex(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      e.setOrigin(["%", "%"]);
      e.dragStart && e.dragStart.set(appState.value.items[itemIndex].translate);
    }

    function onResize(e) {
      // appState.value.items[itemIndex].width = e.width
      // appState.value.items[itemIndex].height = e.height
      // appState.value.items[itemIndex].translate = e.drag.beforeTranslate;
      const item = appState.value.items.find(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      e.target.style.width = `${e.width}px`;
      e.target.style.height = `${e.height}px`;
      e.target.style.transform = `translate(${e.drag.beforeTranslate[0]}px, ${e.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY})`;
    }
    function onResizeEnd(e) {
      const itemIndex = appState.value.items.findIndex(
        (item) => `movable-item-${item.id}` === e.lastEvent.target.id
      );
      appState.value.items[itemIndex].width = e.lastEvent.width;
      appState.value.items[itemIndex].height = e.lastEvent.height;
      appState.value.items[itemIndex].translate =
        e.lastEvent.drag.beforeTranslate;
    }
    function onRotateStart(e) {
      addActionToHistory("Rotate object");
    }
    function onRotate(e) {
      // e.target.style.transform = e.drag.transform;
      const item = appState.value.items.find(
        (item) => `movable-item-${item.id}` === e.target.id
      );
      item.rotate = e.rotate;
    }

    function onResizeGroupStart(e) {
      e.events.forEach((ev, i) => {
        ev.dragStart && ev.dragStart.set(appState.value.items[i].translate);
      });
    }
    function onResizeGroup(e) {
      e.events.forEach((ev, i) => {
        const item = appState.value.items.find(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        ev.target.style.width = `${ev.width}px`;
        ev.target.style.height = `${ev.height}px`;
        ev.target.style.transform = `translate(${ev.drag.beforeTranslate[0]}px, ${ev.drag.beforeTranslate[1]}px) rotate(${item.rotate}deg) scaleX(${item.scaleX}) scaleY(${item.scaleY}) `;
      });
    }
    function onResizeGroupEnd(e) {
      e.events.forEach((ev) => {
        const itemIndex = appState.value.items.findIndex(
          (item) => `movable-item-${item.id}` === ev.lastEvent.target.id
        );
        appState.value.items[itemIndex].width = ev.lastEvent.width;
        appState.value.items[itemIndex].height = ev.lastEvent.height;
        appState.value.items[itemIndex].translate =
          ev.lastEvent.drag.beforeTranslate;
      });
    }

    function onRotateGroupStart(e) {
      addActionToHistory("Rotate Group");
      e.events.forEach((ev) => {
        const itemIndex = appState.value.items.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        ev.set(appState.value.items[itemIndex].rotate);
        ev.dragStart &&
          ev.dragStart.set(appState.value.items[itemIndex].translate);
      });
    }
    function onRotateGroup(e) {
      e.events.forEach((ev, i) => {
        const itemIndex = appState.value.items.findIndex(
          (item) => `movable-item-${item.id}` === ev.target.id
        );
        appState.value.items[itemIndex].translate = ev.drag.beforeTranslate;
        appState.value.items[itemIndex].rotate = ev.rotate;
      });
    }

    function addObject(item) {
      addActionToHistory(`Add ${item.type}`);
      appState.value.itemsCount++;
      item.id = appState.value.itemsCount;
      appState.value.items.push(item);
      const lines = document.querySelectorAll(".movable-item");
      appState.value.elementGuidelines = [];
      Array.from(lines).forEach(function (el) {
        appState.value.elementGuidelines.push(el);
      });
      return item;
    }

    const viewportMargins = {
      top: 36,
      left: 0,
    };

    function onSelectoDragEnd(e) {
      if (
        selectedTool.value.name === "Pointer" ||
        e.rect.width < 20 ||
        e.rect.height < 20
      )
        return;
      const scalPercentage = 1 / appState.value.viewportTransform.scale;
      const item = addObject({
        title: null,
        active: false,
        type: selectedTool.value.name,
        svg: selectedTool.value.svg,
        translate: [
          (e.rect.left -
            viewportMargins.left -
            appState.value.viewportTransform.x) *
          scalPercentage,
          (e.rect.top -
            viewportMargins.top -
            appState.value.viewportTransform.y) *
          scalPercentage,
        ],
        width: e.rect.width * scalPercentage,
        height: e.rect.height * scalPercentage,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        settings:
          tools.find((tool) => tool.name === selectedTool.value.name)?.settings ||
          {},
        zindex: 1,
        t3Entry: null,
      });
      // selectedTool.value.name = "Pointer"
      setTimeout(() => {
        appState.value.activeItemIndex = appState.value.items.findIndex(
          (i) => i.id === item.id
        );
      }, 10);
      setTimeout(() => {
        const target = document.querySelector(`#movable-item-${item.id}`);
        appState.value.selectedTargets = [target];
      }, 100);
    }

    function selectTool(name, type = "default", svg = null) {
      selectedTool.value.name = name;
      selectedTool.value.type = type;
      selectedTool.value.svg = svg;
    }

    function refreshSelecto() {
      const targetsCache = cloneDeep(appState.value.selectedTargets);
      appState.value.selectedTargets = [];
      setTimeout(() => {
        appState.value.selectedTargets = targetsCache;
      }, 10);
    }

    function rotate90(item, minues = false) {
      console.log("item", item);
      if (!item) return;
      addActionToHistory("Rotate object");
      if (!minues) {
        item.rotate = item.rotate + 90;
      } else {
        item.rotate = item.rotate - 90;
      }
      refreshSelecto();
    }
    function flipH(item) {
      addActionToHistory("Flip object H");
      if (item.scaleX === 1) {
        item.scaleX = -1;
      } else {
        item.scaleX = 1;
      }
      refreshSelecto();
    }
    function flipV(item) {
      addActionToHistory("Flip object V");
      if (item.scaleY === 1) {
        item.scaleY = -1;
      } else {
        item.scaleY = 1;
      }
      refreshSelecto();
    }

    function bringToFront(item) {
      addActionToHistory("Bring object to front");
      item.zindex = item.zindex + 1;
    }
    function sendToBack(item) {
      addActionToHistory("Send object to back");
      item.zindex = item.zindex - 1;
    }

    function removeObject(item) {
      addActionToHistory("Remove object");
      const index = appState.value.items.findIndex((i) => i.id === item.id);
      appState.value.activeItemIndex = null;
      appState.value.items.splice(index, 1);

      appState.value.selectedTargets = [];
    }
    function duplicateObject(i) {
      appState.value.activeItemIndex = null;
      const dubItem = cloneDeep(i);
      dubItem.translate[0] = dubItem.translate[0] + 10;
      dubItem.translate[1] = dubItem.translate[1] + 10;
      const item = addObject(dubItem);
      appState.value.selectedTargets = [];
      setTimeout(() => {
        const target = document.querySelector(`#movable-item-${item.id}`);
        appState.value.selectedTargets = [target];
        appState.value.activeItemIndex = appState.value.items.findIndex(
          (i) => i.id === item.id
        );
      }, 10);
    }

    function selectByRightClick(e) {
      selecto.value.clickTarget(e);
    }

    function T3UpdateEntryField(key, obj) {
      if (!obj.t3Entry) return;
      let fieldVal = obj.t3Entry[key];
      if (key === "value" || key === "control") {
        refreshObjectActiveValue(obj);
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

    function selectoDragCondition(e) {
      return !e.inputEvent.altKey;
    }

    function linkT3EntrySave() {
      addActionToHistory("Link object to T3000 entry");
      if (!appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField) {
        appState.value.items[appState.value.activeItemIndex].settings.t3EntryDisplayField = "label"
      }
      appState.value.items[appState.value.activeItemIndex].t3Entry = cloneDeep(
        toRaw(linkT3EntryDialog.value.data)
      );
      refreshObjectActiveValue(
        appState.value.items[appState.value.activeItemIndex]
      );
      linkT3EntryDialog.value.data = null;
      linkT3EntryDialog.value.active = false;
    }

    function refreshObjectActiveValue(item) {
      // addActionToHistory("Update linked entry value");
      if (item.settings?.active !== undefined) {
        if (!item.t3Entry) return;
        if (
          item.t3Entry.type === "OUTPUT" &&
          item.t3Entry.hw_switch_status !== 1
        ) {
          item.settings.active = !!item.t3Entry.hw_switch_status;
        } else if (item.t3Entry.range) {
          const range = ranges.find((i) => i.id === item.t3Entry.range);
          if (range) {
            item.settings.active =
              (item.t3Entry?.digital_analog === 0 &&
                ((item.t3Entry?.control === 1 && !range.directInvers) ||
                  (item.t3Entry?.control === 0 && range.directInvers))) ||
                (item.t3Entry?.digital_analog === 1 && item.t3Entry?.value > 0)
                ? true
                : false;
          }
        } else if (item.t3Entry.type === "PROGRAM") {
          item.settings.active = !!item.t3Entry.status;
        } else if (item.t3Entry.type === "SCHEDULE") {
          item.settings.active = !!item.t3Entry.output;
        } else if (item.t3Entry.type === "HOLIDAY") {
          item.settings.active = !!item.t3Entry.value;
        }
      }
    }

    function save() {
      const content = cloneDeep(toRaw(appState.value))
      content.selectedTargets = []
      content.elementGuidelines = []
      window.chrome?.webview?.postMessage({
        action: 2, // SAVE_GRAPHIC
        data: content,
      });
    }

    function newProject() {
      if (appState.value.items?.length > 0) {
        $q.dialog({
          dark: true,
          title: "Do you want to clear the drawing?",
          message: "This will also erase your undo history",
          cancel: true,
          persistent: true,
        })
          .onOk(() => {
            appState.value = cloneDeep(emptyProject);
            undoHistory.value = [];
            redoHistory.value = [];
            refreshSelecto();
          })
          .onCancel(() => { });
        return;
      }
      appState.value = cloneDeep(emptyProject);
      undoHistory.value = [];
      redoHistory.value = [];
      refreshSelecto();
    }

    keycon.keydown((e) => {
      if (appState.value.selectedTargets.length < 1) return;

      if (["up", "down", "left", "right"].includes(e.key)) {
        addActionToHistory("Move object");
      }
      if (e.key === "up") {
        movable.value.request("draggable", { deltaX: 0, deltaY: -5 }, true);
      } else if (e.key === "down") {
        movable.value.request("draggable", { deltaX: 0, deltaY: 5 }, true);
      } else if (e.key === "left") {
        movable.value.request("draggable", { deltaX: -5, deltaY: 0 }, true);
      } else if (e.key === "right") {
        movable.value.request("draggable", { deltaX: 5, deltaY: 0 }, true);
      } else if (e.key === "delete") {
        deleteSelected();
      }
      if (["up", "down", "left", "right"].includes(e.key)) {
        refreshSelecto();
      }
    });

    keycon.keydown(["ctrl", "s"], (e) => {
      e.inputEvent.preventDefault();
      save();
    });

    keycon.keydown(["ctrl", "z"], (e) => {
      e.inputEvent.preventDefault();
      undoAction();
    });
    keycon.keydown(["ctrl", "y"], (e) => {
      e.inputEvent.preventDefault();
      redoAction();
    });

    keycon.keydown(["ctrl", "r"], (e) => {
      e.inputEvent.preventDefault();
      newProject();
    });

    function linkT3EntryDialogAction() {
      linkT3EntryDialog.value.active = true;
      if (!appState.value.items[appState.value.activeItemIndex]?.t3Entry)
        return;
      linkT3EntryDialog.value.data = cloneDeep(
        appState.value.items[appState.value.activeItemIndex]?.t3Entry
      );
    }

    function getRangeById(id) {
      return ranges.find((i) => i.id === id);
    }

    function deleteSelected() {
      addActionToHistory("Remove selected objects");
      if (appState.value.selectedTargets.length > 0) {
        appState.value.selectedTargets.forEach((el) => {
          const iIndex = appState.value.items.findIndex(
            (item) => `movable-item-${item.id}` === el.id
          );
          if (iIndex !== -1) {
            appState.value.items.splice(iIndex, 1);
          }
        });
        appState.value.selectedTargets = [];
        appState.value.activeItemIndex = null;
      }
    }

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
            item.description.toUpperCase().indexOf(keyword) > -1 ||
            item.label.toUpperCase().indexOf(keyword) > -1
        );
      });
    }
    function undoAction() {
      if (undoHistory.value.length < 1) return;
      redoHistory.value.unshift({
        title: lastAction,
        state: cloneDeep(appState.value),
      });
      appState.value = cloneDeep(undoHistory.value[0].state);
      undoHistory.value.shift();
      refreshSelecto();
    }

    function redoAction() {
      if (redoHistory.value.length < 1) return;
      undoHistory.value.unshift({
        title: lastAction,
        state: cloneDeep(appState.value),
      });
      appState.value = cloneDeep(redoHistory.value[0].state);
      redoHistory.value.shift();
      refreshSelecto();
    }

    function handleFileUploaded(data) {
      console.log("handleFileUploaded", data);
    }

    async function customObjectFileAdded(file) {
      uploadObjectDialog.value.uploadBtnDisabled = false;
      const blob = await file.data.text();
      uploadObjectDialog.value.svg = blob;
    }

    function saveCustomObject() {
      uploadObjectDialog.value.addedCount++;
      uploadObjectDialog.value.active = false;
      uploadObjectDialog.value.uploadBtnDisabled = true;
      customTools.value.push({
        name: "Custom-" + uploadObjectDialog.value.addedCount,
        label: "Custom Element",
        svg: cloneDeep(uploadObjectDialog.value.svg),
      });
      uploadObjectDialog.value.svg = null;
    }

    const gaugeSettingsDialog = ref({ active: false, data: { settings: tools.find((tool) => tool.name === 'Gauge')?.settings } });

    function gaugeSettingsDialogAction(item) {
      gaugeSettingsDialog.value.active = true;
      gaugeSettingsDialog.value.data = item;
    }

    function gaugeSettingsSave(item) {
      const itemIndex = appState.value.items.findIndex((i) => i.id === item.id);
      appState.value.items[itemIndex] = item;
      gaugeSettingsDialog.value.active = false;
      gaugeSettingsDialog.value.data = {};
    }

    const t3EntryDisplayFieldOptions = computed(() => {
      return [
        { label: "None", value: "none" },
        {
          label: "Value",
          value:
            appState.value.items[appState.value.activeItemIndex].t3Entry
              ?.digital_analog === 1
              ? "value"
              : "control",
        },
        { label: "Label", value: "label" },
        { label: "Description", value: "description" },
      ];
    });

    function importJsonAction() {
      importJsonDialog.value.active = true;
    }

    function exportToJsonAction() {
      const content = cloneDeep(toRaw(appState.value))
      content.selectedTargets = []
      content.elementGuidelines = []

      const a = document.createElement("a");
      const file = new Blob([JSON.stringify(content)], { type: "application/json" });
      a.href = URL.createObjectURL(file);
      a.download = "HVAC_Drawer_Project.json";
      a.click();
    }

    function getLinkedEntries() {
      const items = appState.value.items
      if (items.length === 0) return [];
      return toRaw(appState.value).items.filter(i => i.t3Entry);
    }

    async function importJsonFileAdded(file) {
      const blob = await file.data.text();
      importJsonDialog.value.json = blob;
      executeImportFromJson()

    }

    function executeImportFromJson() {
      const importedState = JSON.parse(importJsonDialog.value.json)
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
        return
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
            appState.value = importedState
            importJsonDialog.value.json = null;
            setTimeout(() => {
              refreshMovable()

            }, 100);
            refreshSelecto();
          })
          .onCancel(() => { importJsonDialog.value.active = false; });
        return;
      }
      undoHistory.value = [];
      redoHistory.value = [];
      importJsonDialog.value.active = false;
      appState.value = importedState
      importJsonDialog.value.json = null;
      setTimeout(() => {
        refreshMovable()

      }, 100);
      refreshSelecto();
    }

    const zoom = computed({
      get() {
        return parseInt(appState.value.viewportTransform.scale * 100)
      },
      // setter
      set(newValue) {
        if (!newValue) return
        appState.value.viewportTransform.scale = newValue / 100
        panzoomInstance.smoothZoomAbs(appState.value.viewportTransform.x, appState.value.viewportTransform.y, newValue / 100)
      }

    });

    function changeZoomValue(ev) {
      const newValue = parseInt(ev.target.value)
      if (!newValue) return
      appState.value.viewportTransform.scale = newValue / 100
      panzoomInstance.smoothZoomAbs(appState.value.viewportTransform.x, appState.value.viewportTransform.y, newValue / 100)
    }

    return {
      movable,
      selecto,
      appState,
      addObject,
      viewport,
      onClickGroup,
      onDragStart,
      onDrag,
      onDragEnd,
      onDragGroup,
      onSelectoDragStart,
      onDragGroupStart,
      onDragGroupEnd,
      onSelectoSelectEnd,
      targets,
      onResize,
      onResizeEnd,
      onRotateStart,
      onRotate,
      onResizeGroupStart,
      onResizeGroup,
      onRotateGroupStart,
      onResizeGroupEnd,
      onRotateGroup,
      onResizeStart,
      onSelectoDragEnd,
      selectTool,
      tools,
      selectedTool,
      rotate90,
      flipH,
      flipV,
      bringToFront,
      sendToBack,
      removeObject,
      selectByRightClick,
      T3UpdateEntryField,
      selectoDragCondition,
      duplicateObject,
      linkT3EntrySave,
      newProject,
      save,
      refreshSelecto,
      linkT3EntryDialog,
      linkT3EntryDialogAction,
      T3000_Data,
      selectPanelOptions,
      getRangeById,
      selectPanelFilterFn,
      undoHistory,
      redoHistory,
      undoAction,
      redoAction,
      deleteSelected,
      uploadObjectDialog,
      handleFileUploaded,
      customObjectFileAdded,
      saveCustomObject,
      customTools,
      gaugeSettingsDialogAction,
      gaugeSettingsDialog,
      gaugeSettingsSave,
      t3EntryDisplayFieldOptions,
      importJsonDialog,
      importJsonAction,
      importJsonFileAdded,
      executeImportFromJson,
      exportToJsonAction,
      zoom,
      changeZoomValue
    };
  },
});
</script>
<style>
.tools,
.item-config {
  background-color: #2a2a2a;
  padding: 10px 0;
  align-self: stretch;
  overflow-y: hidden;
  max-height: 100vh;
}

.tools {
  margin-top: 34px;
  position: absolute;
  height: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 34px);
  scrollbar-width: thin;
  z-index: 1;
}

.item-config {
  width: 250px;
  padding: 10px;
  padding-top: 34px;
  position: absolute;
  right: 0;
  top: 36px;
  height: calc(100% - 36px);
}

.item-config-inner {
  overflow-y: auto;
  max-height: calc(100vh - 45px);
  scrollbar-width: thin;
}

.item-config-inner::-webkit-scrollbar,
.tools::-webkit-scrollbar {
  display: none;
}

.toolbar {
  background-color: #2a2a2a;
  padding-left: 55px;
}

.q-toolbar {
  min-height: 35px;
}

.box {
  background-color: #075d85;
  color: white;
  padding: 20px;
  width: 100%;
  height: 100%;
}

.viewport-wrapper {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: absolute;
  top: 0;
}

.viewport {
  width: 100%;
  height: calc(100vh - 36px);
  overflow: hidden;
  position: relative;
  background-image: repeating-linear-gradient(#ccc 0 1px, transparent 1px 100%),
    repeating-linear-gradient(90deg, #ccc 0 1px, transparent 1px 100%);
  background-size: 71px 71px;
}

.viewport .selected {
  color: #fff;
  background: #333;
}

.active-tool {
  color: white;
  background: #353c44;
}

#movable-item {
  position: relative;
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

.menu-dropdown {
  max-width: 300px !important;
}

.movable-item-wrapper {
  position: relative;
}

.zoom-input {
  background: transparent;
  width: 27px;
  -moz-appearance: textfield;
}

.zoom-input::-webkit-outer-spin-button,
.zoom-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
