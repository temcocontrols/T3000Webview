<!--
  The `TopToolbar` component is a toolbar that appears at the top of the HVAC drawer. It contains various actions that can be performed on the current selection of objects.

  - The `FileMenu` section contains actions related to the current file, such as saving, exporting, and logging out.
    - The `save` method saves the current file.
    - The `export` method exports the current file in a specific format.
    - The `logout` method logs the user out of the application.
  - The `EditMenu` section contains actions related to the current selection of objects, such as copying, pasting, and undoing actions.
    - The `copy` method copies the current selection of objects to the clipboard.
    - The `paste` method pastes the contents of the clipboard onto the current selection of objects.
    - The `undo` method undoes the last action performed on the current selection of objects.
  - The `ObjectMenu` section contains actions related to the current selection of objects, such as grouping, ungrouping, and deleting objects.
    - The `group` method groups the current selection of objects into a single object.
    - The `ungroup` method ungroups the current selection of objects into individual objects.
    - The `delete` method deletes the current selection of objects.
  - The `ViewMenu` section contains actions related to the view mode of the application, such as switching between dark and light mode.
    - The `toggleDarkMode` method toggles the view mode of the application between dark and light mode.
    - The `toggleFullScreen` method toggles the full screen mode of the application.

-->
<template>
  <q-toolbar class="toolbar text-white shadow-2">
    <!-- File menu -->
    <q-btn-dropdown
      no-caps
      stretch
      flat
      content-class="menu-dropdown"
      class="file-menu"
      label="File"
    >
      <q-list>
        <q-item
          clickable
          v-close-popup
          class="new-project-menu-item"
          @click="menuActionEmit('newProject')"
        >
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
        <q-item dense clickable v-close-popup @click="menuActionEmit('link')">
          <q-item-section avatar>
            <q-avatar size="sm" icon="link" color="grey-7" text-color="white" />
          </q-item-section>
          <q-item-section>Link</q-item-section>
        </q-item>
        <q-separator />
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
        <q-item dense clickable>
          <q-item-section avatar>
            <q-avatar
              size="sm"
              icon="transform"
              color="grey-7"
              text-color="white"
            />
          </q-item-section>
          <q-item-section>Convert to</q-item-section>
          <q-item-section side>
            <q-icon name="keyboard_arrow_right" />
          </q-item-section>
          <q-menu anchor="top end" self="top start" auto-close>
            <q-list>
              <q-item
                v-for="t in tools.filter(
                  (i) =>
                    i.name !== object.type &&
                    !['Duct', 'Pointer', 'Text'].includes(i.name)
                )"
                :key="t.name"
                dense
                clickable
                v-close-popup
                @click="menuActionEmit('convertObjectType', t.name)"
              >
                <q-item-section avatar>
                  <q-avatar
                    size="sm"
                    :icon="t.icon"
                    color="grey-7"
                    text-color="white"
                  />
                </q-item-section>
                <q-item-section>{{ t.name }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
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
      <div class="flex items-center px-1">
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
      <div>
        <q-btn v-if="!user" flat color="primary" label="Login" to="/login" />
        <q-btn-dropdown
          v-else
          no-caps
          flat
          dense
          content-class="menu-dropdown"
          :label="user.name"
          class="px-2 ml-4"
        >
          <q-list>
            <q-item dense>
              <q-item-section avatar>
                <q-avatar
                  size="sm"
                  icon="person"
                  color="grey-7"
                  text-color="white"
                />
              </q-item-section>
              <q-item-section class="text-zinc-500">{{
                user.name
              }}</q-item-section>
            </q-item>
            <q-separator />
            <q-item dense clickable v-close-popup @click="logout">
              <q-item-section avatar>
                <q-avatar
                  size="sm"
                  icon="logout"
                  color="grey-7"
                  text-color="white"
                />
              </q-item-section>
              <q-item-section>Logout</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>
  </q-toolbar>
</template>

<script>
import { defineComponent } from "vue";
import { useQuasar } from "quasar";
import { tools, user } from "../lib/common";

export default defineComponent({
  name: "TopToolbar",
  emits: ["menuAction"],
  props: {
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
  },
  setup(props, { emit }) {
    const $q = useQuasar();
    function menuActionEmit(action, val = null) {
      emit("menuAction", action, val);
    }

    function logout() {
      $q.cookies.remove("token");
      user.value = null;
      localStorage.removeItem("user");
    }

    return {
      menuActionEmit,
      logout,
      tools,
      user,
    };
  },
});
</script>

<style scoped>
.toolbar {
  background-color: #2a2a2a;
  padding-left: 105px;
}

.q-toolbar {
  min-height: 35px;
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
</style>
