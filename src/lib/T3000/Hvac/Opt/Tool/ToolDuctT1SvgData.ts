

class ToolDuctT1SvgData {

  static GetSvgFrame(symbolType) {

    var frame = { width: 60, height: 60 };

    switch (symbolType) {
      case "Duct1":
        frame = { width: 68.5, height: 29.667 };
        break;
      case "Duct2":
        frame = { width: 76, height: 21.833 };
        break;
      case "Duct3":
        frame = { width: 68.5, height: 29.67 };
        break;
      case "Duct4":
        frame = { width: 68.5, height: 30.67 };
        break;
      case "Duct5":
        frame = { width: 68.5, height: 29.67 };
        break;
      case "Duct6":
        frame = { width: 66.33, height: 38.5 };
        break;
      case "Duct7":
        frame = { width: 30, height: 60 };
        break;
      case "Duct8":
        frame = { width: 30, height: 60 };
        break;
      case "Duct9":
        frame = { width: 0, height: 0 };
        break;
      case "Duct10":
        frame = { width: 0, height: 0 };
        break;
      case "Duct11":
        frame = { width: 0, height: 0 };
        break;
      case "Duct12":
        frame = { width: 0, height: 0 };
        break;
      default:
        break;
    }

    return frame;
  }

  static Duct1Data() {
    const svgData =
      `
<g>
    <g width="19.833" height="0" transform="scale(1,1) translate(0.5,14.5)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L19.833,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="18.667" height="0" transform="scale(1,1) translate(48.333,14.5)">
        <g transform="scale(1,1)
translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##" stroke-opacity="1">
            <path d="M0,0 L18.667,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="28.667" height="28.667" transform="rotate(270,33.667,14.333) scale(1,1) translate(19.333,0)">
        <g width="28.667" height="28.667" transform="scale(1,1) translate(0,0)" stroke="##LineColor=#000000##"
            stroke-width="##LineThick=1##" stroke-dasharray="none" fill="##FillColor=#FFFFFF##" fill-opacity="1"
            stroke-opacity="1">
            <ellipse rx="14.3335" ry="14.3335" cx="14.3335" cy="14.3335" />
        </g>
    </g>
    <g width="20.333" height="20.333" transform="scale(1,1) translate(23.5,4.167)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,20.333
L20.333,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,19.333L1,19.333L1,21.333L-1,21.333z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="20.333" height="20.333" transform="scale(1,1) translate(23.5,4.167)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0
L20.333,20.333" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
</g>
    `;

    return svgData;
  }

  static Duct2Data() {
    const svgData =
      `
<g>
    <g width="35.833" height="20.833" transform="scale(1,1) translate(19.5,0)">
        <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
            width="35.833" height="20.833" transform="scale(1,1)
translate(0,0)" fill="##FillColor=#FFFFFF##" fill-opacity="1" stroke-opacity="1">
            <rect width="35.833" height="20.833" />
        </g>
    </g>
    <g width="28.167" height="0" transform="scale(1,1)
translate(0.5,10.333)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L28.167,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="28.167" height="0" transform="scale(1,1) translate(46.333,10.333)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L28.167,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
</g>
    `;

    return svgData;
  }

  static Duct3Data() {
    const svgData =
      `
<g>
    <g width="19.833" height="0" transform="scale(1,1) translate(0.5,14.833)">
        <g transform="scale(1,1)
translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##" stroke-opacity="1">
            <path d="M0,0 L19.833,0" fill="none" stroke-width="##LineThick=1##" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="18.667" height="0" transform="scale(1,1)
translate(48.333,14.833)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L18.667,0" fill="none" stroke-width="##LineThick=1##" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="28.667" height="28.667" transform="rotate(270,33.667,14.833) scale(1,1) translate(19.333,0.5)">
        <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
            width="28.667" height="28.667" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
            fill-opacity="1" stroke-opacity="1">
            <rect width="28.667" height="28.667" />
        </g>
    </g>
</g>
    `;

    return svgData;
  }

  static Duct4Data() {
    const svgData =
      `
<g>
    <g width="19.833" height="0" transform="scale(1,1) translate(0.5,14.833)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L19.833,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="18.667" height="0" transform="scale(1,1) translate(48.333,14.833)">
        <g transform="scale(1,1)
translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##" stroke-opacity="1">
            <path d="M0,0 L18.667,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="28.667" height="28.667" transform="rotate(270,33.667,14.833) scale(1,1) translate(19.333,0.5)">
        <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
            width="28.667" height="28.667" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
            fill-opacity="1" stroke-opacity="1">
            <rect width="28.667" height="28.667" />
        </g>
    </g>
    <g width="28.667" height="28.667" transform="scale(1,1) translate(19.333,0.5)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0
L28.667,28.667" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
</g>
    `;

    return svgData;
  }

