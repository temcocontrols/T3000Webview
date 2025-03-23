
import { Type } from 'class-transformer'
import 'reflect-metadata'
import FillData from './FillData'
import LineData from './LineData'
import OutsideEffectData from './OutsideEffectData'
import TextFmtData from './TextFmtData'

/**
 * Represents a style configuration used for HVAC components, encapsulating visual properties such as fill, border, line, outside effects, and text formatting.
 *
 * The QuickStyle class provides a structured format for defining and applying a consistent style to various components through its properties.
 *
 * @example
 * // Create an instance of QuickStyle and customize its properties
 * const style = new QuickStyle();
 * style.Name = 'CustomStyle';
 * style.Fill.color = '#FFFFFF'; // Example: Assign a white fill color
 * style.Border.width = 2;       // Example: Set border width to 2 pixels
 * style.Line.style = 'dashed';  // Example: Define the line style as dashed
 * style.Text.font = 'Arial';    // Example: Set text font to Arial
 * console.log(style);
 *
 * @remarks
 * This class uses decorators (e.g., @Type) from the class-transformer library to facilitate data transformation
 * during serialization and deserialization processes. Each property that represents a complex type is decorated accordingly.
 *
 * @property {string} Name - The name of the style. Defaults to "Style7" upon instantiation.
 * @property {LineData} Border - Holds border styling data. Uses a type transformer for proper conversion.
 * @property {FillData} Fill - Contains fill settings such as color and pattern. Uses a type transformer for proper conversion.
 * @property {LineData} Line - Defines the line styling properties. Uses a type transformer to enforce the type during transformation.
 * @property {OutsideEffectData} OutsideEffect - Encapsulates outside effect styling details. Uses a type transformer for correct conversion.
 * @property {TextFmtData} Text - Stores text formatting specifications. Uses a type transformer to maintain type integrity.
 * @property {*} StyleRecord - A flexible record to store additional or custom style-related data.
 */
class QuickStyle {
  public Name: string;

  @Type(() => LineData)
  public Border: LineData;

  @Type(() => FillData)
  public Fill: FillData;

  @Type(() => LineData)
  public Line: LineData;

  @Type(() => OutsideEffectData)
  public OutsideEffect: OutsideEffectData;

  @Type(() => TextFmtData)
  public Text: TextFmtData;

  public StyleRecord: any;

  constructor() {
    this.Name = 'Style7';
    this.Fill = new FillData();
    this.Border = new LineData();
    this.OutsideEffect = new OutsideEffectData();
    this.Text = new TextFmtData();
    this.Line = new LineData();
  }
}

export default QuickStyle


