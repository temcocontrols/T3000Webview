# Graphics

Building graphics: SVG scenes of equipment, floor plans and system diagrams drawn in T3000 with live
point values overlaid.

**Applies to:** shipped code — `src/` SVG renderer and websocket data binder.

**Not to be confused with** Design Studio, which designs the *controller's own* touchscreen UI and
uses a different document. That subsystem starts at
[../t3-eez-studio/README.md](../t3-eez-studio/README.md) and its format is
[../bacnet-api/screen-json.md](../bacnet-api/screen-json.md). The TSTAT LCD is a third, separate
format — see [../tstat-lcd/system-overview.md](../tstat-lcd/system-overview.md).

---

## 1. What a graphic is

A graphic is an SVG scene plus a list of elements, some of which are bound to a data point. The scene
carries its own coordinate space and is scaled by `viewBox`, so one graphic renders at any size.

| Element kind | Fields |
|---|---|
| `rect`, `circle`, `line` | `x`, `y`, `width`, `height`, `fill`, `stroke` |
| `text` | `x`, `y`, `text`, `fill` |
| `image` | `x`, `y`, `width`, `height`, `src` |

Any element may carry `dataBinding` — a point id. Bound elements are updated in place when a value
arrives; nothing is re-rendered.

```ts
interface GraphicElement {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  dataBinding?: string;   // point id
}
```

## 2. Render model

```ts
class GraphicsRenderer {
  private svg: SVGSVGElement;
  private elements = new Map<string, GraphicElement>();

  render(graphic: Graphic) {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${graphic.width} ${graphic.height}`);

    for (const element of graphic.elements) {
      const svgEl = this.createElement(element);
      this.svg.appendChild(svgEl);
      if (element.dataBinding) this.bindData(svgEl, element.dataBinding);
    }
    return this.svg;
  }

  updateValue(pointId: string, value: number) {
    for (const element of this.elements.values()) {
      if (element.dataBinding === pointId) this.updateElement(element, value);
    }
  }
}
```

The scene is built once. `updateValue` mutates only the elements bound to the changed point, so a
graphic with hundreds of static shapes costs the same per update as a graphic with one bound value.

## 3. Live data

Values arrive over the T3000 host websocket on port **9103** (`ws://<host>:9103/ws`). The binder
subscribes to the points a scene references and dispatches updates by point id.

```ts
class GraphicsDataBinder {
  private ws: WebSocket;
  constructor(private renderer: GraphicsRenderer) {
    this.ws = new WebSocket('ws://localhost:9103/ws');
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'point-update') this.renderer.updateValue(data.point, data.value);
    };
  }
  subscribeToPoints(pointIds: string[]) {
    this.ws.send(JSON.stringify({ type: 'subscribe', points: pointIds }));
  }
}
```

Bind only the points the scene actually shows: each subscription is a live value stream, and a
graphic that binds fifty points generates fifty times the traffic of one that binds one.

## 4. Creating a graphic

1. Open **Graphics** and choose **New Graphic**.
2. Set the scene size, then place shapes, text and images.
3. Bind the elements that should show live values.
4. Save; publish when the graphic should appear for other users.

## 5. Related

| Topic | Where |
|---|---|
| T3000 host websocket and REST ports | [../device-management/connecting-devices.md](../device-management/connecting-devices.md) |
| Controller touchscreen design (different format) | [../t3-eez-studio/README.md](../t3-eez-studio/README.md) |
| TSTAT LCD screens (different format) | [../tstat-lcd/system-overview.md](../tstat-lcd/system-overview.md) |