  static Duct5Data() {
    const svgData =
      `
<g>
    <g width="19.833" height="0" transform="scale(1,1) translate(0.5,14.833)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L19.833,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="18.667" height="0" transform="scale(1,1) translate(48.333,14.833)">
        <g transform="scale(1,1)
translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##" stroke-opacity="1">
            <path d="M0,0 L18.667,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="28.667" height="28.667" transform="rotate(270,33.667,14.833) scale(1,1) translate(19.333,0.5)">
        <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
            width="28.667" height="28.667" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
            fill-opacity="1" stroke-opacity="1">
            <rect width="28.667" height="28.667" />
        </g>
    </g>
    <g width="28.667" height="28.667" transform="scale(1,1) translate(19.333,0.5)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0
L28.667,28.667" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="28.667" height="28.667" transform="scale(1,1) translate(19.333,0.5)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,28.667
L28.667,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,27.667L1,27.667L1,29.667L-1,29.667z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
</g>
    `;

    return svgData;
  }

  static Duct6Data() {
    const svgData =
      `
<g>
    <g width="17.833" height="0" transform="scale(1,1) translate(42.5,21.167)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L17.833,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M17.833,0L17.833,-7" stroke-width="0.5" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="30.833" height="31.5" transform="scale(1,1) translate(11.167,5.5)">
        <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=1##" stroke-dasharray="none"
            width="30.833" height="31.5" transform="scale(1,1) translate(0,0)" fill="##FillColor=#FFFFFF##"
            fill-opacity="1" stroke-opacity="1">
            <rect width="30.833" height="31.5" />
        </g>
    </g>
    <g width="30.833" height="31.5" transform="scale(1,1) translate(11.167,5.5)">
        <g transform="scale(1,1)
translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##" stroke-opacity="1">
            <path d="M0,31.5 L30.833,0" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,30.5L1,30.5L1,32.5L-1,32.5z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="30.833" height="31.5" transform="scale(1,1)
translate(11.167,5.5)">
        <g transform="scale(1,1) translate(0,0)" fill="##LineColor=#000000##" stroke="##LineColor=#000000##"
            stroke-opacity="1">
            <path d="M0,0 L30.833,31.5" fill="none" stroke-width="1" stroke-dasharray="none" />
            <g>
                <g stroke-dasharray="none">
                    <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                </g>
            </g>
        </g>
    </g>
    <g width="16.833" height="15.625" transform="scale(1,1) translate(0,0)">
        <g stroke="##LineColor=#000000##" opacity="1" stroke-width="##LineThick=0##" stroke-dasharray="none"
            width="16.833" height="15.625" transform="scale(1,1) translate(0,0)" fill="none" stroke-opacity="1">
            <rect width="16.833" height="15.625" />
        </g>
        <g width="16.833333333333332" height="15.624999046325684" transform="scale(1,1)
translate(0,0)"><text width="16.833333333333332" height="15.624999046325684" transform="scale(1,1)
translate(0,0)" xml:space="preserve">
                <tspan xml:space="preserve" text-rendering="optimizeSpeed" font-size="13.88888888888889"
                    font-weight="normal" font-style="normal" fill="#000000" opacity="1" x="0" text-anchor="start"
                    y="12.5" textLength="6.794277667999268" style="font-family: Arial, Helvetica Neue, Helvetica,
sans-serif;">F</tspan>
            </text></g>
    </g>
</g>
    `;

    return svgData;
  }

  static Duct7Data() {
    const svgData =
      `
    <g>
        <g>
            <g width="30" height="60" transform="rotate(0,0) scale(1,1) translate(0,0)">
                <g stroke="#000000" opacity="1" stroke-width="1" stroke-dasharray="none" width="30" height="60"
                    transform="scale(1,1) translate(0,0)" fill="#FFFFFF" fill-opacity="1" stroke-opacity="1">
                    <rect width="30" height="60" />
                </g>
            </g>
            <g width="30" height="60" transform="scale(1,1) translate(0,0)">
                <g transform="scale(1,1) translate(0,0)" fill="#000000" stroke="#000000" stroke-opacity="1">
                    <path d="M0,0 L30,60" fill="none" stroke-width="1" stroke-dasharray="none" />
                    <g>
                        <g stroke-dasharray="none">
                            <path d="M-1,-1L1,-1L1,1L-1,1z" stroke-width="0" fill="none" />
                        </g>
                    </g>
                </g>
            </g>
        </g>
    </g>
    `;

    return svgData;
  }

  static Duct8Data() {
    // <rect x="0" y="0" width="30" height="60" />

    const svgData =
    `
    <g width="30" height="60" transform="scale(1,1) translate(0,0)">
        <g transform="scale(1,1) translate(0,0)" fill="#FFFFFF" stroke="#000000" stroke-width="1" stroke-opacity="1">
            <path d="M 0,0 L30,0 L30,60 L0,60 L0,0" />
        </g>
    </g>
    `;

    return svgData;
  }

  static Duct9Data() {
    const svgData =
      `

    `;

    return svgData;
  }

  static Duct10Data() {
    const svgData =
      `

    `;

    return svgData;
  }

  static Duct11Data() {
    const svgData =
      `

    `;

    return svgData;
  }

  static Duct12Data() {
    const svgData =
      `

    `;

    return svgData;
  }
}

export default ToolDuctT1SvgData
