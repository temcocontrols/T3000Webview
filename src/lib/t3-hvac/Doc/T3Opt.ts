
import T3Gv from '../Data/T3Gv';
import DocUtil from './DocUtil';
import OptUtil from '../Opt/Opt/OptUtil';
import WallOpt from "../Opt/Wall/WallOpt";
import T3Clipboard from '../Opt/Clipboard/T3Clipboard'
import DataOpt from '../Opt/Data/DataOpt';
import EvtOpt from '../Event/EvtOpt';
import KeyboardOpt from '../Opt/Keyboard/KeyboardOpt';
import UserOpt from '../Opt/User/UserOpt';
import SvgUtil from '../Opt/Opt/SvgUtil';
// import Quasar from 'quasar';
// Placeholder: Quasar not used in React migration
const Quasar: any = null;
import QuasarUtil from '../Opt/Quasar/QuasarUtil';
import Basic from '../Data/Instance/Basic';
import Shape from '../Data/Instance/Shape';
import Instance, { initializeInstance } from "../Data/Instance/Instance";
import LayerUtil from '../Opt/Opt/LayerUtil';
import UIUtil from '../Opt/UI/UIUtil';
import ObjectUtil from '../Opt/Data/ObjectUtil';
import StateOpt from '../Data/State/StateOpt';
import DataStore from '../Data/State/DataStore';
import LogUtil from '../Util/LogUtil';

/**
 * Extends the global Window interface to include T3000 HVAC application references
 */
declare global {
  interface Window {
    docUtil: any;
    wallOpt: any;
  }
}

/**
 * Polyfill for getTransformToElement method which was deprecated/removed from SVGElement
 * Calculates transformation matrix from this element to the target element
 * @param element The target SVG element
 * @returns The transformation matrix between the two elements
 */
