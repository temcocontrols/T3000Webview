<style scoped>
.document-toolbar {
  border: 1px solid #bbb;
  border-top: none;
  background-color: #fff;
  height: 37px;
  width: auto;
  padding-left: 341px;
  right: 0;
  bottom: 0;
}

.document-toolbar.top {
  position: fixed;
  top: 118px;
  z-index: 1;
  background-color: #f5f6f7;
  height: 37px;
  border-bottom: 1px solid #e3e4e5;
}

.document-toolbar.bottom {
  background-color: transparent;
  bottom: 10px;
  right: 10px;
  padding-left: 374px;
  padding-right: 10px;
  border: none;
  display: flex;
  align-items: flex-end;
  height: auto;
  pointer-events: none;
}

.document-toolbar .translateButton {
  margin-left: auto;
  margin-top: 0;
  line-height: 26px;
  align-self: center;
  margin-right: 15px;
}

.document-toolbar-view-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
  margin-left: auto;
}

.document-toolbar-view-controls .output {
  float: none;
  margin: 0;
}

.document-toolbar-view-controls .output:before {
  display: none;
}

.document-toolbar-view-controls .rangeslider {
  float: none;
  margin: 0;
}

.document-toolbar-view-controls .minimap-toggle {
  display: none;
  margin-left: 15px;
  pointer-events: initial;
}

.document-toolbar-view-controls .minimap-toggle:hover {
  cursor: pointer;
}

.document-toolbar-view-controls .minimap-toggle pfe-icon {
  font-size: 24px;
}

.document-toolbar-view-controls .minimap {
  display: flex;
  height: 120px;
  width: 100%;
  margin-bottom: 20px;
  border-radius: 6px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
  background: white;
  position: relative;
}

.document-toolbar-view-controls .minimap canvas {
  width: 100%;
  height: 100%;
}

.document-toolbar-view-controls .minimap .minimap-scroller {
  width: 50px;
  height: 25px;
  border: 2px solid #696969;
  background: transparent;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: initial;
}

.document-toolbar-view-controls .minimap .minimap-scroller:hover {
  cursor: pointer;
}

.document-toolbar-view-controls .minimap.hide {
  display: none;
}

.document-toolbar-view-control-buttons {
  display: flex;
  align-items: center;
  height: 100%;
}

.docToolbar-shapeDetails {
  display: inline-flex;
  height: 24px;
  background: #f5f6f7;
  border-radius: 6px;
  padding: 6px 4px;
}

#wa-docToolbar-zoom {
  pointer-events: initial;
}

#wa-docToolbar-view-controls {
  position: relative;
  display: flex;
  align-items: center;
  float: right;
}

#wa-docToolbar-view-controls .output,
#wa-docToolbar-view-controls .rangeslider,
#wa-docToolbar-view-controls .rangeslider__fill {
  float: none;
}

#wa-docToolbar-view-controls .output {
  margin-top: 0;
}

#wa-docToolbar-view-controls .rangeslider {
  margin: 0;
}

#wa-docToolbar-view-controls .output:before {
  display: none;
}

#wa-docToolbar-view-controls #docToolbar-full-screen-button {
  background-color: #eeeeee;
}

#wa-docToolbar-view-controls #docToolbar-full-screen-button pfe-icon {
  font-size: 20px;
}

#wa-docToolbar-details.hide {
  display: none;
}

.docToolbar-shapeDetails-detailGroup {
  display: flex;
  align-items: center;
  pointer-events: initial;
  padding: 0 6px;
}

.docToolbar-shapeDetails-detailGroup input {
  margin-bottom: 0;
  margin-left: 5px;
  margin-right: 5px;
  width: 80px;
  height: 12px;
  background: #ffffff;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.18);
}
</style>
<template>

  <div id="wa-docToolbar" class="document-toolbar bottom">
    <div id="wa-docToolbar-details" class="">
      <div class="docToolbar-shapeDetails">
        <div class="docToolbar-shapeDetails-detailGroup">
          <span class="docToolbar-shapeDetails-detailGroup-detailLabel" id="wa-docToolbar-left">Left</span>
          <input id="wa-docToolbar-leftEdit" type="text" min="0.00" max="10000" step="0.10"
            onchange="SD_Change(event, 'SD_Shape_SetLeft')" onfocus="SD_Click(event, 'SD_BlockTextFromWorkArea')"
            onkeydown="SD_Click(event, 'SD_OnHTMKLKeyDown')" onkeypress="SD_Click(event, 'SD_FilterOnlyDistance')"
            allowneg="1" class="" value="-53' 3 3/4&quot;">
        </div>
        <div class="docToolbar-shapeDetails-detailGroup">
          <span class="docToolbar-shapeDetails-detailGroup-detailLabel" id="wa-docToolbar-top">Top</span>
          <input id="wa-docToolbar-topEdit" type="text" min="0.00" max="10000" step="0.10"
            onchange="SD_Change(event, 'SD_Shape_SetTop')" onfocus="SD_Click(event, 'SD_BlockTextFromWorkArea')"
            onkeydown="SD_Click(event, 'SD_OnHTMKLKeyDown')" onkeypress="SD_Click(event, 'SD_FilterOnlyDistance')"
            allowneg="1" class="" value="102' 2 7/8&quot;">
        </div>
        <div class="docToolbar-shapeDetails-detailGroup">
          <span class="docToolbar-shapeDetails-detailGroup-detailLabel" id="wa-docToolbar-height">Height</span>
          <input id="wa-docToolbar-heightEdit" type="text" min="0.00" max="10000" step="0.10"
            onchange="SD_Change(event, 'SD_Shape_SetHeight')" onfocus="SD_Click(event, 'SD_BlockTextFromWorkArea')"
            onkeydown="SD_Click(event, 'SD_OnHTMKLKeyDown')" onkeypress="SD_Click(event, 'SD_FilterOnlyDistance')"
            allowneg="1" class="enabled" value="3'">
        </div>
        <div class="docToolbar-shapeDetails-detailGroup">
          <span class="docToolbar-shapeDetails-detailGroup-detailLabel" id="wa-docToolbar-width">Width</span>
          <input id="wa-docToolbar-widthEdit" type="text" min="0.00" max="10000" step="0.10"
            onchange="SD_Change(event, 'SD_Shape_SetWidth')" onfocus="SD_Click(event, 'SD_BlockTextFromWorkArea')"
            onkeydown="SD_Click(event, 'SD_OnHTMKLKeyDown')" onkeypress="SD_Click(event, 'SD_FilterOnlyDistance')"
            allowneg="1" class="enabled" value="131' 8&quot;">
        </div>
      </div>
    </div>
    <div class="document-toolbar-view-controls">
      <div class="minimap hide">
        <div class="minimap-scroller"></div>
        <canvas></canvas>
      </div>
      <div class="document-toolbar-view-control-buttons">
        <input id="wa-docToolbar-zoom" type="range" min="25" max="400" step="5" value="130"
          onchange="SD_Change(event, 'SD_Document_SetScale')"
          style="position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0;">
        <div class="rangeslider" id="js-rangeslider-0">
          <div class="rangeslider__fill" style="width: 7px;"></div>
          <div class="rangeslider__handle" style="left: 0px;"></div>
        </div>
        <output class="output" onclick="SD_Click(event, 'SD_DropDropdown')" dropdownid="dd-zoomOptions"
          orientation="up">
          130%
        </output>
        <div class="minimap-toggle">
          <pfe-icon icon="fluent-map" color="base" on="light" size="1x" pfelement="" class="PFElement"
            type="content"></pfe-icon>
        </div>
      </div>
    </div>
  </div>
</template>
