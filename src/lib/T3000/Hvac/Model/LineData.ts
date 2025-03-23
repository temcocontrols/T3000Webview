
import { Type } from 'class-transformer'
import 'reflect-metadata'
import PaintData from './PaintData'
import NvConstant from '../Data/Constant/NvConstant'

/**
 * Represents the styling and drawing configuration of a line.
 *
 * @remarks
 * The LineData class encapsulates various properties that define the visual
 * appearance of a line, including its paint (color, gradient, etc.), hatch pattern,
 * line effect, thickness, line pattern, border thickness, edge color,
 * and additional parameters (LParam and WParam). The constructor initializes these properties
 * with default values, ensuring a consistent baseline for line rendering.
 *
 * The class also provides a fluent API via the {@link SetPaint} method, allowing for
 * easy modification of the paint configuration.
 *
 * @example
 * Here's an example of how to create and configure a line:
 * ```typescript
 * // Create a new instance of LineData with default values
 * const line = new LineData();
 *
 * // Modify the paint using the SetPaint method
 * // Assume PaintData is properly imported and instantiated with a color value.
 * line.SetPaint(new PaintData('#FF0000'));
 *
 * // Optionally, adjust other properties as needed
 * line.Thickness = 3;
 * line.EdgeColor = '#000000';
 *
 * console.log(line);
 * ```
 *
 * @see PaintData
 */
class LineData {

  @Type(() => PaintData)
  public Paint: PaintData;

  public Hatch: number;
  public LineEffect: number;
  public Thickness: number;
  public LinePattern: number;
  public BThick: number;
  public EdgeColor: string;
  public LParam: number;
  public WParam: number;

  constructor() {

    //'#00FF00'
    this.Paint = new PaintData(NvConstant.Colors.Gray);
    this.Hatch = 0;
    this.LineEffect = 0;
    this.Thickness = NvConstant.StyleDefaults.DefThick;
    this.LinePattern = 0;
    this.BThick = 0;
    this.EdgeColor = null;
    this.LParam = 0;
    this.WParam = 0;
  }

  SetPaint = (paint: PaintData) => {
    this.Paint = paint;
    return this;
  }
}

export default LineData
