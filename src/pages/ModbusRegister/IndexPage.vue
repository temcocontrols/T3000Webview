<template>
  <div class="flex flex-col flex-nowrap h-screen overflow-hidden">
    <!-- User top bar with various components -->
    <user-top-bar class="flex-none">
      <!-- Action buttons -->
      <template v-slot:action-btns>
        <q-separator vertical color="white" spaced inset />
        <template v-if="user && isAdmin(user)">
          <!-- Toggle button for live mode -->
          <q-btn-toggle
            v-model="liveMode"
            no-caps
            rounded
            unelevated
            dense
            size="0.8rem"
            toggle-color="white"
            color="blue-6"
            text-color="white"
            toggle-text-color="black"
            padding="2px 10px"
            :options="[
              { label: 'Offline Mode', value: false },
              { label: 'Live Mode', value: true, disable: !isOnline },
            ]"
          />
          <!-- Separator -->
          <q-separator vertical color="white" spaced inset />
          <!-- Toggle button for active tab -->
          <template v-if="liveMode">
            <q-btn-toggle
              v-model="activeTab"
              @update:model-value="reloadData"
              no-caps
              rounded
              unelevated
              dense
              size="0.8rem"
              toggle-color="white"
              color="blue-6"
              text-color="white"
              toggle-text-color="black"
              padding="2px 10px"
              :options="[
                { label: 'All Entries', value: 'all' },
                { label: 'User Pending Changes', value: 'changes' },
              ]"
            />
            <!-- Separator -->
            <q-separator vertical color="white" spaced inset />
          </template>
        </template>
        <!-- Add new row button -->
        <q-btn
          icon="add_circle"
          label="Add New Row"
          @click="addNewRow"
          color="white"
          text-color="grey-8"
          size="0.7rem"
          no-caps
          dense
          padding="3px 5px"
        />
      </template>
      <!-- Search input -->
      <template v-slot:search-input>
        <q-input
          class="toolbar-input mr-2"
          dense
          standout="bg-grey-2 text-black"
          v-model="filter"
          placeholder="Search"
          @update:model-value="triggerFilterChanged()"
        >
          <!-- Search icon -->
          <template #prepend>
            <q-icon v-if="filter === ''" name="search" color="white" />
            <q-icon
              v-else
              name="clear"
              color="white"
              class="cursor-pointer"
              @click="
                () => {
                  filter = '';
                  gridApi.onFilterChanged();
                }
              "
            />
          </template>
        </q-input>
      </template>
      <!-- Buttons -->
      <template v-slot:buttons v-if="user">
        <!-- Notifications button -->
        <q-btn flat round dense icon="notifications" class="ml-4 mr-2">
          <!-- Notifications menu -->
          <q-menu @show="loadNotifications()">
            <q-infinite-scroll @load="loadMoreNotifications" :offset="100">
              <q-list v-if="notifications.length > 0">
                <!-- Notification list -->
                <q-item
                  v-for="notification in notifications"
                  :key="notification.id"
                  clickable
                  class="pt-4 pb-3"
                >
                  <!-- Notification details -->
                  <q-item-section avatar>
                    <q-avatar>
                      <!-- Notification type icon -->
                      <q-icon
                        name="check_circle"
                        size="lg"
                        v-if="notification.type.endsWith('_APPROVED')"
                      />
                      <q-icon
                        name="cancel"
                        size="lg"
                        v-else-if="notification.type.endsWith('_REJECTED')"
                      />
                      <q-icon
                        name="account_circle"
                        size="lg"
                        v-else-if="notification.type.startsWith('ADMIN_')"
                      />
                      <q-icon name="chat" size="lg" v-else />
                      <!-- Unread badge -->
                      <q-badge
                        color="red"
                        rounded
                        floating
                        v-if="notification.status === 'UNREAD'"
                      />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <!-- Notification message -->
                    <q-item-label
                      :class="{
                        'text-gray-400': notification.status !== 'UNREAD',
                      }"
                      >{{ notification.message }}</q-item-label
                    >
                    <!-- Notification timestamp -->
                    <q-item-label caption>{{
                      new Date(notification.createdAt).toLocaleString()
                    }}</q-item-label>
                    <!-- Notification actions -->
                    <div class="flex justify-end mt-1">
                      <!-- Mark as read button -->
                      <q-btn
                        v-if="
                          notification.status === 'UNREAD' &&
                          !notification.type.startsWith('ADMIN_')
                        "
                        flat
                        color="primary"
                        size="0.7rem"
                        label="Mark as read"
                        @click="notificationStatusChange(notification, 'READ')"
                      />
                      <!-- Review button for admin notifications -->
                      <template
                        v-else-if="
                          notification.status === 'UNREAD' &&
                          notification.type.startsWith('ADMIN_')
                        "
                      >
                        <q-btn
                          v-if="
                            [
                              'ADMIN_ENTRY_CHANGED',
                              'ADMIN_ENTRY_ADDED',
                            ].includes(notification.type)
                          "
                          flat
                          size="0.7rem"
                          label="Review"
                          @click="
                            notificationChangesReviewAction(
                              notification.entry,
                              notification.type
                            )
                          "
                        />
                        <q-btn
                          v-else-if="
                            [
                              'ADMIN_DEVICE_ADDED',
                              'ADMIN_DEVICE_CHANGED',
                            ].includes(notification.type)
                          "
                          flat
                          size="0.7rem"
                          label="Review"
                          @click="
                            notificationChangesReviewAction(
                              notification.device,
                              notification.type
                            )
                          "
                        />
                      </template>
                      <!-- Archive button -->
                      <template
                        v-else-if="
                          notification.status !== 'UNREAD' &&
                          notification.type.startsWith('ADMIN_')
                        "
                      >
                        <q-chip
                          v-if="notification.status === 'ADMIN_APPROVED'"
                          dense
                          color="primary"
                          text-color="white"
                          icon="check_circle"
                          size="0.7rem"
                        >
                          Approved
                        </q-chip>
                        <q-chip
                          v-else-if="notification.status === 'ADMIN_REJECTED'"
                          dense
                          color="negative"
                          text-color="white"
                          icon="cancel"
                          size="0.7rem"
                        >
                          Rejected
                        </q-chip>
                        <q-btn
                          flat
                          color="primary"
                          size="0.7rem"
                          label="Archive"
                          @click="
                            notificationStatusChange(notification, 'ARCHIVED')
                          "
                        />
                      </template>
                      <!-- Mark as unread button -->
                      <q-btn
                        v-else-if="notification.status === 'READ'"
                        flat
                        size="0.7rem"
                        label="Mark as unread"
                        @click="
                          notificationStatusChange(notification, 'UNREAD')
                        "
                      />
                    </div>
                  </q-item-section>
                </q-item>
              </q-list>
              <!-- Infinite scroll loading indicator -->
              <div v-else class="p-4 min-w-52">You have no notifications.</div>
              <template v-slot:loading>
                <div class="row justify-center q-my-md">
                  <q-spinner-dots color="primary" size="40px" />
                </div>
              </template>
            </q-infinite-scroll>
          </q-menu>
          <!-- Notification badge -->
          <q-badge
            color="red"
            rounded
            floating
            v-if="notifications.find((n) => n.status === 'UNREAD')"
          />
          <q-tooltip>Notifications</q-tooltip>
        </q-btn>
        <!-- Settings button -->
        <q-btn
          flat
          round
          dense
          icon="settings"
          class="mr-2"
          @click="openSettingsDialog"
        >
          <q-tooltip>Settings</q-tooltip>
        </q-btn>
      </template>
    </user-top-bar>
    <q-page
      class="flex flex-col justify-center p-2 flex-1 overflow-hidden"
      :style-fn="() => {}"
    >
      <div class="flex justify-center mb-2">
        <q-select
          ref="deviceSelectRef"
          class="grow max-w-3xl select-device"
          options-selected-class="bg-gray-300 text-primary"
          v-model="selectedDevice"
          input-debounce="200"
          option-value="id"
          option-label="name"
          fill-input
          use-input
          hide-selected
          filled
          dense
          hide-bottom-space
          popup-content-class="!max-w-min"
          :options="selectDeviceOptions"
          @filter="selectDeviceFilterFn"
          @popup-hide="onSelectDeviceHide"
          @update:model-value="onSelectDeviceUpdate"
        >
          <template #option="opt">
            <q-item v-bind="opt.itemProps" class="flex device-list-item">
              <q-item-section avatar>
                <q-avatar
                  square
                  size="80px"
                  font-size="70px"
                  text-color="cyan-8"
                  icon="image"
                  v-if="!opt.opt.image && opt.label !== 'All Devices'"
                />
                <q-avatar
                  square
                  size="80px"
                  v-else-if="opt.label !== 'All Devices'"
                >
                  <img
                    :src="
                      liveMode
                        ? fileUploadEndpoint +
                          '/' +
                          opt.opt.image.path +
                          '?w=80'
                        : opt.opt.image.path
                    "
                  />
                </q-avatar>
                <q-avatar
                  icon="devices"
                  square
                  size="80px"
                  font-size="70px"
                  v-else
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ opt.label }}</q-item-label>
                <q-item-label caption lines="2">{{
                  opt.opt.description
                }}</q-item-label>
                <q-btn
                  v-if="opt.label !== 'All Devices'"
                  class="device-action-btn hidden absolute right-2.5 top-8"
                  :id="'device-action-btn-' + opt.opt.id"
                  dense
                  flat
                  size="md"
                  round
                  color="primary"
                  icon="more_vert"
                  @click.stop
                >
                  <q-menu
                    @update:model-value="
                      actionMenuToggle('device-action-btn-' + opt.opt.id)
                    "
                  >
                    <q-list style="min-width: 70px">
                      <q-item
                        dense
                        clickable
                        v-close-popup
                        @click="updateDeviceAction(opt.opt)"
                      >
                        <q-item-section avatar>
                          <q-icon name="edit" />
                        </q-item-section>
                        <q-item-section>Edit</q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item
                        clickable
                        v-close-popup
                        dense
                        @click="deleteDeviceAction(opt.opt)"
                      >
                        <q-item-section avatar>
                          <q-icon name="delete" />
                        </q-item-section>
                        <q-item-section>Delete</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
        <div class="flex items-center ml-2">
          <q-btn
            icon="add_circle"
            label="Create New Device"
            @click="createNewDeviceAction"
            color="white"
            text-color="grey-8"
            size="0.7rem"
            no-caps
            dense
          />
        </div>
      </div>
      <div class="flex flex-col flex-1 flex-nowrap">
        <ag-grid-vue
          style="width: 100%; height: 100%"
          class="data-table ag-theme-quartz"
          :columnDefs="modbusRegColumns"
          @grid-ready="onGridReady"
          @firstDataRendered="onFirstDataRendered"
          @cell-value-changed="updateRow"
          :getRowId="getRowId"
          :autoSizeStrategy="autoSizeStrategy"
          :defaultColDef="defaultColDef"
          rowModelType="serverSide"
          :enableBrowserTooltips="true"
          :suppressCsvExport="true"
          :suppressExcelExport="true"
          :columnTypes="columnTypes"
          :components="{
            RowActionsRenderer,
            SelectEditor,
          }"
          :context="gridContext"
        ></ag-grid-vue>
      </div>
    </q-page>
  </div>
  <q-dialog v-model="reviewRowChangesDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Review user row changes</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table wrap-cells class="w-full">
          <thead>
            <tr>
              <th class="text-left">Column</th>
              <th class="text-left">Original value</th>
              <th class="text-left">New value</th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="col in [
                'register_address',
                'operation',
                'register_length',
                'register_name',
                'data_format',
                'description',
                'device_id',
              ]"
              :key="col"
            >
              <tr
                v-if="
                  reviewRowChangesDialog.entry[col] !==
                  reviewRowChangesDialog.entry.parent[col]
                "
              >
                <th class="text-left">
                  {{
                    modbusRegColumns.find((c) => c.field === col)?.headerName
                  }}
                </th>
                <td class="text-left">
                  {{ reviewRowChangesDialog.entry.parent[col] }}
                </td>
                <td class="text-left">
                  {{ reviewRowChangesDialog.entry[col] }}
                </td>
              </tr>
            </template>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Cancel"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewRowChangesDialog.active = false"
        />
        <q-btn
          label="Reject"
          color="negative"
          @click="rejectEntryChanges(reviewRowChangesDialog.entry)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveEntryChanges(reviewRowChangesDialog.entry)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="reviewAllRowChangesDialog.active" persistent>
    <q-card style="width: 1000px">
      <q-card-section>
        <div class="text-h6">Review row changes</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table wrap-cells class="w-full">
          <thead>
            <tr>
              <th class="text-left">Actions</th>
              <th class="text-left">User</th>
              <th
                class="text-left"
                v-for="col in modbusRegColumns.filter((c) => c.field !== 'id')"
                :key="col.field"
              >
                {{ col.headerName }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left"></td>
              <td class="text-left font-bold">Original</td>
              <td
                class="text-left font-bold"
                v-for="col in modbusRegColumns.filter((c) => c.field !== 'id')"
                :key="col.field"
              >
                {{ reviewAllRowChangesDialog.entry[col.field] }}
              </td>
            </tr>
            <template
              v-for="rev in reviewAllRowChangesDialog.entry.revisions"
              :key="rev.id"
            >
              <tr>
                <td class="text-left">
                  <div class="flex flex-nowrap gap-2" v-if="!rev.action">
                    <q-btn
                      color="primary"
                      size="sm"
                      dense
                      no-caps
                      label="Approve"
                      class="px-1"
                      @click="approveEntryChanges(rev)"
                    />
                    <q-btn
                      color="negative"
                      size="sm"
                      dense
                      no-caps
                      label="Reject"
                      class="px-1"
                      @click="rejectEntryChanges(rev)"
                    />
                  </div>
                  <div v-else>
                    <q-chip
                      v-if="rev.action === 'APPROVED'"
                      dense
                      color="primary"
                      text-color="white"
                      icon="check_circle"
                      size="0.7rem"
                    >
                      Approved
                    </q-chip>
                    <q-chip
                      v-else
                      dense
                      color="negative"
                      text-color="white"
                      icon="cancel"
                      size="0.7rem"
                    >
                      Rejected
                    </q-chip>
                  </div>
                </td>
                <td class="text-left font-bold text-sky-500">
                  {{ rev.user.name }}
                </td>
                <td
                  class="text-left"
                  v-for="col in modbusRegColumns.filter(
                    (c) => c.field !== 'id'
                  )"
                  :key="col.field"
                  :class="{
                    'bg-yellow-2':
                      rev[col.field] !==
                      reviewAllRowChangesDialog.entry[col.field],
                  }"
                >
                  {{ rev[col.field] }}
                </td>
              </tr>
            </template>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Close"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewAllRowChangesDialog.active = false"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="reviewRowAddedDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Review user new row</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table wrap-cells class="w-full">
          <thead>
            <tr>
              <th class="text-left">Register Address</th>
              <th class="text-left">Operation</th>
              <th class="text-left">Register Length</th>
              <th class="text-left">Register Name</th>
              <th class="text-left">Data Format</th>
              <th class="text-left">Description</th>
              <th class="text-left">Device Name</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                class="text-left"
                v-for="col in [
                  'register_address',
                  'operation',
                  'register_length',
                  'register_name',
                  'data_format',
                  'description',
                  'device_id',
                ]"
                :key="col"
              >
                {{ reviewRowAddedDialog.entry[col] }}
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Cancel"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewRowAddedDialog.active = false"
        />
        <q-btn
          label="Reject"
          color="negative"
          @click="rejectEntryChanges(reviewRowAddedDialog.entry)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveEntryChanges(reviewRowAddedDialog.entry)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <!-- Settings dialog -->
  <q-dialog v-model="settingsDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Settings</div>
      </q-card-section>
      <q-separator />
      <q-form ref="form" class="flex flex-col" @submit="saveSettings">
        <q-card-section class="scroll" style="max-height: 50vh">
          <q-list bordered class="rounded-borders">
            <q-expansion-item
              expand-separator
              icon="perm_identity"
              label="Sync Data"
              caption="Pull & push data to the public modbus registry"
              default-opened
            >
              <q-card>
                <q-card-section>
                  <q-option-group
                    v-model="settingsDialog.settings.syncData"
                    :options="[
                      { label: 'Offline Only', value: 'OFFLINE' },
                      { label: 'Sync Data', value: 'SYNC' },
                    ]"
                  />
                  <div
                    v-if="settingsDialog.settings.syncData === 'SYNC'"
                    class="flex flex-col ml-4"
                  >
                    <q-toggle
                      v-model="settingsDialog.settings.push"
                      label="Push my changes to the public registry ( except private rows )"
                    />
                    <q-toggle
                      v-model="settingsDialog.settings.pull"
                      label="Pull data from the public registry"
                    />
                    <div v-if="settings.pull || settings.push" class="mt-4">
                      <q-btn
                        class="q-mt-sm"
                        label="Sync
                    Now"
                        @click="triggerSyncData"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="mt-0">
          <q-btn
            label="Cancel"
            color="primary"
            flat
            class="q-ml-sm"
            @click="settingsDialog.active = false"
          />
          <q-btn label="Save" type="submit" color="primary" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
  <!-- Create new device dialog -->
  <q-dialog v-model="createDeviceDialog" persistent>
    <q-card style="width: 700px; max-width: 700px">
      <q-card-section>
        <div class="text-h6">Create new Device</div>
      </q-card-section>
      <q-separator />
      <q-form ref="form" class="q-gutter-md" @submit="createNewDevice">
        <q-card-section
          class="flex flex-col flex-nowrap gap-4 scroll"
          style="max-height: 50vh"
        >
          <div class="flex items-center">
            <div class="image-container relative w-52">
              <file-upload
                ref="createDeviceFileUploaderRef"
                :endpoint="fileUploadEndpoint"
                :headers="fileUploadHeaders"
                path="modbus-register/devices"
                :types="['image/*']"
                :height="150"
                @uploaded="newDeviceImageUploaded"
              />
            </div>
            <div class="grow ml-4">
              <q-input
                v-model="newDevice.name"
                label="Name"
                :rules="[
                  (val) =>
                    (val && val.length > 0) ||
                    'Please enter the new device name',
                ]"
              />
            </div>
          </div>
          <div>
            <q-checkbox v-model="newDevice.private" label="Private" />
          </div>
          <q-input
            v-model="newDevice.description"
            label="Description"
            type="textarea"
          />
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="mt-0">
          <q-btn
            label="Cancel"
            color="primary"
            flat
            class="q-ml-sm"
            @click="createDeviceDialog = false"
          />
          <q-btn label="Submit" type="submit" color="primary" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
  <!-- Update device dialog -->
  <q-dialog v-model="updateDeviceDialog.active" persistent>
    <q-card style="width: 700px; max-width: 700px">
      <q-card-section>
        <div class="text-h6">Update Device</div>
      </q-card-section>
      <q-separator />
      <q-form ref="form" class="q-gutter-md" @submit="updateDevice">
        <q-card-section
          class="flex flex-col flex-nowrap gap-4 scroll"
          style="max-height: 50vh"
        >
          <div class="flex items-center">
            <div class="image-container relative w-52">
              <file-upload
                v-if="!updateDeviceDialog.data.image"
                ref="updateDeviceFileUploaderRef"
                :endpoint="fileUploadEndpoint"
                :headers="fileUploadHeaders"
                path="modbus-register/devices"
                :types="['image/*']"
                :height="150"
                @uploaded="updateDeviceImageUploaded"
              />
              <q-avatar v-else square size="180px">
                <img :src="updateDeviceDialog.data.image.path" />
                <div class="image-actions">
                  <q-btn
                    class="absolute right-0 top-0"
                    flat
                    size="sm"
                    color="primary"
                    icon="delete"
                    @click="
                      updateDeviceDialog.data.image_id = null;
                      updateDeviceDialog.data.image = null;
                    "
                  >
                    <q-tooltip> Delete image </q-tooltip>
                  </q-btn>
                </div>
              </q-avatar>
            </div>
            <div class="grow ml-4">
              <q-input
                v-model="updateDeviceDialog.data.name"
                label="Name"
                :rules="[
                  (val) =>
                    (val && val.length > 0) ||
                    'The device name cannot be empty',
                ]"
              />
            </div>
          </div>

          <div>
            <q-checkbox
              v-model="updateDeviceDialog.data.private"
              label="Private"
            />
          </div>
          <q-input
            v-model="updateDeviceDialog.data.description"
            label="Description"
            type="textarea"
          />
        </q-card-section>
        <q-separator />

        <q-card-actions align="right" class="mt-0">
          <q-btn
            label="Cancel"
            color="primary"
            flat
            class="q-ml-sm"
            @click="updateDeviceDialog = false"
          />
          <q-btn label="Submit" type="submit" color="primary" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>

  <!-- Device added review dialog -->
  <q-dialog v-model="reviewDeviceAddedDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Review user new device</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table wrap-cells class="w-full">
          <thead>
            <tr>
              <th class="text-left">Name</th>
              <th class="text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                class="text-left"
                v-for="col in ['name', 'description']"
                :key="col"
              >
                {{ reviewDeviceAddedDialog.data[col] }}
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Cancel"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewDeviceAddedDialog.active = false"
        />
        <q-btn
          label="Reject"
          color="negative"
          @click="rejectDeviceChanges(reviewDeviceAddedDialog.data)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveDeviceChanges(reviewDeviceAddedDialog.data)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Device changed dialog -->
  <q-dialog v-model="reviewDeviceChangesDialog.active" persistent>
    <q-card style="width: 700px">
      <q-card-section>
        <div class="text-h6">Review user device changes</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="max-height: 50vh">
        <q-markup-table wrap-cells class="w-full">
          <thead>
            <tr>
              <th class="text-left">Column</th>
              <th class="text-left">Original value</th>
              <th class="text-left">New value</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="col in ['name', 'description']" :key="col">
              <tr
                v-if="
                  reviewDeviceChangesDialog.data[col] !==
                  reviewDeviceChangesDialog.data.parent[col]
                "
              >
                <th class="text-left capitalize">
                  {{ col }}
                </th>
                <td class="text-left">
                  {{ reviewDeviceChangesDialog.data.parent[col] }}
                </td>
                <td class="text-left">
                  {{ reviewDeviceChangesDialog.data[col] }}
                </td>
              </tr>
            </template>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right" class="mt-0">
        <q-btn
          label="Cancel"
          color="primary"
          flat
          class="q-ml-sm"
          @click="reviewDeviceChangesDialog.active = false"
        />
        <q-btn
          label="Reject"
          color="negative"
          @click="rejectDeviceChanges(reviewDeviceChangesDialog.data)"
        />
        <q-btn
          label="Approve"
          color="primary"
          @click="approveDeviceChanges(reviewDeviceChangesDialog.data)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import "ag-grid-enterprise/styles/ag-grid.css";
