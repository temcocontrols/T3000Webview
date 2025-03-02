

import BaseSymbol from './Shape.BaseSymbol'
import Element from '../Basic/Basic.Element';
import ConstantData from '../Data/ConstantData'

class BitmapSymbol extends BaseSymbol {

  constructor(options) {
    options = options || {};
    options.ShapeType = ConstantData.ShapeType.BITMAPSYMBOL;

    console.log('S.BitmapSymbol: Constructor input options:', options);
    super(options);
    console.log('S.BitmapSymbol: Constructor output instance:', this);
  }

  CreateShape(drawingContext) {
    console.log('S.BitmapSymbol: CreateShape - Input drawingContext:', drawingContext);

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      console.log('S.BitmapSymbol: CreateShape - Not visible, returning null.');
      return null;
    }

    const containerShape = drawingContext.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const imageShape = drawingContext.CreateShape(ConstantData.CreateShapeType.IMAGE);

    imageShape.SetID(ConstantData.SVGElementClass.SHAPE);
    imageShape.SetURL(this.SymbolURL);

    const isFlippedHorizontally = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz) > 0;
    const isFlippedVertically = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert) > 0;

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
      this.LM_AddSVGTextObject(drawingContext, containerShape);
    }

    console.log('S.BitmapSymbol: CreateShape - Output containerShape:', containerShape);
    return containerShape;
  }
}

export default BitmapSymbol
