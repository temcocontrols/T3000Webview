

import BaseSymbol from './S.BaseSymbol'
import NvConstant from '../Data/Constant/NvConstant'
import OptConstant from '../Data/Constant/OptConstant';

/**
 * Represents a bitmap image symbol in the HVAC visualization system.
 *
 * The BitmapSymbol class allows displaying bitmap images as symbols within
 * the drawing context. It supports image positioning, sizing, and transformations
 * such as horizontal and vertical flipping.
 *
 * @extends BaseSymbol
 * @example
 * ```typescript
 * // Create a new bitmap symbol
 * const bitmapOptions = {
 *   SymbolURL: 'path/to/image.png',
 *   Frame: { x: 100, y: 100, width: 200, height: 150 },
 *   DataID: 42, // Optional: ID for data binding
 *   extraflags: OptConstant.ExtraFlags.FlipHoriz // Optional: apply transformations
 * };
 *
 * const bitmapSymbol = new BitmapSymbol(bitmapOptions);
 *
 * // Add the symbol to a drawing context
 * const shape = bitmapSymbol.CreateShape(drawingContext);
 * container.AddElement(shape);
 * ```
 */
class BitmapSymbol extends BaseSymbol {

  /**
   * Creates a new bitmap symbol instance
   * @param options - Configuration options for the bitmap symbol
   */
  constructor(options: any) {
    options.ShapeType = OptConstant.ShapeType.BitmapSymbol;

    super(options);
  }

  /**
   * Creates the visual representation of the bitmap symbol
   * @param drawingContext - The context used to create and manipulate shapes
   * @returns The container shape with the bitmap symbol or null if not visible
   */
  CreateShape(drawingContext) {
    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      return null;
    }

    const containerShape = drawingContext.CreateShape(OptConstant.CSType.ShapeContainer);
    const imageShape = drawingContext.CreateShape(OptConstant.CSType.Image);

    imageShape.SetID(OptConstant.SVGElementClass.Shape);
    imageShape.SetURL(this.SymbolURL);

    const isFlippedHorizontally = (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) > 0;
    const isFlippedVertically = (this.extraflags & OptConstant.ExtraFlags.FlipVert) > 0;

    if (isFlippedHorizontally) {
      imageShape.SetMirror(isFlippedHorizontally);
    }
    if (isFlippedVertically) {
      imageShape.SetFlip(isFlippedVertically);
    }

    const frame = this.Frame;
    this.GetFieldDataStyleOverride();

    const width = frame.width;
    const height = frame.height;

    containerShape.SetSize(width, height);
    containerShape.SetPos(frame.x, frame.y);
    imageShape.SetSize(width, height);
    containerShape.AddElement(imageShape);
    containerShape.isShape = true;

    if (this.DataID !== -1) {
      this.LMAddSVGTextObject(drawingContext, containerShape);
    }

    return containerShape;
  }
}

export default BitmapSymbol