import "ag-grid-enterprise/styles/ag-theme-quartz.css";
import "ag-grid-enterprise";
import {
  ref,
  onMounted,
  onBeforeUnmount,
  onBeforeMount,
  watch,
  toRaw,
  computed,
} from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { ServerSideRowModelModule, ModuleRegistry } from "ag-grid-enterprise";
import { useQuasar, debounce } from "quasar";
import { liveApi, localApi } from "../../lib/api";
import {
  globalNav,
  modbusRegColumns,
  cellClassRules,
  columnTypes,
  user,
  isAdmin,
  getModbusRegisterSettings,
  devices,
} from "../../lib/common";
import UserTopBar from "../../components/UserTopBar.vue";

import RowActionsRenderer from "../../components/grid/RowActionsRenderer.vue";
import SelectEditor from "../../components/grid/SelectEditor.vue";
import FileUpload from "../../components/FileUploadS3.vue";

// Register the ServerSideRowModelModule for ag-Grid
ModuleRegistry.registerModules([ServerSideRowModelModule]);

// Quasar UI framework instance
const $q = useQuasar();

// Reactive reference for the filter input
const filter = ref("");

// Reactive reference for the grid API instance
const gridApi = ref();

// Reactive reference for the row ID getter function
const getRowId = ref();

