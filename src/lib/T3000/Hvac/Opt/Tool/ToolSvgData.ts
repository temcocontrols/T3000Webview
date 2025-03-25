import QuickStyle from "../../Model/QuickStyle";
import SVGFragmentSymbol from "../../Shape/S.SVGFragmentSymbol";


class ToolSvgData {

  static GetSvgData(symbolType) {

    let initialX = -1000;
    let initialY = -1000;

    let defWidth = 60;
    let defHeight = 60;

    let initGbWidth = 60;
    let initGbHeight = 60;

    // Create a new SVG Fragment Symbol
    let symbolObject = new SVGFragmentSymbol({
      Frame: { x: initialX, y: initialY, width: defWidth, height: defHeight },
      InitialGroupBounds: { x: initialX, y: initialX, width: initGbWidth, height: initGbHeight },
      StyleRecord: new QuickStyle(),
      // hookflags: 257,
      // moreflags: 64,
      // targflags: 3,
    });

    let svgStr = "";

    switch (symbolType) {
      case "Box":
        svgStr = this.BoxSvgData();
        // svgStr = this.Test1SvgData();
        break;
      case "Text":
        svgStr = this.TextSvgData();
        break;
      case "Icon":
        svgStr = this.IconSvgData();
        break;
      case "SwitchIcon":
        svgStr = this.SwitchIconSvgData();
        break;
      case "Led":
        svgStr = this.LedSvgData();
        break;
      case "RoomHumidity":
        svgStr = this.RoomHumiditySvgData();
        break;
      case "RoomTemperature":
        svgStr = this.RoomTemperatureSvgData();
        break;
      case "Temperature":
        svgStr = this.TemperatureSvgData();
        break;
      case "Boiler":
        svgStr = this.BoilerSvgData();
        break;
      case "HeatPump":
        svgStr = this.HeatPumpSvgData();
        break;
      case "Pump":
        svgStr = this.PumpSvgData();
        break;
      case "ValueThreeWay":
        svgStr = this.ValueThreeWaySvgData();
        break;
      case "ValueTwoWay":
        svgStr = this.ValueTwoWaySvgData();
        break;
      case "Duct":
        svgStr = this.DuctSvgData();
        break;
      case "Fan":
        svgStr = this.FanSvgData();
        break;
      case "CoolingCoil":
        svgStr = this.CoolingCoilSvgData();
        break;
      case "HeatingCoil":
        svgStr = this.HeatingCoilSvgData();
        break;
      case "Filter":
        svgStr = this.FilterSvgData();
        break;
      case "Humidifier":
        svgStr = this.HumidifierSvgData();
        break;
      case "Humidity":
        svgStr = this.HumiditySvgData();
        break;
      case "Pressure":
        svgStr = this.PressureSvgData();
        break;
      case "Damper":
        svgStr = this.DamperSvgData();
        break;
      case "Temperature2":
        svgStr = this.Temperature2SvgData();
        break;
      case "ThermalWheel":
        svgStr = this.ThermalWheelSvgData();
        break;
      case "Enthalpy":
        svgStr = this.EnthalpySvgData();
        break;
      case "Flow":
        svgStr = this.FlowSvgData();
        break;
      case "Guage":
        svgStr = this.GuageSvgData();
        break;
      case "Dial":
        svgStr = this.DialSvgData();
        break;
      case "Value":
        svgStr = this.ValueSvgData();
        break;
      case "IconWithTitle":
        svgStr = this.IconWithTitleSvgData();
        break;
      case "Test1":
        svgStr = this.Test1SvgData();
        break;
      default:
        return "";
        break;
    }

    symbolObject.SVGFragment = svgStr;

    return symbolObject;
  }

  static BoxSvgData() {
    return "";
  }

  static TextSvgData() {
    return "";
  }

  static IconSvgData() {
    return "";
  }

  static SwitchIconSvgData() {
    return "";
  }

  static LedSvgData() {
    return "";
  }

