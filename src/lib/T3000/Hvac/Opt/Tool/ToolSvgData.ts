import QuickStyle from "../../Model/QuickStyle";
import SvgSymbol from "../../Shape/S.SvgSymbol";
import ToolDuctT2SvgData from "./ToolDuctT2SvgData";
import ToolDuctT1SvgData from "./ToolDuctT1SvgData";
import ToolDuctT3SvgData from "./ToolDuctT3SvgData";
import OptConstant from "../../Data/Constant/OptConstant";

class ToolSvgData {

  static DuctSvg: any = ToolDuctT1SvgData;
 // static DuctSvg: any = ToolDuctT2SvgData;
  //static DuctSvg: any = ToolDuctT3SvgData;

  static GetSvgData(symbolType) {

    var frame = ToolSvgData.DuctSvg.GetSvgFrame(symbolType);

    let initialX = -1000;
    let initialY = -1000;

    let defWidth = frame.width;
    let defHeight = frame.height;

    let initGbWidth = frame.width;
    let initGbHeight = frame.height;

    // Create a new SVG Fragment Symbol
    let symbolObject = new SvgSymbol({
      Frame: { x: initialX, y: initialY, width: defWidth, height: defHeight },
      InitialGroupBounds: { x: initialX, y: initialX, width: initGbWidth, height: initGbHeight },
      StyleRecord: new QuickStyle(),
      uniType: symbolType,
      drawSetting: {},
    });

    let svgStr = "";

    switch (symbolType) {
      case "Box":
        svgStr = this.BoxSvgData();
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
      case "Heatpump":
        svgStr = this.HeatpumpSvgData();
        break;
      case "Pump":
        svgStr = this.PumpSvgData();
        break;
      case "ValveThreeWay":
        svgStr = this.ValveThreeWaySvgData();
        break;
      case "ValveTwoWay":
        svgStr = this.ValveTwoWaySvgData();
        break;
      case "Duct":
        svgStr = ToolSvgData.DuctSvgData();
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
      case "Duct1":
        svgStr = ToolSvgData.DuctSvg.Duct1Data();
        break;
      case "Duct2":
        svgStr = ToolSvgData.DuctSvg.Duct2Data();
        break;
      case "Duct3":
        svgStr = ToolSvgData.DuctSvg.Duct3Data();
        break;
      case "Duct4":
        svgStr = ToolSvgData.DuctSvg.Duct4Data();
        break;
      case "Duct5":
        svgStr = ToolSvgData.DuctSvg.Duct5Data();
        break;
      case "Duct6":
        svgStr = ToolSvgData.DuctSvg.Duct6Data();
        break;
      case "Duct7":
        svgStr = ToolSvgData.DuctSvg.Duct7Data();
        break;
      case "Duct8":
        svgStr = ToolSvgData.DuctSvg.Duct8Data();
        break;
      case "Duct9":
        svgStr = ToolSvgData.DuctSvg.Duct9Data();
        break;
      case "Duct10":
        svgStr = ToolSvgData.DuctSvg.Duct10Data();
        break;
      case "Duct11":
        svgStr = ToolSvgData.DuctSvg.Duct11Data();
        break;
      case "Duct12":
        svgStr = ToolSvgData.DuctSvg.Duct12Data();
        break;
      default:
        return "";
    }

    symbolObject.SVGFragment = svgStr;

    return symbolObject;
  }

  static GetSvgDataString(symbolType) {
    let svgStr = "";

    switch (symbolType) {
      case "Box":
        svgStr = this.BoxSvgData();
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
      case "Heatpump":
        svgStr = this.HeatpumpSvgData();
        break;
      case "Pump":
        svgStr = this.PumpSvgData();
        break;
      case "ValveThreeWay":
        svgStr = this.ValveThreeWaySvgData();
        break;
      case "ValveTwoWay":
        svgStr = this.ValveTwoWaySvgData();
        break;
      case "Duct":
        svgStr = ToolSvgData.DuctSvgData();
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
      case "Duct1":
        svgStr = ToolSvgData.DuctSvg.Duct1Data();
        break;
      case "Duct2":
        svgStr = ToolSvgData.DuctSvg.Duct2Data();
        break;
      case "Duct3":
        svgStr = ToolSvgData.DuctSvg.Duct3Data();
        break;
      case "Duct4":
        svgStr = ToolSvgData.DuctSvg.Duct4Data();
        break;
      case "Duct5":
        svgStr = ToolSvgData.DuctSvg.Duct5Data();
        break;
      case "Duct6":
        svgStr = ToolSvgData.DuctSvg.Duct6Data();
        break;
      case "Duct7":
        svgStr = ToolSvgData.DuctSvg.Duct7Data();
        break;
      case "Duct8":
        svgStr = ToolSvgData.DuctSvg.Duct8Data();
        break;
      case "Duct9":
        svgStr = ToolSvgData.DuctSvg.Duct9Data();
        break;
      case "Duct10":
        svgStr = ToolSvgData.DuctSvg.Duct10Data();
        break;
      case "Duct11":
        svgStr = ToolSvgData.DuctSvg.Duct11Data();
        break;
      case "Duct12":
        svgStr = ToolSvgData.DuctSvg.Duct12Data();
        break;
      default:
        return "";
    }

    return svgStr;
  }