// Default column definitions for the ag-Grid
const defaultColDef = ref({
  minWidth: 70,
  suppressHeaderMenuButton: true,
  enableCellChangeFlash: true,
  cellClassRules: cellClassRules,
  editable: () => true,
});

// Template for a new empty item to be added to the grid
const emptyNewItem = {
  register_address: null,
  operation: "",
  register_length: 1,
  register_name: "",
  data_format: null,
  description: "",
  device_id: null,
};

// Reactive reference for notifications
const notifications = ref([]);

// Reactive references for various dialog states
const reviewRowChangesDialog = ref({ active: false, entry: null });
const reviewRowAddedDialog = ref({ active: false, entry: null });
const reviewDeviceAddedDialog = ref({ active: false, data: null });
const reviewDeviceChangesDialog = ref({ active: false, data: null });
const reviewAllRowChangesDialog = ref({ active: false, entry: null });

// Debounced filter change handler
const triggerFilterChanged = debounce(onFilterChanged, 500);

// Active tab state
const activeTab = ref("all");

// Online status and live mode state
const isOnline = ref(navigator.onLine);
const liveMode = ref(false);

// Variables to store offline notification dismissal and interval IDs
let dismissOfflineNotif = null;
let intervalIsOnline = null;
const intervalSync = ref(null);
const intervalGetNotifications = ref(null);

// User settings for data sync and push/pull operations
const settings = ref({
  syncData: "OFFLINE",
  push: false,
  pull: false,
});

// Settings dialog state with a deep copy of the current settings
const settingsDialog = ref({
  active: false,
  settings: structuredClone(toRaw(settings.value)),
});

// Grid context state
const gridContext = ref({ activeTab, liveMode });

