

/**
 * Represents a collection of arrow definitions used in rendering various arrow styles, typically for HVAC control system visualizations.
 *
 * This class encapsulates a list of arrow configurations in its "uiArrowDefs" property. Each configuration object contains
 * details such as:
 *  - id: A unique numeric identifier.
 *  - desc: A short descriptive label for the arrow style.
 *  - defArea: An object specifying the default width and height of the arrow's bounding area.
 *  - endPt: The endpoint of the arrow geometry.
 *  - attachPt: The point where the arrow attaches to a line or another graphical element.
 *  - centered: A boolean indicating if the arrow's geometry should be drawn centered.
 *  - geometry: An array (or object for certain shapes) that defines the actual drawing instructions (e.g., PATH, OVAL, RECT).
 *  - flippedGeometry (optional): Alternate geometry definitions for drawing the arrow flipped or mirrored.
 *
 * The constructor automatically calls the "InitArrowDefs" method to populate "uiArrowDefs" with a comprehensive array of arrow definitions.
 *
 * @example
 * // Create an instance of ArrowDefs
 * const arrowDefs = new ArrowDefs();
 *
 * // Retrieve and log the arrow definitions
 * console.log(arrowDefs.uiArrowDefs);
 *
 * // Example of using an arrow definition in a custom rendering method:
 * // renderArrow(arrowDefs.uiArrowDefs.find(def => def.id === 1));
 */
class ArrowDefs {

  public uiArrowDefs: any;

  constructor() {
    this.InitArrowDefs();
  }