  static GetSvgActiveClassName(symbolType) {
    let svgStr = "";

    switch (symbolType) {
      case "Box":
        svgStr = this.BoxSvgData();
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
      case "Heatpump":
        svgStr = this.HeatpumpSvgData();
        break;
      case "Pump":
        svgStr = this.PumpSvgData();
        break;
      case "ValveThreeWay":
        svgStr = this.ValveThreeWaySvgData();
        break;
      case "ValveTwoWay":
        svgStr = this.ValveTwoWaySvgData();
        break;
      case "Duct":
        svgStr = ToolSvgData.DuctSvgData();
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
    }

    return svgStr;
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
    const toggleOff =
      `
<g transform="scale(0.08,0.08) translate(-370,3)">
    <use style="fill:##FillColor=#659dc5##" xlink:href="icons.svg#toggle_off1"></use>
</g>
      `;

    return toggleOff;
  }

  static LedSvgData() {

    const led =
      `
<g transform="scale(1.8,1.8) translate(9,2)">
    <filter id="light1" x="-0.8" y="-0.8" height="2.2" width="2.8">
        <feGaussianBlur stdDeviation="2" />
    </filter>
    <filter id="light2" x="-0.8" y="-0.8" height="2.2" width="2.8">
        <feGaussianBlur stdDeviation="4" />
    </filter>
    <rect x="2.5099" y="20.382" width="2.1514" height="9.8273" fill="##FillColor=#8c8c8c##" />
    <path
        d="m12.977 30.269c0-1.1736-0.86844-2.5132-1.8916-3.4024-0.41616-0.3672-1.1995-1.0015-1.1995-1.4249v-5.4706h-2.1614v5.7802c0 1.0584 0.94752 1.8785 1.9462 2.7482 0.44424 0.37584 1.3486 1.2496 1.3486 1.7694"
        fill="##FillColor=#8c8c8c##" />

    <path
        d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
        opacity=".3" />
    <path
        d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
        fill="##FillColor=#e6e6e6##" opacity=".5" />
    <path
        d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z"
        fill="##FillColor=#d1d1d1##" opacity=".9" />
    <g>
        <path
            d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v4.6296c1.4738 1.6517 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586l-4e-5 -1.5235c-7e-4 -1.1419-0.4744-2.2032-1.283-3.1054z"
            opacity=".7" />
        <path
            d="m14.173 13.001v3.1054c0 2.7389-3.1658 4.9651-7.0855 4.9651-3.9125 2e-5 -7.0877-2.219-7.0877-4.9651v3.1054c1.4738 1.6502 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8586-7.4e-4 -1.1412-0.47444-2.2025-1.283-3.1047z"
            opacity=".25" />
        <ellipse cx="7.0877" cy="16.106" rx="7.087" ry="4.9608" opacity=".25" />
    </g>
    <polygon points="2.2032 16.107 3.1961 16.107 3.1961 13.095 6.0156 13.095 10.012 8.8049 3.407 8.8049 2.2032 9.648"
        fill="##FillColor=#666666##" />
    <polygon points="11.215 9.0338 7.4117 13.095 11.06 13.095 11.06 16.107 11.974 16.107 11.974 8.5241 10.778 8.5241"
        fill="##FillColor=#666666##" />
    <path
        d="m14.173 13.001v-5.9126c0-3.9132-3.168-7.0884-7.0855-7.0884-3.9125 0-7.0877 3.1694-7.0877 7.0884v13.649c1.4738 1.651 4.0968 2.7526 7.0877 2.7526 4.6195 0 8.3686-2.6179 8.3686-5.8594v-1.5235c-7.4e-4 -1.1426-0.47444-2.2039-1.283-3.1061z"
        fill="##FillColor=#01c16e##" opacity=".65" />
    <g fill="##FillColor=#ffffff##">
        <path
            d="m10.388 3.7541 1.4364-0.2736c-0.84168-1.1318-2.0822-1.9577-3.5417-2.2385l0.25416 1.0807c0.76388 0.27072 1.4068 0.78048 1.8511 1.4314z"
            opacity=".5" />
        <path
            d="m0.76824 19.926v1.5199c0.64872 0.5292 1.4335 0.97632 2.3076 1.3169v-1.525c-0.8784-0.33624-1.6567-0.78194-2.3076-1.3118z"
            opacity=".5" />
        <path
            d="m11.073 20.21c-0.2556 0.1224-0.52992 0.22968-0.80568 0.32976-0.05832 0.01944-0.11736 0.04032-0.17784 0.05832-0.56376 0.17928-1.1614 0.31896-1.795 0.39456-0.07488 0.0094-0.1512 0.01872-0.22464 0.01944-0.3204 0.03024-0.64368 0.05832-0.97056 0.05832-0.14832 0-0.30744-0.01512-0.4716-0.02376-1.2002-0.05688-2.3306-0.31464-3.2976-0.73944l-2e-5 -8.3895v-4.8254c0-1.471 0.84816-2.7295 2.0736-3.3494l-0.02232-0.05328-1.2478-1.512c-1.6697 1.003-2.79 2.8224-2.79 4.9118v11.905c-0.04968-0.04968-0.30816-0.30888-0.48024-0.52992l-0.30744 0.6876c1.4011 1.4818 3.8088 2.4617 6.5426 2.4617 1.6798 0 3.2371-0.37368 4.5115-1.0022l-0.52704-0.40896-0.01006 0.0072z"
            opacity=".5" />
    </g>
</g>
`;

    return led;
  }

