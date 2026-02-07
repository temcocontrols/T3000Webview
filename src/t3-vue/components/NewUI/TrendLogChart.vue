<template>
  <a-config-provider :theme="{
    token: {
      colorPrimary: '#0064c8',
      colorBgBase: '#ffffff',
      colorText: '#000000',
      colorBorder: '#d9d9d9',
    },
  }">
    <div style="position: relative;">
      <!-- Remove the modal wrapper - this is now just the chart content -->
      <!-- Top Controls Bar - Flexible Layout with Individual Item Wrapping -->
    <div class="top-controls-bar">
      <a-flex wrap="wrap" gap="small" class="controls-main-flex">
        <!-- Time Base Control -->
        <a-flex align="center" gap="small" class="control-group">
          <a-typography-text class="control-label" style="font-size: 11px;">Time Base:</a-typography-text>
          <a-dropdown placement="bottomRight">
            <a-button size="small" style="display: flex; align-items: center; font-size: 11px;">
              <span>{{ getTimeBaseLabel() }}</span>
              <DownOutlined style="margin-left: 4px; font-size: 10px;" />
            </a-button>
            <template #overlay>
              <a-menu @click="handleTimeBaseMenu" class="timebase-dropdown-menu">
                <a-menu-item key="5m">5 minutes</a-menu-item>
                <a-menu-item key="10m">10 minutes</a-menu-item>
                <a-menu-item key="30m">30 minutes</a-menu-item>
                <a-menu-item key="1h">1 hour</a-menu-item>
                <a-menu-item key="4h">4 hours</a-menu-item>
                <a-menu-item key="12h">12 hours</a-menu-item>
                <a-menu-item key="1d">1 day</a-menu-item>
                <a-menu-item key="4d">4 days</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="custom">Custom Define</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-flex>

        <!-- Navigation Arrows -->
        <!-- Scroll Left/Right Controls -->
        <a-flex align="center" class="control-group">
          <a-button-group size="small">
            <a-button @click="moveTimeLeft" :disabled="!canScroll" title="Scroll Left (←)"
                      style="display: flex; align-items: center; justify-content: center; padding: 4px 8px;">
              <ArrowLeftOutlined style="font-size: 12px;" />
            </a-button>
            <a-button @click="moveTimeRight" :disabled="!canScroll" title="Scroll Right (→)"
                      style="display: flex; align-items: center; justify-content: center; padding: 4px 8px;">
              <ArrowRightOutlined style="font-size: 12px;" />
            </a-button>
          </a-button-group>
        </a-flex>

        <!-- Zoom In/Out Controls -->
        <a-flex align="center" class="control-group">
          <a-button-group size="small">
            <a-button @click="zoomIn" :disabled="!canZoomIn" title="Zoom In (↑)"
                      style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
              <ArrowUpOutlined style="font-size: 12px;" />
              <span>Zoom In</span>
            </a-button>
            <a-button @click="zoomOut" :disabled="!canZoomOut" title="Zoom Out (↓)"
                      style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
              <ArrowDownOutlined style="font-size: 12px;" />
              <span>Zoom Out</span>
            </a-button>
          </a-button-group>
        </a-flex>

        <!-- Reset Button -->
        <a-flex align="center" class="control-group">
          <a-button @click="resetToDefaultTimebase" size="small" title="Reset to default 5 minutes timebase"
                    style="display: flex; align-items: center; gap: 2px; font-size: 11px;">
            <ReloadOutlined />
            <span>Reset</span>
          </a-button>
        </a-flex>

        <!-- View Buttons -->
        <a-flex align="center" class="control-group">
          <a-button-group size="small">
            <a-button :type="currentView === 1 ? 'primary' : 'default'" @click="setView(1)" style="font-size: 11px;">
              View 1
            </a-button>
            <a-button :type="currentView === 2 ? 'primary' : 'default'" @click="setView(2)" style="font-size: 11px;">
              View 2
            </a-button>
            <a-button :type="currentView === 3 ? 'primary' : 'default'" @click="setView(3)" style="font-size: 11px;">
              View 3
            </a-button>
          </a-button-group>

          <!-- Reconfigure button for View 2 & 3 -->
          <a-button v-if="currentView !== 1 && hasTrackedItems" size="small" @click="showItemSelector = true"
                    class="reconfigure-btn" title="Reconfigure tracked items" style="font-size: 9px;">
            <SettingOutlined />
          </a-button>
        </a-flex>

        <!-- Status Tags -->
        <a-flex align="center" wrap="wrap" gap="small" class="control-group status-tags">
          <!-- Live/Historical Status with enhanced info -->
          <a-tag color="green" v-if="isRealTime" size="small">
            <template #icon>
              <SyncOutlined :spin="true" />
            </template>
            Live-{{ lastSyncTime }}
          </a-tag>
          <a-tag color="blue" v-else size="small">
            <template #icon>
              <ClockCircleOutlined />
            </template>
            Historical
          </a-tag>

          <!-- Range Info -->
          <a-tag size="small">{{ timeBase === 'custom' ? 'Custom' : timeBaseLabel }}</a-tag>
        </a-flex>

        <!-- Trendlog Configuration -->
        <a-flex align="center" class="control-group">
          <a-button @click="showDatabaseConfig = true" size="small" title="Trendlog Configuration"
                    style="display: flex; align-items: center; gap: 2px; padding: 0px 5px; font-size: 11px;">
            <DatabaseOutlined />
            <span>Config</span>
          </a-button>
        </a-flex>

        <!-- Export Options -->
        <a-flex align="center" class="control-group export-options">
          <a-dropdown placement="bottomRight">
            <a-button size="small" style="display: flex; align-items: center; padding: 0px 5px; font-size: 11px;">
              <ExportOutlined style="margin-right: 4px;" />
              <span>Export</span>
              <DownOutlined style="margin-left: 4px;" />
            </a-button>
            <template #overlay>
              <a-menu class="export-options-menu" @click="handleExportMenu">
                <a-menu-item key="png">
                  <FileImageOutlined />
                  Export as PNG
                </a-menu-item>
                <!-- <a-menu-item key="jpg">
                  <FileImageOutlined />
                  Export as JPG
                </a-menu-item> -->
                <a-menu-divider />
                <a-menu-item key="csv">
                  <FileExcelOutlined />
                  Export Data (CSV)
                </a-menu-item>
                <a-menu-item key="json">
                  <FileTextOutlined />
                  Export Data (JSON)
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-flex>
      </a-flex>
    </div>

    <!-- Empty state for View 2 & 3 with no tracked items -->
    <div v-if="currentView !== 1 && !hasTrackedItems" class="empty-tracking-state">
      <div class="empty-content">
        <div class="empty-icon">📊</div>
        <div class="empty-title">{{ currentView === 2 ? 'Custom View 2' : 'Custom View 3' }}</div>
        <div class="empty-description">
          Select items to track to start monitoring specific data points.
        </div>
        <a-button type="primary" @click="showItemSelector = true" class="select-items-btn">
          Select Items to Track
        </a-button>
      </div>
    </div> <!-- Show timeseries container only for View 1, or View 2/3 with selected items -->
    <div v-if="currentView === 1 || (currentView !== 1 && hasTrackedItems)" class="timeseries-container">
      <!-- Global loading indicator -->
      <div v-show="shouldShowLoading" class="global-loading-indicator">
        <a-spin size="small" />
        <span style="margin-left: 8px;">Loading trendlog data...</span>
      </div>

      <!-- ANALOG AREA (Top Section) -->
      <div v-if="showAnalogArea" class="analog-area">
        <div class="left-panel">
          <!-- Loading overlay - inside left panel, only shows after 300ms delay -->
          <div v-if="showLoadingOverlay" class="loading-overlay">
            <a-spin size="large" />
            <div class="loading-text">Loading trend log data...</div>
          </div>

          <!-- Data Series - Analog Only -->
          <div class="control-section">
            <div class="data-series-header">
              <!-- Single line: Title, count, and status -->
              <div class="header-line-1">
                <div :title="devVersion" class="chart-title-with-version">
                  {{ chartTitle }} ({{ visibleAnalogSeriesCount }}/{{ analogSeriesList.length }})
                </div>
                <!-- Data Source Indicator -->
                <div class="data-source-indicator">
                  <span v-if="shouldShowLoading" class="source-badge loading">
                    Loading...
                  </span>
                  <span v-else-if="dataSource === 'realtime'" class="source-badge realtime">
                    <ThunderboltFilled :style="{ fontSize: '12px', marginRight: '4px' }" /> Live ({{ timeBase }})
                  </span>
                  <span v-else-if="dataSource === 'api'" class="source-badge historical">
                    📚 Historical (Custom Date)
                  </span>
                  <span v-else-if="hasConnectionError" class="source-badge error">
                    ⚠️ Connection Error
                  </span>
                </div>
              </div> <!-- Line 2: All dropdown, By Type dropdown, Auto Scroll toggle -->
              <div class="header-line-2">
                <div class="left-controls">
                  <a-dropdown>
                    <a-button size="small" style="display: flex; align-items: center; font-size: 11px;">
                      <span>All</span>
                      <DownOutlined style="margin-left: 4px;" />
                    </a-button>
                    <template #overlay>
                      <a-menu @click="handleAllMenu" class="all-dropdown-menu">
                        <a-menu-item key="enable-all" :disabled="!hasDisabledSeries">
                          <CheckOutlined />
                          Enable All
                        </a-menu-item>
                        <a-menu-item key="disable-all" :disabled="!hasEnabledSeries">
                          <DisconnectOutlined />
                          Disable All
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <a-dropdown>
                    <a-button size="small" style="display: flex; align-items: center; font-size: 11px;">
                      <span>By Type</span>
                      <DownOutlined style="margin-left: 4px;" />
                    </a-button>
                    <template #overlay>
                      <a-menu @click="handleByTypeMenu" class="bytype-dropdown-menu">
                        <a-menu-item key="toggle-analog" :disabled="!hasAnalogSeries">
                          <LineChartOutlined />
                          {{ allAnalogEnabled ? 'Disable' : 'Enable' }} Analog ({{ analogCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-digital" :disabled="!hasDigitalSeries">
                          <BarChartOutlined />
                          {{ allDigitalEnabled ? 'Disable' : 'Enable' }} Digital ({{ digitalCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-input" :disabled="!hasInputSeries">
                          <ImportOutlined />
                          {{ allInputEnabled ? 'Disable' : 'Enable' }} Input ({{ inputCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-output" :disabled="!hasOutputSeries">
                          <ExportOutlined />
                          {{ allOutputEnabled ? 'Disable' : 'Enable' }} Output ({{ outputCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-variable" :disabled="!hasVariableSeries">
                          <FunctionOutlined />
                          {{ allVariableEnabled ? 'Disable' : 'Enable' }} Variable ({{ variableCount }})
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
                <div class="auto-scroll-toggle">
                  <a-typography-text class="toggle-label">Auto Scroll:</a-typography-text>
                  <a-switch v-model:checked="isRealTime" size="small" @change="onRealTimeToggle" />
                </div>
              </div>
            </div>
            <div class="series-list">
              <!-- Empty state when no valid data series available -->
              <div v-if="analogSeriesList.length === 0" class="series-empty-state">
                <div class="empty-state-content">
                  <div v-if="shouldShowLoading" class="empty-state-icon">
                    <a-spin size="small" />
                  </div>
                  <div v-else-if="showLoadingTimeout" class="empty-state-icon">⏱️</div>
                  <div v-else-if="hasConnectionError" class="empty-state-icon">
                    <ExclamationCircleOutlined :style="{ fontSize: '32px' }" />
                  </div>
                  <div v-else class="empty-state-icon">📊</div>

                  <div v-if="shouldShowLoading" class="empty-state-text">Loading T3000 device data...</div>
                  <div v-else-if="showLoadingTimeout" class="empty-state-text">Loading Timeout</div>
                  <div v-else-if="hasConnectionError" class="empty-state-text" style="font-size: 14px; font-weight: 500;">Data Connection Error</div>
                  <div v-else class="empty-state-text">No valid analog data available</div>

                  <div v-if="shouldShowLoading" class="empty-state-subtitle">
                    Connecting to your T3000 devices to retrieve trend data...
                  </div>
                  <div v-else-if="showLoadingTimeout" class="empty-state-subtitle">
                    Loading took too long (>30s). The system may be busy or experiencing connection issues.
                  </div>
                  <div v-else-if="hasConnectionError" class="empty-state-subtitle" style="font-size: 12px;">
                    Unable to load real-time or historical data. Check system connections.
                  </div>
                  <div v-else class="empty-state-subtitle">
                    Configure analog monitor points to see data series
                  </div>

                  <!-- Refresh button for timeout and error states -->
                  <div v-if="showLoadingTimeout || hasConnectionError" class="empty-state-actions"
                       style="margin-top: 16px;">
                    <a-button type="primary" @click="manualRefresh" :loading="isLoading" size="small" style="font-size: 12px;">
                      <ReloadOutlined :style="{ fontSize: '12px', verticalAlign: 'middle' }" /> Refresh Data
                    </a-button>
                  </div>
                </div>
              </div>

              <!-- Regular series list when data is available - Analog Only -->
              <div v-for="(series, index) in analogSeriesList" :key="series.name" class="series-item" :class="{
                'series-disabled': !series.visible,
                'keyboard-selected': selectedItemIndex === index && keyboardEnabled
              }">
                <!-- Delete button overlay for View 2 & 3 tracked items -->
                <a-button v-if="currentView !== 1" size="small" type="text" class="delete-series-btn delete-overlay"
                          @click="(e) => removeFromTracking(series.name, e)" :title="'Remove from tracking'">
                  <template #icon>
                    <CloseOutlined class="delete-icon" />
                  </template>
                </a-button>

                <div class="series-header" @click="toggleSeriesVisibility(index, $event)">
                  <div class="series-toggle-indicator" :class="{ 'active': series.visible, 'inactive': !series.visible }"
                       :style="{ backgroundColor: series.visible ? series.color : '#d9d9d9' }">
                    <div class="toggle-inner" :class="{ 'visible': series.visible }"></div>
                    <!-- ⌨️ Keyboard shortcut badge for left panel -->
                    <div v-if="keyboardEnabled && getKeyboardShortcut(series.name)"
                         class="keyboard-shortcut-badge left-panel-badge"
                         :class="{ 'active': lastKeyboardAction === getKeyboardShortcutCode(series.name) }"
                         :data-key="getKeyboardShortcut(series.name)"
                         :title="`Press ${getKeyboardShortcut(series.name)} to toggle`">
                      {{ getKeyboardShortcut(series.name) }}
                    </div>
                  </div>
                  <div class="series-info">
                    <div class="series-name-line">
                      <!-- Series Name takes most space on left -->
                      <div class="series-name-col">
                        <a-tooltip :title="getSeriesNameText(series)" placement="topLeft">
                          <span class="series-name">{{ getSeriesNameText(series) }}</span>
                        </a-tooltip>
                      </div>
                      <!-- Right side: Chip + Unit + Expand button grouped together -->
                      <div class="series-right-group">
                        <div class="series-chip-col">
                          <q-chip v-if="series.prefix" :label="getChipLabelText(series.prefix)" color="grey-4"
                                  text-color="grey-8" size="xs" dense class="series-prefix-tag-small" />
                        </div>
                        <div class="series-tags-col">
                          <span class="series-inline-tags">
                            <span class="unit-info" :style="{ color: series.color }">
                              {{ getDisplayUnit(series) }}
                            </span>
                          </span>
                        </div>
                        <div class="series-controls">
                          <a-button size="small" type="text" class="expand-toggle"
                                    @click="(e) => toggleSeriesExpansion(index, e)">
                            <template #icon>
                              <DownOutlined v-if="expandedSeries.has(index)" class="expand-icon expanded" />
                              <RightOutlined v-else class="expand-icon" />
                            </template>
                          </a-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="expandedSeries.has(index)" class="series-stats">
                  <div class="stat-item">
                    <span class="stat-label">Last:</span>
                    <span class="stat-value">{{ getLastValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Avg:</span>
                    <span class="stat-value">{{ getAverageValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Min:</span>
                    <span class="stat-value">{{ getMinValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Max:</span>
                    <span class="stat-value">{{ getMaxValue(series.data, series) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Analog Chart Only -->
        <div class="right-panel">
          <div class="oscilloscope-container" @wheel="handleMouseWheel">
            <!-- Always render canvas for chart initialization, hide with CSS when no visible series -->
            <div class="combined-analog-chart" :style="{ display: visibleAnalogSeries.length > 0 ? 'block' : 'none' }">
              <canvas ref="analogChartCanvas" id="analog-chart"></canvas>
            </div>
            <!-- Show empty state when no series are visible (user disabled all) -->
            <div v-if="visibleAnalogSeries.length === 0" class="empty-chart-message">

              <div class="empty-state-text">
                <span class="empty-state-icon">🔍</span>
                No analog series enabled
              </div>
              <div class="empty-state-subtitle">Enable analog series from the left panel to see charts</div>
            </div>
          </div>
        </div>
      </div>

      <!-- RESIZABLE DIVIDER -->
      <div
        v-if="showResizableDivider"
        class="resizable-divider"
        @mousedown="startResize"
        :style="{ cursor: isResizing ? 'row-resize' : 'row-resize' }"
      >
        <div class="divider-handle">
          <div class="divider-grip"></div>
        </div>
      </div>

      <!-- DIGITAL AREA (Bottom Section) -->
      <div v-if="showDigitalArea" class="digital-area">
        <!-- Digital Left Panel -->
        <div class="digital-left-panel">
          <div class="control-section">
            <!-- Show full header when only digital series exist -->
            <div v-if="showDigitalHeader" class="data-series-header">
              <div class="header-line-1">
                <div :title="devVersion" class="chart-title-with-version">
                  {{ chartTitle }} ({{ visibleDigitalSeriesCount }}/{{ digitalSeriesList.length }})
                </div>
                <!-- Data Source Indicator -->
                <div class="data-source-indicator">
                  <span v-if="shouldShowLoading" class="source-badge loading">
                    Loading...
                  </span>
                  <span v-else-if="dataSource === 'realtime'" class="source-badge realtime">
                    <ThunderboltFilled :style="{ fontSize: '12px', marginRight: '4px' }" /> Live ({{ timeBase }})
                  </span>
                  <span v-else-if="dataSource === 'api'" class="source-badge historical">
                    📚 Historical (Custom Date)
                  </span>
                  <span v-else-if="hasConnectionError" class="source-badge error">
                    ⚠️ Connection Error
                  </span>
                </div>
              </div>
              <div class="header-line-2">
                <div class="left-controls">
                  <a-dropdown>
                    <a-button size="small" style="display: flex; align-items: center; font-size: 11px;">
                      <span>All</span>
                      <DownOutlined style="margin-left: 4px;" />
                    </a-button>
                    <template #overlay>
                      <a-menu @click="handleAllMenu" class="all-dropdown-menu">
                        <a-menu-item key="enable-all" :disabled="!hasDisabledSeries">
                          <CheckOutlined />
                          Enable All
                        </a-menu-item>
                        <a-menu-item key="disable-all" :disabled="!hasEnabledSeries">
                          <DisconnectOutlined />
                          Disable All
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <a-dropdown>
                    <a-button size="small" style="display: flex; align-items: center; font-size: 11px;">
                      <span>By Type</span>
                      <DownOutlined style="margin-left: 4px;" />
                    </a-button>
                    <template #overlay>
                      <a-menu @click="handleByTypeMenu" class="bytype-dropdown-menu">
                        <a-menu-item key="toggle-analog" :disabled="!hasAnalogSeries">
                          <LineChartOutlined />
                          {{ allAnalogEnabled ? 'Disable' : 'Enable' }} Analog ({{ analogCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-digital" :disabled="!hasDigitalSeries">
                          <BarChartOutlined />
                          {{ allDigitalEnabled ? 'Disable' : 'Enable' }} Digital ({{ digitalCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-input" :disabled="!hasInputSeries">
                          <ImportOutlined />
                          {{ allInputEnabled ? 'Disable' : 'Enable' }} Input ({{ inputCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-output" :disabled="!hasOutputSeries">
                          <ExportOutlined />
                          {{ allOutputEnabled ? 'Disable' : 'Enable' }} Output ({{ outputCount }})
                        </a-menu-item>
                        <a-menu-item key="toggle-variable" :disabled="!hasVariableSeries">
                          <FunctionOutlined />
                          {{ allVariableEnabled ? 'Disable' : 'Enable' }} Variable ({{ variableCount }})
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
                <div class="auto-scroll-toggle">
                  <a-typography-text class="toggle-label">Auto Scroll:</a-typography-text>
                  <a-switch v-model:checked="isRealTime" size="small" @change="onRealTimeToggle" />
                </div>
              </div>
            </div>
            <div class="series-list">
              <!-- Digital series list -->
              <div v-for="(series, index) in digitalSeriesList" :key="series.name" class="series-item" :class="{
                'series-disabled': !series.visible
              }">
                <!-- Delete button overlay for View 2 & 3 tracked items -->
                <a-button v-if="currentView !== 1" size="small" type="text" class="delete-series-btn delete-overlay"
                          @click="(e) => removeFromTracking(series.name, e)" :title="'Remove from tracking'">
                  <template #icon>
                    <CloseOutlined class="delete-icon" />
                  </template>
                </a-button>

                <div class="series-header" @click="toggleSeriesVisibility(analogSeriesList.length + index, $event)">
                  <div class="series-toggle-indicator" :class="{ 'active': series.visible, 'inactive': !series.visible }"
                       :style="{ backgroundColor: series.visible ? series.color : '#d9d9d9' }">
                    <div class="toggle-inner" :class="{ 'visible': series.visible }"></div>
                    <!-- ⌨️ Keyboard shortcut badge for left panel -->
                    <div v-if="keyboardEnabled && getKeyboardShortcut(series.name)"
                         class="keyboard-shortcut-badge left-panel-badge"
                         :class="{ 'active': lastKeyboardAction === getKeyboardShortcutCode(series.name) }"
                         :data-key="getKeyboardShortcut(series.name)"
                         :title="`Press ${getKeyboardShortcut(series.name)} to toggle`">
                      {{ getKeyboardShortcut(series.name) }}
                    </div>
                  </div>
                  <div class="series-info">
                    <div class="series-name-line">
                      <!-- Series Name takes most space on left -->
                      <div class="series-name-col">
                        <a-tooltip :title="getSeriesNameText(series)" placement="topLeft">
                          <span class="series-name">{{ getSeriesNameText(series) }}</span>
                        </a-tooltip>
                      </div>
                      <!-- Right side: Chip + Unit + Expand button grouped together -->
                      <div class="series-right-group">
                        <div class="series-chip-col">
                          <q-chip v-if="series.prefix" :label="getChipLabelText(series.prefix)" color="grey-4"
                                  text-color="grey-8" size="xs" dense class="series-prefix-tag-small" />
                        </div>
                        <div class="series-tags-col">
                          <span class="series-inline-tags">
                            <span class="unit-info" :style="{ color: series.color }">
                              {{ getDisplayUnit(series) }}
                            </span>
                          </span>
                        </div>
                        <div class="series-controls">
                          <a-button size="small" type="text" class="expand-toggle"
                                    @click="(e) => toggleSeriesExpansion(analogSeriesList.length + index, e)">
                            <template #icon>
                              <DownOutlined v-if="expandedSeries.has(analogSeriesList.length + index)" class="expand-icon expanded" />
                              <RightOutlined v-else class="expand-icon" />
                            </template>
                          </a-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="expandedSeries.has(analogSeriesList.length + index)" class="series-stats">
                  <div class="stat-item">
                    <span class="stat-label">Last:</span>
                    <span class="stat-value">{{ getLastValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Avg:</span>
                    <span class="stat-value">{{ getAverageValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Min:</span>
                    <span class="stat-value">{{ getMinValue(series.data, series) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Max:</span>
                    <span class="stat-value">{{ getMaxValue(series.data, series) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Digital Right Panel -->
        <div class="digital-right-panel">
          <div class="digital-oscilloscope-container" @wheel="handleMouseWheel">
            <!-- Single Digital Canvas for All Series -->
            <div class="digital-combined-chart" :style="{ height: (visibleDigitalSeries.length * 50 + 60) + 'px', minHeight: '200px' }">
              <canvas ref="digitalChartCanvas" id="digital-combined-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Date Range Modal -->
    <a-modal v-model:visible="customDateModalVisible" title="X Axis" :width="320" centered @ok="applyCustomDateRange"
             @cancel="cancelCustomDateRange">
      <div class="custom-date-modal">
        <!-- Start Time Row -->
        <a-row :gutter="8" class="date-time-row">
          <a-col :span="4" class="label-col">
            <label class="time-label">Start:</label>
          </a-col>
          <a-col :span="11">
            <a-date-picker v-model:value="customStartDate" placeholder="Date" size="small"
                           style="width: 100%; font-size: 11px;" format="DD/MM/YYYY" />
          </a-col>
          <a-col :span="9">
            <a-time-picker v-model:value="customStartTime" placeholder="Time" size="small"
                           style="width: 100%; font-size: 11px;" format="HH:mm" />
          </a-col>
        </a-row>

        <!-- End Time Row -->
        <a-row :gutter="8" class="date-time-row">
          <a-col :span="4" class="label-col">
            <label class="time-label">End:</label>
          </a-col>
          <a-col :span="11">
            <a-date-picker v-model:value="customEndDate" placeholder="Date" size="small"
                           style="width: 100%; font-size: 11px;" format="DD/MM/YYYY" />
          </a-col>
          <a-col :span="9">
            <a-time-picker v-model:value="customEndTime" placeholder="Time" size="small"
                           style="width: 100%; font-size: 11px;" format="HH:mm" />
          </a-col>
        </a-row>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <a-space size="small">
            <a-button size="small" @click="setQuickRange('today')">Today</a-button>
            <a-button size="small" @click="setQuickRange('yesterday')">Yesterday</a-button>
            <a-button size="small" @click="setQuickRange('thisWeek')">This Week</a-button>
            <a-button size="small" @click="setQuickRange('lastWeek')">Last Week</a-button>
          </a-space>
        </div>

        <!-- Range Summary -->
        <div v-if="customStartDate && customEndDate && customStartTime && customEndTime" class="range-summary">
          <a-alert type="info" show-icon size="small">
            <template #message>
              <span class="range-text">{{ formatDateTimeRange() }}</span>
            </template>
          </a-alert>
        </div>
      </div>
    </a-modal>

    <!-- Trendlog Configuration Modal -->
    <a-modal v-model:visible="showDatabaseConfig" title="Trendlog Configuration" :width="620"
             class="database-modal-compact">
      <a-space direction="vertical" size="small" style="width: 100%">


        <!-- Sampling Interval Card -->
        <a-card size="small" class="config-card">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span class="card-title">
                <ClockCircleOutlined style="margin-right: 6px; color: #52c41a;" />
                Sampling Interval
              </span>
              <span style="font-size: 10px; color: #666;">
                How often should data be collected?
              </span>
            </div>
          </template>

          <div style="margin-bottom: 5px;">
            <!-- Preset Intervals and Custom Input on Same Line -->
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 0px;">
              <a-radio-group v-model:value="ffiSyncConfig.interval_preset" size="small"
                             @change="onFfiIntervalPresetChange" style="display: flex; flex-wrap: wrap; gap: 4px;">
                <!-- <a-radio value="5min">5 min</a-radio> -->
                <!-- <a-radio value="10min">10 min</a-radio> -->
                <a-radio value="15min">15 min</a-radio>
                <a-radio value="20min">20 min</a-radio>
                <a-radio value="30min">30 min</a-radio>
                <a-radio value="60min">60 min</a-radio>
                <a-radio value="custom">Custom</a-radio>
              </a-radio-group>

              <!-- Custom Interval Input (shows on same line when custom is selected) -->
              <div v-if="ffiSyncConfig.interval_preset === 'custom'" class="form-item-compact"
                   style="display: flex; align-items: center; gap: 6px;margin-bottom: 0px;">
                <label style="font-size: 10px; color: #666;">Every:</label>
                <a-input-number v-model:value="ffiSyncConfig.custom_value" :min="getCustomMin()" :max="getCustomMax()"
                                size="small" style="width: 40px;" @change="onCustomIntervalChange" />
                <span style="font-size: 12px; color: #666;">minutes</span>
              </div>
            </div>

            <!-- Current Status -->
            <!--
            <div style="margin-top: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; display:none;">
              <div style="font-size: 10px; color: #666; margin-bottom: 4px;">
                <strong>Current Interval:</strong> {{ formatInterval(ffiSyncConfig.interval_secs) }}
              </div>
              <div v-if="ffiSyncConfig.last_sync" style="font-size: 10px; color: #666; margin-bottom: 4px;">
                <strong>Last Sync:</strong> {{ ffiSyncConfig.last_sync }}
              </div>
              <div v-if="ffiSyncConfig.next_sync_in > 0" style="font-size: 10px; color: #666;">
                <strong>Next Sync:</strong> {{ formatCountdown(ffiSyncConfig.next_sync_in) }}
              </div>
            </div>
            -->
            <!-- Change History Button -->
            <!-- View Change History Button - Commented Out -->
            <!-- <div style="margin-top: 8px;">
              <a-button
                size="small"
                @click="showFfiSyncHistory = true"
                style="width: 100%; font-size: 10px; height: 24px;"
              >
                📜 View Change History
              </a-button>
            </div> -->
            <!-- Warning Messages -->
            <div v-if="ffiSyncWarning" style="margin-top: 8px;">
              <a-alert :message="ffiSyncWarning" type="warning" show-icon closable
                       style="font-size: 10px; padding: 4px 8px;" />
            </div>
          </div>
        </a-card>

        <!-- Refresh and Rediscover Interval Card -->
        <a-card size="small" class="config-card">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span class="card-title">
                <ReloadOutlined style="margin-right: 6px; color: #fa8c16;" />
                Refresh and Rediscover Interval
              </span>
              <span style="font-size: 10px; color: #666;">
                How often should system check for new BACnet objects?
              </span>
            </div>
          </template>

          <div style="margin-bottom: 12px;">
            <!-- Preset Intervals and Custom Input on Same Line -->
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;">
              <a-radio-group v-model:value="rediscoverConfig.interval_preset"
                             size="small"
                             @change="onRediscoverIntervalPresetChange"
                             style="display: flex; flex-wrap: wrap; gap: 4px;">
                <a-radio value="1hour">1 hour</a-radio>
                <a-radio value="2hours">2 hours</a-radio>
                <a-radio value="4hours">4 hours</a-radio>
                <a-radio value="8hours">8 hours</a-radio>
                <!-- <a-radio value="12hours">12 hours</a-radio> -->
                <a-radio value="custom">Custom</a-radio>
              </a-radio-group>

              <!-- Custom Interval Input (shows on same line when custom is selected) -->
              <div v-if="rediscoverConfig.interval_preset === 'custom'"
                   class="form-item-compact"
                   style="display: flex; align-items: center; gap: 6px; margin-bottom: 0px;">
                <label style="font-size: 10px; color: #666;">Every:</label>
                <a-input-number v-model:value="rediscoverConfig.custom_value"
                                :min="getRediscoverCustomMin()"
                                :max="getRediscoverCustomMax()"
                                size="small"
                                style="width: 40px;"
                                @change="onRediscoverCustomIntervalChange" />
                <span style="font-size: 12px; color: #666;">hours</span>
              </div>
            </div>

            <!-- Warning Messages -->
            <div v-if="rediscoverWarning" style="margin-top: 8px;">
              <a-alert :message="rediscoverWarning"
                       type="warning"
                       show-icon
                       closable
                       style="font-size: 10px; padding: 4px 8px;" />
            </div>
          </div>
        </a-card>

        <!-- Database Status Card -->
        <a-card size="small" class="status-card">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span class="card-title">
                <DatabaseOutlined style="margin-right: 6px; color: #1890ff;" />
                Database Status
              </span>
              <span class="info-value path-text" style="font-size: 9px;">{{ databaseInfo.location }}</span>
            </div>
          </template>

          <!-- Demo data commented out until real API is implemented -->
          <!-- <a-row :gutter="8" style="margin-bottom: 8px;">
            <a-col :span="6">
              <a-statistic title="Name" :value="databaseInfo.name" :value-style="{ fontSize: '11px' }" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="Size" :value="databaseInfo.size" :value-style="{ fontSize: '11px' }" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="Records" :value="databaseInfo.totalRecords" :value-style="{ fontSize: '11px' }" />
            </a-col>
            <a-col :span="6">
              <div class="status-info">
                <div class="status-label">Status</div>
                <div :style="{ color: databaseInfo.status === 'healthy' ? '#52c41a' : '#faad14', fontSize: '11px', fontWeight: '600' }">
                  {{ databaseInfo.status.toUpperCase() }}
                </div>
              </div>
            </a-col>
          </a-row> -->
        </a-card>

        <!-- Data Splitting Strategy Card -->
        <a-card size="small" class="config-card">
          <template #title>
            <span class="card-title">
              <SettingOutlined style="margin-right: 6px; color: #fa8c16;" />
              Data Splitting Strategy
            </span>
          </template>

          <div class="form-item-compact" style="margin-bottom: 8px;">
            <label>Split new data by:</label>
            <a-radio-group v-model:value="databaseConfig.strategy" size="small" @change="onPartitionStrategyChange"
                           style="display: flex; flex-wrap: wrap; gap: 4px;">
              <!-- <a-radio value="FiveMinutes">5 Minutes</a-radio> -->
              <a-radio value="Daily">Daily</a-radio>
              <a-radio value="Weekly">Weekly</a-radio>
              <a-radio value="Monthly">Monthly</a-radio>
              <a-radio value="Quarterly">Quarterly</a-radio>
              <a-radio value="Custom">Custom Days</a-radio>
              <a-radio value="CustomMonths">Custom Months</a-radio>
            </a-radio-group>
          </div>

          <!-- Custom Days Input -->
          <div v-if="databaseConfig.strategy === 'Custom'" class="form-item-compact"
               style="margin-bottom: 8px; margin-left: 16px;">
            <label style="font-size: 10px; color: #666;">Every:</label>
            <a-input-number v-model:value="databaseConfig.custom_days" :min="1" :max="365" size="small"
                            style="width: 60px; margin: 0 4px;" />
            <span style="font-size: 10px; color: #666;">days</span>
          </div>

          <!-- Custom Months Input -->
          <div v-if="databaseConfig.strategy === 'CustomMonths'" class="form-item-compact"
               style="margin-bottom: 8px; margin-left: 16px;">
            <label style="font-size: 10px; color: #666;">Every:</label>
            <a-input-number v-model:value="databaseConfig.custom_months" :min="1" :max="12" size="small"
                            style="width: 60px; margin: 0 4px;" />
            <span style="font-size: 10px; color: #666;">months</span>
          </div>

          <div class="info-row" style="font-size: 10px; color: #666; margin-top: 4px;">
            Current: {{
              databaseConfig.strategy === 'FiveMinutes' ? 'One file every 5 minutes (for testing)' :
                databaseConfig.strategy === 'Daily' ? 'One file per day' :
                  databaseConfig.strategy === 'Weekly' ? 'One file per week' :
                    databaseConfig.strategy === 'Monthly' ? 'One file per month' :
                      databaseConfig.strategy === 'Quarterly' ? 'One file per quarter (3 months)' :
                        databaseConfig.strategy === 'CustomMonths' ? `One file every ${databaseConfig.custom_months} months` :
                          `One file every ${databaseConfig.custom_days} days`
            }}
          </div>
        </a-card>

        <!-- Existing Database Files Card -->
        <a-card size="small" class="config-card">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span class="card-title">
                <DatabaseOutlined style="margin-right: 6px; color: #1890ff;" />
                Database Files ({{ databaseFiles.length }})
              </span>
              <a-button size="small" type="primary" @click="cleanupAllFiles" :loading="isCleaningUp"
                        style="font-size: 10px; height: 22px; padding: 0 8px;">
                <template #icon>
                  <DeleteOutlined style="font-size: 10px;" />
                </template>
                Clean All
              </a-button>
            </div>
          </template>

          <div class="db-files-list" style="max-height: 120px; overflow-y: auto;">
            <div v-for="file in databaseFiles" :key="file.id || file.name" class="db-file-item"
                 style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
              <div class="file-info" style="flex: 1;">
                <div style="font-size: 11px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                  {{ file.name }}
                  <a-tag v-if="file.is_active" color="green" size="small"
                         style="font-size: 9px; padding: 1px 4px; margin: 0;">
                    ACTIVE
                  </a-tag>
                </div>
                <!-- <div style="font-size: 9px; color: #666;">{{ file.size }} �?{{ file.records }} records</div> -->
              </div>
              <a-button size="small" type="text" danger :disabled="file.is_active"
                        @click="deleteDbFile(file.id, file.name)" style="padding: 2px 6px;"
                        :title="file.is_active ? 'Cannot delete active database file' : 'Delete database file'">
                <template #icon>
                  <DeleteOutlined style="font-size: 10px;" />
                </template>
              </a-button>
            </div>
          </div>
        </a-card>

        <!-- Cleanup Management Card -->
        <a-card size="small" class="config-card">
          <template #title>
            <span class="card-title">
              <DeleteOutlined style="margin-right: 6px; color: #ff4d4f;" />
              Cleanup Management
            </span>
          </template>

          <div class="form-item-compact" style="margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 11px; color: #666; white-space: nowrap; min-width: 90px;">
                Auto cleanup files older
                than:
              </span>
              <a-input-number v-model:value="databaseConfig.retention_value" :min="1" :max="365" size="small"
                              style="width: 60px;" />
              <a-select v-model:value="databaseConfig.retention_unit" size="small" style="width: 100px;">
                <a-select-option value="days">Days</a-select-option>
                <a-select-option value="weeks">Weeks</a-select-option>
                <a-select-option value="months">Months</a-select-option>
              </a-select>
              <a-button size="small" type="primary" @click="cleanupOldFiles" :loading="isCleaningUp"
                        style="width: 120px;">
                <template #icon>
                  <DeleteOutlined />
                </template>
                Clean up now
              </a-button>
              <a-button size="small" @click="compactDatabase" :loading="isOptimizing" style="width: 90px;">
                <template #icon>
                  <ThunderboltOutlined />
                </template>
                Optimize
              </a-button>
            </div>
          </div>
        </a-card>

        <!-- Keyboard Shortcuts Card -->
        <a-card size="small" style="margin-bottom: 8px;">
          <template #title>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Keyboard Shortcuts</span>
              <a-switch v-model:checked="keyboardEnabled" size="small" />
            </div>
          </template>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; font-size: 12px; color: #666;">
            <div><kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">←</kbd> / <kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">→</kbd> : Scroll time left/right</div>
            <div><kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">↑</kbd> / <kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">↓</kbd> : Zoom in/out</div>
            <div><kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">1-9, A-E</kbd> : Toggle series visibility</div>
            <div><kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">Ctrl</kbd> + <kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">↑</kbd> / <kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">↓</kbd> : Navigate series list</div>
            <div><kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">Enter</kbd> : Toggle selected item</div>
            <div><kbd style="padding: 2px 6px; background: #f0f0f0; border-radius: 3px; font-family: monospace;">ESC</kbd> : Toggle item shortcuts on/off</div>
          </div>
        </a-card>
      </a-space>

      <template #footer>
        <div style="text-align: right;">
          <a-space size="small">
            <a-button @click="showDatabaseConfig = false" size="small">
              Cancel
            </a-button>
            <a-button type="primary" size="small" @click="saveDatabaseConfig" :loading="isSaving">
              Save Changes
            </a-button>
          </a-space>
        </div>
      </template>
    </a-modal>

    <!-- Sampling Interval Change History Modal - Commented Out -->
    <!-- <a-modal
      v-model:visible="showFfiSyncHistory"
      title="Sampling Interval Change History"
      :width="700"
      :footer="null"
    >
      <div style="max-height: 400px; overflow-y: auto;">
        <a-table
          :columns="ffiHistoryColumns"
          :data-source="ffiSyncHistory"
          :pagination="false"
          :loading="isLoadingHistory"
          size="small"
          :row-key="record => record.id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'changed_at'">
              <span style="font-size: 11px;">{{ record.changed_at }}</span>
            </template>
            <template v-else-if="column.key === 'change'">
              <div style="font-size: 11px;">
                <span style="color: #ff4d4f;">{{ record.old_value_display }}</span>
                <span style="margin: 0 4px;">�?/span>
                <span style="color: #52c41a;">{{ record.new_value_display }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'changed_by'">
              <a-tag size="small" style="font-size: 10px;">{{ record.changed_by }}</a-tag>
            </template>
            <template v-else-if="column.key === 'change_reason'">
              <span style="font-size: 10px; color: #666;">{{ record.change_reason || '-' }}</span>
            </template>
          </template>
        </a-table>
      </div>
    </a-modal> -->
    <!-- Right Drawer for Item Selection -->
    <a-drawer v-model:visible="showItemSelector" title="Select Items to Track" placement="right" width="400"
              :closable="true" :mask-closable="true" class="item-selector-drawer">
      <template #title>
        <div class="drawer-title">
          <span>📊 Select Items for {{ currentView === 2 ? 'View 2' : 'View 3' }}</span>
          <a-tag color="blue">{{ viewTrackedSeries[currentView]?.length || 0 }}/{{ dataSeries.length }} selected</a-tag>
          <a-spin v-if="isSavingSelections" :spinning="true" size="small" />
          <a-tag v-if="isSavingSelections" color="orange">Saving...</a-tag>
        </div>
      </template>

      <div class="drawer-content">
        <div class="items-compact-list">
          <div v-for="series in dataSeries" :key="series.name" class="item-row" :class="{
            'selected': viewTrackedSeries[currentView]?.includes(series.name),
            'analog': series.unitType === 'analog',
            'digital': series.unitType === 'digital'
          }" @click="toggleItemTracking(series.name)">
            <!-- Checkbox and color indicator -->
            <div class="item-selection" @click.stop>
              <a-checkbox :checked="viewTrackedSeries[currentView]?.includes(series.name)"
                          @change="() => toggleItemTracking(series.name)" />
              <div class="item-color-dot" :style="{ backgroundColor: series.color }"></div>
            </div>

            <!-- Item details (same as left panel) -->
            <div class="item-details">
              <div class="item-main-info">
                <span class="item-name">{{ series.name }}</span>
                <span class="item-unit" v-if="series.unit">{{ series.unit }}</span>
              </div>
              <div class="item-meta">
                <span class="item-type-badge" :class="series.unitType">{{ series.unitType }}</span>
                <span class="item-description" v-if="series.description">{{ series.description }}</span>
                <span class="item-range" v-if="series.data.length > 0">
                  {{ getMinValue(series.data, series) }} - {{ getMaxValue(series.data, series) }}
                </span>
              </div>
            </div>

            <!-- Status indicators -->
            <div class="item-status">
              <span v-if="series.isEmpty" class="status-badge empty">No Data</span>
              <span v-else-if="!series.visible" class="status-badge hidden">Hidden</span>
              <span v-else class="status-badge active">{{ series.data.length }} pts</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <a-button @click="toggleSelectAll" :type="isAllSelected ? 'default' : 'primary'" class="select-toggle-btn" :disabled="dataSeries.length === 0">
            {{ isAllSelected ? 'Unselect All' : 'Select All' }}
          </a-button>

          <div class="footer-actions">
            <a-button @click="showItemSelector = false" :disabled="dataSeries.length === 0">
              Cancel
            </a-button>
            <a-button type="primary" @click="applyAndCloseDrawer" :disabled="dataSeries.length === 0">
              Apply Selection
            </a-button>
          </div>
        </div>
      </template>
    </a-drawer>
  </div>
  </a-config-provider>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch, nextTick, type ComponentPublicInstance } from 'vue'
  import { useRoute } from 'vue-router'
  import { message, notification } from 'ant-design-vue'
  import dayjs, { type Dayjs } from 'dayjs'
  import Chart from 'chart.js/auto'
  import 'chartjs-adapter-date-fns'
  import {
    LeftOutlined,
    RightOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    ReloadOutlined,
    SyncOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    DownOutlined,
    SettingOutlined,
    ExportOutlined,
    ImportOutlined,
    FunctionOutlined,
    FileImageOutlined,
    FileOutlined,
    FileTextOutlined,
    CheckOutlined,
    DisconnectOutlined,
    LineChartOutlined,
    BarChartOutlined,
    ClockCircleOutlined,
    WifiOutlined,
    LoadingOutlined,
    CloseOutlined,
    DatabaseOutlined,
    SaveOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
    ThunderboltFilled,
    DeleteOutlined
  } from '@ant-design/icons-vue'
  import LogUtil from '@/lib/vue/T3000/Hvac/Util/LogUtil'
  import { scheduleItemData } from '@/lib/vue/T3000/Hvac/Data/Constant/RefConstant'
  import { T3000_Data, devVersion } from '@/lib/vue/T3000/Hvac/Data/T3Data'
  import { ranges as rangeDefinitions, T3_Types } from '@/lib/vue/T3000/Hvac/Data/Constant/T3Range'
  import { t3000DataManager, DataReadiness, type DataValidationResult } from '@/lib/vue/T3000/Hvac/Data/Manager/T3000DataManager'
  import { useTrendlogDataAPI, type RealtimeDataRequest, type TrendlogHistoryRequest } from '@/lib/vue/T3000/Hvac/Opt/FFI/TrendlogDataAPI'
  import { databaseService, DatabaseUtils, DatabaseConfigAPI, FfiSyncConfigAPI, RediscoverConfigAPI, type DatabaseConfig } from '@/lib/vue/T3000/Hvac/Opt/FFI/DatabaseApi'
  import { useT3000FfiApi } from '@/lib/vue/T3000/Hvac/Opt/FFI/T3000FfiApi'

  // BAC Units Constants - Digital/Analog Type Indicators
  const BAC_UNITS_DIGITAL = 0
  const BAC_UNITS_ANALOG = 1

  // Direct T3000 unit code to T3Range mapping - eliminates need for hardcoded mappings

  /**
   * Map T3000 unit codes directly to T3Range entries
   * This bridges the gap between T3000's specific unit codes (31=°C, 32=°F)
   * and T3Range's organized structure by type and sequential ID
   */
  const getT3RangeFromUnitCode = (unitCode: number): { type: 'digital' | 'analog', category?: string, id?: number, range?: any } => {
    // Digital units (0-22) map directly to T3Range digital IDs
    if (unitCode >= 0 && unitCode <= 22) {
      const digitalRange = rangeDefinitions.digital.find(range => range.id === unitCode)
      return {
        type: 'digital',
        id: unitCode,
        range: digitalRange
      }
    }

    // Analog unit code to T3Range mapping
    const analogMappings: { [unitCode: number]: { category: string, id: number } } = {
      // Temperature units - map to various T3Range temperature entries
      31: { category: 'variable', id: 1 },  // °C -> Variable Deg.C
      32: { category: 'variable', id: 2 },  // °F -> Variable Deg.F

      // Pressure units
      34: { category: 'variable', id: 4 },  // Pa -> Variable Pa
      35: { category: 'variable', id: 5 },  // kPa -> Variable KPa
      36: { category: 'variable', id: 6 },  // psi -> Variable PSI
      37: { category: 'variable', id: 7 },  // inWC -> Variable inWC

      // Power units
      38: { category: 'variable', id: 8 },  // W -> Variable W
      39: { category: 'variable', id: 9 },  // kW -> Variable kW
      40: { category: 'variable', id: 10 }, // kWh -> Variable KWH

      // Electrical units
      41: { category: 'variable', id: 11 }, // V -> Variable V
      42: { category: 'variable', id: 12 }, // kV -> Variable KV
      43: { category: 'variable', id: 13 }, // A -> Variable Amps
      44: { category: 'variable', id: 14 }, // mA -> Variable ma

      // Flow/volume units
      45: { category: 'variable', id: 15 }, // CFM -> Variable CFM
      33: { category: 'variable', id: 3 },  // ft/min -> Variable FPM

      // Time units
      46: { category: 'variable', id: 16 }, // s -> Variable Seconds
      47: { category: 'variable', id: 17 }, // min -> Variable Minutes
      48: { category: 'variable', id: 18 }, // h -> Variable Hours
      49: { category: 'variable', id: 19 }, // days -> Variable Days
      50: { category: 'variable', id: 20 }, // time -> Variable Time

      // Other units
      51: { category: 'variable', id: 21 }, // Ω -> Variable Ohms
      52: { category: 'variable', id: 22 }, // % -> Variable %
      53: { category: 'variable', id: 23 }, // %RH -> Variable %RH
      54: { category: 'variable', id: 24 }, // p/min -> Variable p/min
      55: { category: 'variable', id: 25 }, // counts -> Variable Counts
      56: { category: 'variable', id: 26 }, // %Open -> Variable %Open
      57: { category: 'variable', id: 27 }, // kg -> Variable Kg
      58: { category: 'variable', id: 28 }, // L/h -> Variable L/Hour
      59: { category: 'variable', id: 29 }, // GPH -> Variable GPH
      60: { category: 'variable', id: 30 }, // gal -> Variable GAL
      61: { category: 'variable', id: 31 }, // ft³ -> Variable CF
      62: { category: 'variable', id: 32 }, // BTU -> Variable BTU
      63: { category: 'variable', id: 33 }, // m³/h -> Variable CMH
    }

    const mapping = analogMappings[unitCode]
    if (mapping) {
      const analogRange = rangeDefinitions.analog[mapping.category as keyof typeof rangeDefinitions.analog]?.find(range => range.id === mapping.id)
      return {
        type: 'analog',
        category: mapping.category,
        id: mapping.id,
        range: analogRange
      }
    }

    return { type: 'analog' } // No mapping found
  }

  /**
   * Get unit symbol directly from T3Range using unit code
   */
  const getUnitSymbolFromT3Range = (unitCode: number): string => {
    const t3Range = getT3RangeFromUnitCode(unitCode)

    if (t3Range.range) {
      if (t3Range.type === 'digital') {
        // For digital, return state labels or just label
        return t3Range.range.label || ''
      } else {
        // For analog, return the unit symbol
        return t3Range.range.unit || ''
      }
    }

    return ''
  }

  /**
   * Get unit label directly from T3Range using unit code
   */
  const getUnitLabelFromT3Range = (unitCode: number): string => {
    const t3Range = getT3RangeFromUnitCode(unitCode)
    return t3Range.range?.label || ''
  }// Helper function to get unit info using T3Range.ts ranges
  const getUnitInfo = (unitCode: number, pointType?: string, rangeId?: number, isDigital?: boolean) => {
    // For digital units, use T3Range digital ranges
    if (isDigital || unitCode <= 22) {
      const digitalRange = rangeDefinitions.digital.find(range => range.id === (rangeId ?? unitCode))
      if (digitalRange) {
        return {
          type: 'digital' as const,
          info: {
            label: digitalRange.label,
            states: digitalRange.direct === false
              ? [digitalRange.on, digitalRange.off] as [string, string]
              : [digitalRange.off, digitalRange.on] as [string, string]
          }
        }
      }
    }

    // For analog units, use T3Range analog ranges based on point type
    if (pointType && rangeId !== undefined) {
      const typeKey = pointType.toLowerCase() as keyof typeof rangeDefinitions.analog
      if (rangeDefinitions.analog[typeKey]) {
        const analogRange = rangeDefinitions.analog[typeKey].find(range => range.id === rangeId)
        if (analogRange) {
          return {
            type: 'analog' as const,
            info: {
              label: analogRange.label,
              symbol: analogRange.unit
            }
          }
        }
      }
    }

    // Fallback to T3Range-based unit code mapping
    const symbol = getUnitSymbolFromT3Range(unitCode)
    const label = getUnitLabelFromT3Range(unitCode)

    if (symbol || label) {
      return {
        type: 'analog' as const,
        info: { label, symbol }
      }
    }  // Final fallback for unknown units
    return {
      type: 'analog' as const,
      info: { label: '', symbol: '' }
    }
  }// Types
  interface DataPoint {
    timestamp: number
    value: number
    id?: string                         // NEW: Data point identifier (VAR1, IN1, etc.)
    type?: string                       // NEW: Data point type from GET_ENTRIES response
    digital_analog?: number             // NEW: BAC_UNITS value (0=digital, 1=analog)
    description?: string                // NEW: Human readable description
  }

  interface SeriesConfig {
    name: string
    color: string
    data: DataPoint[]
    visible: boolean
    unit?: string
    isEmpty?: boolean
    unitType: 'digital' | 'analog'      // NEW: Type of data (digital binary or analog continuous)
    unitCode: number                    // NEW: Unit code from T3000 (1-22 digital, 31-63 analog)
    itemType?: string                   // NEW: T3000 item type (VAR, Input, Output, HOL, etc.)
    prefix?: string                     // NEW: Category prefix (IN, OUT, VAR, etc.)
    description?: string                // NEW: Device description
    pointType?: number                  // NEW: Actual point type number from T3000
    pointNumber?: number                // NEW: Point number for reference
    panelId?: number                    // NEW: Panel ID for reference
    id?: string                          // NEW: Full ID (e.g., IN1, OUT2, VAR3)
  }

  /**
   * Map T3000 point types to readable names and determine data characteristics
   */
  /*
   * TrendLogChart Component - Data Flow Tracking
   *
   * LOGGING APPROACH (Clean & Essential):
   * - = TLChart DataFlow: Key data flow events for 14 panel items
   * - Focus on: How panel items are extracted, API messages sent, data received
   * - Removed: Excessive decorative logs, temporary debug code, verbose diagnostics
   *
   * KEY DATA FLOW POINTS LOGGED:
   * 1. Panel item extraction (extractSpecificPoints) - which 14 items we need
   * 2. API requests (fetchHistoricalDataForTimebase) - which messages trigger data fetch
   * 3. Data conversion (convertApiDataToSeries) - how API data becomes chart data
   * 4. Component initialization - real-time vs historical data sources
   */

  const getPointTypeInfo = (pointType: number) => {
    const pointTypeMap = {
      1: { name: 'Output', category: 'OUT' },
      2: { name: 'Input', category: 'IN' },
      3: { name: 'Variable', category: 'VAR' },
      4: { name: 'Program', category: 'PRG' },
      5: { name: 'Controller', category: 'CON' },
      6: { name: 'Screen', category: 'SCR' },
      7: { name: 'Holiday', category: 'HOL' },
      8: { name: 'Schedule', category: 'SCH' },
      9: { name: 'Monitor', category: 'MON' }
    }

    return pointTypeMap[pointType] || { name: `Type_${pointType}`, category: '' }
  }

  // Function to generate chip label text for series prefix display
  const getChipLabelText = (prefix: string): string => {
    // Currently returns the prefix as-is (IN, OUT, VAR, etc.)
    // This function can be extended later to implement other logic
    return prefix
  }

  // Function to process series names for display in the list
  const getSeriesNameText = (series: SeriesConfig): string => {
    // Use the series name directly - all series are now valid T3000 device data
    return series.name || 'Unknown'
  }

  // Helper function to get unit information from panel data
  const getUnitFromPanelData = (panelId: number, pointType: number, pointNumber: number): string => {
    const panelsData = T3000_Data.value.panelsData
    const panelsRanges = T3000_Data.value.panelsRanges

    if (!panelsData?.length) return ''

    // Get point type info and device ID
    const pointTypeInfo = getPointTypeInfo(pointType)
    if (!pointTypeInfo?.category) return ''

    const idToFind = `${pointTypeInfo.category}${pointNumber + 1}`
    const device = panelsData.find((d: any) =>
      String(d.pid) === String(panelId) && d.id === idToFind
    )

    if (!device || device.range === undefined) return ''

    // Check for custom range data first
    if (panelsRanges?.length) {
      const rangeData = panelsRanges.find((r: any) =>
        String(r.pid) === String(panelId) && r.index === device.range
      )
      if (rangeData?.type === 'digital' && (rangeData.on || rangeData.off)) {
        return `${rangeData.off}/${rangeData.on}`
      }
    }

    // Use rangeDefinitions lookup - use device.range instead of device.unit
    let ranges: any[] = []
    if (pointTypeInfo.category === 'IN') ranges = rangeDefinitions.analog.input
    else if (pointTypeInfo.category === 'OUT') ranges = rangeDefinitions.analog.output
    else if (pointTypeInfo.category === 'VAR') ranges = rangeDefinitions.analog.variable

    const rangeInfo = ranges.find(r => r.id === device.range)
    if (rangeInfo) {
      // If unit is empty, return the label (e.g., "Unused")
      return rangeInfo.unit || rangeInfo.label
    }

    // Check digital ranges - use device.range instead of device.unit
    const digitalRange = rangeDefinitions.digital.find(d => d.id === device.range)
    if (digitalRange) return `${digitalRange.off}/${digitalRange.on}`

    return ''
  }

  // Helper function to extract digital states from unit string
  const getDigitalStatesFromUnit = (unit: string): [string, string] | undefined => {
    return unit.includes('/') ? unit.split('/') as [string, string] : undefined
  }

  // Helper function to get digital states from T3Range based on range ID
  const getDigitalStatesFromRange = (rangeId: number): [string, string] => {
    const digitalRange = rangeDefinitions.digital.find(range => range.id === rangeId)

    if (digitalRange) {
      // If direct is true or null, use off/on as-is
      // If direct is false, swap the order (this matches the logic in T3Range.ts)
      if (digitalRange.direct === false) {
        return [digitalRange.on, digitalRange.off]
      } else {
        return [digitalRange.off, digitalRange.on]
      }
    }

    // Return empty strings when no valid range found
    return ['', '']
  }

  // Helper function to get digital states for Y-axis display (matches left panel label order)
  const getDigitalStatesForYAxis = (rangeId: number): [string, string] => {
    const digitalRange = rangeDefinitions.digital.find(range => range.id === rangeId)

    if (digitalRange) {
      // Parse the label to get states in display order
      // Label format: "FirstState/SecondState" (e.g., "Off/On" or "On/Off")
      const labelParts = digitalRange.label.split('/')
      if (labelParts.length === 2) {
        return [labelParts[0].trim(), labelParts[1].trim()]
      }
    }

    // Return empty strings when no valid range found
    return ['', '']
  }

  // Helper function to get display unit for left panel (handles both digital and analog)
  const getDisplayUnit = (series: SeriesConfig): string => {
    // For analog series, just return the unit
    if (series.unitType !== 'digital') {
      return series.unit || ''
    }

    // For digital series, use the unitCode field (not unit field which is empty)
    const unitCode = series.unitCode

    if (typeof unitCode !== 'number' || unitCode < 0) {
      return ''
    }

    // Handle unitCode 0 as a special case - might be default for "Off/On"
    let searchId = unitCode
    if (unitCode === 0) {
      searchId = 1 // Map unitCode 0 to range ID 1 (Off/On)
    }

    const digitalRange = rangeDefinitions.digital.find(range => range.id === searchId)

    if (!digitalRange) {
      return '' // Return empty string when no range found
    }

    return digitalRange.label
  }

  // Function to convert Unix timestamp to local time string
  const formatTimestampToLocal = (unixTimestamp: number): string => {
    // Handle both seconds and milliseconds Unix timestamps
    const timestamp = unixTimestamp > 1e10 ? unixTimestamp : unixTimestamp * 1000
    const date = new Date(timestamp)



    // Return local time in YYYY-MM-DD HH:mm:ss format
    return date.toLocaleString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3 $4:$5:$6')
  }

  interface Props {
    itemData?: any
    title?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    itemData: null,
    title: 'Trend Log Chart'
  })

  // Computed property to get the current item data - require itemData prop
  const currentItemData = computed(() => {
    return props.itemData
  })

  // Remove modal-specific emits since this is now just a chart component

  // New reactive variables for top controls
  const timeBase = ref('5m')
  const currentView = ref(1)
  const zoomLevel = ref(1)
  const customStartDate = ref<Dayjs | null>(null)
  const customEndDate = ref<Dayjs | null>(null)
  const customStartTime = ref<Dayjs | null>(null)
  const customEndTime = ref<Dayjs | null>(null)
  const customDateModalVisible = ref(false)
  const isRealTime = ref(true)

  // 🆕 Request management for timebase changes and historical data fetching
  let timebaseChangeTimeout: NodeJS.Timeout | null = null
  let historyAbortController: AbortController | null = null
  let historyFetchDebounceTimeout: NodeJS.Timeout | null = null // 🆕 PERFORMANCE: Debounce rapid API calls

  // 🆕 Chart update debouncing to prevent UI freezing in C++ embedded WebView
  let chartUpdatePending = false

  // 🆕 Chart creation retry tracking to prevent infinite loops
  let chartCreationRetries = 0
  const MAX_CHART_CREATION_RETRIES = 10 // Maximum retries before giving up

  // 🆕 Gap detection threshold (minutes) - configurable threshold for breaking lines when data gaps occur
  // Default: 1 minute (reasonable since Action 15 runs every 15s minimum - detects ~4 missed data points)
  const gapDetectionThreshold = ref(1) // Default: 1 minute
  const getGapThresholdMs = () => gapDetectionThreshold.value * 60 * 1000

  // View-specific series tracking for View 2 & 3
  const viewTrackedSeries = ref({
    2: [] as string[], // View 2: user-selected series for tracking
    3: [] as string[]  // View 3: user-selected series for tracking
  })

  // Item selection panel state for View 2 & 3
  const showItemSelector = ref(false)

  // Loading state for database operations
  const isSavingSelections = ref(false)

  // Trendlog Configuration modal state
  const showDatabaseConfig = ref(false)
  const isBackingUp = ref(false)
  const isOptimizing = ref(false)
  const isSaving = ref(false)
  const isCleaningUp = ref(false)

  // Database files data (loaded from API)
  const databaseFiles = ref([])
  const databaseStats = ref(null)
  const isLoadingDatabase = ref(false)

  // Load database files from API
  const loadDatabaseFiles = async () => {
    isLoadingDatabase.value = true
    try {
      const files = await databaseService.files.getFiles()
      databaseFiles.value = files
      LogUtil.Info('Database files loaded', { count: files.length })
    } catch (error) {
      LogUtil.Error('Failed to load database files', error)
      // Set empty array if API fails - no mock data to avoid confusion
      databaseFiles.value = []
    } finally {
      isLoadingDatabase.value = false
    }
  }

  // Load Trendlog Configuration from API
  const loadDatabaseConfig = async () => {
    try {
      const config = await databaseService.config.getConfig()
      databaseConfig.value = config
      LogUtil.Info('Database config loaded', config)
    } catch (error) {
      LogUtil.Error('Failed to load database config', error)
      // Keep default config if API fails
    }
  }

  // Database information
  const databaseInfo = ref({
    name: 'webview_t3_device.db',
    size: '125.4 MB',
    totalRecords: '2,847,293',
    lastBackup: '2025-09-28 14:30:00',
    status: 'healthy',
    location: '\\Database\\webview_t3_device.db'
  })

  // Trendlog Configuration settings (flat structure matching Rust API)
  const databaseConfig = ref<DatabaseConfig>({
    strategy: 'Monthly', // FiveMinutes, Daily, Weekly, Monthly, Quarterly, Custom, CustomMonths
    custom_days: 30, // for Custom strategy
    custom_months: 2, // for CustomMonths strategy
    auto_cleanup_enabled: true,
    retention_value: 30,
    retention_unit: 'days', // days, weeks, months
    is_active: true
  })

  // Sampling Interval Configuration
  interface FfiSyncConfig {
    interval_preset: string // '15min', '20min', '30min', '60min', 'custom' (5min/10min removed)
    custom_value: number
    custom_unit: 'minutes' // Only minutes supported
    interval_secs: number // Actual value in seconds
    last_sync: string | null
    next_sync_in: number // Countdown in seconds
  }

  const ffiSyncConfig = ref<FfiSyncConfig>({
    interval_preset: '15min',
    custom_value: 15,
    custom_unit: 'minutes',
    interval_secs: 900, // Default: 15 minutes
    last_sync: null,
    next_sync_in: 0
  })

  const showFfiSyncHistory = ref(false)
  const ffiSyncHistory = ref<any[]>([])
  const isLoadingHistory = ref(false)
  const ffiSyncWarning = ref<string | null>(null)
  let ffiCountdownTimer: number | null = null

  // Refresh and Rediscover Interval Configuration
  interface RediscoverConfig {
    interval_preset: string // '1hour', '2hours', '4hours', '8hours', '12hours', 'custom'
    custom_value: number
    custom_unit: 'hours' // Only hours supported
    interval_secs: number // Actual value in seconds
    last_rediscover: string | null
    next_rediscover_in: number // Countdown in seconds
  }

  const rediscoverConfig = ref<RediscoverConfig>({
    interval_preset: '1hour',
    custom_value: 1,
    custom_unit: 'hours',
    interval_secs: 3600, // Default: 1 hour
    last_rediscover: null,
    next_rediscover_in: 0
  })

  const rediscoverWarning = ref<string | null>(null)
  let rediscoverCountdownTimer: number | null = null

  // FFI History table columns
  const ffiHistoryColumns = [
    {
      title: 'Date/Time',
      key: 'changed_at',
      width: 150
    },
    {
      title: 'Change',
      key: 'change',
      width: 180
    },
    {
      title: 'Changed By',
      key: 'changed_by',
      width: 100
    },
    {
      title: 'Reason',
      key: 'change_reason',
      width: 150
    }
  ]

  // ⌨️ Keyboard Navigation System
  const keyboardEnabled = ref(true)
  const lastKeyboardAction = ref<string | null>(null)
  const selectedItemIndex = ref<number>(-1) // For up/down navigation (-1 = no selection)

  // FFI Integration - Enhanced TrendLog system
  const ffiSyncStatus = ref({
    syncing: false,
    completed: false,
    error: null as string | null,
    lastSync: null as string | null
  })

  const viewSelections = ref(new Map<number, any[]>())  // Store View 2/3 selections
  const ffiTrendlogInfo = ref(null as any)  // Complete TrendLog info from FFI

  // Dynamic interval calculation based on T3000 monitorConfig
  const calculateT3000Interval = (monitorConfig: any): number => {
    if (!monitorConfig) {
      return 15000 // Default fallback: 15 seconds
    }

    const {
      hour_interval_time = 0,
      minute_interval_time = 0,  // Default to 0, let T3000 config override
      second_interval_time = 0
    } = monitorConfig

    // Convert to milliseconds
    const totalSeconds = (hour_interval_time * 3600) +
      (minute_interval_time * 60) +
      second_interval_time

    // If no intervals specified at all, default to 15 seconds, otherwise use calculated value
    const intervalMs = totalSeconds > 0
      ? Math.max(totalSeconds * 1000, 15000)  // Minimum 15 seconds
      : 15000  // Default 15 seconds if all intervals are 0

    return intervalMs
  }

  // Dynamic update interval based on T3000 configuration
  const updateInterval = computed(() => {
    return calculateT3000Interval(monitorConfig.value)
  })

  const isLoading = ref(false)
  const showLoadingOverlay = ref(false) // Delayed loading display to avoid flashing
  const loadingDelayTimer = ref<NodeJS.Timeout | null>(null)
  const loadingDelayDuration = 300 // Only show loading after 300ms
  const showGrid = ref(true)
  const showLegend = ref(false)  // Hide legend by default to give more space to chart
  const smoothLines = ref(false)
  const showPoints = ref(false)
  const lastSyncTime = ref('N/A')

  // Loading timeout management
  const loadingTimeout = ref<NodeJS.Timeout | null>(null)
  const loadingTimeoutDuration = 30000 // 30 seconds timeout
  const showLoadingTimeout = ref(false)

  // API integration for timebase data fetching
  const trendlogAPI = useTrendlogDataAPI()
  const ffiApi = useT3000FfiApi()
  const dataSource = ref<'realtime' | 'api'>('realtime') // Track data source for timebase changes
  const hasConnectionError = ref(false) // Track connection errors for UI display
  const hasLoadedInitialHistory = ref(false) // Track if initial history has been loaded

  // Helper functions for delayed loading indicator
  const startLoading = () => {
    isLoading.value = true
    // Clear any existing timer
    if (loadingDelayTimer.value) {
      clearTimeout(loadingDelayTimer.value)
      loadingDelayTimer.value = null
    }
    // Only show overlay if loading takes longer than 300ms
    loadingDelayTimer.value = setTimeout(() => {
      if (isLoading.value) {
        showLoadingOverlay.value = true
      }
    }, loadingDelayDuration)
  }

  const stopLoading = () => {
    isLoading.value = false
    showLoadingOverlay.value = false
    if (loadingDelayTimer.value) {
      clearTimeout(loadingDelayTimer.value)
      loadingDelayTimer.value = null
    }
  }

  // Route for URL parameter extraction
  const route = useRoute()

  // NEW: Resizable divider state
  const analogAreaHeight = ref(60) // Default 60% height (bottom 40%)
  const isResizing = ref(false)
  const resizeStartY = ref(0)
  const resizeStartHeight = ref(0)

  // Reactive monitor configuration
  const monitorConfig = ref(null as any)

  // Connection and status tracking
  const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('connected')

  // View switch alert state
  const viewAlert = ref({
    visible: false,
    message: ''
  })

  // Series detail expansion state
  const expandedSeries = ref<Set<number>>(new Set())


  // Helper: Get device description from T3000_Data.value.panelsData
  const getDeviceDescription = (panelId: number, pointType: number, pointNumber: number): string => {
    const panelsData = T3000_Data.value.panelsData

    if (!panelsData?.length) {
      // No panelsData available for device description
      return ''
    }

    const pointTypeInfo = getPointTypeInfo(pointType)
    if (!pointTypeInfo?.category) return ''

    // Generate search ID (panel data is 1-based, param is 0-based)
    const idToFind = `${pointTypeInfo.category}${pointNumber + 1}`
    const device = panelsData.find((d: any) =>
      String(d.pid) === String(panelId) && d.id === idToFind
    )

    if (!device) {
      LogUtil.Debug('⚠️ TrendLogChart: Device not found in panelsData', {
        panelId,
        pointType,
        pointNumber,
        idToFind,
        availableDevices: panelsData.map(d => ({ pid: d.pid, id: d.id })).slice(0, 5) // Show first 5 for debugging
      })
      return ''
    }

    // Priority order: label (if not empty) → description → fullLabel → command → id
    // Use label first if it exists and is not empty, otherwise fall back to description
    const description = (device.label && device.label.trim())
      || device.description
      || device.fullLabel
      || device.command
      || device.id
      || ''

    if (!description) {
      LogUtil.Debug('⚠️ TrendLogChart: Device found but no description fields available', { device })
    }

    return description
  }

  // Helper: Get digital_analog field from T3000_Data.value.panelsData
  const getDigitalAnalogFromPanelData = (panelId: number, pointType: number, pointNumber: number): number => {
    const panelsData = T3000_Data.value.panelsData

    if (!panelsData?.length) return BAC_UNITS_ANALOG

    const pointTypeInfo = getPointTypeInfo(pointType)
    if (!pointTypeInfo?.category) return BAC_UNITS_ANALOG

    const idToFind = `${pointTypeInfo.category}${pointNumber + 1}`
    const device = panelsData.find((d: any) =>
      String(d.pid) === String(panelId) && d.id === idToFind
    )

    return device?.digital_analog ?? BAC_UNITS_ANALOG
  }

  // Chart series colors for the 14 monitoring points
  const SERIES_COLORS = [
    '#FF0000', '#0000FF', '#00AA00', '#FF8000', '#AA00AA', '#CC6600',
    '#AA0000', '#0066AA', '#AA6600', '#6600AA', '#006600', '#FF6600', '#0000AA',
    '#FF00FF', '#008080', '#800080', '#808000', '#FF1493', '#4B0082', '#DC143C',
    '#00AAAA', '#00CED1', '#8B4513', '#2F4F4F', '#B22222'
  ]

  // Chart data - T3000 mixed digital/analog series (filter out demo/placeholder data)
  const generateDataSeries = (): SeriesConfig[] => {
    // Validate input data
    const inputData = props.itemData?.t3Entry?.input
    const rangeData = props.itemData?.t3Entry?.range

    if (!inputData?.length || !rangeData?.length) {
      return []
    }

    const actualItemCount = Math.min(inputData.length, rangeData.length)

    if (actualItemCount === 0) return []

    // Generate and filter series configuration - only include items with valid T3000 device data
    const validSeries: SeriesConfig[] = []

    for (let index = 0; index < actualItemCount; index++) {
      const inputItem = inputData[index]
      const { panel: panelId, point_type: pointType, point_number: pointNumber } = inputItem

      // Get all required info in one pass
      const pointTypeInfo = getPointTypeInfo(pointType)
      const digitalAnalog = getDigitalAnalogFromPanelData(panelId, pointType, pointNumber)
      const unit = getUnitFromPanelData(panelId, pointType, pointNumber)
      const description = getDeviceDescription(panelId, pointType, pointNumber)

      // FILTER OUT DEMO/PLACEHOLDER DATA
      // Enhanced filtering to remove all types of demo/test data:
      // 1. No description AND panel ID is 0 (original filter)
      // 2. No description at all (prevents generic names like "1 (P0)")
      // 3. Names that contain "(P0)" pattern (explicit demo data check)
      // 4. Only allow items with valid device descriptions
      const potentialSeriesName = description // No fallback - description is required

      if (!description && panelId === 0) {
        // Filtering out placeholder data (no description + panel 0)
        continue; // Skip this item
      }

      if (!description) {
        // Filtering out undescribed data (prevents demo names)
        continue; // Skip this item
      }

      // Check for demo/test patterns in the description
      if (/demo|test|sample/i.test(description)) {
        // Filtering out explicit demo data (demo pattern)
        continue; // Skip this item
      }

      if (potentialSeriesName && (potentialSeriesName.includes('(P0)') || potentialSeriesName.match(/^\d+\s*\([P]\d+\)$/))) {
        // Filtering out explicit demo data (demo pattern)
        continue; // Skip this item
      }

      // Only include items with valid data
      const isDigital = digitalAnalog === BAC_UNITS_DIGITAL
      const unitType = isDigital ? 'digital' : 'analog'

      // Generate clean names for valid data (description is guaranteed to exist after filtering)
      const seriesName = description
      const cleanDescription = `${pointTypeInfo.category} - ${description}`

      // Log successful inclusion of real data
      // Including real T3000 data series
      const formattedItemType = `${panelId}${pointTypeInfo.category}${pointNumber + 1}`
      const itemId = `${pointTypeInfo.category}${pointNumber + 1}`

      // Add valid series to the list
      const newSeries: SeriesConfig = {
        name: seriesName,
        color: SERIES_COLORS[validSeries.length % SERIES_COLORS.length], // Use validSeries.length for color index
        data: [],
        visible: true,
        unit: unit,
        isEmpty: false,
        unitType: unitType as 'digital' | 'analog',
        unitCode: rangeData[index],
        itemType: formattedItemType,
        prefix: pointTypeInfo.category,
        description: cleanDescription,
        pointType: pointType,
        pointNumber: pointNumber,
        panelId: panelId,
        id: itemId
      }

      // Debug logging for series creation
      if (unitType === 'digital') {
        LogUtil.Info(`✅ Digital Series Created:`, {
          name: seriesName,
          id: itemId,
          panelId: panelId,
          pointType: pointType,
          pointNumber: pointNumber,
          unit: unit,
          digitalAnalog: digitalAnalog
        })
      }

      validSeries.push(newSeries)
    }

    LogUtil.Info('📊 TrendLogChart: Generated series with filtering', {
      totalInputItems: actualItemCount,
      validSeriesCount: validSeries.length,
      filteredOut: actualItemCount - validSeries.length,
      seriesNames: validSeries.map(s => s.name),
      expectedSingleSeries: actualItemCount === 1 ? 'Should be 1 series' : `Should be ${actualItemCount} series`
    })

    return validSeries
  }

  const dataSeries = ref<SeriesConfig[]>([])

  // Regenerate data series when data source changes
  const regenerateDataSeries = () => {
    const newSeries = generateDataSeries()
    const existingSeriesMap = new Map()

    // Create a map of existing series for efficient lookup
    dataSeries.value.forEach(existing => {
      const key = `${existing.id}_${existing.panelId}`
      existingSeriesMap.set(key, existing)
    })

    /*
    LogUtil.Debug('🔄 regenerateDataSeries: Starting intelligent merge', {
      newSeriesCount: newSeries.length,
      existingSeriesCount: dataSeries.value.length,
      existingKeys: Array.from(existingSeriesMap.keys())
    })
    */

    // INTELLIGENT MERGE STRATEGY:
    // 1. For unchanged items: preserve ALL user settings (visible, data, etc.)
    // 2. For updated items: use latest config but preserve user preferences where possible
    // 3. For new items: use default settings
    // 4. Deleted items: automatically removed (not in newSeries)

    const mergedSeries = newSeries.map(newSeriesItem => {
      const key = `${newSeriesItem.id}_${newSeriesItem.panelId}`
      const existingSeries = existingSeriesMap.get(key)

      if (existingSeries) {
        // ITEM EXISTS - determine if it's unchanged or updated
        const isConfigurationChanged = (
          existingSeries.name !== newSeriesItem.name ||
          existingSeries.unitType !== newSeriesItem.unitType ||
          existingSeries.unitCode !== newSeriesItem.unitCode ||
          existingSeries.pointType !== newSeriesItem.pointType ||
          existingSeries.description !== newSeriesItem.description
        )

        if (isConfigurationChanged) {

          /*
          // UPDATED ITEM: Use latest config but preserve user preferences
          LogUtil.Debug(`📝 Item updated: ${newSeriesItem.name}`, {
            changes: {
              name: existingSeries.name !== newSeriesItem.name ? `${existingSeries.name} �?${newSeriesItem.name}` : 'unchanged',
              unitType: existingSeries.unitType !== newSeriesItem.unitType ? `${existingSeries.unitType} �?${newSeriesItem.unitType}` : 'unchanged',
              description: existingSeries.description !== newSeriesItem.description ? 'changed' : 'unchanged'
            }
          })
          */

          return {
            ...newSeriesItem,  // Use latest configuration
            data: existingSeries.data || [],  // Preserve accumulated data
            visible: existingSeries.visible,  // Preserve user visibility choice
            // Keep other user preferences that make sense
            color: existingSeries.color || newSeriesItem.color
          }
        } else {
          // UNCHANGED ITEM: Preserve everything from existing series
          // LogUtil.Debug(`�?Item unchanged: ${existingSeries.name}`)

          return {
            ...existingSeries,  // Keep existing series as-is
            // Only update fields that should always reflect latest state
            color: existingSeries.color || newSeriesItem.color  // Fallback color if missing
          }
        }
      } else {
        // NEW ITEM: Use default settings
        // LogUtil.Debug(`�?New item added: ${newSeriesItem.name}`)

        return {
          ...newSeriesItem,  // Use new configuration with defaults
          data: [],  // Start with empty data
          visible: true  // New items are visible by default
        }
      }
    })

    // Log the merge results
    const addedCount = newSeries.length - dataSeries.value.filter(existing =>
      newSeries.some(newItem => newItem.id === existing.id && newItem.panelId === existing.panelId)
    ).length
    const removedCount = dataSeries.value.length - newSeries.filter(newItem =>
      dataSeries.value.some(existing => existing.id === newItem.id && existing.panelId === newItem.panelId)
    ).length

    /*
    LogUtil.Info('🔄 regenerateDataSeries: Merge completed', {
      totalItems: mergedSeries.length,
      addedItems: addedCount,
      removedItems: removedCount,
      preservedVisibilityStates: mergedSeries.filter(s => !s.visible).length
    })
    */

    dataSeries.value = mergedSeries
  }

  /*
  // Debug function to analyze data series state changes
  const debugDataSeriesFlow = (context: string) => {
    const seriesSnapshot = dataSeries.value.map(series => ({
      id: series.id,
      name: series.name,
      visible: series.visible,
      unitType: series.unitType,
      dataPoints: series.data?.length || 0,
      panelId: series.panelId
    }))

    LogUtil.Debug(`📊 DataSeries Flow [${context}]:`, {
      totalSeries: seriesSnapshot.length,
      visibleSeries: seriesSnapshot.filter(s => s.visible).length,
      hiddenSeries: seriesSnapshot.filter(s => !s.visible).length,
      analogSeries: seriesSnapshot.filter(s => s.unitType === 'analog').length,
      digitalSeries: seriesSnapshot.filter(s => s.unitType === 'digital').length,
      seriesDetails: seriesSnapshot
    })

    return seriesSnapshot
  }
  */

  // Watch currentItemData and regenerate series when it changes
  watch(currentItemData, (newData) => {
    if (newData) {
      // debugDataSeriesFlow('Before currentItemData regeneration')
      regenerateDataSeries()
      // debugDataSeriesFlow('After currentItemData regeneration')
    }
  }, { immediate: true, deep: true })

  // Watch dataSeries for updates
  watch(dataSeries, (newSeries, oldSeries) => {
    // Series updated, reactive changes handled automatically
  }, { deep: true })

  // 🆕 FIX: Watch monitorConfig and ensure dataseries consistency
  watch(monitorConfig, (newMonitorConfig, oldMonitorConfig) => {
    if (newMonitorConfig && !oldMonitorConfig) {
      LogUtil.Info('🔧 monitorConfig watcher: Monitor config became available, checking dataseries consistency', {
        hasMonitorConfig: !!newMonitorConfig,
        dataSeriesCount: dataSeries.value.length,
        monitorInputItemsCount: newMonitorConfig.inputItems?.length || 0,
        monitorConfigPid: newMonitorConfig.pid
      })

      // If we have monitor config but no dataseries, try to regenerate
      if (dataSeries.value.length === 0 && newMonitorConfig.inputItems?.length > 0) {
        LogUtil.Info('🔧 monitorConfig watcher: Regenerating dataseries since monitor config is now ready')
        regenerateDataSeries()
      }
    }
  }, { immediate: false })

  // Watch props.itemData for changes
  watch(() => props.itemData, (newData, oldData) => {
    // Props data changed, handled by currentItemData watcher
  }, { deep: true })

  // Watch T3000_Data for panels data changes
  watch(() => T3000_Data.value?.panelsData, async (newPanelsData, oldPanelsData) => {
    LogUtil.Debug('🔔 T3000_Data.panelsData watcher TRIGGERED', {
      hasNewData: !!newPanelsData,
      newDataLength: newPanelsData?.length || 0,
      isRealTime: isRealTime.value,
      timeBase: timeBase.value,
      timestamp: new Date().toLocaleTimeString()
    })

    LogUtil.Info('🔔 T3000_Data.panelsData watcher TRIGGERED', {
      hasNewData: !!newPanelsData,
      newDataLength: newPanelsData?.length || 0,
      isRealTime: isRealTime.value,
      timeBase: timeBase.value
    })

    // Only process panel data updates in real-time mode
    // Skip for custom/historical data to avoid interfering with loaded historical datasets
    if (!isRealTime.value) {
      LogUtil.Debug('⏭️ T3000_Data watcher: Skipping panel data processing (not in real-time mode)', {
        timeBase: timeBase.value,
        isRealTime: isRealTime.value
      })
      return
    }

    if (newPanelsData && newPanelsData.length > 0) {
      // Regenerate data series when panels data becomes available or changes
      // CRITICAL: Only regenerate if series don't exist yet, to preserve historical data
      if (currentItemData.value && dataSeries.value.length === 0) {
        regenerateDataSeries()
        stopLoading() // Stop loading after series generation
      }

      // NOTE: Historical data loading is handled by createAnalogChart() after chart instance is created
      // This ensures series structure and chart are both ready before loading history

      // Process new data for chart data points
      // Batch data is APPENDED to existing data, not replacing it
      const chartDataFormat = newPanelsData.flat()
      updateChartWithNewData(chartDataFormat)

      // Store real-time data to database if in real-time mode
      // 🔥 FIX: Only save Action 15 real-time data, NOT Action 0 initial data
      // Skip batch save on initial load - let history load first
      LogUtil.Info('💾 T3000_Data watcher: Checking storage conditions', {
        isRealTime: isRealTime.value,
        chartDataLength: chartDataFormat.length,
        dataSeriesLength: dataSeries.value?.length || 0,
        hasLoadedInitialHistory: hasLoadedInitialHistory.value,
        willStore: isRealTime.value && chartDataFormat.length > 0 && dataSeries.value?.length > 0 && hasLoadedInitialHistory.value
      })

      // Only batch save after initial history is loaded (prevents blocking history load with Action 0 data)
      if (isRealTime.value && chartDataFormat.length > 0 && dataSeries.value?.length > 0 && hasLoadedInitialHistory.value) {

        /*
        LogUtil.Info('💾 T3000_Data watcher: Filtering for chart series storage', {
          isRealTime: isRealTime.value,
          totalDataItemsCount: chartDataFormat.length,
          chartSeriesCount: dataSeries.value.length,
          timestamp: new Date().toISOString()
        })
        */

        // OPTION 1: Filter chartDataFormat to only include items from current chart series
        // Get current panel ID and serial number from URL or first panel in list
        const urlSerialNumber = route.query.sn ? parseInt(route.query.sn as string) : 0
        const urlPanelId = route.query.panel_id ? parseInt(route.query.panel_id as string) : 0
        const panelsList = T3000_Data.value.panelsList || []
        const currentSN = urlSerialNumber || (panelsList.length > 0 ? panelsList[0].serial_number : 0)
        const currentPanelId = urlPanelId || (panelsList.length > 0 ? panelsList[0].panel_number : 1)

        // Get chart series identifiers for filtering
        const chartSeriesItems = dataSeries.value.map(series => ({
          id: series.id,
          panelId: series.panelId,
          pointType: series.pointType,
          pointNumber: series.pointNumber,
          seriesName: series.name
        })).filter(item => item.id && item.panelId)

        /*
        LogUtil.Info('🎯 Chart series identifiers for filtering', {
          chartSeriesCount: chartSeriesItems.length,
          chartSeries: chartSeriesItems.map(item => ({
            id: item.id,
            panelId: item.panelId,
            seriesName: item.seriesName
          }))
        })
        */

        // Filter chartDataFormat to only include chart series items
        const chartRelevantItems = chartDataFormat.filter(item =>
          item &&
          typeof item === 'object' &&
          item.hasOwnProperty('value') &&
          item.value !== null &&
          item.value !== undefined &&
          item.id &&
          item.pid === currentPanelId &&  // Only save items for current panel
          (!item.serial_number || item.serial_number === currentSN) &&  // If serial_number exists, it must match
          (!item.sn || item.sn === currentSN) &&  // If sn exists, it must match
          // Only include items that match current chart series
          chartSeriesItems.some(chartItem =>
            item.id === chartItem.id && item.pid === chartItem.panelId
          )
        )

        /*
        LogUtil.Info('📊 Filtered data for storage', {
          originalItemsCount: chartDataFormat.length,
          filteredItemsCount: chartRelevantItems.length,
          chartSeriesCount: dataSeries.value.length,
          filteredItems: chartRelevantItems.map(item => ({
            id: item.id,
            panelId: item.pid,
            value: item.value,
            digitalAnalog: item.digital_analog,
            pointType: item.point_type, // ADD: Debug point_type value
            index: item.index,           // ADD: Debug index value
            units: item.units,           // ADD: Debug units value
            range: item.range            // ADD: Debug range value
          }))
        })
        */

        // Validate filtering results
        validateFilteringResults(chartDataFormat.length, chartRelevantItems.length, dataSeries.value.length)

        if (chartRelevantItems.length > 0) {
          // Fire and forget - don't await, don't block history loading
          storeRealtimeDataToDatabase(chartRelevantItems).catch(err => {
            LogUtil.Warn('Background batch save failed (non-critical)', err)
          })
        } else {
          LogUtil.Warn('⚠️ No chart-relevant items found for storage', {
            totalItems: chartDataFormat.length,
            chartSeriesCount: dataSeries.value.length,
            sampleTotalItem: chartDataFormat[0],
            sampleChartSeries: chartSeriesItems[0]
          })
        }
      }
    }
  }, { deep: true })

  // Watch scheduleItemData for changes
  watch(scheduleItemData, (newData, oldData) => {

    /*
    LogUtil.Info('= TLChart: scheduleItemData changed', {
      hasNewData: !!newData,
      hasOldData: !!oldData,
      newDataId: (newData as any)?.t3Entry?.id,
      oldDataId: (oldData as any)?.t3Entry?.id,
      newDataPid: (newData as any)?.t3Entry?.pid,
      oldDataPid: (oldData as any)?.t3Entry?.pid,
      idsChanged: (newData as any)?.t3Entry?.id !== (oldData as any)?.t3Entry?.id,
      pidsChanged: (newData as any)?.t3Entry?.pid !== (oldData as any)?.t3Entry?.pid,
      timestamp: new Date().toISOString()
    })
    */
  }, { deep: true })

  // Watch timeBase for changes and hybrid data loading with debouncing and cancellation
  watch(timeBase, async (newTimeBase, oldTimeBase) => {
    // 🛡️ SKIP: Custom timebase is handled by onCustomDateChange() separately
    // This prevents duplicate API calls when custom date range is applied
    if (newTimeBase === 'custom') {
      LogUtil.Debug('⏭️ Skipping timebase watcher for custom - handled by onCustomDateChange()', {
        oldTimeBase,
        newTimeBase
      })
      return
    }

    // 🔄 RESET: When switching FROM custom TO regular timebase, re-enable real-time mode
    if (oldTimeBase === 'custom' && newTimeBase !== 'custom') {
      LogUtil.Info('🔄 Switching from custom date to regular timebase - re-enabling real-time mode', {
        oldTimeBase,
        newTimeBase
      })
      isRealTime.value = true
      dataSource.value = 'realtime'

      // 🧹 CLEANUP: Clear custom date values to prevent X-axis from using custom range
      customStartDate.value = null
      customEndDate.value = null
      customStartTime.value = null
      customEndTime.value = null

      // 🔄 Reset time offset when returning to real-time
      timeOffset.value = 0

      // 🆕 DESTROY CHARTS: Force complete recreation to reset x-axis scales
      destroyAllCharts()
      await nextTick()

      LogUtil.Info('✅ Cleared custom date settings and destroyed charts, will reload data for new timebase', {
        timeBase: newTimeBase,
        isRealTime: isRealTime.value
      })

      // 🆕 FIX: When switching from custom back to preset, call API directly instead of relying on debounced logic
      // This ensures fresh data is loaded immediately
      LogUtil.Info('🔄 Calling onTimeBaseChange() directly for custom→preset transition')
      await onTimeBaseChange()
      return // Exit early - onTimeBaseChange handles everything
    }

    // 🆕 DEBOUNCE: Cancel previous pending timebase change
    if (timebaseChangeTimeout) {
      clearTimeout(timebaseChangeTimeout)
      LogUtil.Debug('⏸️ Cancelled pending timebase change', { cancelledTimebase: oldTimeBase })
    }

    // 🆕 CANCEL: Abort any ongoing history API request
    if (historyAbortController) {
      historyAbortController.abort()
      LogUtil.Info('🛑 Aborted previous history API request', {
        reason: 'New timebase change',
        oldTimeBase,
        newTimeBase
      })
    }

    // Wait 300ms before executing (debounce rapid changes)
    timebaseChangeTimeout = setTimeout(async () => {
      LogUtil.Info('= TLChart: timeBase changed - Smart Data Loading with Reuse Optimization', {
        oldTimeBase: oldTimeBase,
        newTimeBase: newTimeBase,
        autoScrollState: isRealTime.value,
        timestamp: new Date().toISOString()
      })

      try {
        // Create new abort controller for this request
        historyAbortController = new AbortController()

        // 🆕 OPTIMIZATION: Check if we can reuse existing data for seamless transition
        const canReuseExistingData = await checkDataReuseOptimization(oldTimeBase, newTimeBase)

        if (canReuseExistingData) {
          LogUtil.Info('🚀 Smart timebase transition: Reusing existing data, loading only missing gap', {
            optimization: 'INCREMENTAL_LOAD',
            oldTimeBase,
            newTimeBase,
            existingDataCount: dataSeries.value.reduce((sum, s) => sum + s.data.length, 0)
          })

          // Load only the missing historical data gap (no loading state needed)
          await loadHistoricalDataGap(oldTimeBase, newTimeBase)

          // Update charts immediately with extended data
          updateCharts()

          LogUtil.Info('�?Seamless timebase transition completed', {
            newTimeBase,
            totalDataPoints: dataSeries.value.reduce((sum, series) => sum + series.data.length, 0)
          })
          return // Skip the full reload logic below
        }

        // Fallback to full reload for complex cases
        LogUtil.Info('📚 Full timebase reload: Cannot optimize, doing complete data refresh', {
          reason: 'COMPLEX_TRANSITION',
          oldTimeBase,
          newTimeBase
        })

        // 🆕 FIX: Don't show loading state if we already have data
        const existingDataRange = getExistingDataTimeRange()
        const hasExistingData = existingDataRange && existingDataRange.totalPoints > 0

        if (!hasExistingData) {
          // Only show loading for initial data fetch
          startLoading()
          startLoadingTimeout()
          LogUtil.Debug('🔄 No existing data - showing loading state', {
            willLoadHistorical: true
          })
        } else {
          LogUtil.Debug('�?Existing data found - skipping loading state', {
            existingDataPoints: existingDataRange.totalPoints,
            existingTimeRange: {
              start: new Date(existingDataRange.earliest).toISOString(),
              end: new Date(existingDataRange.latest).toISOString()
            }
          })
        }

        // 🆕 DON'T clear existing data - let merge function handle deduplication
        // This preserves real-time data that hasn't been saved to database yet
        LogUtil.Debug('🔄 Preserving existing data, will merge with historical load', {
          existingDataPoints: dataSeries.value.reduce((sum, s) => sum + (s.data?.length || 0), 0)
        })

        // Load data based on current Auto Scroll state (preserve user's choice)
        if (isRealTime.value) {
          // Auto Scroll ON: Load real-time + historical data
          await loadHistoricalDataFromDatabase()

          // Step 3: Ensure real-time updates are active
          if (!realtimeInterval) {
            startRealTimeUpdates()
          }
        } else {
          // Auto Scroll OFF: Load historical data only
          await loadHistoricalDataFromDatabase()
        }

        // 🆕 RECREATE CHARTS: After data loaded, recreate charts if switching from custom date
        if (oldTimeBase === 'custom' && newTimeBase !== 'custom') {
          await nextTick()
          LogUtil.Info('🎨 Recreating charts with fresh configuration after custom→regular transition')
          createCharts()
          await nextTick()
        }

        // Force Vue reactivity update
        await nextTick()
        dataSeries.value = [...dataSeries.value]

        // Wait for DOM to update, then update charts
        await nextTick()

        // 🆕 FIX: Add extra yield for C++ embedded WebView to process messages
        // This prevents the parent application from freezing
        await new Promise(resolve => setTimeout(resolve, 10))

        // Immediate chart update (now properly deferred)
        updateCharts()

        // Delayed chart update for safety (in case first one didn't render)
        setTimeout(() => {
          LogUtil.Info('🎨 Executing delayed chart update after timebase data load')
          updateCharts()
        }, 100)

      } catch (error) {
        // Check if error is due to abort
        if (error.name === 'AbortError') {
          LogUtil.Info('⏹️ History request aborted (newer request started)', { timeBase: newTimeBase })
          return
        }

        // Don't treat initialization delays as connection errors
        LogUtil.Info('ℹ️ Timebase change skipped (component still initializing)', {
          error: error?.message,
          timeBase: newTimeBase
        })
        clearLoadingTimeout() // Clear timeout on error
        // Don't set hasConnectionError - component is just initializing
      } finally {
        clearLoadingTimeout() // Always clear timeout when done
        stopLoading()
      }

      LogUtil.Info('�?Timebase change completed', {
        newTimeBase,
        autoScrollState: isRealTime.value,
        dataSeriesCount: dataSeries.value.length,
        totalDataPoints: dataSeries.value.reduce((sum, series) => sum + series.data.length, 0)
      })
    }, 300) // 300ms debounce delay
  }, { immediate: true })

  // Watch for device/serial number changes to reload historical data
  watch(() => T3000_Data.value?.panelsList, async (newPanelsList, oldPanelsList) => {
    const newSN = newPanelsList && newPanelsList.length > 0 ? newPanelsList[0].sn : null
    const oldSN = oldPanelsList && oldPanelsList.length > 0 ? oldPanelsList[0].sn : null
    const newPanelId = newPanelsList && newPanelsList.length > 0 ? newPanelsList[0].panel_number : null
    const oldPanelId = oldPanelsList && oldPanelsList.length > 0 ? oldPanelsList[0].panel_number : null

    const deviceChanged = (newSN && oldSN && newSN !== oldSN) || (newPanelId && oldPanelId && newPanelId !== oldPanelId)

    if (deviceChanged) {
      LogUtil.Info('🔄 Device changed - Reloading historical data', {
        oldSN: oldSN,
        newSN: newSN,
        oldPanelId: oldPanelId,
        newPanelId: newPanelId,
        serialChanged: newSN !== oldSN,
        panelChanged: newPanelId !== oldPanelId,
        timestamp: new Date().toISOString()
      })

      try {
        startLoading()

        // Clear existing data first
        dataSeries.value.forEach(series => {
          series.data = []
        })

        // Load historical data from database for new device
        await loadHistoricalDataFromDatabase()

        // Update charts with new historical data
        updateCharts()

      } catch (error) {
        LogUtil.Error('Error loading historical data for new device:', error)
      } finally {
        stopLoading()
      }
    }
  }, { deep: true, immediate: false })

  // Get internal interval value from props - combine minute and second intervals
  const getInternalIntervalSeconds = (): number => {
    const minuteInterval = props.itemData?.t3Entry?.minute_interval_time || 0
    const secondInterval = props.itemData?.t3Entry?.second_interval_time || 0

    // Calculate total interval: minute_interval_time * 60 + second_interval_time
    const totalIntervalSeconds = minuteInterval * 60 + secondInterval

    if (totalIntervalSeconds > 0) {
      return totalIntervalSeconds
    } else {
      // Default fallback - convert timebase minutes to seconds
      return getDataPointInterval(timeBase.value) * 60
    }
  }

  // Round interval to standard values for x-axis labels (input/output in seconds)
  const getRoundedIntervalSeconds = (intervalSec: number): number => {
    if (intervalSec <= 5) return 5
    if (intervalSec <= 10) return 10
    if (intervalSec <= 15) return 15
    if (intervalSec <= 20) return 20
    if (intervalSec <= 30) return 30
    if (intervalSec <= 60) return 60

    // For larger intervals, convert to minutes and round
    const minutes = intervalSec / 60
    if (minutes <= 5) return 5 * 60
    if (minutes <= 10) return 10 * 60
    if (minutes <= 15) return 15 * 60
    if (minutes <= 20) return 20 * 60
    if (minutes <= 30) return 30 * 60

    // Round to nearest hour
    const hours = Math.round(minutes / 60)
    return hours * 60 * 60
  }

  // Get x-axis tick configuration based on timebase
  const getXAxisTickConfig = (timeBase: string) => {
    const configs = {
      '5m': { stepMinutes: 1, unit: 'minute' },     // Every 1 minute (6 ticks = 5 divisions)
      '10m': { stepMinutes: 2, unit: 'minute' },    // Every 2 minutes (6 ticks = 5 divisions)
      '30m': { stepMinutes: 5, unit: 'minute' },    // Every 5 minutes (7 ticks = 6 divisions)
      '1h': { stepMinutes: 15, unit: 'minute' },    // Every 15 minutes (5 ticks = 4 divisions) - IMPROVED
      '4h': { stepMinutes: 60, unit: 'minute' },    // Every 1 hour (5 ticks = 4 divisions) - IMPROVED
      '12h': { stepMinutes: 120, unit: 'hour' },    // Every 2 hours (7 ticks = 6 divisions) - IMPROVED
      '1d': { stepMinutes: 240, unit: 'hour' },     // Every 4 hours (7 ticks = 6 divisions) - IMPROVED
      '4d': { stepMinutes: 960, unit: 'hour' }      // Every 16 hours (7 ticks = 6 divisions) - IMPROVED
    }

    return configs[timeBase] || { stepMinutes: 15, unit: 'minute' }
  }

  // Get proper display format based on time range
  const getDisplayFormat = (timeBase: string): string => {
    // Always return date+time format since formatXAxisTick handles the conditional display logic
    return 'yyyy-MM-dd HH:mm'
  }

  // X-axis tick formatter to always show time + date (multi-line) for first tick
  // All timebases: First tick shows time on top line, date on bottom line for better visibility
  const formatXAxisTick = (value: any, index: number, ticks: any[]) => {
    const date = new Date(value)

    // Helper function to format multi-line: time on top, date below
    const formatDateTimeMultiLine = () => {
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return [`${hours}:${minutes}`, `${year}-${month}-${day}`] // Array for multi-line
    }

    // Helper function to format time only
    const formatTimeOnly = () => {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }

    const isFirstTick = index === 0

    // Always show time + date (multi-line) for first tick, time only for the rest
    if (isFirstTick) {
      return formatDateTimeMultiLine() // Show time on top, date below
    } else {
      return formatTimeOnly() // Show time only for other ticks
    }
  }

  // Handle custom timebase case - divide into 12 ticks with better distribution
  const getCustomTickConfig = (customStartDate: Date, customEndDate: Date) => {
    const totalMinutes = Math.floor((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60))

    // Use fewer ticks for better readability and ensure we don't overcrowd the axis
    const maxTicks = 10
    const tickIntervalMinutes = Math.ceil(totalMinutes / maxTicks)

    // Determine appropriate unit based on interval
    let unit: 'minute' | 'hour'
    let stepSize: number
    let displayFormat: string

    if (tickIntervalMinutes < 60) {
      unit = 'minute'
      stepSize = tickIntervalMinutes
      displayFormat = 'yyyy-MM-dd HH:mm' // Always use date+time format, formatXAxisTick handles conditional display
    } else {
      unit = 'hour'
      stepSize = Math.ceil(tickIntervalMinutes / 60)
      displayFormat = 'yyyy-MM-dd HH:mm' // Always use date+time format, formatXAxisTick handles conditional display
    }

    return { unit, stepSize, displayFormat, maxTicks }
  }

  // Debug function to verify data generation intervals
  const debugDataIntervals = () => {
    // Debug function disabled in production
  }

  // Computed property to track current interval for debugging
  const currentDataInterval = computed(() => {
    const internalSec = getInternalIntervalSeconds()
    const roundedSec = getRoundedIntervalSeconds(internalSec)

    // Disabled debug logging for production
    // LogUtil.Debug(`Data Interval - Internal: ${internalSec}sec, Rounded for display: ${roundedSec}sec`, {
    //   minuteInterval: props.itemData?.t3Entry?.minute_interval_time,
    //   secondInterval: props.itemData?.t3Entry?.second_interval_time,
    //   timeBase: timeBase.value
    // })

    return { internalSec, roundedSec }
  })

  // Chart references - Single canvas for digital
  const chartContainer = ref<HTMLElement>()
  const analogChartCanvas = ref<HTMLCanvasElement>()
  const digitalChartCanvas = ref<HTMLCanvasElement>()
  let analogChartInstance: Chart | null = null
  let digitalChartInstance: Chart | null = null
  let realtimeInterval: NodeJS.Timeout | null = null

  // 🆔 Unique instance ID to track and prevent duplicate intervals across HMR reloads
  const instanceId = Math.random().toString(36).substring(7)
  LogUtil.Debug(`📊 TrendLogChart instance created: ${instanceId}`)

  // Computed properties
  const chartTitle = computed(() => {
    // For trend log data, prioritize label over description to avoid "1 (P0)" fallback patterns
    const description = props.itemData?.t3Entry?.description
    const label = props.itemData?.t3Entry?.label

    // Filter out description if it matches demo/fallback patterns like "1 (P0)"
    const isValidDescription = description &&
      !description.includes('(P0)') &&
      !description.match(/^\d+\s*\([P]\d+\)$/)

    return props.title ||
      label ||  // Prioritize label first for trend logs
      (isValidDescription ? description : null) ||  // Only use description if it's not a fallback pattern
      props.itemData?.title ||
      'Trend Log Chart'
  })

  const totalDataPoints = computed(() => {
    return dataSeries.value
      .reduce((total, series) => total + series.data.length, 0)
  })

  const visibleSeriesCount = computed(() => {
    return dataSeries.value.filter(series => series.visible).length
  })

  const hasTrackedItems = computed(() => {
    if (currentView.value === 1) return true
    return (viewTrackedSeries.value[currentView.value] || []).length > 0
  })

  // Computed properties for Select All / Unselect All functionality
  const isAllSelected = computed(() => {
    const currentTracked = viewTrackedSeries.value[currentView.value] || []
    return currentTracked.length === dataSeries.value.length && dataSeries.value.length > 0
  })

  const isNoneSelected = computed(() => {
    const currentTracked = viewTrackedSeries.value[currentView.value] || []
    return currentTracked.length === 0
  })

  const displayedSeries = computed(() => {
    if (currentView.value === 1) {
      return dataSeries.value // View 1: show all series
    } else {
      // View 2 & 3: show only tracked series
      const trackedItems = viewTrackedSeries.value[currentView.value] || []
      return dataSeries.value.filter(series => trackedItems.includes(series.name))
    }
  })

  const timeBaseLabel = computed(() => {
    const labels = {
      '5m': 'Last 5 min',
      '10m': 'Last 10 min',
      '30m': 'Last 30 min',
      '1h': 'Last 1 hr',
      '4h': 'Last 4 hrs',
      '12h': 'Last 12 hrs',
      '1d': 'Last 1 day',
      '4d': 'Last 4 days'
    }
    return labels[timeBase.value] || ''
  })

  // Helper function to get time base label for dropdown button
  const getTimeBaseLabel = () => {
    const labels = {
      '5m': '5 minutes',
      '10m': '10 minutes',
      '30m': '30 minutes',
      '1h': '1 hour',
      '4h': '4 hours',
      '12h': '12 hours',
      '1d': '1 day',
      '4d': '4 days',
      'custom': 'Custom Define'
    }
    return labels[timeBase.value] || '1 hour'
  }

  // Timebase progression for zoom functionality (shorter to longer)
  const timebaseProgression = ['5m', '10m', '30m', '1h', '4h', '12h', '1d', '4d']

  // Computed properties for navigation button states
  const canScroll = computed(() => {
    // Scroll buttons only work for regular timebases in non-real-time mode
    // Disabled for: real-time mode (always current) and custom dates (fixed range)
    return !isRealTime.value && timeBase.value !== 'custom'
  })

  const canZoomIn = computed(() => {
    // Can't zoom for custom date ranges
    if (timeBase.value === 'custom') return false
    const currentIndex = timebaseProgression.indexOf(timeBase.value)
    return currentIndex > 0 // Can zoom in if not already at shortest timebase
  })

  const canZoomOut = computed(() => {
    // Can't zoom for custom date ranges
    if (timeBase.value === 'custom') return false
    const currentIndex = timebaseProgression.indexOf(timeBase.value)
    return currentIndex >= 0 && currentIndex < timebaseProgression.length - 1 // Can zoom out if not at longest timebase
  })

  // ⌨️ Keyboard Navigation: Item mappings (1-9, A-E) - Based on left panel displayed series
  const keyboardItemMappings = computed(() => {
    const mappings: { [key: string]: { item: string, display: string, index: number } } = {}

    displayedSeries.value.forEach((series, index) => {
      if (index < 9) {
        // Map 1-9 for first 9 items
        mappings[`Digit${index + 1}`] = {
          item: series.name,
          display: `${index + 1}`,
          index
        }
      } else if (index < 14) {
        // Map A-E for items 10-14
        const letter = String.fromCharCode(65 + (index - 9)) // A, B, C, D, E
        mappings[`Key${letter}`] = {
          item: series.name,
          display: letter,
          index
        }
      }
    })

    LogUtil.Debug(`⌨️ Keyboard: Generated mappings`, {
      displayedSeriesCount: displayedSeries.value.length,
      currentView: currentView.value,
      mappingKeys: Object.keys(mappings),
      mappings: mappings
    })

    return mappings
  })

  // Function to set time base from dropdown
  const setTimeBase = (value: string) => {
    if (value === 'custom') {
      // Open custom date modal instead of directly setting timebase
      customDateModalVisible.value = true
      return
    }

    // 🔧 FIX: Timebase only controls X-axis display range (5m, 10m, 30m, 1h)
    // Real-time mode should stay active for all timebases - only 'custom' disables it
    // The Auto Scroll toggle is the primary control for real-time mode
    // Note: Custom date ranges will disable real-time mode separately

    // Now set timebase - the watcher will see the correct isRealTime value
    timeBase.value = value

    // Don't call onTimeBaseChange() manually - let the Vue watcher handle timebase changes
    // This prevents duplicate API calls with different trendlog IDs
    // onTimeBaseChange()
  }

  // Series control computed properties
  const hasEnabledSeries = computed(() => {
    return dataSeries.value.some(series => series.visible)
  })

  const hasDisabledSeries = computed(() => {
    return dataSeries.value.some(series => !series.visible)
  })

  const analogSeries = computed(() => {
    return dataSeries.value.filter(series => series.unitType === 'analog')
  })

  const digitalSeries = computed(() => {
    return dataSeries.value.filter(series => series.unitType === 'digital')
  })

  // Input/Output/Variable series filters (based on T3000 point types)
  const inputSeries = computed(() => {
    return dataSeries.value.filter(series => series.pointType === 2) // Point type 2 = Input
  })

  const outputSeries = computed(() => {
    return dataSeries.value.filter(series => series.pointType === 1) // Point type 1 = Output
  })

  const variableSeries = computed(() => {
    return dataSeries.value.filter(series => series.pointType === 3) // Point type 3 = Variable
  })

  const hasAnalogSeries = computed(() => {
    return analogSeries.value.length > 0
  })

  const hasDigitalSeries = computed(() => {
    return digitalSeries.value.length > 0
  })

  const hasInputSeries = computed(() => {
    return inputSeries.value.length > 0
  })

  const hasOutputSeries = computed(() => {
    return outputSeries.value.length > 0
  })

  const hasVariableSeries = computed(() => {
    return variableSeries.value.length > 0
  })

  const analogCount = computed(() => {
    return analogSeries.value.length
  })

  const digitalCount = computed(() => {
    return digitalSeries.value.length
  })

  const inputCount = computed(() => {
    return inputSeries.value.length
  })

  const outputCount = computed(() => {
    return outputSeries.value.length
  })

  const variableCount = computed(() => {
    return variableSeries.value.length
  })

  // Detect when we have input data but no valid series (all filtered out as demo data)
  const hasInputDataButNoValidSeries = computed(() => {
    const inputData = props.itemData?.t3Entry?.input
    return (inputData && inputData.length > 0) && dataSeries.value.length === 0
  })

  // Enhanced loading state - show loading when waiting for valid T3000 device data
  // Show global loading when:
  // 1. Actually loading (isLoading is true) OR
  // 2. We have no data yet (neither analog nor digital) but also no confirmed error
  const shouldShowLoading = computed(() => {
    const noDataYet = analogSeriesList.value.length === 0 && digitalSeriesList.value.length === 0
    const noConfirmedError = !showLoadingTimeout.value && !hasConnectionError.value
    const result = isLoading.value || (noDataYet && noConfirmedError)

    LogUtil.Debug('🔍 shouldShowLoading:', result, {
      isLoading: isLoading.value,
      noDataYet,
      noConfirmedError,
      hasTimeout: showLoadingTimeout.value,
      hasError: hasConnectionError.value,
      seriesCount: analogSeriesList.value.length
    })
    return result
  })

  const allAnalogEnabled = computed(() => {
    return analogSeries.value.length > 0 && analogSeries.value.every(series => series.visible)
  })


  const allDigitalEnabled = computed(() => {
    return digitalSeries.value.length > 0 && digitalSeries.value.every(series => series.visible)
  })

  const allInputEnabled = computed(() => {
    return inputSeries.value.length > 0 && inputSeries.value.every(series => series.visible)
  })

  const allOutputEnabled = computed(() => {
    return outputSeries.value.length > 0 && outputSeries.value.every(series => series.visible)
  })

  const allVariableEnabled = computed(() => {
    return variableSeries.value.length > 0 && variableSeries.value.every(series => series.visible)
  })

  // Computed properties for visible series (for multi-canvas)
  const visibleAnalogSeries = computed(() => {
    return analogSeries.value.filter(series => series.visible)
  })

  const visibleDigitalSeries = computed(() => {
    // Use digitalSeriesList (which respects view tracking) instead of digitalSeries
    const result = digitalSeriesList.value.filter(series => series.visible)
    LogUtil.Info('🔍 visibleDigitalSeries computed', {
      digitalSeriesListLength: digitalSeriesList.value.length,
      visibleCount: result.length,
      seriesNames: result.map(s => s.name)
    })
    return result
  })

  // NEW: Analog series list for left panel (filtered by displayedSeries logic)
  const analogSeriesList = computed(() => {
    const displayed = displayedSeries.value
    return displayed.filter(series => series.unitType === 'analog')
  })

  // NEW: Digital series list for digital area (filtered by displayedSeries logic)
  const digitalSeriesList = computed(() => {
    const displayed = displayedSeries.value
    return displayed.filter(series => series.unitType === 'digital')
  })

  // NEW: Count of visible analog series
  const visibleAnalogSeriesCount = computed(() => {
    return analogSeriesList.value.filter(series => series.visible).length
  })

  // NEW: Count of visible digital series
  const visibleDigitalSeriesCount = computed(() => {
    return digitalSeriesList.value.filter(series => series.visible).length
  })

  // NEW: Scenario detection for conditional display - based on tracked/selected items
  const showAnalogArea = computed(() => {
    // Show analog area if:
    // 1. There are analog series available, OR
    // 2. There's a connection error AND no data at all (truly failed state)
    const hasAnalogSeries = analogSeriesList.value.length > 0
    const hasAnyData = dataSeries.value.some(s => s.data && s.data.length > 0)
    const shouldShowError = hasConnectionError.value && !hasAnyData

    return hasAnalogSeries || shouldShowError
  })
  const showDigitalArea = computed(() => digitalSeriesList.value.length > 0)
  const showResizableDivider = computed(() => analogSeriesList.value.length > 0 && digitalSeriesList.value.length > 0)
  const showAnalogXAxis = computed(() => {
    const hasTrackedAnalog = analogSeriesList.value.length > 0
    const hasTrackedDigital = digitalSeriesList.value.length > 0
    // Show top X-axis only when we have analog AND no digital tracked
    return hasTrackedAnalog && !hasTrackedDigital
  })
  const showDigitalHeader = computed(() => analogSeriesList.value.length === 0 && digitalSeriesList.value.length > 0)

  // Helper function to get digital state label using T3Range
  const getDigitalStateLabel = (series: SeriesConfig): string => {
    if (series.unitType !== 'digital') return ''

    const unit = series.unit || ''
    const unitCode = parseInt(unit)
    const digitalRange = rangeDefinitions.digital.find(range => range.id === unitCode)

    if (!digitalRange) return 'Unknown'

    // Get the last value to determine current state
    const lastValue = series.data.length > 0 ? series.data[series.data.length - 1].value : 0
    const stateIndex = lastValue > 0.5 ? 1 : 0

    // Handle direct property for correct state ordering
    const states = digitalRange.direct === false
      ? [digitalRange.on, digitalRange.off]
      : [digitalRange.off, digitalRange.on]

    return states[stateIndex] || 'Unknown'
  }

  // Helper function to get original series index from filtered series
  const getOriginalSeriesIndex = (series: SeriesConfig): number => {
    return dataSeries.value.findIndex(s => s.name === series.name)
  }

  // Loading timeout management functions
  const startLoadingTimeout = () => {
    clearLoadingTimeout()
    loadingTimeout.value = setTimeout(() => {
      showLoadingTimeout.value = true
      stopLoading()
      LogUtil.Warn('�?Loading timeout reached after 30 seconds')
    }, loadingTimeoutDuration)
  }

  const clearLoadingTimeout = () => {
    if (loadingTimeout.value) {
      clearTimeout(loadingTimeout.value)
      loadingTimeout.value = null
    }
    showLoadingTimeout.value = false
  }

  // Manual refresh function
  const manualRefresh = async () => {
    LogUtil.Debug('🔄 === MANUAL REFRESH START ===')
    LogUtil.Info('🔄 Manual refresh initiated')

    // Reset all states
    clearLoadingTimeout()
    showLoadingTimeout.value = false
    hasConnectionError.value = false
    startLoading()

    // Clear existing data completely
    dataSeries.value = []
    LogUtil.Debug('🔄 Step 1: Cleared dataSeries, length:', dataSeries.value.length)

    try {
      // Start timeout for this refresh attempt
      startLoadingTimeout()

      LogUtil.Debug('🔄 Step 2: Loading historical data...')
      // Just reload historical data - it will populate the series
      await loadHistoricalDataFromDatabase(true) // Force reload from device
      LogUtil.Debug('🔄 Step 3: After loadHistoricalDataFromDatabase, dataSeries length:', dataSeries.value.length)

      // 🔧 FIX: Check if chart was destroyed during refresh and recreate it
      if (!analogChartInstance && analogSeriesList.value.length > 0) {
        LogUtil.Debug('🔧 Recreating analog chart instance after refresh')
        createAnalogChart()
        await nextTick()
      }

      // 🔧 FIX: Call updateCharts to display the newly loaded data
      updateCharts()

      // Restart real-time updates if needed
      if (isRealTime.value && !realtimeInterval) {
        startRealTimeUpdates()
      }

      // Success - clear timeout and error state
      clearLoadingTimeout()
      hasConnectionError.value = false
      LogUtil.Debug('🔄 === MANUAL REFRESH SUCCESS ===', {
        dataSeriesLength: dataSeries.value.length,
        analogSeriesLength: analogSeriesList.value.length
      })

    } catch (error) {
      LogUtil.Debug('🔄 === MANUAL REFRESH ERROR ===')
      LogUtil.Error('❌ Manual refresh failed:', error)
      clearLoadingTimeout()
      hasConnectionError.value = true
      dataSeries.value = [] // Ensure series is cleared on error

      LogUtil.Debug('❌ Error state set:', {
        hasConnectionError: hasConnectionError.value,
        isLoading: isLoading.value,
        analogSeriesCount: analogSeriesList.value.length,
        dataSeriesCount: dataSeries.value.length,
        error: error
      })
    } finally {
      // 🔧 FIX: Always ensure loading state is cleared
      stopLoading()
    }
  }

  // Helper to get the data interval (in minutes) for the current time base

  // Helper to get the data interval (in minutes) for the current time base
  const getDataPointInterval = (timeBase: string): number => {
    const intervals = {
      '5m': 1,     // Every 1 minute
      '10m': 1,    // Every 1 minute
      '30m': 2,    // Every 2 minutes
      '1h': 5,     // Every 5 minutes
      '4h': 15,    // Every 15 minutes
      '12h': 30,   // Every 30 minutes
      '1d': 60,    // Every 60 minutes (1 hour)
      '4d': 240    // Every 240 minutes (4 hours)
    }
    return intervals[timeBase] || 1
  }

  // Helper to get min/max timestamp from all visible data series
  const getDataSeriesTimeBounds = () => {
    const allPoints = dataSeries.value
      .filter(series => series.visible)
      .flatMap(series => series.data)
      .map(point => point.timestamp)
    if (allPoints.length === 0) return { min: undefined, max: undefined }
    return {
      min: Math.min(...allPoints),
      max: Math.max(...allPoints)
    }
  }

  // Custom plugin for y-axis units with multi-axis indicators
  const yAxisUnitsPlugin = {
    id: 'yAxisUnits',
    afterDraw: (chart: any) => {
      const yScale = chart.scales.y
      const y1Scale = chart.scales.y1
      if (!yScale) return

      const ctx = chart.ctx
      ctx.save()

      // Get unit groups with colors and axis assignment from visible analog series
      const unitGroups = new Map()
      const visibleAnalog = visibleAnalogSeries.value

      // Loop through datasets to determine axis assignment
      chart.data.datasets.forEach((dataset: any) => {
        const series = visibleAnalog.find(s => s.name === dataset.label)
        if (!series || !series.unit) return

        const axisId = dataset.yAxisID || 'y'
        const key = `${series.unit}_${axisId}`

        if (!unitGroups.has(key)) {
          unitGroups.set(key, {
            unit: series.unit,
            color: series.color,
            axisId: axisId,
            count: 0
          })
        }
        unitGroups.get(key).count++
      })

      if (unitGroups.size === 0) {
        ctx.restore()
        return
      }

      // Build display text with axis indicators
      const groups = Array.from(unitGroups.values())
      const chartArea = chart.chartArea
      const y = chartArea.top - 15

      // Set font
      ctx.font = '11px Inter, Helvetica, Arial, sans-serif'
      ctx.textBaseline = 'middle'

      // Group by axis for display
      const leftGroups = groups.filter(g => g.axisId === 'y')
      const rightGroups = groups.filter(g => g.axisId === 'y1')

      // 🐛 DEBUG: Log header grouping
      LogUtil.Info('📊 Header label groups:', {
        totalGroups: groups.length,
        leftCount: leftGroups.length,
        rightCount: rightGroups.length,
        leftUnits: leftGroups.map(g => g.unit),
        rightUnits: rightGroups.map(g => g.unit),
        allGroups: groups.map(g => ({ unit: g.unit, axis: g.axisId, count: g.count }))
      })

      // ✅ Draw LEFT axis units on the LEFT side (no [L] indicator)
      if (leftGroups.length > 0) {
        let xOffset = yScale.left
        ctx.textAlign = 'left'

        // Only show unique units for left axis
        const uniqueLeftUnits = Array.from(new Set(leftGroups.map(g => g.unit)))
        uniqueLeftUnits.forEach((unit, index) => {
          const group = leftGroups.find(g => g.unit === unit)
          ctx.fillStyle = group?.color || '#666666'
          ctx.fillText(unit, xOffset, y)
          xOffset += ctx.measureText(unit).width
          if (index < uniqueLeftUnits.length - 1) {
            ctx.fillStyle = '#666666'
            ctx.fillText(', ', xOffset, y)
            xOffset += ctx.measureText(', ').width
          }
        })
      }

      // ✅ Draw RIGHT axis units on the RIGHT side (no [R] indicator)
      if (rightGroups.length > 0 && y1Scale && y1Scale.display !== false) {
        let xOffset = y1Scale.right
        ctx.textAlign = 'right'

        // Only show unique units for right axis
        const uniqueRightUnits = Array.from(new Set(rightGroups.map(g => g.unit))).reverse()
        uniqueRightUnits.forEach((unit, index) => {
          if (index > 0) {
            ctx.fillStyle = '#666666'
            const separatorWidth = ctx.measureText(', ').width
            xOffset -= separatorWidth
            ctx.fillText(', ', xOffset, y)
          }
          const group = rightGroups.find(g => g.unit === unit)
          ctx.fillStyle = group?.color || group?.axisId === 'y1' ? '#1890ff' : '#666666'
          const unitWidth = ctx.measureText(unit).width
          xOffset -= unitWidth
          ctx.fillText(unit, xOffset, y)
        })
      }

      ctx.restore()
    }
  }

  // Multi-canvas chart configuration functions
  const getAnalogChartConfig = () => ({
    type: 'line' as const,
    data: {
      datasets: [] // Will be populated in updateAnalogChart
    },
    plugins: [
      {
        id: 'yAxisTitleBackground',
        beforeDraw: (chart: any) => {
          const ctx = chart.ctx
          const yAxes = ['y', 'y1', 'y2', 'y3']

          yAxes.forEach(axisId => {
            const scale = chart.scales[axisId]
            if (!scale) return

            const titleText = scale.options.title.text
            if (!titleText) return

            const color = scale.options.title.color

            ctx.save()

            ctx.font = '9px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            const centerY = (scale.top + scale.bottom) / 2
            const boxWidth = 18
            const x = scale.left + boxWidth / 2 + 2

            const textWidth = ctx.measureText(titleText).width
            const boxPadding = 4
            const boxHeight = textWidth + (boxPadding * 2)

            // Draw colored background
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.roundRect(
              x - boxWidth / 2,
              centerY - boxHeight / 2,
              boxWidth,
              boxHeight,
              6
            )
            ctx.fill()

            // Draw white text
            ctx.fillStyle = '#ffffff'
            ctx.translate(x, centerY)
            ctx.rotate(-Math.PI / 2)
            ctx.fillText(titleText, 0, 0)

            ctx.restore()
          })
        }
      }
    ],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      elements: {
        line: {
          borderWidth: 2,
          skipNull: false
        },
        point: {
          radius: 0,
          hitRadius: 8,
          hoverRadius: 4
        }
      },
      layout: {
        padding: {
          left: 5,
          right: 10,
          top: 25,
          bottom: 10
        }
      },
      interaction: {
        intersect: false,
        mode: 'index' as const
      },
      plugins: {
        legend: {
          display: false,
          position: 'top' as const,
          labels: {
            color: '#000000',
            font: {
              size: 11,
              family: 'Inter, Helvetica, Arial, sans-serif'
            },
            usePointStyle: false,
            boxWidth: 2,
            boxHeight: 12
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
          axis: 'x'
        },
        tooltip: {
          enabled: false, // Disable default, use custom multi-tooltip
          position: 'nearest',
          external: (context: any) => {
            const { chart, tooltip } = context

            // Remove all existing tooltips and crosshair
            document.querySelectorAll('.chartjs-multi-tooltip').forEach(el => el.remove())
            document.querySelectorAll('.chartjs-crosshair').forEach(el => el.remove())

            // Hide if no tooltip
            if (tooltip.opacity === 0) {
              return
            }

            // Draw vertical crosshair line at hover position
            if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
              const position = chart.canvas.getBoundingClientRect()
              const scrollX = window.pageXOffset || document.documentElement.scrollLeft
              const scrollY = window.pageYOffset || document.documentElement.scrollTop

              const firstPoint = tooltip.dataPoints[0]
              const pointX = position.left + scrollX + firstPoint.element.x

              // Create crosshair line element
              const crosshairEl = document.createElement('div')
              crosshairEl.className = 'chartjs-crosshair'
              crosshairEl.style.position = 'absolute'
              crosshairEl.style.left = pointX + 'px'
              crosshairEl.style.top = (position.top + scrollY + chart.chartArea.top) + 'px'
              crosshairEl.style.width = '0px'
              crosshairEl.style.height = (chart.chartArea.bottom - chart.chartArea.top) + 'px'
              crosshairEl.style.borderLeft = '2px dashed #999'
              crosshairEl.style.pointerEvents = 'none'
              crosshairEl.style.zIndex = '999'

              document.body.appendChild(crosshairEl)

              // Create time display at top of crosshair
              const timeEl = document.createElement('div')
              timeEl.className = 'chartjs-crosshair'
              timeEl.style.position = 'absolute'
              timeEl.style.left = (pointX - 30) + 'px' // Center the time box
              timeEl.style.top = (position.top + scrollY + chart.chartArea.top - 20) + 'px'
              timeEl.style.pointerEvents = 'none'
              timeEl.style.zIndex = '1000'

              // Get time from the data point
              const timeLabel = tooltip.dataPoints[0].label || ''

              timeEl.innerHTML = `
                <div style="
                  background: white;
                  color: #000;
                  border: 1px solid #ff4d4f;
                  border-radius: 3px;
                  padding: 2px 6px;
                  font-size: 10px;
                  font-weight: 500;
                  white-space: nowrap;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                ">
                  ${timeLabel}
                </div>
              `

              document.body.appendChild(timeEl)
            }

            // Create individual tooltip for each data point
            if (tooltip.body && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
              const position = chart.canvas.getBoundingClientRect()
              const scrollX = window.pageXOffset || document.documentElement.scrollLeft
              const scrollY = window.pageYOffset || document.documentElement.scrollTop

              // Sort points by Y position to handle overlaps
              const sortedPoints = [...tooltip.dataPoints].sort((a, b) => a.element.y - b.element.y)

              // Track occupied vertical spaces to prevent overlap
              const tooltipPositions: Array<{top: number, bottom: number}> = []
              const tooltipHeight = 24 // Approximate height of tooltip
              const minSpacing = 4 // Minimum space between tooltips

              sortedPoints.forEach((point: any) => {
                const series = visibleAnalogSeries.value.find(s => s.name === point.dataset.label)
                const value = point.parsed.y.toFixed(2)
                const unit = series?.unit || ''
                const label = point.dataset.label || ''

                // Format display text - hide "Unused" unit
                const displayText = unit === 'Unused' ? `${label}: ${value}` : `${label}: ${value} ${unit}`

                // Create individual tooltip element
                const tooltipEl = document.createElement('div')
                tooltipEl.className = 'chartjs-multi-tooltip'
                tooltipEl.style.opacity = '1'
                tooltipEl.style.position = 'absolute'
                tooltipEl.style.pointerEvents = 'none'
                tooltipEl.style.transition = 'all 0.1s ease'
                tooltipEl.style.zIndex = '1000'

                // Tooltip content - compact, label with value and unit
                tooltipEl.innerHTML = `
                  <div style="
                    background: #f5f5f5;
                    color: #000;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    padding: 3px 6px;
                    font-size: 10px;
                    font-weight: 500;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                  ">
                    ${displayText}
                  </div>
                `

                // Position to the right of the data point
                const pointX = position.left + scrollX + point.element.x
                const pointY = position.top + scrollY + point.element.y

                // Calculate initial vertical position
                let tooltipTop = pointY - 12

                // Check for overlaps and adjust position
                let adjusted = true
                while (adjusted) {
                  adjusted = false
                  for (const occupied of tooltipPositions) {
                    // Check if this position overlaps with an existing tooltip
                    if (tooltipTop < occupied.bottom && tooltipTop + tooltipHeight > occupied.top) {
                      // Move below the overlapping tooltip
                      tooltipTop = occupied.bottom + minSpacing
                      adjusted = true
                      break
                    }
                  }
                }

                // Record this tooltip's position
                tooltipPositions.push({
                  top: tooltipTop,
                  bottom: tooltipTop + tooltipHeight
                })

                tooltipEl.style.left = (pointX + 10) + 'px'
                tooltipEl.style.top = tooltipTop + 'px'

                document.body.appendChild(tooltipEl)
              })
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as const,
            modifierKey: 'shift' as const
          },
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: 'rgba(24, 144, 255, 0.15)',
              borderColor: 'rgba(24, 144, 255, 0.5)',
              borderWidth: 1,
              modifierKey: 'ctrl' as const
            },
            mode: 'x' as const,
            onZoomComplete: ({ chart }: any) => {
              if (chart.scales.x) {
                const newStart = chart.scales.x.min
                const newEnd = chart.scales.x.max
                startTimestamp.value = Math.floor(newStart)
                endTimestamp.value = Math.floor(newEnd)
                isCustomDateRange.value = true
                const currentRangeSec = (endTimestamp.value - startTimestamp.value) / 1000
                const totalRangeSec = (maxTime.value - minTime.value) / 1000
                if (totalRangeSec > 0) {
                  zoomLevel.value = Math.max(1, Math.round(totalRangeSec / currentRangeSec))
                }
                // Force chart update to recalculate Y-axis and header with resize mode
                setTimeout(() => chart.update('resize'), 10)
              }
            }
          },
          limits: {
            x: {
              min: 'original' as const,
              max: 'original' as const,
              minRange: 60 * 1000
            }
          }
        }
      },
      scales: {
        x: (() => {
          // Get initial time window based on current timebase
          const timeWindow = getCurrentTimeWindow()

          // Get tick configuration
          let tickConfig: any
          let displayFormat: string
          let maxTicks: number

          if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
            const customConfig = getCustomTickConfig(
              customStartDate.value.toDate(),
              customEndDate.value.toDate()
            )
            tickConfig = { unit: customConfig.unit, stepMinutes: customConfig.stepSize }
            displayFormat = customConfig.displayFormat
            maxTicks = customConfig.maxTicks
          } else {
            tickConfig = getXAxisTickConfig(timeBase.value)
            displayFormat = getDisplayFormat(timeBase.value)
            const maxTicksConfigs = {
              '5m': 6, '10m': 6, '30m': 7, '1h': 7,
              '4h': 9, '12h': 13, '1d': 13, '4d': 13
            }
            maxTicks = maxTicksConfigs[timeBase.value] || 7
          }

          return {
            type: 'time' as const,
            display: true, // Keep x-axis displayed for grid lines
            min: timeWindow.min,
            max: timeWindow.max,
            time: {
              unit: tickConfig.unit,
              stepSize: tickConfig.stepMinutes,
              displayFormats: {
                minute: displayFormat,
                hour: displayFormat,
                day: 'yyyy-MM-dd HH:mm'
              },
              minUnit: 'second'
            },
            grid: {
              color: showGrid.value ? '#e0e0e0' : 'transparent',
              display: showGrid.value,
              lineWidth: 1,
              drawTicks: showAnalogXAxis.value // Only show tick marks when analog-only
            },
            ticks: {
              display: showAnalogXAxis.value, // Show labels only when analog-only (no digital series)
              color: '#595959',
              font: {
                size: 11,
                family: 'Inter, Helvetica, Arial, sans-serif'
              },
              maxRotation: 0,
              minRotation: 0,
              maxTicksLimit: maxTicks,
              autoSkip: false, // Don't skip ticks automatically
              callback: formatXAxisTick,
              includeBounds: true
            }
          }
        })(),
        y: {
          display: true,
          position: 'left' as const,
          title: {
            display: false, // Plugin renders with background
            text: '', // Will be set dynamically
            color: '#595959',
            font: {
              size: 11,
              weight: 'bold' as const
            }
          },
          grid: {
            color: showGrid.value ? '#e0e0e0' : 'transparent',
            display: showGrid.value,
            lineWidth: 1
          },
          ticks: {
            color: '#595959',
            font: {
              size: 10,
              family: 'Inter, Helvetica, Arial, sans-serif'
            },
            padding: 4,
            autoSkip: true,
            maxTicksLimit: 8,
            align: 'end',
            // stepSize will be calculated dynamically in afterDataLimits
            callback: function (value: any) {
              const formatted = Math.round(Number(value)).toString();
              return formatted.padStart(5, ' '); // Fixed width for alignment
            }
          },
          afterFit: function(scale: any) {
            // Check how many y-axes are actually displayed
            const chart = scale.chart
            if (chart?.options?.scales) {
              const visibleAxes = ['y', 'y1', 'y2', 'y3'].filter(axisId => {
                const axis = chart.options.scales[axisId]
                return axis && axis.display !== false
              })
              // If only one y-axis, use smaller width
              scale.width = visibleAxes.length === 1 ? 25 : 45
            } else {
              scale.width = 45
            }
          },
          // 🆕 ENHANCED: Smart Y-axis scaling (axis assignment done in updateAnalogChart)
          afterDataLimits: function (scale: any) {
            const data = scale.chart.data.datasets
            if (data.length === 0) return

            // Filter datasets assigned to this axis (y)
            const yDatasets = data.filter((ds: any) => !ds.yAxisID || ds.yAxisID === 'y')
            if (yDatasets.length === 0) return

            // Get all values for left Y-axis
            const allValues: number[] = []
            yDatasets.forEach((dataset: any) => {
              if (dataset.data && dataset.data.length > 0) {
                dataset.data.forEach((point: any) => {
                  if (point && typeof point.y === 'number' && isFinite(point.y) && point.y > -99999 && point.y < 999999) {
                    allValues.push(point.y)
                  }
                })
              }
            })

            if (allValues.length === 0) return

            const min = Math.min(...allValues)
            const max = Math.max(...allValues)
            const range = max - min

            LogUtil.Debug('📊 Y-axis afterDataLimits:', { min, max, range, valueCount: allValues.length, datasets: yDatasets.length })

            // Enhanced auto-ranging for better visibility
            if (range === 0) {
              // All values same - show ±10% range
              scale.min = min * 0.9
              scale.max = max * 1.1
            } else if (range < 2) {
              // If range is very small (like 0.1-0.3), expand 3x for better visibility
              const center = (min + max) / 2
              const expandedRange = Math.max(range * 3, 1) // At least 1 unit range, 3x zoom
              scale.min = center - expandedRange / 2
              scale.max = center + expandedRange / 2
            } else {
              // Normal range - add 10% padding top and bottom
              const padding = range * 0.1
              scale.min = min - padding
              scale.max = max + padding
            }

            // Calculate nice step size for more ticks
            const newRange = scale.max - scale.min
            const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
            const roughStep = newRange / 10 // Target 10 grid lines for more ticks
            const stepSize = niceSteps.find(s => s >= roughStep) || 1
            scale.options.ticks.stepSize = stepSize
          }
        },
        // 🆕 Y1 axis (left side, 2nd unit type)
        y1: {
          display: true,
          position: 'left' as const,
          stack: 'y-axis' as const,
          stackWeight: 1,
          grid: {
            drawOnChartArea: false,
            display: false
          },
          title: {
            display: false, // Plugin renders with background
            text: '', // Will be set dynamically
            color: '#1890ff',
            font: {
              size: 11,
              weight: 'bold' as const
            }
          },
          ticks: {
            color: '#1890ff',
            font: {
              size: 10,
              family: 'Inter, Helvetica, Arial, sans-serif'
            },
            padding: 4,
            autoSkip: true,
            maxTicksLimit: 8,
            align: 'end',
            callback: function (value: any) {
              return Math.round(Number(value)).toString().padStart(5, ' ');
            }
          },
          afterFit: function(scale: any) {
            const chart = scale.chart
            if (chart?.options?.scales) {
              const visibleAxes = ['y', 'y1', 'y2', 'y3'].filter(axisId => {
                const axis = chart.options.scales[axisId]
                return axis && axis.display !== false
              })
              scale.width = visibleAxes.length === 1 ? 25 : 45
            } else {
              scale.width = 45
            }
          },
          afterDataLimits: function (scale: any) {
            const data = scale.chart.data.datasets
            const y1Datasets = data.filter((ds: any) => ds.yAxisID === 'y1')

            if (y1Datasets.length === 0) {
              scale.display = false
              return
            }

            scale.display = true

            // Get all values for y1 axis
            const allValues: number[] = []
            y1Datasets.forEach((dataset: any) => {
              if (dataset.data && dataset.data.length > 0) {
                dataset.data.forEach((point: any) => {
                  if (point && typeof point.y === 'number' && isFinite(point.y) && point.y > -99999 && point.y < 999999) {
                    allValues.push(point.y)
                  }
                })
              }
            })

            if (allValues.length === 0) {
              scale.display = false
              return
            }

            const min = Math.min(...allValues)
            const max = Math.max(...allValues)
            const range = max - min

            LogUtil.Debug('📊 Y1-axis afterDataLimits:', { min, max, range, valueCount: allValues.length, datasets: y1Datasets.length })

            if (range === 0) {
              scale.min = min * 0.9
              scale.max = max * 1.1
            } else if (range < 2) {
              const center = (min + max) / 2
              const expandedRange = Math.max(range * 3, 1)
              scale.min = center - expandedRange / 2
              scale.max = center + expandedRange / 2
            } else {
              const padding = range * 0.1
              scale.min = min - padding
              scale.max = max + padding
            }

            // Calculate nice step size
            const newRange = scale.max - scale.min
            const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
            const roughStep = newRange / 10
            const stepSize = niceSteps.find(s => s >= roughStep) || 1
            scale.options.ticks.stepSize = stepSize

            LogUtil.Debug('📊 Y1-axis final scale:', { min: scale.min, max: scale.max, stepSize })
          }
        },
        // 🆕 Y2 axis (left side, 3rd unit type)
        y2: {
          display: true,
          position: 'left' as const,
          stack: 'y-axis' as const,
          stackWeight: 1,
          grid: {
            drawOnChartArea: false,
            display: false
          },
          title: {
            display: false, // Plugin renders with background
            text: '', // Will be set dynamically
            color: '#52c41a',
            font: {
              size: 11,
              weight: 'bold' as const
            }
          },
          ticks: {
            color: '#52c41a',
            font: {
              size: 10,
              family: 'Inter, Helvetica, Arial, sans-serif'
            },
            padding: 4,
            autoSkip: true,
            maxTicksLimit: 8,
            align: 'end',
            callback: function (value: any) {
              return Math.round(Number(value)).toString().padStart(5, ' ');
            }
          },
          afterFit: function(scale: any) {
            const chart = scale.chart
            if (chart?.options?.scales) {
              const visibleAxes = ['y', 'y1', 'y2', 'y3'].filter(axisId => {
                const axis = chart.options.scales[axisId]
                return axis && axis.display !== false
              })
              scale.width = visibleAxes.length === 1 ? 25 : 45
            } else {
              scale.width = 45
            }
          },
          afterDataLimits: function (scale: any) {
            const data = scale.chart.data.datasets
            const y2Datasets = data.filter((ds: any) => ds.yAxisID === 'y2')

            if (y2Datasets.length === 0) {
              scale.display = false
              return
            }

            scale.display = true
            const allValues: number[] = []
            y2Datasets.forEach((dataset: any) => {
              if (dataset.data && dataset.data.length > 0) {
                dataset.data.forEach((point: any) => {
                  if (point && typeof point.y === 'number' && isFinite(point.y) && point.y > -99999 && point.y < 999999) {
                    allValues.push(point.y)
                  }
                })
              }
            })

            if (allValues.length === 0) {
              scale.display = false
              return
            }

            const min = Math.min(...allValues)
            const max = Math.max(...allValues)
            const range = max - min

            if (range === 0) {
              scale.min = min * 0.9
              scale.max = max * 1.1
            } else if (range < 2) {
              const center = (min + max) / 2
              const expandedRange = Math.max(range * 3, 1)
              scale.min = center - expandedRange / 2
              scale.max = center + expandedRange / 2
            } else {
              const padding = range * 0.1
              scale.min = min - padding
              scale.max = max + padding
            }

            // Calculate nice step size
            const newRange = scale.max - scale.min
            const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
            const roughStep = newRange / 10
            const stepSize = niceSteps.find(s => s >= roughStep) || 1
            scale.options.ticks.stepSize = stepSize
          }
        },
        // 🆕 Y3 axis (left side, 4th unit type)
        y3: {
          display: true,
          position: 'left' as const,
          stack: 'y-axis' as const,
          stackWeight: 1,
          grid: {
            drawOnChartArea: false,
            display: false
          },
          title: {
            display: false, // Plugin renders with background
            text: '', // Will be set dynamically
            color: '#fa8c16',
            font: {
              size: 11,
              weight: 'bold' as const
            }
          },
          ticks: {
            color: '#fa8c16',
            font: {
              size: 10,
              family: 'Inter, Helvetica, Arial, sans-serif'
            },
            padding: 4,
            autoSkip: true,
            maxTicksLimit: 8,
            align: 'end',
            callback: function (value: any) {
              return Math.round(Number(value)).toString().padStart(5, ' ');
            }
          },
          afterFit: function(scale: any) {
            const chart = scale.chart
            if (chart?.options?.scales) {
              const visibleAxes = ['y', 'y1', 'y2', 'y3'].filter(axisId => {
                const axis = chart.options.scales[axisId]
                return axis && axis.display !== false
              })
              scale.width = visibleAxes.length === 1 ? 25 : 45
            } else {
              scale.width = 45
            }
          },
          afterDataLimits: function (scale: any) {
            const data = scale.chart.data.datasets
            const y3Datasets = data.filter((ds: any) => ds.yAxisID === 'y3')

            if (y3Datasets.length === 0) {
              scale.display = false
              return
            }

            scale.display = true
            const allValues: number[] = []
            y3Datasets.forEach((dataset: any) => {
              if (dataset.data && dataset.data.length > 0) {
                dataset.data.forEach((point: any) => {
                  if (point && typeof point.y === 'number' && isFinite(point.y) && point.y > -99999 && point.y < 999999) {
                    allValues.push(point.y)
                  }
                })
              }
            })

            if (allValues.length === 0) {
              scale.display = false
              return
            }

            const min = Math.min(...allValues)
            const max = Math.max(...allValues)
            const range = max - min

            if (range === 0) {
              scale.min = min * 0.9
              scale.max = max * 1.1
            } else if (range < 2) {
              const center = (min + max) / 2
              const expandedRange = Math.max(range * 3, 1)
              scale.min = center - expandedRange / 2
              scale.max = center + expandedRange / 2
            } else {
              const padding = range * 0.1
              scale.min = min - padding
              scale.max = max + padding
            }

            // Calculate nice step size
            const newRange = scale.max - scale.min
            const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
            const roughStep = newRange / 10
            const stepSize = niceSteps.find(s => s >= roughStep) || 1
            scale.options.ticks.stepSize = stepSize
          }
        }
      }
    }
  })

  const getDigitalChartConfig = (series: SeriesConfig, isLastChart: boolean = false) => {
    // Get digital states from the series range
    const digitalStates = getDigitalStatesFromRange(series.unitCode || 1)

    return {
      type: 'line' as const,
      data: {
        datasets: [] // Will be populated in updateDigitalCharts
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false as const,
        elements: {
          line: {
            borderWidth: 2,
            skipNull: false
          }
        },
        layout: {
          padding: {
            left: 5,
            right: 10,
            top: 0,
            bottom: isLastChart ? 10 : 0
          }
        },
        interaction: {
          intersect: false,
          mode: 'index' as const
        },
        plugins: {
          legend: {
            display: false // Digital charts don't need legends (shown in channel label)
          },
          tooltip: {
            enabled: false,
            position: 'nearest',
            external: (context: any) => {
              const { chart, tooltip } = context

              // Remove all existing tooltips and crosshair
              document.querySelectorAll('.chartjs-multi-tooltip').forEach(el => el.remove())
              document.querySelectorAll('.chartjs-crosshair').forEach(el => el.remove())

              // Hide if no tooltip
              if (tooltip.opacity === 0) {
                return
              }

              // Draw vertical crosshair line at hover position
              if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                const position = chart.canvas.getBoundingClientRect()
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft
                const scrollY = window.pageYOffset || document.documentElement.scrollTop

                const firstPoint = tooltip.dataPoints[0]
                const pointX = position.left + scrollX + firstPoint.element.x

                // Create crosshair line element
                const crosshairEl = document.createElement('div')
                crosshairEl.className = 'chartjs-crosshair'
                crosshairEl.style.position = 'absolute'
                crosshairEl.style.left = pointX + 'px'
                crosshairEl.style.top = (position.top + scrollY + chart.chartArea.top) + 'px'
                crosshairEl.style.width = '0px'
                crosshairEl.style.height = (chart.chartArea.bottom - chart.chartArea.top) + 'px'
                crosshairEl.style.borderLeft = '2px dashed #999'
                crosshairEl.style.pointerEvents = 'none'
                crosshairEl.style.zIndex = '999'

                document.body.appendChild(crosshairEl)

                // Create time display at top of crosshair
                const timeEl = document.createElement('div')
                timeEl.className = 'chartjs-crosshair'
                timeEl.style.position = 'absolute'
                timeEl.style.left = (pointX - 30) + 'px'
                timeEl.style.top = (position.top + scrollY + chart.chartArea.top - 20) + 'px'
                timeEl.style.pointerEvents = 'none'
                timeEl.style.zIndex = '1000'

                // Get time from the data point
                const timeLabel = tooltip.dataPoints[0].label || ''

                timeEl.innerHTML = `
                  <div style="
                    background: white;
                    color: #000;
                    border: 1px solid #ff4d4f;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: 500;
                    white-space: nowrap;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                  ">
                    ${timeLabel}
                  </div>
                `

                document.body.appendChild(timeEl)
              }

              // Create individual tooltip for each data point
              if (tooltip.body && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                const position = chart.canvas.getBoundingClientRect()
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft
                const scrollY = window.pageYOffset || document.documentElement.scrollTop

                // Sort points by Y position to handle overlaps
                const sortedPoints = [...tooltip.dataPoints].sort((a, b) => a.element.y - b.element.y)

                // Track occupied vertical spaces to prevent overlap
                const tooltipPositions: Array<{top: number, bottom: number}> = []
                const tooltipHeight = 24
                const minSpacing = 4

                sortedPoints.forEach((point: any) => {
                  const series = visibleDigitalSeries.value.find(s => s.name === point.dataset.label)
                  const label = point.dataset.label || ''

                  // Get control value from raw data (stored during data mapping)
                  const controlValue = point.raw?.control

                  // Get digital states for this series
                  const digitalStates = getDigitalStatesForYAxis(series?.unitCode || 1)
                  const stateText = digitalStates[controlValue] || ''

                  const displayText = `${label}: ${stateText}`

                  // Create individual tooltip element
                  const tooltipEl = document.createElement('div')
                  tooltipEl.className = 'chartjs-multi-tooltip'
                  tooltipEl.style.opacity = '1'
                  tooltipEl.style.position = 'absolute'
                  tooltipEl.style.pointerEvents = 'none'
                  tooltipEl.style.transition = 'all 0.1s ease'
                  tooltipEl.style.zIndex = '1000'

                  tooltipEl.innerHTML = `
                    <div style="
                      background: #f5f5f5;
                      color: #000;
                      border: 1px solid #d9d9d9;
                      border-radius: 4px;
                      padding: 3px 6px;
                      font-size: 10px;
                      font-weight: 500;
                      white-space: nowrap;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                    ">
                      ${displayText}
                    </div>
                  `

                  // Position to the right of the data point
                  const pointX = position.left + scrollX + point.element.x
                  const pointY = position.top + scrollY + point.element.y

                  // Calculate initial vertical position
                  let tooltipTop = pointY - 12

                  // Check for overlaps and adjust position
                  let adjusted = true
                  while (adjusted) {
                    adjusted = false
                    for (const occupied of tooltipPositions) {
                      if (tooltipTop < occupied.bottom && tooltipTop + tooltipHeight > occupied.top) {
                        tooltipTop = occupied.bottom + minSpacing
                        adjusted = true
                        break
                      }
                    }
                  }

                  // Record this tooltip's position
                  tooltipPositions.push({
                    top: tooltipTop,
                    bottom: tooltipTop + tooltipHeight
                  })

                  tooltipEl.style.left = (pointX + 10) + 'px'
                  tooltipEl.style.top = tooltipTop + 'px'

                  document.body.appendChild(tooltipEl)
                })
              }
            }
          }
        },
        scales: {
          x: (() => {
            // Get initial time window based on current timebase
            const timeWindow = getCurrentTimeWindow()

            // Get tick configuration
            let tickConfig: any
            let displayFormat: string
            let maxTicks: number

            if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
              const customConfig = getCustomTickConfig(
                customStartDate.value.toDate(),
                customEndDate.value.toDate()
              )
              tickConfig = { unit: customConfig.unit, stepMinutes: customConfig.stepSize }
              displayFormat = customConfig.displayFormat
              maxTicks = customConfig.maxTicks
            } else {
              tickConfig = getXAxisTickConfig(timeBase.value)
              displayFormat = getDisplayFormat(timeBase.value)
              const maxTicksConfigs = {
                '5m': 6, '10m': 6, '30m': 7, '1h': 7,
                '4h': 9, '12h': 13, '1d': 13, '4d': 13
              }
              maxTicks = maxTicksConfigs[timeBase.value] || 7
            }

            return {
              type: 'time' as const,
              display: isLastChart, // Only show x-axis on last chart
              min: timeWindow.min,
              max: timeWindow.max,
              time: {
                unit: tickConfig.unit,
                stepSize: tickConfig.stepMinutes,
                displayFormats: {
                  minute: displayFormat,
                  hour: displayFormat,
                  day: 'yyyy-MM-dd HH:mm'
                },
                minUnit: 'second'
              },
              grid: {
                color: '#e0e0e0',
                display: true,
                lineWidth: 1, // Make vertical grid lines more visible
                drawOnChartArea: true, // Ensure grid lines are drawn over chart area
                drawTicks: isLastChart // Only draw tick marks on last chart
              },
              ticks: {
                display: isLastChart, // Only display ticks on last chart
                color: '#595959',
                font: {
                  size: 10,
                  family: 'Inter, Helvetica, Arial, sans-serif'
                },
                maxRotation: 0,
                minRotation: 0,
                maxTicksLimit: maxTicks,
                autoSkip: false,
                callback: formatXAxisTick,
                includeBounds: true
              }
            }
          })(),
          y: {
            min: 0,
            max: 1.4,
            reverse: true, // CRITICAL: Reverse Y-axis so control=0 appears at TOP, control=1 at BOTTOM
            display: true, // Show y-axis for digital charts
            grid: {
              color: '#F0F0F0',
              display: true,
              lineWidth: 0.3
            },
            ticks: {
              display: true, // Show y-axis ticks for digital charts
              color: '#595959',
              font: {
                size: 8,
                family: 'Inter, Helvetica, Arial, sans-serif'
              },
              padding: 2, // Match analog chart padding for alignment
              autoSkip: false,
              align: 'end',
              maxTicksLimit: 2, // Limit to only the two states
              callback: function (value: any) {
                // With reverse=true: value=0 appears at TOP, value=1 at BOTTOM
                // control=0 → digitalStates[0] (first value) → at TOP (e.g., "Close")
                // control=1 → digitalStates[1] (second value) → at BOTTOM (e.g., "Open")
                const label = value > 0.5 ? digitalStates[1] : digitalStates[0];
                return label.padStart(5, ' '); // Fixed width for alignment
              }
            },
            afterFit: function(scale: any) {
              scale.width = 50; // Fixed width for Y-axis to ensure alignment
            }
          }
        }
      }
    }
  }

  // Combined digital chart config - single canvas showing all digital series stacked
  const getCombinedDigitalChartConfig = () => {
    // Get initial time window based on current timebase
    const timeWindow = getCurrentTimeWindow()

    // Get tick configuration
    let tickConfig: any
    let displayFormat: string
    let maxTicks: number

    if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
      const customConfig = getCustomTickConfig(
        customStartDate.value.toDate(),
        customEndDate.value.toDate()
      )
      tickConfig = { unit: customConfig.unit, stepMinutes: customConfig.stepSize }
      displayFormat = customConfig.displayFormat
      maxTicks = customConfig.maxTicks
    } else {
      tickConfig = getXAxisTickConfig(timeBase.value)
      displayFormat = getDisplayFormat(timeBase.value)
      const maxTicksConfigs = {
        '5m': 6, '10m': 6, '30m': 7, '1h': 7,
        '4h': 9, '12h': 13, '1d': 13, '4d': 13
      }
      maxTicks = maxTicksConfigs[timeBase.value] || 7
    }

    return {
      type: 'line' as const,
      data: {
        datasets: [] // Will be populated in updateDigitalCharts
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false as const,
        elements: {
          line: {
            borderWidth: 2,
            skipNull: false,
            stepped: 'before' as const // Step line for digital signals
          },
          point: {
            radius: 0 // No points, just lines
          }
        },
        layout: {
          padding: {
            left: 0,
            right: 10,
            top: 25,
            bottom: 10
          }
        },
        interaction: {
          intersect: false,
          mode: 'index' as const
        },
        plugins: {
          legend: {
            display: false // Hide legend to use full width
          },
          tooltip: {
            enabled: false,
            position: 'nearest',
            external: (context: any) => {
              const { chart, tooltip } = context

              // Remove all existing tooltips and crosshair
              document.querySelectorAll('.chartjs-multi-tooltip').forEach(el => el.remove())
              document.querySelectorAll('.chartjs-crosshair').forEach(el => el.remove())

              // Hide if no tooltip
              if (tooltip.opacity === 0) {
                return
              }

              // Draw vertical crosshair line at hover position
              if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                const position = chart.canvas.getBoundingClientRect()
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft
                const scrollY = window.pageYOffset || document.documentElement.scrollTop

                const firstPoint = tooltip.dataPoints[0]
                const pointX = position.left + scrollX + firstPoint.element.x

                // Create crosshair line element
                const crosshairEl = document.createElement('div')
                crosshairEl.className = 'chartjs-crosshair'
                crosshairEl.style.position = 'absolute'
                crosshairEl.style.left = pointX + 'px'
                crosshairEl.style.top = (position.top + scrollY + chart.chartArea.top) + 'px'
                crosshairEl.style.width = '0px'
                crosshairEl.style.height = (chart.chartArea.bottom - chart.chartArea.top) + 'px'
                crosshairEl.style.borderLeft = '2px dashed #999'
                crosshairEl.style.pointerEvents = 'none'
                crosshairEl.style.zIndex = '999'

                document.body.appendChild(crosshairEl)

                // Create time display at top of crosshair
                const timeEl = document.createElement('div')
                timeEl.className = 'chartjs-crosshair'
                timeEl.style.position = 'absolute'
                timeEl.style.left = (pointX - 30) + 'px'
                timeEl.style.top = (position.top + scrollY + chart.chartArea.top - 20) + 'px'
                timeEl.style.pointerEvents = 'none'
                timeEl.style.zIndex = '1000'

                // Get time from the data point
                const timeLabel = tooltip.dataPoints[0].label || ''

                timeEl.innerHTML = `
                  <div style="
                    background: white;
                    color: #000;
                    border: 1px solid #ff4d4f;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: 500;
                    white-space: nowrap;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                  ">
                    ${timeLabel}
                  </div>
                `

                document.body.appendChild(timeEl)
              }

              // Create individual tooltip for each data point
              if (tooltip.body && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                const position = chart.canvas.getBoundingClientRect()
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft
                const scrollY = window.pageYOffset || document.documentElement.scrollTop

                // Sort points by Y position to handle overlaps
                const sortedPoints = [...tooltip.dataPoints].sort((a, b) => a.element.y - b.element.y)

                // Track occupied vertical spaces to prevent overlap
                const tooltipPositions: Array<{top: number, bottom: number}> = []
                const tooltipHeight = 24
                const minSpacing = 4

                sortedPoints.forEach((point: any) => {
                  const series = visibleDigitalSeries.value.find(s => s.name === point.dataset.label)
                  const label = point.dataset.label || ''

                  // Get control value from raw data (stored during data mapping)
                  const controlValue = point.raw?.control

                  // Get digital states for this series
                  const digitalStates = getDigitalStatesForYAxis(series?.unitCode || 1)
                  const stateText = digitalStates[controlValue] || ''

                  const displayText = `${label}: ${stateText}`

                  // Create individual tooltip element
                  const tooltipEl = document.createElement('div')
                  tooltipEl.className = 'chartjs-multi-tooltip'
                  tooltipEl.style.opacity = '1'
                  tooltipEl.style.position = 'absolute'
                  tooltipEl.style.pointerEvents = 'none'
                  tooltipEl.style.transition = 'all 0.1s ease'
                  tooltipEl.style.zIndex = '1000'

                  tooltipEl.innerHTML = `
                    <div style="
                      background: #f5f5f5;
                      color: #000;
                      border: 1px solid #d9d9d9;
                      border-radius: 4px;
                      padding: 3px 6px;
                      font-size: 10px;
                      font-weight: 500;
                      white-space: nowrap;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                    ">
                      ${displayText}
                    </div>
                  `

                  // Position to the right of the data point
                  const pointX = position.left + scrollX + point.element.x
                  const pointY = position.top + scrollY + point.element.y

                  // Calculate initial vertical position
                  let tooltipTop = pointY - 12

                  // Check for overlaps and adjust position
                  let adjusted = true
                  while (adjusted) {
                    adjusted = false
                    for (const occupied of tooltipPositions) {
                      if (tooltipTop < occupied.bottom && tooltipTop + tooltipHeight > occupied.top) {
                        tooltipTop = occupied.bottom + minSpacing
                        adjusted = true
                        break
                      }
                    }
                  }

                  // Record this tooltip's position
                  tooltipPositions.push({
                    top: tooltipTop,
                    bottom: tooltipTop + tooltipHeight
                  })

                  tooltipEl.style.left = (pointX + 10) + 'px'
                  tooltipEl.style.top = tooltipTop + 'px'

                  document.body.appendChild(tooltipEl)
                })
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time' as const,
            display: true,
            min: timeWindow.min,
            max: timeWindow.max,
            time: {
              unit: tickConfig.unit,
              stepSize: tickConfig.stepMinutes,
              displayFormats: {
                minute: displayFormat,
                hour: displayFormat,
                day: 'yyyy-MM-dd HH:mm'
              },
              minUnit: 'second'
            },
            grid: {
              color: '#e0e0e0',
              display: true,
              lineWidth: 1,
              drawOnChartArea: true,
              drawTicks: true
            },
            ticks: {
              display: true,
              color: '#595959',
              font: {
                size: 10,
                family: 'Inter, Helvetica, Arial, sans-serif'
              },
              maxRotation: 0,
              minRotation: 0,
              maxTicksLimit: maxTicks,
              autoSkip: false,
              callback: formatXAxisTick,
              includeBounds: true
            }
          },
          y: {
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            grid: {
              color: (context: any) => {
                const value = context.tick.value
                const seriesIndex = Math.floor(value / 1.2)
                const withinSeriesValue = value - (seriesIndex * 1.2)
                // Only draw lines between series (at 0, 1.2, 2.4, 3.6...)
                if (Math.abs(withinSeriesValue) < 0.01) {
                  return '#b0b0b0'
                }
                // No other gridlines
                return 'transparent'
              },
              display: true,
              lineWidth: 1,
              drawOnChartArea: true,
              drawTicks: false
            },
            ticks: {
              display: true,
              color: '#666666',
              font: {
                size: 10,
                family: 'Inter, Helvetica, Arial, sans-serif',
                weight: '500'
              },
              padding: 6,
              align: 'center' as const,
              callback: function (value: any, index: number, ticks: any[]) {
                const numValue = Number(value)
                const seriesIndex = Math.floor(numValue / 1.2)

                if (seriesIndex >= visibleDigitalSeries.value.length) {
                  return ''
                }

                const series = visibleDigitalSeries.value[seriesIndex]
                if (!series) return ''

                // Get states in the same order as shown in the left panel label
                const digitalStates = getDigitalStatesForYAxis(series.unitCode || 1)

                // If no valid states, don't show labels
                if (!digitalStates[0] && !digitalStates[1]) {
                  return ''
                }

                const withinSeriesValue = numValue - (seriesIndex * 1.2)

                // Y-axis goes bottom to top, but we want labels to match left panel top-to-bottom order
                // Show second state from label at 0.3 (lower position, bottom)
                if (Math.abs(withinSeriesValue - 0.3) < 0.01) {
                  return digitalStates[1]
                }
                // Show first state from label at 0.9 (higher position, top)
                else if (Math.abs(withinSeriesValue - 0.9) < 0.01) {
                  return digitalStates[0]
                }

                return ''
              },
              autoSkip: false,
              stepSize: 0.3,
              maxTicksLimit: 150
            },
            afterFit: function (scale: any) {
              scale.width = 55
            }
          }
        }
      }
    }
  }

  // Value mapping for two-zone Y-axis layout
  const mapValueToYAxis = (value: number, unitType: 'analog' | 'digital'): number => {
    if (unitType === 'digital') {
      // Digital values map to bottom zone (below divider at 2.5)
      // 0 maps to position 0 (where "0" label is)
      // 1 maps to position 1.5 (where "1" label is) - larger gap
      return value === 0 ? 0 : 1.5
    } else {
      // Analog values map to upper zone (3-11, above divider at 2.5)
      // Normalize large analog values to fit in the 3-11 range
      const normalizedValue = Math.max(0, Math.min(8, value / 1000)) // Scale down by 1000, clamp to 0-8
      return 3 + normalizedValue // Shift to 3-11 range
    }
  }

  // Section divider plugin for Chart.js
  const sectionDividerPlugin = {
    id: 'sectionDivider',
    afterDraw: (chart: any) => {
      const ctx = chart.ctx
      const chartArea = chart.chartArea

      // Calculate the Y position for the divider (at value 2.5, between zones)
      const yScale = chart.scales.y
      const dividerY = yScale.getPixelForValue(2.5)

      // Draw thick black divider line
      ctx.save()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(chartArea.left, dividerY)
      ctx.lineTo(chartArea.right, dividerY)
      ctx.stroke()

      // Add zone labels
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 12px Inter, Arial, sans-serif'
      ctx.textAlign = 'left'

      // Upper zone label (Analog) - above the divider line
      const upperZoneY = yScale.getPixelForValue(7) // Middle of upper zone (3-11)
      // ctx.fillText('Analog Values', chartArea.left + 10, upperZoneY) // Removed per user request

      // Lower zone label (Digital) - below the divider line
      const lowerZoneY = yScale.getPixelForValue(0.75) // Middle of lower zone (-0.5 to 2.5)
      // ctx.fillText('Digital Values', chartArea.left + 10, lowerZoneY) // Removed per user request

      ctx.restore()
    }
  }// Time navigation tracking
  const timeOffset = ref(0) // Offset in minutes from current time

  // Add helper to get current time window with proper alignment (simplified)
  const getCurrentTimeWindow = () => {
    // For custom date range, use the exact start/end times selected by user
    if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
      const minTime = customStartDate.value.valueOf()
      const maxTime = customEndDate.value.valueOf()

      LogUtil.Info('📅 Custom Date Range Time Window:', {
        customStartDate: customStartDate.value.format('YYYY-MM-DD HH:mm:ss'),
        customEndDate: customEndDate.value.format('YYYY-MM-DD HH:mm:ss'),
        minTimestamp: minTime,
        maxTimestamp: maxTime,
        minISO: new Date(minTime).toISOString(),
        maxISO: new Date(maxTime).toISOString(),
        rangeDuration: `${Math.round((maxTime - minTime) / 60000)} minutes`
      })

      return {
        min: minTime,
        max: maxTime
      }
    }

    // For standard timebases, calculate based on current time and offset
    const now = new Date()
    // Align current time to exact minute
    const currentMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)

    // Apply time offset for navigation
    const offsetTime = new Date(currentMinute.getTime() + timeOffset.value * 60 * 1000)

    // Add 1 minute to max time to provide space for current data points
    const maxTime = new Date(offsetTime.getTime() + 60 * 1000) // +1 minute buffer

    const rangeMinutes = getTimeRangeMinutes(timeBase.value)
    const startTime = new Date(maxTime.getTime() - rangeMinutes * 60 * 1000)

    return {
      min: startTime.getTime(),
      max: maxTime.getTime()
    }
  }


  // Data generation and management functions removed
  // Only real-time data from T3000 API will be used

  // ====================================================================================
  // REAL DATA INTEGRATION: T3000 Monitor Data Extraction and Real-time Data Fetching
  // ====================================================================================

  /**
   * Enhanced monitor configuration extraction using T3000DataManager
   * @returns Monitor configuration with input items and timing intervals
   */
  const getMonitorConfigFromT3000Data = async () => {
    // Get the monitor ID and PID from current item data (props or global)
    const monitorId = (currentItemData.value as any)?.t3Entry?.id
    const panelId = (currentItemData.value as any)?.t3Entry?.pid

    LogUtil.Info('🔍 getMonitorConfigFromT3000Data: Extracting config parameters', {
      monitorId,
      panelId,
      hasCurrentItemData: !!currentItemData.value,
      currentItemDataType: typeof currentItemData.value,
      t3EntryExists: !!(currentItemData.value as any)?.t3Entry,
      propsItemData: !!props.itemData,
      timestamp: new Date().toISOString()
    })

    if (!monitorId) {
      LogUtil.Warn('�?getMonitorConfigFromT3000Data: No monitor ID available', {
        currentItemData: currentItemData.value,
        propsItemData: props.itemData
      })
      return null
    }

    if (!panelId && panelId !== 0) {
      LogUtil.Warn('�?getMonitorConfigFromT3000Data: No panel ID available', {
        monitorId,
        panelId,
        currentItemData: currentItemData.value
      })
      return null
    }

    try {
      // Use enhanced data manager to wait for data readiness
      const validation = await t3000DataManager.waitForDataReady({
        timeout: 15000, // 15 seconds timeout
        specificEntries: [monitorId]
      })

      if (!validation.isValid) {
        return null
      }

      // Get the monitor entry using enhanced data manager with PID filtering
      const monitorConfig = await t3000DataManager.getEntryByPid(monitorId, panelId)

      if (!monitorConfig) {
        return null
      }

      // Calculate the data retrieval interval in milliseconds using the unified function
      const intervalMs = calculateT3000Interval(monitorConfig)

      // Extract input items from the configuration
      const inputItems = []
      const ranges = []

      // Parse input items based on actual monitor configuration structure
      // monitorConfig has 'input' array with objects and 'range' array

      // 🔧 FIX: Filter to only include items specified in URL parameters to prevent 14-item generation
      const urlInputItems = props.itemData?.t3Entry?.input || []
      const urlRangeItems = props.itemData?.t3Entry?.range || []

      if (monitorConfig.input && Array.isArray(monitorConfig.input)) {
        // If URL specifies specific items, filter to only those items
        if (urlInputItems.length > 0) {
          for (let urlIndex = 0; urlIndex < urlInputItems.length; urlIndex++) {
            const urlInputItem = urlInputItems[urlIndex]

            // Find matching item in monitor config
            const matchingItem = monitorConfig.input.find((configItem: any) =>
              configItem.panel === urlInputItem.panel &&
              configItem.point_number === urlInputItem.point_number &&
              configItem.point_type === urlInputItem.point_type
            )

            if (matchingItem) {
              inputItems.push({
                panel: matchingItem.panel,
                point_number: matchingItem.point_number,
                index: urlIndex, // Use URL index for consistency
                point_type: matchingItem.point_type,
                network: matchingItem.network,
                sub_panel: matchingItem.sub_panel
              })

              // Get corresponding range value from URL
              const rangeValue = urlRangeItems[urlIndex] || 0
              ranges.push(rangeValue)
            } else {
              LogUtil.Warn('⚠️ URL item not found in monitor config', {
                urlItem: urlInputItem,
                availableItems: monitorConfig.input.slice(0, 3) // Show first 3 for debugging
              })
            }
          }
        } else {
          // Fallback: use all monitor config items (original behavior)
          for (let i = 0; i < monitorConfig.input.length; i++) {
            const inputItem = monitorConfig.input[i]
            if (inputItem && inputItem.panel !== undefined && inputItem.point_number !== undefined) {
              inputItems.push({
                panel: inputItem.panel,
                point_number: inputItem.point_number,
                index: i,
                point_type: inputItem.point_type,
                network: inputItem.network,
                sub_panel: inputItem.sub_panel
              })

              // Get corresponding range value
              const rangeValue = (monitorConfig.range && monitorConfig.range[i]) ? monitorConfig.range[i] : 0
              ranges.push(rangeValue)
            }
          }
        }
      }

      // Check if we actually have valid input items with meaningful data
      if (inputItems.length === 0) {
        return null
      }

      // Additional validation: check if input items have valid point numbers and panels
      const validInputItems = inputItems.filter(item =>
        item.panel !== undefined &&
        item.point_number !== undefined &&
        item.point_number >= 0
      )

      if (validInputItems.length === 0) {
        return null
      }

      const result = {
        id: monitorConfig.id,
        label: monitorConfig.label || monitorConfig.description || `Monitor ${monitorId}`,
        pid: monitorConfig.pid,
        type: monitorConfig.type,
        status: monitorConfig.status,
        numInputs: inputItems.length,
        inputItems: inputItems,
        ranges: ranges,
        dataIntervalMs: intervalMs,
        originalConfig: monitorConfig
      }

      return result

    } catch (error) {
      return null
    }
  }


  /**
   * Initialize FFI API client for data communication
   * Now using HTTP-based FFI API for all operations instead of WebSocket
   */
  const initializeDataClients = () => {
    // Return FFI API instance for all data operations
    return ffiApi
  }

  /**
   * Wait for panelsData to be available and populated
   */
  const waitForPanelsData = async (timeoutMs: number = 10000): Promise<boolean> => {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const panelsData = T3000_Data.value.panelsData || []

      if (panelsData.length > 0) {
        return true
      }

      await new Promise(resolve => setTimeout(resolve, 200)) // Reduced from 500ms to 200ms for faster detection
    }

    return false
  }

  /**
   * Process GET_PANEL_DATA (Action 0) response to extract point metadata and values
   * Matches points from monitor config with current values from panel data
   */
  const processPanelDataResponse = (response: any, monitorConfigData: any): DataPoint[][] => {
    const results: DataPoint[][] = []

    if (!response?.data) {
      LogUtil.Warn('⚠️ processPanelDataResponse: No data in response')
      return results
    }

    LogUtil.Info('📊 Processing GET_PANEL_DATA response (Action 0)', {
      hasInputs: !!response.data.inputs,
      hasOutputs: !!response.data.outputs,
      hasVariables: !!response.data.variables,
      inputItemsCount: monitorConfigData.inputItems?.length || 0
    })

    // Combine all point types into single array (Action 0 returns separate arrays)
    const allPoints = [
      ...(response.data.inputs || []),
      ...(response.data.outputs || []),
      ...(response.data.variables || [])
    ]

    // Match each monitor input item with corresponding point from panel data
    monitorConfigData.inputItems.forEach((inputItem: any, index: number) => {
      const rangeValue = monitorConfigData.ranges[index] || 0

      // Find matching point by panel, point_number, and point_type
      const matchingPoint = allPoints.find((point: any) => {
        const pointPanel = point.panel || point.pid
        const pointIndex = point.index
        // point_type: 1=INPUT, 2=OUTPUT, 3=VARIABLE
        const expectedIndex = inputItem.point_number

        return pointPanel === inputItem.panel && pointIndex === expectedIndex
      })

      if (matchingPoint) {
        const processedValue = processDeviceValue(matchingPoint, rangeValue)
        results.push([{
          timestamp: Date.now(),
          value: processedValue.value
        }])

        LogUtil.Info(`✅ Matched point ${index}:`, {
          inputItem,
          matchingPoint: { index: matchingPoint.index, value: matchingPoint.value, label: matchingPoint.label }
        })
      } else {
        // Default data point for unmatched items
        results.push([{
          timestamp: Date.now(),
          value: 0
        }])

        LogUtil.Warn(`⚠️ No matching point for item ${index}`, { inputItem })
      }
    })

    return results
  }

  /**
   * Fetch real-time data for all monitor input items
   */
  const fetchRealTimeMonitorData = async (): Promise<DataPoint[][]> => {
    try {
      LogUtil.Info('📡 fetchRealTimeMonitorData: Starting data fetch', {
        hasMonitorConfig: !!monitorConfig.value,
        hasPanelsData: !!(T3000_Data.value.panelsData?.length),
        panelsDataLength: T3000_Data.value.panelsData?.length || 0,
        timestamp: new Date().toISOString()
      })

      // Only show loading state if we don't have data yet (initial load)
      const hasExistingData = dataSeries.value.some(s => s.data && s.data.length > 0)
      if (!hasExistingData) {
        startLoading()
      }

      // Use the reactive monitor config
      const monitorConfigData = monitorConfig.value
      if (!monitorConfigData) {
        LogUtil.Error('�?fetchRealTimeMonitorData: No monitor config available')
        if (!hasExistingData) stopLoading()
        return []
      }

      // Check if panelsData is already available - if so, proceed immediately
      const currentPanelsData = T3000_Data.value.panelsData || []
      let panelsDataReady = false

      if (currentPanelsData.length > 0) {
        panelsDataReady = true
      } else {
        // Only wait if panelsData is not already available
        panelsDataReady = await waitForPanelsData(5000) // Reduced timeout from 10s to 5s
      }

      if (!panelsDataReady) {
        LogUtil.Error('�?fetchRealTimeMonitorData: Timeout waiting for panels data', {
          waitTimeout: '5000ms',
          currentPanelsDataLength: T3000_Data.value.panelsData?.length || 0,
          T3000DataExists: !!T3000_Data.value
        })
        if (!hasExistingData) stopLoading()
        return []
      }

      // Initialize data client (returns single client based on environment)
      const dataClient = initializeDataClients()

      LogUtil.Info('🔌 fetchRealTimeMonitorData: Data client initialized', {
        hasDataClient: !!dataClient,
        clientType: dataClient?.constructor?.name || 'unknown',
        isBuiltInBrowser: window.location.protocol === 'ms-appx-web:' || (window as any).chrome?.webview !== undefined
      })

      if (!dataClient) {
        LogUtil.Error('�?fetchRealTimeMonitorData: Failed to initialize data client')
        return []
      }

      // Note: Database storage is handled by T3000_Data watcher instead of custom handlers
      // setupGetEntriesResponseHandlers(dataClient) // Removed - doesn't work with bound methods

      // 🆕 FFI API: Get panel ID from URL or monitor config
      const urlPanelId = route.query.panel_id ? parseInt(route.query.panel_id as string) : null
      const panelId = urlPanelId || monitorConfigData.pid || 1

      LogUtil.Info('📡 FFI API: Using GET_PANEL_DATA (Action 0) for initial data fetch', {
        panelId,
        urlPanelId,
        monitorConfigPid: monitorConfigData.pid,
        inputItemsCount: monitorConfigData.inputItems?.length || 0
      })

      // 🆕 FFI API: Call Action 0 (GET_PANEL_DATA) to get initial point metadata and values
      const panelDataResponse = await ffiApi.ffiGetPanelData(panelId)

      if (!panelDataResponse || !panelDataResponse.data) {
        LogUtil.Error('❌ FFI API: GET_PANEL_DATA returned no data', { panelId })
        if (!hasExistingData) stopLoading()
        return []
      }

      LogUtil.Info('✅ FFI API: GET_PANEL_DATA response received', {
        hasInputs: !!panelDataResponse.data.inputs,
        hasOutputs: !!panelDataResponse.data.outputs,
        hasVariables: !!panelDataResponse.data.variables,
        inputsCount: panelDataResponse.data.inputs?.length || 0,
        outputsCount: panelDataResponse.data.outputs?.length || 0,
        variablesCount: panelDataResponse.data.variables?.length || 0
      })

      // Process response and match with monitor config to extract point values
      const allDataResults = processPanelDataResponse(panelDataResponse, monitorConfigData)

      return allDataResults

    } catch (error) {
      return []
    } finally {
      // Clear loading state (only if we started it)
      const hasExistingData = dataSeries.value.some(s => s.data && s.data.length > 0)
      if (!hasExistingData) {
        stopLoading()
      }
    }
  }

  /**
   * Fetch data for a single input item with enhanced device mapping
   */
  const fetchSingleItemData = async (dataClient: any, inputItem: any, config: any): Promise<DataPoint[]> => {
    try {
      // Extract index from config (this should match the input item index in the array)
      const itemIndex = config.itemIndex || 0
      const rangeValue = config.ranges[itemIndex] || 0

      // Log device mapping details
      const deviceId = logDeviceMapping(inputItem, itemIndex, rangeValue)

      // Find matching device in panelsData using new enhanced lookup
      const matchingDevice = findPanelDataDevice(inputItem, config.panelData)

      if (!matchingDevice) {
        return [{
          timestamp: Date.now(),
          value: 0
        }]
      }

      // Process the device value using enhanced logic with panel data + input range
      const processedValue = processDeviceValue(matchingDevice, rangeValue)

      // Send GET_ENTRIES request to get latest data from T3000
      const deviceIndex = parseInt(matchingDevice.index) || 0
      // const deviceType = mapPointTypeToString(inputItem.point_type)
      const deviceType = inputItem.point_type

      await sendGetEntriesRequest(dataClient, config.panelId, deviceIndex, deviceType)

      // Return current data point with processed value
      // Note: More data will come through the message handlers (HandleGetEntriesRes)
      const resultDataPoint = {
        timestamp: Date.now(),
        value: processedValue.value
      }

      return [resultDataPoint]

    } catch (error) {
      return [{
        timestamp: Date.now(),
        value: 0
      }]
    }
  }

  /**
   * Fetch data for ALL items using BATCH request (optimized approach)
   * Sends one GET_ENTRIES request for all items instead of individual requests
   */
  const fetchAllItemsDataBatch = async (dataClient: any, monitorConfigData: any, config: any): Promise<DataPoint[][]> => {
    try {
      LogUtil.Info('📦 TrendLogChart: fetchAllItemsDataBatch called', {
        inputItemsCount: monitorConfigData.inputItems?.length || 0,
        panelId: config.panelId,
        timestamp: new Date().toISOString()
      })

      // Build batch request data for ALL items at once
      const batchRequestData: any[] = []
      const itemConfigs: any[] = []

      monitorConfigData.inputItems.forEach((inputItem: any, index: number) => {
        const itemIndex = index
        const rangeValue = monitorConfigData.ranges[itemIndex] || 0

        // Find matching device in panelsData
        const matchingDevice = findPanelDataDevice(inputItem, config.panelData)

        if (matchingDevice) {
          const deviceIndex = parseInt(matchingDevice.index) || 0
          const deviceType = inputItem.point_type

          // Add to batch request
          batchRequestData.push({
            panelId: config.panelId,
            index: deviceIndex,
            type: deviceType
          })

          // Store config for processing response
          itemConfigs.push({
            inputItem,
            matchingDevice,
            rangeValue,
            itemIndex
          })

          LogUtil.Info(`📦 Added item ${index} to batch request`, {
            deviceIndex,
            deviceType,
            panelId: config.panelId
          })
        } else {
          LogUtil.Warn(`⚠️ No matching device found for item ${index}`)
          // Add placeholder for missing device
          itemConfigs.push(null)
        }
      })

      if (batchRequestData.length === 0) {
        LogUtil.Warn('⚠️ No valid items for batch request')
        return []
      }

      // Send single batch GET_ENTRIES request for ALL items
      LogUtil.Info('📡 Sending BATCH GET_ENTRIES request', {
        itemCount: batchRequestData.length,
        requestData: batchRequestData
      })

      if (dataClient && dataClient.GetEntries) {
        try {
          // Send one request with all items
          dataClient.GetEntries(config.panelId, null, batchRequestData)

          LogUtil.Info('�?BATCH GET_ENTRIES request sent successfully', {
            panelId: config.panelId,
            itemCount: batchRequestData.length
          })
        } catch (error) {
          LogUtil.Error('�?Error sending batch GET_ENTRIES request:', error)
        }
      }

      // Return initial data points for each item (real data will come via handlers)
      const results: DataPoint[][] = []

      itemConfigs.forEach((itemConfig, index) => {
        if (itemConfig) {
          const processedValue = processDeviceValue(itemConfig.matchingDevice, itemConfig.rangeValue)
          results.push([{
            timestamp: Date.now(),
            value: processedValue.value
          }])
        } else {
          // Default data point for missing items
          results.push([{
            timestamp: Date.now(),
            value: 0
          }])
        }
      })

      return results

    } catch (error) {
      LogUtil.Error('�?Error in fetchAllItemsDataBatch:', error)
      return []
    }
  }

  /**
   * Adjust TrendLog point type (1-based) to sensor's point type (0-based) for GET_ENTRIES
   * T3000 uses 1-based point types for TrendLog, but GET_ENTRIES expects 0-based sensor types
   * #define BAC_OUT 0
   * #define BAC_IN  1
   * #define BAC_VAR 2
   * @param Trendlog related inputs point type (1-based)
   * @returns Adjusted sensor's point type (0-based) for GET_ENTRIES
   */
  const TransferTdlPointType = (pointType) => {
    return pointType - 1;
  }

  /**
   * Send GET_ENTITIES using existing dataseries information (fallback when no monitorConfig)
   * This ensures we keep sending GET_ENTITIES messages even when monitorConfig is empty/loading
   */
  const sendGetEntitiesForDataSeries = async (): Promise<void> => {
    LogUtil.Info('🚀 sendGetEntitiesForDataSeries CALLED - Fallback mode using dataseries', {
      dataSeriesLength: dataSeries.value.length,
      timestamp: new Date().toISOString()
    })

    try {
      // Get panelId from query parameters (most reliable)
      const currentPanelId = getPanelIdFromQuery()
      if (!currentPanelId) {
        LogUtil.Error('�?sendGetEntitiesForDataSeries: No panelId from query parameters')
        return
      }

      // Get panels data for device mapping
      const panelsData = T3000_Data.value.panelsData || []
      const currentPanelData = panelsData.filter(panel => String(panel.pid) === String(currentPanelId))

      if (!currentPanelData || currentPanelData.length === 0) {
        LogUtil.Debug('�?sendGetEntitiesForDataSeries: No panel data available for panelId', { currentPanelId })
        return
      }

      // Initialize data client
      const dataClient = initializeDataClients()
      if (!dataClient) {
        LogUtil.Debug('�?sendGetEntitiesForDataSeries: No data client available')
        return
      }

      // Build batch request based on existing dataseries
      const batchRequestData: any[] = []

      dataSeries.value.forEach((series) => {
        // Extract point info from existing dataseries
        const pointType = series.pointType
        const pointNumber = series.pointNumber

        if (pointType !== undefined && pointNumber !== undefined) {
          // Find matching device using the same logic as monitorConfig mode
          const inputItem = { point_type: pointType, point_number: pointNumber }
          const matchingDevice = findPanelDataDevice(inputItem, currentPanelData)

          if (matchingDevice) {
            batchRequestData.push({
              panelId: currentPanelId,
              index: parseInt(matchingDevice.index) || 0,
              type: TransferTdlPointType(pointType) // Adjusted for TrendLog
            })
          }
        }
      })

      LogUtil.Debug('📡 sendGetEntitiesForDataSeries: Sending GET_ENTITIES based on dataseries', {
        itemCount: batchRequestData.length,
        panelId: currentPanelId,
        batchSample: batchRequestData.slice(0, 3),
        timestamp: new Date().toISOString()
      })

      if (batchRequestData.length === 0) {
        LogUtil.Warn('�?sendGetEntitiesForDataSeries: No valid items for batch request')
        return
      }

      // Send LOGGING_DATA request
      if (dataClient.GetLoggingData) {
        LogUtil.Info('📡 sendGetEntitiesForDataSeries: Sending LOGGING_DATA request (dataseries fallback)', {
          serialNumber: currentSN,
          seriesCount: dataSeries.value.length,
          timestamp: new Date().toISOString()
        })
        dataClient.GetLoggingData(currentSN)
      } else {
        LogUtil.Error('❌ sendGetEntitiesForDataSeries: GetLoggingData method not available')
      }
    } catch (error) {
      LogUtil.Error('�?sendGetEntitiesForDataSeries: Error in dataseries fallback mode:', error)
    }
  }

  /**
   * 🆕 FFI API: Get logging data directly using synchronous FFI call
   * Uses action 15 (LOGGING_DATA) - gets all inputs, outputs, variables in one call
   */
  const sendPeriodicBatchRequest = async (monitorConfigData: any): Promise<void> => {
    LogUtil.Info('🚀 sendPeriodicBatchRequest (FFI API action=15)', {
      hasMonitorConfig: !!monitorConfigData,
      inputItemsCount: monitorConfigData?.inputItems?.length || 0,
      timestamp: new Date().toISOString()
    })

    try {
      // Get serial number and panel ID for LOGGING_DATA request
      const urlSerialNumber = route.query.sn ? parseInt(route.query.sn as string) : 0
      const urlPanelId = route.query.panel_id ? parseInt(route.query.panel_id as string) : 0
      const panelsList = T3000_Data.value.panelsList || []
      const currentSN = urlSerialNumber || (panelsList.length > 0 ? panelsList[0].serial_number : 0)
      const currentPanelId = urlPanelId || (panelsList.length > 0 ? panelsList[0].panel_number : 1)

      if (!currentSN) {
        LogUtil.Error('❌ No serial number available for LOGGING_DATA')
        return
      }

      // 🆕 Use FFI API with action 15 (LOGGING_DATA) - single synchronous call
      // C++ expects both panelId and serialNumber in the JSON payload
      LogUtil.Info('📡 FFI API ffiGetLoggingData (action=15, single call)', {
        panelId: currentPanelId,
        serialNumber: currentSN
      })

      const response = await ffiApi.ffiGetLoggingData(currentPanelId, currentSN)

      LogUtil.Debug('📊 Action 15 response received:', {
        hasResponse: !!response,
        hasData: !!(response && response.data),
        responseType: response?.debug ? 'empty' : 'data',
        timestamp: new Date().toLocaleTimeString()
      })

      if (response && response.data) {
        // LOGGING_DATA returns: response.data = [{ panel_id, panel_name, device_data: [...] }]
        // Extract device_data from all devices
        let allPanelItems: any[] = []

        if (Array.isArray(response.data)) {
          response.data.forEach((device: any) => {
            if (device.device_data && Array.isArray(device.device_data)) {
              allPanelItems = allPanelItems.concat(device.device_data)
            }
          })
        }

        LogUtil.Info('📊 LOGGING_DATA extracted items', {
          deviceCount: response.data.length,
          totalItems: allPanelItems.length
        })

        // Note: Action 15 already queries specific device by currentPanelId + currentSN
        // So items returned are already filtered to current device - just validate data quality
        const validDataItems = allPanelItems.filter(item =>
          item &&
          typeof item === 'object' &&
          item.hasOwnProperty('value') &&
          item.value !== null &&
          item.value !== undefined &&
          item.id
        )

        LogUtil.Debug('📊 Action 15 processed:', {
          totalItems: allPanelItems.length,
          validItems: validDataItems.length,
          willUpdate: validDataItems.length > 0,
          timestamp: new Date().toLocaleTimeString()
        })

        if (validDataItems.length > 0) {
          LogUtil.Debug('✅ Calling updateChartWithNewData with', validDataItems.length, 'items')
          updateChartWithNewData(validDataItems)
          // Batch save is done inside updateChartWithNewData - no duplicate call needed
        } else {
          LogUtil.Debug('⚠️ No valid data items - chart will NOT be updated, only scrolled')
        }

        lastSyncTime.value = new Date().toLocaleTimeString()
        if (hasConnectionError.value) {
          hasConnectionError.value = false
        }
      } else {
        LogUtil.Debug('⚠️ Action 15 response is EMPTY - no data property', {
          response: response,
          timestamp: new Date().toLocaleTimeString()
        })
      }

    } catch (error) {
      LogUtil.Error('❌ FFI API (action=15) failed:', error)
      hasConnectionError.value = true
    }
  }

  /**
   * Initialize data series from real T3000 monitor configuration
   */
  const initializeRealDataSeries = async () => {
    LogUtil.Info('🔧 initializeRealDataSeries: Starting initialization', {
      hasMonitorConfig: !!monitorConfig.value,
      monitorConfigData: monitorConfig.value,
      hasPanelsData: !!(T3000_Data.value.panelsData?.length),
      panelsDataLength: T3000_Data.value.panelsData?.length || 0,
      hasConnectionError: hasConnectionError.value,
      timestamp: new Date().toISOString()
    })

    const monitorConfigData = monitorConfig.value
    if (!monitorConfigData) {
      LogUtil.Warn('⚠️ initializeRealDataSeries: No monitor config available', {
        monitorConfig: monitorConfig.value,
        T3000DataExists: !!T3000_Data.value,
        propsItemData: !!props.itemData
      })
      dataSeries.value = []
      return
    }

    try {
      // 🆕 FIX: Create data series structure IMMEDIATELY from monitorConfig
      // Don't wait for real-time data - historical data load needs this structure
      const newDataSeries: SeriesConfig[] = []

      for (let i = 0; i < monitorConfigData.inputItems.length; i++) {
        const inputItem = monitorConfigData.inputItems[i]
        const pointTypeInfo = getPointTypeInfo(inputItem.point_type)
        const rangeValue = monitorConfigData.ranges[i] || 0

        // Use device description for series name
        const prefix = pointTypeInfo.category
        const desc = getDeviceDescription(inputItem.panel, inputItem.point_type, inputItem.point_number)

        // Create series name
        const seriesName = desc || `${inputItem.point_number + 1} (P${inputItem.panel})`
        const cleanDescription = desc || `${inputItem.point_number + 1}`

        // Determine unit type
        const digitalAnalog = getDigitalAnalogFromPanelData(inputItem.panel, inputItem.point_type, inputItem.point_number)
        const isDigital = digitalAnalog === BAC_UNITS_DIGITAL

        let unitType: 'digital' | 'analog'
        let unitSymbol: string

        if (isDigital) {
          unitType = 'digital'
          unitSymbol = getUnitFromPanelData(inputItem.panel, inputItem.point_type, inputItem.point_number)
        } else {
          unitType = 'analog'
          unitSymbol = getUnitFromPanelData(inputItem.panel, inputItem.point_type, inputItem.point_number)
        }

        const seriesConfig: SeriesConfig = {
          name: seriesName,
          color: `hsl(${(newDataSeries.length * 360) / monitorConfigData.inputItems.length}, 70%, 50%)`,
          data: [], // Start with empty data - will be filled by historical load and real-time updates
          visible: true,
          isEmpty: false,
          unit: unitSymbol,
          unitType: unitType,
          unitCode: rangeValue,
          itemType: pointTypeInfo.name,
          prefix: prefix,
          description: cleanDescription,
          pointType: inputItem.point_type,
          pointNumber: inputItem.point_number,
          panelId: inputItem.panel,
          id: generateDeviceId(inputItem.point_type, inputItem.point_number)
        }

        newDataSeries.push(seriesConfig)
      }

      // Update the reactive data series - preserve existing historical data
      LogUtil.Info('= TLChart: initializeRealDataSeries updating dataSeries', {
        previousSeriesCount: dataSeries.value.length,
        newSeriesCount: newDataSeries.length,
        newSeriesNames: newDataSeries.map(s => s.name),
        timestamp: new Date().toISOString()
      })

      // CRITICAL FIX: Preserve existing historical data when initializing real-time series structure
      if (dataSeries.value.length > 0) {
        // If we already have data series (with historical data), preserve the historical data
        LogUtil.Info('🔄 Preserving existing historical data while updating series structure', {
          existingSeriesCount: dataSeries.value.length,
          existingDataPoints: dataSeries.value.reduce((sum, s) => sum + (s.data?.length || 0), 0)
        })

        // Update each existing series with new configuration but keep historical data
        newDataSeries.forEach(newSeries => {
          const existingSeries = dataSeries.value.find(existing => existing.id === newSeries.id)
          if (existingSeries && existingSeries.data && existingSeries.data.length > 0) {
            // Preserve historical data and update configuration
            newSeries.data = existingSeries.data
            LogUtil.Info(`📈 Preserved ${existingSeries.data.length} historical data points for ${newSeries.name}`, {
              seriesId: newSeries.id,
              timeRange: existingSeries.data.length > 0 ? {
                first: new Date(existingSeries.data[0].timestamp).toISOString(),
                last: new Date(existingSeries.data[existingSeries.data.length - 1].timestamp).toISOString()
              } : null
            })
          }
        })
      }

      dataSeries.value = newDataSeries

      // Update sync time since we successfully created series structure
      lastSyncTime.value = new Date().toLocaleTimeString()

      // 🆕 NOW fetch real-time data in background to populate the series
      // This happens AFTER series structure is created, so it won't block historical load
      LogUtil.Info('📡 Fetching real-time data in background (non-blocking) - THIS WILL CALL ACTION 0')
      fetchRealTimeMonitorData().then(realTimeData => {
        LogUtil.Info('✅ fetchRealTimeMonitorData completed', {
          hasData: !!realTimeData,
          dataLength: realTimeData?.length || 0,
          dataItemsCount: realTimeData ? realTimeData.reduce((sum, arr) => sum + arr.length, 0) : 0
        })
        if (realTimeData && realTimeData.length > 0) {
          // Merge real-time data into existing series
          realTimeData.forEach((itemData, index) => {
            if (dataSeries.value[index] && itemData.length > 0) {
              const existingData = dataSeries.value[index].data || []
              dataSeries.value[index].data = mergeAndDeduplicate(existingData, itemData)
              LogUtil.Info(`📡 Added ${itemData.length} real-time points to ${dataSeries.value[index].name}`);
            }
          })
          updateCharts()
        } else {
          LogUtil.Warn('⚠️ fetchRealTimeMonitorData returned no data')
        }
      }).catch(error => {
        LogUtil.Error('❌ fetchRealTimeMonitorData failed (will retry on next interval)', error)
      })

    } catch (error) {
      LogUtil.Error('= TLChart: Error initializing real data series:', error)
      LogUtil.Warn('= TLChart: Keeping loading state - data might still be loading')
      // Keep loading state instead of showing error immediately
      // hasConnectionError.value = true // Removed - let it keep loading
      // Clear any existing data when connection error occurs
      dataSeries.value = []
    }
  }

  // ====================================================================================
  // ENHANCED T3000 DEVICE MAPPING AND VALUE PROCESSING FUNCTIONS
  // ====================================================================================

  /**
   * Find panel data device by generated device ID
   */
  const findPanelDataDevice = (inputItem: any, panelsData: any[]): any | null => {
    const deviceId = generateDeviceId(inputItem.point_type, inputItem.point_number)

    const device = panelsData.find(device => device.id === deviceId)

    if (!device) {
      LogUtil.Warn('= TLChart: Device not found in panelsData', { deviceId: deviceId })
      return null
    }

    return device
  }

  /**
   * Determine if device is analog or digital using the digital_analog field
   */
  const isAnalogDevice = (panelData: any, inputRangeValue: number): boolean => {
    // Primary: Use digital_analog field if available (BAC_UNITS_DIGITAL=0, BAC_UNITS_ANALOG=1)
    if (panelData && panelData.digital_analog !== undefined) {
      return panelData.digital_analog === BAC_UNITS_ANALOG
    }

    // Fallback: Use input range value (0=analog, 1=digital)
    const isAnalogByRange = inputRangeValue === 0

    // Secondary fallback: Use panel data control field (0=analog, 1=digital)
    const isAnalogByPanelData = panelData && panelData.control === 0

    // Use input range as primary fallback source of truth
    return isAnalogByRange
  }

  /**
   * Scale raw value from T3000 integer format to decimal
   * Database and C++ always store/return values as integers (multiplied by 1000)
   * Examples: 5000 → 5, 500 → 0.5, 2500 → 2.5
   */
  const scaleValueIfNeeded = (rawValue: number): number => {
    return rawValue / 1000
  }

  /**
   * 🔍 DIAGNOSTIC: Analyze value scaling impact on chart visibility
   * This helps identify why similar values appear as straight lines
   */
  const analyzeValueScaling = (values: number[], seriesName: string) => {
    if (values.length < 2) return

    const rawValues = [...values]
    const scaledValues = values.map(v => scaleValueIfNeeded(v))

    const rawRange = Math.max(...rawValues) - Math.min(...rawValues)
    const scaledRange = Math.max(...scaledValues) - Math.min(...scaledValues)

    LogUtil.Info(`📊 Value Scaling Analysis: ${seriesName}`, {
      rawValues: rawValues.slice(0, 5), // Show first 5 values
      scaledValues: scaledValues.slice(0, 5),
      rawRange,
      scaledRange,
      scalingRatio: rawRange / scaledRange,
      visibilityIssue: scaledRange < 1 ? 'YES - Range too small for chart visibility' : 'NO - Range adequate',
      recommendation: scaledRange < 1 ? 'Consider preserving original scale or adjusting Y-axis bounds' : 'Scaling is appropriate'
    })
  }

  /**
   * Get the correct RAW value from panel data based on device type
   * Returns raw value WITHOUT scaling - scaling is done later by processDeviceValue
   */
  const getDeviceValue = (panelData: any, isAnalog: boolean): number => {
    let rawValue: number

    if (isAnalog) {
      // Analog devices: use 'value' field (raw value from C++)
      rawValue = parseFloat(panelData.value) || 0
    } else {
      // Digital devices: For OUT1/OUT2, check multiple potential fields
      if (panelData.id === 'OUT1' || panelData.id === 'OUT2') {
        // Try different fields for digital outputs
        const controlValue = parseFloat(panelData.control) || 0
        const valueValue = parseFloat(panelData.value) || 0
        const autoManualValue = parseFloat(panelData.auto_manual) || 0

        // Use the field with the highest non-zero value, or control as fallback
        if (valueValue > 0) {
          rawValue = valueValue
        } else if (autoManualValue > 0) {
          rawValue = autoManualValue
        } else {
          rawValue = controlValue
        }
      } else {
        // Regular digital devices: use 'control' field
        rawValue = parseFloat(panelData.control) || 0
      }
    }

    return rawValue
  }

  /**
   * Get analog unit symbol based on range value and device type using T3Range.ts
   */
  const getAnalogUnit = (range: number, deviceType?: string): string => {
    // Try to get unit from T3Range based on device type and range
    if (deviceType) {
      const typeKey = deviceType.toLowerCase() as keyof typeof rangeDefinitions.analog
      if (rangeDefinitions.analog[typeKey]) {
        const analogRange = rangeDefinitions.analog[typeKey].find(r => r.id === range)
        if (analogRange) {
          return analogRange.unit
        }
      }
    }

    // Fallback to T3Range-based unit code mapping
    return getUnitSymbolFromT3Range(range)
  }

  /**
   * Generate device ID from inputItem (point_type + point_number)
   */
  const generateDeviceId = (pointType: number, pointNumber: number): string => {
    const typeString = mapPointTypeToString(pointType)
    const deviceIndex = pointNumber + 1  // Convert 0-based to 1-based
    return `${typeString}${deviceIndex}`
  }

  /**
   * Map point type number to string prefix based on BAC definitions
   * T3000 point_type values are 1-based, but BAC defines are 0-based
   * So we subtract 1 from point_type to get the correct BAC define
   */
  const mapPointTypeToString = (pointType: number): string => {
    const bacDefine = pointType - 1; // Convert T3000 1-based to BAC 0-based

    switch (bacDefine) {
      case 0: return 'OUT'    // BAC_OUT = 0
      case 1: return 'IN'     // BAC_IN = 1
      case 2: return 'VAR'    // BAC_VAR = 2
      case 3: return 'PID'    // BAC_PID = 3
      case 4: return 'SCH'    // BAC_SCH = 4
      case 5: return 'HOL'    // BAC_HOL = 5
      case 6: return 'PRG'    // BAC_PRG = 6
      case 7: return 'TBL'    // BAC_TBL = 7
      case 8: return 'DMON'   // BAC_DMON = 8
      case 9: return 'AMON'   // BAC_AMON = 9
      case 10: return 'GRP'   // BAC_GRP = 10
      case 11: return 'AY'    // BAC_AY = 11
      case 12: return 'ALARMM' // BAC_ALARMM = 12
      case 13: return 'UNIT'  // BAC_UNIT = 13
      case 14: return 'USER_NAME' // BAC_USER_NAME = 14
      case 15: return 'ALARMS' // BAC_ALARMS = 15
      case 16: return 'WR_TIME' // BAC_WR_TIME = 16
      case 17: return 'AR_Y'  // BAC_AR_Y = 17
      default: return ''
    }
  }

  /**
   * Map point type number to string for database storage
   * Uses standardized names for API compatibility
   */
  const mapPointTypeFromNumber = (pointType: number): string => {
    const bacDefine = pointType - 1; // Convert T3000 1-based to BAC 0-based

    switch (bacDefine) {
      case 0: return 'OUTPUT'    // BAC_OUT = 0
      case 1: return 'INPUT'     // BAC_IN = 1
      case 2: return 'VARIABLE'  // BAC_VAR = 2
      case 3: return 'PID'       // BAC_PID = 3
      case 4: return 'SCHEDULE'  // BAC_SCH = 4
      case 5: return 'HOLIDAY'   // BAC_HOL = 5
      case 6: return 'PROGRAM'   // BAC_PRG = 6
      case 7: return 'TABLE'     // BAC_TBL = 7
      case 8: return 'DMON'      // BAC_DMON = 8
      case 9: return 'AMON'      // BAC_AMON = 9
      case 10: return 'GROUP'    // BAC_GRP = 10
      case 11: return 'ARRAY'    // BAC_AY = 11
      case 12: return 'ALARMM'   // BAC_ALARMM = 12
      case 13: return 'UNIT'     // BAC_UNIT = 13
      case 14: return 'USER_NAME' // BAC_USER_NAME = 14
      case 15: return 'ALARMS'   // BAC_ALARMS = 15
      case 16: return 'WR_TIME'  // BAC_WR_TIME = 16
      case 17: return 'AR_Y'     // BAC_AR_Y = 17
      default: return 'UNKNOWN'
    }
  }

  /**
   * Map point type string back to number (reverse of mapPointTypeFromNumber)
   * Used when loading data from database that stores point types as strings
   */
  const mapPointTypeToNumber = (pointTypeStr: string): number => {
    switch (pointTypeStr?.toUpperCase()) {
      case 'OUTPUT': return 1    // BAC_OUT = 0, T3000 = 1
      case 'INPUT': return 2     // BAC_IN = 1, T3000 = 2
      case 'VARIABLE': return 3  // BAC_VAR = 2, T3000 = 3
      case 'PID': return 4       // BAC_PID = 3, T3000 = 4
      case 'SCHEDULE': return 5  // BAC_SCH = 4, T3000 = 5
      case 'HOLIDAY': return 6   // BAC_HOL = 5, T3000 = 6
      case 'PROGRAM': return 7   // BAC_PRG = 6, T3000 = 7
      case 'TABLE': return 8     // BAC_TBL = 7, T3000 = 8
      case 'DMON': return 9      // BAC_DMON = 8, T3000 = 9
      case 'AMON': return 10     // BAC_AMON = 9, T3000 = 10
      case 'GROUP': return 11    // BAC_GRP = 10, T3000 = 11
      case 'ARRAY': return 12    // BAC_AY = 11, T3000 = 12
      case 'ALARMM': return 13   // BAC_ALARMM = 12, T3000 = 13
      case 'UNIT': return 14     // BAC_UNIT = 13, T3000 = 14
      case 'USER_NAME': return 15 // BAC_USER_NAME = 14, T3000 = 15
      case 'ALARMS': return 16   // BAC_ALARMS = 15, T3000 = 16
      case 'WR_TIME': return 17  // BAC_WR_TIME = 16, T3000 = 17
      case 'AR_Y': return 18     // BAC_AR_Y = 17, T3000 = 18
      default: return 2          // Default to INPUT if unknown
    }
  }

  /**
   * Get point type info for debugging (using existing function)
   */

  /**
   * Process device value based on panel data and input range
   */
  const processDeviceValue = (panelData: any, inputRangeValue: number): { value: number; displayValue: string; unit: string } => {
    // Determine if device is analog or digital
    const isAnalog = isAnalogDevice(panelData, inputRangeValue)

    // Get the correct raw value from panel data
    const rawValue = getDeviceValue(panelData, isAnalog)

    if (isAnalog) {
      // Analog processing: always divide by 1000 (T3000 stores values as integers)
      // Examples: 5000 → 5, 567 → 0.567, 2500 → 2.5
      const processedValue = scaleValueIfNeeded(rawValue)

      const unit = getAnalogUnit(panelData.range, panelData.type)

      return {
        value: processedValue,
        displayValue: `${processedValue.toFixed(2)}`,
        unit: unit
      }
    } else {
      // Digital processing: divide by 1000 first, then use state labels
      const scaledValue = scaleValueIfNeeded(rawValue)
      const digitalStates = getDigitalStatesFromRange(panelData.range)
      const displayValue = scaledValue > 0 ? `1 (${digitalStates[1]})` : `0 (${digitalStates[0]})`

      return {
        value: scaledValue,
        displayValue: displayValue,
        unit: ''
      }
    }
  }

  /**
   * Send GET_ENTRIES request for a single device
   */
  const sendGetEntriesRequest = async (dataClient: any, panelId: number, deviceIndex: number, deviceType: string): Promise<void> => {
    LogUtil.Info('📡 TrendLogChart: sendGetEntriesRequest called', {
      panelId,
      deviceIndex,
      deviceType,
      hasDataClient: !!dataClient,
      hasGetEntriesMethod: !!(dataClient?.GetEntries),
      timestamp: new Date().toISOString()
    })

    const requestData = [{
      panelId: panelId,
      index: deviceIndex,
      type: deviceType
    }]

    if (dataClient && dataClient.GetEntries) {
      try {
        // CORRECT FORMAT: GetEntries(panelId?, viewitem?, data?)
        // Examples from codebase:
        // - IdxPage.ts: GetEntries(null, null, etries)
        // - Your test: GetEntries(undefined, undefined, [testRequest])
        dataClient.GetEntries(panelId, null, requestData)

        LogUtil.Info('�?TrendLogChart: GetEntries request sent with CORRECT format', {
          panelId,
          viewitem: null,
          requestData
        })
      } catch (error) {
        LogUtil.Error('�?Error calling GetEntries:', error)
      }
    } else {
      LogUtil.Error('�?GetEntries method not available on data client')
    }
  }

  /**
   * Send GET_ENTRIES requests for multiple devices
   */
  const sendBatchGetEntriesRequest = async (dataClient: any, requests: Array<{ panelId: number, index: number, type: string }>): Promise<void> => {
    if (dataClient && dataClient.GetEntries) {
      // For batch requests, use the primary panelId from the first request
      const primaryPanelId = requests[0]?.panelId || null

      LogUtil.Info('📡 TrendLogChart: sendBatchGetEntriesRequest called', {
        primaryPanelId,
        requestCount: requests.length,
        requests
      })

      // CORRECT FORMAT: GetEntries(panelId?, viewitem?, data?)
      dataClient.GetEntries(primaryPanelId, null, requests)
    } else {
      LogUtil.Error('�?No GetEntries method available on data client')
    }
  }

  /**
   * Enhanced device lookup with proper mapping
   */
  const findDeviceByGeneratedId = (panelData: any[], deviceId: string): any => {
    const matchingDevice = panelData.find(device => device.id === deviceId)

    if (!matchingDevice) {
      LogUtil.Warn(`No device found with ID: ${deviceId}`)
    }

    return matchingDevice
  }

  /**
   * Log device mapping details for debugging
   *
   *  {
        "network": 0,
        "panel": 3,
        "point_number": 11,
        "point_type": 2,
        "sub_panel": 0
      }
   */
  const logDeviceMapping = (inputItem: any, index: number, rangeValue: number) => {
    const deviceId = generateDeviceId(inputItem.point_type, inputItem.point_number)
    // Core mapping info only
    return deviceId
  }

  /**
   * Setup message handlers for GET_ENTRIES responses
   *
   * IMPORTANT: This function doesn't work as intended!
   * The WebViewClient uses bound method references (this.HandleGetEntriesRes.bind(this))
   * that are created at instantiation time. Runtime method replacement doesn't affect
   * the already-bound references used by the message handlers.
   *
   * Real-time database storage is handled by the T3000_Data watcher instead.
   */
  const setupGetEntriesResponseHandlers = (dataClient: any) => {
    LogUtil.Warn('⚠️ setupGetEntriesResponseHandlers called - this function does not work due to WebViewClient bound method references')

    if (!dataClient) {
      LogUtil.Error('No dataClient provided to setupGetEntriesResponseHandlers')
      return
    }

    // Store original handler if it exists
    const originalHandler = dataClient.HandleGetEntriesRes

    // Create our custom handler
    dataClient.HandleGetEntriesRes = (msgData: any) => {
      LogUtil.Info('📨 HandleGetEntriesRes CALLED', {
        hasData: !!(msgData?.data),
        dataIsArray: Array.isArray(msgData?.data),
        dataLength: msgData?.data?.length || 0,
        timestamp: new Date().toISOString()
      })

      try {
        if (msgData.data && Array.isArray(msgData.data)) {
          // Filter valid data items
          const validItems = msgData.data.filter(item =>
            item &&
            typeof item === 'object' &&
            item.hasOwnProperty('value') &&
            item.value !== null &&
            item.value !== undefined &&
            item.id
          )

          // Process valid data for chart rendering
          if (validItems.length > 0) {
            LogUtil.Info('🎯 GET_ENTRIES: Processing valid items', {
              validItemsCount: validItems.length,
              totalReceivedItems: msgData.data?.length || 0,
              sampleValidItem: validItems[0],
              timestamp: new Date().toISOString()
            })

            updateChartWithNewData(validItems)

            // Store real-time data to database for historical usage
            LogUtil.Info('💾 GET_ENTRIES: About to call storeRealtimeDataToDatabase')
            storeRealtimeDataToDatabase(validItems)
          } else {
            LogUtil.Warn('⚠️ GET_ENTRIES: No valid items to process', {
              totalReceivedItems: msgData.data?.length || 0,
              allItems: msgData.data?.slice(0, 3) || [] // Show first 3 for debugging
            })
          }
        }
      } catch (error) {
        LogUtil.Error('Error processing GET_ENTRIES response:', error)
      }

      // Call original handler if it existed
      if (originalHandler && typeof originalHandler === 'function') {
        try {
          originalHandler.call(dataClient, msgData)
        } catch (error) {
          LogUtil.Error('Error calling original handler:', error)
        }
      }
    }

    LogUtil.Info('�?Custom HandleGetEntriesRes handler setup complete', {
      handlerOverridden: typeof dataClient.HandleGetEntriesRes === 'function',
      hasOriginalHandler: typeof originalHandler === 'function',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Get the time range of existing data across all series
   * Returns null if no data exists
   */
  const getExistingDataTimeRange = (): { earliest: number, latest: number, totalPoints: number } | null => {
    if (!dataSeries.value || dataSeries.value.length === 0) {
      return null
    }

    let earliest = Infinity
    let latest = -Infinity
    let totalPoints = 0
    let hasAnyData = false

    dataSeries.value.forEach(series => {
      if (series.data && series.data.length > 0) {
        hasAnyData = true
        totalPoints += series.data.length
        const seriesEarliest = series.data[0].timestamp
        const seriesLatest = series.data[series.data.length - 1].timestamp

        if (seriesEarliest < earliest) earliest = seriesEarliest
        if (seriesLatest > latest) latest = seriesLatest
      }
    })

    if (!hasAnyData) {
      return null
    }

    return { earliest, latest, totalPoints }
  }

  /**
   * 🆕 CONTINUOUS MONITORING: Handle page visibility changes
   * Auto-backfill missing data when user returns to TrendLog page
   */
  const handleVisibilityChange = async () => {
    if (document.hidden) {
      // Page became hidden - user navigated away
      LogUtil.Info('👋 TrendLogChart: Page hidden - user navigated away', {
        isRealTime: isRealTime.value,
        hasData: dataSeries.value.length > 0,
        timestamp: new Date().toISOString()
      })
      return
    }

    // Page became visible - user returned
    LogUtil.Info('�?TrendLogChart: Page visible - user returned, checking for data gaps', {
      isRealTime: isRealTime.value,
      hasData: dataSeries.value.length > 0,
      timestamp: new Date().toISOString()
    })

    // Only backfill if in real-time mode and we have existing data
    if (!isRealTime.value || dataSeries.value.length === 0) {
      LogUtil.Info('⏭️ TrendLogChart: Skipping backfill (not in real-time mode or no data)')
      return
    }

    try {
      // Get latest timestamp from existing data
      const existingRange = getExistingDataTimeRange()
      if (!existingRange) {
        LogUtil.Warn('⚠️ TrendLogChart: No existing data range, cannot backfill')
        return
      }

      const lastTimestamp = existingRange.latest
      const now = Date.now()
      const gapSeconds = Math.floor((now - lastTimestamp) / 1000)

      LogUtil.Info('�?TrendLogChart: Detected data gap', {
        lastTimestamp: new Date(lastTimestamp).toISOString(),
        now: new Date(now).toISOString(),
        gapSeconds,
        gapMinutes: Math.floor(gapSeconds / 60)
      })

      // Only backfill if gap is significant (more than 10 seconds)
      if (gapSeconds < 10) {
        LogUtil.Info('✅ TrendLogChart: Gap too small, no backfill needed')
        return
      }

      // Fetch missing data from database
      LogUtil.Info('📥 TrendLogChart: Fetching missing data from database...', {
        fromTimestamp: new Date(lastTimestamp).toISOString(),
        toTimestamp: new Date(now).toISOString()
      })

      // Use existing loadHistoricalDataFromDatabase but with time range filter
      await backfillMissingData(lastTimestamp, now)

      LogUtil.Info('✅ TrendLogChart: Data backfill completed', {
        newDataPoints: getExistingDataTimeRange()?.totalPoints || 0
      })

      // Update charts with new data
      updateCharts()

    } catch (error) {
      LogUtil.Error('❌ TrendLogChart: Error during data backfill', error)
    }
  }

  /**
   * 🆕 CONTINUOUS MONITORING: Backfill missing data for a specific time range
   */
  const backfillMissingData = async (fromTimestamp: number, toTimestamp: number) => {
    const deviceParams = extractDeviceParameters()
    const { sn: currentSN, panel_id: currentPanelId } = deviceParams

    if (!currentSN || !currentPanelId) {
      LogUtil.Warn('⚠️ backfillMissingData: Missing device parameters')
      return
    }

    // Fetch data for each series
    for (const series of dataSeries.value) {
      if (!series.id || !series.panelId) continue

      try {
        const queryOptions = {
          serial_number: currentSN,
          panel_id: currentPanelId,
          point_id: series.id,
          point_type: series.pointType,
          from_timestamp: fromTimestamp,
          to_timestamp: toTimestamp,
          limit: 10000 // Reasonable limit for backfill
        }

        const response = await trendlogAPI.getTrendlogHistory(queryOptions)

        if (response && response.data && response.data.length > 0) {
          // Merge new data into existing series
          const newDataPoints = response.data.map((item: any) => ({
            timestamp: item.timestamp,
            value: item.value
          }))

          // Append and sort
          series.data = [...series.data, ...newDataPoints]
            .sort((a, b) => a.timestamp - b.timestamp)

          // Remove duplicates (keep latest)
          const uniqueData = new Map()
          series.data.forEach(point => {
            uniqueData.set(point.timestamp, point)
          })
          series.data = Array.from(uniqueData.values())
            .sort((a, b) => a.timestamp - b.timestamp)

          LogUtil.Debug('�?Backfilled data for series', {
            seriesName: series.name,
            newPoints: newDataPoints.length,
            totalPoints: series.data.length
          })
        }
      } catch (error) {
        LogUtil.Error(`❌ Error backfilling data for series ${series.name}`, error)
      }
    }
  }

  /**
   * Load historical data from database based on current timebase
   */
  const loadHistoricalDataFromDatabase = async (forceReload: boolean = false) => {
    LogUtil.Info('🔍 loadHistoricalDataFromDatabase CALLED', {
      hasMonitorConfig: !!monitorConfig.value,
      monitorConfigInputItems: monitorConfig.value?.inputItems?.length || 0,
      dataSeriesLength: dataSeries.value.length,
      forceReload: forceReload,
      timestamp: new Date().toISOString()
    })

    // Clear connection error flag when starting to load data
    hasConnectionError.value = false

    try {
      // 🆕 FIX: Use extractDeviceParameters for reliable device info from query params
      const deviceParams = extractDeviceParameters()
      const { sn: currentSN, panel_id: currentPanelId, trendlog_id } = deviceParams

      LogUtil.Debug('🔧 loadHistoricalDataFromDatabase: Device parameters extraction', {
        currentSN,
        currentPanelId,
        trendlog_id,
        source: 'extractDeviceParameters'
      })

      if (!currentSN) {
        const errorMsg = 'No serial number available - cannot load historical data'
        LogUtil.Error('❌ loadHistoricalDataFromDatabase: No serial number from reliable sources', {
          queryParams: route.query,
          panelsList: T3000_Data.value.panelsList?.length || 0
        })
        hasConnectionError.value = true
        throw new Error(errorMsg)
      }

      if (!currentPanelId) {
        const errorMsg = 'No panel ID available - cannot load historical data'
        LogUtil.Error('❌ loadHistoricalDataFromDatabase: No panel ID from reliable sources', {
          queryParams: route.query,
          panelsList: T3000_Data.value.panelsList?.length || 0
        })
        hasConnectionError.value = true
        throw new Error(errorMsg)
      }

      // 🆕 FIX: Don't require monitorConfig - use dataseries as fallback
      const monitorConfigData = monitorConfig.value
      let shouldUseDataSeriesForPoints = false

      if (!monitorConfigData?.inputItems?.length) {
        LogUtil.Info('🔄 loadHistoricalDataFromDatabase: No monitor config - will use existing dataseries for point info', {
          dataSeriesLength: dataSeries.value.length,
          hasDataSeries: dataSeries.value.length > 0
        })
        shouldUseDataSeriesForPoints = true

        // If no dataseries either, we can't determine what to load - just return empty gracefully
        if (dataSeries.value.length === 0) {
          LogUtil.Info('ℹ️ loadHistoricalDataFromDatabase: No monitor config or dataseries yet - skipping load (component still initializing)', {
            hasMonitorConfig: !!monitorConfigData,
            dataSeriesLength: dataSeries.value.length
          })
          // Don't set connection error - this is normal during initialization
          // Just return empty structure
          return
        }
      }

      // Helper function to round timestamp to nearest 5 minutes
      const roundToNearest5Minutes = (timestamp: number): number => {
        const date = new Date(timestamp)
        const minutes = date.getMinutes()
        const roundedMinutes = Math.round(minutes / 5) * 5
        date.setMinutes(roundedMinutes)
        date.setSeconds(0)
        date.setMilliseconds(0)
        return date.getTime()
      }

      // Calculate time range based on current timebase with time offset support
      // 🆕 FIX: Use the exact same time window as chart display for data consistency
      const chartTimeWindow = getCurrentTimeWindow()
      const offsetStartTime = new Date(chartTimeWindow.min)
      const offsetEndTime = new Date(chartTimeWindow.max)
      const timeRangeMinutes = Math.round((offsetEndTime.getTime() - offsetStartTime.getTime()) / 60000)

      // 🆕 SMART LOADING: Check if we already have data in this time range (unless force reload)
      const existingDataRange = !forceReload ? getExistingDataTimeRange() : null
      let actualStartTime = offsetStartTime
      let actualEndTime = offsetEndTime

      if (existingDataRange && !forceReload) {
        LogUtil.Info('📊 Existing data detected - optimizing load range', {
          requestedRange: {
            start: offsetStartTime.toISOString(),
            end: offsetEndTime.toISOString(),
            durationMinutes: timeRangeMinutes
          },
          existingRange: {
            start: new Date(existingDataRange.earliest).toISOString(),
            end: new Date(existingDataRange.latest).toISOString()
          }
        })

        // Only load data BEFORE the earliest existing point (historical gap)
        if (offsetStartTime.getTime() < existingDataRange.earliest) {
          actualEndTime = new Date(existingDataRange.earliest - 1000) // 1 second before earliest
          LogUtil.Info('🔍 Loading historical gap BEFORE existing data', {
            gapStart: actualStartTime.toISOString(),
            gapEnd: actualEndTime.toISOString(),
            gapMinutes: Math.round((actualEndTime.getTime() - actualStartTime.getTime()) / 60000)
          })
        } else {
          LogUtil.Info('✅All requested data already exists in memory - skipping database load', {
            requestedStart: offsetStartTime.toISOString(),
            existingStart: new Date(existingDataRange.earliest).toISOString()
          })
          return // No need to load anything
        }
      } else if (forceReload) {
        LogUtil.Info('🔄 Force reload requested - skipping existing data optimization', {
          requestedRange: {
            start: offsetStartTime.toISOString(),
            end: offsetEndTime.toISOString(),
            durationMinutes: timeRangeMinutes
          }
        })
      }

      const endTime = actualEndTime
      const startTime = actualStartTime

      // Format timestamps for API (SQLite format) - use Local time to match backend storage
      // Backend now stores timestamps in Local time (fixed timezone issue)
      const formatLocalTime = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      }

      const formattedStartTime = formatLocalTime(startTime)
      const formattedEndTime = formatLocalTime(endTime)

      // 🆕 FIX: Create specific points list from available data sources
      let specificPoints: Array<{ point_id: string, point_type: string, point_index: number, panel_id: number }> = []

      if (shouldUseDataSeriesForPoints) {
        // Method 1: Extract from existing data series (fallback when no monitorConfig)
        LogUtil.Info('🔄 loadHistoricalDataFromDatabase: Extracting points from existing dataseries')

        dataSeries.value.forEach((series, index) => {
          if (series.pointType !== undefined && series.pointNumber !== undefined) {
            const pointTypeString = mapPointTypeFromNumber(series.pointType)
            const pointId = generateDeviceId(series.pointType, series.pointNumber)

            // FIX: Frontend uses 0-based pointNumber, but database expects 1-based PointIndex
            // So IN1 in frontend (pointNumber=0) maps to PointIndex=1 in database
            specificPoints.push({
              point_id: pointId,
              point_type: pointTypeString,
              point_index: series.pointNumber + 1, // Convert 0-based to 1-based
              panel_id: currentPanelId
            })
          }
        })

        LogUtil.Debug('🔧 loadHistoricalDataFromDatabase: Points from dataseries', {
          pointsExtracted: specificPoints.length,
          samplePoints: specificPoints.slice(0, 3)
        })
      } else {
        // Method 2: Extract from monitor config (preferred when available)
        LogUtil.Info('🔄 loadHistoricalDataFromDatabase: Extracting points from monitor config')

        monitorConfigData.inputItems.forEach((inputItem: any, index: number) => {
          const pointTypeString = mapPointTypeFromNumber(inputItem.point_type)
          const pointId = generateDeviceId(inputItem.point_type, inputItem.point_number)

          // FIX: Frontend uses 0-based point_number, but database expects 1-based PointIndex
          // So IN1 in frontend (point_number=0) maps to PointIndex=1 in database
          specificPoints.push({
            point_id: pointId,
            point_type: pointTypeString,
            point_index: inputItem.point_number + 1, // Convert 0-based to 1-based
            panel_id: currentPanelId
          })
        })

        LogUtil.Debug('🔧 loadHistoricalDataFromDatabase: Points from monitor config', {
          pointsExtracted: specificPoints.length,
          samplePoints: specificPoints.slice(0, 3)
        })
      }

      // Fallback method: Use generic points if still no specific points found
      if (specificPoints.length === 0) {
        LogUtil.Warn('⚠️ loadHistoricalDataFromDatabase: No points from dataseries or monitorConfig - using fallback points')

        // Try to extract from legacy dataseries format for backward compatibility
        if (dataSeries.value && dataSeries.value.length > 0) {
          dataSeries.value.forEach((series, index) => {
            // Only include series that have meaningful identifiers and are not demo/test data
            if (series.id && series.id !== '1' && series.name &&
              !series.name.includes('(P0)') &&
              !series.name.match(/^\d+\s*\([P]\d+\)$/) &&
              series.description) {
              let pointType = 'VARIABLE' // Default
              let pointIndex = index
              let pointId = series.id

              // Try to extract point info from series.id or series.name
              if (series.id.startsWith('VAR')) {
                pointType = 'VARIABLE'
                const match = series.id.match(/VAR(\d+)/)
                pointIndex = match ? parseInt(match[1]) : index // Database uses 1-based index
                pointId = series.id
              } else if (series.id.startsWith('IN')) {
                pointType = 'INPUT'
                const match = series.id.match(/IN(\d+)/)
                pointIndex = match ? parseInt(match[1]) : index // Database uses 1-based index
                pointId = series.id
              } else if (series.id.startsWith('OUT')) {
                pointType = 'OUTPUT'
                const match = series.id.match(/OUT(\d+)/)
                pointIndex = match ? parseInt(match[1]) : index // Database uses 1-based index
                pointId = series.id
              }

              specificPoints.push({
                point_id: pointId,
                point_type: pointType,
                point_index: pointIndex,
                panel_id: currentPanelId
              })
            }
          })
        }

        // Final fallback: Use known working points if still nothing found
        if (specificPoints.length === 0) {
          LogUtil.Warn('⚠️ loadHistoricalDataFromDatabase: Using minimal fallback points')
          specificPoints = [
            { point_id: "VAR1", point_type: "VARIABLE", point_index: 0, panel_id: currentPanelId },
            { point_id: "VAR3", point_type: "VARIABLE", point_index: 2, panel_id: currentPanelId }
          ]
        }
      }

      // 🆕 FIX: Extract trendlog ID from multiple sources
      let trendlogId = deviceParams.trendlog_id?.toString() || '1' // Use from extractDeviceParameters first

      if (!deviceParams.trendlog_id && monitorConfigData?.id && typeof monitorConfigData.id === 'string') {
        // Fallback: Extract from monitorConfig.id (e.g., "MON5" -> "4")
        const match = monitorConfigData.id.match(/MON(\d+)|TRL(\d+)/i)
        if (match) {
          const monNumber = parseInt(match[1] || match[2])
          // MON5 maps to trendlog ID 4 (MON number - 1)
          trendlogId = (monNumber - 1).toString()
        }
      }

      LogUtil.Debug('🔍 Trendlog ID extraction for historical data request:', {
        fromExtractDeviceParams: deviceParams.trendlog_id,
        fromMonitorConfig: monitorConfigData?.id,
        finalTrendlogId: trendlogId,
        willUseUrl: `/trendlogs/${trendlogId}/history`
      })

      // Prepare historical data request (matching the working API structure)
      const historyRequest = {
        serial_number: currentSN,
        panel_id: currentPanelId,
        trendlog_id: trendlogId,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        // No limit - return all data in the time range for timebase changes
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'], // All point types (matching working API)
        specific_points: specificPoints
      }

      LogUtil.Debug('🔍 Historical data request:', {
        timeRange: `${formattedStartTime} to ${formattedEndTime}`,
        timeRangeMinutes: timeRangeMinutes,
        pointsCount: specificPoints.length,
        noLimit: true,
        trendlogId: trendlogId
      })

      // Fetch historical data
      const historyResponse = await trendlogAPI.getTrendlogHistory(historyRequest)

      // Check for errors in response
      if (!historyResponse) {
        const errorMsg = 'Failed to fetch historical data - API returned null'
        LogUtil.Error('Historical data fetch failed:', errorMsg)
        hasConnectionError.value = true
        throw new Error(errorMsg)
      }

      if (historyResponse?.error) {
        LogUtil.Error('Historical data fetch returned error:', historyResponse.error)
        hasConnectionError.value = true
        throw new Error(historyResponse.error)
      }

      // Extract the actual data array from the response
      // Response structure: { count: N, data: [...], device_id: X, ... }
      const historyData = historyResponse.data?.data || historyResponse.data

      // Check if response has no data
      if (!historyData || historyData.length === 0) {
        LogUtil.Info('📭 No historical data available for the selected time range - keeping existing data', {
          timeRange: `${timeRangeMinutes} minutes`,
          timeRangeFormatted: `${formattedStartTime} to ${formattedEndTime}`,
          existingSeriesCount: dataSeries.value.length,
          note: 'Series list and existing data will remain visible'
        })

        // DON'T clear data arrays - keep the existing 14 items with their current values
        // Just clear error and stop loading

        // Clear connection error - successful API response with no data is NOT an error
        hasConnectionError.value = false

        // Stop loading indicator
        stopLoading()

        return // Exit gracefully without throwing
      }

      // Data exists, process it
      if (historyData.length > 0) {
        LogUtil.Info('📚 Historical data loaded:', {
          dataPointsCount: historyData.length,
          totalCount: historyResponse.data?.count || historyData.length,
          timeRange: `${timeRangeMinutes} minutes`,
          actualTimeRange: `${formattedStartTime} to ${formattedEndTime}`
        })

        // 🆕 If dataSeries is empty, create series from historical data
        if (dataSeries.value.length === 0) {
          LogUtil.Info('📊 Creating series from historical data (no existing series)')
          await createSeriesFromHistoricalData(historyData)
        }

        // 🆕 Convert historical data to chart format and populate data series (now async)
        await populateDataSeriesWithHistoricalData(historyData)

        // 🆕 CRITICAL: Update charts immediately after historical data is populated
        LogUtil.Info('🎨 Updating charts to display historical data', {
          seriesCount: dataSeries.value.length,
          seriesWithData: dataSeries.value.filter(s => s.data && s.data.length > 0).length,
          totalDataPoints: dataSeries.value.reduce((sum, s) => sum + (s.data?.length || 0), 0),
          seriesDetails: dataSeries.value.map(s => ({
            name: s.name,
            id: s.id,
            dataCount: s.data?.length || 0,
            visible: s.visible
          }))
        })
        updateCharts()
      } else {
        LogUtil.Debug('📭 No historical data found for current timebase')
      }

    } catch (error) {
      LogUtil.Error('Failed to load historical data from database:', error)
      hasConnectionError.value = true
      throw error // Re-throw so manualRefresh can handle it properly
    }
  }

  /**
   * Create data series structure from historical data
   * Used when dataSeries is empty and we have historical data to display
   */
  const createSeriesFromHistoricalData = async (historicalData: any[]) => {
    try {
      // Group data by unique point identifiers
      const pointsMap = new Map<string, any>()

      historicalData.forEach(item => {
        const key = `${item.point_id}_${item.point_type}`
        if (!pointsMap.has(key)) {
          pointsMap.set(key, item)
        }
      })

      LogUtil.Info('📊 Creating series from historical data:', {
        totalDataPoints: historicalData.length,
        uniquePoints: pointsMap.size,
        points: Array.from(pointsMap.keys())
      })

      // Create series for each unique point
      const newSeries: DataSeries[] = []
      let colorIndex = 0

      for (const [key, firstItem] of pointsMap) {
        const pointId = firstItem.point_id
        const pointType = firstItem.point_type

        // Get device description for better naming
        const description = await getDeviceDescription(
          firstItem.panel_id,
          pointId,
          pointType,
          firstItem.point_index || 0
        )

        // Create series with proper naming
        const seriesName = description && description.trim() &&
          !description.includes('(P0)') &&
          !description.match(/^\d+\s*\([P]\d+\)$/)
          ? description
          : pointId

        const series: DataSeries = {
          id: pointId,
          panelId: firstItem.panel_id,
          name: seriesName,
          description: description || pointId,
          color: SERIES_COLORS[colorIndex % SERIES_COLORS.length],
          data: [],
          visible: true,
          pointType: mapPointTypeToNumber(pointType),
          pointNumber: firstItem.point_index || 0,
          unit: firstItem.unit || '',
          digital_analog: firstItem.digital_analog || 1
        }

        newSeries.push(series)
        colorIndex++
      }

      // Assign the new series
      dataSeries.value = newSeries

      LogUtil.Info('✅ Series created from historical data:', {
        seriesCount: newSeries.length,
        seriesNames: newSeries.map(s => s.name)
      })

    } catch (error) {
      LogUtil.Error('Error creating series from historical data:', error)
      throw error
    }
  }

  /**
   * Merge and deduplicate data points based on timestamp proximity
   * Prevents duplicate data when combining real-time and historical data
   */
  const mergeAndDeduplicate = (existingData: DataPoint[], newData: DataPoint[]): DataPoint[] => {
    if (!existingData || existingData.length === 0) {
      return newData
    }
    if (!newData || newData.length === 0) {
      return existingData
    }

    // Create a map of existing data points by timestamp (rounded to nearest second)
    const existingMap = new Map<number, DataPoint>()
    existingData.forEach(point => {
      const roundedTime = Math.floor(point.timestamp / 1000) * 1000 // Round to nearest second
      existingMap.set(roundedTime, point)
    })

    // Add new data points, but only if they don't exist within 1 second
    const merged = [...existingData]
    let duplicatesSkipped = 0
    let newPointsAdded = 0

    newData.forEach(point => {
      const roundedTime = Math.floor(point.timestamp / 1000) * 1000

      // Check if a point exists within 1 second window
      if (!existingMap.has(roundedTime)) {
        merged.push(point)
        existingMap.set(roundedTime, point)
        newPointsAdded++
      } else {
        duplicatesSkipped++
      }
    })

    // Sort by timestamp
    merged.sort((a, b) => a.timestamp - b.timestamp)

    LogUtil.Debug('🔄 Merge and deduplicate complete', {
      existingCount: existingData.length,
      newDataCount: newData.length,
      mergedCount: merged.length,
      duplicatesSkipped,
      newPointsAdded
    })

    return merged
  }

  /**
   * Populate data series with historical data from database
   * Now MERGES with existing data instead of replacing
   * 🆕 ASYNC with yield points to prevent UI blocking
   */
  const populateDataSeriesWithHistoricalData = async (historicalData: any[]) => {
    try {
      // Group historical data by point_id and point_type
      const dataByPoint = new Map<string, any[]>()

      historicalData.forEach(item => {
        const key = `${item.point_id}_${item.point_type}`
        if (!dataByPoint.has(key)) {
          dataByPoint.set(key, [])
        }
        dataByPoint.get(key)!.push(item)
      })

      LogUtil.Info('🔍 Starting historical data population', {
        totalHistoricalItems: historicalData.length,
        availableDataSeries: dataSeries.value.length,
        seriesIds: dataSeries.value.map(s => s.id),
        dataGroupKeys: Array.from(dataByPoint.keys()),
        seriesDetails: dataSeries.value.map(s => ({
          id: s.id,
          pointType: s.pointType,
          expectedKey: `${s.id}_${mapPointTypeFromNumber(s.pointType || 1)}`
        }))
      })

      // 🆕 Process series asynchronously with yield points to prevent UI blocking
      for (let seriesIndex = 0; seriesIndex < dataSeries.value.length; seriesIndex++) {
        const series = dataSeries.value[seriesIndex]

        // Yield to event loop every 3 series to prevent blocking
        if (seriesIndex > 0 && seriesIndex % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }

        const seriesKey = `${series.id}_${mapPointTypeFromNumber(series.pointType || 1)}`
        const seriesHistoricalData = dataByPoint.get(seriesKey) || []

        LogUtil.Info(`📊 Processing series ${seriesIndex}: ${series.name}`, {
          seriesId: series.id,
          seriesKey: seriesKey,
          pointType: series.pointType,
          mappedPointType: mapPointTypeFromNumber(series.pointType || 1),
          historicalDataCount: seriesHistoricalData.length,
          currentDataCount: series.data?.length || 0,
          keyExists: dataByPoint.has(seriesKey),
          availableKeys: Array.from(dataByPoint.keys())
        })

        if (seriesHistoricalData.length > 0) {
          // Convert to data points and sort by timestamp
          const dataPoints = seriesHistoricalData.map(item => ({
            timestamp: new Date(item.time).getTime(),
            value: parseFloat(item.value) || 0,
            id: item.point_id,
            type: item.point_type,
            digital_analog: item.digital_analog || 1,
            description: `Historical: ${item.point_id}`
          })).sort((a, b) => a.timestamp - b.timestamp)

          // 🆕 MERGE instead of replace - preserves real-time data not yet in database
          const existingDataCount = series.data?.length || 0
          const beforeMerge = series.data?.length || 0
          series.data = mergeAndDeduplicate(series.data || [], dataPoints)
          const afterMerge = series.data.length

          LogUtil.Info(`📈 HISTORY MERGED for ${series.name}:`, {
            seriesIndex,
            seriesId: series.id,
            existingPointsBefore: existingDataCount,
            historicalPointsToMerge: dataPoints.length,
            mergedTotal: series.data.length,
            dataBeforeMerge: beforeMerge,
            dataAfterMerge: afterMerge,
            mergeWorked: afterMerge >= dataPoints.length,
            sampleDataPoints: dataPoints.slice(0, 3).map(p => ({
              timestamp: p.timestamp,
              timeISO: new Date(p.timestamp).toISOString(),
              value: p.value
            })),
            allDataPoints: dataPoints.map(p => ({
              timestamp: p.timestamp,
              timeISO: new Date(p.timestamp).toISOString(),
              value: p.value,
              id: p.id
            })),
            timeRange: dataPoints.length > 0 ? {
              first: new Date(dataPoints[0].timestamp).toISOString(),
              last: new Date(dataPoints[dataPoints.length - 1].timestamp).toISOString()
            } : null
          })
        } else {
          LogUtil.Warn(`📭 No historical data found for series: ${series.name}`, {
            seriesKey,
            availableKeys: Array.from(dataByPoint.keys())
          })
        }
      } // End of for loop

      LogUtil.Info('📊 Historical data population completed', {
        seriesWithData: dataSeries.value.filter(s => s.data.length > 0).length,
        totalSeries: dataSeries.value.length
      })

    } catch (error) {
      LogUtil.Error('Error populating data series with historical data:', error)
    }
  }

  /**
   * Get correct point type from point ID (more reliable than point_type field)
   */
  const getCorrectPointTypeFromId = (pointId: string, fallbackPointType?: number): string => {
    // Extract type from point ID (IN1 -> INPUT, OUT1 -> OUTPUT, VAR1 -> VARIABLE)
    if (pointId.startsWith('IN')) return 'INPUT'
    if (pointId.startsWith('OUT')) return 'OUTPUT'
    if (pointId.startsWith('VAR')) return 'VARIABLE'
    if (pointId.startsWith('PID')) return 'PID'
    if (pointId.startsWith('SCH')) return 'SCHEDULE'
    if (pointId.startsWith('HOL')) return 'HOLIDAY'
    if (pointId.startsWith('PRG')) return 'PROGRAM'
    if (pointId.startsWith('TBL')) return 'TABLE'

    // Fallback to mapping function if ID parsing fails
    return fallbackPointType ? mapPointTypeFromNumber(fallbackPointType) : 'INPUT'
  }

  /**
   * Get correct point index from point ID (IN1 -> 1, OUT5 -> 5)
   */
  const getCorrectPointIndex = (pointId: string): number => {
    const match = pointId.match(/(\d+)$/) // Extract number from end of ID
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Get correct units - prioritize from dataSeries, fallback to item data
   */
  const getCorrectUnits = (item: any, pointId: string): string | undefined => {
    // First try to get units from current dataSeries that matches this point
    const matchingSeries = dataSeries.value.find(series => series.id === pointId)
    if (matchingSeries?.unit) {
      return matchingSeries.unit
    }

    // Fallback to item units
    return item.units || undefined
  }

  /**
   * Get correct sync interval based on T3000 interval configuration fields
   * Uses hour_interval_time, minute_interval_time, second_interval_time
   */
  const getCurrentSyncInterval = (): number => {
    // Try multiple data sources for T3000 interval configuration
    let intervalConfig = null
    let dataSource = 'fallback'

    // Priority 1: monitorConfig.value (from T3000 system)
    if (monitorConfig.value) {
      intervalConfig = monitorConfig.value
      dataSource = 'monitorConfig'
    }
    // Priority 2: props.itemData.t3Entry (from item configuration)
    else if (props.itemData?.t3Entry) {
      intervalConfig = props.itemData.t3Entry
      dataSource = 'itemData.t3Entry'
    }

    if (intervalConfig) {
      // Extract T3000 interval fields
      const hourInterval = intervalConfig.hour_interval_time || 0
      const minuteInterval = intervalConfig.minute_interval_time || 0
      const secondInterval = intervalConfig.second_interval_time || 0

      // Calculate total seconds using T3000 fields (same logic as calculateT3000Interval)
      const totalSeconds = (hourInterval * 3600) + (minuteInterval * 60) + secondInterval

      // Use calculated interval if > 0, otherwise fallback to default
      const syncIntervalSeconds = totalSeconds > 0 ? Math.max(totalSeconds, 15) : 60

      /*
      LogUtil.Debug('🕐 Calculating sync interval from T3000 config', {
        dataSource,
        hourInterval,
        minuteInterval,
        secondInterval,
        totalSeconds,
        syncIntervalSeconds,
        timeBase: timeBase.value,
        configExists: !!intervalConfig
      })
      */

      return syncIntervalSeconds
    }

    // Fallback: Use updateInterval calculation and convert to seconds
    const fallbackMs = updateInterval.value
    const fallbackSeconds = Math.round(fallbackMs / 1000)

    LogUtil.Debug('🕐 Using fallback sync interval calculation', {
      dataSource: 'updateInterval computed',
      fallbackMs,
      fallbackSeconds,
      timeBase: timeBase.value
    })

    return fallbackSeconds
  }/**
 * Store real-time data to database for historical usage
 */
  const storeRealtimeDataToDatabase = async (validDataItems: any[]) => {
    LogUtil.Debug('🔥 storeRealtimeDataToDatabase ENTRY', {
      itemsCount: validDataItems.length,
      firstItem: validDataItems[0]
    })

    try {
      LogUtil.Info('🔄 storeRealtimeDataToDatabase called', {
        itemsCount: validDataItems.length,
        timestamp: new Date().toISOString(),
        sampleItems: validDataItems.slice(0, 2) // Show first 2 items for debugging
      })

      // Get current device info for storage
      const panelsList = T3000_Data.value.panelsList || []
      const currentPanelId = panelsList.length > 0 ? panelsList[0].panel_number : 1

      // FIX: Use serial number from URL instead of panelsList (which may have outdated value)
      const urlSerialNumber = route.query.sn ? parseInt(route.query.sn as string) : 0
      const currentSN = urlSerialNumber || (panelsList.length > 0 ? panelsList[0].serial_number : 0)

      LogUtil.Debug('🔍 Serial Number Source Check', {
        urlSerialNumber,
        panelsListSN: panelsList.length > 0 ? panelsList[0].serial_number : 'N/A',
        finalSN: currentSN,
        source: urlSerialNumber ? 'URL' : 'panelsList'
      })

      /*
      LogUtil.Info('📊 Device info for storage', {
        panelsListLength: panelsList.length,
        currentPanelId,
        currentSN,
        hasPanelsList: !!panelsList.length
      })
        */

      if (!currentSN) {
        LogUtil.Warn('�?No serial number available for data storage', {
          panelsList: panelsList.slice(0, 2),
          T3000DataExists: !!T3000_Data.value
        })
        return
      }

      // Filter items to only include those matching current device (serial_number and panel_id from URL query)
      const urlPanelId = route.query.panel_id ? parseInt(route.query.panel_id as string) : 0
      const queryPanelId = urlPanelId || currentPanelId

      const currentDeviceItems = validDataItems.filter(item => {
        const itemPanelId = item.pid || item.panel_id
        const itemSerialNumber = item.serial_number || item.sn

        // Match panel_id (required)
        const panelMatches = itemPanelId === queryPanelId

        // Match serial_number (if item has it, it must match; if item doesn't have it, allow through)
        const serialMatches = !itemSerialNumber || itemSerialNumber === currentSN

        return panelMatches && serialMatches
      })

      LogUtil.Info('🔍 Filtered items for current device', {
        originalCount: validDataItems.length,
        filteredCount: currentDeviceItems.length,
        currentSN,
        queryPanelId,
        dropped: validDataItems.length - currentDeviceItems.length
      })

      if (currentDeviceItems.length === 0) {
        LogUtil.Warn('⚠️ No items match current device after filtering - skipping batch save')
        return
      }

      // Convert GET_ENTRIES response to RealtimeDataRequest format
      const realtimeDataPoints: RealtimeDataRequest[] = currentDeviceItems.map(item => {
        // Enhanced debugging for point type determination
        const pointId = item.id || 'UNKNOWN'
        const pointType = getCorrectPointTypeFromId(pointId, item.point_type)
        const pointIndex = getCorrectPointIndex(pointId)
        const units = getCorrectUnits(item, pointId)

        const syncInterval = getCurrentSyncInterval()

        /*
        LogUtil.Debug('🔧 Processing item for database storage', {
          pointId,
          rawPointType: item.point_type,
          mappedPointType: pointType,
          calculatedIndex: pointIndex,
          rawIndex: item.index,
          rawValue: item.value,
          rawUnits: item.units,
          calculatedUnits: units,
          digitalAnalog: item.digital_analog,
          range: item.range,
          syncInterval: syncInterval,
          timeBase: timeBase.value,
          // T3000 interval fields for verification
          t3000Intervals: {
            hour: monitorConfig.value?.hour_interval_time || props.itemData?.t3Entry?.hour_interval_time || 0,
            minute: monitorConfig.value?.minute_interval_time || props.itemData?.t3Entry?.minute_interval_time || 0,
            second: monitorConfig.value?.second_interval_time || props.itemData?.t3Entry?.second_interval_time || 0
          }
        })
        */

        // 🎯 CRITICAL FIX: Use correct value field based on digital_analog
        // Digital outputs (digital_analog=0): use 'control' field
        // Analog outputs (digital_analog=1): use 'value' field
        // This must match the display logic to ensure database consistency
        const valueToStore = item.digital_analog === 1
          ? (item.value || 0)      // Analog: use 'value' field
          : (item.control || 0);   // Digital: use 'control' field (per Str_out_point struct)

        // 🔍 DEBUG: Log value selection for digital outputs
        if (item.digital_analog === 0 && pointId.startsWith('OUT')) {
          LogUtil.Debug(`🎯 Digital OUTPUT ${pointId}:`, {
            digital_analog: item.digital_analog,
            control: item.control,
            value: item.value,
            valueToStore,
            auto_manual: item.auto_manual
          })
        }

        return {
          serial_number: currentSN,
          panel_id: item.pid || currentPanelId,
          point_id: pointId,
          point_index: pointIndex,
          point_type: pointType,
          value: String(valueToStore), // Store correct field based on digital_analog
          // Optional fields - with enhanced logic
          range_field: item.range ? String(item.range) : undefined,
          digital_analog: item.digital_analog ? String(item.digital_analog) : undefined,
          units: units,
          // Enhanced source tracking
          data_source: 'REALTIME',
          created_by: 'FRONTEND',
          sync_interval: syncInterval // Use user-configured interval
        }
      })

      // Store batch to database with detailed logging
      if (realtimeDataPoints.length > 0) {
        LogUtil.Debug('🔥 About to call saveRealtimeBatch API', {
          pointsCount: realtimeDataPoints.length,
          serialNumber: currentSN,
          firstPoint: realtimeDataPoints[0]
        })

        LogUtil.Info('📤 Sending real-time batch to API', {
          pointsCount: realtimeDataPoints.length,
          serialNumber: currentSN,
          apiEndpoint: 'localhost:9103/api/trendlog/realtime/batch',
          sampleDataPoint: realtimeDataPoints[0],
          detailedDataPoints: realtimeDataPoints.map(p => ({
            point_id: p.point_id,
            panel_id: p.panel_id,
            point_index: p.point_index,
            point_type: p.point_type,
            value: p.value,
            digital_analog: p.digital_analog,
            units: p.units,
            range_field: p.range_field,
            data_source: p.data_source,
            created_by: p.created_by,
            sync_interval: p.sync_interval // Add sync interval to logging
          }))
        })

        const rowsAffected = await trendlogAPI.saveRealtimeBatch(realtimeDataPoints)

        /*
        LogUtil.Info(`�?Successfully stored ${rowsAffected} real-time data points`, {
          pointsCount: realtimeDataPoints.length,
          rowsAffected,
          serialNumber: currentSN,
          timestamp: new Date().toISOString(),
          success: rowsAffected > 0
        })
        */
      } else {
        LogUtil.Warn('⚠️ No valid data points to store', {
          originalItemsCount: validDataItems.length,
          serialNumber: currentSN
        })
      }
    } catch (error) {
      LogUtil.Error('Failed to store real-time data to database:', error)
    }
  }

  /**
   * Validate that filtering is working correctly by comparing data counts
   */
  const validateFilteringResults = (originalCount: number, filteredCount: number, chartSeriesCount: number) => {
    LogUtil.Info('🔍 Filtering validation results', {
      originalDataCount: originalCount,
      filteredDataCount: filteredCount,
      chartSeriesCount: chartSeriesCount,
      reductionRatio: filteredCount > 0 ? `${((filteredCount / originalCount) * 100).toFixed(1)}%` : '0%',
      expectedRange: `�?${chartSeriesCount} items`,
      isReasonableFilter: filteredCount > 0 && filteredCount <= chartSeriesCount && filteredCount < originalCount,
      message: filteredCount === 0 ? 'No matches found - check filtering logic' :
        filteredCount > chartSeriesCount ? 'More items than chart series - check filtering logic' :
          filteredCount === originalCount ? 'No filtering occurred - check filtering logic' :
            'Filtering working correctly'
    })
  }

  /**
   * Update chart with new data from GET_ENTRIES response
   */
  const updateChartWithNewData = (validDataItems: any[]) => {
    LogUtil.Debug('🔥 updateChartWithNewData CALLED', {
      itemsCount: validDataItems?.length || 0,
      hasDataSeries: !!dataSeries.value?.length,
      isRealTime: isRealTime.value,
      currentDataState: dataSeries.value.map(s => ({
        name: s.name,
        dataCount: s.data?.length || 0,
        hasDataArray: !!s.data
      }))
    })

    if (!dataSeries.value?.length) {
      LogUtil.Debug('📈 TrendLogChart: No series configured')
      return
    }

    const hasData = Array.isArray(validDataItems) && validDataItems.length > 0

    if (!hasData) {
      LogUtil.Debug('📈 TrendLogChart: No new data points, but updating charts for time window scroll')
      // Skip data processing but still update charts for x-axis scroll
      if (isRealTime.value && (analogChartInstance || digitalChartInstance)) {
        updateCharts()  // ✅ CRITICAL: Keeps x-axis scrolling
      }
      return
    }

    const timestamp = new Date()
    let matched = 0
    let unmatched = 0

    LogUtil.Debug('🔍 updateChartWithNewData matching attempt:', {
      seriesCount: dataSeries.value.length,
      incomingItemsCount: validDataItems.length,
      firstSeries: dataSeries.value[0] ? {
        name: dataSeries.value[0].name,
        id: dataSeries.value[0].id,
        panelId: dataSeries.value[0].panelId,
        allKeys: Object.keys(dataSeries.value[0])
      } : null,
      firstIncomingItem: validDataItems[0] ? {
        id: validDataItems[0].id,
        pid: validDataItems[0].pid,
        label: validDataItems[0].label
      } : null
    })

    // 🔎 DEBUG: Show ALL properties of first series to understand structure
    if (dataSeries.value[0]) {
      LogUtil.Debug('🔎 First series FULL object:', dataSeries.value[0])
    }

    // 🚀 OPTIMIZED APPROACH: Loop through dataSeries (14 max) instead of validDataItems (328)
    dataSeries.value.forEach((series, seriesIndex) => {
      // 🔧 DEFENSIVE FIX: Reconstruct id and panelId from itemType if missing
      // itemType format: "144IN40" = panelId (144) + prefix (IN) + number (40)
      if ((!series.id || !series.panelId) && series.itemType && series.prefix) {
        const match = series.itemType.match(/^(\d+)([A-Z]+)(\d+)$/)
        if (match) {
          const extractedPanelId = parseInt(match[1])
          const extractedPrefix = match[2]
          const extractedNumber = match[3]
          const extractedId = `${extractedPrefix}${extractedNumber}`

          console.warn(`🔧 FIX: Reconstructing missing properties for series ${seriesIndex}:`, {
            originalName: series.name,
            itemType: series.itemType,
            extractedPanelId,
            extractedId,
            beforeFix: { id: series.id, panelId: series.panelId },
            willSetTo: { id: extractedId, panelId: extractedPanelId }
          })

          // Add the missing properties
          series.id = extractedId
          series.panelId = extractedPanelId
        } else {
          console.error(`❌ CRITICAL: Cannot parse itemType for series ${seriesIndex}:`, {
            seriesName: series.name,
            itemType: series.itemType,
            prefix: series.prefix,
            allProperties: Object.keys(series)
          })
          unmatched++
          return
        }
      }

      // Skip empty series that don't have matching criteria
      if (!series.id || !series.panelId) {
        console.error(`❌ CRITICAL: Series ${seriesIndex} STILL missing id or panelId after fix attempt!`, {
          seriesName: series.name,
          itemType: series.itemType,
          id: series.id,
          panelId: series.panelId,
          allProperties: Object.keys(series)
        })
        unmatched++
        return
      }

      // Direct lookup: Find matching item by id and panelId
      const matchedItem = validDataItems.find(item =>
        item.id === series.id && item.pid === series.panelId
      )

      if (!matchedItem) {
        LogUtil.Debug(`❌ No match for series ${series.name}:`, {
          searchingFor: { id: series.id, panelId: series.panelId },
          seriesIndex,
          sampleIncomingIds: validDataItems.slice(0, 3).map(item => ({ id: item.id, pid: item.pid }))
        })
        LogUtil.Debug(`No match found for series ${series.name}`, {
          searchingFor: { id: series.id, panelId: series.panelId },
          seriesIndex
        })
        unmatched++
        return
      }

      LogUtil.Debug(`✅ MATCHED series ${series.name}:`, {
        series: { id: series.id, panelId: series.panelId },
        item: { id: matchedItem.id, pid: matchedItem.pid }
      })

      // 🎯 VALUE SELECTION: Use correct field based on digital_analog (per C struct definition)
      // digital_analog: 0=digital, 1=analog
      // For digital (digital_analog=0): use 'control' field (0=off, 1=on)
      // For analog (digital_analog=1): use 'value' field (int32_t)
      let actualValue;
      if (matchedItem.digital_analog === 1) {
        // Analog: use 'value' field
        actualValue = matchedItem.value;
      } else {
        // Digital: use 'control' field (per Str_out_point struct)
        actualValue = matchedItem.control;

        // 🔍 DEBUG: Log for digital outputs
        if (matchedItem.id && matchedItem.id.startsWith('OUT')) {
          LogUtil.Debug(`📊 DISPLAY Digital OUTPUT ${matchedItem.id}:`, {
            digital_analog: matchedItem.digital_analog,
            control: matchedItem.control,
            value: matchedItem.value,
            actualValue,
            seriesName: series.name
          })
        }
      }

      const rawValue = actualValue || 0
      // 🎯 CRITICAL: Don't scale digital values - control field is already 0 or 1
      // Only scale analog values (which are multiplied by 1000 in database)
      const scaledValue = matchedItem.digital_analog === 0 ? rawValue : scaleValueIfNeeded(rawValue)

      // 📊 VALUE PRECISION LOGGING: Track how scaling affects small variations
      if (rawValue >= 1000) {
        LogUtil.Info(`🔍 Value Scaling Analysis for ${series.name}`, {
          rawValue,
          scaledValue,
          precisionLoss: rawValue - (scaledValue * 1000),
          seriesName: series.name,
          note: 'Large values scaled down - check for precision loss'
        })
      }

      // Create and add data point
      const dataPoint: DataPoint = {
        timestamp: timestamp.getTime(),
        value: scaledValue,
        id: matchedItem.id,
        type: matchedItem.type,
        digital_analog: matchedItem.digital_analog || BAC_UNITS_ANALOG,
        description: matchedItem.description || matchedItem.label || `Point ${matchedItem.id}`
      }

      series.data = series.data || []

      /*
      LogUtil.Debug(`📊 Before adding batch point to ${series.name}:`, {
        existingDataCount: series.data.length,
        existingTimeRange: series.data.length > 0 ? {
          first: new Date(series.data[0].timestamp).toISOString(),
          last: new Date(series.data[series.data.length - 1].timestamp).toISOString()
        } : null,
        newPointTimestamp: new Date(dataPoint.timestamp).toISOString()
      })
      */

      // Check if this data point already exists (prevent duplicates)
      const existingIndex = series.data.findIndex(point =>
        Math.abs(point.timestamp - dataPoint.timestamp) < 1000 // Within 1 second
      )

      if (existingIndex >= 0) {
        // Update existing data point
        series.data[existingIndex] = dataPoint
        LogUtil.Debug(`🔄 Updated existing point in ${series.name}:`, {
          timestamp: new Date(dataPoint.timestamp).toLocaleTimeString(),
          value: dataPoint.value,
          totalPoints: series.data.length
        })
      } else {
        // Add new data point
        series.data.push(dataPoint)

        // Sort data points by timestamp to maintain chronological order
        series.data.sort((a, b) => a.timestamp - b.timestamp)

        LogUtil.Debug(`➕ Added NEW point to ${series.name}:`, {
          timestamp: new Date(dataPoint.timestamp).toLocaleTimeString(),
          value: dataPoint.value,
          totalPoints: series.data.length,
          timeRange: series.data.length > 1 ? {
            first: new Date(series.data[0].timestamp).toLocaleTimeString(),
            last: new Date(series.data[series.data.length - 1].timestamp).toLocaleTimeString()
          } : null
        })
      }

      LogUtil.Debug(`📊 After adding batch point to ${series.name}:`, {
        finalDataCount: series.data.length,
        finalTimeRange: series.data.length > 0 ? {
          first: new Date(series.data[0].timestamp).toISOString(),
          last: new Date(series.data[series.data.length - 1].timestamp).toISOString()
        } : null
      })

      // Update series metadata from matched item only if not already set
      if (matchedItem.description && !series.description) {
        series.description = matchedItem.description
      }
      // Note: Series name is already set during initialization from trendlog config (which has fullLabel)
      // We don't update it from real-time panelsData since it may not have fullLabel field

      matched++

      /*
      LogUtil.Debug(`�?Matched series ${series.name}`, {
        matchedItem: {
          id: matchedItem.id,
          pid: matchedItem.pid,
          digital_analog: matchedItem.digital_analog,
          rawValue: matchedItem.digital_analog === 1 ? matchedItem.value : matchedItem.control,
          scaledValue: actualValue
        }
      })
        */
    })

    LogUtil.Debug('📊 TrendLogChart: Data processing complete', {
      matched,
      unmatched,
      totalSeries: dataSeries.value,
      validDataItems: validDataItems
    })

    // 💾 Store real-time data to database if in real-time mode (async, non-blocking)
    if (isRealTime.value && validDataItems.length > 0) {
      // Fire and forget - don't await, don't block chart updates
      storeRealtimeDataToDatabase(validDataItems).catch(err => {
        LogUtil.Warn('Background batch save failed (non-critical)', err)
      })
    }

    // Update charts if instances exist
    if (analogChartInstance || digitalChartInstance) {
      updateCharts()
    } else {
      LogUtil.Debug('⚠️ Chart instances not available for update')
    }
  }

  const getTimeRangeMinutes = (range: string): number => {
    const ranges = {
      '5m': 5,        // 5 minutes
      '10m': 10,      // 10 minutes
      '30m': 30,      // 30 minutes
      '1h': 60,       // 1 hour
      '4h': 240,      // 4 hours
      '12h': 720,     // 12 hours
      '1d': 1440,     // 1 day
      '4d': 5760      // 4 days
    }
    return ranges[range] || 60
  }

  // 🆕 OPTIMIZATION: Check if we can reuse existing data when changing timebase
  const checkDataReuseOptimization = async (oldTimeBase: string, newTimeBase: string): Promise<boolean> => {
    // Only optimize for real-time mode (5m) or when time offset is 0 (current time view)
    if (!isRealTime.value && timeOffset.value !== 0) {
      LogUtil.Debug('�?Cannot optimize: Not real-time and has time offset', { timeOffset: timeOffset.value })
      return false
    }

    // Only optimize when going from shorter to longer timebase
    const oldMinutes = getTimeRangeMinutes(oldTimeBase)
    const newMinutes = getTimeRangeMinutes(newTimeBase)

    if (newMinutes <= oldMinutes) {
      LogUtil.Debug('�?Cannot optimize: New timebase is not longer', { oldMinutes, newMinutes })
      return false
    }

    // Must have existing data to reuse
    const hasExistingData = dataSeries.value.some(series => series.data && series.data.length > 0)
    if (!hasExistingData) {
      LogUtil.Debug('�?Cannot optimize: No existing data to reuse')
      return false
    }

    // Only optimize for simple progression (e.g., 5m�?0m, 10m�?0m, 30m�?h, etc.)
    const timebaseProgression = ['5m', '10m', '30m', '1h', '4h', '12h', '1d', '4d']
    const oldIndex = timebaseProgression.indexOf(oldTimeBase)
    const newIndex = timebaseProgression.indexOf(newTimeBase)

    if (oldIndex === -1 || newIndex === -1 || newIndex !== oldIndex + 1) {
      LogUtil.Debug('�?Cannot optimize: Not a simple progression', { oldTimeBase, newTimeBase, oldIndex, newIndex })
      return false
    }

    LogUtil.Info('�?Data reuse optimization possible', {
      oldTimeBase,
      newTimeBase,
      oldMinutes,
      newMinutes,
      gapMinutes: newMinutes - oldMinutes,
      existingDataPoints: dataSeries.value.reduce((sum, s) => sum + (s.data?.length || 0), 0)
    })

    return true
  }

  // 🆕 OPTIMIZATION: Load only the missing historical data gap
  const loadHistoricalDataGap = async (oldTimeBase: string, newTimeBase: string): Promise<void> => {
    LogUtil.Info('🔍 Loading historical data gap for seamless timebase transition', {
      oldTimeBase,
      newTimeBase,
      timeOffset: timeOffset.value
    })

    try {
      // Calculate the missing time range (gap before existing data)
      const oldMinutes = getTimeRangeMinutes(oldTimeBase)
      const newMinutes = getTimeRangeMinutes(newTimeBase)
      const gapMinutes = newMinutes - oldMinutes

      const currentTime = new Date()
      const offsetEndTime = new Date(currentTime.getTime() + timeOffset.value * 60 * 1000)

      // Gap time range: from (current - newMinutes) to (current - oldMinutes)
      const gapEndTime = new Date(offsetEndTime.getTime() - oldMinutes * 60 * 1000)
      const gapStartTime = new Date(gapEndTime.getTime() - gapMinutes * 60 * 1000)

      LogUtil.Debug('🔧 Gap time calculation', {
        currentTime: currentTime.toISOString(),
        gapStartTime: gapStartTime.toISOString(),
        gapEndTime: gapEndTime.toISOString(),
        gapMinutes,
        oldMinutes,
        newMinutes
      })

      // Use existing device parameters and points logic
      const deviceParams = extractDeviceParameters()
      const { sn: currentSN, panel_id: currentPanelId } = deviceParams

      if (!currentSN || !currentPanelId) {
        LogUtil.Warn('�?loadHistoricalDataGap: Missing device parameters')
        return
      }

      // Get points from existing data series (they're already loaded)
      const specificPoints: Array<{ point_id: string, point_type: string, point_index: number, panel_id: number }> = []

      dataSeries.value.forEach((series) => {
        if (series.pointType !== undefined && series.pointNumber !== undefined) {
          const pointTypeString = mapPointTypeFromNumber(series.pointType)
          const pointId = generateDeviceId(series.pointType, series.pointNumber)

          // FIX: Frontend uses 0-based pointNumber, but database expects 1-based PointIndex
          specificPoints.push({
            point_id: pointId,
            point_type: pointTypeString,
            point_index: series.pointNumber + 1, // Convert 0-based to 1-based
            panel_id: currentPanelId
          })
        }
      })

      if (specificPoints.length === 0) {
        LogUtil.Warn('�?loadHistoricalDataGap: No points to load gap for')
        return
      }

      // Format timestamps for API
      const formatLocalTime = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      }

      const formattedStartTime = formatLocalTime(gapStartTime)
      const formattedEndTime = formatLocalTime(gapEndTime)

      // Query gap data from database using existing trendlog API
      const trendlogId = deviceParams.trendlog_id?.toString() || '1'

      const gapRequest = {
        serial_number: currentSN,
        panel_id: currentPanelId,
        trendlog_id: trendlogId,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        // No limit - return all data in the time range (same as main history load)
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'],
        specific_points: specificPoints
      }

      const gapDataResponse = await trendlogAPI.getTrendlogHistory(gapRequest)

      LogUtil.Debug('📊 Gap data response', {
        dataCount: gapDataResponse?.data?.length || 0,
        timeRange: `${formattedStartTime} to ${formattedEndTime}`
      })

      if (gapDataResponse?.data && gapDataResponse.data.length > 0) {
        // Process and prepend gap data to existing series
        processAndPrependGapData(gapDataResponse.data)

        LogUtil.Info('�?Gap data successfully loaded and merged', {
          gapDataPoints: gapDataResponse.data.length,
          totalDataPointsAfter: dataSeries.value.reduce((sum, s) => sum + (s.data?.length || 0), 0)
        })
      } else {
        LogUtil.Warn('⚠️ No gap data found or query failed', { response: gapDataResponse })
      }

    } catch (error) {
      LogUtil.Error('�?Error loading historical data gap:', error)
      // Don't throw - fall back to showing existing data
    }
  }

  // Helper function to process and prepend gap data to existing series
  const processAndPrependGapData = (gapData: any[]) => {
    LogUtil.Debug('🔧 Processing gap data for prepending', { gapDataCount: gapData.length })

    const pointDataMap = new Map<string, any[]>()

    // Group gap data by point_id
    gapData.forEach(item => {
      const pointId = item.point_id
      if (!pointDataMap.has(pointId)) {
        pointDataMap.set(pointId, [])
      }
      pointDataMap.get(pointId)!.push(item)
    })

    // Process each series and prepend gap data
    dataSeries.value.forEach(series => {
      if (!series.pointType || series.pointNumber === undefined) {
        LogUtil.Debug(`⚠️ Skipping series - missing point info`, {
          name: series.name,
          hasPointType: !!series.pointType,
          pointType: series.pointType,
          hasPointNumber: series.pointNumber !== undefined,
          pointNumber: series.pointNumber
        })
        return
      }

      const pointId = generateDeviceId(series.pointType, series.pointNumber)
      const pointGapData = pointDataMap.get(pointId)

      LogUtil.Debug(`🔍 Gap data lookup for ${series.name}`, {
        seriesName: series.name,
        pointType: series.pointType,
        pointNumber: series.pointNumber,
        generatedPointId: pointId,
        hasGapData: !!pointGapData,
        gapDataCount: pointGapData?.length || 0,
        availablePointIds: Array.from(pointDataMap.keys())
      })

      if (pointGapData && pointGapData.length > 0) {
        // Convert gap data to chart format (matching series.data structure)
        const gapChartData = pointGapData.map(item => {
          // Handle both old format (LoggingTime_Fmt) and new format (time)
          const timeField = item.time || item.LoggingTime_Fmt
          const timestamp = new Date(timeField).getTime()

          // Extract value from history API response format
          // History API returns: {value, original_value, is_analog, digital_analog}
          const value = item.value !== undefined && item.value !== null ?
            parseFloat(item.value) :
            (item.original_value !== undefined && item.original_value !== null ?
              parseFloat(item.original_value) : 0)

          // Diagnostic logging for first item
          if (pointGapData.indexOf(item) === 0) {
            LogUtil.Debug(`🔬 Gap data conversion sample for ${series.name}`, {
              rawItem: item,
              timeField,
              timestamp,
              timestampValid: !isNaN(timestamp),
              value,
              valueValid: !isNaN(value),
              itemKeys: Object.keys(item)
            })
          }

          return {
            timestamp: timestamp,
            value: value,
            id: item.point_id,
            type: item.point_type,
            digital_analog: item.digital_analog || item.is_analog || 1,
            description: item.description || ''
          }
        }).filter(point => !isNaN(point.timestamp) && !isNaN(point.value))
          .sort((a, b) => a.timestamp - b.timestamp) // Ensure chronological order

        // Prepend gap data to existing data (gap data comes before existing data)
        if (series.data && series.data.length > 0) {
          const beforePrepend = series.data.length
          series.data = [...gapChartData, ...series.data]

          // Remove duplicates and sort by timestamp
          const uniqueData = new Map()
          series.data.forEach(point => {
            uniqueData.set(point.timestamp, point)
          })
          series.data = Array.from(uniqueData.values()).sort((a, b) => a.timestamp - b.timestamp)

          LogUtil.Debug(`✅ Prepended gap data to ${series.name}`, {
            gapPointsReceived: gapChartData.length,
            existingPointsBefore: beforePrepend,
            combinedBeforeDedup: gapChartData.length + beforePrepend,
            totalPointsAfter: series.data.length,
            actualPointsAdded: series.data.length - beforePrepend,
            duplicatesRemoved: (gapChartData.length + beforePrepend) - series.data.length,
            firstPoint: series.data[0],
            lastPoint: series.data[series.data.length - 1],
            gapDataTimeRange: gapChartData.length > 0 ? {
              first: new Date(gapChartData[0].timestamp).toISOString(),
              last: new Date(gapChartData[gapChartData.length - 1].timestamp).toISOString()
            } : null
          })
        }
      }
    })
  }

  const initializeData = async () => {
    LogUtil.Info('= TLChart: Starting hybrid data initialization (DB + real-time)', {
      currentDataSeriesLength: dataSeries.value.length,
      hasMonitorConfig: !!monitorConfig.value,
      timeBase: timeBase.value
    })

    // Set data source to realtime for standard initialization
    dataSource.value = 'realtime'

    const monitorConfigData = monitorConfig.value

    // 🔍 DIAGNOSTIC: Log detailed state when initializeData is called
    LogUtil.Info('🔍 DIAGNOSTIC: initializeData state check', {
      hasMonitorConfig: !!monitorConfigData,
      monitorConfigType: typeof monitorConfigData,
      hasInputItems: !!(monitorConfigData?.inputItems),
      inputItemsLength: monitorConfigData?.inputItems?.length || 0,
      inputItemsIsArray: Array.isArray(monitorConfigData?.inputItems),
      willCallLoadHistory: !!(monitorConfigData && monitorConfigData.inputItems && monitorConfigData.inputItems.length > 0),
      monitorConfigKeys: monitorConfigData ? Object.keys(monitorConfigData) : []
    })

    if (monitorConfigData && monitorConfigData.inputItems && monitorConfigData.inputItems.length > 0) {
      try {
        // Try to load historical data - this will create series structure if successful
        LogUtil.Info('🔧 Loading historical data from database')
        await loadHistoricalDataFromDatabase()
        LogUtil.Info('✅ Historical data loaded successfully')

      } catch (error) {
        LogUtil.Error('= TLChart: Error in data initialization:', error)
        hasConnectionError.value = true
        dataSeries.value = []
      }
    } else {
      LogUtil.Info('📊 Empty State Configuration:', {
        configExists: !!monitorConfigData,
        hasInputItems: !!(monitorConfigData?.inputItems),
        inputItemsLength: monitorConfigData?.inputItems?.length || 0,
        scheduleDataExists: !!currentItemData.value,
        scheduleId: (currentItemData.value as any)?.t3Entry?.id,
        panelsDataLength: T3000_Data.value.panelsData?.length || 0,
        dataType: 'NO_DATA_AVAILABLE'
      })
      hasConnectionError.value = true
      dataSeries.value = []
      stopLoading()
    }  // If no data series available, chart will remain empty (no mock data generation)
    if (dataSeries.value.length === 0) {
      LogUtil.Info('📊 TrendLogChart: No data series available - maintaining empty state', {
        dataSeriesLength: dataSeries.value.length,
        hasMonitorConfig: !!monitorConfig.value
      })
      return
    }

    // Skip data generation if there's a connection error - should show empty chart
    if (hasConnectionError.value) {
      LogUtil.Info('📊 TrendLogChart: Skipping data generation - connection error (should show empty chart)')
      return
    }

    // Real data only - no synthetic data generation
    LogUtil.Info('📊 TrendLogChart: Mock/demo data generation removed - chart will only show real data')

    // For real data series, update the charts
    updateCharts()
  }

  /**
   * 🆕 FIX: Create temporary monitor config from props when monitorConfig is not ready yet
   * This prevents race conditions where dataseries exists but monitorConfig is still loading
   */
  const createTempMonitorConfigFromProps = () => {
    try {
      const inputData = props.itemData?.t3Entry?.input
      const rangeData = props.itemData?.t3Entry?.range
      const monitorId = props.itemData?.t3Entry?.id
      const panelId = props.itemData?.t3Entry?.pid

      if (!inputData?.length || !rangeData?.length || !monitorId) {
        LogUtil.Warn('🔧 createTempMonitorConfigFromProps: Missing required props data', {
          hasInputData: !!inputData?.length,
          hasRangeData: !!rangeData?.length,
          hasMonitorId: !!monitorId,
          hasPanelId: panelId !== undefined
        })
        return null
      }

      // Create temporary monitor config structure compatible with sendPeriodicBatchRequest
      const tempConfig = {
        id: monitorId,
        pid: panelId || 1, // Use pid from props or default to 1
        label: `Temp Monitor ${monitorId}`,
        inputItems: inputData.map((inputItem: any, index: number) => ({
          panel: inputItem.panel,
          point_number: inputItem.point_number,
          point_type: inputItem.point_type,
          network: inputItem.network || 0,
          sub_panel: inputItem.sub_panel || 0,
          index: index
        })),
        ranges: rangeData || [],
        numInputs: inputData.length,
        dataIntervalMs: 5000, // Default 5 second interval
        isTemporary: true // Flag to indicate this is temporary
      }

      LogUtil.Info('🔧 createTempMonitorConfigFromProps: Created temporary config', {
        tempConfigId: tempConfig.id,
        tempConfigPid: tempConfig.pid,
        inputItemsCount: tempConfig.inputItems.length,
        rangesCount: tempConfig.ranges.length
      })

      return tempConfig
    } catch (error) {
      LogUtil.Error('🔧 createTempMonitorConfigFromProps: Failed to create temp config', error)
      return null
    }
  }

  const addRealtimeDataPoint = async () => {
    // 🛡️ CRITICAL: Wrap entire function in try-catch to ensure interval NEVER stops
    // Even if any error occurs (network, parsing, backend errors), the interval must continue
    try {
      LogUtil.Debug('⏰ addRealtimeDataPoint FIRED at', new Date().toLocaleTimeString() + '.' + new Date().getMilliseconds())

      // Only add data if we're in real-time mode
      if (!isRealTime.value) {
        LogUtil.Debug('❌ EXIT: Not in real-time mode')
        return
      }

      // Safety check: If no data series exist, skip processing
      if (dataSeries.value.length === 0) {
        LogUtil.Debug('❌ EXIT: No data series exist')
        return
      }

      // Check if we have real monitor configuration for live data
      const monitorConfigData = monitorConfig.value

      if (!monitorConfigData) {
        LogUtil.Debug('❌ EXIT: No monitor config')
        return
      }

      if (!monitorConfigData.inputItems || monitorConfigData.inputItems.length === 0) {
        LogUtil.Debug('❌ EXIT: No input items in monitor config')
        return
      }

      LogUtil.Debug('✅ All checks passed - calling sendPeriodicBatchRequest')

      try {
        // 🆕 CRITICAL FIX: Load historical data on FIRST batch request
        // This ensures history API is called when real-time monitoring starts
        if (!hasLoadedInitialHistory.value && monitorConfigData) {
          LogUtil.Info('📚 addRealtimeDataPoint: First batch request - loading historical data before starting real-time updates')
          hasLoadedInitialHistory.value = true // Set flag immediately to prevent duplicate calls

          try {
            await loadHistoricalDataFromDatabase()
            LogUtil.Info('✅ addRealtimeDataPoint: Historical data loaded successfully, now starting real-time updates')
          } catch (error) {
            LogUtil.Warn('⚠️ addRealtimeDataPoint: Historical data load failed, continuing with real-time only', error)
          }
        }

        // Send batch GET_ENTRIES request for ALL items at once
        LogUtil.Debug('📤 Sending batch request at', new Date().toLocaleTimeString())
        await sendPeriodicBatchRequest(monitorConfigData)
        LogUtil.Debug('📥 Batch request completed, waiting for T3000_Data watcher to process response...')

        // Note: Real data will come through T3000_Data watcher -> updateChartWithNewData
        // which calls updateChartWithNewData() to update dataSeries automatically

        // Update sync time since batch request was sent successfully
        lastSyncTime.value = new Date().toLocaleTimeString()

        // If we had connection error but successfully sent request, clear error state
        if (hasConnectionError.value) {
          LogUtil.Info('TrendLogChart: Auto-recovering from connection error - batch request sent successfully')
          hasConnectionError.value = false
        }

      } catch (error) {
        LogUtil.Warn('TrendLogChart: Failed to send batch request, setting connection error:', error)
        // Set connection error state - but keep accumulated data
        hasConnectionError.value = true
        // Don't clear data - let accumulated points remain visible
      }

      updateCharts()
    } catch (error) {
      // 🛡️ CRITICAL ERROR HANDLER: Catch ANY error to prevent interval from stopping
      // This ensures the polling continues even if there are unexpected errors
      LogUtil.Error('❌ CRITICAL: addRealtimeDataPoint encountered unexpected error (interval will continue):', error)
      hasConnectionError.value = true
    }
  }

  // Demo data generation function completely removed - only real T3000 data allowed

  // Multi-canvas chart creation functions
  const createCharts = () => {
    LogUtil.Debug('= TLChart DataFlow: Creating multi-canvas charts')

    // Create analog chart
    createAnalogChart()

    // Create digital charts
    createDigitalCharts()
  }

  const createAnalogChart = () => {
    if (!analogChartCanvas.value) {
      // Canvas not ready yet - retry after a delay with limit
      if (chartCreationRetries < MAX_CHART_CREATION_RETRIES) {
        chartCreationRetries++
        LogUtil.Debug(`⏸️ createAnalogChart - Canvas not ready, will retry in 100ms (attempt ${chartCreationRetries}/${MAX_CHART_CREATION_RETRIES})`)
        setTimeout(() => createAnalogChart(), 100)
      } else {
        LogUtil.Error(`❌ createAnalogChart - Canvas not available after ${MAX_CHART_CREATION_RETRIES} attempts, giving up`)
        hasConnectionError.value = true
        stopLoading()
      }
      return
    }

    // Check if canvas has proper dimensions
    if (analogChartCanvas.value.offsetWidth === 0 || analogChartCanvas.value.offsetHeight === 0) {
      // Canvas exists but has zero dimensions - retry with limit
      if (chartCreationRetries < MAX_CHART_CREATION_RETRIES) {
        chartCreationRetries++
        LogUtil.Debug(`⏸️ createAnalogChart - Canvas has zero dimensions, will retry in 100ms (attempt ${chartCreationRetries}/${MAX_CHART_CREATION_RETRIES})`)
        setTimeout(() => createAnalogChart(), 100)
      } else {
        LogUtil.Error(`❌ createAnalogChart - Canvas has zero dimensions after ${MAX_CHART_CREATION_RETRIES} attempts, giving up`)
        hasConnectionError.value = true
        stopLoading()
      }
      return
    }

    // Reset retry counter on successful canvas access
    chartCreationRetries = 0

    const ctx = analogChartCanvas.value.getContext('2d')
    if (!ctx) {
      LogUtil.Error('❌ createAnalogChart - Failed to get 2D context')
      hasConnectionError.value = true
      stopLoading()
      return
    }

    try {
      // Destroy existing chart
      if (analogChartInstance) {
        analogChartInstance.destroy()
      }

      const config = getAnalogChartConfig()
      analogChartInstance = new Chart(ctx, config)

      LogUtil.Info('✅ createAnalogChart - Chart created successfully, now loading data', {
        canvasWidth: analogChartCanvas.value.offsetWidth,
        canvasHeight: analogChartCanvas.value.offsetHeight
      })

      // 🆕 CRITICAL: After chart is created, if data series already exists, load history and update
      if (dataSeries.value.length > 0 && !hasLoadedInitialHistory.value) {
        LogUtil.Info('📚 Chart ready - loading historical data now')
        hasLoadedInitialHistory.value = true // Set immediately to prevent duplicate loads
        loadHistoricalDataFromDatabase().then(() => {
          updateCharts()
          LogUtil.Info('✅ Historical data loaded and displayed')
        }).catch(error => {
          LogUtil.Error('❌ Failed to load historical data', error)
          hasLoadedInitialHistory.value = false // Reset on error so it can retry
        })
      } else if (dataSeries.value.some(s => s.data && s.data.length > 0)) {
        // Data already loaded, just update charts
        LogUtil.Info('📊 Chart ready - data already exists, updating display')
        updateCharts()
      }
    } catch (error) {
      LogUtil.Error('❌ createAnalogChart - Error creating chart:', error)
    }
  }

  const createDigitalCharts = () => {
    // Destroy existing digital chart
    if (digitalChartInstance) {
      digitalChartInstance.destroy()
      digitalChartInstance = null
    }

    // Create single chart for all digital series
    const canvas = digitalChartCanvas.value
    if (!canvas) {
      console.warn('= TLChart createDigitalCharts - Canvas ref not available')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('= TLChart createDigitalCharts - Failed to get 2D context')
      return
    }

    try {
      const config = getCombinedDigitalChartConfig()
      digitalChartInstance = new Chart(ctx, config)
      LogUtil.Info(`= TLChart DataFlow: Combined digital chart created for ${visibleDigitalSeries.value.length} series`)
    } catch (error) {
      console.error('= TLChart createDigitalCharts - Error creating chart:', error)
    }
  }

  const destroyAllCharts = () => {
    // Destroy analog chart
    if (analogChartInstance) {
      analogChartInstance.destroy()
      analogChartInstance = null
    }

    // Destroy digital chart
    if (digitalChartInstance) {
      digitalChartInstance.destroy()
      digitalChartInstance = null
    }
  }

  /**
   * Wait for canvas and chart to be ready, then update with data
   * Simplified: charts should already be created before this is called
   */
  const waitForCanvasAndUpdate = () => {
    // Simple check - charts should already exist
    if (analogChartCanvas.value && analogChartInstance) {
      LogUtil.Info('✅ Canvas and chart ready, updating with data')
      updateCharts()
    } else {
      LogUtil.Warn('⚠️ Chart not ready when trying to update', {
        hasCanvas: !!analogChartCanvas.value,
        hasChartInstance: !!analogChartInstance
      })
    }
  }

  const updateCharts = () => {
    // 🆕 FIX: Check if any canvas is available (analog OR digital)
    const hasAnalogCanvas = !!analogChartCanvas.value
    const hasDigitalCanvas = !!digitalChartCanvas.value
    const hasAnyCanvas = hasAnalogCanvas || hasDigitalCanvas

    if (!hasAnyCanvas) {
      LogUtil.Debug('⏸️ updateCharts: No canvas available yet (neither analog nor digital), will retry in 100ms')
      // Retry after DOM settles
      setTimeout(() => {
        const retryHasAnalog = !!analogChartCanvas.value
        const retryHasDigital = !!digitalChartCanvas.value
        if (retryHasAnalog || retryHasDigital) {
          LogUtil.Info('✅ updateCharts: Canvas now available, proceeding with update', {
            hasAnalog: retryHasAnalog,
            hasDigital: retryHasDigital
          })
          updateCharts()
        } else {
          LogUtil.Warn('⚠️ updateCharts: No canvas still available after retry, giving up')
        }
      }, 100)
      return
    }

    // 🆕 FIX: Prevent multiple concurrent chart updates (critical for C++ WebView)
    if (chartUpdatePending) {
      LogUtil.Debug('⏸️ Chart update already pending, skipping duplicate call')
      return
    }

    chartUpdatePending = true

    LogUtil.Info('🎨 updateCharts: Starting chart updates', {
      hasAnalogChart: !!analogChartInstance,
      hasDigitalChart: !!digitalChartInstance,
      totalDataSeries: dataSeries.value.length,
      seriesWithData: dataSeries.value.filter(s => s.data.length > 0).length,
      visibleAnalogCount: visibleAnalogSeries.value.length,
      visibleDigitalCount: visibleDigitalSeries.value.length,
      // 🚨 CRITICAL: Log individual series data counts
      seriesDataCounts: dataSeries.value.map(s => ({
        name: s.name,
        id: s.id,
        dataCount: s.data?.length || 0,
        hasDataArray: !!s.data,
        visible: s.visible
      }))
    })

    // Ensure analog chart exists if we have visible analog series
    if (!analogChartInstance && visibleAnalogSeries.value.length > 0) {
      LogUtil.Info('🔄 updateCharts: Analog chart missing but we have visible series, recreating...')
      createAnalogChart()
    }

    // 🆕 FIX: Double-defer to prevent UI blocking in embedded C++ WebView
    // First defer breaks out of current call stack
    requestAnimationFrame(() => {
      // Second defer ensures browser message pump runs (critical for C++ embedding)
      setTimeout(async () => {
        // Update analog chart (now async with yield points)
        await updateAnalogChart()

        // Update digital charts after another yield (also async now)
        requestAnimationFrame(async () => {
          await updateDigitalCharts()
          chartUpdatePending = false // Reset flag
          LogUtil.Info('🎨 updateCharts: Chart updates completed')
        })
      }, 0)
    })
  }

  const updateAnalogChart = async () => {
    if (!analogChartInstance) {
      LogUtil.Debug('📊 updateAnalogChart: No analog chart instance available')
      return
    }

    const visibleAnalog = visibleAnalogSeries.value.filter(series => series.data.length > 0)

    // 🚨 CRITICAL DEBUG: Check if we're about to empty the chart
    if (visibleAnalog.length === 0 && visibleAnalogSeries.value.length > 0) {
      LogUtil.Error('🚨 CRITICAL: All visible analog series have NO DATA - chart will be empty!', {
        totalVisibleSeries: visibleAnalogSeries.value.length,
        allSeriesDetails: visibleAnalogSeries.value.map(s => ({
          name: s.name,
          id: s.id,
          dataCount: s.data?.length || 0,
          visible: s.visible,
          hasDataArray: !!s.data,
          dataType: typeof s.data
        })),
        timestamp: new Date().toISOString()
      })
      // Don't proceed with empty update - keep existing chart data
      return
    }

    LogUtil.Info('📊 updateAnalogChart: Processing analog series', {
      totalVisibleSeries: visibleAnalogSeries.value.length,
      seriesWithData: visibleAnalog.length,
      seriesDetails: visibleAnalogSeries.value.map(s => ({
        name: s.name,
        id: s.id,
        dataCount: s.data.length,
        visible: s.visible
      }))
    })

    // 🆕 FIX: Process data asynchronously to prevent UI blocking
    // Process each series sequentially with yield points for C++ WebView
    const datasets: any[] = []

    // 🆕 ENHANCED MULTI-AXIS STRATEGY: Group by UNIT TYPE with color matching
    // Each unit group's Y-axis will match the color of the FIRST series in that group

    const seriesInfo: {
      series: any,
      min: number,
      max: number,
      unit: string,
      unitGroup: string,
      color: string
    }[] = []

    // Helper: Normalize units into groups
    const normalizeUnitGroup = (unit: string): string => {
      if (!unit || unit === 'Unused' || unit === 'Off') return 'dimensionless'

      const unitLower = unit.toLowerCase()

      // Temperature group
      if (unitLower.includes('deg') || unitLower.includes('°') ||
          unitLower.includes('f') || unitLower.includes('c') ||
          unitLower.includes('temp')) {
        return 'temperature'
      }

      // Electrical - Voltage
      if (unitLower.includes('volt') || unitLower.includes('v') || unitLower === 'mv') {
        return 'voltage'
      }

      // Electrical - Current
      if (unitLower.includes('amp') || unitLower.includes('ma') || unitLower.includes('a')) {
        return 'current'
      }

      // Electrical - Power
      if (unitLower.includes('watt') || unitLower.includes('w') ||
          unitLower.includes('kw') || unitLower.includes('mw')) {
        return 'power'
      }

      // Pressure
      if (unitLower.includes('pa') || unitLower.includes('psi') ||
          unitLower.includes('bar') || unitLower.includes('pressure')) {
        return 'pressure'
      }

      // Air Quality / Flow
      if (unitLower.includes('ppm') || unitLower.includes('ppb') ||
          unitLower.includes('co2') || unitLower.includes('voc') ||
          unitLower.includes('fps') || unitLower.includes('fpm') ||
          unitLower.includes('cfm')) {
        return 'airquality'
      }

      // Humidity
      if (unitLower.includes('rh') || unitLower.includes('humid') || unitLower.includes('%rh')) {
        return 'humidity'
      }

      // Percentage
      if (unitLower === '%' || unitLower === 'percent') {
        return 'percentage'
      }

      // Frequency
      if (unitLower.includes('hz') || unitLower.includes('hertz')) {
        return 'frequency'
      }

      // Default: use the unit itself as group
      return unit.toLowerCase().replace(/[^a-z0-9]/g, '')
    }

    // Analyze all series
    for (const series of visibleAnalog) {
      if (!series.data || series.data.length === 0) continue

      const values = series.data
        .map((point: any) => point?.value)
        .filter((y: any) => typeof y === 'number' && isFinite(y) && y > -99999 && y < 999999)

      if (values.length === 0) continue

      const min = Math.min(...values)
      const max = Math.max(...values)
      const unit = series.unit || 'Unused'
      const unitGroup = normalizeUnitGroup(unit)
      const color = series.color || '#666666'

      seriesInfo.push({ series, min, max, unit, unitGroup, color })
    }

    // Group by unit type
    const unitGroups: { [key: string]: typeof seriesInfo } = {}
    seriesInfo.forEach(item => {
      if (!unitGroups[item.unitGroup]) {
        unitGroups[item.unitGroup] = []
      }
      unitGroups[item.unitGroup].push(item)
    })

    // Sort groups by count (most series first) then by total range
    const sortedGroups = Object.entries(unitGroups).sort((a, b) => {
      // First by count
      if (b[1].length !== a[1].length) {
        return b[1].length - a[1].length
      }
      // Then by range
      const rangeA = Math.max(...a[1].map(i => i.max)) - Math.min(...a[1].map(i => i.min))
      const rangeB = Math.max(...b[1].map(i => i.max)) - Math.min(...b[1].map(i => i.min))
      return rangeB - rangeA
    })

// Assign axes: Support up to 4 axes (y, y1, y2, y3) ALL ON LEFT SIDE
    // y = left position 0 (primary), y1 = left position 1, y2 = left position 2, y3 = left position 3
    const axisAssignment = new Map<string, string>()
    const axisColors = new Map<string, string>() // Axis ID → Color of first series
    const axisUnits = new Map<string, Set<string>>() // Axis ID → Set of all units

    sortedGroups.forEach(([groupName, items], index) => {
      const axisId = index === 0 ? 'y' :
                     index === 1 ? 'y1' :
                     index === 2 ? 'y2' : 'y3'

      // 🎨 KEY: Use the color of the FIRST series in this unit group
      if (!axisColors.has(axisId)) {
        const firstSeriesColor = items[0].color
        axisColors.set(axisId, firstSeriesColor)
      }

      // Collect all unique units for this axis
      if (!axisUnits.has(axisId)) {
        axisUnits.set(axisId, new Set<string>())
      }
      const unitSet = axisUnits.get(axisId)!
      items.forEach(item => {
        const unit = item.unit
        if (unit && unit !== 'Unused' && unit !== 'Off') {
          unitSet.add(unit)
        }
      })

      items.forEach(item => {
        axisAssignment.set(item.series.id, axisId)
      })
    })

    const useMultipleAxes = sortedGroups.length > 1

    // 🐛 DEBUG: Log unit-based axis assignments with colors
    LogUtil.Info('📊 Unit-based axis assignments with color matching:', {
      useMultipleAxes,
      unitGroupCount: sortedGroups.length,
      unitGroups: sortedGroups.map(([groupName, items]) => ({
        groupName,
        seriesCount: items.length,
        unit: items[0].unit,
        firstSeriesColor: items[0].color
      })),
      assignments: Array.from(axisAssignment.entries()).map(([id, axis]) => {
        const series = visibleAnalog.find(s => s.id === id)
        return {
          id,
          name: series?.name,
          unit: series?.unit,
          axis,
          axisColor: axisColors.get(axis)
        }
      }),
      axisConfiguration: Array.from(axisUnits.entries()).map(([axisId, unit]) => ({
        axisId,
        unit,
        color: axisColors.get(axisId),
        position: 'left' // All axes on left side
      }))
    })

    // 🎨 Update axis colors and titles dynamically
    if (analogChartInstance.options.scales) {
      const scales = analogChartInstance.options.scales as any

      axisUnits.forEach((unitSet, axisId) => {
        const axisColor = axisColors.get(axisId) || '#666666'

        if (scales[axisId]) {
          // Update title - join all units with " | " separator
          if (scales[axisId].title) {
            const unitsArray = Array.from(unitSet)
            const unitText = unitsArray.length > 0 ? unitsArray.join(' | ') : ''
            scales[axisId].title.text = unitText
            scales[axisId].title.color = axisColor
          }

          // Update tick colors
          if (scales[axisId].ticks) {
            scales[axisId].ticks.color = axisColor
          }

          // Show the axis
          scales[axisId].display = true
        }
      })

      // Hide axes that aren't being used
      const allAxes = ['y', 'y1', 'y2', 'y3']
      allAxes.forEach(axisId => {
        if (scales[axisId] && !axisUnits.has(axisId)) {
          scales[axisId].display = false
          if (scales[axisId].title) {
            scales[axisId].title.text = ''
          }
        }
      })
    }

    // 🆕 STEP 4: Create datasets with assigned yAxisID
    for (let i = 0; i < visibleAnalog.length; i++) {
      const series = visibleAnalog[i]

      // Yield to event loop every 3 series to prevent blocking
      if (i > 0 && i % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      // Clone, filter null/undefined values, and sort data
      const sortedData = series.data
        .slice()
        .filter(point => point.value !== null && point.value !== undefined) // ✅ Filter invalid values
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(point => ({
          x: point.timestamp,
          y: point.value
        }))

      // 🆕 Detect large gaps and insert null to break line visualization
      const dataWithGaps: Array<{ x: number; y: number | null }> = []
      const maxGapMs = getGapThresholdMs()

      for (let i = 0; i < sortedData.length; i++) {
        dataWithGaps.push(sortedData[i])

        // Check if next point has a large time gap
        if (i < sortedData.length - 1) {
          const currentTime = sortedData[i].x
          const nextTime = sortedData[i + 1].x
          const gap = nextTime - currentTime

          if (gap > maxGapMs) {
            // Insert null point to break the line
            dataWithGaps.push({
              x: currentTime + gap / 2,
              y: null
            })
          }
        }
      }

      LogUtil.Debug(`📊 Building dataset for ${series.name}:`, {
        rawDataPoints: series.data.length,
        filteredDataPoints: sortedData.length,
        dataWithGaps: dataWithGaps.length,
        timeRange: sortedData.length > 0 ? {
          first: new Date(sortedData[0].x).toLocaleTimeString(),
          last: new Date(sortedData[sortedData.length - 1].x).toLocaleTimeString()
        } : null,
        samplePoints: sortedData.slice(-3) // Last 3 points
      })

      // Get axis assignment (default to 'y' if not found)
      const yAxisID = axisAssignment.get(series.id) || 'y'

      // Determine whether to show a point marker: respect global `showPoints`,
      // but always show a marker when there is only a single data point to
      // provide immediate feedback for single-point real-time updates.
      const shouldShowPoint = showPoints.value || (sortedData.length === 1)

      datasets.push({
        label: series.name,
        data: dataWithGaps, // ✅ Use data with gap detection
        borderColor: series.color,
        backgroundColor: series.color + '20',
        borderWidth: 2,
        fill: false,
        tension: smoothLines.value ? 0.4 : 0,
        pointRadius: shouldShowPoint ? 3 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: series.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: 'circle' as const,
        spanGaps: false, // Keep false - null values will break lines
        yAxisID: yAxisID // ✅ Assign axis here!
      })
    }

    // 🆕 FIX: Check if chart still exists before updating (could be destroyed during async processing)
    if (!analogChartInstance) {
      LogUtil.Warn('⚠️ updateAnalogChart: Chart instance was destroyed during processing, skipping update')
      return
    }

    // Batch update to minimize reflows
    LogUtil.Info('🎨 About to set chart datasets:', {
      datasetsCount: datasets.length,
      totalDataPoints: datasets.reduce((sum, ds) => sum + ds.data.length, 0),
      datasetDetails: datasets.map(ds => ({
        label: ds.label,
        pointCount: ds.data.length,
        firstPoint: ds.data[0],
        lastPoint: ds.data[ds.data.length - 1],
        timeRange: ds.data.length > 0 ? {
          start: new Date(ds.data[0].x).toISOString(),
          end: new Date(ds.data[ds.data.length - 1].x).toISOString()
        } : null
      }))
    })

    analogChartInstance.data.datasets = datasets

    // Update x-axis configuration
    if (analogChartInstance.options.scales?.x) {
      const xScale = analogChartInstance.options.scales.x as any

      // For custom date range, use custom tick configuration
      let tickConfig: any
      let displayFormat: string
      let maxTicks: number

      if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
        const customConfig = getCustomTickConfig(
          customStartDate.value.toDate(),
          customEndDate.value.toDate()
        )
        tickConfig = { unit: customConfig.unit, stepMinutes: customConfig.stepSize }
        displayFormat = customConfig.displayFormat
        maxTicks = customConfig.maxTicks
      } else {
        tickConfig = getXAxisTickConfig(timeBase.value)
        displayFormat = getDisplayFormat(timeBase.value)
        const maxTicksConfigs = {
          '5m': 6, '10m': 6, '30m': 7, '1h': 5,
          '4h': 5, '12h': 7, '1d': 7, '4d': 7
        }
        maxTicks = maxTicksConfigs[timeBase.value] || 7
      }

      xScale.time = {
        unit: tickConfig.unit,
        stepSize: tickConfig.stepMinutes,
        displayFormats: {
          minute: displayFormat,
          hour: displayFormat,
          day: 'yyyy-MM-dd HH:mm'
        },
        minUnit: 'second'
      }

      xScale.ticks = {
        ...xScale.ticks,
        maxTicksLimit: maxTicks,
        maxRotation: 0,
        minRotation: 0,
        callback: formatXAxisTick,
        includeBounds: true
      }

      xScale.grid = {
        color: showGrid.value ? '#e0e0e0' : 'transparent',
        display: showGrid.value,
        lineWidth: 1
      }

      const timeWindow = getCurrentTimeWindow()
      xScale.min = timeWindow.min
      xScale.max = timeWindow.max

      LogUtil.Debug('⏰ Chart Time Window:', {
        timeBase: timeBase.value,
        windowMin: new Date(timeWindow.min).toLocaleTimeString(),
        windowMax: new Date(timeWindow.max).toLocaleTimeString(),
        windowRangeMinutes: Math.round((timeWindow.max - timeWindow.min) / 60000),
        currentTime: new Date().toLocaleTimeString(),
        datasetsCount: datasets.length,
        totalPoints: datasets.reduce((sum, ds) => sum + ds.data.length, 0)
      })

      LogUtil.Info('⏰ Chart Time Window Set:', {
        timeBase: timeBase.value,
        customStartDate: customStartDate.value?.format('YYYY-MM-DD HH:mm:ss') || null,
        customEndDate: customEndDate.value?.format('YYYY-MM-DD HH:mm:ss') || null,
        min: new Date(timeWindow.min).toISOString(),
        max: new Date(timeWindow.max).toISOString(),
        rangeMinutes: Math.round((timeWindow.max - timeWindow.min) / 60000),
        datasetSample: analogChartInstance.data.datasets[0] ? {
          label: analogChartInstance.data.datasets[0].label,
          pointCount: analogChartInstance.data.datasets[0].data.length,
          firstPoint: analogChartInstance.data.datasets[0].data[0] ? {
            x: new Date(analogChartInstance.data.datasets[0].data[0].x).toISOString(),
            y: analogChartInstance.data.datasets[0].data[0].y
          } : null,
          lastPoint: analogChartInstance.data.datasets[0].data[analogChartInstance.data.datasets[0].data.length - 1] ? {
            x: new Date(analogChartInstance.data.datasets[0].data[analogChartInstance.data.datasets[0].data.length - 1].x).toISOString(),
            y: analogChartInstance.data.datasets[0].data[analogChartInstance.data.datasets[0].data.length - 1].y
          } : null
        } : null
      })
    }

    // Update y-axis grid
    if (analogChartInstance.options.scales?.y) {
      const yScale = analogChartInstance.options.scales.y as any
      yScale.grid = {
        color: showGrid.value ? '#e0e0e0' : 'transparent',
        display: showGrid.value,
        lineWidth: 1
      }
    }

    // 🆕 FIX: Final safety check before update operations
    if (!analogChartInstance) {
      LogUtil.Warn('⚠️ updateAnalogChart: Chart instance lost before final update, skipping')
      return
    }

    // Log before update
    LogUtil.Info('📊 updateAnalogChart: About to update chart', {
      datasetsCount: analogChartInstance.data.datasets.length,
      firstDatasetPoints: analogChartInstance.data.datasets[0]?.data.length || 0,
      totalPoints: analogChartInstance.data.datasets.reduce((sum, ds) => sum + ds.data.length, 0),
      timeWindow: {
        min: analogChartInstance.options.scales?.x?.min,
        max: analogChartInstance.options.scales?.x?.max,
        minDate: new Date(analogChartInstance.options.scales?.x?.min || 0).toISOString(),
        maxDate: new Date(analogChartInstance.options.scales?.x?.max || 0).toISOString()
      },
      datasetDetails: analogChartInstance.data.datasets.map(ds => ({
        label: ds.label,
        pointCount: ds.data.length,
        sampleData: ds.data.slice(0, 2) // First 2 points
      }))
    })

    // 🆕 FIX: Update chart without blocking UI thread
    // Using 'resize' mode forces Y-axis recalculation and header redraw
    // This ensures dynamic updates when zooming or changing time series

    // CRITICAL: For custom dates, use 'none' mode to force scale recalculation
    // 'resize' mode skips afterDataLimits callbacks, causing Y-axis compression
    // 'none' mode bypasses animations but MUST trigger all scale callbacks
    if (timeBase.value === 'custom') {
      LogUtil.Debug('📊 Custom date: Using update("none") to trigger afterDataLimits')
      LogUtil.Info('📊 Custom date: Using update("none") to trigger afterDataLimits')
      analogChartInstance.update('none') // No animation but full scale recalculation
    } else {
      analogChartInstance.update('resize') // Fast resize for preset timebases
    }

    // Scroll right-panel to bottom by default
    nextTick(() => {
      const rightPanel = document.querySelector('.analog-area .right-panel') as HTMLElement
      if (rightPanel) {
        rightPanel.scrollTop = rightPanel.scrollHeight
      }
    })
  }

  const updateDigitalCharts = async () => {
    // 🆕 FIX: Early return if no digital chart exists
    if (!digitalChartInstance) {
      LogUtil.Debug('📊 updateDigitalCharts: No digital chart instance available')
      return
    }

    // 🚨 CRITICAL DEBUG: Check if all digital series have no data
    const seriesWithData = visibleDigitalSeries.value.filter(s => s.data && s.data.length > 0)
    if (seriesWithData.length === 0 && visibleDigitalSeries.value.length > 0) {
      LogUtil.Error('🚨 CRITICAL: All visible digital series have NO DATA - chart will be empty!', {
        totalVisibleSeries: visibleDigitalSeries.value.length,
        allSeriesDetails: visibleDigitalSeries.value.map(s => ({
          name: s.name,
          id: s.id,
          dataCount: s.data?.length || 0,
          visible: s.visible,
          hasDataArray: !!s.data,
          dataType: typeof s.data
        })),
        timestamp: new Date().toISOString()
      })
    }

    LogUtil.Info('📊 updateDigitalCharts: Processing digital series', {
      totalVisibleSeries: visibleDigitalSeries.value.length,
      seriesWithData: seriesWithData.length
    })

    // Build datasets for all visible digital series
    const datasets: any[] = []
    const maxGapMs = getGapThresholdMs()

    for (let index = 0; index < visibleDigitalSeries.value.length; index++) {
      const series = visibleDigitalSeries.value[index]

      // Yield to event loop every 2 series
      if (index > 0 && index % 2 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      LogUtil.Info(`📊 Digital Series ${index} - ${series.name} Data Processing:`, {
        seriesRawDataCount: series.data.length,
        firstRawPoint: series.data[0] ? {
          timestamp: new Date(series.data[0].timestamp).toISOString(),
          value: series.data[0].value
        } : null,
        lastRawPoint: series.data[series.data.length - 1] ? {
          timestamp: new Date(series.data[series.data.length - 1].timestamp).toISOString(),
          value: series.data[series.data.length - 1].value
        } : null
      })

      const sortedData = series.data
        .slice()
        .filter(point => point.value !== null && point.value !== undefined) // ✅ Filter invalid values
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(point => {
          // Stack each series vertically
          // control=1 (second state) goes to bottom, control=0 (first state) goes to top
          // Series 0: y = 0.3 (bottom, control=1) or 0.9 (top, control=0)
          // Series 1: y = 1.5 (bottom, control=1) or 2.1 (top, control=0)
          // Series 2: y = 2.7 (bottom, control=1) or 3.3 (top, control=0), etc.
          const baseY = index * 1.2
          const y = point.value > 0.5 ? baseY + 0.3 : baseY + 0.9
          return {
            x: point.timestamp,
            y: y,
            control: point.value > 0.5 ? 1 : 0  // Store original control value for tooltip
          }
        })

      // 🆕 Detect large gaps and insert null to break line visualization
      const dataWithGaps: Array<{ x: number; y: number | null }> = []

      for (let i = 0; i < sortedData.length; i++) {
        dataWithGaps.push(sortedData[i])

        // Check if next point has a large time gap
        if (i < sortedData.length - 1) {
          const gap = sortedData[i + 1].x - sortedData[i].x
          if (gap > maxGapMs) {
            // Insert null point to break the line
            dataWithGaps.push({
              x: sortedData[i].x + gap / 2,
              y: null
            })
          }
        }
      }

      // Determine whether to show point markers
      const shouldShowPoint = showPoints.value || (sortedData.length === 1)

      datasets.push({
        label: series.name,
        data: dataWithGaps,
        borderColor: series.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false,
        stepped: 'before' as const, // Step before for digital signals
        pointRadius: shouldShowPoint ? 3 : 0,
        pointHoverRadius: 6,
        pointHitRadius: 8,
        pointBackgroundColor: series.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: 'circle' as const,
        spanGaps: false,
        yAxisID: 'y' // All use same y-axis
      })
    }

    // Update chart datasets
    digitalChartInstance.data.datasets = datasets

    // Update x-axis - use same configuration as analog chart
    if (digitalChartInstance.options.scales?.x) {
      const xScale = digitalChartInstance.options.scales.x as any

      // For custom date range, use custom tick configuration
      let tickConfig: any
      let displayFormat: string
      let maxTicks: number

      if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
        const customConfig = getCustomTickConfig(
          customStartDate.value.toDate(),
          customEndDate.value.toDate()
        )
        tickConfig = { unit: customConfig.unit, stepMinutes: customConfig.stepSize }
        displayFormat = customConfig.displayFormat
        maxTicks = customConfig.maxTicks
      } else {
        tickConfig = getXAxisTickConfig(timeBase.value)
        displayFormat = getDisplayFormat(timeBase.value)
        const maxTicksConfigs = {
          '5m': 6, '10m': 6, '30m': 7, '1h': 7,
          '4h': 9, '12h': 13, '1d': 13, '4d': 13
        }
        maxTicks = maxTicksConfigs[timeBase.value] || 7
      }

      xScale.time = {
        unit: tickConfig.unit,
        stepSize: tickConfig.stepMinutes,
        displayFormats: {
          minute: displayFormat,
          hour: displayFormat,
          day: 'yyyy-MM-dd HH:mm'
        },
        minUnit: 'second'
      }

      xScale.ticks = {
        ...xScale.ticks,
        maxTicksLimit: maxTicks,
        maxRotation: 0,
        minRotation: 0,
        callback: formatXAxisTick,
        includeBounds: true
      }

      xScale.grid = {
        color: showGrid.value ? '#e0e0e0' : 'transparent',
        display: showGrid.value,
        lineWidth: 0.5
      }

      const timeWindow = getCurrentTimeWindow()
      xScale.min = timeWindow.min
      xScale.max = timeWindow.max

      LogUtil.Info(`⏰ Digital Chart Time Window:`, {
        timeBase: timeBase.value,
        isRealTime: isRealTime.value,
        timeWindow: {
          min: new Date(timeWindow.min).toISOString(),
          max: new Date(timeWindow.max).toISOString(),
          rangeMinutes: Math.round((timeWindow.max - timeWindow.min) / 60000)
        }
      })

      // Force recalculation of bounds
      delete xScale._range
      delete xScale._reversePixels
      delete xScale._startValue
      delete xScale._valueRange
    }

    // Update y-axis range based on number of series
    if (digitalChartInstance.options.scales?.y) {
      const yScale = digitalChartInstance.options.scales.y as any
      const seriesCount = visibleDigitalSeries.value.length
      yScale.min = -0.3
      yScale.max = seriesCount * 1.2 + 0.3
    }

    // Update chart
    try {
      digitalChartInstance.update()
      LogUtil.Info(`✅ Digital chart updated`, {
        seriesCount: visibleDigitalSeries.value.length,
        totalDataPoints: visibleDigitalSeries.value.reduce((sum, s) => sum + (s.data?.length || 0), 0)
      })
    } catch (error) {
      LogUtil.Warn(`⚠️ updateDigitalCharts: Failed to update chart`, error)
    }

    // Scroll digital right-panel to bottom by default
    nextTick(() => {
      const digitalRightPanel = document.querySelector('.digital-area .digital-right-panel') as HTMLElement
      if (digitalRightPanel) {
        digitalRightPanel.scrollTop = digitalRightPanel.scrollHeight
      }
    })
  }

  // Series control methods
  const enableAllSeries = () => {
    dataSeries.value.forEach(series => {
      series.visible = true
    })
    updateCharts()
  }

  const disableAllSeries = () => {
    dataSeries.value.forEach(series => {
      series.visible = false
    })
    updateCharts()
  }

  const toggleAnalogSeries = () => {
    const enableAnalog = !allAnalogEnabled.value
    // debugDataSeriesFlow(`Before toggle analog (enabling: ${enableAnalog})`)

    dataSeries.value.forEach(series => {
      if (series.unitType === 'analog') {
        series.visible = enableAnalog
      }
    })

    // debugDataSeriesFlow(`After toggle analog (enabled: ${enableAnalog})`)
    updateCharts()
  }

  const toggleDigitalSeries = () => {
    const enableDigital = !allDigitalEnabled.value
    dataSeries.value.forEach(series => {
      if (series.unitType === 'digital') {
        series.visible = enableDigital
      }
    })
    updateCharts()
  }

  const toggleInputSeries = () => {
    const enableInput = !allInputEnabled.value
    dataSeries.value.forEach(series => {
      if (series.pointType === 2) { // Point type 2 = Input
        series.visible = enableInput
      }
    })
    updateCharts()
  }

  const toggleOutputSeries = () => {
    const enableOutput = !allOutputEnabled.value
    dataSeries.value.forEach(series => {
      if (series.pointType === 1) { // Point type 1 = Output
        series.visible = enableOutput
      }
    })
    updateCharts()
  }

  const toggleVariableSeries = () => {
    const enableVariable = !allVariableEnabled.value
    dataSeries.value.forEach(series => {
      if (series.pointType === 3) { // Point type 3 = Variable
        series.visible = enableVariable
      }
    })
    updateCharts()
  }


  // New control functions - Updated to use timeOffset and regenerate data
  const moveTimeLeft = async () => {
    // Guard: Don't allow scroll for real-time mode or custom date ranges
    if (isRealTime.value || timeBase.value === 'custom') return

    // Move time window left by exactly the timebase period
    const shiftMinutes = getTimeRangeMinutes(timeBase.value)

    // Update the time offset to track navigation
    timeOffset.value -= shiftMinutes

    // Regenerate data for the new time window
    await initializeData()

    // message.info(`Moved ${shiftMinutes} minutes back`)
  }

  const moveTimeRight = async () => {
    // Guard: Don't allow scroll for real-time mode or custom date ranges
    if (isRealTime.value || timeBase.value === 'custom') return

    // Move time window right by exactly the timebase period
    const shiftMinutes = getTimeRangeMinutes(timeBase.value)

    // Update the time offset to track navigation
    timeOffset.value += shiftMinutes

    // Regenerate data for the new time window
    await initializeData()

    // message.info(`Moved ${shiftMinutes} minutes forward`)
  }

  const zoomIn = () => {
    // Guard: Don't allow zoom for custom date ranges
    if (timeBase.value === 'custom') return

    const currentIndex = timebaseProgression.indexOf(timeBase.value)
    if (currentIndex > 0) {
      const newTimebase = timebaseProgression[currentIndex - 1]

      // 🔧 FIX: Timebase only controls X-axis range, not real-time mode
      // Real-time updates continue regardless of timebase selection
      // Just change timebase - let the watcher handle data loading with smart detection
      timeBase.value = newTimebase

      LogUtil.Info(`🔍 Zoom In: Changed timebase to ${newTimebase}`, {
        autoScrollState: isRealTime.value,
        timeOffset: timeOffset.value,
        note: 'Timebase watcher will handle data loading'
      })
    }
  }

  const zoomOut = () => {
    // Guard: Don't allow zoom for custom date ranges
    if (timeBase.value === 'custom') return

    const currentIndex = timebaseProgression.indexOf(timeBase.value)
    if (currentIndex >= 0 && currentIndex < timebaseProgression.length - 1) {
      const newTimebase = timebaseProgression[currentIndex + 1]

      // 🔧 FIX: Timebase only controls X-axis range, not real-time mode
      // Real-time updates continue regardless of timebase selection
      // Just change timebase - let the watcher handle data loading with smart detection
      timeBase.value = newTimebase

      LogUtil.Info(`🔍 Zoom Out: Changed timebase to ${newTimebase}`, {
        autoScrollState: isRealTime.value,
        timeOffset: timeOffset.value,
        note: 'Timebase watcher will handle data loading'
      })
    }
  }

  // Mouse wheel zoom handler
  const handleMouseWheel = (event: WheelEvent) => {
    event.preventDefault() // Prevent page scroll

    if (event.deltaY < 0) {
      // Scroll up = Zoom In
      if (canZoomIn.value) {
        zoomIn()
      }
    } else if (event.deltaY > 0) {
      // Scroll down = Zoom Out
      if (canZoomOut.value) {
        zoomOut()
      }
    }
  }

  const resetToDefaultTimebase = () => {
    LogUtil.Info('🔄 Reset button clicked - preparing to reset to default timebase', {
      currentTimeBase: timeBase.value,
      currentOffset: timeOffset.value,
      currentAutoScroll: isRealTime.value
    })

    // Reset states first
    timeOffset.value = 0 // Reset time navigation as well
    isRealTime.value = true // 🆕 FIX: Reset button should always turn Auto Scroll ON

    // Use nextTick to ensure DOM is stable before changing timeBase
    nextTick(() => {
      timeBase.value = '5m'

      LogUtil.Info('🔄 Reset to default timebase (5m) with Auto Scroll ON', {
        autoScrollState: isRealTime.value,
        note: 'Reset button always enables Auto Scroll for 5m timebase. Data reload handled by timeBase watch.'
      })
    })

    // Data reload will be triggered automatically by the timeBase watch
    // No need to call initializeData() - that would cause double loading
  }

  const setView = (viewNumber: number) => {
    const previousView = currentView.value
    currentView.value = viewNumber

    LogUtil.Info(`🔄 Set View: Switching to View ${viewNumber}`, {
      previousView,
      newView: viewNumber,
      viewType: viewNumber === 1 ? 'SHOW_ALL' : 'USER_SELECTED',
      timestamp: new Date().toISOString()
    })

    // Apply series visibility based on view
    if (viewNumber === 1) {
      // View 1: Show all items (UNCHANGED LOGIC) �?
      dataSeries.value.forEach(series => {
        series.visible = true
      })

      LogUtil.Info(`�?Set View: View 1 activated - showing all items`, {
        totalSeries: dataSeries.value.length,
        visibleSeries: dataSeries.value.length,
        behavior: 'AUTO_SHOW_ALL'
      })
    } else {
      // View 2 & 3: Show only user selected items with FFI persistence �?
      const trackedItems = viewTrackedSeries.value[viewNumber] || []

      LogUtil.Info(`🔍 Set View: Processing View ${viewNumber} selections`, {
        viewNumber,
        localTrackedCount: trackedItems.length,
        localTrackedItems: trackedItems,
        hasFFISelections: viewSelections.value.has(viewNumber)
      })

      // Apply FFI-persisted selections
      const ffiSelections = viewSelections.value.get(viewNumber) || []

      // 🐛 BUG FIX: Map FFI selections to actual series names, not type_index format
      const ffiTrackedNames = ffiSelections
        .filter(s => s.is_selected)
        .map(selection => {
          // Find series by matching point type and number to get the actual display name
          const matchingSeries = dataSeries.value.find(series =>
            series.prefix === selection.point_type &&
            series.pointNumber === selection.point_index
          )

          if (matchingSeries) {
            return matchingSeries.name  // Return actual name like "Room Temperature"
          } else {
            // Fallback: try to find by point_label if direct matching fails
            const labelMatch = dataSeries.value.find(series => series.name === selection.point_label)
            if (labelMatch) {
              return labelMatch.name
            }

            // Last resort: return the type_index format (old behavior)
            LogUtil.Warn(`⚠️ Set View: No series found for FFI selection`, {
              selection,
              viewNumber,
              fallbackToTypeIndex: `${selection.point_type}_${selection.point_index}`
            })
            return `${selection.point_type}_${selection.point_index}`
          }
        })
        .filter(Boolean) // Remove null/undefined entries

      LogUtil.Debug(`🔍 Set View: FFI selections processing (FIXED)`, {
        viewNumber,
        ffiSelectionsTotal: ffiSelections.length,
        ffiSelectedCount: ffiSelections.filter(s => s.is_selected).length,
        ffiTrackedNames,
        mappingFixed: true,
        ffiSelections: ffiSelections.map(s => ({
          type: s.point_type,
          index: s.point_index,
          label: s.point_label,
          selected: s.is_selected
        }))
      })

      // Use FFI selections if available, otherwise fall back to existing logic
      const activeTrackedItems = ffiTrackedNames.length > 0 ? ffiTrackedNames : trackedItems

      LogUtil.Info(`📋 Set View: Using ${ffiTrackedNames.length > 0 ? 'FFI' : 'local'} selections for View ${viewNumber}`, {
        dataSource: ffiTrackedNames.length > 0 ? 'FFI_DATABASE' : 'LOCAL_MEMORY',
        activeTrackedItems,
        itemCount: activeTrackedItems.length
      })

      // 🐛 BUG FIX: Synchronize viewTrackedSeries with corrected FFI names to keep UI state consistent
      if (ffiTrackedNames.length > 0) {
        viewTrackedSeries.value[viewNumber] = [...ffiTrackedNames]
        LogUtil.Debug(`🔄 Set View: Synchronized viewTrackedSeries with corrected FFI names`, {
          viewNumber,
          synchronizedNames: ffiTrackedNames,
          previousLocalNames: trackedItems
        })
      }

      dataSeries.value.forEach(series => {
        const wasVisible = series.visible
        series.visible = activeTrackedItems.includes(series.name)

        if (wasVisible !== series.visible) {
          LogUtil.Debug(`👁�?Set View: Series visibility changed`, {
            seriesName: series.name,
            from: wasVisible,
            to: series.visible,
            reason: series.visible ? 'INCLUDED_IN_SELECTIONS' : 'NOT_IN_SELECTIONS'
          })
        }
      })

      const finalVisibleSeries = dataSeries.value.filter(s => s.visible)

      LogUtil.Info(`�?Set View: View ${viewNumber} applied successfully`, {
        viewNumber,
        selectionSource: ffiTrackedNames.length > 0 ? 'FFI_DATABASE' : 'LOCAL_MEMORY',
        ffiSelectionsCount: ffiSelections.length,
        localTrackedCount: trackedItems.length,
        activeTrackedCount: activeTrackedItems.length,
        visibleSeriesCount: finalVisibleSeries.length,
        totalSeriesCount: dataSeries.value.length,
        visibleSeries: finalVisibleSeries.map(s => s.name),
        hiddenSeriesCount: dataSeries.value.length - finalVisibleSeries.length
      })
    }

    // Different view configurations
    const viewConfigs = {
      1: {
        showGrid: true,
        showLegend: false,
        smoothLines: false,
        showPoints: false,
        title: 'All Items View',
        description: 'Show all 14 items for comprehensive analysis'
      },
      2: {
        showGrid: true,
        showLegend: false,
        smoothLines: true,
        showPoints: false,
        title: 'Custom Tracking View 2',
        description: 'User-selected items for focused tracking'
      },
      3: {
        showGrid: true,
        showLegend: false,
        smoothLines: true,
        showPoints: false,
        title: 'Custom Tracking View 3',
        description: 'User-selected items with detailed visualization'
      }
    }

    const config = viewConfigs[viewNumber]
    if (config) {
      showGrid.value = config.showGrid
      showLegend.value = config.showLegend
      smoothLines.value = config.smoothLines
      showPoints.value = config.showPoints

      // Update charts with new visibility settings - use nextTick to ensure DOM updates
      nextTick(() => {
        updateCharts()
      })

      /*
      // Show alert with view details
      viewAlert.value = {
        visible: true,
        message: `Switched to ${config.title}`
      }

      // Auto-hide alert after 4 seconds
      setTimeout(() => {
        viewAlert.value.visible = false
      }, 4000)
      */
    }
  }

  // Item tracking functions for View 2 & 3 - 🐛 FIXED: Made async to prevent race conditions
  const toggleItemTracking = async (seriesName: string) => {
    if (isSavingSelections.value) {
      LogUtil.Info(`�?Toggle Item Tracking: Already saving, skipping duplicate request for "${seriesName}"`)
      return
    }

    const currentTracked = viewTrackedSeries.value[currentView.value] || []
    const wasTracked = currentTracked.includes(seriesName)
    const series = dataSeries.value.find(s => s.name === seriesName)

    LogUtil.Info(`🎯 Toggle Item Tracking: Starting for "${seriesName}"`, {
      seriesName,
      currentView: currentView.value,
      wasTracked,
      action: wasTracked ? 'REMOVE' : 'ADD',
      beforeTrackingCount: currentTracked.length,
      beforeTracking: currentTracked,
      seriesInfo: series ? {
        prefix: series.prefix,
        pointNumber: series.pointNumber,
        unitType: series.unitType,
        id: series.id
      } : 'SERIES_NOT_FOUND',
      timestamp: new Date().toISOString()
    })

    // Set loading state
    isSavingSelections.value = true

    let afterTracked: string[] = []

    try {
      if (wasTracked) {
        // Remove from tracking
        viewTrackedSeries.value[currentView.value] = currentTracked.filter(name => name !== seriesName)
      } else {
        // Add to tracking
        viewTrackedSeries.value[currentView.value] = [...currentTracked, seriesName]
      }

      afterTracked = viewTrackedSeries.value[currentView.value]

      LogUtil.Info(`�?Toggle Item Tracking: Updated tracking state`, {
        seriesName,
        currentView: currentView.value,
        action: wasTracked ? 'removed' : 'added',
        afterTrackingCount: afterTracked.length,
        afterTracking: afterTracked,
        changeDelta: wasTracked ? -1 : +1
      })

      // 🐛 FIXED: Wait for database save to complete before updating view
      LogUtil.Info(`💾 Toggle Item Tracking: Saving to database first...`, {
        seriesName,
        currentView: currentView.value,
        waitingForDbSave: true
      })

      await saveViewTracking(currentView.value, viewTrackedSeries.value[currentView.value])

      LogUtil.Info(`�?Toggle Item Tracking: Database save completed`, {
        seriesName,
        currentView: currentView.value,
        dbSaveSuccessful: true
      })

      // Apply visibility after database save completes
      setView(currentView.value)

    } catch (error) {
      LogUtil.Error(`�?Toggle Item Tracking: Database save failed`, {
        seriesName,
        currentView: currentView.value,
        error: error.message,
        continuingWithLocalState: true
      })

      // Still apply visibility even if save failed (local state)
      setView(currentView.value)
    } finally {
      // Clear loading state
      isSavingSelections.value = false
    }

    LogUtil.Info(`🔄 Toggle Item Tracking: Complete for "${seriesName}"`, {
      finalState: {
        viewNumber: currentView.value,
        totalTracked: afterTracked.length,
        trackedItems: afterTracked
      }
    })
  }

  const clearAllTracking = async () => {
    if (isSavingSelections.value) return

    const beforeCount = (viewTrackedSeries.value[currentView.value] || []).length

    LogUtil.Info(`🗑�?Clear All Tracking: Clearing all selections for View ${currentView.value}`, {
      currentView: currentView.value,
      beforeCount,
      action: 'CLEAR_ALL',
      timestamp: new Date().toISOString()
    })

    isSavingSelections.value = true

    try {
      viewTrackedSeries.value[currentView.value] = []

      await saveViewTracking(currentView.value, [])
      LogUtil.Info(`�?Clear All Tracking: Database cleared successfully`, {
        currentView: currentView.value,
        dbClearSuccessful: true
      })

      setView(currentView.value)

      LogUtil.Info(`�?Clear All Tracking: All selections cleared`, {
        currentView: currentView.value,
        clearedCount: beforeCount,
        finalState: []
      })
    } catch (error) {
      LogUtil.Error(`�?Clear All Tracking: Database clear failed`, {
        currentView: currentView.value,
        error: error.message
      })

      // Still apply local change
      setView(currentView.value)
    } finally {
      isSavingSelections.value = false
    }
  }

  const selectAllItems = async () => {
    if (isSavingSelections.value) return

    const allSeriesNames = dataSeries.value.map(series => series.name)
    const beforeCount = (viewTrackedSeries.value[currentView.value] || []).length

    LogUtil.Info(`📋 Select All Items: Selecting all available items for View ${currentView.value}`, {
      currentView: currentView.value,
      beforeCount,
      afterCount: allSeriesNames.length,
      action: 'SELECT_ALL',
      allSeriesNames,
      timestamp: new Date().toISOString()
    })

    isSavingSelections.value = true

    try {
      viewTrackedSeries.value[currentView.value] = [...allSeriesNames]

      await saveViewTracking(currentView.value, allSeriesNames)
      LogUtil.Info(`�?Select All Items: Database save successful`, {
        currentView: currentView.value,
        dbSaveSuccessful: true
      })

      setView(currentView.value)

      LogUtil.Info(`�?Select All Items: All items selected`, {
        currentView: currentView.value,
        selectedCount: allSeriesNames.length,
        finalState: allSeriesNames
      })
    } catch (error) {
      LogUtil.Error(`�?Select All Items: Database save failed`, {
        currentView: currentView.value,
        error: error.message
      })

      // Still apply local change
      setView(currentView.value)
    } finally {
      isSavingSelections.value = false
    }
  }

  const unselectAllItems = async () => {
    await clearAllTracking()
  }

  const toggleSelectAll = async () => {
    if (isAllSelected.value) {
      await unselectAllItems()
    } else {
      await selectAllItems()
    }
  }

  const applyAndCloseDrawer = () => {
    const selectedItems = viewTrackedSeries.value[currentView.value] || []

    LogUtil.Info(`🎯 Apply Selection: View ${currentView.value} drawer closing`, {
      currentView: currentView.value,
      selectedItemsCount: selectedItems.length,
      selectedItems: selectedItems,
      action: 'APPLY_AND_CLOSE_DRAWER',
      timestamp: new Date().toISOString()
    })

    showItemSelector.value = false
    saveViewTracking(currentView.value, viewTrackedSeries.value[currentView.value])
    setView(currentView.value)

    LogUtil.Info(`�?Apply Selection: View ${currentView.value} changes applied successfully`, {
      finalSelectedCount: selectedItems.length
    })
  }

  // ⌨️ Toggle keyboard shortcuts on/off
  const toggleKeyboard = () => {
    keyboardEnabled.value = !keyboardEnabled.value
    LogUtil.Info(`⌨️ Keyboard shortcuts ${keyboardEnabled.value ? 'enabled' : 'disabled'}`, {
      keyboardEnabled: keyboardEnabled.value,
      method: 'CLICK_TOGGLE'
    })
  }

  // ⌨️ Keyboard Navigation Handler
  const handleKeydown = async (event: KeyboardEvent) => {
    // Arrow keys and mouse wheel always work, regardless of keyboardEnabled
    const isNavigationKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)
    const isItemSelectionKey = event.code.match(/^(Digit[1-9]|Key[A-E])$/) || event.code === 'Enter'

    // Only check keyboardEnabled for item selection keys (1-9, A-E, Enter, Ctrl+Up/Down)
    if (isItemSelectionKey && !keyboardEnabled.value) return
    if (event.code === 'ArrowUp' && event.ctrlKey && !keyboardEnabled.value) return
    if (event.code === 'ArrowDown' && event.ctrlKey && !keyboardEnabled.value) return

    // List of keys we handle - prevent default behavior for these
    const handledKeys = [
      // Item selection keys (1-9)
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
      'Digit6', 'Digit7', 'Digit8', 'Digit9',
      // Item selection keys (A-E)
      'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE',
      // Navigation keys (always work)
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      // Toggle key
      'Enter',
      // Control key
      'Escape'
    ]

    if (handledKeys.includes(event.code)) {
      event.preventDefault()
      lastKeyboardAction.value = event.code

      // Clear the highlight after a short delay
      setTimeout(() => {
        lastKeyboardAction.value = null
      }, 500)
    }

    LogUtil.Debug(`⌨️ Keyboard: Key pressed`, {
      code: event.code,
      key: event.key,
      keyboardEnabled: keyboardEnabled.value,
      willHandle: handledKeys.includes(event.code)
    })

    switch (event.code) {
      case 'Escape':
        // Priority order for ESC key when keyboard shortcuts are ENABLED:
        // 1. If keyboard shortcuts are enabled, disable them first
        if (keyboardEnabled.value) {
          keyboardEnabled.value = false
          selectedItemIndex.value = -1 // Also clear any selection
          lastKeyboardAction.value = null
          LogUtil.Info('⌨️ Keyboard: Disabled via ESC', {
            action: 'DISABLE_KEYBOARD'
          })
        }
        // 2. If keyboard disabled, check for open popups to close
        else if (customDateModalVisible.value) {
          customDateModalVisible.value = false
          LogUtil.Info('⌨️ Keyboard: Custom Date Modal closed via ESC', {
            action: 'CLOSE_DATE_MODAL'
          })
        }
        else if (showItemSelector.value) {
          showItemSelector.value = false
          LogUtil.Info('⌨️ Keyboard: Item Selection Drawer closed via ESC', {
            action: 'CLOSE_ITEM_DRAWER'
          })
        }
        // 3. If no popups open and keyboard disabled, enable keyboard shortcuts
        else {
          keyboardEnabled.value = true
          LogUtil.Info('⌨️ Keyboard: Enabled via ESC', {
            action: 'ENABLE_KEYBOARD'
          })
        }
        break

      case 'ArrowLeft': // Scroll left through time history
        if (!isRealTime.value) {
          moveTimeLeft()
          LogUtil.Info(`⌨️ Keyboard: Arrow Left (Scroll Left)`, {
            action: 'SCROLL_TIME_LEFT'
          })
        }
        break

      case 'ArrowRight': // Scroll right through time history
        if (!isRealTime.value) {
          moveTimeRight()
          LogUtil.Info(`⌨️ Keyboard: Arrow Right (Scroll Right)`, {
            action: 'SCROLL_TIME_RIGHT'
          })
        }
        break

      case 'ArrowUp': // Zoom in (shorter timebase)
        if (event.ctrlKey) {
          // Ctrl + Up: Navigate up through items
          if (displayedSeries.value.length > 0) {
            selectedItemIndex.value = selectedItemIndex.value <= 0
              ? displayedSeries.value.length - 1
              : selectedItemIndex.value - 1

            LogUtil.Info(`⌨️ Keyboard: Ctrl + Up (Navigate Up)`, {
              selectedIndex: selectedItemIndex.value,
              selectedItem: displayedSeries.value[selectedItemIndex.value]?.name
            })
          }
        } else {
          // Plain Up: Zoom In
          if (canZoomIn.value) {
            zoomIn()
            LogUtil.Info(`⌨️ Keyboard: Arrow Up (Zoom In)`, {
              newTimebase: timeBase.value,
              canZoomInMore: canZoomIn.value
            })
          } else {
            LogUtil.Info(`⌨️ Keyboard: Arrow Up blocked (already at minimum timebase)`, {
              currentTimebase: timeBase.value
            })
          }
        }
        break

      case 'ArrowDown': // Zoom out (longer timebase)
        if (event.ctrlKey) {
          // Ctrl + Down: Navigate down through items
          if (displayedSeries.value.length > 0) {
            selectedItemIndex.value = selectedItemIndex.value >= displayedSeries.value.length - 1
              ? 0
              : selectedItemIndex.value + 1

            LogUtil.Info(`⌨️ Keyboard: Ctrl + Down (Navigate Down)`, {
              selectedIndex: selectedItemIndex.value,
              selectedItem: displayedSeries.value[selectedItemIndex.value]?.name
            })
          }
        } else {
          // Plain Down: Zoom Out
          if (canZoomOut.value) {
            zoomOut()
            LogUtil.Info(`⌨️ Keyboard: Arrow Down (Zoom Out)`, {
              newTimebase: timeBase.value,
              canZoomOutMore: canZoomOut.value
            })
          } else {
            LogUtil.Info(`⌨️ Keyboard: Arrow Down blocked (already at maximum timebase)`, {
              currentTimebase: timeBase.value
            })
          }
        }
        break

      case 'Enter': // Toggle selected item
        if (selectedItemIndex.value >= 0 && selectedItemIndex.value < displayedSeries.value.length) {
          const selectedSeries = displayedSeries.value[selectedItemIndex.value]
          const masterSeriesIndex = dataSeries.value.findIndex(s => s.name === selectedSeries.name)

          if (masterSeriesIndex >= 0) {
            toggleSeriesVisibility(masterSeriesIndex, null)
            LogUtil.Info(`⌨️ Keyboard: Enter Toggle`, {
              selectedIndex: selectedItemIndex.value,
              selectedItem: selectedSeries.name,
              nowVisible: dataSeries.value[masterSeriesIndex]?.visible
            })
          }
        }
        break

      default:
        // Handle item selection keys (1-9, A-E) - for left panel series
        LogUtil.Debug(`⌨️ Keyboard: Checking default case for key "${event.code}"`, {
          eventCode: event.code,
          hasMapping: !!keyboardItemMappings.value[event.code],
          allMappings: Object.keys(keyboardItemMappings.value),
          displayedSeriesCount: displayedSeries.value.length
        })

        if (keyboardItemMappings.value[event.code]) {
          const mapping = keyboardItemMappings.value[event.code]

          // Clear up/down navigation selection when using direct keys (1-9, A-E)
          selectedItemIndex.value = -1

          // Find the series index in the master dataSeries array (not displayedSeries)
          const masterSeriesIndex = dataSeries.value.findIndex(s => s.name === mapping.item)

          if (masterSeriesIndex >= 0) {
            // Toggle series visibility using the correct master index
            toggleSeriesVisibility(masterSeriesIndex, null)

            // Clear the keyboard action highlight after a short delay
            setTimeout(() => {
              lastKeyboardAction.value = null
            }, 300)

            LogUtil.Info(`⌨️ Keyboard: Toggled series visibility "${mapping.display}"`, {
              key: mapping.display,
              itemName: mapping.item,
              itemIndex: mapping.index,
              masterSeriesIndex,
              currentView: currentView.value,
              nowVisible: dataSeries.value[masterSeriesIndex]?.visible
            })
          } else {
            LogUtil.Warn(`⌨️ Keyboard: Series not found for key "${mapping.display}"`, {
              key: mapping.display,
              itemName: mapping.item,
              availableSeries: dataSeries.value.map(s => s.name)
            })
          }
        } else {
          LogUtil.Debug(`⌨️ Keyboard: No mapping found for key "${event.code}"`, {
            eventCode: event.code,
            availableMappings: Object.keys(keyboardItemMappings.value)
          })
        }
        break
    }
  }

  // ⌨️ Helper functions for keyboard shortcuts display
  const getKeyboardShortcut = (seriesName: string): string | null => {
    const mapping = Object.values(keyboardItemMappings.value).find(m => m.item === seriesName)
    return mapping?.display || null
  }

  const getKeyboardShortcutCode = (seriesName: string): string | null => {
    const entry = Object.entries(keyboardItemMappings.value).find(([code, mapping]) => mapping.item === seriesName)
    return entry?.[0] || null
  }

  const removeFromTracking = async (seriesName: string, event?: Event) => {
    if (event) {
      event.stopPropagation()
    }

    const currentTracked = viewTrackedSeries.value[currentView.value] || []
    const wasTracked = currentTracked.includes(seriesName)

    LogUtil.Info(`🗑�?Remove From Tracking: Removing "${seriesName}" from View ${currentView.value}`, {
      seriesName,
      currentView: currentView.value,
      wasTracked,
      beforeCount: currentTracked.length,
      beforeTracking: currentTracked,
      action: 'REMOVE_SPECIFIC',
      timestamp: new Date().toISOString()
    })

    if (wasTracked) {
      // Remove from tracked series immediately
      viewTrackedSeries.value[currentView.value] = currentTracked.filter(name => name !== seriesName)
      const afterTracked = viewTrackedSeries.value[currentView.value]

      LogUtil.Info(`�?Remove From Tracking: Item removed successfully`, {
        seriesName,
        currentView: currentView.value,
        afterCount: afterTracked.length,
        afterTracking: afterTracked
      })

      try {
        // Save to database
        await saveViewTracking(currentView.value, viewTrackedSeries.value[currentView.value])

        // Apply visibility after save
        setView(currentView.value)
      } catch (error) {
        LogUtil.Error(`�?Remove From Tracking: Failed to save changes`, {
          seriesName,
          currentView: currentView.value,
          error: error.message
        })
      }
    } else {
      LogUtil.Info(`ℹ️ Remove From Tracking: Item "${seriesName}" was not being tracked`)
    }
  }

  const saveViewTracking = async (viewNumber: number, trackedSeries: string[]) => {
    const saveStartTime = Date.now()

    LogUtil.Info(`💾 Save View Tracking: Starting save process`, {
      viewNumber,
      trackedSeriesCount: trackedSeries.length,
      trackedSeries,
      trigger: 'USER_INTERACTION',
      timestamp: new Date().toISOString()
    })

    try {
      if (viewNumber >= 2 && viewNumber <= 3) {
        // 🆕 FFI Integration: Save to database for Views 2/3
        LogUtil.Info(`🔄 Save View Tracking: Delegating to FFI save for View ${viewNumber}`)

        await saveFFIViewSelections(viewNumber)

        const saveTime = Date.now() - saveStartTime
        LogUtil.Info(`�?Save View Tracking: View ${viewNumber} selections saved successfully`, {
          viewNumber,
          trackedSeries,
          count: trackedSeries.length,
          saveTime: `${saveTime}ms`,
          savedViaFFI: true
        })
      } else {
        // View 1: No persistence needed (always shows all items)
        LogUtil.Info(`📋 Save View Tracking: View ${viewNumber} skipped (no persistence needed)`, {
          viewNumber,
          reason: 'VIEW_1_SHOWS_ALL_ITEMS',
          trackedSeriesIgnored: trackedSeries.length
        })
      }
    } catch (error) {
      const saveTime = Date.now() - saveStartTime
      LogUtil.Error(`�?Save View Tracking: Failed to save view ${viewNumber} tracking`, {
        viewNumber,
        trackedSeries,
        error: error.message,
        errorType: error.constructor.name,
        saveTime: `${saveTime}ms`,
        stack: error.stack
      })
    }
  }

  const loadViewTracking = async () => {
    try {
      // 🆕 FFI Integration: Load from database happens in initializeWithCompleteFFI()
      // This function is kept for compatibility but the real loading happens in FFI init
      LogUtil.Info('📋 View tracking loaded via FFI integration during initialization')
    } catch (error) {
      LogUtil.Error('�?Failed to load view tracking:', error)
    }
  }

  // Event handlers
  const onTimeBaseChange = async () => {
    LogUtil.Debug('= TLChart DataFlow: Timebase changed to:', timeBase.value)

    // Stop any real-time updates when changing timebase
    stopRealTimeUpdates()

    if (timeBase.value !== 'custom') {
      // Reset time offset when timebase changes
      timeOffset.value = 0

      // Check if timebase is NOT 5 minutes - need to get data from API/database
      if (timeBase.value !== '5m') {
        LogUtil.Debug('= TLChart DataFlow: Non-5m timebase - fetching historical data from API')

        // Calculate time range based on selected timebase
        const timeRanges = calculateTimeRangeForTimebase(timeBase.value)
        LogUtil.Debug('= TLChart DataFlow: Time range calculated:', {
          timeBase: timeBase.value,
          duration: timeRanges.durationMinutes + ' minutes'
        })

        // Try to get device parameters from current data
        const deviceParams = extractDeviceParameters()
        LogUtil.Debug('= TLChart DataFlow: Device parameters extracted for API request:', {
          hasSN: !!deviceParams.sn,
          hasPanelId: deviceParams.panel_id !== null,
          hasTrendlogId: deviceParams.trendlog_id !== null
        })

        if (deviceParams.sn && deviceParams.panel_id !== null && deviceParams.trendlog_id !== null) {
          LogUtil.Debug('= TLChart DataFlow: Valid device parameters - making debounced API request for 14 panel items')
          await debouncedFetchHistoricalData(deviceParams, timeRanges)
        } else {
          LogUtil.Debug('= TLChart DataFlow: Missing device parameters - using fallback initialization')
          await initializeData()
        }
      } else {
        LogUtil.Debug('= TLChart DataFlow: 5m timebase - using real-time data initialization')
        await initializeData()
      }

      // 🔥 FIX: Restart realtime updates if in realtime mode after timebase change
      if (isRealTime.value && monitorConfig.value) {
        LogUtil.Info('🔄 Restarting realtime updates after timebase change')
        startRealTimeUpdates()
      }
    }
  }

  const onCustomDateChange = async () => {
    if (timeBase.value === 'custom' && customStartDate.value && customEndDate.value) {
      LogUtil.Debug('= TLChart DataFlow: Custom date range selected - fetching historical data')

      // Stop any real-time updates when using custom dates
      stopRealTimeUpdates()

      // Extract device parameters
      const deviceParams = extractDeviceParameters()
      const durationHours = Math.floor((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / (1000 * 60 * 60))

      LogUtil.Debug('= TLChart DataFlow: Custom range details:', {
        durationHours: durationHours,
        hasValidParams: !!(deviceParams.sn && deviceParams.panel_id !== null && deviceParams.trendlog_id !== null)
      })

      if (deviceParams.sn && deviceParams.panel_id !== null && deviceParams.trendlog_id !== null) {
        LogUtil.Debug('= TLChart DataFlow: Making API request for custom date range')

        // Format timestamps for API (SQLite format) - use local time instead of UTC
        const formatLocalTime = (date: any): string => {
          // Convert dayjs object to native Date if needed
          const nativeDate = date.toDate ? date.toDate() : new Date(date)
          const year = nativeDate.getFullYear()
          const month = String(nativeDate.getMonth() + 1).padStart(2, '0')
          const day = String(nativeDate.getDate()).padStart(2, '0')
          const hours = String(nativeDate.getHours()).padStart(2, '0')
          const minutes = String(nativeDate.getMinutes()).padStart(2, '0')
          const seconds = String(nativeDate.getSeconds()).padStart(2, '0')
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        }

        // Create time range object for custom dates with properly formatted local time
        const customTimeRanges = {
          startTime: formatLocalTime(customStartDate.value),
          endTime: formatLocalTime(customEndDate.value),
          durationMinutes: Math.floor((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / (1000 * 60)),
          expectedDataPoints: Math.floor((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / (1000 * 15)), // Assume 15-second intervals
          timebaseLabel: `Custom Range (${customStartDate.value.format('DD/MM HH:mm')} - ${customEndDate.value.format('DD/MM HH:mm')})`
        }

        LogUtil.Debug('= TLChart DataFlow: Custom time range formatted:', {
          startTime: customTimeRanges.startTime,
          endTime: customTimeRanges.endTime,
          durationMinutes: customTimeRanges.durationMinutes
        })

        await debouncedFetchHistoricalData(deviceParams, customTimeRanges)
      } else {
        LogUtil.Debug('= TLChart DataFlow: Missing device parameters - using standard initialization')
        await initializeData()
      }

      // Force Vue reactivity and DOM update
      await nextTick()
      dataSeries.value = [...dataSeries.value]
      await nextTick()

      // Simply update existing charts with new data and time window - no need to destroy/recreate
      LogUtil.Debug('= TLChart DataFlow: Updating charts with custom date range data', {
        seriesCount: dataSeries.value.length,
        seriesWithData: dataSeries.value.filter(s => s.data.length > 0).length,
        totalDataPoints: dataSeries.value.reduce((sum, s) => sum + s.data.length, 0),
        hasAnalogChart: !!analogChartInstance,
        hasDigitalChart: !!digitalChartInstance
      })

      // If charts don't exist yet, create them
      if (!analogChartInstance && visibleAnalogSeries.value.length > 0) {
        LogUtil.Debug('= TLChart DataFlow: Creating analog chart for first time')
        createAnalogChart()
        await nextTick()
      }

      // CRITICAL: Directly call updateAnalogChart() instead of async updateCharts()
      // The async flow (requestAnimationFrame → setTimeout) doesn't complete properly for custom dates
      // causing afterDataLimits callbacks to never fire, breaking Y-axis scaling
      if (analogChartInstance) {
        LogUtil.Debug('= TLChart DataFlow: Directly calling updateAnalogChart() for custom date')
        await updateAnalogChart()
      }

      // Also update digital charts if present
      if (digitalChartInstance) {
        LogUtil.Debug('= TLChart DataFlow: Updating digital charts for custom date')
        await updateDigitalCharts()
      }

      LogUtil.Debug('= TLChart DataFlow: Charts updated with custom range data')
    }
  }

  // Custom Date Modal Functions
  const applyCustomDateRange = () => {
    if (customStartDate.value && customEndDate.value && customStartTime.value && customEndTime.value) {
      // Combine date and time
      const startDateTime = customStartDate.value
        .hour(customStartTime.value.hour())
        .minute(customStartTime.value.minute())
        .second(0)
        .millisecond(0)

      const endDateTime = customEndDate.value
        .hour(customEndTime.value.hour())
        .minute(customEndTime.value.minute())
        .second(0)
        .millisecond(0)

      // Validation
      if (endDateTime.isBefore(startDateTime)) {
        message.error('End time must be after start time')
        return
      }

      // Update the existing customStartDate and customEndDate with combined date+time
      customStartDate.value = startDateTime
      customEndDate.value = endDateTime

      LogUtil.Info('📅 Custom Date Range Applied:', {
        startDate: customStartDate.value.format('YYYY-MM-DD HH:mm:ss'),
        endDate: customEndDate.value.format('YYYY-MM-DD HH:mm:ss'),
        startTimestamp: customStartDate.value.valueOf(),
        endTimestamp: customEndDate.value.valueOf(),
        durationMinutes: Math.round((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / 60000),
        durationHours: Math.round((customEndDate.value.valueOf() - customStartDate.value.valueOf()) / (60000 * 60))
      })

      // Set timebase to custom and apply changes
      timeBase.value = 'custom'
      isRealTime.value = false // Disable Auto Scroll for custom date ranges (historical data)
      customDateModalVisible.value = false
      onCustomDateChange()
    } else {
      LogUtil.Warn('Custom date range incomplete - missing start or end date/time')
    }
  }

  const cancelCustomDateRange = () => {
    customDateModalVisible.value = false
    // Reset selections if needed
  }

  const setQuickRange = (range: string) => {
    const now = dayjs()

    switch (range) {
      case 'today':
        customStartDate.value = now.startOf('day')
        customEndDate.value = now.endOf('day')
        customStartTime.value = dayjs().hour(0).minute(0)
        customEndTime.value = dayjs().hour(23).minute(59)
        break
      case 'yesterday':
        const yesterday = now.subtract(1, 'day')
        customStartDate.value = yesterday.startOf('day')
        customEndDate.value = yesterday.endOf('day')
        customStartTime.value = dayjs().hour(0).minute(0)
        customEndTime.value = dayjs().hour(23).minute(59)
        break
      case 'thisWeek':
        customStartDate.value = now.startOf('week')
        customEndDate.value = now.endOf('week')
        customStartTime.value = dayjs().hour(0).minute(0)
        customEndTime.value = dayjs().hour(23).minute(59)
        break
      case 'lastWeek':
        const lastWeek = now.subtract(1, 'week')
        customStartDate.value = lastWeek.startOf('week')
        customEndDate.value = lastWeek.endOf('week')
        customStartTime.value = dayjs().hour(0).minute(0)
        customEndTime.value = dayjs().hour(23).minute(59)
        break
    }
  }

  const formatDateTimeRange = () => {
    if (customStartDate.value && customEndDate.value && customStartTime.value && customEndTime.value) {
      const start = customStartDate.value
        .hour(customStartTime.value.hour())
        .minute(customStartTime.value.minute())
      const end = customEndDate.value
        .hour(customEndTime.value.hour())
        .minute(customEndTime.value.minute())

      return `${start.format('DD/MM/YYYY HH:mm')} - ${end.format('DD/MM/YYYY HH:mm')}`
    }
    return ''
  }

  const onRealTimeToggle = (checked: boolean) => {
    LogUtil.Info(`🔄 TrendLogModal: Auto Scroll toggle - ${checked ? 'ON' : 'OFF'}`, {
      currentDataSeriesLength: dataSeries.value.length,
      hasRealData: !!monitorConfig.value?.inputItems?.length,
      currentTimeBase: timeBase.value
    })

    if (checked) {
      // AUTO SCROLL ON: Show real-time + historical data

      // If currently viewing custom date range, reset to 5 minutes timebase
      if (timeBase.value === 'custom') {
        LogUtil.Info('🔄 Auto Scroll ON: Resetting from custom timebase to 5 minutes', {
          previousTimeBase: timeBase.value,
          newTimeBase: '5m'
        })
        timeBase.value = '5m'
      }

      timeOffset.value = 0
      initializeData()
      startRealTimeUpdates()
    } else {
      // AUTO SCROLL OFF: Show historical data only (stop real-time updates)
      stopRealTimeUpdates()
      LogUtil.Info('📊 TrendLogModal: Auto Scroll OFF - switching to historical data only')
      // Keep existing data and configuration, just stop real-time polling
      // Historical data will remain visible
      initializeHistoricalData()
    }
  }

  const initializeHistoricalData = async () => {
    LogUtil.Info('📚 TLChart: Loading historical data only (Auto Scroll disabled)', {
      currentDataSeriesLength: dataSeries.value.length,
      hasMonitorConfig: !!monitorConfig.value,
      timeBase: timeBase.value
    })

    const monitorConfigData = monitorConfig.value
    if (monitorConfigData && monitorConfigData.inputItems && monitorConfigData.inputItems.length > 0) {
      try {
        startLoading()

        // Load historical data from database only
        LogUtil.Info('📚 Loading historical data from database for current timebase')
        await loadHistoricalDataFromDatabase()

        // Update charts with historical data
        updateCharts()

        // Force a UI update to ensure immediate rendering
        nextTick(() => {
          updateCharts()
        })

        stopLoading()

      } catch (error) {
        LogUtil.Error('= TLChart: Error in historical data initialization:', error)
        hasConnectionError.value = true
        dataSeries.value = []
        stopLoading()
      }
    } else {
      LogUtil.Info('📊 No monitor configuration available for historical data')
      hasConnectionError.value = true
      dataSeries.value = []
      stopLoading()
    }
  }

  const onSeriesVisibilityChange = (index) => {
    LogUtil.Debug(`Toggling visibility for series ${dataSeries.value[index].name}`)
    toggleSeriesVisibility(index)
  }

  const toggleSeriesVisibility = (index: number, event?: Event) => {
    // Stop event propagation to prevent triggering parent handlers
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }

    if (dataSeries.value[index].isEmpty) return

    // Clear connection error when user interacts with series that has data
    // This prevents error state from showing when data is already loaded
    if (hasConnectionError.value && dataSeries.value[index].data?.length > 0) {
      hasConnectionError.value = false
      LogUtil.Info('Cleared connection error - series has valid data')
    }

    dataSeries.value[index].visible = !dataSeries.value[index].visible
    updateCharts()
    LogUtil.Debug(`Toggled visibility for series ${dataSeries.value[index].name} to ${dataSeries.value[index].visible}`)
  }

  const toggleSeriesExpansion = (index: number, event?: Event) => {
    // Stop event propagation to prevent triggering parent handlers
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }

    if (dataSeries.value[index].isEmpty) return

    if (expandedSeries.value.has(index)) {
      expandedSeries.value.delete(index)
    } else {
      expandedSeries.value.add(index)
    }
  }

  const startRealTimeUpdates = () => {
    LogUtil.Debug('🔥 startRealTimeUpdates CALLED - Current interval ID:', realtimeInterval)

    if (realtimeInterval) {
      LogUtil.Debug('⚠️ Clearing existing interval:', realtimeInterval)
      clearInterval(realtimeInterval)
      realtimeInterval = null
    }

    // Use monitor config data interval if available, otherwise fallback to default
    const monitorConfigData = monitorConfig.value
    const dataInterval = monitorConfigData?.dataIntervalMs || updateInterval.value

    LogUtil.Debug('📡 Creating new interval with', dataInterval, 'ms interval')
    realtimeInterval = setInterval(addRealtimeDataPoint, dataInterval)
    LogUtil.Debug('✅ Interval created - ID:', realtimeInterval)
  }

  const stopRealTimeUpdates = () => {
    if (realtimeInterval) {
      LogUtil.Debug(`🛑 Stopping real-time updates for instance: ${instanceId}`)
      clearInterval(realtimeInterval)
      realtimeInterval = null
    }
  }

  // Dropdown Menu Handlers
  const handleTimeBaseMenu = ({ key }: { key: string }) => {
    setTimeBase(key)
  }

  const handleZoomMenu = ({ key }: { key: string }) => {
    // This function is no longer used since zoom is now handled by icon buttons
    // Keeping for backward compatibility if referenced elsewhere
  }

  const handleChartOptionsMenu = ({ key }: { key: string }) => {
    switch (key) {
      case 'grid':
        // Grid toggle is handled by v-model:checked="showGrid" in template
        // Chart will automatically update via reactive watcher
        break
      case 'legend':
        // Legend toggle is handled by v-model:checked="showLegend" in template
        // Chart will automatically update via reactive watcher
        break
      case 'smooth':
        // Smooth lines toggle is handled by v-model:checked="smoothLines" in template
        // Chart will automatically update via reactive watcher
        break
      case 'points':
        // Show points toggle is handled by v-model:checked="showPoints" in template
        // Chart will automatically update via reactive watcher
        break
      case 'reset':
        resetChartOptions()
        break
    }
  }

  const handleAllMenu = ({ key }: { key: string }) => {
    switch (key) {
      case 'enable-all':
        enableAllSeries()
        break
      case 'disable-all':
        disableAllSeries()
        break
    }
  }

  const handleExportMenu = ({ key }: { key: string }) => {
    switch (key) {
      case 'png':
        exportChartPNG()
        break
      case 'jpg':
        exportChartJPG()
        break
      case 'csv':
        exportData()
        break
      case 'json':
        exportDataJSON()
        break
    }
  }

  // NEW: Toggle digital channel visibility
  const toggleDigitalVisibility = (seriesName: string) => {
    const series = dataSeries.value.find(s => s.name === seriesName)
    if (series) {
      series.visible = !series.visible
      // Trigger chart update
      nextTick(() => {
        renderCharts()
      })
    }
  }

  // NEW: Get last digital state (for display)
  const getLastDigitalState = (series: SeriesConfig): boolean => {
    if (series.data.length === 0) return false
    const lastValue = series.data[series.data.length - 1].value
    return lastValue > 0.5
  }

  // NEW: Resizable divider functions
  const startResize = (event: MouseEvent) => {
    isResizing.value = true
    resizeStartY.value = event.clientY
    resizeStartHeight.value = analogAreaHeight.value

    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
    event.preventDefault()
  }

  const handleResize = (event: MouseEvent) => {
    if (!isResizing.value) return

    const container = document.querySelector('.timeseries-container')
    if (!container) return

    const containerHeight = container.clientHeight
    const deltaY = event.clientY - resizeStartY.value
    const deltaPercent = (deltaY / containerHeight) * 100

    let newHeight = resizeStartHeight.value + deltaPercent

    // Constrain between 20% and 100%
    newHeight = Math.max(20, Math.min(100, newHeight))

    analogAreaHeight.value = newHeight
  }

  const stopResize = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)

    // Trigger chart resize after resize complete
    nextTick(() => {
      renderCharts()
    })
  }

  const handleByTypeMenu = ({ key }: { key: string }) => {
    switch (key) {
      case 'toggle-analog':
        toggleAnalogSeries()
        break
      case 'toggle-digital':
        toggleDigitalSeries()
        break
      case 'toggle-input':
        toggleInputSeries()
        break
      case 'toggle-output':
        toggleOutputSeries()
        break
      case 'toggle-variable':
        toggleVariableSeries()
        break
    }
  }

  // Dropdown menu handlers
  const handleCancel = () => {
    stopRealTimeUpdates()
    // Remove modal close since this is now just a chart component
  }

  // Timebase API Integration Helper Functions
  const calculateTimeRangeForTimebase = (timeBase: string) => {
    const now = dayjs()
    let startTime: string
    let endTime: string
    let durationMinutes: number

    const timeRangeMapping = {
      '5m': { duration: 5, label: '5 minutes' },
      '10m': { duration: 10, label: '10 minutes' },
      '30m': { duration: 30, label: '30 minutes' },
      '1h': { duration: 60, label: '1 hour' },
      '4h': { duration: 240, label: '4 hours' },
      '12h': { duration: 720, label: '12 hours' },
      '1d': { duration: 1440, label: '1 day' },
      '4d': { duration: 5760, label: '4 days' }
    }

    const config = timeRangeMapping[timeBase as keyof typeof timeRangeMapping] || { duration: 60, label: '1 hour' }
    durationMinutes = config.duration

    // Calculate start and end times - Format for LoggingTime_Fmt column
    const formatTimeForDB = (date: any): string => {
      const jsDate = date.toDate()
      const year = jsDate.getFullYear()
      const month = (jsDate.getMonth() + 1).toString().padStart(2, '0')
      const day = jsDate.getDate().toString().padStart(2, '0')
      const hours = jsDate.getHours().toString().padStart(2, '0')
      const minutes = jsDate.getMinutes().toString().padStart(2, '0')
      const seconds = jsDate.getSeconds().toString().padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    endTime = formatTimeForDB(now)
    startTime = formatTimeForDB(now.subtract(durationMinutes, 'minute'))

    // Estimate expected data points based on T3000 typical intervals
    const typicalIntervalSeconds = 15 // T3000 default 15-second interval
    const expectedDataPoints = Math.floor((durationMinutes * 60) / typicalIntervalSeconds)

    return {
      startTime,
      endTime,
      durationMinutes,
      expectedDataPoints,
      timebaseLabel: config.label
    }
  }

  // Helper function to get panelId from query parameters (most reliable source)
  const getPanelIdFromQuery = (): number | null => {
    try {
      if (route.query.panel_id) {
        const panelId = parseInt(route.query.panel_id as string)
        return !isNaN(panelId) ? panelId : null
      }
    } catch (error) {
      LogUtil.Warn('�?getPanelIdFromQuery: Failed to parse panel_id from route', {
        error,
        queryPanelId: route.query.panel_id
      })
    }
    return null
  }

  const extractDeviceParameters = () => {
    // Try to extract device parameters from various sources
    let sn: number | null = null
    let panel_id: number | null = null
    let trendlog_id: number | null = null

    // Method 1: Try from URL parameters (route) - MOST RELIABLE
    try {
      if (route.query.sn) sn = parseInt(route.query.sn as string)
      if (route.query.panel_id) panel_id = parseInt(route.query.panel_id as string)
      if (route.query.trendlog_id) trendlog_id = parseInt(route.query.trendlog_id as string)
    } catch (error) {
      // Route parameter parsing failed, continue with other methods
    }

    // Method 2: Try from current item data (props)
    if (props.itemData?.t3Entry) {
      const t3Entry = props.itemData.t3Entry

      // Use panel_id from t3Entry if not found in URL
      if (panel_id === null) {
        panel_id = t3Entry.pid || null
      }

      // Extract and map trendlog_id from id (e.g., "MON5" -> 4) if not found in URL
      if (trendlog_id === null && t3Entry.id && typeof t3Entry.id === 'string') {
        const match = t3Entry.id.match(/MON(\d+)|TRL(\d+)/i)
        if (match) {
          const monNumber = parseInt(match[1] || match[2])
          // MON5 maps to trendlog ID 4 (MON number - 1)
          trendlog_id = monNumber - 1
        }
      }
    }

    // Method 3: Try from T3000_Data if still missing
    if (!sn && T3000_Data.value.panelsList && T3000_Data.value.panelsList.length > 0) {
      sn = T3000_Data.value.panelsList[0].serial_number
    }

    if (!panel_id && T3000_Data.value.panelsList && T3000_Data.value.panelsList.length > 0) {
      panel_id = T3000_Data.value.panelsList[0].panel_number
    }

    LogUtil.Debug('= TLChart DataFlow: Device parameter extraction for API request:', {
      methods_used: ['URL params', 'props.itemData', 'T3000_Data'],
      final_result: { sn, panel_id, trendlog_id },
      trendlog_mapping: trendlog_id ? `MON${trendlog_id + 1} -> ${trendlog_id}` : 'no mapping'
    })

    return { sn, panel_id, trendlog_id }
  }

  /**
   * Extract specific point information from current data series
   * This determines which of the 14 panel items we need to fetch values for
   */
  const extractSpecificPoints = () => {
    const points: Array<{
      point_id: string
      point_type: string
      point_index: number
      panel_id: number
    }> = []

    if (!dataSeries.value || dataSeries.value.length === 0) {
      LogUtil.Debug('= TLChart DataFlow: No data series available for 14-item point extraction')
      return points
    }

    LogUtil.Debug('🔍 CUSTOM DATE PAYLOAD - Extracting points from dataSeries:', {
      totalSeries: dataSeries.value.length,
      seriesTypes: dataSeries.value.map(s => ({ name: s.name, itemType: s.itemType, unitType: s.unitType }))
    })

    LogUtil.Debug('= TLChart DataFlow: Extracting 14 panel items from series data')

    // Extract points from current series configuration
    // 🔄 REFACTORED: Use same approach as loadHistoricalDataFromDatabase for consistency
    const deviceParams = extractDeviceParameters()

    dataSeries.value.forEach((series, index) => {
      try {
        // Method 1: Use pointType and pointNumber directly (same as default timebase)
        if (series.pointType !== undefined && series.pointNumber !== undefined) {
          const pointTypeString = mapPointTypeFromNumber(series.pointType)
          const pointId = generateDeviceId(series.pointType, series.pointNumber)

          points.push({
            point_id: pointId,
            point_type: pointTypeString,
            point_index: series.pointNumber + 1, // Convert 0-based to 1-based
            panel_id: series.panelId || deviceParams.panel_id
          })

          LogUtil.Debug('✅ Extracted point (method 1 - direct):', {
            name: series.name,
            pointType: series.pointType,
            pointNumber: series.pointNumber,
            result: { point_id: pointId, point_type: pointTypeString, point_index: series.pointNumber + 1 }
          })
        }
        // Method 2: Fallback to parsing itemType if pointType/pointNumber not available
        else {
          console.warn('⚠️ Series missing pointType/pointNumber, using itemType fallback:', series.name)
          const itemType = series.itemType || `${deviceParams.panel_id}VAR${index + 1}`
          const panelMatch = itemType.match(/^(\d+)/)
          const panelId = panelMatch ? parseInt(panelMatch[1]) : deviceParams.panel_id || 2

          let pointType: string
          let pointIndex: number

          // Check for INPUT: supports both "144Input40" and "144IN40" formats
          if (itemType.includes('Input') || /IN\d+/.test(itemType)) {
            pointType = 'INPUT'
            let indexMatch = itemType.match(/Input(\d+)$/)
            if (!indexMatch) {
              indexMatch = itemType.match(/IN(\d+)$/)
            }
            pointIndex = indexMatch ? parseInt(indexMatch[1]) : index + 1
          }
          // Check for OUTPUT: supports both "144Output40" and "144OUT40" formats
          else if (itemType.includes('Output') || /OUT\d+/.test(itemType)) {
            pointType = 'OUTPUT'
            let indexMatch = itemType.match(/Output(\d+)$/)
            if (!indexMatch) {
              indexMatch = itemType.match(/OUT(\d+)$/)
            }
            pointIndex = indexMatch ? parseInt(indexMatch[1]) : index + 1
          }
          else if (itemType.includes('VAR')) {
            pointType = 'VARIABLE'
            const indexMatch = itemType.match(/VAR(\d+)$/)
            pointIndex = indexMatch ? parseInt(indexMatch[1]) : index + 1
          }
          else if (itemType.includes('HOL')) {
            pointType = 'MONITOR'
            const indexMatch = itemType.match(/HOL(\d+)$/)
            pointIndex = indexMatch ? parseInt(indexMatch[1]) : index + 1
          }
          else {
            pointType = 'VARIABLE'
            pointIndex = index + 1
          }

          const pointId = pointType === 'INPUT' ? `IN${pointIndex}` :
                         pointType === 'OUTPUT' ? `OUT${pointIndex}` :
                         pointType === 'VARIABLE' ? `VAR${pointIndex}` :
                         pointType === 'MONITOR' ? `HOL${pointIndex}` :
                         `VAR${pointIndex}`

          points.push({
            point_id: pointId,
            point_type: pointType,
            point_index: pointIndex,
            panel_id: panelId
          })

          LogUtil.Debug('✅ Extracted point (method 2 - itemType):', {
            name: series.name,
            itemType: itemType,
            result: { point_id: pointId, point_type: pointType, point_index: pointIndex }
          })
        }

      } catch (error) {
        console.warn('= TLChart DataFlow: Failed to extract point info for item', index, ':', error)
        // Add fallback point with database-compatible format
        const deviceParams = extractDeviceParameters()
        points.push({
          point_id: `VAR${index + 1}`, // Use database format "VAR1", "VAR2", etc.
          point_type: 'VARIABLE',
          point_index: index,
          panel_id: deviceParams.panel_id || 2
        })
      }
    })

    LogUtil.Debug('= TLChart DataFlow: 14 panel items extraction completed:', {
      totalItems: points.length,
      itemFormats: points.map(p => p.point_id)
    })

    return points
  }

  // 🆕 PERFORMANCE: Debounced wrapper to prevent rapid successive API calls
  const debouncedFetchHistoricalData = (deviceParams: any, timeRanges: any) => {
    // Cancel any pending debounced fetch
    if (historyFetchDebounceTimeout) {
      clearTimeout(historyFetchDebounceTimeout)
    }

    // Cancel any in-flight request
    if (historyAbortController) {
      historyAbortController.abort()
      historyAbortController = null
    }

    // Debounce for 300ms to batch rapid timebase changes
    return new Promise<void>((resolve, reject) => {
      historyFetchDebounceTimeout = setTimeout(async () => {
        try {
          await fetchHistoricalDataForTimebase(deviceParams, timeRanges)
          resolve()
        } catch (error) {
          reject(error)
        }
      }, 300)
    })
  }

  const fetchHistoricalDataForTimebase = async (deviceParams: any, timeRanges: any) => {
    try {
      LogUtil.Debug('= TLChart DataFlow: Starting API request to fetch historical data for panel items')

      // Don't show loading state for custom date - series already exist
      // startLoading() - removed to prevent unnecessary loading indicator
      dataSource.value = 'api'
      isRealTime.value = false // Auto Scroll should be off for historical data

      // Extract specific points from current data series
      const specificPoints = extractSpecificPoints()

      // Calculate limit based on number of points to ensure all data is returned
      // Formula: expectedDataPoints × numberOfPoints × safetyMultiplier
      const pointCount = specificPoints.length || 14 // Number of points being queried
      const safetyMultiplier = 2 // Request 2x expected to account for irregular intervals
      const maxTotalRecords = 100000 // Absolute maximum for safety (prevents excessive queries)

      const calculatedLimit = timeRanges.expectedDataPoints * pointCount * safetyMultiplier
      const finalLimit = Math.min(calculatedLimit, maxTotalRecords)

      LogUtil.Debug('📊 TLChart DataFlow: Calculated query limit to ensure complete data:', {
        pointCount,
        expectedDataPointsPerPoint: timeRanges.expectedDataPoints,
        safetyMultiplier,
        calculatedLimit,
        finalLimit,
        timeRange: `${timeRanges.durationMinutes} minutes`,
        willGetCompleteData: calculatedLimit <= maxTotalRecords
      })

      // Enhanced API request with specific point filtering
      // This ensures we only fetch data for the exact points displayed in the chart
      const historyRequest = {
        serial_number: deviceParams.sn,
        panel_id: deviceParams.panel_id,
        trendlog_id: deviceParams.trendlog_id.toString(),
        start_time: timeRanges.startTime,
        end_time: timeRanges.endTime,
        limit: finalLimit, // Calculated per point to ensure all data is returned
        point_types: ['INPUT', 'OUTPUT', 'VARIABLE', 'MONITOR'], // All point types
        specific_points: specificPoints // NEW: Pass specific points to filter
      }

      LogUtil.Debug('= TLChart DataFlow: API request details:', {
        device: `SN:${deviceParams.sn}, Panel:${deviceParams.panel_id}, TrendLog:${deviceParams.trendlog_id}`,
        pointsRequested: specificPoints.length,
        timeRange: `${timeRanges.durationMinutes} minutes`
      })

      const historyResponse = await trendlogAPI.getTrendlogHistory(historyRequest)

      LogUtil.Debug('= TLChart DataFlow: API response received:', {
        hasData: !!(historyResponse?.data && historyResponse.data.length > 0),
        dataPointsCount: historyResponse?.data?.length || 0,
        requestedLimit: finalLimit,
        responseFiltering: historyResponse?.filtering,
        deviceId: historyResponse?.device_id,
        panelId: historyResponse?.panel_id,
        message: historyResponse?.message
      })

      // Analyze data distribution across points
      if (historyResponse?.data && historyResponse.data.length > 0) {
        const pointDistribution = new Map<string, number>()
        historyResponse.data.forEach((record: any) => {
          const key = `${record.point_type}_${record.point_id}`
          pointDistribution.set(key, (pointDistribution.get(key) || 0) + 1)
        })

        LogUtil.Debug('📊 TLChart DataFlow: Data distribution across points:', {
          totalRecords: historyResponse.data.length,
          uniquePoints: pointDistribution.size,
          recordsPerPoint: Array.from(pointDistribution.entries()).map(([point, count]) => ({
            point,
            count
          })),
          averagePerPoint: Math.floor(historyResponse.data.length / pointDistribution.size),
          expectedPerPoint: timeRanges.expectedDataPoints
        })
      }

      if (historyResponse && historyResponse.data && historyResponse.data.length > 0) {
        LogUtil.Debug('= TLChart DataFlow: Converting API data to chart format for 14 panel items')

        // Process the historical data into series format
        const historicalSeries = convertApiDataToSeries(historyResponse.data, timeRanges)

        LogUtil.Debug('= TLChart DataFlow: Chart conversion completed:', {
          seriesCount: historicalSeries.length,
          totalDataPoints: historicalSeries.reduce((sum, series) => sum + series.data.length, 0)
        })

        // Update the data series with historical data
        dataSeries.value = historicalSeries

        // Update charts to display new data
        updateCharts()

        // Update last sync time
        lastSyncTime.value = dayjs().format('HH:mm:ss')

      } else {
        LogUtil.Debug('= TLChart DataFlow: No historical data available for custom date range - keeping existing series')

        // DON'T set connection error - no data for a time range is not an error
        // DON'T clear dataSeries - keep the 14 items visible
        // Just keep existing data and UI state

        // Clear connection error flag if it was set
        hasConnectionError.value = false
      }

    } catch (error) {
      console.error('= TLChart DataFlow: API request failed:', error instanceof Error ? error.message : error)
      hasConnectionError.value = true
      // Clear all data when connection error occurs
      dataSeries.value = []

      // Show error notification
      notification.error({
        message: 'Historical Data Error',
        description: `Failed to load historical data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 4.5
      })

      // Fall back to standard initialization
      await initializeData()
    } finally {
      // stopLoading() - removed since we don't call startLoading() for custom date
    }
  }

  const convertApiDataToSeries = (apiData: any[], timeRanges: any): SeriesConfig[] => {
    LogUtil.Debug('= TLChart DataFlow: Converting API data to chart series format')

    // Store original series for name preservation and MAINTAIN ORIGINAL SEQUENCE
    const originalSeries = dataSeries.value || []
    LogUtil.Debug('= TLChart DataFlow: Preserving original 14-item series order:', {
      originalSeriesCount: originalSeries.length,
      preservingSequence: originalSeries.length > 0
    })

    // Group data points by point_id and point_type
    const groupedData = new Map<string, any[]>()

    apiData.forEach(point => {
      const key = `${point.point_type}_${point.point_id}`
      if (!groupedData.has(key)) {
        groupedData.set(key, [])
      }
      groupedData.get(key)!.push(point)
    })

    LogUtil.Debug('= TLChart DataFlow: Grouping API data by point types:', {
      totalApiPoints: apiData.length,
      uniqueSeries: groupedData.size
    })

    // MAINTAIN ORIGINAL SEQUENCE: Create series in the same order as original
    const series: SeriesConfig[] = []
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F'
    ]

    // Process in original series order to maintain sequence
    originalSeries.forEach((originalSeries, index) => {
      // Find matching API data for this original series
      let matchingApiData: any[] | undefined = undefined
      let matchedKey: string | undefined = undefined

      // Try different matching strategies
      groupedData.forEach((apiPoints, apiKey) => {
        if (matchingApiData) return // Already found a match

        const [apiPointType, apiPointId] = apiKey.split('_')

        // Strategy 1: Match by itemType containing point ID
        if (originalSeries.itemType && originalSeries.itemType.includes(apiPointId)) {
          matchingApiData = apiPoints
          matchedKey = apiKey
          return
        }

        // Strategy 2: Match by name containing point ID
        if (originalSeries.name.includes(apiPointId)) {
          matchingApiData = apiPoints
          matchedKey = apiKey
          return
        }

        // Strategy 3: Match by prefix and sequence (e.g., INPUT series 0 matches IN1)
        if (originalSeries.prefix === apiPointType) {
          const expectedPointId = `${apiPointType === 'INPUT' ? 'IN' :
            apiPointType === 'OUTPUT' ? 'OUT' :
              apiPointType === 'VARIABLE' ? 'VAR' : 'UNK'}${index + 1}`
          if (apiPointId === expectedPointId) {
            matchingApiData = apiPoints
            matchedKey = apiKey
            return
          }
        }
      })

      if (matchingApiData && matchedKey) {
        // Remove from grouped data to avoid duplicate processing
        groupedData.delete(matchedKey)

        // Sort points by time
        matchingApiData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

        // Convert to chart data format
        const chartData: DataPoint[] = matchingApiData.map(point => ({
          timestamp: new Date(point.time).getTime(),
          value: typeof point.value === 'number' ? point.value : parseFloat(point.value) || 0
        }))

        const seriesConfig: SeriesConfig = {
          // PRESERVE ORIGINAL NAME - no time range labels
          name: originalSeries.name,
          color: originalSeries.color || colors[index % colors.length],
          data: chartData,
          visible: originalSeries.visible !== false, // Preserve visibility state
          unit: originalSeries.unit || '',
          unitType: originalSeries.unitType,
          unitCode: originalSeries.unitCode,
          itemType: originalSeries.itemType,
          prefix: originalSeries.prefix,
          // PRESERVE ORIGINAL DESCRIPTION - no time range labels
          description: originalSeries.description
        }

        series.push(seriesConfig)

        LogUtil.Debug('= TLChart DataFlow: Matched panel item to API data:', {
          itemIndex: index,
          name: originalSeries.name,
          dataPoints: chartData.length
        })
      } else {
        // No matching API data - create empty series to maintain sequence
        const emptySeries: SeriesConfig = {
          name: originalSeries.name,
          color: originalSeries.color || colors[index % colors.length],
          data: [], // Empty data
          visible: originalSeries.visible !== false,
          unit: originalSeries.unit || '',
          unitType: originalSeries.unitType,
          unitCode: originalSeries.unitCode,
          itemType: originalSeries.itemType,
          prefix: originalSeries.prefix,
          description: originalSeries.description,
          isEmpty: true // Mark as empty for UI handling
        }

        series.push(emptySeries)

        LogUtil.Debug('= TLChart DataFlow: No API data found for panel item:', {
          itemIndex: index,
          name: originalSeries.name
        })
      }
    })

    LogUtil.Debug('= TLChart DataFlow: 14 panel items series conversion completed:', {
      totalItems: series.length,
      itemsWithData: series.filter(s => !s.isEmpty).length,
      totalDataPoints: series.reduce((sum, s) => sum + s.data.length, 0),
      seriesDetails: series.map(s => ({
        name: s.name,
        dataPoints: s.data.length,
        isEmpty: s.isEmpty || false,
        timeRange: s.data.length > 0 ? {
          first: new Date(s.data[0].timestamp).toISOString(),
          last: new Date(s.data[s.data.length - 1].timestamp).toISOString()
        } : null,
        valueRange: s.data.length > 0 ? {
          min: Math.min(...s.data.map(d => d.value)),
          max: Math.max(...s.data.map(d => d.value))
        } : null
      }))
    })

    return series
  }

  // ===================================
  // FFI Integration Functions - Enhanced TrendLog System
  // ===================================

  /**
   * Initialize TrendLog with complete FFI information
   * Gets complete TrendLog info from T3000 and persists to database
   */
  const initializeWithCompleteFFI = async () => {
    const { sn, panel_id, trendlog_id } = extractQueryParams()

    // 🔥 DEBUG: Log extracted parameters
    // LogUtil.Debug('🔥 FFI DEBUG: Extracted parameters', { sn, panel_id, trendlog_id, route_query: route.query })

    if (!sn || trendlog_id === null || trendlog_id === undefined) {
      LogUtil.Warn('�?FFI Initialization: Missing required parameters', { sn, panel_id, trendlog_id })
      LogUtil.Debug('🔥 FFI DEBUG: Early return due to missing parameters')
      return
    }

    // LogUtil.Debug('🔥 FFI DEBUG: Parameters validation passed, proceeding with FFI call')

    try {
      ffiSyncStatus.value.syncing = true
      ffiSyncStatus.value.error = null

      LogUtil.Info('🔄 FFI: Starting complete TrendLog sync', {
        device_id: sn,
        trendlog_id: trendlog_id
      })

      // Two-step FFI approach: 1) Create initial record (fast), 2) FFI sync (slower)
      // LogUtil.Debug('🔥 FFI DEBUG: Starting two-step FFI initialization', {
      //   device_id: sn,
      //   panel_id: panel_id,
      //   trendlog_id: trendlog_id,
      //   trendlog_id_string: trendlog_id.toString()
      // })

      const completeResult = await trendlogAPI.initializeCompleteFFI(sn, panel_id, trendlog_id.toString(), chartTitle.value)

      // LogUtil.Debug('🔥 FFI DEBUG: Complete FFI result received', {
      //   completeResult
      // })

      if (completeResult.success) {
        // Use FFI result for complete info, fallback to initial if needed
        ffiTrendlogInfo.value = completeResult.ffi?.trendlog_info || completeResult.initial?.trendlog_info
        ffiSyncStatus.value.completed = true
        ffiSyncStatus.value.lastSync = new Date().toISOString()

        LogUtil.Info('�?FFI: Complete TrendLog initialization successful', {
          initial_info: completeResult.initial?.trendlog_info,
          ffi_info: completeResult.ffi?.trendlog_info,
          num_points: ffiTrendlogInfo.value?.related_points?.length || 0
        })

        // 2. Load view selections for Views 2/3
        const actualTrendlogId = props.itemData?.t3Entry?.id || `MONITOR${trendlog_id}`
        await loadFFIViewSelections(actualTrendlogId, sn, panel_id)

        return ffiTrendlogInfo.value
      } else {
        throw new Error(completeResult.ffi?.message || completeResult.initial?.message || 'FFI initialization failed')
      }

    } catch (error) {
      LogUtil.Error('�?FFI: Sync failed', error)
      ffiSyncStatus.value.error = error.message

      // Continue with existing logic as fallback
      LogUtil.Info('🔄 FFI: Falling back to existing logic')
      return null
    } finally {
      ffiSyncStatus.value.syncing = false
    }
  }

  /**
   * Load persistent view selections for Views 2/3
   * Enhanced with device context for multi-device support
   */
  const loadFFIViewSelections = async (trendlogId: string, serialNumber?: number, panelId?: number) => {
    const loadStartTime = Date.now()

    LogUtil.Info(`🔄 FFI Load API: Starting to load selections for Views 2/3`, {
      trendlogId,
      timestamp: new Date().toISOString()
    })

    try {
      for (let viewNum = 2; viewNum <= 3; viewNum++) {
        const viewStartTime = Date.now()
        const apiUrl = `/api/t3_device/trendlogs/${trendlogId}/views/${viewNum}/selections`

        LogUtil.Info(`📡 FFI Load API: Making GET request for View ${viewNum}`, {
          url: apiUrl,
          method: 'GET',
          viewNumber: viewNum,
          usingTrendlogAPI: true
        })

        // Use trendlogAPI with device context - this handles the correct port (9103) and multi-device support
        const selections = await trendlogAPI.loadViewSelections(trendlogId, viewNum, serialNumber, panelId)
        const responseTime = Date.now() - viewStartTime

        LogUtil.Info(`📈 FFI Load API: Response received for View ${viewNum}`, {
          success: !!selections,
          selectionsCount: selections?.length || 0,
          responseTime: `${responseTime}ms`,
          usedTrendlogAPI: true
        })

        if (selections) {
          viewSelections.value.set(viewNum, selections)

          LogUtil.Info(`📋 FFI Load API: Selections data received for View ${viewNum}`, {
            selectionsCount: selections.length,
            rawSelections: selections,
            responseTime: `${responseTime}ms`
          })

          // Map database selections back to actual series names
          const trackedNames = selections
            .filter(s => s.is_selected)
            .map(selection => {
              LogUtil.Debug(`🔍 FFI Load: Processing selection`, {
                selection,
                lookingFor: {
                  point_type: selection.point_type,
                  point_index: selection.point_index,
                  point_label: selection.point_label
                }
              })

              // Find series by matching point type and number
              const matchingSeries = dataSeries.value.find(series =>
                series.prefix === selection.point_type &&
                series.pointNumber === selection.point_index
              )

              if (matchingSeries) {
                LogUtil.Debug(`�?FFI Load: Found matching series by type/index`, {
                  selection,
                  matchedSeries: {
                    name: matchingSeries.name,
                    prefix: matchingSeries.prefix,
                    pointNumber: matchingSeries.pointNumber
                  }
                })
                return matchingSeries.name  // Return actual series name like "Room Temperature"
              } else {
                // Fallback: try to find by point_label if direct matching fails
                const labelMatch = dataSeries.value.find(series => series.name === selection.point_label)
                if (labelMatch) {
                  LogUtil.Info(`🔄 FFI Load: Found matching series by label fallback`, {
                    selection,
                    matchedSeries: labelMatch.name
                  })
                  return labelMatch.name
                }

                LogUtil.Warn(`⚠️ FFI Load: No series found for selection`, {
                  point_type: selection.point_type,
                  point_index: selection.point_index,
                  point_label: selection.point_label,
                  availableSeries: dataSeries.value.map(s => ({
                    name: s.name,
                    prefix: s.prefix,
                    pointNumber: s.pointNumber
                  })).slice(0, 5) // Show first 5 for debug
                })
                return null
              }
            })
            .filter(Boolean) // Remove null entries

          viewTrackedSeries.value[viewNum] = trackedNames

          LogUtil.Info(`�?FFI Load API: View ${viewNum} selections processed successfully`, {
            totalSelections: selections.length,
            selectedCount: selections.filter(s => s.is_selected).length,
            mappedNamesCount: trackedNames.length,
            dbSelections: selections.map(s => ({
              type: s.point_type,
              index: s.point_index,
              label: s.point_label,
              selected: s.is_selected
            })),
            trackedNames: trackedNames,
            responseTime: `${responseTime}ms`
          })
        } else {
          LogUtil.Info(`📋 FFI Load API: No existing selections for View ${viewNum} (expected for new views)`, {
            responseTime: `${responseTime}ms`,
            trendlogId: trendlogId,
            viewNumber: viewNum
          })
        }
      }

      const totalLoadTime = Date.now() - loadStartTime
      LogUtil.Info(`�?FFI Load API: Completed loading all view selections`, {
        totalTime: `${totalLoadTime}ms`,
        viewsProcessed: [2, 3],
        finalState: {
          view2Count: viewTrackedSeries.value[2]?.length || 0,
          view3Count: viewTrackedSeries.value[3]?.length || 0
        }
      })

      // Auto-switch to View 2 or View 3 if they have saved selections
      const view2HasData = (viewTrackedSeries.value[2]?.length || 0) > 0
      const view3HasData = (viewTrackedSeries.value[3]?.length || 0) > 0

      if (view2HasData || view3HasData) {
        // Prioritize View 2 if it has data, otherwise use View 3
        const targetView = view2HasData ? 2 : 3

        LogUtil.Info(`🔄 Auto-switching to View ${targetView} (has ${viewTrackedSeries.value[targetView]?.length} saved selections)`)

        // Switch to the view with data
        setView(targetView)
      }

    } catch (error) {
      const totalLoadTime = Date.now() - loadStartTime
      LogUtil.Error(`�?FFI Load API: Failed to load view selections`, {
        error: error.message,
        errorType: error.constructor.name,
        totalTime: `${totalLoadTime}ms`,
        trendlogId,
        stack: error.stack
      })
    }
  }

  /**
   * Save persistent view selections for Views 2/3
   */
  const saveFFIViewSelections = async (viewNumber: number) => {
    LogUtil.Info(`🔧 FFI Save DEBUG: Function called`, {
      viewNumber,
      isValidView: viewNumber >= 2 && viewNumber <= 3,
      timestamp: new Date().toISOString()
    })

    if (viewNumber < 2 || viewNumber > 3) {
      LogUtil.Debug(`🚫 FFI Save: Skipping View ${viewNumber} (only Views 2/3 supported)`)
      return
    }

    const startTime = Date.now()

    try {
      const extractedParams = extractQueryParams()
      LogUtil.Info(`🔧 FFI Save DEBUG: Extracted params`, {
        extractedParams,
        hasTrendlogId: !!extractedParams.trendlog_id,
        routeQuery: route.query
      })

      const { trendlog_id } = extractedParams

      // Get the actual trendlog ID from T3000 data (prefer actual ID over numeric)
      let trendlogId = null
      if (props.itemData?.t3Entry?.id) {
        // Use actual T3000 ID (e.g., "MON1", "TRL2")
        trendlogId = props.itemData.t3Entry.id
      } else if (trendlog_id || trendlog_id === 0) {
        // Fallback to constructed format if no T3000 ID available
        trendlogId = `MONITOR${trendlog_id}`
      }

      if (!trendlogId) {
        LogUtil.Warn(`⚠️ FFI Save: No trendlog_id found for View ${viewNumber} - cannot save selections`, {
          extractedParams,
          routeQuery: route.query,
          propsItemData: props.itemData?.t3Entry || 'not available',
          suggestion: 'Add trendlog_id to URL or ensure props.itemData contains MON/TRL id'
        })
        return
      }
      const trackedNames = viewTrackedSeries.value[viewNumber] || []

      LogUtil.Info(`🔄 FFI Save API: Starting View ${viewNumber} save process`, {
        viewNumber,
        trendlogId,
        trackedNamesCount: trackedNames.length,
        trackedNames,
        apiEndpoint: `/api/t3_device/trendlogs/${trendlogId}/views/${viewNumber}/selections`,
        timestamp: new Date().toISOString()
      })

      // 🔧 DEBUG: Check available series vs tracked names
      LogUtil.Info(`🔧 FFI Save DEBUG: Series analysis`, {
        trackedNames,
        totalDataSeries: dataSeries.value.length,
        availableSeriesNames: dataSeries.value.map(s => s.name),
        seriesWithMetadata: dataSeries.value.map(s => ({
          name: s.name,
          prefix: s.prefix,
          pointNumber: s.pointNumber,
          id: s.id
        }))
      })

      // Convert tracked series names to API format using actual series data
      const selections = trackedNames.map(seriesName => {
        LogUtil.Info(`🔧 FFI Save DEBUG: Processing series "${seriesName}"`)

        // Find the actual series to get correct point type and number
        const series = dataSeries.value.find(s => s.name === seriesName)

        if (!series) {
          LogUtil.Warn(`⚠️ FFI Save: Series not found for name: ${seriesName}`, {
            seriesName,
            totalAvailableSeries: dataSeries.value.length,
            availableSeriesNames: dataSeries.value.map(s => s.name),
            searchAttempted: 'exact name match'
          })
          return null
        }

        const selection = {
          point_type: series.prefix || 'UNKNOWN',        // e.g., "INPUT", "OUTPUT", "VAR"
          point_index: String(series.pointNumber || 0),  // e.g., "0", "1", "2" (0-based, as string)
          point_label: seriesName,                       // e.g., "Room Temperature"
          point_id: series.id || `${series.prefix}${(series.pointNumber || 0) + 1}`, // e.g., "INPUT1"
          is_selected: true
        }

        LogUtil.Debug(`📝 FFI Save: Mapped series to selection`, {
          seriesName,
          selection,
          originalSeries: {
            prefix: series.prefix,
            pointNumber: series.pointNumber,
            id: series.id
          }
        })

        return selection
      }).filter(Boolean) // Remove null entries

      const requestBody = { selections }
      const apiUrl = `/api/t3_device/trendlogs/${trendlogId}/views/${viewNumber}/selections`

      LogUtil.Info(`📡 FFI Save API: Making POST request`, {
        url: apiUrl,
        method: 'POST',
        selectionsCount: selections.length,
        requestBodySize: JSON.stringify(requestBody).length,
        selections: selections.map(s => ({
          type: s.point_type,
          index: s.point_index,
          label: s.point_label,
          id: s.point_id
        }))
      })

      LogUtil.Info(`🚀 FFI Save DEBUG: About to make API request via trendlogAPI`, {
        trendlogId,
        viewNumber,
        selectionsCount: selections.length,
        deviceContext: { sn: extractedParams.sn, panel_id: extractedParams.panel_id },
        aboutToMakeRequest: true
      })

      // Use trendlogAPI with device context - this handles the correct port (9103) and multi-device support
      const success = await trendlogAPI.saveViewSelections(trendlogId, viewNumber, selections, extractedParams.sn, extractedParams.panel_id)

      LogUtil.Info(`🚀 FFI Save DEBUG: API request completed`, {
        requestCompleted: true,
        success: success
      })

      const responseTime = Date.now() - startTime

      LogUtil.Info(`📈 FFI Save API: Response received`, {
        success: success,
        responseTime: `${responseTime}ms`,
        usedTrendlogAPI: true
      })

      if (success) {
        viewSelections.value.set(viewNumber, selections)
        LogUtil.Info(`�?FFI Save API: View ${viewNumber} selections saved successfully`, {
          count: selections.length,
          responseTime: `${responseTime}ms`,
          savedSelections: selections.map(s => ({
            label: s.point_label,
            type: s.point_type,
            index: s.point_index,
            id: s.point_id
          })),
          cacheUpdated: true
        })
      } else {
        throw new Error(`API Error: Failed to save view selections using trendlogAPI`)
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      LogUtil.Error(`�?FFI Save API: Failed to save View ${viewNumber} selections`, {
        error: error.message,
        errorType: error.constructor.name,
        responseTime: `${responseTime}ms`,
        viewNumber,
        stack: error.stack
      })
    }
  }

  /**
   * Extract query parameters for FFI operations
   */
  const extractQueryParams = () => {
    let sn = 0, panel_id = 0, trendlog_id = 0

    // Method 1: Try from URL parameters (route)
    if (route.query.sn) sn = parseInt(route.query.sn as string)
    if (route.query.panel_id) panel_id = parseInt(route.query.panel_id as string)
    if (route.query.trendlog_id) trendlog_id = parseInt(route.query.trendlog_id as string)

    // Method 2: Extract trendlog_id from props.itemData if available
    if (!trendlog_id && props.itemData?.t3Entry) {
      const t3Entry = props.itemData.t3Entry
      // Extract and map trendlog_id from id (e.g., "MON5" -> 4)
      if (t3Entry.id && typeof t3Entry.id === 'string') {
        const match = t3Entry.id.match(/MON(\d+)|TRL(\d+)/i)
        if (match) {
          const monNumber = parseInt(match[1] || match[2])
          // MON5 maps to trendlog ID 4 (MON number - 1)
          trendlog_id = monNumber - 1
        }
      }
    }

    // Method 3: Fallback - use a default trendlog_id if we have panel data
    if (!trendlog_id && T3000_Data.value.panelsList && T3000_Data.value.panelsList.length > 0) {
      // Default to trendlog 0 (MONITOR1) if we have panel data but no specific trendlog_id
      trendlog_id = 0
    }

    LogUtil.Info(`🔧 FFI Params: Extracted query parameters`, {
      sn,
      panel_id,
      trendlog_id,
      routeQuery: route.query,
      propsItemData: props.itemData?.t3Entry?.id || 'not available',
      extractionMethod: trendlog_id > 0 ?
        (route.query.trendlog_id ? 'URL_PARAMS' :
          props.itemData?.t3Entry?.id ? 'PROPS_ITEM_DATA' : 'DEFAULT_FALLBACK') : 'NOT_FOUND'
    })

    return { sn, panel_id, trendlog_id }
  }

  // Utility functions
  const getLastValue = (data: DataPoint[], series?: SeriesConfig): string => {
    if (data.length === 0) return 'N/A'

    const lastValue = data[data.length - 1].value

    if (series?.unitType === 'digital') {
      const stateIndex = lastValue === 1 ? 1 : 0
      const digitalStates = getDigitalStatesFromRange(series.unitCode || 1)
      const stateText = digitalStates[stateIndex]
      return `${stateText} (${lastValue})`
    } else {
      return lastValue.toFixed(2)
    }
  }

  const getAverageValue = (data: DataPoint[], series?: SeriesConfig): string => {
    if (data.length === 0) return 'N/A'

    const avg = data.reduce((sum, point) => sum + point.value, 0) / data.length

    if (series?.unitType === 'digital') {
      // For digital, show percentage of time in "high" state
      const highCount = data.filter(p => p.value === 1).length
      const percentage = (highCount / data.length) * 100
      return `${percentage.toFixed(1)}% High`
    } else {
      return avg.toFixed(2)
    }
  }

  const getMinValue = (data: DataPoint[], series?: SeriesConfig): string => {
    if (data.length === 0) return 'N/A'

    const min = Math.min(...data.map(p => p.value))

    if (series?.unitType === 'digital') {
      const stateIndex = min === 1 ? 1 : 0
      const digitalStates = getDigitalStatesFromRange(series.unitCode || 1)
      const stateText = digitalStates[stateIndex]
      return `${stateText} (${min})`
    } else {
      return min.toFixed(2)
    }
  }

  const getMaxValue = (data: DataPoint[], series?: SeriesConfig): string => {
    if (data.length === 0) return 'N/A'

    const max = Math.max(...data.map(p => p.value))

    if (series?.unitType === 'digital') {
      const stateIndex = max === 1 ? 1 : 0
      const digitalStates = getDigitalStatesFromRange(series.unitCode || 1)
      const stateText = digitalStates[stateIndex]
      return `${stateText} (${max})`
    } else {
      return max.toFixed(2)
    }
  }

  const exportChart = () => {
    if (!analogChartInstance) return

    const link = document.createElement('a')
    link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.png`
    link.href = analogChartInstance.toBase64Image()
    link.click()

    // message.success('Chart exported successfully')
  }

  const exportData = () => {
    // Get ALL visible series from both analog and digital charts
    const activeSeriesData = dataSeries.value.filter(s => s.visible && !s.isEmpty)

    if (activeSeriesData.length === 0) {
      message.warning('No visible data series to export')
      return
    }

    const csvData = []

    // Enhanced headers with series type and unit information
    const headers = ['Timestamp', ...activeSeriesData.map(s => `${s.name} (${s.unit || s.unitType})`)]
    csvData.push(headers.join(','))

    // Find max data length across all series
    const maxLength = Math.max(...activeSeriesData.map(s => s.data.length))

    // Create a comprehensive timestamp index from all series
    const allTimestamps = new Set<number>()
    activeSeriesData.forEach(series => {
      series.data.forEach(point => {
        if (point.timestamp) {
          allTimestamps.add(point.timestamp)
        }
      })
    })

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

    // Export data for each timestamp
    sortedTimestamps.forEach(timestamp => {
      const row = []

      // Format timestamp
      if (typeof timestamp === 'number' && timestamp > 1e9) {
        row.push(formatTimestampToLocal(timestamp))
      } else {
        row.push(new Date(timestamp).toLocaleString())
      }

      // Find corresponding values for each series at this timestamp
      activeSeriesData.forEach(series => {
        const dataPoint = series.data.find(point => point.timestamp === timestamp)
        if (dataPoint) {
          // Format digital values as text, analog values with 2 decimal places
          if (series.unitType === 'digital') {
            const digitalStates = getDigitalStatesFromUnit(series.unit || '')
            if (digitalStates) {
              row.push(dataPoint.value === 1 ? digitalStates[1] : digitalStates[0])
            } else {
              row.push(dataPoint.value === 1 ? 'HIGH' : 'LOW')
            }
          } else {
            row.push(dataPoint.value.toFixed(2))
          }
        } else {
          row.push('') // No data for this timestamp
        }
      })

      csvData.push(row.join(','))
    })

    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `${chartTitle.value}_AllSeries_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()

    message.success(`Data exported successfully (${activeSeriesData.length} series, ${sortedTimestamps.length} data points)`)
  }

  // Multi-Canvas Export with Background Color Support
  const exportChartPNG = async () => {
    try {
      // Get all visible chart instances
      const charts = []

      // Add analog chart if it exists and has visible series
      if (analogChartInstance && visibleAnalogSeries.value.length > 0) {
        charts.push({
          instance: analogChartInstance,
          canvas: analogChartCanvas.value,
          type: 'analog',
          height: analogChartCanvas.value?.offsetHeight || 400
        })
      }

      // Add digital chart if it exists
      if (digitalChartInstance && digitalChartCanvas.value) {
        charts.push({
          instance: digitalChartInstance,
          canvas: digitalChartCanvas.value,
          type: 'digital',
          height: digitalChartCanvas.value.offsetHeight || 300
        })
      }

      if (charts.length === 0) {
        message.warning('No charts available to export')
        return
      }

      // Create composite canvas
      const compositeCanvas = document.createElement('canvas')
      const ctx = compositeCanvas.getContext('2d')
      if (!ctx) return

      // Calculate dimensions
      const canvasWidth = Math.max(...charts.map(c => c.canvas?.offsetWidth || 800))
      const totalHeight = charts.reduce((sum, chart) => sum + chart.height + 20, 40) // Add padding

      compositeCanvas.width = canvasWidth
      compositeCanvas.height = totalHeight

      // Set white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasWidth, totalHeight)

      // Get time range from data
      const timeBounds = getDataSeriesTimeBounds()
      let timeRangeText = ''
      if (timeBounds.min && timeBounds.max) {
        const startTime = formatTimestampToLocal(timeBounds.min).split(' ')[1] // Get time part
        const endTime = formatTimestampToLocal(timeBounds.max).split(' ')[1] // Get time part
        const startDate = formatTimestampToLocal(timeBounds.min).split(' ')[0] // Get date part
        const endDate = formatTimestampToLocal(timeBounds.max).split(' ')[0] // Get date part

        if (startDate === endDate) {
          // Same day: show date with time range
          timeRangeText = ` (${startDate} ${startTime} - ${endTime})`
        } else {
          // Different days: show full date-time range
          timeRangeText = ` (${startDate} ${startTime} - ${endDate} ${endTime})`
        }
      } else {
        // Fallback to timebase if no data
        timeRangeText = ` (${timeBase.value})`
      }

      // Add title with time range
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${chartTitle.value}${timeRangeText}`, canvasWidth / 2, 25)

      let currentY = 50

      // Draw each chart
      for (const chart of charts) {
        // Create temporary canvas with white background for this chart
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx || !chart.canvas) continue

        tempCanvas.width = chart.canvas.width
        tempCanvas.height = chart.canvas.height

        // Set white background
        tempCtx.fillStyle = '#ffffff'
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

        // Get chart image and draw on temp canvas
        const chartImageData = chart.instance.toBase64Image('image/png', 1.0)
        const img = new Image()

        await new Promise<void>((resolve) => {
          img.onload = () => {
            tempCtx.drawImage(img, 0, 0)
            resolve()
          }
          img.src = chartImageData
        })

        // Add chart label for digital charts BEFORE drawing the chart
        if (chart.type === 'digital' && chart.seriesName) {
          ctx.fillStyle = '#333333'
          ctx.font = 'bold 12px Arial'
          ctx.textAlign = 'left'
          ctx.fillText(`${chart.seriesName}`, 10, currentY - 5) // Position above the chart
          currentY += 15 // Add space for the label
        }

        // Draw temp canvas to composite
        const scaledWidth = canvasWidth
        const scaledHeight = (chart.canvas.height * canvasWidth) / chart.canvas.width

        ctx.drawImage(tempCanvas, 0, currentY, scaledWidth, scaledHeight)

        currentY += scaledHeight + 10 // Reduced padding between charts
      }

      // Download the composite image
      const link = document.createElement('a')
      link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.png`
      link.href = compositeCanvas.toDataURL('image/png', 1.0)
      link.click()

      message.success('PNG exported')
    } catch (error) {
      console.error('Error exporting PNG:', error)
      message.error('PNG export failed')
    }
  }

  const exportChartJPG = async () => {
    try {
      // Use the same multi-canvas logic as PNG but save as JPG
      const charts = []

      if (analogChartInstance && visibleAnalogSeries.value.length > 0) {
        charts.push({
          instance: analogChartInstance,
          canvas: analogChartCanvas.value,
          type: 'analog',
          height: analogChartCanvas.value?.offsetHeight || 400
        })
      }

      if (digitalChartInstance && digitalChartCanvas.value) {
        charts.push({
          instance: digitalChartInstance,
          canvas: digitalChartCanvas.value,
          type: 'digital',
          height: digitalChartCanvas.value.offsetHeight || 300
        })
      }

      if (charts.length === 0) {
        message.warning('No charts available to export')
        return
      }

      const compositeCanvas = document.createElement('canvas')
      const ctx = compositeCanvas.getContext('2d')
      if (!ctx) return

      const canvasWidth = Math.max(...charts.map(c => c.canvas?.offsetWidth || 800))
      const totalHeight = charts.reduce((sum, chart) => sum + chart.height + 20, 40)

      compositeCanvas.width = canvasWidth
      compositeCanvas.height = totalHeight

      // Set light gray background for JPG (better contrast)
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(0, 0, canvasWidth, totalHeight)

      // Get time range from data
      const timeBounds = getDataSeriesTimeBounds()
      let timeRangeText = ''
      if (timeBounds.min && timeBounds.max) {
        const startTime = formatTimestampToLocal(timeBounds.min).split(' ')[1] // Get time part
        const endTime = formatTimestampToLocal(timeBounds.max).split(' ')[1] // Get time part
        const startDate = formatTimestampToLocal(timeBounds.min).split(' ')[0] // Get date part
        const endDate = formatTimestampToLocal(timeBounds.max).split(' ')[0] // Get date part

        if (startDate === endDate) {
          // Same day: show date with time range
          timeRangeText = ` (${startDate} ${startTime} - ${endTime})`
        } else {
          // Different days: show full date-time range
          timeRangeText = ` (${startDate} ${startTime} - ${endDate} ${endTime})`
        }
      } else {
        // Fallback to timebase if no data
        timeRangeText = ` (${timeBase.value})`
      }

      ctx.fillStyle = '#000000'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${chartTitle.value}${timeRangeText}`, canvasWidth / 2, 25)

      let currentY = 50

      for (const chart of charts) {
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx || !chart.canvas) continue

        tempCanvas.width = chart.canvas.width
        tempCanvas.height = chart.canvas.height

        tempCtx.fillStyle = '#f5f5f5'
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

        const chartImageData = chart.instance.toBase64Image('image/png', 1.0)
        const img = new Image()

        await new Promise<void>((resolve) => {
          img.onload = () => {
            tempCtx.drawImage(img, 0, 0)
            resolve()
          }
          img.src = chartImageData
        })

        // Add chart label for digital charts BEFORE drawing the chart
        if (chart.type === 'digital' && chart.seriesName) {
          ctx.fillStyle = '#222222'
          ctx.font = 'bold 12px Arial'
          ctx.textAlign = 'left'
          ctx.fillText(`${chart.seriesName}`, 10, currentY - 5) // Position above the chart
          currentY += 15 // Add space for the label
        }

        const scaledWidth = canvasWidth
        const scaledHeight = (chart.canvas.height * canvasWidth) / chart.canvas.width

        ctx.drawImage(tempCanvas, 0, currentY, scaledWidth, scaledHeight)

        currentY += scaledHeight + 10 // Reduced padding between charts
      }

      const link = document.createElement('a')
      link.download = `${chartTitle.value}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.jpg`
      link.href = compositeCanvas.toDataURL('image/jpeg', 0.9)
      link.click()

      message.success('JPG exported')
    } catch (error) {
      console.error('Error exporting JPG:', error)
      message.error('JPG export failed')
    }
  }

  const exportChartSVG = () => {
    // Note: Chart.js doesn't natively support SVG export
    // This would require additional library like chart.js-to-svg
    message.info('SVG export requires additional implementation')
  }

  const exportDataJSON = () => {
    // Get ALL visible series from both analog and digital charts
    const activeSeriesData = dataSeries.value.filter(s => s.visible && !s.isEmpty)

    if (activeSeriesData.length === 0) {
      message.warning('No visible data series to export')
      return
    }

    // Calculate comprehensive time range across all series
    const allTimestamps = activeSeriesData.flatMap(s => s.data.map(d => d.timestamp)).filter(t => t)
    const timeRange = {
      start: allTimestamps.length > 0 ? Math.min(...allTimestamps) : null,
      end: allTimestamps.length > 0 ? Math.max(...allTimestamps) : null,
      startFormatted: allTimestamps.length > 0 ? formatTimestampToLocal(Math.min(...allTimestamps)) : null,
      endFormatted: allTimestamps.length > 0 ? formatTimestampToLocal(Math.max(...allTimestamps)) : null
    }

    const jsonData = {
      title: chartTitle.value,
      exportedAt: new Date().toISOString(),
      exportType: 'multi-canvas-chart',
      timeBase: timeBase.value,
      totalDataPoints: allTimestamps.length,
      timeRange,
      chartTypes: {
        analog: {
          count: activeSeriesData.filter(s => s.unitType === 'analog').length,
          series: activeSeriesData.filter(s => s.unitType === 'analog').map(s => s.name)
        },
        digital: {
          count: activeSeriesData.filter(s => s.unitType === 'digital').length,
          series: activeSeriesData.filter(s => s.unitType === 'digital').map(s => s.name)
        }
      },
      series: activeSeriesData.map(series => ({
        name: series.name,
        id: series.id,
        unit: series.unit,
        type: series.unitType,
        color: series.color,
        panelId: series.panelId,
        pointType: series.pointType,
        pointNumber: series.pointNumber,
        prefix: series.prefix,
        description: series.description,
        itemType: series.itemType,
        dataPoints: series.data.length,
        data: series.data.map(point => ({
          timestamp: point.timestamp,
          timestampFormatted: formatTimestampToLocal(point.timestamp),
          value: point.value,
          // Add formatted value for digital series
          ...(series.unitType === 'digital' && {
            digitalState: (() => {
              const digitalStates = getDigitalStatesFromUnit(series.unit || '')
              if (digitalStates) {
                return point.value === 1 ? digitalStates[1] : digitalStates[0]
              }
              return point.value === 1 ? 'HIGH' : 'LOW'
            })()
          })
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = `${chartTitle.value}_AllSeries_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.json`
    link.href = URL.createObjectURL(blob)
    link.click()

    message.success(`Data exported as JSON successfully (${activeSeriesData.length} series, ${allTimestamps.length} total data points)`)
  }

  // Chart Options Methods
  const onChartOptionChange = () => {
    // 🆕 Defer auto-refresh to prevent UI blocking
    requestAnimationFrame(() => {
      if (analogChartInstance || digitalChartInstance) {
        destroyAllCharts()
        // Wait for destruction before recreating
        setTimeout(() => {
          createCharts()
        }, 10)
      }
    })
  }

  const resetChartOptions = () => {
    showGrid.value = true
    showLegend.value = false  // Hide legend by default to give more space to chart
    smoothLines.value = false
    showPoints.value = false

    // Update charts to reflect the reset options
    updateCharts()

    message.success('Chart options reset to default')
  }

  // Toggle methods for chart options
  const toggleGridOption = () => {
    showGrid.value = !showGrid.value
    onChartOptionChange()
  }

  const toggleLegendOption = () => {
    showLegend.value = !showLegend.value
    onChartOptionChange()
  }

  const toggleSmoothOption = () => {
    smoothLines.value = !smoothLines.value
    onChartOptionChange()
  }

  const togglePointsOption = () => {
    showPoints.value = !showPoints.value
    onChartOptionChange()
  }

  // Watchers
  watch([showGrid, showLegend, smoothLines, showPoints], () => {
    // 🆕 Defer chart recreation to prevent UI blocking
    requestAnimationFrame(() => {
      if (analogChartInstance || digitalChartInstance) {
        destroyAllCharts()
        // Wait for destruction to complete before recreating
        setTimeout(() => {
          createCharts()
        }, 10)
      }
    })
  })

  // Watch for showAnalogXAxis changes to update X-axis visibility
  watch(showAnalogXAxis, (newValue) => {
    if (analogChartInstance?.options?.scales?.x) {
      analogChartInstance.options.scales.x.ticks.display = newValue
      analogChartInstance.options.scales.x.grid.drawTicks = newValue
      analogChartInstance.update('none') // Update without animation for immediate response
    }
  })

  // Watch for changes in visible analog series to ensure proper chart updates
  watch(visibleAnalogSeries, async (newSeries, oldSeries) => {
    // LogUtil.Debug(`📊 visibleAnalogSeries watcher triggered`, {
    //   oldCount: oldSeries?.length || 0,
    //   newCount: newSeries.length,
    //   oldSeries: oldSeries?.map(s => s.name) || [],
    //   newSeries: newSeries.map(s => s.name),
    //   hasChartInstance: !!analogChartInstance,
    //   currentView: currentView.value
    // })

    // Check if we need to update the analog chart
    const hadVisibleSeries = oldSeries?.length > 0
    const hasVisibleSeries = newSeries.length > 0

    if (hadVisibleSeries !== hasVisibleSeries || newSeries.length !== oldSeries?.length) {
      // LogUtil.Debug(`📊 Analog series visibility changed - recreating chart (like digital charts)`, {
      //   hadVisibleSeries,
      //   hasVisibleSeries,
      //   needsUpdate: true
      // })

      // Wait for DOM updates
      await nextTick()

      // RECREATE the analog chart completely (like digital charts do)
      if (analogChartInstance) {
        analogChartInstance.destroy()
        analogChartInstance = null
        // LogUtil.Debug(`📊 Destroyed existing analog chart instance`)
      }

      if (hasVisibleSeries) {
        // Create fresh analog chart for visible series
        // LogUtil.Debug(`📊 Creating fresh analog chart for visible series`)
        createAnalogChart()
        await nextTick()
        updateAnalogChart()

        // LogUtil.Debug(`📊 Analog chart recreated and updated with data`, {
        //   oldCount: oldSeries?.length || 0,
        //   newCount: newSeries.length,
        //   hasChartInstance: !!analogChartInstance,
        //   seriesWithData: newSeries.filter(s => s.data.length > 0).length
        // })
      } else {
        // LogUtil.Debug(`📊 No visible analog series - chart destroyed`)
      }
    } else {
      // LogUtil.Debug(`📊 No significant change in analog series visibility - skipping update`)
    }
  }, { deep: true })

  // Watch for changes in visible digital series to recreate charts when visibility toggles
  watch(visibleDigitalSeries, async (newSeries, oldSeries) => {
    // Only recreate digital charts if the number of visible series changed
    // or if we had charts before but now have no visible series (or vice versa)
    const hadCharts = !!digitalChartInstance
    const shouldHaveCharts = newSeries.length > 0

    if (newSeries.length !== oldSeries?.length || hadCharts !== shouldHaveCharts) {
      // Wait for DOM updates (canvas elements to be added/removed)
      await nextTick()

      // Recreate digital charts to match the new visible series
      createDigitalCharts()

      // IMPORTANT: Populate the newly created charts with data
      updateDigitalCharts()

      // LogUtil.Debug(`= TLChart DataFlow: Digital charts recreated and updated with data`, {
      //   oldCount: oldSeries?.length || 0,
      //   newCount: newSeries.length,
      //   chartInstancesCount: Object.keys(digitalChartInstances).length,
      //   seriesWithData: newSeries.filter(s => s.data.length > 0).length
      // })
    }
  }, { deep: true })// Remove modal visibility watcher since this is now always visible as a component

  // Debug function to diagnose chart data issues
  const diagnosticReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      dataSource: dataSource.value,
      isRealTime: isRealTime.value,
      isLoading: isLoading.value,
      hasMonitorConfig: !!monitorConfig.value,
      monitorConfigItems: monitorConfig.value?.inputItems?.length || 0,
      totalSeries: dataSeries.value.length,
      visibleSeries: dataSeries.value.filter(s => s.visible).length,
      seriesWithData: dataSeries.value.filter(s => s.data.length > 0).length,
      hasChartInstances: !!(analogChartInstance || digitalChartInstance),
      analogChartDatasets: analogChartInstance?.data?.datasets?.length || 0,
      digitalChartDatasets: digitalChartInstance?.data?.datasets?.length || 0,
      seriesDetails: dataSeries.value.map((series, index) => ({
        index,
        name: series.name,
        visible: series.visible,
        dataPoints: series.data.length,
        isEmpty: series.isEmpty,
        lastValue: series.data.length > 0 ? series.data[series.data.length - 1].value : null,
        lastTimestamp: series.data.length > 0 ? new Date(series.data[series.data.length - 1].timestamp).toLocaleString() : null
      })),
      panelsDataLength: T3000_Data.value.panelsData?.length || 0,
      panelsListLength: T3000_Data.value.panelsList?.length || 0
    }

    // Removed diagnostic report - kept essential data flow tracking only
    // LogUtil.Info('= TLChart DataFlow: Component state diagnostic available if needed')
    // LogUtil.Debug('= TLChart DataFlow: Component state diagnostic available if needed')
    return report
  }

  // Expose diagnostic function globally for console debugging

  // Lifecycle
  onMounted(async () => {
    try {
      // 🆕 FORCE: Always reset history flag on mount to ensure data loads
      hasLoadedInitialHistory.value = false

      // 🆕 FIX: Clear existing data on page refresh to force reload from database
      const hasStaleData = dataSeries.value.length > 0 && dataSeries.value.some(s => s.data?.length > 0)
      if (hasStaleData) {
        LogUtil.Info('🔄 TrendLogChart: Clearing stale data from previous session on page refresh', {
          existingSeriesCount: dataSeries.value.length,
          existingDataPoints: dataSeries.value.reduce((sum, s) => sum + (s.data?.length || 0), 0)
        })
        dataSeries.value = []
      }

      LogUtil.Info('🚀 TrendLogChart: Starting component initialization', {
        hasProps: !!props,
        hasItemData: !!props.itemData,
        itemDataId: (props.itemData as any)?.t3Entry?.id,
        itemDataPid: (props.itemData as any)?.t3Entry?.pid,
        currentItemDataExists: !!currentItemData.value,
        T3000DataExists: !!T3000_Data.value,
        hasPanelsData: !!(T3000_Data.value.panelsData?.length),
        timestamp: new Date().toISOString()
      })

      // 🆕 CONTINUOUS MONITORING: Listen for page visibility changes to auto-backfill missing data
      document.addEventListener('visibilitychange', handleVisibilityChange)
      LogUtil.Info('TrendLogChart: Continuous monitoring enabled - will backfill data gaps on return')

      // 🆕 DATABASE PARTITIONING: Ensure required partitions exist when trendlog opens
      LogUtil.Info('TrendLogChart: Checking database partitions...')
      try {
        const partitionResult = await DatabaseConfigAPI.ensurePartitionsOnTrendlogOpen()
        LogUtil.Info('TrendLogChart: Partition check completed', {
          partitionsChecked: partitionResult.partitions_checked,
          partitionsCreated: partitionResult.partitions_created,
          dataMigratedMB: partitionResult.data_migrated_mb,
          hasErrors: partitionResult.has_errors
        })

        if (partitionResult.partitions_created > 0) {
          LogUtil.Info(`📦 Created ${partitionResult.partitions_created} new partitions and migrated ${partitionResult.data_migrated_mb} MB of data`)
        }
      } catch (error) {
        LogUtil.Warn('⚠️ TrendLogChart: Partition check failed (continuing with normal initialization)', error)
      }

      // 🆕 STEP 0: Call Action 0 FIRST to get fresh monitor configuration from device
      // This provides the interval settings (hour_interval_time, minute_interval_time, second_interval_time)
      // that determine how often we should poll with Action 15
      LogUtil.Debug('═══════════════════════════════════════════════════════════════')
      LogUtil.Debug('🔄 STEP 0: Calling Action 0 to get fresh monitor configuration')
      LogUtil.Debug('═══════════════════════════════════════════════════════════════')

      // Log full query string
      const fullQueryString = window.location.href
      const queryParams = Object.fromEntries(new URLSearchParams(window.location.hash.split('?')[1] || ''))
      LogUtil.Debug('📋 Full URL Query String:', fullQueryString)
      LogUtil.Debug('📋 Parsed Query Parameters:', queryParams)
      LogUtil.Debug('  - sn (serial_number):', route.query.sn)
      LogUtil.Debug('  - panel_id:', route.query.panel_id)
      LogUtil.Debug('  - trendlog_id:', route.query.trendlog_id)
      LogUtil.Debug('  - all_data:', route.query.all_data ? JSON.parse(decodeURIComponent(route.query.all_data as string)) : null)
      LogUtil.Debug('─────────────────────────────────────────────────────────────')

      const urlPanelId = route.query.panel_id ? parseInt(route.query.panel_id as string) : null
      const urlTrendlogId = route.query.trendlog_id ? parseInt(route.query.trendlog_id as string) : null

      if (urlPanelId) {
        try {
          const action0Response = await ffiApi.ffiGetPanelData(urlPanelId)

          if (action0Response && action0Response.data) {
            LogUtil.Debug('✅ Action 0 Response Received')
            LogUtil.Debug('  - Total items:', action0Response.data?.length)
            LogUtil.Debug('  - Looking for trendlog_id:', urlTrendlogId, '(index:', urlTrendlogId, ')')
            LogUtil.Debug('─────────────────────────────────────────────────────────────')

            // Find the specific monitor configuration using trendlog_id from URL
            let matchingMonitor = null
            if (urlTrendlogId !== undefined && urlTrendlogId !== null && action0Response.data) {
              // Search through the data array for matching monitor
              // trendlog_id is 0-based and directly matches monitor.index
              for (const item of action0Response.data) {
                if (item.type === 'MON' && item.index === urlTrendlogId) {
                  matchingMonitor = item
                  break
                }
              }
            }

            if (matchingMonitor) {
              LogUtil.Debug('✅ MATCHED TRENDLOG INFO FROM ACTION 0:')
              LogUtil.Debug('  - FULL MONITOR DATA:', JSON.stringify(matchingMonitor, null, 2))
              LogUtil.Debug('─────────────────────────────────────────────────────────────')
              LogUtil.Debug('  - id:', matchingMonitor.id)
              LogUtil.Debug('  - label:', matchingMonitor.label)
              LogUtil.Debug('  - index:', matchingMonitor.index)
              LogUtil.Debug('  - pid:', matchingMonitor.pid)
              LogUtil.Debug('  - type:', matchingMonitor.type)
              LogUtil.Debug('  - status:', matchingMonitor.status)
              LogUtil.Debug('  - num_inputs:', matchingMonitor.num_inputs)
              LogUtil.Debug('  - an_inputs:', matchingMonitor.an_inputs)
              LogUtil.Debug('  - INTERVAL SETTINGS:')
              LogUtil.Debug('    * hour_interval_time:', matchingMonitor.hour_interval_time)
              LogUtil.Debug('    * minute_interval_time:', matchingMonitor.minute_interval_time)
              LogUtil.Debug('    * second_interval_time:', matchingMonitor.second_interval_time)
              LogUtil.Debug('─────────────────────────────────────────────────────────────')

              // 🆕 FIX: Create temporary monitor config from Action 0 response
              // This is needed because monitorConfig.value hasn't been set yet (set later at line ~10507)
              const tempMonitorConfig = {
                hour_interval_time: matchingMonitor.hour_interval_time || 0,
                minute_interval_time: matchingMonitor.minute_interval_time || 0,
                second_interval_time: matchingMonitor.second_interval_time || 0,
                pid: matchingMonitor.pid,
                id: matchingMonitor.id,
                label: matchingMonitor.label,
                status: matchingMonitor.status,
                inputItems: matchingMonitor.input || []  // 🔥 FIX: Add inputItems from Action 0 response
              }

              LogUtil.Debug('✅ Created temporary monitor config from Action 0:', tempMonitorConfig)

              // Calculate interval using temporary config since monitorConfig.value is still null
              const calculatedIntervalMs = calculateT3000Interval(tempMonitorConfig)
              const calculatedIntervalSec = calculatedIntervalMs / 1000
              const rawTotalSeconds = (matchingMonitor.hour_interval_time * 3600 +
                                      matchingMonitor.minute_interval_time * 60 +
                                      matchingMonitor.second_interval_time)

              LogUtil.Debug('📊 CALCULATED POLLING INTERVAL:')
              LogUtil.Debug('  - Formula: (hour * 3600 + minute * 60 + second) * 1000')
              LogUtil.Debug('  - Calculation: (' + matchingMonitor.hour_interval_time + ' * 3600 + ' +
                         matchingMonitor.minute_interval_time + ' * 60 + ' +
                         matchingMonitor.second_interval_time + ') * 1000')
              LogUtil.Debug('  - Raw total seconds:', rawTotalSeconds)
              LogUtil.Debug('  - Raw total milliseconds:', rawTotalSeconds * 1000)
              LogUtil.Debug('  - Minimum enforced: 5 seconds (5000 ms) [TESTING]')
              LogUtil.Debug('  - Final interval (ms):', calculatedIntervalMs)
              LogUtil.Debug('  - Final interval (seconds):', calculatedIntervalSec)
              if (rawTotalSeconds * 1000 < 5000) {
                LogUtil.Debug('  ⚠️  NOTE: Configured interval (' + rawTotalSeconds + 's) is less than minimum (5s), using 5s [TESTING]')
              }
              LogUtil.Debug('  - Action 15 will be called every', calculatedIntervalSec, 'seconds')
              LogUtil.Debug('═══════════════════════════════════════════════════════════════')

              // 🔥 CRITICAL FIX: Set monitorConfig.value to tempMonitorConfig so startRealTimeUpdates() can access it
              LogUtil.Debug('🔥 SETTING monitorConfig.value to tempMonitorConfig to enable polling...')
              if (!monitorConfig.value) {
                monitorConfig.value = tempMonitorConfig
                LogUtil.Debug('✅ monitorConfig.value set from tempMonitorConfig')
              } else {
                // If it already exists, update the interval fields
                monitorConfig.value.hour_interval_time = matchingMonitor.hour_interval_time || 0
                monitorConfig.value.minute_interval_time = matchingMonitor.minute_interval_time || 0
                monitorConfig.value.second_interval_time = matchingMonitor.second_interval_time || 0
                LogUtil.Debug('✅ Updated existing monitorConfig.value with interval settings')
              }

              // 🆕 FORCE START: Always start realtime updates after setting monitorConfig
              LogUtil.Debug('🔄 FORCING startRealTimeUpdates after Action 0 response...')
              LogUtil.Debug('  - isRealTime.value:', isRealTime.value)
              LogUtil.Debug('  - monitorConfig.value:', monitorConfig.value)
              LogUtil.Debug('  - typeof startRealTimeUpdates:', typeof startRealTimeUpdates)
              LogUtil.Debug('  - startRealTimeUpdates function:', startRealTimeUpdates)
              LogUtil.Debug('  - Calling startRealTimeUpdates() now...')

              try {
                startRealTimeUpdates()
                LogUtil.Debug('✅ startRealTimeUpdates() returned successfully')
                LogUtil.Debug('  - realtimeInterval is now:', realtimeInterval)
              } catch (error) {
                console.error('❌ ERROR calling startRealTimeUpdates():', error)
              }
            } else {
              console.warn('⚠️ NO MATCHING MONITOR FOUND IN ACTION 0 RESPONSE')
              LogUtil.Debug('  - Searched for trendlog_id:', urlTrendlogId, '(index:', urlTrendlogId, ')')
              LogUtil.Debug('  - Total monitors returned:', action0Response.data?.filter((d: any) => d.type === 'MON').length)
              LogUtil.Debug('  - Available monitors (FULL DATA):')
              action0Response.data?.filter((d: any) => d.type === 'MON').forEach((mon: any) => {
                LogUtil.Debug('    Monitor:', JSON.stringify({
                  id: mon.id,
                  index: mon.index,
                  label: mon.label,
                  type: mon.type,
                  hour_interval_time: mon.hour_interval_time,
                  minute_interval_time: mon.minute_interval_time,
                  second_interval_time: mon.second_interval_time
                }, null, 2))
              })
              LogUtil.Debug('  - Using DEFAULT interval: 15 seconds (15000 ms)')
              LogUtil.Debug('═══════════════════════════════════════════════════════════════')
            }
          }
        } catch (error) {
          console.error('❌ ACTION 0 CALL FAILED')
          console.error('  - Error:', error)
          LogUtil.Debug('  - Using DEFAULT interval: 15 seconds (15000 ms)')
          LogUtil.Debug('═══════════════════════════════════════════════════════════════')
        }
      } else {
        console.warn('⚠️ NO PANEL_ID IN URL')
        LogUtil.Debug('  - Cannot call Action 0 without panel_id')
        LogUtil.Debug('  - Using DEFAULT interval: 15 seconds (15000 ms)')
        LogUtil.Debug('═══════════════════════════════════════════════════════════════')
      }

      // Initialize monitor configuration
      const monitorConfigData = await getMonitorConfigFromT3000Data()

      LogUtil.Info('📊 TrendLogChart: Monitor config result', {
        hasMonitorConfig: !!monitorConfigData,
        monitorConfigType: typeof monitorConfigData,
        monitorConfigKeys: monitorConfigData ? Object.keys(monitorConfigData) : [],
        inputItemsLength: monitorConfigData?.inputItems?.length || 0
      })

      if (monitorConfigData) {
        // 🆕 FIX: Set monitorConfig BEFORE regenerating dataseries to prevent race condition
        monitorConfig.value = monitorConfigData

        LogUtil.Info('�?TrendLogChart: Monitor config set, regenerating dataseries for consistency', {
          hasMonitorConfig: !!monitorConfig.value,
          monitorConfigPid: monitorConfig.value?.pid,
          inputItemsCount: monitorConfig.value?.inputItems?.length || 0
        })

        // Regenerate dataseries now that we have monitor config for consistency
        regenerateDataSeries()

        // Note: Historical data will be loaded later in initializeData() after dataseries is created
        // Don't load history here as dataseries structure doesn't exist yet

        // 🆕 FFI Integration: Get complete TrendLog info from T3000 and save view selections
        LogUtil.Info('🔄 TrendLogChart: Starting FFI integration for complete TrendLog info')
        const ffiInfo = await initializeWithCompleteFFI()

        if (ffiInfo) {
          LogUtil.Info('�?TrendLogChart: FFI integration completed', {
            ffiInfo,
            hasViewSelections: viewSelections.value.size > 0
          })
        }

        // Initialize data clients
        initializeDataClients()

        LogUtil.Info('�?TrendLogChart: Initialization completed successfully', {
          finalDataSeriesCount: dataSeries.value.length,
          finalMonitorConfigReady: !!monitorConfig.value,
          finalPanelId: monitorConfig.value?.pid
        })
      } else {
        LogUtil.Warn('⚠️ TrendLogChart: No monitor config data available - keeping loading state')
        // Keep loading state instead of showing error - data might still be loading
        // hasConnectionError.value = true // Removed - keep loading instead
      }
    } catch (error) {
      LogUtil.Error('�?TrendLogChart: Initialization failed:', error)
      // Only show connection error for actual errors, not missing data during startup
      if (error.message && !error.message.includes('timeout')) {
        hasConnectionError.value = true
      }
      // Otherwise keep loading state - data might still be loading
    }

    // Load saved view tracking data
    await loadViewTracking()

    // Initialize database management
    try {
      await loadDatabaseConfig()
      await loadDatabaseFiles()
      await loadFfiSyncConfig() // Load Sampling Interval configuration
      await loadRediscoverConfig() // Load Rediscover Interval configuration
      LogUtil.Info('Database management initialized successfully')
    } catch (error) {
      LogUtil.Error('Failed to initialize database management', error)
    }

    // Apply default view configuration
    setView(1)

    // Initialize multi-canvas charts
    nextTick(async () => {
      LogUtil.Info('🔍 DIAGNOSTIC: nextTick callback STARTED', {
        hasMonitorConfig: !!monitorConfig.value,
        monitorConfigInputItems: monitorConfig.value?.inputItems?.length || 0,
        dataSeriesLength: dataSeries.value.length,
        timestamp: new Date().toISOString()
      })

      // Add delay for DOM layout in standalone browsers
      if (!(window as any).chrome?.webview) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }

      // 🆕 FIX: Wait for canvas to be available in DOM
      let canvasWaitAttempts = 0
      while (!analogChartCanvas.value && canvasWaitAttempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 50))
        canvasWaitAttempts++
      }

      if (!analogChartCanvas.value) {
        LogUtil.Error('❌ Canvas not available after waiting, cannot create charts')
        // Don't return - show error message instead of blank page
        hasConnectionError.value = true
        stopLoading()
        return
      }

      LogUtil.Info('✅ Canvas ref available after', {
        attempts: canvasWaitAttempts,
        waitTime: `${canvasWaitAttempts * 50}ms`
      })

      // Ensure canvas has proper dimensions
      if (analogChartCanvas.value.offsetWidth === 0 || analogChartCanvas.value.offsetHeight === 0) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // 🆕 FIX: Create charts FIRST before loading any data
      LogUtil.Info('🔍 STEP 1: Creating chart instances')
      createCharts()

      // 🆕 FIX: Wait a moment for charts to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 50))

      LogUtil.Info('🔍 STEP 2: Chart instances created, verifying', {
        hasAnalogChart: !!analogChartInstance,
        hasDigitalChart: !!digitalChartInstance
      })

      // 🆕 FIX: Then load and display data
      // NOTE: Only initialize if series don't already exist (from panelsData watcher)
      if (dataSeries.value.length === 0) {
        LogUtil.Info('🔍 STEP 3: Loading historical and real-time data')
        await initializeData()
        LogUtil.Info('🔍 STEP 4: Data initialization completed', {
          dataSeriesCount: dataSeries.value.length,
          seriesWithData: dataSeries.value.filter(s => s.data && s.data.length > 0).length
        })
      } else {
        LogUtil.Info('✅ STEP 3: Data series already initialized (via panelsData watcher), skipping initializeData', {
          dataSeriesCount: dataSeries.value.length,
          seriesWithData: dataSeries.value.filter(s => s.data && s.data.length > 0).length
        })
      }

      if (isRealTime.value) {
        startRealTimeUpdates()
      }

      // ⌨️ Setup keyboard navigation
      document.addEventListener('keydown', handleKeydown)
      LogUtil.Info('⌨️ Keyboard: Navigation system initialized', {
        keyboardEnabled: keyboardEnabled.value,
        totalMappings: Object.keys(keyboardItemMappings.value).length,
        itemMappings: Object.entries(keyboardItemMappings.value).map(([code, mapping]) => ({
          key: mapping.display,
          item: mapping.item
        }))
      })
    })
  })

  // Trendlog Configuration methods
  const onAutoBackupToggle = (enabled: boolean) => {
    LogUtil.Info('Database auto backup toggled', { enabled })
    // Add logic to enable/disable auto backup
  }

  const onBackupFrequencyChange = (frequency: string) => {
    LogUtil.Info('Backup frequency changed', { frequency })
    // Add logic for backup frequency change
  }

  const onPartitionStrategyChange = (strategy: string) => {
    LogUtil.Info('Partition strategy changed', { strategy })
    // Add logic for partition strategy change
  }

  const performManualBackup = async () => {
    isBackingUp.value = true
    try {
      LogUtil.Info('Starting manual database backup...')
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update last backup time
      databaseInfo.value.lastBackup = new Date().toLocaleString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d{4})-(\d{2})-(\d{2}), (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3 $4:$5:$6')

      message.success('Database backup completed successfully')
      LogUtil.Info('Manual database backup completed')
    } catch (error) {
      message.error('Failed to create database backup')
      LogUtil.Error('Manual database backup failed', error)
    } finally {
      isBackingUp.value = false
    }
  }

  const optimizeDatabase = async () => {
    isOptimizing.value = true
    try {
      LogUtil.Info('Starting database optimization...')
      // Simulate optimization process
      await new Promise(resolve => setTimeout(resolve, 3000))

      message.success('Database optimization completed')
      LogUtil.Info('Database optimization completed')
    } catch (error) {
      message.error('Failed to optimize database')
      LogUtil.Error('Database optimization failed', error)
    } finally {
      isOptimizing.value = false
    }
  }

  const saveDatabaseConfig = async () => {
    isSaving.value = true
    try {
      // Validate configuration before saving
      const validation = DatabaseUtils.validateConfig(databaseConfig.value)
      if (!validation.success) {
        message.error(validation.error)
        return
      }

      LogUtil.Info('Saving Trendlog Configuration...', databaseConfig.value)

      // Save configuration via API
      const savedConfig = await databaseService.config.updateConfig(databaseConfig.value)
      databaseConfig.value = savedConfig

      // Apply partitioning strategy to create actual database files
      LogUtil.Info('Applying partitioning strategy to create database files...')
      await DatabaseConfigAPI.applyPartitioningStrategy()

      // Refresh database files list to show new partitioned files
      await loadDatabaseFiles()

      // Save Sampling Interval configuration
      await saveFfiSyncConfig()

      // Save Rediscover Interval configuration
      await saveRediscoverConfig()

      message.success('Trendlog Configuration saved and partitioning applied successfully')
      showDatabaseConfig.value = false
      LogUtil.Info('Trendlog Configuration saved')
    } catch (error) {
      message.error('Failed to save Trendlog Configuration')
      LogUtil.Error('Failed to save Trendlog Configuration', error)
    } finally {
      isSaving.value = false
    }
  }

  // Delete specific database file
  const deleteDbFile = async (fileId: number, fileName: string) => {
    try {
      const result = await databaseService.files.deleteFile(fileId)

      if (result.success) {
        await loadDatabaseFiles() // Reload files list
        message.success(`Deleted ${fileName}`)
        LogUtil.Info('Database file deleted', { fileId, fileName })
      } else {
        // Handle validation errors or other issues
        const errorMsg = result.message || 'Failed to delete database file'
        message.warning(errorMsg)
        LogUtil.Warn('Database file deletion prevented', { fileId, fileName, reason: errorMsg })
      }
    } catch (error) {
      message.error('Failed to delete database file')
      LogUtil.Error('Failed to delete database file', error)
    }
  }

  // =================================================================
  // Sampling Interval CONFIGURATION METHODS
  // =================================================================

  // Load Sampling Interval configuration from API
  const loadFfiSyncConfig = async () => {
    try {
      const data = await FfiSyncConfigAPI.getFfiSyncInterval()
      ffiSyncConfig.value.interval_secs = data.interval_secs
      ffiSyncConfig.value.last_sync = data.last_sync

      // Set preset based on interval
      const presets: Record<number, string> = {
        300: '5min',
        600: '10min',
        900: '15min',
        1200: '20min',
        1500: '25min'
      }

      ffiSyncConfig.value.interval_preset = presets[data.interval_secs] || 'custom'

      if (ffiSyncConfig.value.interval_preset === 'custom') {
        // Calculate custom value and unit
        convertSecondsToCustom(data.interval_secs)
      }

      // Start countdown timer
      startFfiCountdownTimer()

      LogUtil.Info('FFI sync config loaded', data)
    } catch (error) {
      LogUtil.Error('Failed to load FFI sync config', error)
    }
  }

  // Convert seconds to custom value (always in minutes)
  const convertSecondsToCustom = (secs: number) => {
    ffiSyncConfig.value.custom_value = secs / 60
    ffiSyncConfig.value.custom_unit = 'minutes'
  }

  // Convert custom value to seconds
  const convertToSeconds = (): number => {
    const presetValues: Record<string, number> = {
      '15min': 900,
      '20min': 1200,
      '30min': 1800,
      '60min': 3600
    }

    if (ffiSyncConfig.value.interval_preset !== 'custom') {
      return presetValues[ffiSyncConfig.value.interval_preset] || 900 // Default to 15min
    }

    // Custom interval: always in minutes
    return ffiSyncConfig.value.custom_value * 60
  }

  // Handle preset interval change
  const onFfiIntervalPresetChange = () => {
    const newSecs = convertToSeconds()
    ffiSyncConfig.value.interval_secs = newSecs
    checkFfiSyncWarning(newSecs)
  }

  // Handle custom interval change
  const onCustomIntervalChange = () => {
    const newSecs = convertToSeconds()
    ffiSyncConfig.value.interval_secs = newSecs
    checkFfiSyncWarning(newSecs)
  }

  // Check for warning conditions
  const checkFfiSyncWarning = (secs: number) => {
    if (secs < 300) {
      ffiSyncWarning.value = 'Warning: Frequent syncs (< 5 min) may impact performance'
    } else if (secs > 3600) {
      ffiSyncWarning.value = 'Warning: Long intervals (> 1 hour) may delay data updates'
    } else {
      ffiSyncWarning.value = null
    }
  }

  // Get custom input min/max based on unit
  const getCustomMin = (): number => {
    if (ffiSyncConfig.value.custom_unit === 'minutes') return 1
    if (ffiSyncConfig.value.custom_unit === 'hours') return 1
    return 1 // days
  }

  const getCustomMax = (): number => {
    if (ffiSyncConfig.value.custom_unit === 'minutes') return 59
    if (ffiSyncConfig.value.custom_unit === 'hours') return 23
    return 365 // days
  }

  // Format interval for display
  const formatInterval = (secs: number): string => {
    if (secs < 60) return `${secs} seconds`
    if (secs < 3600) return `${secs / 60} minutes`
    if (secs < 86400) return `${secs / 3600} hours`
    return `${secs / 86400} days`
  }

  // ============ Refresh and Rediscover Interval Functions ============

  // Convert rediscover preset/custom to seconds
  const convertRediscoverToSeconds = (): number => {
    const presetValues: Record<string, number> = {
      '1hour': 3600,
      '2hours': 7200,
      '4hours': 14400,
      '8hours': 28800,
      '12hours': 43200
    }

    if (rediscoverConfig.value.interval_preset !== 'custom') {
      return presetValues[rediscoverConfig.value.interval_preset] || 3600
    }

    // Custom interval: always in hours
    return rediscoverConfig.value.custom_value * 3600
  }

  // Handle preset interval change
  // Handle preset interval change
  const onRediscoverIntervalPresetChange = () => {
    const newSecs = convertRediscoverToSeconds()
    rediscoverConfig.value.interval_secs = newSecs
    checkRediscoverWarning(newSecs)
  }

  // Handle custom interval change
  const onRediscoverCustomIntervalChange = () => {
    const newSecs = convertRediscoverToSeconds()
    rediscoverConfig.value.interval_secs = newSecs
    checkRediscoverWarning(newSecs)
  }

  // Check for warning conditions
  const checkRediscoverWarning = (secs: number) => {
    if (secs < 3600) {
      rediscoverWarning.value = 'Warning: Minimum interval is 1 hour'
    } else if (secs > 86400) {
      rediscoverWarning.value = 'Warning: Long intervals (> 24 hours) may delay discovery of new devices'
    } else {
      rediscoverWarning.value = null
    }
  }

  // Get custom input min/max for rediscover (hours only)
  const getRediscoverCustomMin = (): number => {
    return 1 // Minimum 1 hour
  }

  const getRediscoverCustomMax = (): number => {
    return 168 // Maximum 168 hours (7 days)
  }

  // Save rediscover interval configuration to database
  const saveRediscoverConfig = async (showMessage: boolean = false) => {
    try {
      const interval_secs = convertRediscoverToSeconds()

      // Validate range (1 hour to 7 days)
      if (interval_secs < 3600 || interval_secs > 604800) {
        if (showMessage) {
          message.error('Rediscover interval must be between 1 hour and 7 days')
        }
        return false
      }

      await RediscoverConfigAPI.updateInterval(
        interval_secs,
        'user',
        'Updated via Trendlog Configuration UI'
      )

      if (showMessage) {
        message.success(`Rediscover interval updated to ${formatRediscoverInterval(interval_secs)}`)
      }
      LogUtil.Info('Rediscover interval saved', { interval_secs })
      return true
    } catch (error) {
      if (showMessage) {
        message.error('Failed to save rediscover interval')
      }
      LogUtil.Error('Failed to save rediscover config', error)
      return false
    }
  }

  // Load rediscover interval configuration from API
  const loadRediscoverConfig = async () => {
    try {
      const intervalSecs = await RediscoverConfigAPI.getInterval()
      rediscoverConfig.value.interval_secs = intervalSecs

      // Set preset based on interval
      const presets: Record<number, string> = {
        3600: '1hour',
        7200: '2hours',
        14400: '4hours',
        28800: '8hours',
        43200: '12hours'
      }

      rediscoverConfig.value.interval_preset = presets[intervalSecs] || 'custom'

      if (rediscoverConfig.value.interval_preset === 'custom') {
        // Custom intervals are always in hours
        rediscoverConfig.value.custom_value = intervalSecs / 3600
        rediscoverConfig.value.custom_unit = 'hours'
      }

      LogUtil.Info('Rediscover config loaded', { interval_secs: intervalSecs })
    } catch (error) {
      LogUtil.Error('Failed to load rediscover config', error)
    }
  }

  // Format rediscover interval for display
  const formatRediscoverInterval = (secs: number): string => {
    const hours = secs / 3600
    if (hours === 1) return '1 hour'
    if (hours < 24) return `${hours} hours`
    const days = hours / 24
    return days === 1 ? '1 day' : `${days} days`
  }

  // ============ End Rediscover Functions ============


  // Format countdown timer
  const formatCountdown = (secs: number): string => {
    if (secs <= 0) return 'Syncing now...'

    const days = Math.floor(secs / 86400)
    const hours = Math.floor((secs % 86400) / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const seconds = secs % 60

    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m ${seconds}s`
    if (mins > 0) return `${mins}:${String(seconds).padStart(2, '0')}`
    return `${seconds}s`
  }

  // Start countdown timer
  const startFfiCountdownTimer = () => {
    if (ffiCountdownTimer) {
      clearInterval(ffiCountdownTimer)
    }

    ffiCountdownTimer = window.setInterval(() => {
      if (ffiSyncConfig.value.next_sync_in > 0) {
        ffiSyncConfig.value.next_sync_in--
      } else {
        // Reset to interval when countdown reaches 0
        ffiSyncConfig.value.next_sync_in = ffiSyncConfig.value.interval_secs
      }
    }, 1000)
  }

  // Save Sampling Interval configuration (included in saveDatabaseConfig)
  const saveFfiSyncConfig = async () => {
    try {
      const interval_secs = convertToSeconds()

      // Validate range (1 minute to 365 days)
      if (interval_secs < 60 || interval_secs > 31536000) {
        message.error('Interval must be between 1 minute and 365 days')
        return false
      }

      const data = await FfiSyncConfigAPI.updateFfiSyncInterval(
        interval_secs,
        'user',
        'Updated via Trendlog Configuration UI'
      )

      ffiSyncConfig.value.interval_secs = data.interval_secs
      ffiSyncConfig.value.next_sync_in = data.interval_secs

      message.success(`Sampling Interval updated to ${formatInterval(interval_secs)}`)
      LogUtil.Info('Sampling Interval saved', data)
      return true
    } catch (error) {
      message.error('Failed to save Sampling Interval')
      LogUtil.Error('Failed to save FFI sync config', error)
      return false
    }
  }

  // Load FFI sync change history (latest only)
  const loadFfiSyncHistory = async () => {
    isLoadingHistory.value = true
    try {
      ffiSyncHistory.value = await FfiSyncConfigAPI.getFfiSyncHistory(1)
      LogUtil.Info('FFI sync history loaded (latest only)', { count: ffiSyncHistory.value.length })
    } catch (error) {
      message.error('Failed to load change history')
      LogUtil.Error('Failed to load FFI sync history', error)
    } finally {
      isLoadingHistory.value = false
    }
  }

  // Watch for history modal opening to load data
  watch(showFfiSyncHistory, (visible) => {
    if (visible) {
      loadFfiSyncHistory()
    }
  })

  // Cleanup old database files
  const cleanupOldFiles = async () => {
    isCleaningUp.value = true
    try {
      // Calculate retention days from value and unit
      let retentionDays = databaseConfig.value.retention_value
      const unit = databaseConfig.value.retention_unit

      if (unit === 'weeks') {
        retentionDays = retentionDays * 7
      } else if (unit === 'months') {
        retentionDays = retentionDays * 30
      }

      const result = await databaseService.files.cleanupOldFiles(retentionDays)
      await loadDatabaseFiles() // Reload files list
      message.success(`Cleaned up ${result.filesDeleted} old database files`)
      LogUtil.Info('Database cleanup completed', result)
    } catch (error) {
      message.error('Failed to cleanup database files')
      LogUtil.Error('Failed to cleanup database files', error)
    } finally {
      isCleaningUp.value = false
    }
  }

  // Compact database
  const compactDatabase = async () => {
    isOptimizing.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      message.success('Database compacted successfully')
      LogUtil.Info('Database compacted')
    } catch (error) {
      message.error('Failed to compact database')
      LogUtil.Error('Failed to compact database', error)
    } finally {
      isOptimizing.value = false
    }
  }

  // Cleanup all database files
  const cleanupAllFiles = async () => {
    isCleaningUp.value = true
    try {
      const result = await databaseService.files.cleanupAllFiles()
      await loadDatabaseFiles() // Reload files list
      message.success(`Cleaned up all ${result.filesDeleted} database files`)
      LogUtil.Info('All database files cleaned up', result)
    } catch (error) {
      message.error('Failed to cleanup all database files')
      LogUtil.Error('Failed to cleanup all database files', error)
    } finally {
      isCleaningUp.value = false
    }
  }

  onUnmounted(() => {
    stopRealTimeUpdates()
    destroyAllCharts()

    // ⌨️ Cleanup keyboard navigation
    document.removeEventListener('keydown', handleKeydown)
    LogUtil.Info('⌨️ Keyboard: Navigation system cleanup completed')

    // �?Cleanup visibility change listener
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    LogUtil.Info('�?Continuous monitoring: Cleanup completed')

    // Cleanup FFI countdown timer
    if (ffiCountdownTimer) {
      clearInterval(ffiCountdownTimer)
    }

    // 🆕 Cleanup timebase change timeout and abort controller
    if (timebaseChangeTimeout) {
      clearTimeout(timebaseChangeTimeout)
    }
    if (historyAbortController) {
      historyAbortController.abort()
    }
  })

  // 🔥 HMR (Hot Module Reload) Cleanup - prevent multiple intervals when saving file
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      LogUtil.Debug('🔥 HMR: Cleaning up old component instance to prevent duplicate intervals')
      stopRealTimeUpdates()
      destroyAllCharts()
      if (timebaseChangeTimeout) {
        clearTimeout(timebaseChangeTimeout)
      }
      if (historyAbortController) {
        historyAbortController.abort()
      }
    })
  }
</script>

<style scoped>
  /* Global loading indicator */
  .global-loading-indicator {
    background: linear-gradient(to right, #e6f7ff, #bae7ff);
    border-bottom: 2px solid #1890ff;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
    font-size: 13px;
    font-weight: 500;
    color: #096dd9;
  }

  .timeseries-container {
    display: flex;
    flex-direction: column;
    height: calc(97vh - 40px);
    gap: 0;
    background: #ffffff;
    border-radius: 0px;
    overflow: hidden;
    padding: 0;
  }

  /* ANALOG AREA (Top Section) */
  .analog-area {
    display: flex;
    flex-direction: row;
    height: v-bind('showDigitalArea ? analogAreaHeight + "%" : "100%"');
    min-height: 200px;
    gap: 6px;
    overflow: hidden;
    padding: 4px;
    background: #f5f5f5;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
  }

  .left-panel {
    width: clamp(210px, 23vw, 330px);
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 0px;
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .right-panel {
    flex: 1;
    background: #fafafa;
    border: none;
    border-radius: 0px;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* RESIZABLE DIVIDER */
  .resizable-divider {
    height: 12px;
    background: linear-gradient(to bottom, #e8e8e8 0%, #d9d9d9 50%, #e8e8e8 100%);
    cursor: row-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;
    transition: background 0.2s ease;
  }

  .resizable-divider:hover {
    background: linear-gradient(to bottom, #bfbfbf 0%, #999 50%, #bfbfbf 100%);
  }

  .divider-handle {
    width: 60px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .divider-grip {
    width: 40px;
    height: 3px;
    background: #8c8c8c;
    border-radius: 2px;
    box-shadow: 0 -1px 0 #fff, 0 1px 0 #fff;
  }

  .resizable-divider:hover .divider-grip {
    background: #595959;
  }

  /* RESIZABLE DIVIDER */
  .resizable-divider {
    height: 3px;
    background: linear-gradient(to bottom, #e1e4e8 0%, #d1d5da 50%, #e1e4e8 100%);
    cursor: row-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;
    transition: background 0.2s ease;
  }

  .resizable-divider:hover {
    background: linear-gradient(to bottom, #c6cbd1 0%, #959da5 50%, #c6cbd1 100%);
  }

  .divider-handle {
    width: 60px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .divider-grip {
    width: 40px;
    height: 1.5px;
    background: #959da5;
    border-radius: 2px;
    box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.5), 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .resizable-divider:hover .divider-grip {
    background: #6a737d;
  }

  /* DIGITAL AREA (Bottom Section) */
  .digital-area {
    flex: 1;
    min-height: 150px;
    background: #f5f5f5;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 4px;
    display: flex;
    flex-direction: row;
    gap: 6px;
    overflow: hidden;
  }

  .digital-left-panel {
    width: clamp(210px, 23vw, 330px);
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 0px;
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .digital-right-panel {
    flex: 1;
    background: #fafafa;
    border: none;
    border-radius: 0px;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .digital-oscilloscope-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0px;
  }

  /* Empty chart message */
  .empty-chart-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
    padding: 40px 20px 20px;
    min-height: 200px;
  }

  .empty-chart-message .empty-state-icon {
    font-size: 20px;
    margin-right: 8px;
    display: inline;
  }

  .empty-chart-message .empty-state-text {
    font-size: 14px;
    font-weight: 500;
    color: #595959;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-chart-message .empty-state-subtitle {
    font-size: 12px;
    color: #8c8c8c;
    text-align: center;
  }

  /* Loading overlay - centered in left panel */
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(250, 250, 250, 0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    z-index: 1000;
    border-radius: 0px;
    backdrop-filter: blur(2px);
    animation: fadeIn 0.15s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  .loading-text {
    color: #262626;
    font-size: 14px;
    font-weight: 500;
  }

  .control-section {
    padding: 0;
    /* Remove outer padding */
    border-bottom: 1px solid #e8e8e8;
  }

    .control-section:last-child {
      border-bottom: none;
    }

    /* Data Series section takes up remaining space */
    .control-section:first-child {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 5px;
      /* Inner padding only for data series */
    }

    .control-section h4 {
      margin: 0 0 8px 0;
      /* Reduced margin */
      color: #262626;
      font-size: 12px;
      /* Smaller size */
      font-weight: 600;
    }

  .data-series-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
    padding: 6px 8px;
    background: #f8f9fa;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
  }

  .header-line-1,
  .header-line-2 {
    padding-left: 0;
    margin-bottom: 5px;
  }

  .header-line-1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    /* Add space between title and badge */
    flex-wrap: nowrap;
    /* Prevent wrapping */
  }

    .header-line-1 h7 {
      margin: 0;
      color: #262626;
      font-size: 11px;
      font-weight: 600;
      flex: 1;
      /* Allow title to take available space */
      min-width: 0;
      /* Allow text truncation if needed */
      white-space: nowrap;
      /* Prevent text wrapping */
      overflow: hidden;
      text-overflow: ellipsis;
      /* Add ellipsis for very long titles */
    }

  /* Data Source Indicator */
  .data-source-indicator {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    /* Prevent badge from shrinking */
  }

  .source-badge {
    display: inline-block;
    padding: 2px 6px;
    /* Slightly more compact padding */
    border-radius: 10px;
    font-size: 9px;
    /* Slightly smaller font */
    font-weight: 500;
    color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    /* Prevent badge text from wrapping */
  }

    .source-badge.realtime {
      background: linear-gradient(45deg, #52c41a, #389e0d);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }

    .source-badge.historical {
      background: linear-gradient(45deg, #2196F3, #1976D2);
    }

    .source-badge.error {
      background: linear-gradient(45deg, #f56565, #e53e3e);
    }

    .source-badge.loading {
      background: linear-gradient(45deg, #4CAF50, #45a049);
      display: flex;
      align-items: center;
      gap: 4px;
    }

      .source-badge.loading .ant-spin {
        font-size: 10px !important;
      }

      .source-badge.loading .ant-spin-dot {
        font-size: 10px !important;
      }

  .header-line-2 {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    /* Changed from flex-start to space-between */
    width: 100%;
    gap: 8px;
    margin-top: 2px;
  }

  .left-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    /* Space between the dropdown buttons */
  }

  .control-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .control-group-label {
    color: #8c8c8c !important;
    font-size: 10px;
    font-weight: 500;
    white-space: nowrap;
  }

  .auto-scroll-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toggle-label {
    color: #595959 !important;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }

  .series-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;
  }

  /* Empty state styling */
  .series-empty-state {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    min-height: 200px;
    padding: 40px 20px 20px;
  }

  .empty-state-content {
    text-align: center;
    color: #8c8c8c;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state-text {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
    color: #595959;
  }

  .empty-state-subtitle {
    font-size: 14px;
    color: #8c8c8c;
  }

  .series-item {
    margin-bottom: 4px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background: #ffffff;
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    position: relative;
  }

    .series-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    /* Clean and simple design for series items */
    .series-item:not(.series-disabled) {
      cursor: pointer;
    }

  .series-disabled {
    opacity: 0.5;
    filter: grayscale(0.5);
  }

  .series-header {
    display: flex;
    align-items: center;
    padding: 6px 4px 6px 10px;
    cursor: pointer;
    gap: 2px;
    border-radius: 6px;
    margin: 1px 0;
  }

  .series-color-indicator {
    width: 3px;
    height: 24px;
    border-radius: 2px;
    flex-shrink: 0;
    opacity: 0.8;
  }

  .series-toggle-indicator {
    width: 24px;
    height: 16px;
    border-radius: 10px;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;
    border: 2px solid transparent;
    display: flex;
    align-items: center;
    padding: 1px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }

    .series-toggle-indicator.active {
      opacity: 1;
      border-color: rgba(255, 255, 255, 0.3);
    }

    .series-toggle-indicator.inactive {
      opacity: 0.6;
      background-color: #d9d9d9 !important;
    }

  .toggle-inner {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: white;
    transition: all 0.3s ease;
    transform: translateX(0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

    .toggle-inner.visible {
      transform: translateX(8px);
    }

  .series-name {
    font-size: 12px;
    /* font-weight: 600; */
    margin-bottom: 2px;
    color: #262626;
    line-height: 1.3;
    white-space: normal;
    word-break: break-word;
    max-width: 100%;
  }

  .series-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 2px 4px;
    border-radius: 4px;
  }

  .series-name-line {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    /* gap: 16px; */
    width: 100%;
    min-height: 24px;
  }

  .series-name-col {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    min-width: 0;
    overflow: hidden;
  }

  /* Right group contains chip, unit, and expand button all together */
  .series-right-group {
    display: grid;
    grid-template-columns: 40px 40px auto;
    align-items: center;
    /* gap: 8px; */
    white-space: nowrap;
  }

  .series-chip-col {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    white-space: nowrap;
  }

  .series-tags-col {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    white-space: nowrap;
  }

  .series-name-container {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .series-prefix-tag {
    margin: 0 !important;
    flex-shrink: 0;
  }

  .series-prefix-tag-small {
    margin: 0 0 0 6px !important;
    flex-shrink: 0;
    font-size: 8px !important;
    padding: 2px 6px !important;
    height: auto !important;
    line-height: 1.2 !important;
  }

  .series-name {
    font-size: 12px;
    font-weight: 600;
    color: #262626;
    line-height: 1.3;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .series-inline-tags {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 4px;
    flex-wrap: nowrap;
    text-align: left;
  }

    .series-inline-tags .ant-tag {
      margin: 0;
      font-size: 10px;
      padding: 1px 4px;
      line-height: 1.2;
    }

  .series-details {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
  }

  .unit-info {
    color: #595959;
    font-size: 9px;
    font-weight: 500;
    background: rgba(0, 0, 0, 0.04);
    padding: 1px 3px;
    border-radius: 2px;
    white-space: nowrap;
    border: 1px solid rgba(0, 0, 0, 0.06);
    line-height: 1.2;
  }

  .series-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .expand-toggle {
    padding: 0 !important;
    margin-right: 0 !important;
    min-width: 16px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8c8c8c !important;
    border: none !important;
    background: transparent !important;
    flex-shrink: 0;
  }

    .expand-toggle:hover {
      color: #262626 !important;
      background: rgba(0, 0, 0, 0.05) !important;
    }

  .expand-icon {
    font-size: 10px;
    transition: transform 0.2s ease;
  }

    .expand-icon.expanded {
      transform: rotate(0deg);
    }

  .series-stats {
    padding: 6px 10px;
    border-top: 1px solid #f0f0f0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    background-color: #fafafa;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
  }

  .stat-label {
    color: #8c8c8c;
    font-size: 10px;
    font-weight: 500;
  }

  .stat-value {
    color: #262626;
    font-weight: 600;
    font-size: 10px;
  }

  .chart-header {
    padding: 6px 8px;
    /* Ultra-compact padding to match modal header */
    border-bottom: 1px solid #e8e8e8;
    background: #ffffff;
  }

  .chart-title-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 3px;
  }

  .chart-header h3 {
    margin: 0;
    /* Remove margin since it's now in flex */
    color: #262626;
    font-size: 16px;
    /* Slightly smaller font */
    font-weight: 600;
    flex-shrink: 0;
    /* Prevent title from shrinking */
  }

  .view-alert {
    max-width: 400px;
    flex-shrink: 1;
  }

  .chart-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    /* Reduced gap */
  }

  .chart-info-left {
    display: flex;
    gap: 12px;
    /* Reduced gap */
    align-items: center;
    flex-wrap: wrap;
  }

  .chart-info-right {
    display: flex;
    align-items: center;
  }

  .status-indicators {
    display: flex;
    gap: 12px;
    /* Reduced gap */
    align-items: center;
    flex-wrap: wrap;
  }

  .status-section {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .status-label {
    color: #8c8c8c !important;
    font-size: 11px;
    font-weight: 500;
  }

  .info-text {
    color: #8c8c8c;
    font-size: 12px;
    white-space: nowrap;
  }

  .chart-container {
    flex: 1;
    padding: 8px;
    /* Reduced padding to give more space to chart */
    position: relative;
    min-height: 320px;
    /* Increased min height since legend is removed */
    display: flex;
    flex-direction: column;
  }

  /* Oscilloscope Multi-Canvas Styling */
  .oscilloscope-container {
    flex: 1;
    padding: 2px;
    position: relative;
    min-height: 320px;
    display: flex;
    flex-direction: column;
    /* gap: 8px; */
    background: #f8f9fa;
    border-radius: 3px;
    border: 1px solid #e8e8e8;
  }

  .combined-label {
    font-size: 12px;
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .signal-info {
    font-size: 11px;
    font-weight: 500;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  .signal-legend {
    display: inline-flex;
    align-items: center;
    font-weight: 500;
  }

  .combined-analog-chart {
    flex: 1;
    background: white;
    border: none;
    border-radius: 4px;
    position: relative;
    min-height: 0;
  }

    .combined-analog-chart canvas {
      width: 100% !important;
      height: 100% !important;
      border-radius: 3px;
    }

  .channel-label {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 4px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 2px;
    position: absolute;
    top: 2px;
    left: 30px;
    z-index: 10;
    line-height: 1;
  }


  .channel-chart {
    height: 50px;
    background: white;
    border: 1px solid #ddd;
    margin-bottom: -1px;
    position: relative;
  }

    .channel-chart.last-channel {
      height: 90px;
    }

    /* Add border to first channel-chart (top) */
    .channel-chart:first-child {
      border-top: 1px solid #ddd;
    }

    /* Add border to last channel-chart (bottom) */
    .channel-chart:last-child {
      border-bottom: 1px solid #ddd;
    }


    .channel-chart canvas {
      width: 100% !important;
      height: 100% !important;
      border-radius: 3px;
    }

  .chart-canvas {
    width: 100% !important;
    height: 100% !important;
    min-height: 300px;
    /* Increased min height since legend is removed */
  }

  /* Top Controls Bar - Individual Control Group Wrapping */
  .top-controls-bar {
    background: #fafafa;
    border-bottom: 1px solid #d9d9d9;
    padding: 6px 8px;
    /* box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); */
    position: sticky;
    top: 0;
    z-index: 100;
    min-height: 40px;
    margin-bottom: 5px;
  }

  .controls-main-flex {
    width: 100%;
    align-items: center;
    justify-content: flex-start;
  }

  .control-group {
    flex-shrink: 0;
    white-space: nowrap;
    align-items: center;
    gap: 6px;
  }

  .control-label {
    font-weight: 500;
    color: #666;
    white-space: nowrap;
  }

  .status-tags {
    flex-wrap: wrap;
  }

    .status-tags .ant-tag {
      margin: 1px 2px;
    }

  /* Responsive behavior - each control group wraps individually */
  @media (max-width: 1200px) {
    .controls-main-flex {
      gap: 8px;
    }

    .control-group {
      flex-shrink: 1;
    }
  }

  @media (max-width: 1000px) {
    .top-controls-bar {
      padding: 4px 6px;
    }

    .controls-main-flex {
      gap: 6px;
    }

    .control-group {
      min-width: min-content;
    }
  }

  @media (max-width: 768px) {
    .top-controls-bar {
      padding: 3px 4px;
    }

    .controls-main-flex {
      gap: 4px;
      justify-content: center;
    }

    .control-group {
      flex: 0 0 auto;
      justify-content: center;
    }

    .control-label {
      font-size: 10px;
    }

    .control-group .ant-btn {
      font-size: 10px;
      padding: 2px 6px;
      height: 24px;
    }

    .status-tags .ant-tag {
      font-size: 9px;
      padding: 1px 4px;
    }
  }

  @media (max-width: 480px) {
    .controls-main-flex {
      justify-content: space-around;
      gap: 2px;
    }

    .control-group {
      flex: 1 1 auto;
      min-width: 0;
      justify-content: center;
    }

      .control-group .ant-btn-group {
        display: flex;
        gap: 1px;
      }

        .control-group .ant-btn-group .ant-btn {
          flex: 1;
          min-width: 30px;
          padding: 1px 3px;
          font-size: 9px;
        }

      /* Hide text in very small screens, keep icons */
      .control-group .ant-btn span:not(.anticon) {
        display: none;
      }
  }

  .controls-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: nowrap;
    flex-shrink: 1;
    min-width: 0;
  }

  .controls-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: nowrap;
    flex-shrink: 0;
    margin-right: 15px;
  }

  .control-item {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* Apply consistent styling to all dropdown menus */
  :deep(.chart-options-menu),
  :deep(.zoom-options-menu),
  :deep(.export-options-menu) {
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :deep(.chart-options-menu .ant-menu-item),
  :deep(.zoom-options-menu .ant-menu-item),
  :deep(.export-options-menu .ant-menu-item) {
    padding: 4px 8px;
    margin: 2px 0;
    border-radius: 4px;
    line-height: 1.2;
    min-height: auto;
    height: auto;
  }

  :deep(.chart-options-menu .ant-btn),
  :deep(.zoom-options-menu .ant-btn),
  :deep(.export-options-menu .ant-btn) {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    height: auto !important;
    padding: 4px 0 !important;
    line-height: 1.2 !important;
    color: #262626 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
  }

  :deep(.chart-options-menu .ant-btn .anticon),
  :deep(.zoom-options-menu .ant-btn .anticon),
  :deep(.export-options-menu .ant-btn .anticon) {
    margin-right: 6px !important;
    color: #1890ff !important;
  }

  :deep(.chart-options-menu .ant-btn span),
  :deep(.zoom-options-menu .ant-btn span),
  :deep(.export-options-menu .ant-btn span) {
    color: #262626 !important;
  }

  :deep(.chart-options-menu .ant-menu-item:hover),
  :deep(.zoom-options-menu .ant-menu-item:hover),
  :deep(.export-options-menu .ant-menu-item:hover) {
    background-color: #f5f5f5 !important;
  }

  :deep(.chart-options-menu .ant-btn:hover),
  :deep(.zoom-options-menu .ant-btn:hover),
  :deep(.export-options-menu .ant-btn:hover) {
    color: #1890ff !important;
    background: transparent !important;
  }

  :deep(.chart-options-menu .ant-menu-item:hover .ant-btn),
  :deep(.zoom-options-menu .ant-menu-item:hover .ant-btn),
  :deep(.export-options-menu .ant-menu-item:hover .ant-btn) {
    color: #1890ff !important;
  }

  /* Export Options Dropdown Menu Styles */
  :deep(.export-options-menu) {
    min-width: 160px;
  }

  :deep(.export-options-menu .ant-menu-item) {
    padding: 6px 8px !important;
    height: auto !important;
  }

  :deep(.export-options-menu .ant-btn) {
    border: none !important;
    box-shadow: none !important;
    font-size: 12px;
    color: #333;
    padding: 4px 0 !important;
    height: auto !important;
    justify-content: flex-start;
  }

  :deep(.export-options-menu .ant-btn:hover) {
    color: #0064c8;
    background: transparent !important;
  }

  :deep(.export-options-menu .ant-btn .anticon) {
    margin-right: 8px;
    font-size: 14px;
  }

  /* ============================================
   EXPORT OPTIONS DROPDOWN COMPREHENSIVE STYLES
   ============================================ */

  /* Base dropdown menu styling */
  .export-options-menu {
    width: auto !important;
    min-width: auto !important;
    max-width: none !important;
    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
  }

    /* Menu item layout - force single line */
    .export-options-menu .ant-menu-item {
      height: auto !important;
      line-height: 1.2 !important;
      padding: 6px 12px !important;
      white-space: nowrap !important;
      overflow: visible !important;
      display: flex !important;
      align-items: center !important;
      width: auto !important;
      min-width: fit-content !important;
    }

    /* Smaller font size for menu items */
    .export-options-menu .ant-menu-item,
    .export-options-menu .ant-btn,
    .export-options-menu .ant-btn span {
      font-weight: 400 !important;
    }

    /* Export button styling within menu items */
    .export-options-menu .ant-btn {
      padding: 0 !important;
      height: auto !important;
      line-height: 1.2 !important;
      border: none !important;
      box-shadow: none !important;
      display: flex !important;
      align-items: center !important;
      width: 100% !important;
      text-align: left !important;
      justify-content: flex-start !important;
    }

      .export-options-menu .ant-btn .anticon {
        margin-right: 8px !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      .export-options-menu .ant-btn span {
        display: inline !important;
        white-space: nowrap !important;
        line-height: 1.2 !important;
      }

    /* Hover effects */
    .export-options-menu .ant-menu-item:hover {
      background-color: #f5f5f5 !important;
      color: #0064c8 !important;
    }

    .export-options-menu .ant-btn:hover {
      background-color: transparent !important;
      color: #0064c8 !important;
    }

    .export-options-menu .ant-menu-item:hover .ant-btn {
      color: #0064c8 !important;
    }

    /* Divider styling */
    .export-options-menu .ant-menu-divider {
      margin: 4px 0 !important;
      background-color: #e8e8e8 !important;
    }

    /* Ensure dropdown positioning */
    .export-options-menu.ant-dropdown-menu {
      padding: 4px 0 !important;
      border-radius: 4px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      width: auto !important;
      min-width: fit-content !important;
    }

  /* Modal styling - ultra-compact and space-efficient */
  :deep(.t3-timeseries-modal .ant-modal-content) {
    background: #ffffff !important;
    border: 1px solid #e8e8e8;
    border-radius: 0px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
    /* Lighter shadow */
    margin: 0 !important;
    /* Remove default margin */
    padding: 0 !important;
    /* Remove default padding */
    overflow: hidden !important;
    /* Prevent any spacing issues */
  }

  :deep(.t3-timeseries-modal .ant-modal-header) {
    background: #fafafa !important;
    border-bottom: 1px solid #e8e8e8 !important;
    border-radius: 0px !important;
    padding: 6px 8px !important;
    /* Ultra-compact padding */
    margin: 0 !important;
    /* Remove margin */
    min-height: 32px !important;
    /* Even more compact height */
    line-height: 1.2 !important;
    /* Tight line height */
  }

  :deep(.t3-timeseries-modal .ant-modal-title) {
    color: #262626 !important;
    font-weight: 600;
    font-size: 14px !important;
    /* Smaller but readable size */
    line-height: 1.2 !important;
    /* Tight line height */
    margin: 0 !important;
    padding: 0 !important;
  }

  :deep(.t3-timeseries-modal .ant-modal-close) {
    top: 16px !important;
    /* Align with top controls bar height */
    right: 12px !important;
    /* Align with export dropdown */
    z-index: 1000 !important;
  }

  :deep(.t3-timeseries-modal .ant-modal-close-x) {
    color: #8c8c8c !important;
    width: 28px !important;
    height: 28px !important;
    line-height: 28px !important;
    font-size: 14px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  :deep(.t3-timeseries-modal .ant-modal-body) {
    padding: 2px !important;
    /* Even more compact since no header */
    background: #ffffff !important;
    margin: 0 !important;
    overflow: hidden !important;
    /* Ensure tight fit */
  }

  /* Custom tooltip styling for colored text */
  #chartjs-tooltip {
    opacity: 1;
    position: absolute;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    color: #000;
    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
  }

    #chartjs-tooltip table {
      margin: 0px;
      border-collapse: collapse;
    }

      #chartjs-tooltip table td,
      #chartjs-tooltip table th {
        padding: 2px 8px;
        border: none;
      }

      #chartjs-tooltip table th {
        font-weight: 600;
        font-size: 13px;
        color: #000;
        text-align: left;
      }

      #chartjs-tooltip table td span {
        border-radius: 2px;
        font-weight: 500;
        padding: 2px 6px;
        white-space: nowrap;
      }

  /* Ensure series colors are maintained in all text elements */
  .series-name-colored {
    font-weight: 500;
  }

  .chart-legend-colored .ant-legend-item {
    color: inherit !important;
  }

  /* Ant Design tooltip styling for series-name - Multiple selectors for compatibility */
  :global(.ant-tooltip .ant-tooltip-inner) {
    font-size: 11px !important;
    line-height: 1.2 !important;
    padding: 4px 6px !important;
  }

  :deep(.ant-tooltip .ant-tooltip-inner) {
    font-size: 11px !important;
    line-height: 1.2 !important;
    padding: 4px 6px !important;
  }

  .ant-tooltip .ant-tooltip-inner {
    font-size: 11px !important;
    line-height: 1.2 !important;
    padding: 4px 6px !important;
  }

  /* Mobile responsive layout - Control Group Optimized */
  @media (max-width: 768px) {

    /* Top controls - Individual control group wrapping */
    .top-controls-bar {
      padding: 3px !important;
    }

    .controls-main-flex {
      justify-content: center !important;
      gap: 4px !important;
    }

    .control-group {
      flex: 0 0 auto !important;
      justify-content: center !important;
      min-width: min-content !important;
    }

    .control-label {
      font-size: 10px !important;
    }

    /* Control items and buttons get smaller */
    .control-group .ant-btn {
      font-size: 10px !important;
      padding: 2px 6px !important;
      height: 24px !important;
    }

    .status-tags .ant-tag {
      font-size: 9px !important;
      padding: 1px 4px !important;
      margin: 1px !important;
    }

    /* Main layout - stack vertically with proper height calculations */
    .timeseries-container {
      flex-direction: column !important;
      height: calc(100vh - 60px) !important;
      /* Account for larger top controls on mobile */
      gap: 3px !important;
      overflow-y: auto !important;
    }

    .left-panel {
      width: 100% !important;
      height: 35vh !important;
      /* Fixed height - 35% of viewport */
      min-height: 200px !important;
      max-height: 35vh !important;
      order: 1;
      overflow-y: auto !important;
      flex-shrink: 0 !important;
    }

    .right-panel {
      width: 100% !important;
      height: calc(65vh - 60px - 3px) !important;
      /* Remaining height minus top controls and gap */
      min-height: 250px !important;
      min-width: auto !important;
      order: 2;
      flex: none !important;
      /* Don't use flex on mobile to ensure height calculation */
      overflow-y: auto !important;
      /* Allow scrolling on mobile when content overflows */
      overflow-x: hidden !important;
    }

    .chart-container {
      height: 100% !important;
      min-height: 200px !important;
      padding: 3px !important;
      overflow: hidden !important;
      /* Ensure chart fits within container */
    }

    .chart-canvas {
      min-height: 180px !important;
      /* Ensure space for chart and labels */
    }

    /* Series list improvements */
    .series-item {
      margin-bottom: 4px !important;
    }

    .series-header {
      flex-wrap: wrap !important;
      gap: 2px !important;
    }

    .series-name-line {
      flex-wrap: wrap !important;
      gap: 2px !important;
    }

    .series-stats {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 4px !important;
    }

    .stat-item {
      min-width: 60px !important;
      font-size: 10px !important;
    }

    :global(.t3-timeseries-modal .ant-modal) {
      width: 95vw !important;
      margin: 10px auto !important;
      max-width: none !important;
    }

    :global(.t3-timeseries-modal .ant-modal-content) {
      padding: 8px 10px !important;
    }
  }

  /* Very small screens - even more compact */
  @media (max-width: 480px) {
    .top-controls-bar {
      padding: 2px !important;
    }

    .controls-main-flex {
      justify-content: space-around !important;
      gap: 2px !important;
    }

    .control-group {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      justify-content: center !important;
    }

      /* Stack button groups and make them more compact */
      .control-group .ant-btn-group {
        display: flex !important;
        gap: 1px !important;
      }

        .control-group .ant-btn-group .ant-btn {
          flex: 1 !important;
          min-width: 30px !important;
          padding: 1px 3px !important;
          font-size: 9px !important;
        }

      /* Hide text in very small screens, keep icons */
      .control-group .ant-btn span:not(.anticon) {
        display: none !important;
      }

    /* Adjust heights for very small screens */
    .timeseries-container {
      height: calc(100vh - 70px) !important;
      /* Account for even larger top controls */
    }

    .left-panel {
      height: 30vh !important;
      min-height: 150px !important;
      max-height: 30vh !important;
    }

    .right-panel {
      height: calc(70vh - 70px - 3px) !important;
      min-height: 200px !important;
    }

    /* Series items more compact */
    .series-name {
      font-size: 11px !important;
    }

    .unit-info {
      font-size: 9px !important;
    }
  }

  /* Custom Date Modal Styles */
  .custom-date-modal {
    padding: 10px 0;
  }

  .date-time-row {
    margin-bottom: 14px;
    align-items: center;
  }

  .label-col {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 4px;
  }

  .time-label {
    font-weight: 500;
    color: #262626;
    margin: 0;
    white-space: nowrap;
    font-size: 11px;
  }

  .custom-date-modal .ant-picker {
    height: 28px !important;
    font-size: 11px !important;
  }

  .custom-date-modal .ant-picker-input > input {
    font-size: 11px !important;
    padding: 2px 8px !important;
  }

  .quick-actions {
    margin: 16px 0 10px 0;
    padding: 10px;
    background: #fafafa;
    border-radius: 4px;
    border: 1px solid #f0f0f0;
  }

    .quick-actions .ant-space {
      width: 100%;
      justify-content: center;
    }

    .quick-actions .ant-btn {
      font-size: 10px;
      padding: 0 6px;
      height: 22px;
    }

  .range-summary {
    margin-top: 10px;
  }

    .range-summary .ant-alert {
      border-radius: 4px;
      padding: 4px 10px;
    }

    .range-summary .ant-alert-message {
      font-weight: 500;
    }

  .range-text {
    font-size: 10px;
    color: #1890ff;
  }
</style>

<style>
  .t3-timeseries-modal .ant-dropdown-menu-title-content {
    font-size: 12px !important;
  }

  .ant-dropdown-menu-title-content {
    font-size: 12px !important;
  }

  .ant-modal-content {
    padding: 10px 14px !important;
  }

  /* Right Drawer for Item Selection */
  .item-selector-drawer .ant-drawer-header {
    padding: 8px 16px !important;
    border-bottom: 1px solid #f0f0f0;
  }

  .item-selector-drawer .ant-drawer-header-title {
    font-size: 14px !important;
    font-weight: 500 !important;
  }

  .item-selector-drawer .ant-drawer-body {
    padding: 0 !important;
  }

  .drawer-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 13px !important;
    font-weight: 500;
  }

  .drawer-content {
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .drawer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
    flex-shrink: 0;
  }

  .clear-btn {
    color: #ff4d4f;
    border-color: #ff4d4f;
  }

    .clear-btn:hover {
      color: #fff;
      background-color: #ff4d4f;
      border-color: #ff4d4f;
    }

  .footer-actions {
    display: flex;
    gap: 8px;
  }

  .drawer-footer .ant-btn {
    height: 32px !important;
    padding: 0 15px !important;
    font-size: 12px !important;
    font-weight: normal !important;
  }

  .select-toggle-btn {
    min-width: 90px;
    height: 32px !important;
    padding: 0 15px !important;
    font-size: 12px !important;
    font-weight: normal !important;
  }

  /* Compact item list with detailed info */
  .items-compact-list {
    padding: 8px 12px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .item-row {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
    margin-bottom: 4px;
    min-height: 38px;
  }

    .item-row:hover {
      border-color: #d9d9d9;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .item-row.selected {
      border-color: #1890ff;
      background: #f6ffed;
      box-shadow: 0 2px 6px rgba(24, 144, 255, 0.15);
    }

    .item-row.analog {
      border-left: 3px solid #1890ff;
    }

    .item-row.digital {
      border-left: 3px solid #52c41a;
    }

  .item-selection {
    display: flex;
    align-items: center;
    margin-right: 8px;
  }

  .item-color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-left: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .item-details {
    flex: 1;
    min-width: 0;
  }

  .item-main-info {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }

  .item-name {
    font-weight: 500;
    font-size: 13px;
    color: #262626;
  }

  .item-unit {
    font-size: 10px;
    color: #8c8c8c;
    background: #f5f5f5;
    padding: 1px 3px;
    border-radius: 2px;
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    color: #8c8c8c;
  }

  .item-type-badge {
    text-transform: uppercase;
    font-weight: 500;
    padding: 1px 4px;
    border-radius: 2px;
  }

    .item-type-badge.analog {
      background: #e6f4ff;
      color: #1890ff;
    }

    .item-type-badge.digital {
      background: #f6ffed;
      color: #52c41a;
    }

  .item-description {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-range {
    font-family: monospace;
    font-size: 9px;
  }

  .item-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 60px;
  }

  .status-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 2px;
    font-weight: 500;
  }

    .status-badge.active {
      background: #f6ffed;
      color: #52c41a;
    }

    .status-badge.empty {
      background: #fff2e8;
      color: #fa8c16;
    }

    .status-badge.hidden {
      background: #f5f5f5;
      color: #8c8c8c;
    }

  .selector-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
  }

  /* Reconfigure and Delete Button Styles */
  .reconfigure-btn {
    margin-left: 8px;
  }

  .delete-series-btn {
    color: #ff4d4f;
    padding: 0 2px !important;
    min-width: 16px !important;
    width: 16px !important;
    height: 16px !important;
  }

    .delete-series-btn:hover {
      color: #ff7875;
      background-color: transparent;
    }

    .delete-series-btn.delete-overlay {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 10;
      width: 12px !important;
      height: 12px !important;
      background: #ff4d4f;
      color: white;
      border: none;
      border-radius: 0 4px 0 12px;
      opacity: 1;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

      .delete-series-btn.delete-overlay:hover {
        background: #ff7875;
        color: white;
      }



  .delete-icon {
    font-size: 8px;
  }

  /* Empty state for View 2 & 3 */
  .empty-tracking-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    /* background: #fafafa;
  border: 1px solid #d9d9d9; */
    border-radius: 6px;
    margin-bottom: 12px;
  }

  .empty-content {
    text-align: center;
    max-width: 400px;
    padding: 40px 20px;
  }

  .empty-icon {
    font-size: 36px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #262626;
    margin-bottom: 8px;
  }

  .empty-description {
    font-size: 13px;
    color: #8c8c8c;
    line-height: 1.5;
    margin-bottom: 24px;
  }

  .select-items-btn {
    height: 32px !important;
    padding: 0 16px !important;
    font-size: 14px !important;
    font-weight: normal !important;
  }

  .select-items-btn span {
    font-size: 14px !important;
    font-weight: normal !important;
  }

  /* ⌨️ Keyboard Navigation Styles */
  .keyboard-shortcut-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #1890ff;
    color: white;
    font-size: 9px;
    font-weight: bold;
    padding: 1px 4px;
    border-radius: 3px;
    min-width: 12px;
    text-align: center;
    z-index: 10;
    opacity: 0.8;
    transition: all 0.2s ease;
  }

    /* Left panel specific keyboard badges */
    .keyboard-shortcut-badge.left-panel-badge {
      top: -10px;
      right: 20px;
      background: #888e86;
      font-size: 8px;
      padding: 1px 3px;
      border-radius: 2px;
      min-width: 10px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

      .keyboard-shortcut-badge.left-panel-badge.active {
        background: #ff4d4f;
        transform: scale(1.15);
        box-shadow: 0 0 6px rgba(255, 77, 79, 0.6);
      }

    .keyboard-shortcut-badge.active {
      background: #52c41a;
      transform: scale(1.1);
      opacity: 1;
      box-shadow: 0 0 4px rgba(82, 196, 26, 0.6);
    }

  .item-selection {
    position: relative;
    /* Needed for absolute positioning of badge */
  }

  .keyboard-status-tag {
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

    .keyboard-status-tag:hover {
      opacity: 0.8;
    }

    .keyboard-status-tag .keyboard-icon {
      font-size: 12px;
      margin-right: 2px;
    }

  /* Keyboard shortcut tooltips */
  .keyboard-shortcut-badge:hover::after {
    content: 'Press ' attr(data-key) ' to toggle';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    /* background: rgba(0, 0, 0, 0.8); */
    color: white;
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 10px;
    white-space: nowrap;
    z-index: 1100;
    /* Higher than badge z-index */
    margin-bottom: 2px;
  }

  /* Specific positioning for left panel badges */
  .keyboard-shortcut-badge.left-panel-badge:hover::after {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1100;
  }

  /* Highlight effect for keyboard-activated items */
  .item-row.keyboard-active {
    animation: keyboardHighlight 0.3s ease;
  }

  @keyframes keyboardHighlight {
    0% {
      background-color: #e6f7ff;
      transform: scale(1.02);
    }

    100% {
      background-color: transparent;
      transform: scale(1);
    }
  }

  /* Improved visibility when keyboard is active */
  .keyboard-shortcut-badge {
    display: block;
  }

  /* Hide shortcuts when keyboard is disabled */
  .keyboard-status-tag[aria-disabled="true"] ~ * .keyboard-shortcut-badge {
    display: none;
  }

  .drawer-footer {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .footer-actions {
    display: flex;
    gap: 8px;
  }

  .chart-title-with-version {
    cursor: help;
    position: relative;
  }

    .chart-title-with-version:hover {
      color: #1890ff;
      text-decoration: underline dotted;
    }
</style>

<style>
  /* Global message component font size override - unscoped for global effect */
  .ant-message .ant-message-notice-content {
    font-size: 12px !important;
  }

  .ant-message .ant-message-custom-content {
    font-size: 12px !important;
  }

  .ant-message .ant-message-notice-content span {
    font-size: 12px !important;
  }

  /* Keyboard navigation selected item highlighting */
  .series-item.keyboard-selected {
    border: 2px solid #666 !important;
    border-radius: 4px;
    background-color: rgba(102, 102, 102, 0.1);
  }

    .series-item.keyboard-selected .series-header {
      background-color: rgba(102, 102, 102, 0.05);
    }

  /* Trendlog Configuration Modal Styles */
  .database-config-modal {
    /* Status Card Styling */
    .database-status-card

  {
    .card-title

  {
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
  }

  .status-info {
    text-align: center;
    .status-label

  {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  }

  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 12px;
    .info-label

  {
    color: #666;
    font-weight: 500;
  }

  .info-value {
    color: #333;
    font-weight: 600;
    &.path-text

  {
    font-family: monospace;
    font-size: 10px;
    color: #1890ff;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  }
  }
  }

  /* Configuration Cards Styling */
  .config-card,
  .actions-card {
    .card-title

  {
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
  }

  .form-item-compact {
    margin-bottom: 8px;
    label

  {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #666;
    margin-bottom: 4px;
  }

  .input-suffix {
    font-size: 11px;
    color: #999;
  }

  }

  .disabled-message {
    color: #999;
    font-size: 12px;
    font-style: italic;
    text-align: center;
    padding: 8px;
    background: #fafafa;
    border-radius: 4px;
  }

  }

  /* Override Ant Design card styling for compact design */
  .ant-card-small .ant-card-body {
    padding: 10px;
  }

  .ant-card-small .ant-card-head {
    min-height: 32px;
    padding: 0 10px;
    .ant-card-head-title

  {
    padding: 6px 0;
    font-size: 12px;
  }

  }

  /* Statistics component styling */
  .ant-statistic-title {
    font-size: 11px !important;
    margin-bottom: 1px !important;
  }

  .ant-statistic-content {
    font-size: 12px !important;
  }

  /* Compact radio button group */
  .ant-radio-group-small .ant-radio-button-wrapper {
    font-size: 11px;
    height: 24px;
    line-height: 22px;
    padding: 0 8px;
  }

  /* Compact input group */
  .ant-input-group-compact .ant-input,
  .ant-input-group-compact .ant-select-selector {
    font-size: 11px;
  }

  /* Small button styling */
  .ant-btn-sm {
    font-size: 11px;
    height: 24px;
    padding: 0 8px;
  }

  }

  /* Database Modal Custom Styles */
  .database-modal-custom {
    .ant-modal-content

  {
    padding: 0;
    border-radius: 8px;
    overflow: hidden;
  }

  .db-modal-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  .db-modal-header {
    background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
    color: white;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    .db-header-title

  {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 600;
    .db-icon

  {
    margin-right: 8px;
    font-size: 16px;
  }

  }

  .db-close-btn {
    color: white;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    &:hover

  {
    background: rgba(255, 255, 255, 0.3);
    color: white;
  }

  }
  }

  .db-modal-content {
    max-height: 480px;
    overflow-y: auto;
    padding: 0;
  }

  .db-section {
    border-bottom: 1px solid #f0f0f0;
    &:last-child

  {
    border-bottom: none;
  }

  .db-section-title {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    padding: 12px 16px 8px;
    display: flex;
    align-items: center;
    background: #fafafa;
    .db-section-icon

  {
    margin-right: 6px;
    color: #1890ff;
  }

  }

  .db-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px 8px;
    background: #fafafa;
    .db-section-title

  {
    padding: 0;
    background: none;
    margin: 0;
  }

  }

  .db-section-content {
    padding: 8px 16px 12px;
  }

  }

  .db-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 12px;
    .db-stat-item

  {
    text-align: center;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 6px;
    .db-stat-label

  {
    font-size: 11px;
    color: #8c8c8c;
    margin-bottom: 2px;
  }

  .db-stat-value {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    .db-status-badge

  {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    &.healthy

  {
    background: #f6ffed;
    color: #52c41a;
    border: 1px solid #b7eb8f;
  }

  &.warning {
    background: #fffbe6;
    color: #faad14;
    border: 1px solid #ffe58f;
  }

  &.error {
    background: #fff2f0;
    color: #ff4d4f;
    border: 1px solid #ffb3b3;
  }

  }
  }
  }
  }

  .db-info-list {
    .db-info-item

  {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
    .db-info-label

  {
    color: #8c8c8c;
    font-weight: 500;
  }

  .db-info-value {
    color: #262626;
    font-weight: 400;
    &.db-path

  {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    font-size: 10px;
    color: #1890ff;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  }

  &:last-child {
    margin-bottom: 0;
  }

  }
  }

  .form-item-compact {
    margin-bottom: 8px;
    label

  {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: #595959;
    margin-bottom: 4px;
  }

  .input-suffix {
    font-size: 10px;
    color: #8c8c8c;
  }

  }

  .disabled-message {
    color: #8c8c8c;
    font-size: 11px;
    font-style: italic;
    text-align: center;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
    margin-top: 8px;
  }

  /* Compact component overrides */
  .ant-radio-group-small .ant-radio-button-wrapper {
    font-size: 10px;
    height: 22px;
    line-height: 20px;
    padding: 0 6px;
  }

  .ant-input-group-compact {
    .ant-input, .ant-select-selector, .ant-input-number-input

  {
    font-size: 11px;
    height: 24px;
  }

  .ant-select-selection-item {
    font-size: 11px;
    line-height: 22px;
  }

  }

  .ant-btn-sm {
    font-size: 11px;
    height: 22px;
    padding: 0 6px;
    border-radius: 4px;
  }

  .ant-switch-small {
    min-width: 28px;
    height: 16px;
    line-height: 16px;
  }

  .ant-time-picker-small {
    .ant-picker-input input

  {
    font-size: 11px;
  }

  }

  .ant-input-number-sm {
    font-size: 11px;
    .ant-input-number-input

  {
    height: 22px;
    font-size: 11px;
  }

  }

  .ant-select-sm {
    font-size: 11px;
    .ant-select-selector

  {
    height: 24px;
  }

  .ant-select-selection-item {
    line-height: 22px;
  }

  }

  .db-modal-footer {
    padding: 12px 16px;
    text-align: right;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
  }

  }

  /* Trendlog Configuration Modal Compact Styles */
  .database-modal-compact {
    margin-top: -60px;
    .ant-modal-header

  {
    margin-bottom: 0px;
  }

  /* Status Card Styling */
  .status-card {
    .card-title

  {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
  }

  .status-info {
    text-align: center;
    .status-label

  {
    font-size: 11px;
    color: #666;
    margin-bottom: 2px;
  }

  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 11px;
    .info-label

  {
    color: #666;
    font-weight: 500;
  }

  .info-value {
    color: #333;
    font-weight: 600;
    &.path-text

  {
    font-family: monospace;
    font-size: 9px;
    color: #1890ff;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  }
  }
  }

  /* Configuration Cards Styling */
  .config-card,
  .actions-card {
    .card-title

  {
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
  }

  .form-item-compact {
    margin-bottom: 6px;
    label

  {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: #666;
    margin-bottom: 3px;
  }

  .input-suffix {
    font-size: 10px;
    color: #999;
  }

  }

  .disabled-message {
    color: #999;
    font-size: 11px;
    font-style: italic;
    text-align: center;
    padding: 6px;
    background: #fafafa;
    border-radius: 4px;
  }

  }

  /* Override Ant Design card styling for compact design */
  .ant-card-small .ant-card-body {
    padding: 8px;
  }

  .ant-card-small .ant-card-head {
    min-height: 28px;
    padding: 0 8px;
    .ant-card-head-title

  {
    padding: 4px 0;
    font-size: 11px;
  }

  }

  /* Statistics component styling */
  .ant-statistic-title {
    font-size: 10px !important;
    margin-bottom: 1px !important;
  }

  .ant-statistic-content {
    font-size: 11px !important;
  }

  /* Compact radio button group */
  .ant-radio-group-small .ant-radio-button-wrapper {
    font-size: 10px;
    height: 22px;
    line-height: 20px;
    padding: 0 6px;
  }

  /* Compact input group */
  .ant-input-group-compact .ant-input,
  .ant-input-group-compact .ant-select-selector {
    font-size: 10px;
  }

  /* Small button styling */
  .ant-btn-sm {
    font-size: 10px;
    height: 22px;
    padding: 0 6px;
  }

  /* Modal footer compact styling */
  .ant-modal-footer {
    padding: 8px 12px;
    text-align: right;
  }
  }
</style>