  InitArrowDefs = () => {
    this.uiArrowDefs = [
      {
        id: 0,
        desc: 'No arrow',
        defArea: { width: 1, height: 1 },
        endPt: { x: 0, y: 0 },
        attachPt: { x: 0, y: 0 },
        centered: !1,
        geometry: []
      },
      {
        id: 1,
        desc: 'Filled arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 2,
        desc: 'Line arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10]
            ]
          }
        ]
      },
      {
        id: 3,
        desc: 'Fancy arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10],
              ['L', 5, 5],
              ['z']
            ]
          }
        ]
      },
      {
        id: 4,
        desc: 'Filled circle',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'OVAL',
            filled: !0,
            pathData: {
              x: 0,
              y: 0,
              width: 10,
              height: 10
            }
          }
        ]
      },
      {
        id: 5,
        desc: 'Unfilled circle',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'OVAL',
            filled: !1,
            stroke: 0.5,
            pathData: {
              x: 0,
              y: 0,
              width: 10,
              height: 10
            }
          }
        ]
      },
      {
        id: 6,
        desc: 'Filled square',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'RECT',
            filled: !0,
            pathData: {
              x: 0,
              y: 0,
              width: 10,
              height: 10
            }
          }
        ]
      },
      {
        id: 7,
        desc: 'Unfilled square',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'RECT',
            filled: !1,
            stroke: 0.5,
            pathData: {
              x: 0,
              y: 0,
              width: 10,
              height: 10
            }
          }
        ]
      },
      {
        id: 8,
        desc: 'Crows foot',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 5],
              ['L', 10, 0],
              ['M', 0, 5],
              ['L', 10, 5],
              ['M', 0, 5],
              ['L', 10, 10]
            ]
          }
        ]
      },
      {
        id: 9,
        desc: 'Back slash',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 10]
            ]
          }
        ]
      },
      {
        id: 10,
        desc: 'Filled crows foot',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 5],
              ['L', 10, 0],
              ['L', 10, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 11,
        desc: 'Filled diamond',
        defArea: { width: 20, height: 10 },
        endPt: { x: 20, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 5],
              ['L', 10, 0],
              ['L', 20, 5],
              ['L', 10, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 12,
        desc: 'Zero to many',
        defArea: { width: 20, height: 10 },
        endPt: { x: 20, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'OVAL',
            filled: !1,
            stroke: 0.5,
            pathData: {
              x: 0,
              y: 0,
              width: 10,
              height: 10
            }
          },
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 5],
              ['L', 20, 0],
              ['M', 10, 5],
              ['L', 20, 5],
              ['M', 10, 5],
              ['L', 20, 10]
            ]
          }
        ]
      },
      {
        id: 13,
        desc: 'One to many',
        defArea: { width: 20, height: 10 },
        endPt: { x: 20, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 5, 0],
              ['L', 5, 10]
            ]
          },
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 5],
              ['L', 20, 0],
              ['M', 10, 5],
              ['L', 20, 5],
              ['M', 10, 5],
              ['L', 20, 10]
            ]
          }
        ]
      },
      {
        id: 14,
        desc: 'Zero to one',
        defArea: { width: 20, height: 10 },
        endPt: { x: 20, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'OVAL',
            filled: !1,
            stroke: 0.5,
            pathData: {
              x: 0,
              y: 0,
              width: 10,
              height: 10
            }
          },
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 5],
              ['L', 20, 5],
              ['M', 15, 0],
              ['L', 15, 10]
            ]
          }
        ]
      },
      {
        id: 15,
        desc: 'One to one',
        defArea: { width: 20, height: 10 },
        endPt: { x: 20, y: 5 },
        attachPt: { x: 20, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 5, 0],
              ['L', 5, 10],
              ['M', 10, 0],
              ['L', 10, 10]
            ]
          }
        ]
      },
      {
        id: 16,
        desc: 'One to zero',
        defArea: { width: 20, height: 10 },
        endPt: { x: 15, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 5, 0],
              ['L', 5, 10]
            ]
          },
          {
            type: 'OVAL',
            filled: !1,
            stroke: 0.5,
            pathData: {
              x: 10,
              y: 0,
              width: 10,
              height: 10
            }
          }
        ]
      },
      {
        id: 17,
        desc: 'Center filled arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !0,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 18,
        desc: 'Center line arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !0,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10]
            ]
          }
        ]
      },
      {
        id: 19,
        desc: 'Center fancy arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !0,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10],
              ['L', 5, 5],
              ['z']
            ]
          }
        ]
      },
      {
        id: 20,
        desc: 'Double arrow',
        defArea: { width: 20, height: 10 },
        endPt: { x: 20, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10],
              ['z']
            ]
          },
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 10, 0],
              ['L', 20, 5],
              ['L', 10, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 21,
        desc: 'Filled dimension arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10],
              ['z']
            ]
          },
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 0],
              ['L', 10, 10]
            ]
          }
        ]
      },
      {
        id: 22,
        desc: 'Line dimension arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10]
            ]
          },
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 0],
              ['L', 10, 10]
            ]
          }
        ]
      },
      {
        id: 23,
        desc: 'Dimension line',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 0],
              ['L', 10, 10]
            ]
          }
        ]
      },
      {
        id: 25,
        desc: 'Arc down',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 1,
            pathData: [
              ['M', 5, 5],
              ['A', 5, 5, 0, 0, 1, 10, 10]
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 1,
            pathData: [
              ['M', 5, 5],
              ['A', 5, 5, 0, 0, 0, 10, 0]
            ]
          }
        ]
      },
      {
        id: 26,
        desc: 'Arc up',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 1,
            pathData: [
              ['M', 5, 5],
              ['A', 5, 5, 0, 0, 0, 10, 0]
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 1,
            pathData: [
              ['M', 5, 5],
              ['A', 5, 5, 0, 0, 1, 10, 10]
            ]
          }
        ]
      },
      {
        id: 27,
        desc: 'Half arrow up',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5]
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 10],
              ['L', 10, 5]
            ]
          }
        ]
      },
      {
        id: 28,
        desc: 'Half arrow down',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 10],
              ['L', 10, 5]
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5]
            ]
          }
        ]
      },
      {
        id: 29,
        desc: 'Center cross',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !0,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 10],
              ['M', 0, 10],
              ['L', 10, 0]
            ]
          }
        ]
      },
      {
        id: 30,
        desc: 'Half line up',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 0]
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 10]
            ]
          }
        ]
      },
      {
        id: 31,
        desc: 'Half line down',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 10]
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 0]
            ]
          }
        ]
      },
      {
        id: 32,
        desc: 'Slash',
        defArea: { width: 10, height: 10 },
        endPt: { x: 5, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 10],
              ['L', 10, 0]
            ]
          }
        ]
      },
      {
        id: 33,
        desc: 'Unfilled arrow',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 10, 5],
              ['L', 0, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 34,
        desc: 'Unfilled crows foot',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 5],
              ['L', 10, 0],
              ['L', 10, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 35,
        desc: 'Unfilled diamond',
        defArea: { width: 20, height: 10 },
        endPt: { x: 20, y: 5 },
        attachPt: { x: 0, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 5],
              ['L', 10, 0],
              ['L', 20, 5],
              ['L', 10, 10],
              ['z']
            ]
          }
        ]
      },
      {
        id: 36,
        desc: 'Single line cross',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !1,
            stroke: 0.5,
            pathData: [
              ['M', 0, 0],
              ['L', 0, 10]
            ]
          }
        ]
      },
      {
        id: 37,
        desc: 'down indicator',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 10],
              ['L', 5, 5],
              ['z']
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 0],
              ['L', 5, 5],
              ['z']
            ]
          }
        ]
      },
      {
        id: 38,
        desc: 'up indicator',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 10, y: 5 },
        centered: !1,
        geometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 0],
              ['L', 5, 5],
              ['z']
            ]
          }
        ],
        flippedGeometry: [
          {
            type: 'PATH',
            filled: !0,
            pathData: [
              ['M', 10, 5],
              ['L', 10, 10],
              ['L', 5, 5],
              ['z']
            ]
          }
        ]
      },
      {
        id: 39,
        desc: 'round end',
        defArea: { width: 10, height: 10 },
        endPt: { x: 10, y: 5 },
        attachPt: { x: 5, y: 5 },
        centered: !1,
        fixedSizeScale: 1,
        geometry: [
          {
            type: 'OVAL',
            filled: !0,
            pathData: {
              x: 0,
              y: 0,
              width: 10,
              height: 10
            }
          }
        ]
      }
    ]
  }
}

export default ArrowDefs
