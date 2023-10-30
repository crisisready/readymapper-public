<template>
  <div></div>
</template>

<script>
  import * as d3 from 'd3'
  import mapboxgl from 'mapbox-gl';
  import dayjs from 'dayjs'

  import { mapState, mapGetters, mapMutations } from 'vuex'
  import { settings } from '../../constants/settings'
  import * as turf from '@turf/turf'

  export default {

    name: 'HurricaneForecastCanvas',

    computed: {
      ...mapState([
        'map',
        'selectedDateTime',
        'forecastHurricaneTracks',
        'historicHurricanePositions',
        'hurricaneWindProbability',
        'hurricaneWindRadii',
        'hurricaneFloodWarnings',
        'hurricaneCones'
      ]),
      ...mapGetters([
      ]),

      selectedHurricaneTracks() {
        if (!this.historicHurricanePositions) return null

        let currentFeatureIndex = d3.bisector(f => f.properties.advisoryDate).right(
          this.historicHurricanePositions.features, this.selectedDateTime
        ) - 1
        let currentFeature = this.historicHurricanePositions.features[currentFeatureIndex]
        if (!currentFeature) return { currentFeature: null, historicFeatures: [], forecastFeatures: [] }

        let currentAdvisoryDate = currentFeature.properties.advisoryDate
        let historicFeatures = this.historicHurricanePositions.features
          .filter(f => f.properties.advisoryDate.getTime() < currentAdvisoryDate.getTime())

        let currentAdvisoryNum = currentFeature.properties['ADVISNUM']
        let forecastFeatures = this.forecastHurricaneTracks.features
          .filter(f => f.properties['ADVISNUM'] === currentAdvisoryNum)

        this.setCurrentHurricanePosition(currentFeature)

        return { currentFeature, historicFeatures, forecastFeatures }
      },

      selectedWindProbabilityPolygons() {
        if (!this.hurricaneWindProbability) return null
        let currentLayerIndex = d3.bisector(f => f.date)
          .right(this.hurricaneWindProbability.features, this.selectedDateTime) - 1
        let currentDisasterFeature = this.hurricaneWindProbability.features[currentLayerIndex]
        let currentDisasterFeatures = this.hurricaneWindProbability.features
          .filter(f => f.properties.dt === currentDisasterFeature?.properties?.dt)
        return currentDisasterFeatures
      },

      selectedWindRadii() {
        if (!this.hurricaneWindRadii) return null
        let { currentFeature } = this.selectedHurricaneTracks
        let currentAdvisoryNum = currentFeature?.properties['ADVISNUM']
        return this.hurricaneWindRadii?.features?.filter(f => f?.properties['ADVNUM'] === currentAdvisoryNum)
      },

      selectedFloodWarnings() {
        if (!this.hurricaneFloodWarnings) {
        console.log('No flood warnings data available');
        return null;
      }

      // Assuming ADVISNUM is the property you want to use for selection
      let currentFeatureIndex = this.hurricaneFloodWarnings.features.findIndex(f => f.properties['ADVNUM'] === this.selectedAdvisoryNum);
  
      let currentFeature = this.hurricaneFloodWarnings.features[currentFeatureIndex]
      if (!currentFeature) {
        console.log('Current feature not found');
        return null;
      }

      console.log('Current feature:', currentFeature);

      // Assuming setCurrentFloodWarning is similar to setCurrentHurricanePosition
      this.setCurrentFloodWarning(currentFeature)

      console.log('Flood warning set:', currentFeature);

      return currentFeature;
    },



      selectedCone() {
        if (!this.hurricaneCones) return null
        let { currentFeature } = this.selectedHurricaneTracks
        let currentAdvisoryNum = currentFeature?.properties['ADVISNUM']
        return this.hurricaneCones?.features?.find(f => f?.properties['ADVISNUM'] === currentAdvisoryNum)
      }
    },

    methods: {
      ...mapMutations([
        'setCurrentHurricanePosition',
        'setCurrentFloodWarning',
        'setTooltipHTMLHurricane',
        'clearTooltipHTMLHurricane',
      ]),
      maybeInitCanvasLayer() {
        // Already initted, or not actually ready to init this component yet
        if (this.svg || !this.map) return

         // Get Mapbox map canvas container
        var canvas = this.map.getCanvasContainer()

        // Overlay d3 on the map
        this.svg = d3.select(canvas).append("svg")
          .attr("id", "hurricane-forecast-canvas")
          .attr("class", "mapbox-d3-container")

        this.defs = this.svg.append("defs")

        // Layer ordering determined here
        this.currentCone = this.svg.append('g').attr('class', 'cone')
        this.currentFloodWarnings = this.svg.append('g').attr('class', 'flood-warnings')
        this.currentWindRadii = this.svg.append('g').attr('class', 'current-wind-radii')
        this.historicLine = this.svg.append('path').attr('class', 'historic-line')
        this.windSpeedPolygons = this.svg.append('g').attr('class', 'wind-speed-polygons')
        this.windSpeedLabels = this.svg.append('g').attr('class', 'wind-speed-labels')
        this.historicPositions = this.svg.append('g').attr('class', 'historic-positions')
        this.currentPosition = this.svg.append('g').attr('class', 'current-position')
        this.forecastPositions = this.svg.append('g').attr('class', 'forecast-positions')
        this.categoryLabels = this.svg.append('g').attr('class', 'category-labels')
        this.hoverTargets = this.svg.append('g').attr('class', 'hover-targets')

        // Setup zoom cutoffs here
        this.hurricaneIconMaxZoom = 9
        this.hurricanePathMaxZoom = 9
        this.coneMaxZoom = 7
        this.windSpeedTransitionZoom = 9

        // Load svg icons and patterns
        this.createSVGDef('hurricane-icon', 'img/hurricane-icon.svg')
        this.createSVGDef('tropical-storm-icon', 'img/tropical-storm-icon.svg')
        this.createSVGDef('circle-icon', 'img/circle-icon.svg')
        this.createSVGPattern('storm-surge-fill', 'img/storm-surge.svg')

        this.map.on("viewreset", () => this.render())
        this.map.on("move",      () => this.render())
        this.map.on("moveend",   () => this.render())
      },

      async createSVGPattern(id, url) {
        fetch(url).then(res => res.text()).then(svgString => {
          const parser = new DOMParser()
          let newElement = parser.parseFromString(svgString, "image/svg+xml").firstChild
          let width = newElement.getAttribute('width')
          let height = newElement.getAttribute('height')

          let newDef = this.defs.append("pattern")
            .attr("id", id)
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", width)
            .attr("height", height)

          // Append all the children of the fetched svg. We don't want the svg itself.
          for (let child of newElement.children) {
            newDef.node().appendChild(child)
          }
        })
      },

      async createSVGDef(id, url) {
        fetch(url).then(res => res.text()).then(svgString => {
          const parser = new DOMParser()
          let newElement = parser.parseFromString(svgString, "image/svg+xml").firstChild
          let width = newElement.getAttribute('width')
          let height = newElement.getAttribute('height')

          let newDef = this.defs.append("g").attr("id", id)
            .append("g").attr("transform", `translate(-${parseFloat(width) / 2}, -${parseFloat(height) / 2})`)

          // Append all the children of the fetched svg. We don't want the svg itself.
          for (let child of newElement.children) {
            // This is a bit of a hack. The problem is that you
            // can't override svg styles when using <use></use>,
            // so we remove the styles ahead of time here.
            child.removeAttribute('fill')
            child.removeAttribute('fill-opacity')
            newDef.node().appendChild(child)
          }
        })
      },

      project(d) {
        return this.map.project(new mapboxgl.LngLat(+d[0], +d[1]))
      },

      translate(d) {
        let coord = this.project(d.geometry.coordinates)
        return `translate(${coord.x},${coord.y})`
      },

      getHurricaneLabel(d) {
        let hurricaneCategories = [
          { label: 5, minKnot: 137 },
          { label: 4, minKnot: 113, maxKnot: 136 },
          { label: 3, minKnot: 96, maxKnot: 112 },
          { label: 2, minKnot: 83, maxKnot: 95 },
          { label: 1, minKnot: 64, maxKnot: 82 },
        ]


        for (let category of hurricaneCategories) {
          if (parseFloat(d.properties['MAXWIND']) > category.minKnot) {
            return category.label
          }
        }
        return ''
      },

      getHurricaneIconUrl(d) {
        if (d.properties['MAXWIND'] < 34) {
          return '#circle-icon'
        }
        if (d.properties['MAXWIND'] < 63) {
          return '#tropical-storm-icon'
        }
        return '#hurricane-icon'
      },

      render({ transition } = { transition: false }) {
        if (!this.svg) return
        if (!this.selectedHurricaneTracks) return

        let { currentFeature, historicFeatures, forecastFeatures } = this.selectedHurricaneTracks

        let allFeatures = Array.prototype.concat(historicFeatures, forecastFeatures)
        let allFeaturesExceptCurrent = Array.prototype.concat(historicFeatures, forecastFeatures.slice(1))

        let trackData = { transition, allFeatures, allFeaturesExceptCurrent, ...this.selectedHurricaneTracks }

        this.renderHurricaneLine(trackData)
        this.renderForecastPositions(trackData)
        this.renderHistoricPositions(trackData)
        this.renderCurrentPosition(trackData)
        this.renderCategoryLabels(trackData)
        this.renderHoverTargets(trackData)
        this.renderHurricaneWindProbability({
          transition, selectedWindProbabilityPolygons: this.selectedWindProbabilityPolygons
        })
        this.renderCurrentWindRadii({
          transition, selectedWindRadii: this.selectedWindRadii
        })
        this.renderFloodWarnings({
          transition, selectedFloodWarnings: this.selectedFloodWarnings
        })
        this.renderCone({
          transition, selectedCone: this.selectedCone
        })
      },

      renderCone({ transition, selectedCone }) {
        if (!selectedCone) {
          this.currentCone.selectAll('path').remove()
          return null
        }

        let currentCone = this.currentCone.selectAll('path').data([selectedCone])

        let t
        if (transition) {
          t = d3.transition().duration(250).ease(d3.easeLinear)
        }

        let project = (point) => this.project(point)
        let path = d3.geoPath(d3.geoTransform({
          point: function(x, y) {
            let projected = project([x, y])
            this.stream.point(projected.x, projected.y)
          }
        }))

        let currentConeUpdate = currentCone
        if (transition) {
          currentConeUpdate = currentCone.transition(t)
        }

        currentConeUpdate
          .attr("d", (d) => path(d))
          .attr("fill-opacity", () => this.map.getZoom() > this.coneMaxZoom ? "0" : "0.1")
          .attr("stroke-opacity", () => this.map.getZoom() > this.coneMaxZoom ? "0" : "1")

        currentCone.enter().append('path')
          .attr("fill", "#878787")
          .attr("stroke", "#878787")
          .attr("fill-opacity", () => this.map.getZoom() > this.coneMaxZoom ? "0" : "0.1")
          .attr("stroke-dasharray", "8 8")
          .attr("stroke-width", "2")
          .attr("stroke-opacity", () => this.map.getZoom() > this.coneMaxZoom ? "0" : "1")
          .attr("d", (d) => path(d))

        currentCone.exit().remove()
      },

      renderFloodWarnings({ transition, selectedFloodWarnings }) {
        if (!selectedFloodWarnings) return

        let currentFloodWarnings = this.currentFloodWarnings.selectAll('path').data(selectedFloodWarnings)

        let t
        if (transition) {
          t = d3.transition().duration(250).ease(d3.easeLinear)
        }

        let project = (point) => this.project(point)
        let path = d3.geoPath(d3.geoTransform({
          point: function(x, y) {
            let projected = project([x, y])
            this.stream.point(projected.x, projected.y)
          }
        }))

        let currentFloodWarningsUpdate = currentFloodWarnings
        // if (transition) {
        //   currentFloodWarningsUpdate = currentFloodWarnings.transition(t)
        // }

        currentFloodWarningsUpdate
          .attr("d", (d) => path(d))

        currentFloodWarnings.enter().append('path')
          // .attr("fill", "#0F2F80")
          .attr("opacity", 0.75)
          .attr("fill", "url(#storm-surge-fill)")
          .attr("d", (d) => path(d))

        currentFloodWarnings.exit().remove()
      },

      renderCurrentWindRadii({ transition, selectedWindRadii }) {
        let currentWindRadii = this.currentWindRadii.selectAll('path').data(selectedWindRadii)

        let t
        if (transition) {
          t = d3.transition().duration(250).ease(d3.easeLinear)
        }

        let line = d3.line()
          .x(d => d.x)
          .y(d => d.y)

        let currentWindRadiiUpdate = currentWindRadii
        if (transition) {
          currentWindRadiiUpdate = currentWindRadii.transition(t)
        }

        currentWindRadiiUpdate
          .attr("d", (d) => line(d.geometry.coordinates[0].map(coord => this.project(coord))))

        currentWindRadii.enter().append('path')
          .attr("fill", "#EA3323")
          .attr("opacity", 0.15)
          .attr("d", (d) => line(d.geometry.coordinates[0].map(coord => this.project(coord))))

        currentWindRadii.exit().remove()
      },

      renderHurricaneWindProbability({ transition, selectedWindProbabilityPolygons }) {
        let t
        if (transition) {
          t = d3.transition().duration(250).ease(d3.easeLinear)
        }

        let line = d3.line()
          .x(d => d.x)
          .y(d => d.y)

        let windSpeedPolygons = this.windSpeedPolygons.selectAll('path')
          .data(selectedWindProbabilityPolygons)

        let windSpeedPolygonsUpdate = windSpeedPolygons
        if (transition) {
          windSpeedPolygonsUpdate = windSpeedPolygons.transition(t)
        }

        windSpeedPolygonsUpdate
          .attr("stroke-width", () => this.map.getZoom() > this.windSpeedTransitionZoom ? "0" : "1")
          .attr("d", (d) => line(d.geometry.coordinates[0].map(coord => this.project(coord))))

        windSpeedPolygons.enter().append('path')
          .attr("stroke", "#EA3323")
          .attr("stroke-width", () => this.map.getZoom() > this.windSpeedTransitionZoom ? "0" : "1")
          .attr("fill", "none")
          .attr("d", (d) => line(d.geometry.coordinates[0].map(coord => this.project(coord))))

        windSpeedPolygons.exit().remove()

        let labelCoords = selectedWindProbabilityPolygons.map(f => {
        let furthestNorthCoordIndex = d3.maxIndex(f.geometry.coordinates[0], coord => coord[1])
          return turf.point(f.geometry.coordinates[0][furthestNorthCoordIndex], f.properties)
        })

        let windSpeedLabels = this.windSpeedLabels.selectAll('g')
          .data(labelCoords)

        windSpeedLabels
          .attr("transform", (d) => this.translate(d))
          .select('text')
            .text((d) => d.properties['PERCENTAGE'].split('-')[0] + '%')

        let windSpeedLabelsEnter = windSpeedLabels.enter().append('g')

        windSpeedLabelsEnter
          .attr("transform", (d) => this.translate(d))

        windSpeedLabelsEnter
          .append('rect')
            .attr("width", "38px")
            .attr("height", "22px")
            .attr("x", "-19px")
            .attr("y", "-12px")
            .attr("rx", "4")
            .attr("fill", "#EA3323")
            .call(this.windSpeedLabelsHover)

        windSpeedLabelsEnter
          .append('text')
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("dominant-baseline", "middle")
            .text((d) => d.properties['PERCENTAGE'].split('-')[0] + '%')
            .call(this.windSpeedLabelsHover)

        windSpeedLabels.exit().remove()
      },

      renderHurricaneLine({ allFeatures }) {
        let line = d3.line()
          .x(d => this.project(d.geometry.coordinates).x)
          .y(d => this.project(d.geometry.coordinates).y)

        this.historicLine
          .attr("opacity", () => this.map.getZoom() > this.hurricanePathMaxZoom ? "0" : "0.8")
          .attr("stroke", "#878787")
          .attr("stroke-width", 2)
          .attr("fill", "none")
          .attr("d", line(allFeatures))
      },

      renderHoverTargets({ allFeatures, forecastFeatures }) {
        let hoverTargets = this.hoverTargets.selectAll('circle.hover-target').data(allFeatures)

        hoverTargets.join('circle')
          .attr('class', 'hover-target')
          .attr("transform", (d) => `${this.translate(d)}`)
          .attr("r", 20)
          .attr("opacity", 0)
          .on("mousemove", (event, d) => {
            event.preventDefault()
            const windCategory = settings.getHurricaneCategory(d.properties["maxWindMph"])
            this.setTooltipHTMLHurricane(`
              <div>
                <div><strong>${windCategory?.windSpeed || "N/A"}</strong></div>
                <div>${d.properties["FLDATELBL"]}</div>
              </div>
            `)
          })
          .on("mouseleave", () => {
            this.clearTooltipHTMLHurricane()
          })
          .on("click", (event, d) => {
            // console.log(d)
          })
      },

      renderForecastPositions({ forecastFeatures }) {
         let forecastPositions = this.forecastPositions
          .selectAll('g.forecast-position')
          .data(forecastFeatures.slice(1))

        forecastPositions
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "0.8")
          .attr("transform", (d) => `${this.translate(d)} scale(${this.sizeScale(d.properties['MAXWIND'])})`)
          .select("use")
          .attr("href", (d) => this.getHurricaneIconUrl(d))

        forecastPositions.enter()
          .append("g")
          .attr("class", "forecast-position")
          .attr("fill", "#878787")
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "0.8")
          .attr("transform", (d) => `${this.translate(d)} scale(${this.sizeScale(d.properties['MAXWIND'])})`)
          .append("use")
          .attr("href", (d) => this.getHurricaneIconUrl(d))
          // .on("click", (event, d) => console.log(d.properties))

        forecastPositions.exit().remove()
      },

      renderCurrentPosition({ transition, currentFeature }) {
        let t
        if (transition) {
          t = d3.transition().duration(250).ease(d3.easeLinear)
        }

        let currentPosition = this.currentPosition
          .selectAll('g.current-position')
          .data(currentFeature ? [currentFeature] : [])

        let currentPositionUpdate
        if (transition) {
          currentPositionUpdate = currentPosition.transition(t)
        } else {
          currentPositionUpdate = currentPosition
        }

        currentPositionUpdate
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "0.8")
          .attr("transform", (d) => `${this.translate(d)}`)
        currentPositionUpdate
          .select("use")
          .attr("transform", (d) => `scale(${this.sizeScale(d.properties['MAXWIND'])})`)
          .attr("href", (d) => this.getHurricaneIconUrl(d))
        currentPositionUpdate
          .select("text")
          .text((d) => this.getHurricaneLabel(d))

        let currentPositionEnter = currentPosition.enter()
          .append("g")
          .attr("class", "current-position")
          .attr("fill", "#EA3323")
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "0.8")
          .attr("transform", (d) => `${this.translate(d)}`)
          // .on("click", (event, d) => console.log(d.properties))

        currentPositionEnter
          .append("use")
            .attr("transform", (d) => `scale(${this.sizeScale(d.properties['MAXWIND'])})`)
            .attr("href", (d) => this.getHurricaneIconUrl(d))

        currentPositionEnter
          .append("text")
          .attr("font-size", "16px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "white")
          .text((d) => this.getHurricaneLabel(d))

        currentPosition.exit().remove()
      },

      renderHistoricPositions({ historicFeatures }) {
        let historicPositions = this.historicPositions
          .selectAll('g.historic-position')
          .data(historicFeatures)

        historicPositions
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "0.8")
          .attr("transform", (d) => `${this.translate(d)} scale(${this.sizeScale(d.properties['MAXWIND'])})`)
          .select("use")
          .attr("href", (d) => this.getHurricaneIconUrl(d))

        historicPositions.enter()
          .append("g")
          .attr("class", "historic-position")
          .attr("fill", "#353535")
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "0.8")
          .attr("transform", (d) => `${this.translate(d)} scale(${this.sizeScale(d.properties['MAXWIND'])})`)
          .append("use")
          .attr("href", (d) => this.getHurricaneIconUrl(d))
          // .on("click", (event, d) => console.log(d.properties))

        historicPositions.exit().remove()
      },

      renderCategoryLabels({ allFeaturesExceptCurrent }) {
        let categoryLabels = this.categoryLabels
          .selectAll('text')
          .data(allFeaturesExceptCurrent)

        categoryLabels
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "1")
          .attr("x", (d) => this.project(d.geometry.coordinates).x)
          .attr("y", (d) => this.project(d.geometry.coordinates).y)
          .text((d) => this.getHurricaneLabel(d))

        categoryLabels.enter()
          .append("text")
          .attr("opacity", () => this.map.getZoom() > this.hurricaneIconMaxZoom ? "0" : "1")
          .attr("x", (d) => this.project(d.geometry.coordinates).x)
          .attr("y", (d) => this.project(d.geometry.coordinates).y)
          .attr("font-size", "16px")
          .attr("font-weight", "bold")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "white")
          .text((d) => this.getHurricaneLabel(d))

        categoryLabels.exit().remove()
      },

      windSpeedLabelsHover(labels) {
        labels
          .on("mousemove", (event, d) => {
            event.preventDefault()
            this.setTooltipHTMLHurricane(`
              <div>
                <div><strong>${d.properties["PERCENTAGE"]}</strong> Chance of category 1 wind speeds (sustained winds > 74mph)</div>
              </div>
            `)
          })
          .on("mouseleave", () => {
            this.clearTooltipHTMLHurricane()
          })
      },
    },

    watch: {
      selectedDateTime() {
        this.render({ transition: true })
      },

      forecastHurricaneTracks() {
        this.sizeScale = settings.hurricaneTrackSizeScale(this.forecastHurricaneTracks)

        // First render
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

circle.forecast-position:hover {
  fill: blue;
  transition: cx 0.2s ease, cy 0.2s ease;
}
</style>