SVGElement.prototype.getTransformToElement = function (element: SVGElement): SVGMatrix {
  return element.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

/**
 * A class for managing document and UI operations in the T3 project.
 *
 * @remarks
 * The T3Opt class is responsible for initializing various subsystems necessary for the functioning
 * of the application. It orchestrates the setup of data state, document utilities, wall operations,
 * keyboard commands, event bindings, instance associations, clipboard operations, and stored data loading.
 *
 * The process includes:
 * - Initializing the application state and data store.
 * - Setting up a document utility and an option management system.
 * - Creating and configuring wall operations.
 * - Preventing the default context menu behavior in the browser.
 * - Configuring global keyboard event handlers using the KeyboardOpt class.
 * - Building and binding keyboard commands to UI interactions.
 * - Binding element control events via the EvtOpt class.
 * - Associating instance types for shapes and basic elements for later use.
 * - Initializing the clipboard for copy-paste functionalities.
 * - Loading any stored data and rendering all SVG objects.
 *
 * @example
 * // Instantiate and initialize the document operation system:
 * const t3Opt = new T3Opt();
 * t3Opt.Initialize();
 *
 * @public
 */
class T3Opt {

  public evtOpt: EvtOpt;//Event operations handler for managing UI event bindings
  public userOpt: UserOpt;

  //Initializes a new instance of the DocOpt class
  constructor() {
    this.evtOpt = new EvtOpt();
    // this.keyBoardOpt = new KeyboardOpt();
    this.userOpt = new UserOpt();
  }

  /**
   * Initializes the document operation system
   */
  Initialize(quasarInstance: any) {
    try {
      this.InitializeDocument(quasarInstance);
    } finally {
      // The guard must not survive init: a throw here would otherwise leave undo recording switched off
      // for the rest of the session.
      if (T3Gv.opt) {
        T3Gv.opt.noUndo = false;
      }
    }
  }

  /**
   * Builds and loads the document: state and object store, option manager, work area, the stored
   * objects and the SVG scene.
   *
   * Called only from `Initialize`, which switches undo recording off for the whole of this method and
   * clears it afterwards. The undo history is settled here, once the stored state and objects have
   * been loaded.
   */
  private InitializeDocument(quasarInstance: any) {

    T3Gv.quasar = quasarInstance;
    QuasarUtil.quasar = quasarInstance;

    // Initialize Instance with modules to avoid circular references
    initializeInstance(Basic, Shape);

    // Initialize data state and store
    DataOpt.InitStateAndStore();

    // Set up document handler and option manager
    T3Gv.docUtil = new DocUtil();
    T3Gv.opt = new OptUtil();

    // `InitBlockData` — the five scaffolding blocks — suppresses its own writes, because it runs at the
    // end of `InitializeProperties`, which resets the flag on its way through.
    T3Gv.opt.InitializeProperties();

    // Undo recording stays off for the rest of init: every object the stored document brings in, the
    // SVG scene and the settings loaded below are all part of loading, not user edits.
    T3Gv.opt.noUndo = true;

    T3Gv.opt.Initialize();

    // Initialize wall operations
    T3Gv.wallOpt = new WallOpt();

    // Prevent default context menu
    window.oncontextmenu = function (event) {
      event.preventDefault();
    };

    // Set up keyboard event handlers
    window.onkeydown = KeyboardOpt.OnKeyDown;
    window.onkeyup = KeyboardOpt.OnKeyUp;
    window.onkeypress = KeyboardOpt.OnKeyPress;

    // Expose handlers to window for external access
    window.docUtil = T3Gv.docUtil;
    window.wallOpt = T3Gv.wallOpt;

    // Bind element control events
    this.evtOpt.BindElemCtlEvent();

    // Initialize clipboard
    T3Clipboard.Init();

    // Load stored data
    DataOpt.InitStoredData();
    DataOpt.LoadAppStateV2();

    // The undo ring and the object store are both final now, so the history is settled here — before
    // anything can persist it (`SetZoomLevel` at the end of this method writes the ring straight back
    // to localStorage, and GetUndoState/AddToCurrentState depend on what it holds). Nothing after this
    // point can record a state anyway: undo recording is still switched off.
    T3Gv.state.FinalizeLoadedHistory();

    // Render all SVG objects
    SvgUtil.RenderAllSVGObjects();

    this.userOpt.Initialize();

    // Test for SDData object
    LogUtil.Debug("= o.T3Opt: Initialize/ - After initialize all and the T3Gv.stdObj loaded from storage data:", T3Gv.opt.sdDataBlockId, T3Gv.stdObj);

    // Load rulers and grid settings from local storage
    T3Gv.docUtil.LoadRulersSetting();
    T3Gv.docUtil.LoadGridSetting();

    // Set the document scale (0.25 to 4)
    const docSetting = DataOpt.LoadDocSettingData();
    const zoomPct = (docSetting?.docInfo?.docScale ?? 1) * 100;
    T3Gv.docUtil.SetZoomLevel(zoomPct);
    T3Gv.docUtil.UpdateRefZoomScale(docSetting?.docInfo?.docScale ?? 1);

    LogUtil.Debug(`= o.T3Opt: Initialize/ - After initialize all and set SetZoomLevel for resizing the work area:${zoomPct}`);
  }

  ReInitialize() {
    try {
      this.ReInitializeDocument();
    } finally {
      // Same contract as `Initialize`: the guard must not survive the rebuild.
      if (T3Gv.opt) {
        T3Gv.opt.noUndo = false;
      }
    }
  }

  /**
   * Rebuilds the document in place (used when the engine has to be re-mounted with new container ids).
   *
   * Called only from `ReInitialize`, which owns the undo-recording guard and settles the history once
   * this has returned.
   */
  private ReInitializeDocument() {

    // T3Gv.docUtil.RemoveAllLayers();

    // $("#c-ruler").html("");
    // $("#h-ruler").html("");
    // $("#v-ruler").html("");
    // $("#svg-area").html("");

    // Initialize Instance with modules to avoid circular references
    initializeInstance(Basic, Shape);

    // Initialize data state and store
    DataOpt.InitStateAndStore();

    // Set up document handler and option manager
    // T3Gv.docUtil = new DocUtil();
    // T3Gv.opt = new OptUtil();

    // Undo recording stays off for the whole rebuild — see `InitializeDocument`.
    T3Gv.opt.InitializeProperties();
    T3Gv.opt.noUndo = true;

    // T3Gv.opt.InitBlockData();

     T3Gv.opt.Initialize(false);

    DataOpt.SaveToLocalStorage();

    // Initialize wall operations
    T3Gv.wallOpt = new WallOpt();

    // Prevent default context menu
    window.oncontextmenu = function (event) {
      event.preventDefault();
    };

    // Set up keyboard event handlers
    window.onkeydown = KeyboardOpt.OnKeyDown;
    window.onkeyup = KeyboardOpt.OnKeyUp;
    window.onkeypress = KeyboardOpt.OnKeyPress;

    // Expose handlers to window for external access
    window.docUtil = T3Gv.docUtil;
    window.wallOpt = T3Gv.wallOpt;

    // Bind element control events
    this.evtOpt.BindElemCtlEvent();

    // Initialize clipboard
    T3Clipboard.Init();

    // Load stored data
    DataOpt.InitStoredData();
    DataOpt.LoadAppStateV2();

    // Settle the history once the ring and the store are final — see `InitializeDocument`.
    T3Gv.state.FinalizeLoadedHistory();

    // Render all SVG objects
    // SvgUtil.RenderAllSVGObjects();

    this.userOpt.Initialize();

    // Test for SDData object
    LogUtil.Debug("= o.T3Opt: Initialize/ - After initialize all and the T3Gv.stdObj loaded from storage data:", T3Gv.opt.sdDataBlockId, T3Gv.stdObj);

    // Load rulers and grid settings from local storage
    T3Gv.docUtil.LoadRulersSetting();
    T3Gv.docUtil.LoadGridSetting();

    // Set the document scale (0.25 to 4)
    const docSetting = DataOpt.LoadDocSettingData();
    const zoomPct = (docSetting?.docInfo?.docScale ?? 1) * 100;
    T3Gv.docUtil.SetZoomLevel(zoomPct);
    T3Gv.docUtil.UpdateRefZoomScale(docSetting?.docInfo?.docScale ?? 1);

    LogUtil.Debug(`= o.T3Opt: Initialize/ - After initialize all and set SetZoomLevel for resizing the work area:${zoomPct}`);
  }
}

export default T3Opt
