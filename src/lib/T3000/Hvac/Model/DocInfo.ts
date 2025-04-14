

/**
 * Represents the document and display configuration information.
 *
 * This class encapsulates various properties related to the display parameters (e.g., dimensions, DPI),
 * document dimensions, scroll positions, and scaling factors. It serves as a data model to aid in the
 * calculation and management of document rendering details such as converting document space to screen space,
 * applying DPI scaling, and tracking scroll bounds.
 *
 * @example
 * // Create and initialize a DocInfo instance with custom display and document parameters
 * const docInfo = new DocInfo();
 * docInfo.dispWidth = 1920;
 * docInfo.dispHeight = 1080;
 * docInfo.dispDpiX = 96;
 * docInfo.dispDpiY = 96;
 *
 * docInfo.docWidth = 800;
 * docInfo.docHeight = 600;
 * docInfo.docDpi = 72;
 *
 * // Calculate additional scaling factors here, if needed,
 * // such as setting docToScreenScale or determining the visible document area.
 *
 * @remarks
 * All numerical properties are initialized to zero by the constructor.
 * This class is intended for use in contexts where detailed knowledge of both display and document metrics
 * is necessary for operations like rendering, zooming, and scrolling.
 */
class DocInfo {
  dispX: number;
  dispY: number;
  dispWidth: number;
  dispHeight: number;
  dispDpiX: number;
  dispDpiY: number;
  scrollX: number;
  scrollY: number;
  docDpi: number;
  docScale: number;
  docWidth: number;
  docHeight: number;
  docToScreenScale: number;
  docDpiScale: number;
  docVisX: number;
  docVisY: number;
  docVisWidth: number;
  docVisHeight: number;
  docScreenX: number;
  docScreenY: number;
  docScreenWidth: number;
  docScreenHeight: number;
  maxScrollX: number;
  maxScrollY: number;

  constructor() {
    this.dispX = 0;
    this.dispY = 0;
    this.dispWidth = 0;
    this.dispHeight = 0;
    this.dispDpiX = 0;
    this.dispDpiY = 0;
    this.scrollX = 0;
    this.scrollY = 0;
    this.docDpi = 0;
    this.docScale = 0;
    this.docWidth = 0;
    this.docHeight = 0;
    this.docToScreenScale = 0;
    this.docDpiScale = 0;
    this.docVisX = 0;
    this.docVisY = 0;
    this.docVisWidth = 0;
    this.docVisHeight = 0;
    this.docScreenX = 0;
    this.docScreenY = 0;
    this.docScreenWidth = 0;
    this.docScreenHeight = 0;
    this.maxScrollX = 0;
    this.maxScrollY = 0;
  }
}

export default DocInfo;
