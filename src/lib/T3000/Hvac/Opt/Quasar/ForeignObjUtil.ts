import OptConstant from "../../Data/Constant/OptConstant";
import T3Gv from "../../Data/T3Gv";
import VueCircle from "../../../../../components/Basic/Circle.vue";
import ObjectType2 from "src/components/NewUI/ObjectType2.vue";
import ObjectType3 from "src/components/NewUI/ObjectType3.vue";
import QuasarUtil from "./QuasarUtil";

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

  static CreateVueObjectType(docInstance: any, frame: any) {
    let svgDoc = docInstance == null ? T3Gv.opt.svgDoc : docInstance;

    console.log('ForeignObjUtil=CreateVueObjectType', frame);

    const circleItem = {
      "title": null,
      "active": false,
      "type": "G_Circle",
      "translate": [
        293,
        62
      ],
      "width": 60,
      "height": 60,
      "rotate": 0,
      "scaleX": 1,
      "scaleY": 1,
      "settings": {
        "fillColor": "#659dc5",
        "titleColor": "inherit",
        "bgColor": "inherit",
        "textColor": "inherit",
        "fontSize": 16
      },
      "zindex": 1,
      "t3Entry": null,
      "showDimensions": true,
      "cat": "General",
      "id": 1
    };

    const pumpItem =
    {
      "title": null,
      "active": false,
      "type": "Pump",
      "translate": [
        284,
        72
      ],
      "width": 60,
      "height": 60,
      "rotate": 0,
      "scaleX": 1,
      "scaleY": 1,
      "settings": {
        "fillColor": "#659dc5",
        "active": false,
        "inAlarm": false,
        "titleColor": "inherit",
        "bgColor": "inherit",
        "textColor": "inherit",
        "fontSize": 16
      },
      "zindex": 1,
      "t3Entry": null,
      "showDimensions": true,
      "cat": "Pipe",
      "id": 2
    };

    const pumpItemWithLink =
    {
      "title": "==== Test Pump ====",
      "active": false,
      "type": "Pump",
      "translate": [
        284,
        72
      ],
      "width": 60,
      "height": 60,
      "rotate": 0,
      "scaleX": 1,
      "scaleY": 1,
      "settings": {
        "fillColor": "#659dc5",
        "active": true,
        "inAlarm": true,
        "titleColor": "inherit",
        "bgColor": "inherit",
        "textColor": "inherit",
        "fontSize": 16,
        "t3EntryDisplayField": "description"
      },
      "zindex": 1,
      "t3Entry": {
        "auto_manual": 1,
        "calibration_h": 0,
        "calibration_l": 0,
        "calibration_sign": 1,
        "command": "199IN1",
        "control": 1,
        "decom": 1,
        "description": "Volts",
        "digital_analog": 1,
        "filter": 5,
        "id": "IN1",
        "index": 0,
        "label": "IN1",
        "pid": 199,
        "range": 19,
        "type": "INPUT",
        "unit": 19,
        "value": 30
      },
      "showDimensions": true,
      "cat": "Pipe",
      "id": 2
    };

    var width = frame.width;
    var height = 40;//frame.height;

    const foreignObj = svgDoc.CreateVueComponent(width, height, ObjectType3, {
      item: pumpItemWithLink,
      showArrows: true,
    });

    foreignObj.SetPos(0, -50);

    const foreignContainer = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
    foreignContainer.AddElement(foreignObj);

    foreignContainer.SetSize(width, height);

    // Set the position of the foreignObject inside the foreignContainer
    foreignContainer.SetPos(0, 0);

    return foreignContainer;
  }

  // shapeId used for get the current item from app state v2
  static CreateVueObject(docInstance: any, frame: any, apsItem: any) {
    let svgDoc = docInstance == null ? T3Gv.opt.svgDoc : docInstance;

    var width = 300;//frame.width;
    var height = 30;//frame.height;

    var vueProps = {
      item: apsItem,
      showArrows: false
    }

    const foreignObj = svgDoc.CreateVueComponent(width, height, ObjectType3, vueProps);

    foreignObj.SetPos(0, -40);

    const foreignContainer = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
    foreignContainer.AddElement(foreignObj);

    foreignContainer.SetSize(width, height);

    // Set the position of the foreignObject inside the foreignContainer
    foreignContainer.SetPos(0, 0);

    return foreignContainer;
  }
}

export default ForeignObjUtil;
