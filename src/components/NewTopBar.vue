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
  /* background-color: lightgreen; */
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
  height: 55px;
  width: 105px;
  color: #fff;
  /* background-color: aqua; */
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
</style>

<template>
  <div class="tool-bar-container">
    <div class="left-panel">
      <div class="tool-title">
        <span>T3000 Havc</span>
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
        <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="left"
          narrow-indicator>
          <q-tab name="home" no-caps label="Home" />
          <q-tab name="file" no-caps label="File" />
          <!-- <q-tab name="edit" label="Edit" />
            <q-tab name="object" label="Object" /> -->
          <div style="margin-left: auto;"><q-btn flat color="primary" label="Login" to="/login" /></div>
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="tab">
          <q-tab-panel name="home" class="home-panel">
            <div class="container">
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="content_copy" no-caps> Copy</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="content_paste" no-caps>Paste</q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="undo" no-caps>Undo</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="redo" no-caps>Redo</q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="delete" no-caps>Delete</q-btn>
                </div>
              </div>
              <q-separator black vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="join_full" no-caps>Group</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="join_inner" no-caps>UnGroup</q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="library_books" no-caps>Add to library</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="file_copy" no-caps>Duplicate</q-btn>
                </div>
              </div>
              <q-separator black vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="splitscreen" no-caps>Weld</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="splitscreen" no-caps>UnWeld</q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="link" no-caps>Link</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="transform" no-caps>Convert to</q-btn>
                </div>
              </div>
              <q-separator black vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="autorenew" no-caps>Rotate 90</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="sync" no-caps>Rotate -90</q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip" no-caps>Flip horizontal</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip" no-caps>Flip vertical</q-btn>
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip_to_front" no-caps>Bring to front</q-btn>
                </div>
                <div class="button-row">
                  <q-btn flat size="sm" icon="flip_to_back" no-caps>Send to back</q-btn>
                </div>
              </div>
              <q-separator black vertical />
            </div>
          </q-tab-panel>
          <q-tab-panel name="file" class="file-panel">
            <div class="container">
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="assignment" no-caps label="New Project" />
                  <span class="short-cut">Ctrl + R</span>
                </div>
              </div>
              <q-separator black vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="file_open" no-caps label="Import" />
                </div>
              </div>
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="file_open" no-caps label="Export" />
                </div>
              </div>
              <q-separator black vertical />
              <div class="sub-div">
                <div class="button-row">
                  <q-btn flat size="sm" icon="save" no-caps label="Save" />
                  <span class="short-cut">Ctrl + S</span>
                </div>
              </div>
              <q-separator black vertical />
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'NewTopBar',
  props: {
    locked: {
      type: Boolean,
      default: false
    },
    grpNav: {
      type: Array,
      default: () => []
    }
  },
  emits: ["navGoBack", "lockToggle"],
  setup(props, { emit }) {

    const navGoBack = () => {
      // Emit event to parent to navigate back
      emit('navGoBack');
    };

    const lockToggle = () => {
      // Emit event to parent to toggle lock
      emit('lockToggle');
    };

    return {
      tab: ref('home'),
      navGoBack,
      lockToggle
    };
  },
});
</script>