  static RoomHumiditySvgData() {
    const roomHumidity =
      `
<g transform="scale(2.8,2.8) translate(2,2)">
    <g transform="translate(-6.9915256,-6.9915256)">
        <circle r="8.6263752" cy="16" cx="16" style="
          opacity: 1;
          fill: ##FillColor=#659dc5##;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 0.764198;
          stroke-linecap: butt;
          stroke-linejoin: round;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        " />
        <g transform="matrix(0.29971746,0,0,0.29971746,20.655088,20.220855)" style="
          font-style: normal;
          font-weight: normal;
          font-size: 51.4601px;
          line-height: 125%;
          font-family: Sans;
          letter-spacing: 0px;
          word-spacing: 0px;
          fill: ##StrokeColor=#000000##;
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
</g>
    `;

    return roomHumidity;

  }

  static RoomTemperatureSvgData() {
    const roomTemperature =
      `
<g transform="scale(2.8,2.8) translate(2,2)">
    <g transform="matrix(0.76419842,0,0,0.76419842,-3.2187002,-3.2187002)">
        <circle r="11.288136" cy="16" cx="16" style="
          opacity: 1;
          fill: ##FillColor=#659dc5##;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: round;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        " />
        <g transform="translate(32.100664,13.086915)" style="
          font-style: normal;
          font-weight: normal;
          font-size: 20.2897px;
          line-height: 125%;
          font-family: Sans;
          letter-spacing: 0px;
          word-spacing: 0px;
          fill: ##StrokeColor=#000000##;
          fill-opacity: 1;
          stroke: none;
          stroke-width: 1px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        ">
            <path
                d="m -22.356997,-4.4825641 h 12.5126658 v 1.6842067 H -15.095093 V 10.308734 h -2.011141 V -2.7983574 h -5.250763 z" />
        </g>
    </g>
</g>
    `;

    return roomTemperature;
  }

