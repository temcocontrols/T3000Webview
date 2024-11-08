<template>
  <div id="app">
    <canvas id="myCanvas" resize></canvas>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import paper from 'paper';

onMounted(() => {
  // Setup Paper.js
  paper.setup('myCanvas');

  function drawShape(event, shape, color) {
    // Clear the canvas
    // paper.project.activeLayer.removeChildren();

    if (shape === 'ellipse') {
      new paper.Path.Ellipse({
        point: event.point,
        size: [100, 50],
        fillColor: color
      });
    }
    else if (shape === 'circle') {
      new paper.Path.Circle({
        center: event.point,
        radius: 50,
        fillColor: color
      });
    } else if (shape === 'rectangle') {
      new paper.Path.Rectangle({
        point: event.point,
        size: [100, 50],
        fillColor: color
      });
    }
  }

  const values = {
    fixLength: false,
    fixAngle: false,
    showCircle: false,
    showAngleLength: true,
    showCoordinates: false
  };

  // Vector
  const vectorStart = ref({});
  const vector = ref({});
  const vectorPrevious = ref({});
  const vectorItem = ref({});
  const items = ref([]);
  const dashedItems = ref([]);

  function processVector(event, drag) {
    vector.value = event.point - vectorStart.value;
    console.log('event.point', event.point);
    console.log('vectorStart.value', vectorStart.value);

    var pt = { x: event.point.x - vectorStart.value.x, y: event.point.y - vectorStart.value.y };
    // vector.value = pt;

    console.log('vector.value', vector.value);

    if (vectorPrevious.value) {
      if (values.fixLength && values.fixAngle) {
        vector.value = vectorPrevious;
      } else if (values.fixLength) {
        vector.value.length = vectorPrevious.value.length;
      } else if (values.fixAngle) {
        vector.value = vector.value.project(vectorPrevious);
      }
    }
    drawVector(drag);
  }

  function drawVector(drag) {
    if (items.value) {
      for (var i = 0, l = items.value.length; i < l; i++) {
        items[i].remove();
      }
    }
    if (vectorItem.value) {
      // vectorItem.value.remove();
    }
    items.value = [];
    var arrowVector = vector;//vector.value.normalize(10);
    var end = vectorStart.value + vector.value;
    vectorItem.value = new paper.Group(
      new paper.Path(vectorStart, end),
      new paper.Path(
        end,//+ arrowVector.value.rotate(135),
        end,
        end //+ arrowVector.value.rotate(-135)
      )
    );
    vectorItem.value.strokeWidth = 0.75;
    vectorItem.value.strokeColor = '#e4141b';
    // Display:
    dashedItems.value = [];
    // Draw Circle
    if (values.showCircle) {
      dashedItems.value.push(new Path.Circle(vectorStart, vector.value.length));
    }
    // Draw Labels
    if (values.showAngleLength) {
      drawAngle(vectorStart, vector, !drag);
      if (!drag)
        drawLength(vectorStart, end, vector.value.angle < 0 ? -1 : 1, true);
    }
    var quadrant = vector.value.quadrant;
    if (values.showCoordinates && !drag) {
      drawLength(vectorStart, vectorStart.value + [vector.value.x, 0],
        [1, 3].indexOf(quadrant) != -1 ? -1 : 1, true, vector.value.x, 'x: ');
      drawLength(vectorStart, vectorStart.value + [0, vector.value.y],
        [1, 3].indexOf(quadrant) != -1 ? 1 : -1, true, vector.value.y, 'y: ');
    }
    for (var i = 0, l = dashedItems.value.length; i < l; i++) {
      var item = dashedItems[i];
      item.strokeColor = 'black';
      item.dashArray = [1, 2];
      items.value.push(item);
    }
    // Update palette
    values.x = vector.value.x;
    values.y = vector.value.y;
    values.length = vector.value.length;
    values.angle = vector.value.angle;
  }

  function drawAngle(center, vector, label) {
    var radius = 25, threshold = 10;
    if (vector.length < radius + threshold || Math.abs(vector.angle) < 15)
      return;
    var from = new paper.Point(radius, 0);
    var through = from.rotate(vector.angle / 2);
    var to = from.rotate(vector.angle);
    var end = center + to;
    dashedItems.value.push(new paper.Path.Line(center,
      center + new paper.Point(radius + threshold, 0)));
    dashedItems.value.push(new paper.Path.Arc(center + from, center + through, end));
    var arrowVector = to.normalize(7.5).rotate(vector.angle < 0 ? -90 : 90);
    dashedItems.value.push(new paper.Path([
      end + arrowVector.rotate(135),
      end,
      end + arrowVector.rotate(-135)
    ]));
    if (label) {
      // Angle Label
      var text = new paper.PointText(center
        + through.normalize(radius + 10) + new paper.Point(0, 3));
      text.content = Math.floor(vector.angle * 100) / 100 + '\xb0';
      items.value.push(text);
    }
  }

  function drawLength(from, to, sign, label, value, prefix) {
    var lengthSize = 5;
    if ((to - from).length < lengthSize * 4)
      return;
    var vector = to - from;
    var awayVector = vector.normalize(lengthSize).rotate(90 * sign);
    var upVector = vector.normalize(lengthSize).rotate(45 * sign);
    var downVector = upVector.rotate(-90 * sign);
    var lengthVector = vector.normalize(
      vector.length / 2 - lengthSize * Math.SQRT2);
    var line = new Path();
    line.add(from + awayVector);
    line.lineBy(upVector);
    line.lineBy(lengthVector);
    line.lineBy(upVector);
    var middle = line.lastSegment.point;
    line.lineBy(downVector);
    line.lineBy(lengthVector);
    line.lineBy(downVector);
    dashedItems.value.push(line);
    if (label) {
      // Length Label
      var textAngle = Math.abs(vector.angle) > 90
        ? textAngle = 180 + vector.angle : vector.angle;
      // Label needs to move away by different amounts based on the
      // vector's quadrant:
      var away = (sign >= 0 ? [1, 4] : [2, 3]).indexOf(vector.quadrant) != -1
        ? 8 : 0;
      var text = new PointText(middle + awayVector.normalize(away + lengthSize));
      text.rotate(textAngle);
      text.justification = 'center';
      value = value || vector.length;
      text.content = (prefix || '') + Math.floor(value * 1000) / 1000;
      items.value.push(text);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Mouse Handling

  const dashItem = ref(null);

  function onMouseDown(event) {
    var end = vectorStart.value + vector.value;
    var create = false;
    if (event.modifiers.shift && vectorItem) {
      vectorStart.value = end;
      create = true;
    } else if (vector.value && (event.modifiers.option
      || end /*&& end.getDistance(event.point) < 10*/)) {
      create = false;
    } else {
      vectorStart.value = event.point;
    }
    if (create) {
      dashItem.value = vectorItem;
      vectorItem.value = null;
    }
    processVector(event, true);
  }

  function onMouseDrag(event) {
    if (!event.modifiers.shift && values.fixLength && values.fixAngle)
      vectorStart.value = event.point;
    processVector(event, event.modifiers.shift);
  }

  function onMouseUp(event) {
    processVector(event, false);
    if (dashItem.value) {
      dashItem.value.dashArray = [1, 2];
      dashItem.value = null;
    }
    vectorPrevious.value = vector;
  }

  // Create a tool
  const tool = new paper.Tool();

  // Define the mouse move event handler
  tool.onMouseMove = function (event) {
    // Clear the canvas
    // drawShape(event, 'circle', 'red');
  };
  // Define the mouse down event handler to draw a rectangle
  tool.onMouseDown = function (event) {
    // Clear the canvas
    // drawShape(event, 'rectangle', 'blue');

    console.log('onMouseDown', event.point);
    onMouseDown(event);
  };

  // Define the mouse drag event handler to draw an ellipse
  tool.onMouseDrag = function (event) {
    // Clear the canvas
    // drawShape(event, 'ellipse', 'green');
    onMouseDrag(event);
  };

  // Define the mouse click event handler to draw a circle
  tool.onMouseUp = function (event) {
    // drawShape(event, 'circle', '#f78');

    onMouseUp(event);
  };
});
</script>

<style>
#myCanvas {
  width: 100vw;
  height: 100vh;
  display: block;
}
</style>