// Reactive reference for product-device mappings
const productDeviceMappings = ref([]);

// Template for a new device
const newDevice = ref({ name: "", description: "", private: false });

// State for the create device dialog
const createDeviceDialog = ref(false);

// State for the update device dialog
const updateDeviceDialog = ref({ active: false, id: null, data: {} });

// Reference for the device select input and its options
const deviceSelectRef = ref(null);
const selectDeviceOptions = ref(devices.value);

// Filter function for the device select input
const selectDeviceFilterFn = (val, update, abort) => {
  if (val === "") {
    update(() => {
      selectDeviceOptions.value = devices.value;
    });
    return;
  }
  update(() => {
    const keyword = val.toLowerCase();
    selectDeviceOptions.value = devices.value.filter(
      (v) => v.name.toLowerCase().indexOf(keyword) > -1 /* ||
        v.description?.toLowerCase().indexOf(keyword) > -1 */
    );
  });
};

// Selected device state
const selectedDevice = ref({ name: "All Devices" });

// References for file uploaders
const createDeviceFileUploaderRef = ref(null);
const updateDeviceFileUploaderRef = ref(null);

// Computed endpoint for file upload based on live mode
const fileUploadEndpoint = computed(() => {
  if (liveMode.value) {
    return process.env.API_URL + "/file";
  } else {
    return process.env.LOCAL_API_URL + "/file";
  }
});

// Computed headers for file upload based on live mode
const fileUploadHeaders = computed(() => {
  if (liveMode.value) {
    return undefined;
  } else {
    return {
      Authorization: process.env.LOCAL_API_SECRET_KEY || "secret",
    };
  }
});

// Save the column state of the grid before the window unloads
window.onbeforeunload = () => {
  const state = gridApi.value.getColumnState();
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
};

// Setup function to run before the component mounts
onBeforeMount(() => {
  getRowId.value = (params) => `${params.data.id}`;
});

// This hook is called after the component has finished its initial rendering
onMounted(() => {
  // Disable health check for now because it seems to have some issues
  // healthCheck();

  // Set the title of the navigation bar to "Modbus Register"
  globalNav.value.title = "Modbus Register";

  // Clear the back button in the navigation bar
  globalNav.value.back = null;

  // Get settings for Modbus register, or use default settings if not found
  settings.value = getModbusRegisterSettings() || settings.value;

  // Load any notifications
  loadNotifications();

  // Synchronize data initially
  syncData();

  // Show a notification to the user to enable data synchronization
  notifyUserToEnableSync();

  // Set up an interval to periodically synchronize data every 10 minutes
  intervalSync.value = setInterval(syncData, 10 * 60 * 1000);

  // Set up an interval to periodically load notifications every 5 minutes
  intervalGetNotifications.value = setInterval(
    loadNotifications,
    5 * 60 * 1000
  );
});

// Event listener for messages from the webview
window.chrome?.webview?.addEventListener("message", (arg) => {
  console.log("Recieved a message from webview", arg.data);
  if ("action" in arg.data) {
    if (arg.data.action === "GET_SELECTED_DEVICE_INFO_RES") {
      // Find the product device mapping based on product id
      const productDeviceMapping = productDeviceMappings.value.find(
        (p) => p.product_id === arg.data.data.product_id
      );
      if (productDeviceMapping) {
        // Find the device based on device id from the mapping
        const device = devices.value.find(
          (d) => d.id === productDeviceMapping.device_id
        );
        if (device) {
          // Set the selected device
          selectedDevice.value = device;
        }
      }
    }
  }
});

// Function to perform a health check
function healthCheck() {
  const socket = new WebSocket(process.env.API_WS_URL);
  socket.onopen = function () {
    if (dismissOfflineNotif) {
      dismissOfflineNotif(); // Dismiss any existing offline notification
    }
    let debounceStatusCheck = debounce(() => {
      socket.send("statusCheck"); // Send a status check message
    }, 2000);
    intervalIsOnline = setInterval(() => {
      debounceStatusCheck(); // Debounced status check with interval
    }, 3000);
    isOnline.value = true; // Set online state to true
  };

  socket.onclose = function (e) {
    clearisOnlineState(); // Clear online state
    setTimeout(function () {
      healthCheck(); // Retry health check after 5 seconds on close
    }, 5000);
  };

  socket.onerror = function (err) {
    if (socket.readyState === WebSocket.CLOSED) {
      clearisOnlineState();
      setTimeout(function () {
        healthCheck();
      }, 5000);
      return;
    }
    socket.close(); // Close the socket on error
  };
}

// Function to clear the online state
function clearisOnlineState() {
  if (intervalIsOnline) clearInterval(intervalIsOnline); // Clear interval
  if (isOnline.value) {
    if (dismissOfflineNotif) dismissOfflineNotif(); // Dismiss any existing notification
    dismissOfflineNotif = $q.notify({
      // Show offline notification with option to retry health check
      icon: "wifi_off",
      type: "negative",
      message: "You are offline!",
      timeout: 0,
      actions: [{ label: "Close", color: "white", handler: healthCheck }],
    });
  }
  isOnline.value = false; // Set online state to false
}

// Function to load notifications
function loadNotifications() {
  getNotifications().then((res) => {
    notifications.value = res; // Update notifications with fetched data
  });
}

// Function called when filter is changed on the grid
function onFilterChanged() {
  gridApi.value.onFilterChanged(); // Trigger filter change on the grid
}

async function onGridReady(params) {
  // Store the grid API for later use
  gridApi.value = params.api;

  // Check for previously saved grid state in local storage
  const localState = localStorage.getItem("modbusRegisterGridState");
  if (localState && localState !== "undefined") {
    // Restore the grid state from local storage
    params.api.applyColumnState({
      state: JSON.parse(localState),
      applyOrder: true,
    });
  }

  // Get the list of devices (assuming this is needed for the grid)
  await getDeviceList();

  // Send message to the webview to get selected device info (if applicable)
  window.chrome?.webview?.postMessage({
    action: 12, // GET_SELECTED_DEVICE_INFO
  });

  // Create the server-side datasource for the grid
  var datasource = getServerSideDatasource();

  // Register the datasource with the grid
  params.api.setGridOption("serverSideDatasource", datasource);

  // Handle cancelling row changes
  params.api.addEventListener("cancelChanges", async (ev) => {
    if (!isOnline.value && liveMode.value) {
      // Notify user they are offline and can't cancel changes in live mode
      $q.notify({
        type: "negative",
        message: "You are offline!",
      });
      return;
    }

    // Cancel the update on the server
    await liveApi
      .patch("modbus-registers/" + ev.data.id + "/cancel")
      .then(async (_res) => {
        // Update local state and grid
        await cancelUpdate(ev.data.id);
        gridApi.value.refreshServerSide();
        $q.notify({
          type: "positive",
          message: "The row changes has been cancelled successfully",
        });
      });
  });

  // Handle deleting a row
  params.api.addEventListener("deleteRow", async (ev) => {
    const api = liveMode.value ? liveApi : localApi; // Use live or local API based on mode
    await api.delete("modbus-registers/" + ev.data.id).then(async (_res) => {
      // Update grid and notify user
      gridApi.value.refreshServerSide();
      $q.notify({
        type: "positive",
        message: "The row has been deleted successfully",
      });
    });

    // Additional deletion logic for specific row statuses (check comments for details)
    if (ev.data.status === "REVISION" && isOnline.value === true) {
      await liveApi
        .delete("modbus-registers/" + ev.data.id)
        .then(async (_res) => {
          gridApi.value.refreshServerSide();
        });
    }
  });

  // Handle cancelling a row update
  params.api.addEventListener("cancelUpdateRow", async (ev) => {
    if (!isOnline.value) {
      // Notify user they are offline and can't restore original row
      $q.notify({
        type: "negative",
        message:
          "You are offline, you have to be online to restore the original row!",
      });
      return;
    }
    // Call function to cancel update (implementation assumed)
    cancelUpdate(ev.data.id);
  });

  // Handle reviewing a new row
  params.api.addEventListener("reviewNewRow", async (ev) => {
    // Set state for review row added dialog
    reviewRowAddedDialog.value = { active: true, entry: ev.data };
  });

  // Handle reviewing all row changes
  params.api.addEventListener("reviewAllRowChanges", async (ev) => {
    // Set state for review all row changes dialog
    reviewAllRowChangesDialog.value = { active: true, entry: ev.data };
  });

  // Handle toggling private flag on a row
  params.api.addEventListener("togglePrivate", async (ev) => {
    // Patch the row data on the server to update private flag
    const newPrivateValue = !ev.data.private; // Determine the new private flag value (opposite of current)
    await localApi
      .patch("modbus-registers/" + ev.data.id, {
        json: { private: newPrivateValue },
      })
      .then(async (_res) => {
        // Update grid with a small delay to ensure server update reflects first
        gridApi.value.refreshServerSide();
        setTimeout(() => {
          // Refresh specific cells in the row to avoid unnecessary flickering
          gridApi.value.refreshCells({
            force: true, // Force refresh even if cell values haven't changed visually
            rowNodes: [ev.node], // Specify the row node to refresh
            suppressFlash: true, // Prevent flash animation during refresh
          });
        }, 100); // Delay to allow server update before client-side refresh

        // Notify user of successful update
        $q.notify({
          type: "positive",
          message: "The row has been updated successfully",
        });
      })
      .catch((error) => {
        // Handle potential errors during the update (e.g., network issues)
        console.error("Error toggling private flag:", error);
        $q.notify({
          type: "negative",
          message:
            "Failed to update row. Please check your connection and try again.",
        });
      });
  });
}
function onFirstDataRendered(params) {}