  static TemperatureSvgData() {

    const temperature =
      `
<g transform="scale(2.8,2.8) translate(6,0)">
    <g id="layer1" stroke="##StrokeColor=#000000##" stroke-width="1px" transform="translate(-10.804626,-9.2243756)">
        <rect id="rect3012" height="14.505" width="2.901" y="9.9127998" x="14.557" fill="#ffff00" />
        <path id="path3010" stroke-width="1.2px" transform="matrix(0.74098,0,0,0.74098,7.3047,15.679)"
            fill="##FillColor=#659dc5##"
            d="m 17.949,15.898 -3.1021,5.373 H 8.6427 L 5.5406,15.898 8.6427,10.525 h 6.2042 z" />
    </g>
    <g id="g4141" transform="translate(-1.2033861,-8.1217684)">
        <circle r="0.77312505" cy="28.129852" cx="6.4061227" id="path4137" style="
          fill: none;
          fill-opacity: 1;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        " />
        <path id="path4139" d="M 6.4061205,27.157211 V 23.65349" style="
          fill: none;
          fill-rule: evenodd;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 0.5;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        " />
    </g>
</g>
    `;


    return temperature;
  }

  static BoilerSvgData() {
    const boiler =
      `
<g transform="scale(1.6,1.6) translate(3,3)">
    <path style="
        fill: ##FillColor=#659dc5##;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: ##StrokeColor=#000000##;
        stroke-width: 1;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-miterlimit: 4;
        stroke-dasharray: none;
        stroke-opacity: 1;
      " d="m 2,15 8,-7 0,-7 12,0 0,7 8,7 0,16 -28,0 z"></path>
</g>
  `;
    return boiler;
  }

  static HeatpumpSvgData() {

    const heatpump =
      `
<g transform="scale(1.6,1.6) translate(3,3)">
    <g class="heat-pump" stroke-linejoin="round" stroke="##StrokeColor=#000000##" transform="translate(39 -2.3842e-7)"
        fill="##FillColor=#659dc5##">
        <rect class="inner" height="27.718" width="27.718" y="2.141" x="-36.859" stroke-width="1.0868"></rect>
        <g transform="matrix(1.0276 0 0 1.0276 -39.441 -.44130)" stroke-linecap="round" stroke-miterlimit="1"
            stroke-width="1.3509">
            <path d="m16.234 16.944 8.6837-6.894-8.6837-6.894v3.447h-13.152v6.894h13.152z" fill="#ce2824">
            </path>
            <path d="m15.766 28.844-8.6837-6.894 8.6837-6.894v3.447h13.152v6.894h-13.152z" fill="#3238db">
            </path>
        </g>
    </g>
</g>
    `;
    return heatpump;
  }

  static PumpSvgData() {
    const pump =
      `
<g transform="scale(2.5,2.5) translate(1,1)">
    <g fill="##FillColor=#659dc5##" transform="translate(-5.4940996,-5.5390997)">
        <g class="pump">
            <circle stroke="##StrokeColor=#000000##" cy="16" cx="15.955" r="9.9609003" class="pump-background" />
            <g transform="translate(16,16)">
                <path d="M -5,8.1369 V -8.1191 L 9.078,0.0091 Z" class="rotating-middle" stroke="##StrokeColor=#000000##"
                    stroke-width="0.96719" />
            </g>
        </g>
    </g>
</g>
    `;
    return pump;
  }

  static ValveThreeWaySvgData() {

    const valveThreeWay =
      `
<g transform="scale(2,2.3) translate(4,4)">
    <g transform="matrix(1,0,0,-1,-4.3773334,22.894063)">
        <g stroke-linejoin="round" stroke="##StrokeColor=#000000##" class="twv" fill="##FillColor=#659dc5##">
            <g stroke-linecap="round">
                <path d="M 16,16 4.925,22.3941 V 9.6061 Z" />
                <path d="m 16,16 11.075,6.3941 V 9.6061 Z" />
                <path d="M 16,16 9.606,4.925 h 12.788 z" />
            </g>
            <g class="blocker-wrapper">
                <g class="blocker" fill="#000000" transform="translate(16,16)">
                    <path stroke-width="0.80716"
                        d="m 0,-9.6108 a 8.8788,8.8788 0 0 0 -6.0273,2.375 l 1.6172,2.8008 A 5.7576,5.7576 0 0 1 0,-6.4897 5.7576,5.7576 0 0 1 4.4062,-4.4292 L 6.0293,-7.2397 A 8.8788,8.8788 0 0 0 0,-9.6108 Z" />
                </g>
            </g>
        </g>
        <path d="M 6.7797,10.576 V 21.084" stroke="##StrokeColor=#000000##" stroke-width="1px" fill="none" />
    </g>
</g>
    `;

    return valveThreeWay;
  }

