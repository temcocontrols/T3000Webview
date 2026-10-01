/**
 * HVAC Drawing Area Component
 * Contains rulers and main SVG drawing area
 *
 * NOTE: This component provides the DOM structure that the t3-hvac library manipulates.
 * The library uses Hammer.js for all drawing interactions via its internal event system.
 * We do NOT need to manually handle click events - Hammer.js does this automatically.
 */

import React, { useRef, useEffect } from 'react';
import styles from './HvacDrawingArea.module.css';
import { useHvacDesignerStore } from '../store/designerStore';
import Hvac from '@/lib/t3-hvac';
import { isDrawing, selectedTool, continuesObjectTypes, startTransform, appState } from '@/lib/t3-hvac';
import { TEXT_ENTRY_PROXY_ID } from '@/lib/t3-hvac/Data/Constant/AreaIds';

/** Container ids. Defaults are the historical ids the engine used before it became configurable. */
export interface HvacDrawingAreaIds {
  documentArea: string;
  svgArea: string;
  hRuler: string;
  vRuler: string;
  cRuler: string;
}

const DEFAULT_IDS: HvacDrawingAreaIds = {
  documentArea: 'document-area',
  svgArea: 'svg-area',
  hRuler: 'h-ruler',
  vRuler: 'v-ruler',
  cRuler: 'c-ruler',
};

/**
 * Off-screen text-entry proxy styling.
 *
 * Copied from the origin page (`app/SmartDraw.htm`, `#SDTS_TouchProxy`). The engine overwrites position,
 * size, opacity, colour and visibility itself the moment an edit starts (`OptUtil.VirtualKeyboardLifter`),
 * so these values only matter for the window between mount and the first edit.
 */
const TEXT_ENTRY_PROXY_STYLE: React.CSSProperties = {
  color: 'transparent',
  position: 'fixed',
  zIndex: -1,
  left: -1000,
  top: -1000,
  width: 0,
  height: 0,
  padding: 0,
  margin: 0,
  border: 0,
  borderRadius: 0,
  touchAction: 'none',
  textAlign: 'center',
};

/** Origin styling (`app/SmartDraw.htm`, `#_crossTabClipboardDiv`) — present in the DOM, 0×0, clipped. */
const CLIPBOARD_HELPER_STYLE: React.CSSProperties = {
  position: 'absolute',
  zIndex: 10000,
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  overflow: 'hidden',
};

export const HvacDrawingArea: React.FC<{ ids?: HvacDrawingAreaIds }> = ({ ids = DEFAULT_IDS }) => {
  const svgAreaRef = useRef<HTMLDivElement>(null);
  const { activeTool } = useHvacDesignerStore();

  // NOTE: Viewport clicks are handled by Hammer.js via Evt_WorkAreaHammerClick
  // which is bound in UIUtil.InitT3GvOpt() during library initialization.
  // We do NOT need handleViewportClick - the library's event system handles it automatically.

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
      }
    }
  };

  // NOTE: Right-click is also handled by Hammer.js via MouseUtil.IsRightClick check
  // in Evt_WorkAreaHammerClick. No need for React event handler.

  return (
    <div id={ids.documentArea} className={styles.documentArea}>
      {/* Corner ruler (top-left 20x20 square) */}
      <div id={ids.cRuler} className={styles.rulerCorner} />

      {/* Horizontal ruler (top) */}
      <div id={ids.hRuler} className={styles.rulerHorizontal} />

      {/* Vertical ruler (left) */}
      <div id={ids.vRuler} className={styles.rulerVertical} />

      {/* Main SVG drawing area - Events handled by Hammer.js (library manages all interactions) */}
      <div
        id={ids.svgArea}
        className={styles.svgArea}
        ref={svgAreaRef}
        onMouseMove={handleViewportMouseMove}
        tabIndex={0}
      >
        {/* SVG content is created and managed by the t3-hvac library via DOM manipulation */}
        {/* Drawing interactions are handled via Hammer.js events bound in UIUtil.InitT3GvOpt() */}
      </div>

      {/*
       * The engine's text-entry proxy — without it inline text editing silently drops every character.
       *
       * Typing goes through *this* element, not through the engine's keyboard handler:
       * `B.Text.Edit.InitTextEntry` binds its native `input` event and `HandleTextEntryFieldUpdate`
       * inserts into the editor. `OptUtil.SetVirtualKeyboardLifter` resolves it by id (lazily, so render
       * order does not matter) and hands it to the active editor, which then keeps it invisible,
       * off-screen and focused.
       *
       * A `<textarea>`, not an `<input>`: a single-line input cannot hold a `\n`, so a multi-line text label
       * could never break its line — the break is inserted *by the browser* into this field and reaches the
       * editor through its `input` event. The origin page carries the same element (`textarea#SDTS_TouchProxy`
       * beside the input). The engine overwrites position/size/opacity itself. `rows={1}` only avoids a tall
       * default box before the first edit.
       *
       * WHY IT SITS BESIDE THE DRAWING AREA AND NOT INSIDE IT: `HvacDocument` empties `svg-area`, `h-ruler` and
       * `v-ruler` with `replaceChildren()` when it initialises, to drop the DOM a previous mount left
       * behind. Anything React renders in there is detached while React still believes it is mounted, and
       * the engine then cannot find it (measured: the input existed in the module but not in the DOM).
       * This document-area div is React's, and the engine only ever touches its four children.
       */}
      <textarea
        id={TEXT_ENTRY_PROXY_ID}
        rows={1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-hidden="true"
        tabIndex={-1}
        style={TEXT_ENTRY_PROXY_STYLE}
      />

      {/*
       * The hidden clipboard fields the engine's clipboard module looks up **by id** at init
       * (`T3Clipboard.Init` → `#_IEclipboardDiv`, `#_clipboardInput`). The origin declares them in the page
       * (`app/SmartDraw.htm`); here the engine's host owns them, and that is load-bearing: the port's `Init` returns
       * early — *"Required DOM elements not found, skipping clipboard initialization"* — when
       * `#_clipboardInput` is missing, so **no** `copy`/`cut`/`paste` document listener is installed and
       * nothing the browser copies (text or shapes) ever reaches the engine.
       *
       * `T3Clipboard.FocusOnClipboardInput()` parks focus here after every drawing mouse-up, which is how the
       * module recognises an engine copy; `useHtmlFocusGuard` therefore ignores these ids — otherwise a
       * click on the drawing area would look like typing in a panel and close the engine's typing gate.
       */}
      <div id="_crossTabClipboardDiv" style={CLIPBOARD_HELPER_STYLE}>
        <div id="_IEclipboardDiv" contentEditable />
        <input id="_clipboardInput" type="text" defaultValue=" " tabIndex={-1} aria-hidden="true" />
      </div>
    </div>
  );
};