// Cleanup function called when the component unmounts
onBeforeUnmount(() => {
  const state = gridApi.value.getColumnState();
  // Save the current grid column configuration to local storage
  localStorage.setItem("modbusRegisterGridState", JSON.stringify(state));
  // Clear any ongoing background tasks
  clearInterval(intervalSync.value);
  clearInterval(intervalGetNotifications.value);
});

const autoSizeStrategy = {
  // Automatically resize columns to fit the grid width
  type: "fitGridWidth",
  // Set a minimum width to prevent narrow columns
  defaultMinWidth: 50,
};

async function cancelUpdate(id) {
  // Fetch the original data for the row being cancelled
  await liveApi.get("modbus-registers/" + id).then(async (res) => {
    const item = await res.json();
    // Remove unnecessary data from the retrieved object
    delete item.id;
    delete item.created_at;
    delete item.updated_at;
    delete item.revisions;
    delete item.user;
    delete item.userId;
    delete item.parentId;
    delete item.parent;
    delete item.ModbusRegisterNotification;

    // Patch the local API to restore the original row state
    const localItem = await localApi.patch("modbus-registers/" + id, {
      json: item,
    });
    if (localItem.ok) {
      gridApi.value.refreshServerSide();
      $q.notify({
        type: "positive",
        message: "The row has been restored successfully",
      });
    } else {
      $q.notify({
        type: "negative",
        message: "Failed to restore the original row!",
      });
    }
  });
}

function getServerSideDatasource() {
  const api = liveMode.value ? liveApi : localApi; // Use live or local API based on mode
  return {
    getRows: (params) => {
      const request = params.request;
      if (request.endRow == undefined || request.startRow == undefined) {
        return "";
      }
      var limit = request.endRow - request.startRow; // Calculate number of rows requested
      const sortCol = params.api.getColumn(request.sortModel[0]?.colId || 1); // Get sort column
      // Construct API call URL with parameters
      api
        .get(
          "modbus-registers?limit=" +
            limit +
            "&offset=" +
            request.startRow +
            "&order_by=" +
            sortCol.colDef.field +
            "&order_dir=" +
            (request.sortModel[0]?.sort || "desc") +
            (filter.value ? "&filter=" + filter.value : "") +
            (activeTab.value === "changes" ? "&has_changes=1" : "") +
            (selectedDevice.value.name &&
            selectedDevice.value.name !== "All Devices"
              ? "&device_id=" + selectedDevice.value.id
              : "")
        )
        .then(async (res) => {
          res = await res.json();
          // Provide retrieved data and total row count to the grid
          params.success({
            rowData: res.data,
            rowCount: res.count,
          });
        })
        .catch((_err) => {
          params.fail();
        });
    },
  };
}

function updateRow(event) {
  if (isOnline.value === false && liveMode.value) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  let api = liveMode.value ? liveApi : localApi; // Use live or local API based on mode
  const updateData = {
    // Construct update object with field name and value
    [event.colDef.field]:
      typeof event.newValue === "object" ? event.newValue.id : event.newValue,
  };
  // Patch the server with the entry updated data
  api
    .patch("modbus-registers/" + event.data.id, { json: updateData })
    .then(async (res) => {
      res = await res.json();
      if (res) {
        gridApi.value.refreshServerSide();
        setTimeout(() => {
          gridApi.value.refreshCells({
            force: true,
            rowNodes: [event.node],
            suppressFlash: true,
          });
        }, 500);

        $q.notify({
          type: "positive",
          message: "Successfully updated",
        });
      }
    })
    .catch((err) => {
      $q.notify({
        type: "negative",
        message: "Update failed! " + err.message,
      });
      console.log(err);
    });
}

// Function to add a new row to the modbus-registers
function addNewRow() {
  let api = localApi;

  // Set the device_id in emptyNewItem based on the selected device
  emptyNewItem.device_id =
    selectedDevice.value.name === "All Devices"
      ? null
      : selectedDevice.value.id;

  // Send a POST request to the API to add the new item
  api
    .post("modbus-registers", { json: emptyNewItem })
    .then(async (res) => {
      // Parse the JSON response
      res = await res.json();

      // Apply column sorting state to the grid
      gridApi.value.applyColumnState({
        state: [{ colId: "1", sort: "desc" }],
      });

      // Add the new item to the grid
      gridApi.value.applyServerSideTransaction({
        addIndex: 0,
        add: [res],
      });

      // Notify the user of successful addition
      $q.notify({
        type: "positive",
        message: "Successfully added",
      });
    })
    .catch((err) => {
      // Notify the user of a failure
      $q.notify({
        type: "negative",
        message: "Save failed! " + err.message,
      });
    });
}

// Function to get notifications with pagination support
async function getNotifications(offset = 0, limit = 10) {
  // Check if the user is online and authenticated
  if (isOnline.value === false || !user.value) {
    return [];
  }

  // Send a GET request to the API to retrieve notifications
  return await liveApi
    .get("modbus-register-notifications?offset=" + offset + "&limit=" + limit)
    .then((res) => res.json())
    .catch((err) => {
      // Log any errors and return an empty array
      console.log(err);
      return [];
    });
}

// Function to change the status of a notification
function notificationStatusChange(notification, status) {
  // Check if the user is online
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }

  // Send a PATCH request to the API to update the notification status
  liveApi
    .patch(
      "modbus-register-notifications" + "/" + notification.id + "/status",
      {
        json: { status: status },
      }
    )
    .then(async (_res) => {
      // Update the status of the notification locally
      notification.status = status;

      // Remove the notification from the list if it is archived
      if (status === "ARCHIVED") {
        notifications.value = notifications.value.filter(
          (n) => n.id !== notification.id
        );
      }
    })
    .catch((err) => {
      // Log any errors and notify the user
      console.log(err);
      $q.notify({
        type: "negative",
        message: err.message,
      });
    });
}

// Function to handle various notification changes for admin review
function notificationChangesReviewAction(data, type) {
  // Check the type of change and open the corresponding dialog
  if (type === "ADMIN_ENTRY_CHANGED") {
    reviewRowChangesDialog.value = { active: true, entry: data };
  } else if (type === "ADMIN_ENTRY_ADDED") {
    reviewRowAddedDialog.value = { active: true, entry: data };
  } else if (type === "ADMIN_DEVICE_ADDED") {
    reviewDeviceAddedDialog.value = { active: true, data };
  } else if (type === "ADMIN_DEVICE_CHANGED") {
    reviewDeviceChangesDialog.value = { active: true, data };
  }
}

// Function to load more notifications when scrolling
function loadMoreNotifications(_index, done) {
  // Check if the user is online
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }

  // Check if there are less than 10 notifications
  if (notifications.value.length < 10) return done(true);

  // Retrieve more notifications and update the list
  getNotifications(notifications.value.length, 10).then((data) => {
    if (data.length > 0) {
      notifications.value = notifications.value.concat(data);
      done();
    } else {
      done(true);
    }
  });
}

// Function to reject entry changes
function rejectEntryChanges(entry) {
  // Check if the user is online
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }

  // Send a PATCH request to the API to reject the entry
  liveApi
    .patch("modbus-registers/" + entry.id + "/reject")
    .then(async (_res) => {
      // Notify the user of successful rejection
      $q.notify({
        type: "positive",
        message: "Successfully rejected",
      });

      // Refresh the server-side data in the grid
      gridApi.value.refreshServerSide();
    });

  // Close the review dialogs
  reviewRowAddedDialog.value.active = false;
  reviewRowChangesDialog.value.active = false;

  // Update the action property of the entry to "REJECTED"
  entry.action = "REJECTED";

  // Update the related notification status to "ADMIN_REJECTED"
  updateEntryRelatedNotificationStatus(entry, "ADMIN_REJECTED");
}