  static RoomHumiditySvgData() {
    const RoomHumidity =
      `


<g transform="translate(0,0)">
      <circle r="30" cy="30" cx="30"
      style="
              opacity: 1;
              fill: ##FillColor=#FFFFFF##;
              fill-opacity: 1;
              fill-rule: nonzero;
              stroke:##FillColor=#000000##;
              stroke-width: 0.764198;
              stroke-linecap: butt;
              stroke-linejoin: round;
              stroke-miterlimit: 4;
              stroke-dasharray: none;
              stroke-opacity: 1;
            "/>
      <g transform="matrix(1,0,0,1,46,43)"
      style="
              font-style: normal;
              font-weight: normal;
              font-size: 51px;
              line-height: 125%;
              font-family: Sans;
              letter-spacing: 0px;
              word-spacing: 0px;
              fill:##FillColor=#000000##;
              fill-opacity: 1;
              stroke: none;
              stroke-width: 1px;
              stroke-linecap: butt;
              stroke-linejoin: miter;
              stroke-opacity: 1;
            ">
          <path
              d="m -29.828843,-32.840076 h 5.075651 v 15.377717 h 18.4432096 v -15.377717 h 5.0756516 V 4.6745172 H -6.3099824 V -13.190771 H -24.753192 V 4.6745172 h -5.075651 z" />
      </g>
  </g>
    `;
    return RoomHumidity;

  }

  static RoomTemperatureSvgData() {
    const RoomTemperature =
      `
    <g transform="matrix(0.76419842,0,0,0.76419842,-3.2187002,-3.2187002)">
      <circle
        r="11.288136"
        cy="16"
        cx="16"
        style="
          opacity: 1;
          fill:  ##FillColor=#FFFFFF##;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke:##FillColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: round;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <g
        transform="translate(32.100664,13.086915)"
        style="
          font-style: normal;
          font-weight: normal;
          font-size: 20.2897px;
          line-height: 125%;
          font-family: Sans;
          letter-spacing: 0px;
          word-spacing: 0px;
          fill:##FillColor=#000000##;
          fill-opacity: 1;
          stroke: none;
          stroke-width: 1px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      >
        <path
          d="m -22.356997,-4.4825641 h 12.5126658 v 1.6842067 H -15.095093 V 10.308734 h -2.011141 V -2.7983574 h -5.250763 z"
        />
      </g>
    </g>
    `;
    return RoomTemperature;
  }

  static TemperatureSvgData() {
    return "";
  }

  static BoilerSvgData() {
    const boiler = `
    <path
      style="
        fill: ##FillColor=#28c3c6##;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke:##LineColor=#000000##;
        stroke-width: 1;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-miterlimit: 4;
        stroke-dasharray: none;
        stroke-opacity: 1;
      "
      d="m 3.714,27.855 14.856,-12.999 0,-12.999 22.284,0 0,12.999 14.856,12.999 0,29.712 -51.996,0 z"
    ></path>
  `;
    return boiler;
  }

  static HeatPumpSvgData() {
    return "";
  }

  static PumpSvgData() {
    const pumpSvg = '<g><g fill="##FillColor=#7F7F7F##" transform="translate(0,0)"><g class="pump"> <circle stroke="##LineColor=#000000##" cy="16" cx="15.955" r="9.9609003" class="pump-background" /> <g transform="translate(16,16)"> <path d="M -5,8.1369 V -8.1191 L 9.078,0.0091 Z" class="rotating-middle" stroke="##LineColor=#000000##" stroke-width="##LineThick=1##"/></g></g></g></g>';
    return pumpSvg;
  }

  static ValueThreeWaySvgData() {
    return "";
  }

  static ValueTwoWaySvgData() {
    return "";
  }

  static DuctSvgData() {
    return "";
  }

  static FanSvgData() {
    return "";
  }

  static CoolingCoilSvgData() {
    return "";
  }

  static HeatingCoilSvgData() {
    return "";
  }

  static FilterSvgData() {
    return "";
  }

  static HumidifierSvgData() {
    return "";
  }

  static HumiditySvgData() {
    return "";
  }

  static PressureSvgData() {
    return "";
  }

  static DamperSvgData() {
    return "";
  }

  static Temperature2SvgData() {
    return "";
  }

  static ThermalWheelSvgData() {
    return "";
  }

  static EnthalpySvgData() {
    return "";
  }

  static FlowSvgData() {
    return "";
  }

  static GuageSvgData() {
    return "";
  }

  static DialSvgData() {
    return "";
  }

  static ValueSvgData() {
    return "";
  }

  static IconWithTitleSvgData() {
    return "";
  }

