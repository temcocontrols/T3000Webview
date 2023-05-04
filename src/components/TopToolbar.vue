<template>
  <q-toolbar class="toolbar text-white shadow-2">
    <!-- File menu -->
    <q-btn-dropdown
      no-caps
      stretch
      flat
      content-class="menu-dropdown"
      label="File"
    >
      <q-list>
        <q-item clickable v-close-popup @click="menuActionEmit('newProject')">
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="assignment"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>New Project</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + R</q-chip>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="menuActionEmit('importJsonAction')"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="file_open"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Import</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="menuActionEmit('exportToJsonAction')"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="file_open"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Export</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="menuActionEmit('save')">
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
    <q-btn-dropdown
      no-caps
      stretch
      flat
      content-class="menu-dropdown"
      label="Edit"
    >
      <q-list>
        <q-item dense clickable v-close-popup @click="menuActionEmit('copy')">
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="content_copy"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Copy</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + C</q-chip>
          </q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('paste')"
          :disable="disablePaste"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="content_paste"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Paste</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + V</q-chip>
          </q-item-section>
        </q-item>
        <q-separator inset spaced />
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('undoAction')"
          :disable="disableUndo"
        >
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
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('redoAction')"
          :disable="disableRedo"
        >
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
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('duplicateSelected')"
          :disable="selectedCount < 1"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="content_copy"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Duplicate selected</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + D</q-chip>
          </q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('groupSelected')"
          :disable="selectedCount < 2"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="join_full"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Group selected</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + G</q-chip>
          </q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('ungroupSelected')"
          :disable="selectedCount < 2"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="join_inner"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Ungroup selected</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + Shift + G</q-chip>
          </q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('addToLibrary')"
          :disable="selectedCount < 2"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="library_books"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Add selected to library</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Ctrl + L</q-chip>
          </q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('deleteSelected')"
          :disable="selectedCount < 1"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="delete"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Delete selected</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip>Delete</q-chip>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <!-- Object menu -->
    <q-btn-dropdown
      no-caps
      stretch
      flat
      content-class="menu-dropdown"
      label="Object"
      :disable="!selectedCount || selectedCount > 1"
    >
      <q-list>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('duplicateObject')"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="file_copy"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>Duplicate</q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('rotate90')"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="autorenew"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>Rotate 90°</q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('rotate-90')"
        >
          <q-item-section avatar>
            <q-avatar size="sm" icon="sync" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>Rotate -90°</q-item-section>
        </q-item>
        <q-separator />
        <q-item dense clickable v-close-popup @click="menuActionEmit('flipH')">
          <q-item-section avatar>
            <q-avatar size="sm" icon="flip" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>Flip horizontal</q-item-section>
        </q-item>
        <q-item dense clickable v-close-popup @click="menuActionEmit('flipV')">
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="flip"
              color="grey-7"
              text-color="white"
              style="transform: rotate(90deg)"
            />
          </q-item-section>
          <q-item-section>Flip vertical</q-item-section>
        </q-item>
        <q-separator />
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('bringToFront')"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="flip_to_front"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>Bring to front</q-item-section>
        </q-item>
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('sendToBack')"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="flip_to_back"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>Send to Back</q-item-section>
        </q-item>
        <q-separator />
        <q-item
          dense
          clickable
          v-close-popup
          @click="menuActionEmit('removeObject')"
        >
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="remove"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>Remove</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <q-space />
    <div class="flex">
      <q-btn
        @click="menuActionEmit('zoomOut')"
        :disable="zoom <= 10"
        dense
        flat
        size="sm"
        icon="zoom_out"
      />
      <div class="px-1">
        <input
          class="zoom-input"
          @keydown.enter="menuActionEmit('zoomSet', $event.target.value)"
          :value="zoom"
          type="number"
        />%
      </div>
      <q-btn
        @click="menuActionEmit('zoomIn')"
        :disable="zoom >= 400"
        dense
        flat
        size="sm"
        icon="zoom_in"
      />
    </div>
  </q-toolbar>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "TopToolbar",
  emits: ["menuAction"],
  props: {
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
  },
  setup(props, { emit }) {
    function menuActionEmit(action, val = null) {
      emit("menuAction", action, val);
    }

    return {
      menuActionEmit,
    };
  },
});
</script>

<style scoped>
.toolbar {
  background-color: #2a2a2a;
  padding-left: 55px;
}

.q-toolbar {
  min-height: 35px;
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
