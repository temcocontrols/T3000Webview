
import NvConstant from "../Data/Constant/NvConstant"

/**
 * Represents a list container that manages a collection of child elements with layout configurations.
 *
 * @remarks
 * The ContainerList class provides a structured way to organize child elements using
 * defined spacing, alignment, and layout arrangement parameters. It encapsulates several
 * properties to control the overall dimensions, child dimensions, and layout behavior.
 *
 * The layout can be configured using properties such as horizontal and vertical spacing,
 * alignment settings (both horizontal and vertical), and wrapping rules. Additionally,
 * properties like "nacross" and "ndown" can be used to control the number of children displayed
 * in grid formations.
 *
 * @example
 * ```typescript
 * // Create a new container list instance
 * const container = new ContainerList();
 *
 * // Adjust the layout properties as needed
 * container.HorizontalSpacing = 15;
 * container.VerticalSpacing = 15;
 * container.AlignH = 'left';
 * container.AlignV = 'middle';
 *
 * // Add child elements to the container’s list
 * container.List.push({ id: 1, name: 'First Element' });
 * container.List.push({ id: 2, name: 'Second Element' });
 *
 * // Use additional properties to further customize the layout if needed
 * container.childwidth = 200;
 * container.childheight = 100;
 * ```
 *
 * @property {number} Arrangement - Defines the layout arrangement type, e.g., column or row. Typically,
 *                                  this refers to constants such as NvConstant.ContainerListArrangements.Column.
 * @property {number} HorizontalSpacing - The spacing (in pixels) between child elements horizontally.
 * @property {number} VerticalSpacing - The spacing (in pixels) between child elements vertically.
 * @property {string} AlignH - The horizontal alignment for child elements (e.g., 'center', 'left', or 'right').
 * @property {string} AlignV - The vertical alignment for child elements (e.g., 'top', 'middle', or 'bottom').
 * @property {number} Wrap - Determines whether and how child elements wrap to the next line when exceeding available space.
 * @property {number} height - The overall height of the container.
 * @property {number} width - The overall width of the container.
 * @property {number} MinWidth - The minimum width of the container, including adjustments for spacing.
 * @property {number} MinHeight - The minimum height of the container, including adjustments for spacing.
 * @property {number} flags - A bitmask or set of flags representing various configuration states.
 * @property {number} nacross - The number of child elements placed horizontally.
 * @property {number} ndown - The number of child elements placed vertically.
 * @property {number} childwidth - The default width allocated for each child element.
 * @property {number} childheight - The default height allocated for each child element.
 * @property {any[]} List - The array that holds child elements contained within this container.
 */
class ContainerList {

  public Arrangement: number;
  public HorizontalSpacing: number;
  public VerticalSpacing: number;
  public AlignH: string;
  public AlignV: string;
  public Wrap: number;
  public height: number;
  public width: number;
  public MinWidth: number;
  public MinHeight: number;
  public flags: number;
  public nacross: number;
  public ndown: number;
  public childwidth: number;
  public childheight: number;
  public List: any[];

  constructor() {
    this.Arrangement = NvConstant.ContainerListArrangements.Column;
    this.HorizontalSpacing = 10;
    this.VerticalSpacing = 10;
    this.AlignH = 'center';
    this.AlignV = 'top';
    this.Wrap = 0;
    this.height = 0;
    this.width = 0;
    this.MinWidth = 150 + 2 * this.VerticalSpacing;
    this.MinHeight = 75 + 2 * this.HorizontalSpacing;
    this.flags = 0;
    this.nacross = 1;
    this.ndown = 1;
    this.childwidth = 150;
    this.childheight = 75;
    this.List = [];
  }
}

export default ContainerList