  static ValveTwoWaySvgData() {

    const valveTwoWay =
      `
<g transform="scale(2.2,2.9) translate(2,4)">
    <g stroke-linejoin="round" fill-rule="nonzero" transform="translate(-3.8922957,-7.3951286)"
        stroke="##StrokeColor=#000000##" stroke-linecap="round" stroke-dasharray="none" stroke-miterlimit="4"
        stroke-width="1" fill="##FillColor=#659dc5##">
        <path d="M 10.068,7.9344 -1.007,14.3285 V 1.5405 Z" transform="translate(5.3992957,6.473236)" />
        <path d="M 10.068,7.9344 -1.007,14.3285 V 1.5405 Z" transform="matrix(-1,0,0,1,25.341517,6.354592)" />
    </g>
</g>
    `;

    return valveTwoWay;
  }

  static DuctSvgData() {
    return "";
  }

  static FanSvgData() {

    const fan =
      `
<g transform="scale(1.6,1.6) translate(2,6)">
    <g fill="##FillColor=#659dc5##" transform="matrix(1, 0, 0, 1, -0.231, -4.151388)">
        <g class="fan">
            <g id="g8">
                <path class="fan-background"
                    d="m12.297 5.154c-6.117 0-11.066 4.9492-11.066 11.066 0 6.117 4.9492 11.066 11.066 11.066 5.7137 0 10.408-4.3091 11.003-9.8647h7.525v-12.268h-18.148c-0.12601-0.0043-0.25236 0-0.37941 0z"
                    fill-rule="evenodd" stroke="##StrokeColor=#000000##" stroke-width="1px"
                    fill="##FillColor=#659dc5##" />
            </g>
            <g id="g4148" transform="translate(12.464 16.395)">
                <g id="g4162" stroke="##StrokeColor=#000000##" stroke-width="1.5" fill="none" class="rotating-middle">
                    <path id="use3009" d="m-1.8112-3.9787 3.6227-4.4971" />
                    <path id="use3011" d="m0.87376-4.2835 5.5741-1.5089" />
                    <path id="use3013" d="m3.2243-2.9521 5.3965 2.0557" />
                    <path id="use3015" d="m4.3433-0.4935 3.1575 4.835" />
                    <path id="use3017" d="m3.8043 2.1547-0.28747 5.7676" />
                    <path id="use3019" d="m1.8113 3.9787-3.6227 4.4971" />
                    <path id="use3021" d="m-0.87324 4.2837-5.5741 1.5089" />
                    <path id="use3023" d="m-3.2242 2.9527-5.3965-2.0559" />
                    <path id="use3025" d="m-4.3432 0.4935-3.158-4.8353" />
                    <path id="use3027" d="m-3.8032-2.1541 0.2875-5.7676" />
                </g>
            </g>
        </g>
    </g>
</g>
    `;

    return fan;
  }

  static CoolingCoilSvgData() {

    const coolingCoil =
      `
<g transform="scale(2,2) translate(5.5,0)">
    <g stroke="##StrokeColor=#000000##" transform="matrix(1, 0, 0, 1, -6.058399, -1.3729)">
        <rect id="rect4367" height="27.246" width="17.868" x="7.066" y="2.3772" fill="##FillColor=#659dc5##" />
        <g transform="translate(24.9334,29.6232) rotate(180)">
            <rect id="rect4367" class="cooling-coil" height="27.246" width="17.875" x="0" y="0"
                fill="##FillColor=#659dc5##" stroke="none" />
        </g>
        <rect id="rect4367" height="27.246" width="17.868" x="7.066" y="2.3772" fill="none" />
        <path id="path3001" d="m7.322 2.3729 17.424 27.254" stroke-width="1px" fill="none" />
        <path id="path3003" d="m24.929 2.3734-17.642 27.182" stroke-width="1px" fill="none" />
    </g>
</g>
    `;

    return coolingCoil;
  }

