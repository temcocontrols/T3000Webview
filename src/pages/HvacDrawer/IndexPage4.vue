<template>
  <div ref="drawingArea" class="drawing-area"></div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { SVG, Box, extend } from '@svgdotjs/svg.js';
// import Draggable from '@svgdotjs/svg.draggable.js';

import '@svgdotjs/svg.draggable.js';
import '@svgdotjs/svg.select.js';
import '@svgdotjs/svg.resize.js';

import Hammer from 'hammerjs';

export default {
  name: 'IndexPage4',
  setup() {
    const drawingArea = ref(null);


    function makeDraggable(element) {
      element.draggable().on('dragstart', () => {
        // selectElement(element);
      });

      element.resize();
    }

    let selectedElement = null;
    let initialRotation = 0;

    onMounted(() => {

      // var e,
      //   constrainingShape,
      //   ghostShape,
      //   draw = SVG()
      //     .addTo(drawingArea.value)
      //     .size('100%', '400')
      //     .attr({ 'font-size': 10 })
      //     .fill('#f06')

      // /* plain draggable */
      // draw
      //   .rect(100, 100)
      //   .center(150, 150)
      //   .draggable()

      // draw.plain('just plain draggable').center(150, 210)

      // /* grouped draggable */
      // var g = draw.group().draggable()
      // g.rect(100, 100).center(400, 150)
      // g.plain('grouped draggable').center(400, 210)

      // /* constrained with object */
      // var constrainedWithObject = draw
      //   .rect(100, 100)
      //   .center(650, 150)
      //   .draggable()
      //   .on('dragstart', function () {
      //     ghostShape = draw.put(constrainedWithObject.clone().opacity(0.2))

      //     constrainingShape = draw
      //       .rect(400, 350)
      //       .move(400, 50)
      //       .fill('none')
      //       .stroke('#0fa')
      //   })
      //   .on('dragmove', e => {
      //     e.preventDefault()

      //     const { handler, box } = e.detail
      //     let { x, y } = box

      //     const constraints = constrainingShape.bbox()

      //     if (x < constraints.x) {
      //       x = constraints.x
      //     }

      //     if (y < constraints.y) {
      //       y = constraints.y
      //     }

      //     if (box.x2 > constraints.x2) {
      //       x = constraints.x2 - box.w
      //     }

      //     if (box.y2 > constraints.y2) {
      //       y = constraints.y2 - box.h
      //     }

      //     handler.move(x, y)
      //     ghostShape.animate(300, '>').move(x, y)
      //   })
      //   .on('dragend', function () {
      //     constrainingShape.remove()
      //     ghostShape.remove()
      //   })
      // draw.plain('constrained with object and ghost').center(650, 210)

      // /* constraind with function */
      // // Some constraints (x, y, width, height)
      // const constraints = new Box(750, 0, 300, 300)

      // draw
      //   .rect(100, 100)
      //   .center(900, 150)
      //   .draggable()
      //   .on('dragmove', e => {
      //     const { handler, box } = e.detail
      //     e.preventDefault()

      //     let { x, y } = box

      //     // In case your dragged element is a nested element,
      //     // you are better off using the rbox() instead of bbox()

      //     if (x < constraints.x) {
      //       x = constraints.x
      //     }

      //     if (y < constraints.y) {
      //       y = constraints.y
      //     }

      //     if (box.x2 > constraints.x2) {
      //       x = constraints.x2 - box.w
      //     }

      //     if (box.y2 > constraints.y2) {
      //       y = constraints.y2 - box.h
      //     }

      //     handler.move(x, y)
      //   })

      // draw.plain('constraint with function').center(900, 210)

      // /* group with multiple levels of draggables (dragging a part doesn't drag the group) */
      // var g2 = draw.group().draggable()
      // for (var i = 0; i < 4; i++) {
      //   var cx = i & 1 ? -25 : 25
      //   var cy = i & 2 ? -25 : 25
      //   g2.rect(50, 50)
      //     .center(cx, cy)
      //     .draggable()
      // }
      // g2.plain('grouped with multiple levels of draggable').center(0, 70)
      // g2.move(1150, 150)



      const canvas = new SVG().size(1000, 700).addTo(drawingArea.value)
      canvas
        .rect(100, 100)
        .move(100, 100)
        .fill('red')
        .select({ createHandle: (el) => el.polyline().css({ stroke: '#666' }) })
      canvas
        // star shape
        .polygon([
          [100, 100],
          [200, 100],
          [200, 200],
          [300, 200],
          [200, 300],
          [200, 400],
          [100, 400],
          [100, 300],
          [0, 300],
          [0, 200],
          [100, 200],
        ])
        .move(250, 250)
        .fill('blue')
        .pointSelect()
        .select()


      /*

      const draw1 = SVG().addTo(drawingArea.value).size('100%', '100%');
      const rect = draw1.rect(100, 100).attr({ fill: '#f06' }).move(50, 50);
      const circle = draw1.circle(100).attr({ fill: 'blue' }).move(200, 200);

      makeDraggable(rect);
      makeDraggable(circle);

      // const hammer = new Hammer(drawingArea.value);
      // hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
      // hammer.get('rotate').set({ enable: true });

      // hammer.on('tap', (ev) => {
      //   console.log('tap', ev);
      //   if (ev.target.instance === rect) {
      //     selectElement(rect);
      //   } else if (ev.target.instance === circle) {
      //     selectElement(circle);
      //   } else {
      //     deselectElement();
      //   }
      // });

      // hammer.on('panmove', (ev) => {
      //   if (selectedElement) {
      //     selectedElement.move(ev.center.x - 50, ev.center.y - 50);
      //   }
      // });

      // hammer.on('rotatemove', (ev) => {
      //   if (selectedElement) {
      //     selectedElement.rotate(initialRotation + ev.rotation);
      //   }
      // });

      // hammer.on('rotateend', (ev) => {
      //   if (selectedElement) {
      //     initialRotation += ev.rotation;
      //   }
      // });

      let startX = 0;
      let startY = 0;
      let tempRect = null;

      drawingArea.value.addEventListener('mousedown', (event) => {
        return;
        startX = event.offsetX;
        startY = event.offsetY;
        // tempRect = draw.rect(1, 1).attr({ fill: 'none', stroke: 'red', 'stroke-dasharray': '5,5' }).move(startX, startY);

        const elements = draw.children();
        let insideElement = false;
        elements.forEach((element) => {
          const bbox = element.bbox();
          if (
            event.offsetX >= bbox.x &&
            event.offsetX <= bbox.x2 &&
            event.offsetY >= bbox.y &&
            event.offsetY <= bbox.y2
          ) {
            insideElement = true;
          }
        });

        if (!insideElement) {
          tempRect = draw.rect(1, 1).attr({ fill: 'none', stroke: 'red', 'stroke-dasharray': '5,5' }).move(startX, startY);
        }
      });

      drawingArea.value.addEventListener('mousemove', (event) => {
        if (tempRect) {
          const width = event.offsetX - startX;
          const height = event.offsetY - startY;
          tempRect.size(width, height);
        }
      });

      drawingArea.value.addEventListener('mouseup', () => {
        if (tempRect) {
          tempRect.attr({ 'stroke-dasharray': 'none' });
          tempRect.remove();
        }
      });

      function selectElementsInArea(x, y, width, height) {
        const elements = draw.children();
        elements.forEach((element) => {
          const bbox = element.bbox();
          if (
            bbox.x >= x &&
            bbox.y >= y &&
            bbox.x2 <= x + width &&
            bbox.y2 <= y + height
          ) {
            selectElement(element);
          }
        });
      }

      drawingArea.value.addEventListener('mouseup', (event) => {
        if (tempRect) {
          const width = event.offsetX - startX;
          const height = event.offsetY - startY;
          selectElementsInArea(startX, startY, width, height);
          tempRect.remove();
          tempRect = null;
        }
      });


      function deselectElement() {
        if (selectedElement) {
          selectedElement.stroke({ color: 'none' });
          selectedElement = null;
        }
      }

      function addRotationHandle(element) {
        const bbox = element.bbox();
        console.log('bbox', bbox);
        const handle = draw.circle(10).attr({ fill: 'gray' }).move(bbox.cx - 5, bbox.y - 20);

        handle.on('mousedown', (event) => {
          event.stopPropagation();
          const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - bbox.cx;
            const dy = moveEvent.clientY - bbox.cy;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            element.rotate(angle, bbox.cx, bbox.cy);
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });

        element.on('beforedrag', () => {
          handle.remove();
        });

        element.on('dragend', () => {
          addRotationHandle(element);
        });
      }

      function selectElement(element) {
        console.log('selectElement', element);
        deselectElement();
        selectedElement = element;
        selectedElement.stroke({ color: '#000', width: 2 });
        // addRotationHandle(selectedElement);
      }



      let tempPath = null;
      let tempBox = null;

      drawingArea.value.addEventListener('mousedown', (event) => {
        return;
        startX = event.offsetX;
        startY = event.offsetY;
        tempPath = draw.path(`M${startX},${startY}`).attr({ fill: 'none', stroke: 'black', 'stroke-width': 19.5 });
        // tempBox = draw.rect(10, 10).attr({ fill: 'none', stroke: 'blue', 'stroke-dasharray': '5,5' }).move(startX - 5, startY - 5);

        tempBox = draw.circle(20).attr({ fill: 'none', stroke: 'blue', 'stroke-dasharray': '5,5' }).move(startX - 10, startY - 10);
      });

      drawingArea.value.addEventListener('mousemove', (event) => {
        if (tempPath) {
          const x = event.offsetX;
          const y = event.offsetY;
          tempPath.plot(`M${startX},${startY} L${x},${y}`);
          tempBox.move(x - 5, y - 5);
        }
      });

      // drawingArea.value.addEventListener('mouseup', () => {
      //   if (tempPath) {
      //     tempPath = null;
      //   }
      //   if (tempBox) {
      //     tempBox.remove();
      //     tempBox = null;
      //   }
      // });


      let tempPathList = [];

      drawingArea.value.addEventListener('mouseup', () => {
        if (tempPath) {
          tempPathList.push(tempPath);
          tempPath = null;
        }
        if (tempBox) {
          tempBox.remove();
          tempBox = null;
        }

        if (tempPathList.length === 2) {
          const path1 = tempPathList[0];
          const path2 = tempPathList[1];
          const intersection = path1.intersect(path2);
          intersection.fill('red');
        }


        // if (tempPathList.length > 1) {
        //   let combinedPath = tempPathList[0].attr('d');
        //   for (let i = 1; i < tempPathList.length; i++) {
        //     const pathData = tempPathList[i].attr('d').replace('M', 'L');
        //     combinedPath += pathData;
        //   }
        //   const finalPath = draw.path(combinedPath).attr({ fill: 'none', stroke: 'black', 'stroke-width': 19.5 });
        //   tempPathList.forEach(path => path.remove());
        //   tempPathList = [];
        // }

        if (tempPathList.length > 1) {
          let combinedPath = tempPathList[0].attr('d');
          for (let i = 1; i < tempPathList.length; i++) {
            const pathData = tempPathList[i].attr('d');
            const lastPoint = combinedPath.match(/L([^L]+)$/)[1];
            const newPathData = pathData.replace(/M[^L]+/, `L${lastPoint}`);
            combinedPath += newPathData;
          }
          const finalPath = draw.path(combinedPath).attr({ fill: 'none', stroke: 'black', 'stroke-width': 1.5 });
          tempPathList.forEach(path => path.remove());
          tempPathList = [];
        }


        tempPathList.forEach((path) => {
          path.draggable().on('dragmove', (event) => {
            const dx = event.detail.p.x - path.bbox().x;
            const dy = event.detail.p.y - path.bbox().y;
            const newPathData = path.attr('d').replace(/M[^L]+/, `M${event.detail.p.x},${event.detail.p.y}`);
            path.plot(newPathData);
          });
        });

      });

      */

    });

    return {
      drawingArea,
    };
  },
};
</script>

<style>
.drawing-area {
  width: 100%;
  height: 100vh;
  border: 1px solid #ccc;
}
</style>
