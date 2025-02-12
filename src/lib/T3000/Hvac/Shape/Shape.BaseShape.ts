

import ConstantData from '../Data/ConstantData'
import BaseDrawingObject from './Shape.BaseDrawingObject'

class BaseShape extends BaseDrawingObject {

  public ShapeType: any;
  public shapeparam: any;
  public SVGDim: any;

  constructor(options: any) {
    console.log("= S.BaseShape: Input options:", options);

    options = options || {};
    options.DrawingObjectBaseClass = ConstantData.DrawingObjectBaseClass.SHAPE;

    if (options.hookflags !== 0) {
      options.hookflags =
        ConstantData.HookFlags.SED_LC_Shape | ConstantData.HookFlags.SED_LC_AttachToLine;
    }

    if (options.targflags !== 0) {
      options.targflags =
        ConstantData.HookFlags.SED_LC_Shape | ConstantData.HookFlags.SED_LC_Line;
    }

    super(options);

    this.ShapeType = options.ShapeType;
    this.shapeparam = options.shapeparam || 0;
    this.SVGDim = options.SVGDim || {};

    console.log("= S.BaseShape: Output state:", {
      ShapeType: this.ShapeType,
      shapeparam: this.shapeparam,
      SVGDim: this.SVGDim
    });
  }
}

export default BaseShape