  static HeatingCoilSvgData() {

    const heatingCoil =
      `
<g transform="scale(2,2) translate(5.5,0)">
    <defs id="defs3">
        <rect id="heating-coil-rect" height="27.246" width="17.868" x="0" y="0" />
    </defs>
    <g stroke="##StrokeColor=#000000##" id="g15" transform="translate(-6.129206,-1.5327875)">
        <use xlink:href="#heating-coil-rect" fill="##FillColor=#659dc5##" stroke="none" x="7.066" y="2.3771999"
            id="use6" />
        <g transform="rotate(180,12.4667,14.8116)" id="g10">
            <use xlink:href="#heating-coil-rect" class="heating-coil" x="0" y="0" fill="##FillColor=#659dc5##"
                stroke="none" id="use8" />
        </g>
        <use xlink:href="#heating-coil-rect" stroke-width="1" fill="none" x="7.066" y="2.3771999" id="use12" />
        <path id="path3003" stroke-linejoin="miter" d="M 24.929,2.3734 7.2868,29.555" stroke="##StrokeColor=#000000##"
            stroke-linecap="butt" stroke-width="1px" fill="none" />
    </g>
</g>
    `;

    return heatingCoil;
  }

  static FilterSvgData() {

    const filter =
      `
<g transform="scale(2,2) translate(9,0)">
    <g stroke="##StrokeColor=#000000##" stroke-width="1" transform="matrix(1, 0, 0, 1, -9.37, -1.3252)">
        <rect id="rect4367" height="27.35" width="11.26" y="2.3252" x="10.37" fill="##FillColor=#659dc5##" />
        <path id="path3756" stroke-linejoin="miter"
            d="m11.892,2.6997,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334"
            stroke-linecap="round" stroke-miterlimit="4" stroke-dasharray="none" stroke-width="1.2694304" fill="none" />
    </g>
</g>
    `;

    return filter;
  }

  static HumidifierSvgData() {

    const humidifier =
      `
<g transform="scale(2.2,2.2) translate(5,2)">
    <g class="duct-humidifier" transform="matrix(1, 0, 0, 1, -3.324199, -7.877)">
        <g id="g11" transform="translate(0 5.1505)">
            <g id="g13" stroke="##StrokeColor=#000000##" stroke-width=".5" class="water-drops"
                fill="#00f0ff">
                <path id="path4150"
                    d="m14.291 6.7851c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z" />
                <g id="g4236" transform="translate(0 .17167)">
                    <path id="path4150-7"
                        d="m18.179 5.3612c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z" />
                    <path id="path4150-7-1"
                        d="m18.234 7.8656c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z" />
                </g>
            </g>
            <g id="g19" transform="translate(0,8)">
                <g id="g21" stroke="##StrokeColor=#000000##" stroke-width=".5" class="water-drops water-drops-2"
                    fill="#00f0ff">
                    <path id="path23"
                        d="m14.291 6.7851c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z" />
                    <g id="g25" transform="translate(0 .17167)">
                        <path id="path27"
                            d="m18.179 5.3612c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z" />
                        <path id="path29"
                            d="m18.234 7.8656c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z" />
                    </g>
                </g>
            </g>
        </g>
        <path id="rect4136-6" class="humidifier-body"
            d="m4.3242 8.877v22.586h4.0059v-9.883h4.3789v-2.617h-4.3789v-5.721h4.3789v-2.617h-4.3789v-1.748h-4.0059z"
            stroke="##StrokeColor=#000000##" fill="##FillColor=#659dc5##" />
    </g>
</g>
    `;

    return humidifier;
  }

  static HumiditySvgData() {
    const Humidity =
      `
<g transform="scale(2.5,2.5) translate(8,0)">
    <rect style="
        fill: #00d1ff;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: ##StrokeColor=#000000##;
        stroke-width: 1px;
      " x="3.660192" y="0.5" width="2.901" height="14.505" />
    <path style="fill: ##FillColor=#659dc5##; stroke: ##StrokeColor=#000000##; stroke-width: 0.889176px"
        d="m 9.7077419,18.0463 -2.298594,3.981286 H 2.8119599 L 0.51336587,18.0463 2.8119599,14.065014 h 4.597188 z" />
    <g transform="translate(-10.962785,-9.3157224)">
        <g>
            <path
                d="m 17.43357,24.668533 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
                style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          " />
            <path
                d="m 17.43357,27.878474 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
                style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          " />
        </g>
        <g transform="translate(0,0.107786)">
            <path
                d="m 14.710621,24.560747 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
                style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          " />
            <path
                d="m 14.710621,27.770688 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
                style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          " />
        </g>
    </g>
</g>
    `;

    return Humidity;
  }

