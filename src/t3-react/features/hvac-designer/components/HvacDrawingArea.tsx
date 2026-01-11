/**
 * HVAC Drawing Area Component
 * Contains rulers and main SVG drawing area
 */

import React, { useRef, useEffect } from 'react';
import styles from './HvacDrawingArea.module.css';
import { useHvacDesignerStore } from '../store/designerStore';
import Hvac from '@/lib/t3-hvac';
import { isDrawing, selectedTool, continuesObjectTypes, startTransform, appState } from '@/lib/t3-hvac';

export const HvacDrawingArea: React.FC = () => {
  const svgAreaRef = useRef<HTMLDivElement>(null);
  const { activeTool } = useHvacDesignerStore();

  // Handle viewport left click - create objects using library logic
  const handleViewportClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    // Call the library's viewportLeftClick method which handles the drawing logic
    Hvac.IdxPage2.viewportLeftClick(ev.nativeEvent);
  };

  // Handle viewport mouse move - for continuous drawing (lines, ducts, walls)
  const handleViewportMouseMove = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!svgAreaRef.current) return;

    // Process drawing for continuous objects (Line, Duct, Wall)
    if (
      isDrawing.value &&
      continuesObjectTypes.includes(selectedTool.value?.name || '') &&
      appState.value?.activeItemIndex !== null
    ) {
      const rect = svgAreaRef.current.getBoundingClientRect();
      const viewportMargins = { left: rect.left, top: rect.top };
      const scalPercentage = 1 / (appState.value?.viewportTransform?.scale || 1);

      // Check if the Ctrl key is pressed for angle snapping
      const isCtrlPressed = ev.ctrlKey;

      // Calculate the distance and angle between the initial point and mouse cursor
      const mouseX = (ev.clientX - viewportMargins.left - (appState.value?.viewportTransform?.x || 0)) * scalPercentage;
      const mouseY = (ev.clientY - viewportMargins.top - (appState.value?.viewportTransform?.y || 0)) * scalPercentage;
      const dx = mouseX - startTransform.value[0];
      const dy = mouseY - startTransform.value[1];
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Rotate in 5-degree increments when Ctrl is held
      if (isCtrlPressed) {
        angle = Math.round(angle / 5) * 5;
      }

      const distance = Math.sqrt(dx * dx + dy * dy);

      // Set the scale and rotation of the drawing line
      if (appState.value?.items && appState.value.activeItemIndex !== null) {
        appState.value.items[appState.value.activeItemIndex].rotate = angle;
        appState.value.items[appState.value.activeItemIndex].width = distance;

        // Trigger refresh
        // TODO: Call refreshObjects() when library is fully connected
        console.log('Drawing continuous object - angle:', angle, 'distance:', distance);
      }
    }
  };

  // Handle right click - cancel drawing using library logic
  const handleRightClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    // Call the library's viewportRightClick method
    Hvac.IdxPage2.viewportRightClick(ev.nativeEvent);
  };

  return (
    <div id="document-area" className={styles.documentArea}>
      {/* Corner ruler (top-left 20x20 square) */}
      <div id="c-ruler" className={styles.rulerCorner} />

      {/* Horizontal ruler (top) */}
      <div id="h-ruler" className={styles.rulerHorizontal} />

      {/* Vertical ruler (left) */}
      <div id="v-ruler" className={styles.rulerVertical} />

      {/* Main SVG drawing area */}
      <div
        id="svg-area"
        className={styles.svgArea}
        ref={svgAreaRef}
        onClick={handleViewportClick}
        onMouseMove={handleViewportMouseMove}
        onContextMenu={handleRightClick}
        tabIndex={0}
      >
        {/* SVG content will be rendered here by the existing logic */}
      </div>
    </div>
  );
};
