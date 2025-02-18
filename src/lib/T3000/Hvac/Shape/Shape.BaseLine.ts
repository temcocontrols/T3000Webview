



import BaseDrawingObject from './Shape.BaseDrawingObject'
import Utils2 from "../Helper/Utils2";
import Instance from "../Data/Instance/Instance"
import ConstantData from "../Data/ConstantData"

class BaseLine extends BaseDrawingObject {

  public LineType: any;
  public linetrect: any;
  public theMinTextDim: any;
  public TextWrapWidth: any;
  public polylist: any;

  public StartArrowID: any;
  public EndArrowID: any;
  public StartArrowDisp: any;
  public EndArrowDisp: any;
  public ArrowSizeIndex: any;

  constructor(params: any) {
    console.log("= S.BaseLine: constructor called with input:", params);

    // Ensure params is defined and set default values
    params = params || {};
    params.DrawingObjectBaseClass = ConstantData.DrawingObjectBaseClass.LINE;
    params.maxhooks = 2;

    if (typeof params.targflags === "undefined") {
      params.targflags = ConstantData.HookFlags.SED_LC_Line | ConstantData.HookFlags.SED_LC_AttachToLine;
    }

    if (typeof params.hookflags === "undefined") {
      params.hookflags = ConstantData.HookFlags.SED_LC_Shape | ConstantData.HookFlags.SED_LC_Line;
    }

    // Call the base class constructor
    super(params);

    // Initialize properties with formatted assignments
    this.LineType = params.LineType;
    this.linetrect = { x: 0, y: 0, width: 0, height: 0 };
    this.theMinTextDim = { width: 0, height: 0 };
    this.TextWrapWidth = 0;
    this.iconShapeBottomOffset = 20;
    this.iconShapeRightOffset = 0;

    console.log("= S.BaseLine: constructor output:", this);
  }

  checkIfPolyLine(polylineObj: any): boolean {
    console.log("= S.BaseLine: checkIfPolyLine called with input:", polylineObj);

    const PolyLineClass = Instance.Shape.PolyLine;
    const isPolyLine = polylineObj instanceof PolyLineClass;

    console.log("= S.BaseLine: checkIfPolyLine output:", isPolyLine);
    return isPolyLine;
  }

  CalcFrame(inputFlag?: boolean): void {
    console.log("= S.BaseLine: CalcFrame called with inputFlag =", inputFlag);

    // Calculate the initial frame from start and end points
    let isSegLine = false;
    this.Frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    console.log("= S.BaseLine: Initial Frame calculated as", this.Frame);

    // Check if the line type requires segment processing
    if (this.LineType === ConstantData.LineType.SEGLINE) {
      isSegLine = true;
      console.log("= S.BaseLine: LineType is SEGLINE, setting isSegLine to", isSegLine);
    }

    // Get the polygon points for the frame computation
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, isSegLine, false, null);
    console.log("= S.BaseLine: Retrieved polyPoints:", polyPoints);

    // If polyPoints exist, update the frame accordingly
    if (polyPoints && polyPoints.length) {
      Utils2.GetPolyRect(this.Frame, polyPoints);
      console.log("= S.BaseLine: Updated Frame using polyPoints:", this.Frame);
    }

    // Update the frame with additional properties if needed
    this.UpdateFrame(this.Frame, inputFlag);
    console.log("= S.BaseLine: Final Frame after UpdateFrame:", this.Frame);
  }
}

export default BaseLine
