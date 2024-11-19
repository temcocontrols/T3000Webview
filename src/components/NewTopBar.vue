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
  background-color: lightgreen;
}

.tool-title {
  width: 105px;
  height: 38px;
  padding-left: 10px;
  padding-top: 10px;
  color: #fff;
  background: red;
}

.tool-btns {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  height: 55px;
  width: 105px;
  color: #fff;
  background-color: aqua;
}

.home-panel {
  .container {
    display: flex;
    /* flex-wrap: wrap; */
    gap: 10px;
  }

  .sub-div {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid #ccc;
    padding: 10px;
  }

  .button-row {
    display: flex;
    gap: 5px;
  }
}

.file-panel {
  .container {
    display: flex;
    /* flex-wrap: wrap; */
    gap: 10px;
  }

  .sub-div {
    display: flex;
    flex-direction: row;
    gap: 10px;
    border: 1px solid #ccc;
    padding: 10px;
  }

  .button-row {
    display: flex;
    gap: 5px;
  }
}

.right-panel-card {
  box-shadow: none;
  border: 1px solid #ccc;
}

.home-panel {
  padding: 0px;
}

.file-panel {
  padding: 0px;
}
</style>

<template>

  <div class="tool-bar-container">
    <div class="left-panel">
      <div class="tool-title">
        <span>T3000 Havc</span>
      </div>
      <div class="tool-btns">
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />
        <q-btn dense flat round icon="lock" @click="toggleLeftDrawer" />
      </div>
    </div>
    <div class="right-panel">
      <div class="q-gutter-y-xs">
        <q-card class="right-panel-card">
          <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="left"
            narrow-indicator>
            <q-tab name="home" label="Home" />
            <q-tab name="file" label="File" />
          </q-tabs>
          <q-separator />
          <q-tab-panels v-model="tab">
            <q-tab-panel name="home" class="home-panel">
              <div class="container">
                <div class="sub-div">
                  <div class="button-row">
                    <button>Copy</button>
                  </div>
                  <div class="button-row">
                    <button>Paste</button>
                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <button>Undo</button>
                    <button>Delete</button>

                  </div>
                  <div class="button-row">
                    <button>Redo</button>

                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <button>Group</button>
                    <button>Add selected to library</button>
                  </div>
                  <div class="button-row">
                    <button>UnGroup</button>
                    <button>Duplicate</button>

                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <button>Weld</button>
                  </div>
                  <div class="button-row">
                    <button>UnWeld</button>
                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <button>Link</button>
                  </div>
                  <div class="button-row">
                    <button>Convert to</button>
                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <button>Rotate 90</button>
                    <button>Flip horizontal</button>
                    <button>Bring to front</button>
                  </div>
                  <div class="button-row">
                    <button>Rotate -90</button>
                    <button>Flip vertical</button>
                    <button>Send to back</button>
                  </div>
                </div>
              </div>
            </q-tab-panel>
            <q-tab-panel name="file" class="file-panel">
              <div class="container">
                <div class="sub-div">
                  <div class="button-row">
                    <q-btn flat size="sm" icon="mail" label="New Project" />
                    <span>Ctrl + R</span>
                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <q-btn flat size="sm" icon="mail" label="Import" />
                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <q-btn flat size="sm" icon="mail" label="Export" />
                  </div>
                </div>
                <div class="sub-div">
                  <div class="button-row">
                    <q-btn flat size="sm" icon="mail" label="Save" />
                    <span>Ctrl + S</span>
                  </div>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
  </div>










</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'NewTopBar',
  setup() {
    const leftDrawerOpen = ref(false)
    const rightDrawerOpen = ref(false)

    return {
      tab: ref('home'),
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },

      rightDrawerOpen,
      toggleRightDrawer() {
        rightDrawerOpen.value = !rightDrawerOpen.value
      }
    };
  },
});
</script>
