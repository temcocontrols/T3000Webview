

<template>
    <div class="number-element">
        {{ value }}
    </div>
</template>
  
<script>
import { defineComponent } from 'vue'

export default defineComponent({
    name: 'NumberEl',
    props: {
        bgColor: {
            type: String,
            default: "black"
        },
        value: {
            type: String,
            default: ""
        },

    },
    setup() {

        return {
        }
    }
})
</script>
  
<style scoped>
.number-element {
    background-color: v-bind("bgColor");
    ;
}
</style>
  