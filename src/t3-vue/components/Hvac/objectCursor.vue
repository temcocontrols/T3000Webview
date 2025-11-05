<!--
  Component: ObjectCursor
  Description: A component that displays the selected HVAC object thumbnail and moves it based on mouse movements.
  Props:
    - imageSrc: The source URL of the image to be displayed.
  Events:
    - moveImage: Moves the image based on mouse movements.
-->
<template>
  <div class="container" @mousemove="moveImage">
    <img :src="imageSrc" :style="{ left: x + 'px', top: y + 'px' }" />
  </div>
</template>

<script>
import { ref } from "vue";

export default {
  setup() {
    const x = ref(0);
    const y = ref(0);
    const imageSrc = "https://via.placeholder.com/150";

    function moveImage(event) {
      x.value = event.clientX;
      y.value = event.clientY;
    }

    return {
      x,
      y,
      imageSrc,
      moveImage,
    };
  },
};
</script>

<style scoped>
.container {
  position: relative;
}
img {
  position: absolute;
}
</style>