// Function to approve entry changes
function approveEntryChanges(entry) {
  // Check if the user is online
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }

  // Send a PATCH request to the API to approve the entry
  liveApi
    .patch("modbus-registers/" + entry.id + "/approve")
    .then(async (_res) => {
      // Notify the user of successful approval
      $q.notify({
        type: "positive",
        message: "Successfully approved",
      });

      // Refresh the server-side data in the grid
      gridApi.value.refreshServerSide();

      // Update the action property of the entry to "APPROVED"
      entry.action = "APPROVED";
    });

  // Close the review dialogs
  reviewRowAddedDialog.value.active = false;
  reviewRowChangesDialog.value.active = false;

  // Update the related notification status to "ADMIN_APPROVED"
  updateEntryRelatedNotificationStatus(entry, "ADMIN_APPROVED");
}

// Function to update the status of notifications related to an entry or device
function updateEntryRelatedNotificationStatus(data, status, type = "ENTRY") {
  // Find the relevant notification based on the entry/device and update its status
  const notification = notifications.value.find(
    (n) =>
      n.entryId === (type === "ENTRY" ? data.id : null) &&
      n.deviceId === (type === "DEVICE" ? data.id : null) &&
      n.userRefId === data.userId &&
      n.group === "ADMINS" &&
      n.status === "UNREAD"
  );
  if (notification) {
    notification.status = status;
  }
}

// Watcher to monitor changes in liveMode and reload data accordingly
watch(liveMode, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    var datasource = getServerSideDatasource();
    // Register the new datasource with the grid
    gridApi.value.setGridOption("serverSideDatasource", datasource);
    // Reload the data
    reloadData();
  }
});

/*
watch(isOnline, (newVal, _oldVal) => {
  if (newVal === true) {
    if (user.value) {
      loadNotifications();
      syncData();
    }
  }
});
 */
// Function to open the settings dialog
function openSettingsDialog() {
  // Activate the settings dialog
  settingsDialog.value.active = true;
  // Clone the current settings to the dialog for editing
  settingsDialog.value.settings = structuredClone(toRaw(settings.value));
}

// Function to save the settings
function saveSettings() {
  // Deactivate the settings dialog
  settingsDialog.value.active = false;
  // Update the global settings with the values from the dialog
  settings.value = structuredClone(toRaw(settingsDialog.value.settings));
  // Save the updated settings to local storage
  localStorage.setItem(
    "modbusRegisterSettings",
    JSON.stringify(toRaw(settings.value))
  );
  // Notify the user that the settings were saved successfully
  $q.notify({
    type: "positive",
    message: "Settings saved successfully",
  });
}

// Function to notify the user to enable data synchronization
function notifyUserToEnableSync() {
  // Check if the user is online and has a valid user ID
  if (
    isOnline.value &&
    user.value?.id &&
    (settings.value.syncData === "OFFLINE" ||
      (!settings.value.push && !settings.value.pull))
  ) {
    // Check if the sync notification was dismissed before
    const sync_notification_dismissed = $q.cookies.get(
      "sync_notification_dismissed"
    );
    // If the notification was not dismissed, show it to the user
    if (sync_notification_dismissed !== "true") {
      $q.notify({
        message:
          "We noticed that the syncing option in the settings isn't enabled on your account. You can synchronize your data with the public registry by activating the option in the settings.",
        timeout: 0,
        multiLine: true,
        actions: [
          {
            label: "Go to Settings",
            color: "primary",
            flat: false,
            style: "margin-right: 10px",
            handler: () => {
              // Open the settings dialog when the user clicks "Go to Settings"
              openSettingsDialog();
            },
          },
          {
            label: "Dismiss",
            color: "white",
            handler: () => {
              // Set a cookie to remember that the user dismissed the notification
              $q.cookies.set("sync_notification_dismissed", "true", {
                expires: "10d",
              });
            },
          },
        ],
      });
    }
  }
}

// Function to trigger data synchronization
async function triggerSyncData() {
  // Notify the user that data syncing is in progress
  $q.notify({
    message: "Syncing data...",
    timeout: 2000,
    spinner: true,
  });
  // Call the syncData function to perform the synchronization
  await syncData();
  // Notify the user that data syncing is complete
  $q.notify({
    message: "Syncing data done!",
    timeout: 2000,
  });
}

// Function to perform data synchronization
async function syncData() {
  // Simulate a delay for the sync process
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if the user has a valid ID and is online
  if (!user.value?.id || !isOnline.value) {
    return;
  }

  // If syncData setting is enabled, perform synchronization tasks
  if (settings.value.syncData === "SYNC") {
    // Push local device changes to the remote server
    await pushLocalDevicesChanges();
    // Pull remote device changes from the remote server
    await pullRemoteDevicesChanges();
    // Push local entry changes to the remote server
    await pushLocalEntriesChanges();
    // Pull remote entry changes from the remote server
    await pullRemoteEntriesChanges();

    // Get the server time and update the last pull time for the user
    const serverTime = await liveApi.get("serverTime").json();
    await localApi.patch("user/update_last_modbus_register_pull", {
      json: { time: serverTime.time },
    });
  }
}

// Function to push local device changes to the remote server
async function pushLocalDevicesChanges() {
  // Check if the push setting is enabled
  if (!settings.value.push) {
    return;
  }

  // Fetch local devices that have not been synchronized with the remote server
  let devices = await localApi
    .get("modbus-register/devices?local_only=true")
    .then((res) => res.json())
    .catch((err) => {
      console.log(err);
      return [];
    });

  // Filter out private devices
  devices = devices.filter((d) => d.private !== true);

  // If there are devices to be pushed, proceed
  if (devices?.length > 0) {
    let index = 0;

    // Show a notification to indicate the progress of the push operation
    const notif = $q.notify({
      group: false,
      timeout: 0,
      spinner: true,
      message: "Pushing local devices changes...",
      caption: "0%",
    });

    // Iterate over each device and push changes to the remote server
    for await (const item of devices) {
      index++;
      const progress = Math.round((index / devices.length) * 100);
      notif({
        caption: `${progress}%`,
      });

      // When all devices are processed, update the notification
      if (progress === 100) {
        notif({
          icon: "done",
          spinner: false,
          message: "Pushing local devices changes done!",
          timeout: 2500,
        });
      }

      // Prepare the device data for the remote server by removing unnecessary fields
      const change = structuredClone(item);
      delete change.id;
      delete change.created_at;
      delete change.updated_at;
      delete change.status;
      delete change.image_id;
      delete change.image;
      delete change.remote_id;
      delete change.private;

      // Handle updated devices
      if (item.status === "UPDATED") {
        if (!item.remote_id) continue;
        const res = await liveApi
          .patch("modbus-register/devices/" + item.remote_id, {
            json: change,
          })
          .then((res) => res.json())
          .catch((err) => {
            console.log(err);
            return null;
          });
        if (res) {
          await localApi
            .patch("modbus-register/devices/" + item.id, {
              json: { status: res.status },
            })
            .catch((err) => {
              console.log(err);
            });
        }
      }
      // Handle new devices
      else if (item.status === "NEW") {
        const res = await liveApi
          .post("modbus-register/devices", {
            json: change,
          })
          .then((res) => res.json())
          .catch((err) => {
            console.log(err);
            return null;
          });
        if (res) {
          await localApi
            .patch("modbus-register/devices/" + item.id, {
              json: {
                status: res.status,
                remote_id: res.id,
              },
            })
            .catch((err) => {
              console.log(err);
            });
        }
      }
      // Handle deleted devices
      else if (item.status === "DELETED") {
        if (isAdmin(user.value)) {
          if (item.remote_id) {
            await liveApi
              .delete("modbus-register/devices/" + item.remote_id)
              .catch((err) => {
                console.log(err);
              });
          }

          await localApi
            .delete("modbus-register/devices/" + item.id)
            .catch((err) => {
              console.log(err);
            });
          getDeviceList();
        }
      }
    }
  }
}