  static TestSvg() {
    const heatPumpSymbolSVG = '<g class="heat-pump" stroke-linejoin="round" stroke="#000" transform="translate(0,0)" fill="currentColor"> <rect class="inner" height="123.718" width="27.718" y="2.141" x="-36.859" stroke-width="1.0868"></rect> <g transform="matrix(1.0276 0 0 1.0276 -39.441 -.44130)" stroke-linecap="round" stroke-miterlimit="1" stroke-width="1.3509"> <path d="m16.234 16.944 8.6837-6.894-8.6837-6.894v3.447h-13.152v6.894h13.152z" fill="#ce2824"></path> <path d="m15.766 28.844-8.6837-6.894 8.6837-6.894v3.447h13.152v6.894h-13.152z" fill="#3238db"></path></g></g>';

    const test1 = `
    <g><g width="13.667" height="10.167" transform="scale(1,1) translate(0,20.833)"><g stroke="##LineColor=#000000##"
    opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none" width="13.667"
    height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
    fill-opacity="1" stroke-opacity="1"><rect width="13.667" height="10.167"/></g></g>
    // <g width="13.667" height="10.167" transform="scale(1,1) translate(56.833,21.167)">
    // <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none" width="13.667"
    // height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##" fill-opacity="1"
    // stroke-opacity="1"><rect width="13.667" height="10.167"/></g></g><g width="13.667" height="10.167"
    // transform="rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)"><g stroke="##LineColor=#000000##"
    // opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none" width="13.667" height="10.167"
    // transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1">
    // <rect width="13.667" height="10.167"/></g></g><g width="46.167" height="25.5" transform="scale(1,1)
    // translate(12,12.667)"><g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##"
    // stroke-dasharray="none" width="46.167" height="25.5" transform="scale(1,1) translate(0,0)"
    // fill="##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1"><rect width="46.167" height="25.5"/></g></g></g>
    `;

    const test2 = '<g><g width="13.667" height = "10.167" transform = "scale(1,1) translate(0,20.833)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "13.667" height = "10.167" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="13.667" height = "10.167" /> </g></g > <g width="13.667" height = "10.167" transform = "scale(1,1) translate(56.833,21.167)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "13.667" height = "10.167" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="13.667" height = "10.167" /> </g></g > <g width="13.667" height = "10.167" transform = "rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "13.667" height = "10.167" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="13.667" height = "10.167" /> </g></g > <g width="46.167" height = "25.5" transform = "scale(1,1) translate(12,12.667)" > <g stroke="##LineColor=#000000##" opacity = "1" stroke-width="##LineThick=1##" stroke-dasharray="none" width = "46.167" height = "25.5" transform = "scale(1,1) translate(0,0)" fill = "##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1" > <rect width="46.167" height = "25.5" /> </g></g > </g>';

    // const boiler = `
    //   <path
    //     style="
    //       fill: ##FillColor=#28c3c6##;
    //       fill-opacity: 1;
    //       fill-rule: nonzero;
    //       stroke:##LineColor=#000000##;
    //       stroke-width: 1;
    //       stroke-linecap: butt;
    //       stroke-linejoin: miter;
    //       stroke-miterlimit: 4;
    //       stroke-dasharray: none;
    //       stroke-opacity: 1;
    //     "
    //     d="m 2,15 8,-7 0,-7 12,0 0,7 8,7 0,16 -28,0 z"
    //   ></path>
    // `;

    const boiler = `
      <path
        style="
          fill: ##FillColor=#28c3c6##;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke:##LineColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
        d="m 3.714,27.855 14.856,-12.999 0,-12.999 22.284,0 0,12.999 14.856,12.999 0,29.712 -51.996,0 z"
      ></path>
    `;



    // Use the heat pump SVG fragment

    // Convert multiline SVG to a single line, removing newlines but preserving structure
    const testSvgString = boiler.replace(/\n\s*/g, ' ').trim();
    console.log("D.D testSvgString", testSvgString);

    const newTest1_inline = `
    <g><g width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,20.833)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"13.667\" height=\"10.167\"/></g></g><g width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(56.833,21.167)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"13.667\" height=\"10.167\"/></g></g><g width=\"13.667\" height=\"10.167\" transform=\"rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"13.667\" height=\"10.167\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"13.667\" height=\"10.167\"/></g></g><g width=\"46.167\" height=\"25.5\" transform=\"scale(1,1) translate(12,12.667)\"><g stroke=\"##LINECOLOR=#000000##\" opacity=\"1\" stroke-width=\"##LINETHICK=1##\" stroke-dasharray=\"none\" width=\"46.167\" height=\"25.5\" transform=\"scale(1,1) translate(0,0)\" fill=\"##FILLCOLOR=#FFFFFF##\" fill-opacity=\"1\" stroke-opacity=\"1\"><rect width=\"46.167\" height=\"25.5\"/></g></g></g>
    `;

    const newTest1 =
      `
        <g>
        <g width="13.667" height="10.167" transform="scale(1,1) translate(0,20.833)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="13.667" height="10.167" transform="scale(1,1) translate(56.833,21.167)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="13.667" height="10.167" transform="rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="46.167" height="25.5" transform="scale(1,1) translate(12,12.667)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="46.167" height="25.5" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="46.167" height="25.5" />
            </g>
        </g>
        </g>
    `;

    // symbolObject.Frame = { x: 30.416666666666742, y: 256.5, width: 72.5, height: 39.666666666666664 };

    // symbolObject.InitialGroupBounds = {
    //   "width": 71.5,
    //   "height": 39.167,
    //   "x": 351.16666666666663,
    //   "y": 528
    // };

    // symbolObject.Frame = { x: -1000, y: -1000, width: 72.5, height: 39.666666666666664 };

    // symbolObject.InitialGroupBounds = {
    //   "width": 71.5,
    //   "height": 39.167,
    //   "x": -1000,
    //   "y": -1000
    // };

    // symbolObject.Frame = { x: -1000, y: -1000, width: 60, height: 60 };

    // symbolObject.InitialGroupBounds = {
    //   width: 60,
    //   height: 60,
    //   x: -1000,
    //   y: -1000
    // };

    // symbolObject.r = {
    //   x: 30.416666666666742,
    //   y: 256.5,
    //   width: 72.5,
    //   height: 39.666666666666664
    // };

    // symbolObject.inside = {
    //   x: 30.416666666666742,
    //   y: 256.5,
    //   width: 72.5,
    //   height: 39.666666666666664
    // };

    // symbolObject.trect = {
    //   "x": 30.416666666666742,
    //   "y": 256.5,
    //   "width": 72.5,
    //   "height": 39.666666666666664
    // };

    // symbolObject.rtop = 3168;
    // symbolObject.rleft = 2107;
    // symbolObject.rbottom = 3406;
    // symbolObject.rright = 2542;
    // symbolObject.rwd = 435;
    // symbolObject.rht = 238;

    // symbolObject.attachpoint = {
    //   "x": 14447,
    //   "y": 19411
    // };

    // symbolObject.sizedim = {
    //   "width": 72.5,
    //   "height": 39.666666666666664
    // };

    // symbolObject.ConnectPoints = [
    //   {
    //     "x": 276,
    //     "y": 19411
    //   },
    //   {
    //     "x": 14447,
    //     "y": 378
    //   },
    //   {
    //     "x": 29447,
    //     "y": 19411
    //   }
    // ];

    const RoomHumidity =
      `


 <g transform="translate(0,0)">
        <circle r="30" cy="30" cx="30"
        style="
                opacity: 1;
                fill: ##FillColor=#FFFFFF##;
                fill-opacity: 1;
                fill-rule: nonzero;
                stroke:##FillColor=#000000##;
                stroke-width: 0.764198;
                stroke-linecap: butt;
                stroke-linejoin: round;
                stroke-miterlimit: 4;
                stroke-dasharray: none;
                stroke-opacity: 1;
              "/>
        <g transform="matrix(1,0,0,1,46,43)"
        style="
                font-style: normal;
                font-weight: normal;
                font-size: 51px;
                line-height: 125%;
                font-family: Sans;
                letter-spacing: 0px;
                word-spacing: 0px;
                fill:##FillColor=#000000##;
                fill-opacity: 1;
                stroke: none;
                stroke-width: 1px;
                stroke-linecap: butt;
                stroke-linejoin: miter;
                stroke-opacity: 1;
              ">
            <path
                d="m -29.828843,-32.840076 h 5.075651 v 15.377717 h 18.4432096 v -15.377717 h 5.0756516 V 4.6745172 H -6.3099824 V -13.190771 H -24.753192 V 4.6745172 h -5.075651 z" />
        </g>
    </g>
      `;

  }

  static Test1SvgData() {
    const test1 =
      `
        <g>
        <g width="13.667" height="10.167" transform="scale(1,1) translate(0,20.833)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="13.667" height="10.167" transform="scale(1,1) translate(56.833,21.167)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="13.667" height="10.167" transform="rotate(270,34.667,6.75) scale(1,1) translate(27.833,1.667)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="13.667" height="10.167" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="13.667" height="10.167" />
            </g>
        </g>
        <g width="46.167" height="25.5" transform="scale(1,1) translate(12,12.667)">
            <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
                width="46.167" height="25.5" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
                fill-opacity="1" stroke-opacity="1">
                <rect width="46.167" height="25.5" />
            </g>
        </g>
        </g>
    `;

    return test1;
  }
}

export default ToolSvgData
