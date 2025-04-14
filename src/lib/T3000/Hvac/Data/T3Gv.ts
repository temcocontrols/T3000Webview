

import DocUtil from "../Doc/DocUtil";
import OptUtil from "../Opt/Opt/OptUtil";
import WallOpt from "../Opt/Wall/WallOpt";
import DataStore from "./State/DataStore";
import StateOpt from "./State/StateOpt";

class T3Gv {

  /**
   * T3Gv class manages global variables and state for the T3000 application.
   * This class provides centralized access to common utilities, settings, and event handlers.
   */
  static clipboard: any;                  // Stores clipboard data for copy/paste operations
  static currentObjSeqId: number;         // Tracks the current object sequence ID
  static docUtil: DocUtil;                // Document utility helper
  static opt: OptUtil;                    // Operation utility helper
  static wallOpt: WallOpt;                // Wall options configuration
  static maxUndo: number = 25;            // Maximum number of undo operations stored
  static state: StateOpt;                 // Application state utility
  static stdObj: DataStore;             // Standard object storage
  static userSetting: any;                // User preferences and settings

  // Event handlers
  static Evt_ShapeDragStart: any;          // Event for when shape dragging begins
  static Evt_LMShapeHold: any;             // Event for when shape is held
  static Evt_LMShapeDoubleTap: any;        // Event for when shape is double tapped
  static Evt_StampObjectDragEnd: any;      // Event for when stamp object dragging ends
  static Evt_LMMouseStpObjectDone: any;    // Event for when mouse stamp object operation completes

  static arrowHlkTable: any = [];          // Arrowhead lookup table
  static arrowHsTable: any = [];           // Arrowhead size table

  static gFmtTextObj: any;                 // Global formatted text object
  static quasar: any;                      // Quasar framework instance
}

export default T3Gv
