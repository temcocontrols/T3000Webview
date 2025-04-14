
/**
 * Represents the default style configuration for HVAC model elements.
 *
 * This class encapsulates the default values for various text styling properties such as font family, typeface,
 * size, and color among others. It is typically used to initialize a consistent style for display elements,
 * ensuring a baseline appearance that can be customized if needed.
 *
 * @remarks
 * The DefaultStyle class includes the following properties:
 * - font: The font family (default is "Arial").
 * - type: The font type, e.g., "sanserif" (default is "sanserif").
 * - size: The font size in points (default is 10).
 * - weight: The font weight, e.g., "normal", "bold" (default is "normal").
 * - style: The font style, such as "normal" or "italic" (default is "normal").
 * - baseOffset: The baseline offset for text alignment (default is "none").
 * - decoration: Text decoration like underline or none (default is "none").
 * - color: The text color specified in hexadecimal format (default is "#000").
 * - colorTrans: The transparency level of the color (default is 1).
 * - spError: A flag to indicate a special error condition (default is false).
 * - dataField: A flexible field to hold additional style-related data (default is null).
 * - hyperlink: A numeric identifier for hyperlink actions, where -1 indicates no hyperlink (default is -1).
 *
 * @example
 * // Create a new instance of DefaultStyle with default values.
 * const defaultStyle = new DefaultStyle();
 * console.log(defaultStyle.font); // Output: "Arial"
 * console.log(defaultStyle.size); // Output: 10
 *
 * // Customize some of the style properties.
 * defaultStyle.font = "Helvetica";
 * defaultStyle.size = 12;
 * defaultStyle.color = "#333";
 *
 * // Use the customized style configuration in your HVAC control implementation.
 */
class DefaultStyle {

  public font: string;
  public type: string;
  public size: number;
  public weight: string;
  public style: string;
  public baseOffset: string;
  public decoration: string;
  public color: string;
  public colorTrans: number;
  public spError: boolean;
  public dataField: any;
  public hyperlink: number;

  constructor() {

    this.font = 'Arial';
    this.type = 'sanserif';
    this.size = 10;
    this.weight = 'normal';
    this.style = 'normal';
    this.baseOffset = 'none';
    this.decoration = 'none';
    this.color = '#000';
    this.colorTrans = 1;
    this.spError = false;
    this.dataField = null;
    this.hyperlink = -1;

  }
}

export default DefaultStyle