// Function to pull remote device changes from the server
async function pullRemoteDevicesChanges(limit = 50, offset = 0) {
  // Check if the pull setting is enabled
  if (!settings.value.pull) {
    return;
  }

  // Fetch user details from local API
  const user = await localApi
    .get("user")
    .then((res) => res.json())
    .catch((err) => {
      console.log(err);
      return null;
    });

  // If user details are not available, exit the function
  if (!user) {
    return;
  }

  // Fetch device changes from the remote server based on the last pull date
  const devicesChanges = await liveApi
    .get(
      `modbus-register/devices?limit=${limit}&offset=${offset}&after_date=${new Date(
        user.last_modbus_register_pull || "2024-05-15T00:00:00.000Z"
      ).toISOString()}`
    )
    .json();

  // If there are device changes to pull, proceed
  if (devicesChanges?.length > 0) {
    let index = 0;

    // Show a notification to indicate the progress of the pull operation
    const notif = $q.notify({
      group: false,
      timeout: 0,
      spinner: true,
      message: "Pulling remote devices changes...",
      caption: "0%",
    });

    // Iterate over each device change and update the local database
    for await (const item of devicesChanges) {
      index++;
      const progress = Math.round((index / devicesChanges.length) * 100);
      notif({
        caption: `${progress}%`,
      });

      // When all device changes are processed, update the notification
      if (progress === 100) {
        notif({
          icon: "done",
          spinner: false,
          message: "Pulling remote devices changes done!",
          timeout: 2500,
        });
      }

      // Prepare the device data for the local database by removing unnecessary fields
      const change = structuredClone(item);
      delete change.revisions;
      delete change.user;
      delete change.userId;
      delete change.parentId;
      delete change.parent;
      delete change.ModbusRegisterNotification;
      delete change.ModbusRegisterProductDeviceMapping;
      delete change.image;
      delete change.image_id;
      delete change.entries;
      delete change.id;
      delete change.created_at;
      delete change.updated_at;

      // Check if the device already exists in the local database
      const existing_item = await localApi
        .get("modbus-register/devices/remote_id/" + item.id)
        .then((res) => res.json())
        .catch(() => null);

      // If the device exists and is not marked as deleted, update it
      if (existing_item && existing_item.id) {
        if (existing_item.status === "DELETED") {
          continue;
        }
        await localApi
          .patch("modbus-register/devices/" + existing_item.id, {
            json: change,
          })
          .catch((err) => {
            console.log(err);
          });
      }
      // If the device does not exist, add it to the local database
      else {
        await localApi
          .post("modbus-register/devices", {
            json: change,
          })
          .catch((err) => {
            console.log(err);
          });
      }
    }

    // If there are more device changes to pull, continue with the next batch
    if (devicesChanges?.length > 49) {
      await pullRemoteDevicesChanges(limit, offset + 50);
    }
    // Otherwise, refresh the device list
    else {
      getDeviceList();
    }
  }
  // If there are no device changes, refresh the device list
  else {
    getDeviceList();
  }
}

// Function to push local entries changes to the remote server
async function pushLocalEntriesChanges() {
  // Check if the push setting is enabled
  if (!settings.value.push) {
    return;
  }

  // Fetch local entries that have not been synchronized with the remote server
  let entries = await localApi
    .get("modbus-registers?local_only=true&limit=50")
    .then(async (res) => await res.json());

  // Filter out private entries
  entries.data = entries?.data?.filter((e) => e.private !== true);

  // If there are entries to be pushed, proceed
  if (entries?.data?.length > 0) {
    let index = 0;

    // Show a notification to indicate the progress of the push operation
    const notif = $q.notify({
      group: false,
      timeout: 0,
      spinner: true,
      message: "Pushing local entries changes...",
      caption: "0%",
    });

    // Iterate over each entry and push changes to the remote server
    for await (const item of entries.data) {
      index++;
      const progress = Math.round((index / entries.data.length) * 100);
      notif({
        caption: `${progress}%`,
      });

      // When all entries are processed, update the notification
      if (progress === 100) {
        notif({
          icon: "done",
          spinner: false,
          message: "Pushing local entries changes done!",
          timeout: 2500,
        });
      }

      // Prepare the entry data for the remote server by removing unnecessary fields
      const change = structuredClone(item);
      delete change.created_at;
      delete change.updated_at;
      delete change.status;
      delete change.device;
      delete change.private;

      // Skip uncompleted rows
      if (
        !change.register_address ||
        !change.operation ||
        !change.data_format ||
        !change.device_id
      ) {
        continue;
      }

      // Map local device ID to remote device ID
      change.device_id = item.device?.remote_id || null;

      // Handle updated entries
      if (item.status === "UPDATED") {
        delete change.id;
        const res = await liveApi
          .patch("modbus-registers/" + item.id, {
            json: change,
          })
          .then((res) => res.json())
          .catch((err) => {
            console.log(err);
            return null;
          });
        if (res) {
          await localApi.patch("modbus-registers/" + item.id, {
            json: { status: res.status },
          });
        }
      }
      // Handle new entries
      else if (item.status === "NEW") {
        delete change.id;
        const res = await liveApi
          .post("modbus-registers", {
            json: change,
          })
          .then((res) => res.json())
          .catch((err) => {
            console.log(err);
            return null;
          });
        if (res) {
          // Remove unnecessary fields from the response
          delete res.revisions;
          delete res.user;
          delete res.userId;
          delete res.parentId;
          delete res.parent;
          delete res.ModbusRegisterNotification;
          delete res.device;

          res.device_id = item.device?.id || null;

          // Add the new entry to the local database
          const localCreated = await localApi
            .post("modbus-registers", {
              json: res,
            })
            .then((res) => res.json())
            .catch((err) => {
              console.log(err);
              return null;
            });
          if (localCreated?.id) {
            // Delete the old entry from the local database
            await localApi
              .delete("modbus-registers/" + item.id)
              .catch((err) => {
                console.log(err);
              });
          }
        }
      }
      // Handle deleted entries
      else if (item.status === "DELETED") {
        if (isAdmin(user.value)) {
          await liveApi.delete("modbus-registers/" + item.id).catch((err) => {
            console.log(err);
          });
          await localApi.delete("modbus-registers/" + item.id).catch((err) => {
            console.log(err);
          });
          gridApi.value.refreshServerSide();
        }
      }
    }
  }

  // Refresh the grid to reflect the latest changes
  gridApi.value.refreshServerSide();
}

// Function to pull remote entries changes and update the local database
async function pullRemoteEntriesChanges(limit = 50, offset = 0) {
  // Check if the pull setting is enabled
  if (!settings.value.pull) {
    return;
  }

  // Fetch user information from the local database
  const user = await localApi.get("user").json();
  if (!user) {
    return;
  }

  // Fetch remote entries changes based on the last pull date
  const entriesChanges = await liveApi
    .get(
      `modbus-registers?limit=${limit}&offset=${offset}&after_date=${new Date(
        user.last_modbus_register_pull || "2024-05-15T00:00:00.000Z"
      ).toISOString()}`
    )
    .json();

  // If there are entries changes, process them
  if (entriesChanges?.data?.length > 0) {
    let index = 0;

    // Show a notification to indicate the progress of the pull operation
    const notif = $q.notify({
      group: false,
      timeout: 0,
      spinner: true,
      message: "Pulling remote entries changes...",
      caption: "0%",
    });

    // Iterate over each entry change and update the local database
    for await (const item of entriesChanges.data) {
      index++;
      const progress = Math.round((index / entriesChanges.data.length) * 100);
      notif({
        caption: `${progress}% ${index} of ${entriesChanges.data.length}`,
      });

      // When all entries are processed, update the notification
      if (progress === 100) {
        notif({
          icon: "done",
          spinner: false,
          message: "Pulling remote entries changes done!",
          timeout: 2500,
        });
      }

      // Prepare the entry data for local storage by removing unnecessary fields
      const change = structuredClone(item);
      delete change.revisions;
      delete change.user;
      delete change.userId;
      delete change.parentId;
      delete change.parent;
      delete change.ModbusRegisterNotification;
      delete change.device;
      delete change.device_id;
      delete change.id;

      // Check if the entry already exists in the local database
      const existing_item = await localApi
        .get("modbus-registers/" + item.id)
        .then((res) => res.json())
        .catch(() => null);

      if (existing_item && existing_item.id) {
        // If the entry is marked as deleted, skip updating it
        if (existing_item.status === "DELETED") {
          continue;
        }

        // Fetch the local device information based on the remote device ID
        const device = await localApi
          .get("modbus-register/devices/remote_id/" + item.device_id)
          .then((res) => res.json())
          .catch(() => null);
        if (device?.id) {
          change.device_id = device.id;
        }

        // Update the existing entry in the local database
        await localApi
          .patch("modbus-registers/" + item.id, {
            json: change,
          })
          .then((res) => res.json())
          .catch((err) => {
            console.log(err);
          });
      } else {
        // Format the date as YYYY-MM-DD HH:MM:SS to store in SQLite
        change.created_at = new Date(change.created_at)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
        change.updated_at = new Date(change.updated_at)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        // Fetch the local device information based on the remote device ID
        const device = await localApi
          .get("modbus-register/devices/remote_id/" + item.device_id)
          .json();
        if (device?.id) {
          change.device_id = device.id;
        }

        // Add the new entry to the local database
        await localApi.post("modbus-registers", {
          json: change,
        });
      }
    }

    // If there are more entries to pull, recursively fetch the next set of entries
    if (entriesChanges?.data?.length > 49) {
      await pullRemoteEntriesChanges(limit, offset + 50);
    } else {
      // Refresh the grid to reflect the latest changes
      gridApi.value.refreshServerSide();
    }
  } else {
    // Refresh the grid if there are no new changes
    gridApi.value.refreshServerSide();
  }
}

