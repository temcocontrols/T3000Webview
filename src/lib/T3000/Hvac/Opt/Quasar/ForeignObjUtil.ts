import OptConstant from "../../Data/Constant/OptConstant";
import T3Gv from "../../Data/T3Gv";
import VueCircle from "../../../../../components/Basic/Circle.vue";

class ForeignObjUtil {

  static CreateVueCircle(docInstance: any) {

    let svgDoc = docInstance == null ? T3Gv.opt.svgDoc : docInstance;

    const foreignObj = svgDoc.CreateVueComponent(60, 60, VueCircle, {
      message: 'Hello from SVG!',
      color: 'blue'
    });

    foreignObj.SetPos(0, -50);

    const foreignContainer = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
    foreignContainer.AddElement(foreignObj);

    foreignContainer.SetID(111);
    foreignContainer.SetSize(100, 100);

    // Set the position of the foreignObject inside the foreignContainer
    foreignContainer.SetPos(0, 0);

    return foreignObj;
  }
}

export default ForeignObjUtil;
