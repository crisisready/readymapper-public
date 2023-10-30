<template>
  <div class="tooltip" v-if="tooltipHTML" :style="{ transform: `translate(${pageX}px, ${pageY}px` }">
    <div v-html="tooltipHTML"></div>
  </div>
</template>

<script>
// import { mapState } from 'vuex'

export default {
  name: 'Tooltip',

  props: {
    tooltipHTML: String,
    zIndex: Number,
  },

  data() {
    return {
      pageX: 0,
      pageY: 0
    }
  },

  // computed: mapState({
  //   tooltipHTML: state => state.tooltipHTML
  // }),

  mounted: function() {
    document.addEventListener('mousemove', (e) => {
      this.setPosition(e.clientX, e.clientY)
    })
  },

  methods: {
    setPosition(pageX, pageY) {
      this.pageX = pageX
      this.pageY = pageY
    }
  }
}
</script>


<style lang="scss">
  .tooltip {
    position: absolute;
    top: 0px;
    left: 0px;
    margin-top: -50px;
    margin-left: 20px;
    user-select: none;
    pointer-events: none;
    background: #F9FCFE;
    padding: 10px 12px;
    width: 250px;
    z-index: 10;
    border-radius: 6px;
    box-shadow: 0px 0px 12px rgba(0, 0, 0, 0.15);
    text-align: left;
    box-sizing: border-box;
  }

  .tooltip-header {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .tooltip-body {
    font-size: 14px;
  }
</style>
