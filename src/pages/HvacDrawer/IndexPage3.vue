<template>
  <div class="container">
    <div class="top-bar">Fixed Top Bar</div>
    <div class="content">
      <div class="left-sidebar" v-show="showSidebar">Left Sidebar</div>
      <div class="right-content">
        <svg class="ruler horizontal-ruler"></svg>
        <svg class="ruler vertical-ruler"></svg>
        <div class="viewport" ref="viewport">
          <svg class="background-grid"></svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import panzoom from 'panzoom';

export default {
  data() {
    return {
      showSidebar: true,
    };
  },
  mounted() {
    const viewport = this.$refs.viewport;
    const panZoomInstance = panzoom(viewport, {
      smoothScroll: false,
    });

    panZoomInstance.on('zoom', (e) => {
      this.updateRulers();
    });

    panZoomInstance.on('pan', (e) => {
      this.updateRulers();
    });

    // Ensure panzoom always sticks to coordinates (0, 0)
    panZoomInstance.moveTo(300, 100);
    panZoomInstance.zoomAbs(300, 100, 1);

    panZoomInstance.on('panstart', (e) => {
      e.preventDefault();
    });
  },
  methods: {
    updateRulers() {
      const viewport = this.$refs.viewport;
      const { scale } = panzoom(viewport).getTransform();

      // Update horizontal ruler
      const horizontalRuler = d3.select('.horizontal-ruler');
      horizontalRuler.selectAll('*').remove();
      const width = viewport.clientWidth;
      const numTicks = Math.ceil(width / (50 * scale));
      for (let i = 0; i <= numTicks; i++) {
        horizontalRuler.append('line')
          .attr('x1', i * 50 * scale)
          .attr('y1', 0)
          .attr('x2', i * 50 * scale)
          .attr('y2', 20)
          .attr('stroke', 'black');
        horizontalRuler.append('text')
          .attr('x', i * 50 * scale + 2)
          .attr('y', 15)
          .attr('font-size', '10px')
          .text(i * 50);
      }

      // Update vertical ruler
      const verticalRuler = d3.select('.vertical-ruler');
      verticalRuler.selectAll('*').remove();
      const height = viewport.clientHeight;
      const numTicksVertical = Math.ceil(height / (50 * scale));
      for (let i = 0; i <= numTicksVertical; i++) {
        verticalRuler.append('line')
          .attr('x1', 0)
          .attr('y1', i * 50 * scale)
          .attr('x2', 20)
          .attr('y2', i * 50 * scale)
          .attr('stroke', 'black');
        verticalRuler.append('text')
          .attr('x', 2)
          .attr('y', i * 50 * scale + 10)
          .attr('font-size', '10px')
          .text(i * 50);
      }
    },
  }
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: antiquewhite;
}

.top-bar {
  flex: 0 0 50px;
  background-color: #ccc;
  background-color: black;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
  background-color: aquamarine;
}

.left-sidebar {
  flex: 0 0 200px;
  background-color: #eee;
  background-color: blueviolet;
}

.right-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: red;
}

.ruler {
  position: absolute;
  background-color: #ddd;
  background-color: cadetblue;
}

.horizontal-ruler {
  top: 0;
  left: 200px;
  right: 0;
  height: 20px;
  width: 1300px;
  background-color: chocolate;
}

.vertical-ruler {
  top: 50px;
  bottom: 0;
  left: 200px;
  width: 20px;
  height: 2300px;
  background-color: darkgrey;
}

.viewport {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 0;
  bottom: 0;
  overflow: auto;
  background-color: gray;
}

.background-grid {
  width: 100%;
  height: 100%;
  background-image: radial-gradient(circle, #ccc 1px, transparent 1px);
  background-size: 20px 20px;
  background-color: mediumvioletred;
}
</style>
