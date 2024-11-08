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
      new paper.paper.Path.Ellipse({
        point: event.point,
        size: [100, 50],
        fillColor: color
      });
    }
    else if (shape === 'circle') {
      new paper.paper.Path.Circle({
        center: event.point,
        radius: 50,
        fillColor: color
      });
    } else if (shape === 'rectangle') {
      new paper.paper.Path.Rectangle({
        point: event.point,
        size: [100, 50],
        fillColor: color
      });
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Interface

  var values = {
    fixLength: false,
    fixAngle: false,
    showCircle: false,
    showAngleLength: true,
    showCoordinates: false
  };

  ////////////////////////////////////////////////////////////////////////////////
  // Vector

  var vectorStart = new paper.Point(0, 0), vector = new paper.Point(0, 0), vectorPrevious = new paper.Point(0, 0);
  var vectorItem, items, dashedItems;

  function processVector(event, drag) {
    // vector = new paper.Point(event.point.x - vectorStart.x, event.point.y - vectorStart.y);
    vector = event.point.subtract(vectorStart);
    if (vectorPrevious) {
      if (values.fixLength && values.fixAngle) {
        vector = vectorPrevious;
      } else if (values.fixLength) {
        vector.length = vectorPrevious.length;
      } else if (values.fixAngle) {
        vector = vector.project(vectorPrevious);
      }
    }
    drawVector(drag);
  }

  function drawVector(drag) {
    if (items) {
      for (var i = 0, l = items.length; i < l; i++) {
        items[i].remove();
      }
    }
    if (vectorItem)
      vectorItem.remove();
    items = [];
    var arrowVector = vector.normalize(10);
    // var end = new paper.Point(vectorStart.x + vector.x, vectorStart.y + vector.y);
    var end = vectorStart.add(vector);
    vectorItem = new paper.Group(
      new paper.Path(vectorStart, end),
      new paper.Path(
        end.add(arrowVector.rotate(135)),
        end,
        end.add(arrowVector.rotate(-135))
      )
    );
    vectorItem.strokeWidth = 0.75;
    vectorItem.strokeColor = '#e4141b';
    // Display:
    dashedItems = [];
    // Draw Circle
    if (values.showCircle) {
      dashedItems.push(new paper.Path.Circle(vectorStart, vector.length));
    }
    // Draw Labels
    if (values.showAngleLength) {
      drawAngle(vectorStart, vector, !drag);
      if (!drag)
        drawLength(vectorStart, end, vector.angle < 0 ? -1 : 1, true);
    }
    var quadrant = vector.quadrant;
    if (values.showCoordinates && !drag) {
      drawLength(vectorStart, vectorStart + [vector.x, 0],
        [1, 3].indexOf(quadrant) != -1 ? -1 : 1, true, vector.x, 'x: ');
      drawLength(vectorStart, vectorStart + [0, vector.y],
        [1, 3].indexOf(quadrant) != -1 ? 1 : -1, true, vector.y, 'y: ');
    }
    for (var i = 0, l = dashedItems.length; i < l; i++) {
      var item = dashedItems[i];
      item.strokeColor = 'black';
      item.dashArray = [1, 2];
      items.push(item);
    }
    // Update palette
    values.x = vector.x;
    values.y = vector.y;
    values.length = vector.length;
    values.angle = vector.angle;
  }

  function drawAngle(center, vector, label) {
    var radius = 25, threshold = 10;
    if (vector.length < radius + threshold || Math.abs(vector.angle) < 15)
      return;
    var from = new paper.Point(radius, 0);
    var through = from.rotate(vector.angle / 2);
    var to = from.rotate(vector.angle);
    var end = center.add(to);
    dashedItems.push(new paper.Path.Line(center,
      center.add(new paper.Point(radius + threshold, 0))));
    dashedItems.push(new paper.Path.Arc(center.add(from), center.add(through), end));
    var arrowVector = to.normalize(7.5).rotate(vector.angle < 0 ? -90 : 90);
    dashedItems.push(new paper.Path([
      end.add(arrowVector.rotate(135)),
      end,
      end.add(arrowVector.rotate(-135))
    ]));
    if (label) {
      // Angle Label
      var text = new paper.PointText(center
        .add(through.normalize(radius + 10)).add(new paper.Point(0, 3)));
      text.content = Math.floor(vector.angle * 100) / 100 + '\xb0';
      items.push(text);
    }
  }

  function drawLength(from, to, sign, label, value, prefix) {
    var lengthSize = 5;
    if ((to.subtract(from)).length < lengthSize * 4)
      return;
    // var vector = new paper.Point(to.x - from.x, to.y - from.y);;
    var vector = to.subtract(from);
    var awayVector = vector.normalize(lengthSize).rotate(90 * sign);
    var upVector = vector.normalize(lengthSize).rotate(45 * sign);
    var downVector = upVector.rotate(-90 * sign);
    var lengthVector = vector.normalize(
      vector.length / 2 - lengthSize * Math.SQRT2);
    var line = new paper.Path();
    line.add(from.add(awayVector));
    line.lineBy(upVector);
    line.lineBy(lengthVector);
    line.lineBy(upVector);
    var middle = line.lastSegment.point;
    line.lineBy(downVector);
    line.lineBy(lengthVector);
    line.lineBy(downVector);
    dashedItems.push(line);
    if (label) {
      // Length Label
      var textAngle = Math.abs(vector.angle) > 90
        ? textAngle = 180 + vector.angle : vector.angle;
      // Label needs to move away by different amounts based on the
      // vector's quadrant:
      var away = (sign >= 0 ? [1, 4] : [2, 3]).indexOf(vector.quadrant) != -1
        ? 8 : 0;
      var text = new paper.PointText(middle.add(awayVector.normalize(away + lengthSize)));
      text.rotate(textAngle);
      text.justification = 'center';
      value = value || vector.length;
      text.content = (prefix || '') + Math.floor(value * 1000) / 1000;
      items.push(text);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Mouse Handling

  var dashItem;

  function onMouseDown(event) {
    // var end = new paper.Point(vectorStart.x + vector.x, vectorStart.y + vector.y);
    var end = vectorStart.add(vector);
    var create = false;
    if (event.modifiers.shift && vectorItem) {
      vectorStart = end;
      create = true;
    } else if (vector && (event.modifiers.option
      || end && end.getDistance(event.point) < 10)) {
      create = false;
    } else {
      vectorStart = event.point;
    }
    if (create) {
      dashItem = vectorItem;
      vectorItem = null;
    }
    processVector(event, true);
  }

  function onMouseDrag(event) {
    if (!event.modifiers.shift && values.fixLength && values.fixAngle)
      vectorStart = event.point;
    processVector(event, event.modifiers.shift);
  }

  function onMouseUp(event) {
    processVector(event, false);
    if (dashItem) {
      dashItem.dashArray = [1, 2];
      dashItem = null;
    }
    vectorPrevious = vector;
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
