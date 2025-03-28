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
    const roomHumidity =
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
    return roomHumidity;

  }

  static RoomTemperatureSvgData() {
    const roomTemperature =
      `
    <g transform="translate(0,0)">
    <circle
      r="30"
      cy="30"
      cx="30"
      style="
        opacity: 1;
        fill: #FFFFFF;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke:#000000;
        stroke-width: 1.5;
        stroke-linecap: butt;
        stroke-linejoin: round;
        stroke-miterlimit: 4;
        stroke-dasharray: none;
        stroke-opacity: 1;
      "
    />
    <g
      transform="translate(0,0)"
      style="
        font-style: normal;
        font-weight: normal;
        font-size: 51px;
        line-height: 125%;
        font-family: Sans;
        letter-spacing: 0px;
        word-spacing: 0px;
        fill:#000000;
        fill-opacity: 1;
        stroke: none;
        stroke-width: 1px;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-opacity: 1;
      "
    >
      <path
        d="m 15,15 h 30 v 5 h -12.5 v 30 h -5 v -30 h -12.5 z"
      />
    </g>
  </g>
    `;
    return roomTemperature;
  }

  static TemperatureSvgData() {

    const temperature =
      `
      <g transform="scale(2.8,2.8) translate(6,0)">
           <g
      id="layer1"
      stroke="#000000"
      stroke-width="1px"
      transform="translate(-10.804626,-9.2243756)"
    >
      <rect
        id="rect3012"
        height="14.505"
        width="2.901"
        y="9.9127998"
        x="14.557"
        fill="#ffff00"
      />
      <path
        id="path3010"
        stroke-width="1.2px"
        transform="matrix(0.74098,0,0,0.74098,7.3047,15.679)"
        fill="currentColor"
        d="m 17.949,15.898 -3.1021,5.373 H 8.6427 L 5.5406,15.898 8.6427,10.525 h 6.2042 z"
      />
    </g>
    <g id="g4141" transform="translate(-1.2033861,-8.1217684)">
      <circle
        r="0.77312505"
        cy="28.129852"
        cx="6.4061227"
        id="path4137"
        style="
          fill: none;
          fill-opacity: 1;
          stroke: #000000;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <path
        id="path4139"
        d="M 6.4061205,27.157211 V 23.65349"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 0.5;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
    </g>
     </g>
    `;


    return temperature;
  }

  static BoilerSvgData() {
    const boiler = `
    <g transform="scale(1.6,1.6) translate(3,3)">
    <path
      style="
        fill: currentColor;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: #000000;
        stroke-width: 1;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-miterlimit: 4;
        stroke-dasharray: none;
        stroke-opacity: 1;
      "
      d="m 2,15 8,-7 0,-7 12,0 0,7 8,7 0,16 -28,0 z"
    ></path>
    </g>
  `;
    return boiler;
  }

  static HeatPumpSvgData() {

    const heatPump =
      `
<g transform="scale(1.6,1.6) translate(3,3)">
      <g
      class="heat-pump"
      stroke-linejoin="round"
      stroke="#000"
      transform="translate(39 -2.3842e-7)"
      fill="currentColor"
    >
      <rect
        class="inner"
        height="27.718"
        width="27.718"
        y="2.141"
        x="-36.859"
        stroke-width="1.0868"
      ></rect>
      <g
        transform="matrix(1.0276 0 0 1.0276 -39.441 -.44130)"
        stroke-linecap="round"
        stroke-miterlimit="1"
        stroke-width="1.3509"
      >
        <path
          d="m16.234 16.944 8.6837-6.894-8.6837-6.894v3.447h-13.152v6.894h13.152z"
          fill="#ce2824"
        ></path>
        <path
          d="m15.766 28.844-8.6837-6.894 8.6837-6.894v3.447h13.152v6.894h-13.152z"
          fill="#3238db"
        ></path>
      </g>
    </g>
 </g>
    `;
    return heatPump;
  }

  static PumpSvgData() {
    const pump =
      `
      <g transform="scale(2.5,2.5) translate(1,1)">
      <g fill="currentColor" transform="translate(-5.4940996,-5.5390997)">
      <g class="pump">
        <circle
          stroke="#000000"
          cy="16"
          cx="15.955"
          r="9.9609003"
          class="pump-background"
        />
        <g transform="translate(16,16)">
          <path
            d="M -5,8.1369 V -8.1191 L 9.078,0.0091 Z"
            class="rotating-middle"
            stroke="#000000"
            stroke-width="0.96719"
          />
        </g>
      </g>
    </g>
    </g>
    `;
    return pump;
  }

  static ValueThreeWaySvgData() {

    const valueThreeWay =
      `
      <g transform="scale(1.8,1.8) translate(5,4)">
    <g transform="matrix(1,0,0,-1,-4.3773334,22.894063)">
      <g
        stroke-linejoin="round"
        stroke="#000000"
        class="twv"
        fill="currentColor"
      >
        <g stroke-linecap="round">
          <path d="M 16,16 4.925,22.3941 V 9.6061 Z" />
          <path d="m 16,16 11.075,6.3941 V 9.6061 Z" />
          <path d="M 16,16 9.606,4.925 h 12.788 z" />
        </g>
        <g class="blocker-wrapper">
          <g class="blocker" fill="#000000" transform="translate(16,6)">
            <path
              stroke-width="0.80716"
              d="m 0,-9.6108 a 8.8788,8.8788 0 0 0 -6.0273,2.375 l 1.6172,2.8008 A 5.7576,5.7576 0 0 1 0,-6.4897 5.7576,5.7576 0 0 1 4.4062,-4.4292 L 6.0293,-7.2397 A 8.8788,8.8788 0 0 0 0,-9.6108 Z"
            />
          </g>
        </g>
      </g>
      <path
        d="M 6.7797,10.576 V 21.084"
        stroke="#000000"
        stroke-width="1px"
        fill="none"
      />
    </g>
      </g>
    `;

    return valueThreeWay;
  }

  static ValueTwoWaySvgData() {

    const valueTwoWay =
      `

      <g transform="scale(2.2,2.2) translate(2,6)">
    <g
      stroke-linejoin="round"
      fill-rule="nonzero"
      transform="translate(-3.8922957,-7.3951286)"
      stroke="#000000"
      stroke-linecap="round"
      stroke-dasharray="none"
      stroke-miterlimit="4"
      stroke-width="1"
      fill="currentColor"
    >
      <path
        d="M 10.068,7.9344 -1.007,14.3285 V 1.5405 Z"
        transform="translate(5.3992957,6.473236)"
      />
      <path
        d="M 10.068,7.9344 -1.007,14.3285 V 1.5405 Z"
        transform="matrix(-1,0,0,1,25.341517,6.354592)"
      />
    </g>
    </g>
    `;

    return valueTwoWay;
  }

  static DuctSvgData() {
    return "";
  }

  static FanSvgData() {

    const fan =
      `
      <g transform="scale(1.6,1.6) translate(2,8)">
   <g fill="currentColor" transform="matrix(1, 0, 0, 1, -0.231, -4.151388)">
      <g class="fan">
        <g id="g8">
          <path
            class="fan-background"
            d="m12.297 5.154c-6.117 0-11.066 4.9492-11.066 11.066 0 6.117 4.9492 11.066 11.066 11.066 5.7137 0 10.408-4.3091 11.003-9.8647h7.525v-12.268h-18.148c-0.12601-0.0043-0.25236 0-0.37941 0z"
            fill-rule="evenodd"
            stroke="#000"
            stroke-width="1px"
            fill="inherit"
          />
        </g>
        <g id="g4148" transform="translate(12.464 16.395)">
          <g
            id="g4162"
            stroke="#000"
            stroke-width="1.5"
            fill="none"
            class="rotating-middle"
          >
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
         <g stroke="#000" transform="matrix(1, 0, 0, 1, -6.058399, -1.3729)">
      <rect
        id="rect4367"
        height="27.246"
        width="17.868"
        x="7.066"
        y="2.3772"
        fill="currentColor"
      />
      <g transform="translate(24.9334,29.6232) rotate(180)">
        <rect
          id="rect4367"
          class="cooling-coil"
          height="27.246"
          width="17.875"
          x="0"
          y="0"
          fill="currentColor"
          stroke="none"
        />
      </g>
      <rect
        id="rect4367"
        height="27.246"
        width="17.868"
        x="7.066"
        y="2.3772"
        fill="none"
      />
      <path
        id="path3001"
        d="m7.322 2.3729 17.424 27.254"
        stroke-width="1px"
        fill="none"
      />
      <path
        id="path3003"
        d="m24.929 2.3734-17.642 27.182"
        stroke-width="1px"
        fill="none"
      />
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
    <g stroke="#000000" id="g15" transform="translate(-6.129206,-1.5327875)">
      <use
        xlink:href="#heating-coil-rect"
        fill="currentColor"
        stroke="none"
        x="7.066"
        y="2.3771999"
        id="use6"
      />
      <g transform="rotate(180,12.4667,14.8116)" id="g10">
        <use
          xlink:href="#heating-coil-rect"
          class="heating-coil"
          x="0"
          y="0"
          fill="currentColor"
          stroke="none"
          id="use8"
        />
      </g>
      <use
        xlink:href="#heating-coil-rect"
        stroke-width="1"
        fill="none"
        x="7.066"
        y="2.3771999"
        id="use12"
      />
      <path
        id="path3003"
        stroke-linejoin="miter"
        d="M 24.929,2.3734 7.2868,29.555"
        stroke="#000000"
        stroke-linecap="butt"
        stroke-width="1px"
        fill="none"
      />
    </g>
    </g>
    `;

    return heatingCoil;
  }

  static FilterSvgData() {

    const filter =
      `
      <g transform="scale(2,2) translate(9,0)">
    <g
      stroke="#000"
      stroke-width="1"
      transform="matrix(1, 0, 0, 1, -9.37, -1.3252)"
    >
      <rect
        id="rect4367"
        height="27.35"
        width="11.26"
        y="2.3252"
        x="10.37"
        fill="currentColor"
      />
      <path
        id="path3756"
        stroke-linejoin="miter"
        d="m11.892,2.6997,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334,8.2165,4.4334-8.2165,4.4334"
        stroke-linecap="round"
        stroke-miterlimit="4"
        stroke-dasharray="none"
        stroke-width="1.2694304"
        fill="none"
      />
    </g>
       </g>
    `;

    return filter;
  }

  static HumidifierSvgData() {

    const humidifier =
      `

      <g transform="scale(2.2,2.2) translate(5,2)">
    <g
      class="duct-humidifier"
      transform="matrix(1, 0, 0, 1, -3.324199, -7.877)"
    >
      <g id="g11" transform="translate(0 5.1505)">
        <g
          id="g13"
          stroke="#000"
          stroke-width=".5"
          class="water-drops"
          fill="#00f0ff"
        >
          <path
            id="path4150"
            d="m14.291 6.7851c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
          />
          <g id="g4236" transform="translate(0 .17167)">
            <path
              id="path4150-7"
              d="m18.179 5.3612c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
            />
            <path
              id="path4150-7-1"
              d="m18.234 7.8656c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
            />
          </g>
        </g>
        <g id="g19" transform="translate(0,8)">
          <g
            id="g21"
            stroke="#000"
            stroke-width=".5"
            class="water-drops water-drops-2"
            fill="#00f0ff"
          >
            <path
              id="path23"
              d="m14.291 6.7851c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
            />
            <g id="g25" transform="translate(0 .17167)">
              <path
                id="path27"
                d="m18.179 5.3612c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
              />
              <path
                id="path29"
                d="m18.234 7.8656c0.46542-0.0958 0.69019-0.27099 0.99164-0.49615 0.10429-0.07789 0.23068-0.12587 0.37088-0.12587 0.34281 0 0.62078 0.27918 0.62078 0.62199s-0.27796 0.61956-0.62078 0.61956c-0.13834 0-0.26988-0.0428-0.37088-0.1222-0.29895-0.23498-0.52493-0.40696-0.99168-0.49732z"
              />
            </g>
          </g>
        </g>
      </g>
      <path
        id="rect4136-6"
        class="humidifier-body"
        d="m4.3242 8.877v22.586h4.0059v-9.883h4.3789v-2.617h-4.3789v-5.721h4.3789v-2.617h-4.3789v-1.748h-4.0059z"
        stroke="#000"
        fill="currentColor"
      />
    </g>
     </g>
    `;

    return humidifier;
  }

  static HumiditySvgData() {

    // <defs>
    //   <linearGradient inkscape: swatch = "gradient" >
    //     <stop style="stop-color: #ffff00; stop-opacity: 1" offset = "0" />
    //       <stop style="stop-color: currentColor; stop-opacity: 1" offset = "1" />
    //         </linearGradient>
    //         </defs>
    const Humidity =
      `


      <g transform="scale(2.5,2.5) translate(8,0)">
    <rect
      style="
        fill: #00d1ff;
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: #000000;
        stroke-width: 1px;
      "
      x="3.660192"
      y="0.5"
      width="2.901"
      height="14.505"
    />
    <path
      style="fill: #659dc5; stroke: #000000; stroke-width: 0.889176px"
      d="m 9.7077419,18.0463 -2.298594,3.981286 H 2.8119599 L 0.51336587,18.0463 2.8119599,14.065014 h 4.597188 z"
    />
    <g transform="translate(-10.962785,-9.3157224)">
      <g>
        <path
          d="m 17.43357,24.668533 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
        <path
          d="m 17.43357,27.878474 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
      </g>
      <g transform="translate(0,0.107786)">
        <path
          d="m 14.710621,24.560747 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
        <path
          d="m 14.710621,27.770688 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
        />
      </g>
    </g>
     </g>
    `;

    return Humidity;
  }

  static PressureSvgData() {

    const pressure =
      `
      <g transform="scale(1.5,1.5) translate(6,6)">
          <path
      style="fill: currentColor; stroke: #000000; stroke-width: 1.29098px"
      d="M 21.101011,20.624556 17.76371,26.404938 H 11.089107 L 7.7518058,20.624556 11.089107,14.844174 h 6.674603 z"
    />
    <g transform="matrix(0.39332133,0,0,0.5366036,8.3312906,37.286552)">
      <g transform="translate(0,0.03745956)">
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1.30927;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="m 16.929663,-31.088307 4.3966,-1.150699 v 2.301399 z"
          stroke-miterlimit="4"
        />
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="M 27.541431,-31.088307 H 18.912663"
        />
      </g>
      <path
        d="m 15.532379,-39.152447 v 16.2032"
        style="
          fill: none;
          stroke: #000000;
          stroke-width: 1px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
        "
      />
      <g transform="matrix(-1,0,0,1,-1.8983044,-0.27118644)">
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1.30927;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="m -15.961713,-30.779661 4.3966,-1.150699 v 2.301399 z"
          stroke-miterlimit="4"
        />
        <path
          style="
            fill: none;
            stroke: #000000;
            stroke-width: 1;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
          "
          d="M -5.3499446,-30.779661 H -13.978713"
        />
      </g>
    </g>
    <g transform="translate(-1.5131572,-0.15657804)">
      <path
        d="M 2.0131572,0.15657804 V 6.9638416 H 14.573291 v 8.3199894"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
      <path
        d="M 29.865974,0.15657812 V 6.9638416 H 17.305841 v 8.3199894"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 1;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
      />
    </g>
    </g>
      `;

    return pressure;
  }

  static DamperSvgData() {

    const damper =
      `
      <g transform="scale(2,2) translate(10,0)">
    <rect
      class="damper"
      height="27.5"
      width="12"
      stroke="#000000"
      stroke-miterlimit="4"
      x="0.69481522"
      y="0.67645228"
      stroke-dasharray="none"
      stroke-width="1"
      fill="currentColor"
    />
    <g
      stroke="#000000"
      stroke-width="1.5px"
      transform="translate(-9.3051848,-1.5735477)"
    >
      <g transform="translate(16,7)">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
        />
      </g>
      <g transform="translate(16,13)">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
        />
      </g>
      <g transform="translate(16,19)">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
        />
      </g>
      <g transform="translate(16,25)">
        <line
          x1="-5"
          x2="5"
          y1="0"
          y2="0"
          transform="rotate(-35)"
          class="damper-line"
        />
      </g>
    </g>
    <g
      stroke-linejoin="miter"
      transform="matrix(1.2268237,0,0,0.94845469,-13.299764,-1.1862851)"
      stroke="#000000"
      stroke-linecap="butt"
      fill="none"
    >
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
      <g transform="scale(1,1) translate(18,10)">
    <g stroke="#000000" fill="currentColor" transform="translate(-2.370089)">
      <rect
        class="thermal-wheel-background"
        height="40"
        width="25.5"
        y="-4"
        x="3"
        fill="inherit"
        stroke-width="1"
      />
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
    <defs>
      <linearGradient id="linearGradient4194">
        <stop
          style="stop-color: #ffff00; stop-opacity: 1"
          offset="0"
          id="stop4196"
        />
        <stop
          id="stop4148"
          offset="0.3598454"
          style="stop-color: #ffff00; stop-opacity: 1"
        />
        <stop
          id="stop4144"
          offset="0.59441435"
          style="stop-color: #00ffff; stop-opacity: 1"
        />
        <stop
          style="stop-color: #00ffff; stop-opacity: 1"
          offset="1"
          id="stop4198"
        />
      </linearGradient>
      <linearGradient
        xlink:href="#linearGradient4194"
        id="linearGradient4219"
        x1="15.955305"
        y1="9.504283"
        x2="16.127491"
        y2="24.826317"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(-10.896808,-9.4127998)"
      />
    </defs>
    <rect
      style="
        fill: url(#linearGradient4219);
        fill-opacity: 1;
        fill-rule: nonzero;
        stroke: #000000;
        stroke-width: 1px;
      "
      x="3.660192"
      y="0.5"
      width="2.901"
      height="14.505"
      id="rect3012"
    />
    <path
      :style="fill: #ffffff; stroke: #000000; stroke - width: 0.889176px"
      d="m 9.7077419,18.0463 -2.298594,3.981286 H 2.8119599 L 0.51336587,18.0463 2.8119599,14.065014 h 4.597188 z"
    />
    <g transform="translate(-10.733726,-9.4127998)">
      <g transform="translate(8.1630559,0.95878887)">
        <circle
          style="
            fill: none;
            fill-opacity: 1;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
          id="path4137"
          cx="6.4061227"
          cy="28.129852"
          r="0.77312505"
        />
        <path
          style="
            fill: none;
            fill-rule: evenodd;
            stroke: #000000;
            stroke-width: 0.5;
            stroke-linecap: butt;
            stroke-linejoin: miter;
            stroke-miterlimit: 4;
            stroke-dasharray: none;
            stroke-opacity: 1;
          "
          d="M 6.4061205,27.157211 V 23.65349"
        />
      </g>
      <path
        style="
          fill: none;
          stroke: #000000;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
        d="m 17.270488,24.668533 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
      />
      <path
        style="
          fill: none;
          stroke: #000000;
          stroke-width: 0.5;
          stroke-miterlimit: 4;
          stroke-dasharray: none;
          stroke-opacity: 1;
        "
        d="m 17.270488,27.878474 c 0.0958,0.465416 0.27099,0.690186 0.496151,0.991638 0.07789,0.10429 0.125868,0.230683 0.125868,0.370878 0,0.342813 -0.279183,0.620776 -0.621988,0.620776 -0.342814,0 -0.619564,-0.277963 -0.619564,-0.620776 0,-0.138342 0.0428,-0.269876 0.1222,-0.370878 0.234976,-0.29895 0.406955,-0.524932 0.497324,-0.991677 z"
      />
    </g>
    `;

    return enthalpy;
  }

  static FlowSvgData() {
    const flow =
      `
    <defs>
      <linearGradient id="linearGradient4194" osb:paint="gradient">
        <stop style="stop-color: #ffff00; stop-opacity: 1" offset="0" />
        <stop style="stop-color: currentColor; stop-opacity: 1" offset="1" />
      </linearGradient>
    </defs>
    <path
      style="fill: currentColor; stroke: #000000; stroke-width: 0.889176px"
      d="m 9.7077419,16.908637 -2.298594,3.981286 H 2.8119599 L 0.51336587,16.908637 2.8119599,12.927351 h 4.597188 z"
    />
    <g transform="matrix(0.83920236,0,0,0.83920236,-8.3130944,-6.3365267)">
      <path
        id="path4146"
        d="m 14.917284,30.513877 v -5.217284 h 2.569115"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 0.824475px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      />
      <path
        d="m 14.956808,27.549512 h 2.529591"
        style="
          fill: none;
          fill-rule: evenodd;
          stroke: #000000;
          stroke-width: 0.824475px;
          stroke-linecap: butt;
          stroke-linejoin: miter;
          stroke-opacity: 1;
        "
      />
    </g>
    <path
      style="
        fill: none;
        fill-rule: evenodd;
        stroke: #000000;
        stroke-width: 1px;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-opacity: 1;
      "
      d="M 5.1629049,12.964256 V 0.5 H 0.56071887"
    />
    <path
      style="
        fill: none;
        fill-rule: evenodd;
        stroke: #000000;
        stroke-width: 1px;
        stroke-linecap: butt;
        stroke-linejoin: miter;
        stroke-opacity: 1;
      "
      d="m 5.0190869,8.889403 h 2.205215 v 4.122792"
    />
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
