<template>
  <div></div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import dayjs from 'dayjs'
import * as d3 from 'd3'
import _ from 'underscore'

export default {
  name: 'MapLayerController',

  computed: {
    ...mapState([
      'map',
      'dataLoaded',
      'selectedDateTime',
      'currentTab',
      'regionTypeSelection',
      'firePerimeter',
      'smokePerimeter',
      'vulnerabilityMetric',
      'acsPlaces',
      'mobilityMode',
      'hurricaneWindProbability',
      'sateliteBasemap',
      'hoveredCountyId',
      'hoveredPlaceId',
      'selectedCountyFips',
      'selectedPlaceGeoids'
    ]),
    ...mapGetters([
      'selectedDateString',
      'vulnerabilityColorScaleMap',
      'fbPopDensityDates',
      'mapboxActivityDates',
      'facebookPopDensityColorScale',
      'firePixelsLayerFilter',
      'firePixelsLayerFill',
    ])
  },

  watch: {
    mobilityMode() {
      this.renderMobilityDots()
    },

    currentTab() {
      this.renderMobilityDots()
      this.renderPlaces()
      this.renderPowerOutages()
      this.renderHealthcare()

      if (this.currentTab === 'vulnerability') {
        this.showPlacesVulnerability()
        this.hideIsochrones()
      } else if (this.currentTab === 'movement') {
        this.hidePlacesVulnerability()
        this.hideIsochrones()
      } else if (this.currentTab === 'infrastructure') {
        this.hidePlacesVulnerability()
        this.showIsochrones()
      } else if (this.currentTab === 'infrastructureReport') {  // infrastructure view for report
        this.hidePlacesVulnerability()
        this.hideIsochrones()
      } else if (this.currentTab === 'disasterReport') {  // disaster view for report
        this.hidePlacesVulnerability()
        this.hideIsochrones()
      }
    },

    regionTypeSelection() {
      this.renderCounties()
      this.renderPlaces()
      this.renderPowerOutages()
    },

    //
    // Update time-sensitive layers
    //
    selectedDateTime() {
      this.renderMobilityDots()
      this.renderFirePerimeters()
      this.renderSmokePerimeters()
      // this.renderFirePixels()
      this.renderPowerOutages()
    },

    // Triggers first render when disaster data is available
    dataLoaded() {
      this.renderFirePerimeters()
      this.renderSmokePerimeters()
      // this.renderFirePixels()
      this.renderPowerOutages()
      this.renderCounties()
      this.renderPlaces()
      this.renderHealthcare()
    },

    vulnerabilityMetric() {
      this.map?.setPaintProperty('acs-places-fill', 'fill-color', this.vulnerabilityColorScaleMap)
      // this.map?.setPaintProperty('acs-places-stroke-data-driven', 'line-color', this.vulnerabilityColorScaleMap)
    },

    sateliteBasemap() {
      if (!this.layerExists('satellite-map')) {
        this?.map.addSource("mapbox-satellite", {
          "type": "raster",
          "url": "mapbox://mapbox.satellite",
          "tileSize": 256
        })
        this?.map.addLayer({
          "type": "raster",
          "id": 'satellite-map',
          "source": "mapbox-satellite",
          "opacity": 1
        }, 'hillshade')
      } else {
        this.map?.setPaintProperty('satellite-map', 'raster-opacity', this.sateliteBasemap ? 1 : 0)
      }
    },

    hoveredCountyId(newCountyId, oldCountyId) {
      if (oldCountyId) {
        this.map?.setFeatureState({ id: oldCountyId, source: 'counties' }, { hovered: false })
      }

      if (newCountyId) {
        this.map?.setFeatureState({ id: newCountyId, source: 'counties' }, { hovered: true })
      }
    },

    hoveredPlaceId(newPlaceId, oldPlaceId) {
      if (oldPlaceId) {
        this.map?.setFeatureState({ id: oldPlaceId, source: 'acs-places' }, { hovered: false })
      }

      if (newPlaceId) {
        this.map?.setFeatureState({ id: newPlaceId, source: 'acs-places' }, { hovered: true })
      }
    },

    // TODO: Refactor focused place / county so they are computed
    // from a single index into the current selection
    selectedCountyFips() {
      if (this.selectedCountyFips.length === 0) {
        this.$store.commit('clearFocusedCounty')
      }
    },

    selectedPlaceGeoids() {
      if (this.selectedPlaceGeoids.length === 0) {
        this.$store.commit('clearFocusedPlace')
      }
    }
  },

  methods: {
    layerExists(layerId) {
      return this.map?.getLayer(layerId)
    },

    renderCounties() {
      if (this.regionTypeSelection === 'counties') {
        this.map?.setLayoutProperty('counties', 'visibility', 'visible')
        this.map?.setLayoutProperty('counties-stroke', 'visibility', 'visible')
        this.map?.setLayoutProperty('counties-selected', 'visibility', 'visible')
        this.map?.setLayoutProperty('counties-stroke-selected', 'visibility', 'visible')
        this.map?.setLayoutProperty('counties-stroke-focused', 'visibility', 'visible')
        this.map?.setLayoutProperty('counties-hovered', 'visibility', 'visible')
      } else {
        this.map?.setLayoutProperty('counties', 'visibility', 'none')
        this.map?.setLayoutProperty('counties-stroke', 'visibility', 'none')
        this.map?.setLayoutProperty('counties-selected', 'visibility', 'none')
        this.map?.setLayoutProperty('counties-stroke-selected', 'visibility', 'none')
        this.map?.setLayoutProperty('counties-stroke-focused', 'visibility', 'none')
        this.map?.setLayoutProperty('counties-hovered', 'visibility', 'none')
      }
    },

    renderPlaces() {
      if (this.regionTypeSelection === 'places') {
        this.map?.setLayoutProperty('acs-places-stroke', 'visibility', 'visible')
        this.map?.setLayoutProperty('acs-places-stroke-selected', 'visibility', 'visible')
        this.map?.setLayoutProperty('acs-places-stroke-focused', 'visibility', 'visible')
        this.map?.setLayoutProperty('acs-places-hovered', 'visibility', 'visible')
      } else {
        this.map?.setLayoutProperty('acs-places-stroke', 'visibility', 'none')
        this.map?.setLayoutProperty('acs-places-stroke-selected', 'visibility', 'none')
        this.map?.setLayoutProperty('acs-places-stroke-focused', 'visibility', 'none')
        this.map?.setLayoutProperty('acs-places-hovered', 'visibility', 'none')
      }

    },

    showPlacesVulnerability() {
      this.map?.setLayoutProperty('acs-places-fill', 'visibility', 'visible')
      // this.map?.setLayoutProperty('acs-places-stroke-data-driven', 'visibility', 'visible')
    },

    hidePlacesVulnerability() {
      this.map?.setLayoutProperty('acs-places-fill', 'visibility', 'none')
      // this.map?.setLayoutProperty('acs-places-stroke-data-driven', 'visibility', 'none')
    },

    showIsochrones() {
      if (this.layerExists('isochrones-fill')) {
        this.map?.setLayoutProperty('isochrones-fill', 'visibility', 'visible')
      }
    },

    hideIsochrones() {
      if (this.layerExists('isochrones-fill')) {
        this.map?.setLayoutProperty('isochrones-fill', 'visibility', 'none')
      }
    },

    renderMobilityDots() {
      if (this.mobilityMode === 'facebook') {
        this.hideMapboxActivityDots()
        this.renderPopDensityDots()
      } else {
        this.hidePopDensityDots()
        this.renderMapboxActivityDots()
      }
    },

    renderPopDensityDots() {
      const nearestPopDensityLayerIndex = d3.bisector(dateString => dayjs(dateString, 'YYYY-MM-DD_hhmm').toDate())
        .center(this.fbPopDensityDates, this.selectedDateTime)
      const nearestPopDensityDate = this.fbPopDensityDates[nearestPopDensityLayerIndex]
      const popDensityLayerId = `fb-pop-density`
      if (this.layerExists(popDensityLayerId)) {
        this.map?.setLayoutProperty(popDensityLayerId, 'visibility', this.currentTab === 'movement' ? 'visible' : 'none')

        // Only render pop. density dots if we've have data within 8 hours of the selected date
        let hoursSinceNearestDataPoint = Math.abs(
          dayjs(this.selectedDateTime).diff(dayjs(nearestPopDensityDate, 'YYYY-MM-DD_hhmm'), 'hours')
        )
        if (hoursSinceNearestDataPoint < 8) {
          this.map?.setPaintProperty(popDensityLayerId, 'circle-color',
            [
              "step",
              ["to-number", ["get", nearestPopDensityDate]],
              ...this.facebookPopDensityColorScale
            ]
          )
        } else {
          this.map?.setPaintProperty(popDensityLayerId, 'circle-color', 'transparent')
        }

      }
    },

    hidePopDensityDots() {
      const popDensityLayerId = `fb-pop-density`
      if (this.layerExists(popDensityLayerId)) {
          this.map?.setLayoutProperty(popDensityLayerId, 'visibility', 'none')
      }
    },

    renderMapboxActivityDots() {
      const nearestLayerIndex = d3.bisector(dateString => dayjs(dateString, 'YYYY-MM-DD').toDate())
        .center(this.mapboxActivityDates, this.selectedDateTime)
      const nearestDate = this.mapboxActivityDates[nearestLayerIndex]
      const layerId = `mapbox-activity-${nearestDate}`
      this.hideMapboxActivityDots()
      if (this.layerExists(layerId)) {
        this.map?.setPaintProperty(layerId, 'circle-opacity', this.currentTab === 'movement' ? 1 : 0)
      }
    },

    hideMapboxActivityDots() {
      for (let date of this.mapboxActivityDates) {
        const layerId = `mapbox-activity-${date}`
        if (this.layerExists(layerId)) {
          this.map?.setPaintProperty(layerId, 'circle-opacity', 0)
        }
      }
    },

    renderFirePixels() {
      const layerId = 'fire-pixels-fill'
      if (this.layerExists(layerId)) {
          this.map?.setFilter(layerId, this.firePixelsLayerFilter)
          this.map?.setPaintProperty(layerId, 'fill-color', this.firePixelsLayerFill)
      }
    },

    renderSmokePerimeters() {
      if (!this.smokePerimeter) return null

      // get smoke perimeter for current date-time
      const currentDisasterDateTime = dayjs(this.selectedDateTime).valueOf() // convert to timestamp immediately
      let smokeDateTimes = this.smokePerimeter.features.map(f => f.properties?.['Date'])
  
      // Convert all dates to their timestamp values
      smokeDateTimes = smokeDateTimes.map(date => dayjs(date).valueOf());
  
      // Sort the smokeDateTimes in descending order
      smokeDateTimes.sort((a, b) => b - a);

      // Find the first date that is less than or equal to currentDisasterDateTime
      const nearestSmokeDate = smokeDateTimes.find(date => date <= currentDisasterDateTime);

      // If nearestSmokeDate is undefined, do not set filter and paint properties
      if (!nearestSmokeDate) {
        console.log('No smoke date found that is less than or equal to currentDisasterDateTime');
        return;
      }
  
      const nearestSmokeDateFormatted = dayjs(nearestSmokeDate).format("YYYY-MM-DD HH:mm") // convert back to your desired format

      const filter = [
        "==",
        ["get", "Date"],
        nearestSmokeDateFormatted // Use nearestSmokeDate here
      ]

      try {
        this.map?.setFilter('smoke-fill', filter)
      } catch (err) {
        console.error('Error setting filter for smoke-fill:', err);
        return;
      }

      try {
        this.map?.setPaintProperty('smoke-fill', 'fill-opacity', [
          "match", ['get', 'Date'], nearestSmokeDateFormatted, 1, 0 // Use nearestSmokeDate here
        ])
      } catch (err) {
        console.error('Error setting paint property for smoke-fill:', err);
      }
    },

    renderFirePerimeters() {
      if (!this.firePerimeter) return null

      // // get nearest layer in time
      // const nearestLayerIndex = d3.bisector(f => f.date)
      //   .left(this.firePerimeter.features, this.selectedDateTime)
      // let currentFirePerimeterFeature = this.firePerimeter.features[nearestLayerIndex]
      // let currentDisasterDate = currentFirePerimeterFeature.properties['YYYYMMDD']

      // get fire perimeter for current day
      const currentDisasterDate = dayjs(this.selectedDateTime).format("YYYYMMDD")
      const fireDates = [...new Set(this.firePerimeter.features.map(f => f.properties?.['YYYYMMDD']))]
      const firstFireDate = fireDates?.[0]

      // check if nearest date is not in the future, we don't want to
      // display fire perimeters in the future
      if (dayjs(currentDisasterDate).diff(this.selectedDateTime, 'day') > 0) {
        this.map?.setPaintProperty('fire-perimeter-previous-fill', 'fill-opacity', 0)
        this.map?.setPaintProperty('fire-perimeter-previous-outline', 'line-opacity', 0)
        this.map?.setPaintProperty('fire-perimeter-difference', 'fill-opacity', 0)
        return null
      }

      const filter = [
        "==",
        ["get", "YYYYMMDD"],
        currentDisasterDate
      ]
      this.map?.setFilter('fire-perimeter-previous-fill', filter)
      this.map?.setFilter('fire-perimeter-previous-outline', filter)
      this.map?.setFilter('fire-perimeter-difference', filter)

      this.map?.setPaintProperty('fire-perimeter-difference', 'fill-opacity', [
        "match", ['get', 'YYYYMMDD'], currentDisasterDate, 1, 0
      ])
      if (currentDisasterDate !== firstFireDate) {
        this.map?.setPaintProperty('fire-perimeter-previous-fill', 'fill-opacity',  [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          1,
          10,
          0.25
        ])
        this.map?.setPaintProperty('fire-perimeter-previous-outline', 'line-opacity',  [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          0.9,
          10,
          0.15
        ])
      } else if (currentDisasterDate === firstFireDate) {
        this.map?.setPaintProperty('fire-perimeter-previous-outline', 'line-opacity', [
          "match", ['get', 'YYYYMMDD'], currentDisasterDate, 1, 0
        ])
        this.map?.setPaintProperty('fire-perimeter-previous-fill', 'fill-opacity', [
          "match", ['get', 'YYYYMMDD'], currentDisasterDate, 0.05, 0])
      }
    },

    // renderPowerOutages() {
    //   if (this.currentTab === 'vulnerability') {
    //     if (this.regionTypeSelection === 'counties') {
    //     this.map?.setPaintProperty('counties-power-outages-outline', 'line-opacity', [
    //       "case",
    //       ['>=', ['coalesce', ['get', `percent_without_power_${this.selectedDateString}`], 0], 0.15], 1,
    //       0
    //     ])
    //     this.map?.setPaintProperty('counties-power-outages', 'icon-opacity', [
    //         "case",
    //         ['>=', ['coalesce', ['get', `percent_without_power_${this.selectedDateString}`], 0], 0.15], 1,
    //         0
    //       ])
    //     this.map?.setPaintProperty('acs-places-power-outages-outline', 'line-opacity', 0)
    //     this.map?.setPaintProperty('acs-places-power-outages', 'icon-opacity', 0)
    //     } else if (this.regionTypeSelection === 'places') {
    //     this.map?.setPaintProperty('counties-power-outages', 'icon-opacity', 0)
    //     this.map?.setPaintProperty('acs-places-power-outages', 'icon-opacity', [
    //         "case",
    //         ['>=', ['coalesce', ['get', `percent_without_power_${this.selectedDateString}`], 0], 0.15], 1,
    //         0
    //       ])
    //     this.map?.setPaintProperty('acs-places-power-outages-outline', 'line-opacity', [
    //       "case",
    //       ['>=', ['coalesce', ['get', `percent_without_power_${this.selectedDateString}`], 0], 0.15], 1,
    //       0
    //     ])
    //     this.map?.setPaintProperty('counties-power-outages-outline', 'line-opacity', 0)
    //     }
    //   } else {
    //     this.map?.setPaintProperty('acs-places-power-outages-outline', 'line-opacity', 0)
    //     this.map?.setPaintProperty('counties-power-outages-outline', 'line-opacity', 0)
    //     this.map?.setPaintProperty('counties-power-outages', 'icon-opacity', 0)
    //     this.map?.setPaintProperty('acs-places-power-outages', 'icon-opacity', 0)
    //   }
    // },

    renderPowerOutages() {
      if (this.currentTab === 'vulnerability') {
        if (this.regionTypeSelection === 'counties') {
          this.map?.setPaintProperty('counties-power-outages', 'icon-opacity', [
            "case",
            ['>=', ['coalesce', ['get', `percent_without_power_${this.selectedDateString}`], 0], 0.15], 1,
            0
          ])
          this.map?.setPaintProperty('acs-places-power-outages', 'icon-opacity', 0)
        } else if (this.regionTypeSelection === 'places') {
          this.map?.setPaintProperty('counties-power-outages', 'icon-opacity', 0)
          this.map?.setPaintProperty('acs-places-power-outages', 'icon-opacity', [
            "case",
            ['>=', ['coalesce', ['get', `percent_without_power_${this.selectedDateString}`], 0], 0.15], 1,
            0
          ])
        }
      } else {
        this.map?.setPaintProperty('counties-power-outages', 'icon-opacity', 0)
        this.map?.setPaintProperty('acs-places-power-outages', 'icon-opacity', 0)
      }
    },

    renderHealthcare() {
      if (this.currentTab === 'infrastructure' || this.currentTab === 'infrastructureReport') {
        this.map?.setLayoutProperty('healthcare-facilities', 'visibility', 'visible')
        this.map?.setLayoutProperty('healthcare-clusters', 'visibility', 'visible')
        this.map?.setLayoutProperty('healthcare-cluster-count', 'visibility', 'visible')
        this.map?.setLayoutProperty('healthcare-facilities-with-capacities', 'visibility', 'visible')
      } else {
        this.map?.setLayoutProperty('healthcare-facilities', 'visibility', 'none')
        this.map?.setLayoutProperty('healthcare-clusters', 'visibility', 'none')
        this.map?.setLayoutProperty('healthcare-cluster-count', 'visibility', 'none')
        this.map?.setLayoutProperty('healthcare-facilities-with-capacities', 'visibility', 'none')
      }
    }

  }
}
</script>


<style lang="scss" scoped>
</style>