  static PressureSvgData() {

    const pressure =
      `
<g transform="scale(1.5,1.6) translate(6,6)">
    <path style="fill: ##FillColor=#659dc5##; stroke: ##StrokeColor=#000000##; stroke-width: 1.29098px"
        d="M 21.101011,20.624556 17.76371,26.404938 H 11.089107 L 7.7518058,20.624556 11.089107,14.844174 h 6.674603 z" />
    <g transform="matrix(0.39332133,0,0,0.5366036,8.3312906,37.286552)">
        <g transform="translate(0,0.03745956)">
            <path style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 1.30927;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          " d="m 16.929663,-31.088307 4.3966,-1.150699 v 2.301399 z" stroke-miterlimit="4" />
            <path style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 1;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          " d="M 27.541431,-31.088307 H 18.912663" />
        </g>
        <path d="m 15.532379,-39.152447 v 16.2032" style="
          fill: none;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 1px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
        " />
        <g transform="matrix(-1,0,0,1,-1.8983044,-0.27118644)">
            <path style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 1.30927;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          " d="m -15.961713,-30.779661 4.3966,-1.150699 v 2.301399 z" stroke-miterlimit="4" />
            <path style="
            fill: none;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 1;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          " d="M -5.3499446,-30.779661 H -13.978713" />
        </g>
    </g>
    <g transform="translate(-1.5131572,-0.15657804)">
        <path d="M 2.0131572,0.15657804 V 6.9638416 H 14.573291 v 8.3199894" style="
          fill: none;
          fill-rule: evenodd;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        " />
        <path d="M 29.865974,0.15657812 V 6.9638416 H 17.305841 v 8.3199894" style="
          fill: none;
          fill-rule: evenodd;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        " />
    </g>
</g>
      `;

    return pressure;
  }

  static DamperSvgData() {

    const damper =
      `
<g transform="scale(2,2) translate(10,0)">
    <rect class="damper" height="27.5" width="12" stroke="##StrokeColor=#000000##" stroke-miterlimit="4" x="0.69481522"
        y="0.67645228" stroke-dasharray="none" stroke-width="1" fill="##FillColor=#659dc5##" />
    <g stroke="##StrokeColor=#000000##" stroke-width="1.5px" transform="translate(-9.3051848,-1.5735477)">
        <g transform="translate(16,7)">
            <line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line" />
        </g>
        <g transform="translate(16,13)">
            <line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line" />
        </g>
        <g transform="translate(16,19)">
            <line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line" />
        </g>
        <g transform="translate(16,25)">
            <line x1="-5" x2="5" y1="0" y2="0" transform="rotate(-35)" class="damper-line" />
        </g>
    </g>
    <g stroke-linejoin="miter" transform="matrix(1.2268237,0,0,0.94845469,-13.299764,-1.1862851)"
        stroke="##StrokeColor=#000000##" stroke-linecap="butt" fill="none">
        <path stroke-width="1.06273px" d="m 16.298,2.2402 v 28.442" />
    </g>
</g>
    `;
    return damper;
  }

  static Temperature2SvgData() {
    return "";
  }

  static ThermalWheelSvgData() {

    const thermalWheel =
      `
<g transform="scale(1.4,1.2) translate(9,8)">
    <g stroke="##StrokeColor=#000000##" fill="##FillColor=#659dc5##" transform="translate(-2.370089)">
        <rect class="thermal-wheel-background" height="40" width="25.5" y="-4" x="3" fill="inherit" stroke-width="1" />
        <g class="thermal-wheel" stroke-width="1">
            <line x1="3" x2="28.5" y1="-4" y2="-4" />
            <line x1="3" x2="28.5" y1="0" y2="0" />
            <line x1="3" x2="28.5" y1="4" y2="4" />
            <line x1="3" x2="28.5" y1="8" y2="8" />
            <line x1="3" x2="28.5" y1="12" y2="12" />
            <line x1="3" x2="28.5" y1="16" y2="16" />
            <line x1="3" x2="28.5" y1="20" y2="20" />
            <line x1="3" x2="28.5" y1="24" y2="24" />
            <line x1="3" x2="28.5" y1="28" y2="28" />
            <line x1="3" x2="28.5" y1="32" y2="32" />
            <line x1="3" x2="28.5" y1="36" y2="36" />
        </g>
    </g>
</g>
    `;

    return thermalWheel;
  }

