<template>
  <div></div>
</template>

<script>
  import * as d3 from 'd3'
  import mapboxgl from 'mapbox-gl';

  import { mapState, mapGetters } from 'vuex'
  import { Vector } from 'vecti'
  import { settings } from '../../constants/settings'

  export default {

    name: 'MobilityFlowsCanvas',

    computed: {
      ...mapState([
        'map',
        'flowsDirection'
      ]),
      ...mapGetters([
        'selectedFBFlows',
      ])
    },

    methods: {
      maybeInitCanvasLayer() {
        // Already initted, or not actually ready to init this component yet
        if (this.svg || !this.map) return

         // Get Mapbox map canvas container
        var canvas = this.map.getCanvasContainer()

        // Overlay d3 on the map
        this.svg = d3.select(canvas).append("svg")
          .attr("class", "mapbox-d3-container")

        this.svg.append('g').attr('class', 'paths')
        this.svg.append('g').attr('class', 'starts')
        this.svg.append('g').attr('class', 'ends')
        this.svg.append('g').attr('class', 'click-paths')

        this.map.on("viewreset", () => this.render())
        this.map.on("move",      () => this.render())
        this.map.on("moveend",   () => this.render())
      },

      project(d) {
        return this.map.project(new mapboxgl.LngLat(+d[0], +d[1]))
      },

      getBezier(flowFeature) {
        let start = this.getStart(flowFeature)
        let end = this.getEnd(flowFeature)
        let middle = start.add(end.subtract(start).divide(2))
        let length = end.subtract(start).length()
        let perpendicular = end.subtract(start).rotateByDegrees(90).normalize()
        let control = middle.add(perpendicular.multiply(length / 4))

        let path = d3.path()
        path.moveTo(start.x, start.y)
        path.quadraticCurveTo(control.x, control.y, end.x, end.y)
        return path.toString()
      },

      getStart(flowFeature) {
        let projectedStart = this.project(flowFeature.start)
        return new Vector(projectedStart.x, projectedStart.y)
      },

      getEnd(flowFeature) {
        let projectedEnd = this.project(flowFeature.end)
        let projectedStart = this.project(flowFeature.start)
        let start = new Vector(projectedStart.x, projectedStart.y)
        let end = new Vector(projectedEnd.x, projectedEnd.y)

        // Back off from centroid a bit so you can see all the colors
        if (this.flowsDirection === 'to') {
          let backOffPx = 15
          end = end.add(start.subtract(end).normalize().multiply(backOffPx))
        }

        return end
      },

      render() {
        if (!this.svg) return null
        let paths = this.svg.select('g.paths').selectAll('path.curve').data(this.selectedFBFlows)
        let clickPaths = this.svg.select('g.click-paths').selectAll('path.mouse-target').data(this.selectedFBFlows)
        let starts = this.svg.select('g.starts').selectAll('circle.start').data(this.selectedFBFlows)
        let ends = this.svg.select('g.ends').selectAll('circle.end').data(this.selectedFBFlows)

        // line
        paths.join("path")
          .attr("class", "curve")
          .attr("stroke-width", 2)
          .attr("stroke", "black")
          .attr("fill", "none")
          .attr("d", (d) => this.getBezier(d))

        // mouse target
        clickPaths.join("path")
          .attr("class", "mouse-target")
          .attr("stroke-width", 16)
          .attr("stroke", "transparent")
          .attr("fill", "none")
          .attr("d", (d) => this.getBezier(d))
          .on("mousemove", (e, d) => {
            e.stopPropagation()
            this.$store.commit('setTooltipHTML', `
              <div>Percent Change: ${ d3.format(".2%")(d.feature.properties['percent_change'] / 100) }</div>
              <div>Baseline Pop.: ${ d.feature.properties['n_baseline'] ? d.feature.properties['n_baseline'] : '< 10' }</div>
              <div>Crisis Pop.: ${ d.feature.properties['n_crisis'] ? d.feature.properties['n_crisis'] : '< 10' }</div>
            `)
          }, { capture: true })
          .on("mouseleave", () => this.$store.commit('clearTooltipHTML'))

        // start point
        starts.join("circle")
          .attr("class", "start")
          .attr("fill", "black")
          .attr("r", 5)
          .attr("cx", (d) => this.getStart(d).x)
          .attr("cy", (d) => this.getStart(d).y)

        // end point
        ends.join("circle")
          .attr("class", "end")
          .attr("fill", (d) => settings.popDensityColorScale(d.feature.properties['percent_change']))
          .attr("stroke", "black")
          .attr("stroke-width", 2)
          .attr("r", 8)
          .attr("cx", (d) => this.getEnd(d).x)
          .attr("cy", (d) => this.getEnd(d).y)
      }
    },

    watch: {
      selectedFBFlows(selectedFBFlows) {
        this.render()
      },

      map() {
        // Unclear which will happen first, map ready or component mount
        this.maybeInitCanvasLayer()
      }
    },

    mounted: function() {
      // Unclear which will happen first, map ready or component mount
      this.maybeInitCanvasLayer()
    }

  }
</script>

<style lang="scss">
svg.mapbox-d3-container {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
}
</style>
