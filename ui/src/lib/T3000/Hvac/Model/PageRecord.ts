
/**
 * Represents a record defining the page layout including paper size, minimum size, and margins.
 *
 * This class encapsulates parameters used for defining the page dimensions
 * where:
 * - paper size defines the physical dimensions,
 * - minimum size defines the minimal allowable dimensions for a page, and
 * - margins specify the whitespace around the page edges.
 *
 * @remarks
 * The default values are set within the constructor:
 * - papersize default is { x: 1100, y: 850 }.
 * - minsize default is { x: 1000, y: 750 }.
 * - margins default is { left: 50, top: 50, right: 50, bottom: 50 }.
 *
 * @example
 * Here's how to instantiate and use the PageRecord class:
 *
 * const pageRecord = new PageRecord();
 * console.log(pageRecord.papersize);  // Output: { x: 1100, y: 850 }
 * console.log(pageRecord.minsize);    // Output: { x: 1000, y: 750 }
 * console.log(pageRecord.margins);    // Output: { left: 50, top: 50, right: 50, bottom: 50 }
 */
class PageRecord {

  public papersize: any;
  public minsize: any;
  public margins: any;

  constructor() {
    this.papersize = { x: 1100, y: 850 };
    this.minsize = { x: 1000, y: 750 };
    this.margins = { left: 50, top: 50, right: 50, bottom: 50 };
  }
}

export default PageRecord;