  static EnthalpySvgData() {

    const enthalpy =
      `
<g transform="scale(2.8,2.4) translate(5,1)">
    <defs>
        <linearGradient id="linearGradient4194">
            <stop style="stop-color: #ffff00; stop-opacity: 1" offset="0" id="stop4196" />
            <stop id="stop4148" offset="0.3598454" style="stop-color:#ffff00; stop-opacity: 1" />
            <stop id="stop4144" offset="0.59441435" style="stop-color: #00ffff; stop-opacity: 1" />
            <stop style="stop-color: #00ffff; stop-opacity: 1" offset="1" id="stop4198" />
        </linearGradient>
        <linearGradient xlink:href="#linearGradient4194" id="linearGradient4219" x1="15.955305" y1="9.504283"
            x2="16.127491" y2="24.826317" gradientUnits="userSpaceOnUse"
            gradientTransform="translate(-10.896808,-9.4127998)" />
    </defs>
    <rect style="
        fill: url(#linearGradient4219);
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: ##StrokeColor=#000000##;
        stroke-width: 1px;
      " x="3.660192" y="0.5" width="2.901" height="14.505" id="rect3012" />
    <path style="fill: ##FillColor=#659dc5## ; stroke: ##StrokeColor=#000000##; stroke-width: 0.889176px"
        d="m 9.7077419,18.0463 -2.298594,3.981286 H 2.8119599 L 0.51336587,18.0463 2.8119599,14.065014 h 4.597188 z" />
    <g transform="translate(-10.733726,-9.4127998)">
        <g transform="translate(8.1630559,0.95878887)">
            <circle style="
            fill: none;
            fill-opacity: 1;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          " id="path4137" cx="6.4061227" cy="28.129852" r="0.77312505" />
            <path style="
            fill: none;
            fill-rule: evenodd;
            stroke: ##StrokeColor=#000000##;
            stroke-width: 0.5;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          " d="M 6.4061205,27.157211 V 23.65349" />
        </g>
        <path style="
          fill: none;
          stroke:##StrokeColor=#000000##;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
            d="m 17.270488,24.668533 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z" />
        <path style="
          fill: none;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
            d="m 17.270488,27.878474 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z" />
    </g>
</g>
    `;

    return enthalpy;
  }

  static FlowSvgData() {
    const flow =
      `
<g transform="scale(2.7,2.5) translate(7,2)">
    <defs>
        <linearGradient id="linearGradient4194">
            <stop style="stop-color: #ffff00; stop-opacity: 1" offset="0" />
            <stop style="stop-color: currentColor; stop-opacity: 1" offset="1" />
        </linearGradient>
    </defs>
    <path style="fill: ##FillColor=#659dc5##; stroke: ##StrokeColor=#000000##; stroke-width: 0.889176px"
        d="m 9.7077419,16.908637 -2.298594,3.981286 H 2.8119599 L 0.51336587,16.908637 2.8119599,12.927351 h 4.597188 z" />
    <g transform="matrix(0.83920236,0,0,0.83920236,-8.3130944,-6.3365267)">
        <path id="path4146" d="m 14.917284,30.513877 v -5.217284 h 2.569115" style="
          fill: none;
          fill-rule: evenodd;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 0.824475px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        " />
        <path d="m 14.956808,27.549512 h 2.529591" style="
          fill: none;
          fill-rule: evenodd;
          stroke: ##StrokeColor=#000000##;
          stroke-width: 0.824475px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        " />
    </g>
    <path style="
        fill: none;
        fill-rule: evenodd;
        stroke: ##StrokeColor=#000000##;
        stroke-width: 1px;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-opacity: 1;
      " d="M 5.1629049,12.964256 V 0.5 H 0.56071887" />
    <path style="
        fill: none;
        fill-rule: evenodd;
        stroke: ##StrokeColor=#000000##;
        stroke-width: 1px;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-opacity: 1;
      " d="m 5.0190869,8.889403 h 2.205215 v 4.122792" />
</g>
    `;

    return flow;
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
    const boiler =
      `
<path style="
          fill: ##FillColor=#28c3c6##;
          fill-opacity: 1;
          fill-rule: nonzero;
          stroke:##StrokeColor=#000000##;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        " d="m 3.714,27.855 14.856,-12.999 0,-12.999 22.284,0 0,12.999 14.856,12.999 0,29.712 -51.996,0 z">
</path>
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
