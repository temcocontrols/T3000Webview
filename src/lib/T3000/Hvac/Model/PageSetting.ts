import MarginModel from "./MarginModel";
import Point from "./Point";
import { Type } from 'class-transformer'
import 'reflect-metadata'

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
 * - papersize default is { x: screen width, y: screen height }.
 * - minsize default is { x: 1000, y: 750 }.
 * - margins default is { left: 50, top: 50, right: 50, bottom: 50 }.
 *
 * @example
 * Here's how to instantiate and use the PageSetting class:
 *
 * const pageSetting = new PageSetting();
 * console.log(pageSetting.papersize);  // Output: { x: 1100, y: 850 }
 * console.log(pageSetting.minsize);    // Output: { x: 1000, y: 750 }
 * console.log(pageSetting.margins);    // Output: { left: 50, top: 50, right: 50, bottom: 50 }
 */
class PageSetting {

  // Defines the physical dimensions of the page (width and height)
  @Type(() => Point)
  public papersize: Point;

  // Defines the minimum allowable dimensions for a page
  @Type(() => Point)
  public minsize: Point;

  // Specifies the whitespace around the page edges
  @Type(() => MarginModel)
  public margins: MarginModel;

  constructor() {

    // Get current screen dimensions using multiple browser properties for compatibility
    // across different browsers and scenarios
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    // Use responsive dimensions based on the current screen size instead of fixed values
    this.papersize = new Point(screenWidth, screenHeight);

    // Set minimum page dimensions to ensure content has enough space
    this.minsize = new Point(1000, 750);

    // Set uniform margins around all sides of the page
    this.margins = new MarginModel(50, 50, 50, 50);
  }
}

export default PageSetting
