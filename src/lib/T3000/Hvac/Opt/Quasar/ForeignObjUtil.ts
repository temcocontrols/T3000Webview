import OptConstant from "../../Data/Constant/OptConstant";
import T3Gv from "../../Data/T3Gv";
import VueCircle from "../../../../../components/Basic/Circle.vue";
import ObjectType2 from "src/components/ObjectType2.vue";

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

  static CreateVueObjectType(docInstance: any) {
    let svgDoc = docInstance == null ? T3Gv.opt.svgDoc : docInstance;

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

    const pumpItemWithLink=
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

    const foreignObj = svgDoc.CreateVueComponent(60, 60, ObjectType2, {
      item: pumpItemWithLink,
      showArrows: true,
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