// Handle the event when a device selection dropdown is hidden
function onSelectDeviceHide(e) {
  deviceSelectRef.value.blur();
}

// Handle the event when a device is selected from the dropdown
function onSelectDeviceUpdate(e) {
  // Uncomment the following lines if you need to show/hide a specific column based on the selected device
  // if (e.name === "All Devices") {
  //   gridApi.value.setColumnsVisible(["8"], true);
  // } else {
  //   gridApi.value.setColumnsVisible(["8"], false);
  // }
  onFilterChanged(); // Trigger filter change event
}

// Fetch the list of devices and product-device mappings from the API
async function getDeviceList() {
  const api = liveMode.value ? liveApi : localApi;

  try {
    // Fetch devices and mappings concurrently
    const [devicesResponse, mappingsResponse] = await Promise.all([
      api.get("modbus-register/devices?limit=1000"),
      api.get("modbus-register/product_device_mappings"),
    ]);

    // Parse the JSON responses
    const devs = await devicesResponse.json();
    const mappings = await mappingsResponse.json();

    // Update the devices and select options with the fetched data
    devices.value = [{ name: "All Devices", id: null }, ...devs];
    selectDeviceOptions.value = devices.value;
    productDeviceMappings.value = mappings;

    // Return an object containing both data sets
    return { devices, mappings };
  } catch (error) {
    // Handle errors by logging and re-throwing for further handling
    console.error("Error fetching device list:", error);
    throw error;
  }
}

// Initialize a new device creation dialog with default values
function createNewDeviceAction() {
  newDevice.value = { name: "", description: "", private: false };
  createDeviceDialog.value = true; // Show the create device dialog
}

// Handle the creation of a new device
function createNewDevice() {
  // If there are files to upload, start the upload process
  if (createDeviceFileUploaderRef.value?.uppy.getFiles()?.length > 0) {
    createDeviceFileUploaderRef.value.upload();
    return;
  }
  createNewDeviceSaveToDB(); // Save the new device to the database
}

// Save the new device to the database
function createNewDeviceSaveToDB() {
  let api = liveMode.value ? liveApi : localApi;
  if (liveMode.value) {
    delete newDevice.value.private; // Remove private field in live mode
  }

  api
    .post("modbus-register/devices", { json: newDevice.value })
    .then(async (res) => {
      res = await res.json(); // Parse the response
      getDeviceList(); // Refresh the device list
      createDeviceDialog.value = false; // Close the create device dialog
      $q.notify({
        type: "positive",
        message: "Successfully created", // Show success notification
      });
    })
    .catch((err) => {
      $q.notify({
        type: "negative",
        message: "Create device failed! " + err.message, // Show error notification
      });
    });
}

// Initialize an update device dialog with the selected device data
function updateDeviceAction(data) {
  updateDeviceDialog.value = {
    active: true,
    id: data.id,
    data: {
      name: data.name,
      description: data.description,
      private: data.private,
      image_id: data.image_id,
      image: data.image,
    },
  };
}

// Handle the update of an existing device
function updateDevice() {
  // If there are files to upload, start the upload process
  if (updateDeviceFileUploaderRef.value?.uppy.getFiles()?.length > 0) {
    updateDeviceFileUploaderRef.value.upload();
    return;
  }
  updateDeviceSaveToDB(); // Save the updated device to the database
}

// Save the updated device to the database
function updateDeviceSaveToDB() {
  delete updateDeviceDialog.value.data.image; // Remove the image field
  if (liveMode.value) {
    delete updateDeviceDialog.value.data.private; // Remove private field in live mode
  }
  let api = liveMode.value ? liveApi : localApi;
  api
    .patch("modbus-register/devices/" + updateDeviceDialog.value.id, {
      json: updateDeviceDialog.value.data,
    })
    .then(async (res) => {
      res = await res.json(); // Parse the response
      getDeviceList(); // Refresh the device list
      updateDeviceDialog.value.active = false; // Close the update device dialog
      $q.notify({
        type: "positive",
        message: "Successfully updated", // Show success notification
      });
    })
    .catch((err) => {
      $q.notify({
        type: "negative",
        message: "Update device failed! " + err.message, // Show error notification
      });
    });
}

// Handle the event when a new device image is uploaded
function updateDeviceImageUploaded(event) {
  // Extract the uploaded file object from the event
  const file = event.body;

  // Update the image_id property of the device data in the update dialog
  updateDeviceDialog.value.data.image_id = file.id;

  // Call the function to save the updated device data to the database
  updateDeviceSaveToDB();
}

// Function to display a confirmation dialog before deleting a device
function deleteDeviceAction(data) {
  // Configure the confirmation dialog options
  $q.dialog({
    title: "Delete Device",
    message: "Are you sure you want to delete this device?",
    ok: {
      label: "Yes",
      color: "negative", // Highlight the button for confirmation
    },
    cancel: "No",
  }).onOk(() => {
    // Proceed with deletion if confirmed
    deleteDevice(data);
  });
}

// Function to delete a device from the server
function deleteDevice(data) {
  // Determine the appropriate API endpoint based on live mode
  let api = liveMode.value ? liveApi : localApi;

  // Send a DELETE request to the API endpoint with the device ID
  api
    .delete("modbus-register/devices/" + data.id)
    .then(async (res) => {
      // Parse the JSON response from the server
      res = await res.json();

      // Refresh the device list after successful deletion
      getDeviceList();

      // Display a success notification
      $q.notify({
        type: "positive",
        message: "Successfully deleted",
      });
    })
    .catch((err) => {
      // Display an error notification if deletion fails
      $q.notify({
        type: "negative",
        message: "Delete device failed! " + err.message,
      });
    });
}

// Function to toggle the visibility of an action menu
function actionMenuToggle(id) {
  // Get the element with the specified ID (presumably the action menu)
  const menuElement = document.getElementById(id);

  // Toggle the "active" class on the element to show or hide the menu
  menuElement.classList.toggle("active");
}

function newDeviceImageUploaded(event) {
  const file = event.body;
  newDevice.value.image_id = file.id; // Update the new device's image ID
  createNewDeviceSaveToDB(); // Save the new device to the database
}

// Trigger the reload of data (device list and grid) from the server
function reloadData() {
  getDeviceList(); // Refresh the device list
  gridApi.value.refreshServerSide(); // Refresh the grid data
}

// Approve changes made to a device
function approveDeviceChanges(device) {
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  liveApi
    .patch("modbus-register/devices/" + device.id + "/approve")
    .then(async (_res) => {
      $q.notify({
        type: "positive",
        message: "Successfully approved",
      });
      getDeviceList(); // Refresh the device list
      device.action = "APPROVED"; // Update device action status
    });
  reviewDeviceAddedDialog.value.active = false;
  reviewDeviceChangesDialog.value.active = false;
  device.action = "APPROVED";
  updateEntryRelatedNotificationStatus(device, "ADMIN_APPROVED", "DEVICE");
}

// Reject changes made to a device
function rejectDeviceChanges(device) {
  if (isOnline.value === false) {
    $q.notify({
      type: "negative",
      message: "You are offline!",
    });
    return;
  }
  liveApi
    .patch("modbus-register/devices/" + device.id + "/reject")
    .then(async (_res) => {
      $q.notify({
        type: "positive",
        message: "Successfully rejected",
      });
      getDeviceList(); // Refresh the device list
      device.action = "REJECTED"; // Update device action status
    });
  reviewDeviceAddedDialog.value.active = false;
  reviewDeviceChangesDialog.value.active = false;
  device.action = "REJECTED";
  updateEntryRelatedNotificationStatus(device, "ADMIN_REJECTED", "DEVICE");
}
</script>

<style>
.toolbar-input {
  color: white;
  width: 30%;
}
.toolbar-input input {
  color: white;
}
.q-field--focused.toolbar-input input,
.q-field--focused.toolbar-input .q-icon {
  color: black !important;
}

.data-table {
  max-height: 100%;
}
.ag-row .row-actions {
  visibility: hidden;
  position: absolute;
  top: 0;
  right: 0;
}
.ag-row:hover .row-actions {
  visibility: visible;
}
.select-device.q-field--auto-height.q-field--dense .q-field__control {
  align-items: center;
}

.device-list-item:hover .device-action-btn,
.device-list-item .device-action-btn.active {
  z-index: 1;
  display: inline-flex !important;
}

@media (min-width: 1001px) {
  .select-device {
    min-width: 800px;
  }
}
</style>
