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
  
      name: 'CycloneForecastCanvas',
  
      computed: {
        ...mapState([
          'map',
          'selectedDateTime',
          'forecastCycloneTracks',
          'historicCyclonePositions',
          'cycloneWindRadii',
          'cycloneCones',
          'disasterConfig'
        ]),
        ...mapGetters([
        ]),
  
        selectedCycloneTracks() {
          if (!this.historicCyclonePositions) return null
  
          let currentFeatureIndex = d3.bisector(f => f.properties.advisoryDate).right(
            this.historicCyclonePositions.features, this.selectedDateTime
          ) - 1
          let currentFeature = this.historicCyclonePositions.features[currentFeatureIndex]
          if (!currentFeature) return { currentFeature: null, historicFeatures: [], forecastFeatures: [] }
  
          let currentAdvisoryDate = currentFeature.properties.advisoryDate
          let historicFeatures = this.historicCyclonePositions.features
            .filter(f => f.properties.advisoryDate.getTime() < currentAdvisoryDate.getTime())
  
          let currentAdvisoryNum = currentFeature.properties['ADVISNUM']
          let forecastFeatures = this.historicCyclonePositions.features
            .filter(f => f.properties['ADVISNUM'] === currentAdvisoryNum)
  
          this.setCurrentCyclonePosition(currentFeature)
  
          return { currentFeature, historicFeatures, forecastFeatures }
        },

        selectedWindRadii() {
          if (!this.cycloneWindRadii) return null
          let { currentFeature } = this.selectedCycloneTracks
          let currentAdvisoryNum = currentFeature?.properties['ADVISNUM']
          return this.cycloneWindRadii?.features?.filter(f => f?.properties['ADVNUM'] === currentAdvisoryNum)
        },

        selectedCone() {
          if (!this.cycloneCones) return null
          let { currentFeature } = this.selectedCycloneTracks
          let currentAdvisoryNum = currentFeature?.properties['ADVISNUM']

          let result = this.cycloneCones?.features?.find(f => String(f?.properties['ADVISNUM']) === String(currentAdvisoryNum));
  
          return result;
        }

      },
  
      methods: {
        ...mapMutations([
          'setCurrentCyclonePosition',
          'setTooltipHTMLCyclone',
          'clearTooltipHTMLCyclone',
        ]),
        maybeInitCanvasLayer() {
          // Already initted, or not actually ready to init this component yet
          if (this.svg || !this.map) return
  
           // Get Mapbox map canvas container
          var canvas = this.map.getCanvasContainer()
  
          // Overlay d3 on the map
          this.svg = d3.select(canvas).append("svg")
            .attr("id", "cyclone-forecast-canvas")
            .attr("class", "mapbox-d3-container")
  
          this.defs = this.svg.append("defs")
  
          // Layer ordering determined here
          this.currentCone = this.svg.append('g').attr('class', 'cone')
          //this.currentFloodWarnings = this.svg.append('g').attr('class', 'flood-warnings')
          this.currentWindRadii = this.svg.append('g').attr('class', 'current-wind-radii')
          this.historicLine = this.svg.append('path').attr('class', 'historic-line')
          //this.windSpeedPolygons = this.svg.append('g').attr('class', 'wind-speed-polygons')
          //this.windSpeedLabels = this.svg.append('g').attr('class', 'wind-speed-labels')
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
  
        getCycloneLabel(d) {
          let cycloneCategories = [
            // using km/h instead of knots for Cyclones
            { label: 5, minKph: 252 },
            { label: 4, minKph: 209, maxKph: 251 },
            { label: 3, minKph: 178, maxKph: 208 },
            { label: 2, minKph: 154, maxKph: 177 },
            { label: 1, minKph: 119, maxKph: 153 },
            //{ label: 5, minKnot: 137 },
            //{ label: 4, minKnot: 113, maxKnot: 136 },
            //{ label: 3, minKnot: 96, maxKnot: 112 },
            //{ label: 2, minKnot: 83, maxKnot: 95 },
            //{ label: 1, minKnot: 64, maxKnot: 82 },
          ]
  
  
          for (let category of cycloneCategories) {
            if (parseFloat(d.properties['MAXWIND']) > category.minKph) {
              return category.label
            }
          }
          return ''
        },
  
        getHurricaneIconUrl(d) {
            // changed for kph
          if (d.properties['MAXWIND'] < 63) {
            return '#circle-icon'
          }
          // changed for kph
          if (d.properties['MAXWIND'] < 119) {
            return '#tropical-storm-icon'
          }
          return '#hurricane-icon'
        },
  
        render({ transition } = { transition: false }) {
          if (!this.svg) return
          if (!this.selectedCycloneTracks) return
  
          let { currentFeature, historicFeatures, forecastFeatures } = this.selectedCycloneTracks
  
          let allFeatures = Array.prototype.concat(historicFeatures, forecastFeatures)
          let allFeaturesExceptCurrent = Array.prototype.concat(historicFeatures, forecastFeatures.slice(1))
  
          let trackData = { transition, allFeatures, allFeaturesExceptCurrent, ...this.selectedCycloneTracks }
  
          this.renderHurricaneLine(trackData)
          this.renderForecastPositions(trackData)
          this.renderHistoricPositions(trackData)
          this.renderCurrentPosition(trackData)
          this.renderCategoryLabels(trackData)
          this.renderHoverTargets(trackData)
          //this.renderHurricaneWindProbability({
          //  transition, selectedWindProbabilityPolygons: this.selectedWindProbabilityPolygons
          //})
          this.renderCurrentWindRadii({
            transition, selectedWindRadii: this.selectedWindRadii
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
              const windCategory = settings.getCycloneCategory(d.properties["maxWindMph"])
              this.setTooltipHTMLCyclone(`
                <div>
                  <div><strong>${windCategory?.windSpeed || "N/A"}</strong></div>
                  <div>Reported on ${new Date(d.properties["ADVDATE"]).toISOString().split('T')[0]} at ${new Date(d.properties["ADVDATE"]).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</div>
                </div>
              `)
            })
            .on("mouseleave", () => {
              this.clearTooltipHTMLCyclone()
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
            .text((d) => this.getCycloneLabel(d))
  
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
            .text((d) => this.getCycloneLabel(d))
  
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
            .text((d) => this.getCycloneLabel(d))
  
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
            .text((d) => this.getCycloneLabel(d))
  
          categoryLabels.exit().remove()
        },
  
        windSpeedLabelsHover(labels) {
          labels
            .on("mousemove", (event, d) => {
              event.preventDefault()

              this.setTooltipHTMLCyclone(`
                <div>
                  <div>Category 1 wind speeds (sustained winds > 119kph)</div>
                </div>
              `)
            })
            .on("mouseleave", () => {
              this.clearTooltipHTMLCyclone()
            })
        },
      },
  
      watch: {
        selectedDateTime() {
          this.render({ transition: true })
        },
  
        forecastCycloneTracks() {
            // hurricaneTrackSizeScale in settings.js no need to change for cyclones
          this.sizeScale = settings.hurricaneTrackSizeScale(this.forecastCycloneTracks)
  
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
  