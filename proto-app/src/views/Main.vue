<template>
  <div>
    <HtmlTitle :title="this.selectedDisasterName ? `${this.siteTitle} - ${this.selectedDisasterName}` : this.siteTitle" />
    <div id='map' :class="navbarOpen ? 'map-navbar-open' : 'map-navbar-closed'" :style="[reportVisible ? {'visibility': 'hidden'} : '']"></div>
    <Navbar />
    <MapMenu />
    <Timeslider />

    <Tooltip :tooltipHTML="tooltipHTMLHurricane" v-if="tooltipHTMLHurricane"/>
    <Tooltip :tooltipHTML="tooltipHTMLCyclone" v-if="tooltipHTMLCyclone"/>
    <Tooltip :tooltipHTML="tooltipHTML"  v-if="!tooltipHTMLCyclone && !tooltipHTMLHurricane"/>

    <MobilityFlowsCanvas />
    <HurricaneForecastCanvas v-if="disasterType === 'hurricane'"/>
    <CycloneForecastCanvas v-if="disasterType === 'cyclone'"/>
    <MapLayerController />
    <IsochronesLayerController />

    <GenerateReportButton />
    <GenerateReportModal />
    <PickMapViewScreen />

    <AboutModal />

    <Report v-if="reportVisible" />

    <div class="loading" v-if="loading || reportLoading">
      <LoadingSpinner v-if="reportLoading" />
      <LoadingBars v-if="loading" />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import * as turf from '@turf/turf'
import _ from 'underscore'
import mapboxgl from 'mapbox-gl';

window.d3 = d3
window.turf = turf
window._ = _

import { settings } from '../../constants/settings'

import { generateReportMaps } from '../components/utils/generateReportMaps'

import { loadMapData } from './utils/mapData'
import { enableMapInteraction } from './utils/mapInteraction'
import { orderReportSectionsFromQuery } from './utils/queryString'

import MapLayerController from '../components/MapLayerController'
import Tooltip from '../components/Tooltip'
import GenerateReportModal from '../components/GenerateReportModal'
import GenerateReportButton from '../components/GenerateReportButton'
import PickMapViewScreen from '../components/PickMapViewScreen'
import AboutModal from '../components/AboutModal'
import MobilityFlowsCanvas from '../components/MobilityFlowsCanvas'
import HurricaneForecastCanvas from '../components/HurricaneForecastCanvas'
import CycloneForecastCanvas from '../components/CycloneForecastCanvas'
import IsochronesLayerController from '../components/IsochronesLayerController'
import MapMenu from '../components/MapMenu'
import Navbar from '../components/Navbar'
import Timeslider from '../components/Timeslider'
import LoadingSpinner from '../components/LoadingSpinner'
import LoadingBars from '../components/LoadingBars'
import Report from '../components/Report'
import HtmlTitle from '../components/HtmlTitle.vue';

export default {
  name: 'Home',

  components: {
    MapMenu,
    Navbar,
    Tooltip,
    MapLayerController,
    MobilityFlowsCanvas,
    HurricaneForecastCanvas,
    CycloneForecastCanvas,
    IsochronesLayerController,
    GenerateReportButton,
    GenerateReportModal,
    PickMapViewScreen,
    AboutModal,
    Timeslider,
    LoadingSpinner,
    LoadingBars,
    Report,
    HtmlTitle,
  },

  data() {
    return {
      loading: true
    }
  },

  computed: {
    ...mapState([
      'selectedCountyFips',
      'selectedPlaceGeoids',
      'focusedCountyFips',
      'focusedPlaceGeoid',
      'currentTab',
      'currentLocation',
      'reportVisible',
      'reportLoading',
      'reportNotes',
      'disasterConfig',
      'navbarOpen',
      'tooltipHTML',
      'tooltipHTMLHurricane',
      'tooltipHTMLCyclone',
      'pickMapViewScreen',
    ]),
    ...mapGetters([
      'closestCities',
      'closestHealthcare',
      'selectedHealthcare',
      'selectedFBFlows',
      'disasterLng',
      'disasterLat',
      'disasterZoom',
      'disasterType',
      'selectedDisasterName',
      'siteTitle',
    ]),
    dayjs() {
      return dayjs
    },
  },

  watch: {
    selectedCountyFips(countyFips) {
      this.$store.state.map?.setFilter('counties-selected', ['in', 'GEOID', ...countyFips])
      this.$store.state.map?.setFilter('counties-stroke-selected', ['in', 'GEOID', ...countyFips])
    },
    focusedCountyFips(countyFips) {
      this.$store.state.map?.setFilter('counties-stroke-focused', ['in', 'GEOID', countyFips])
    },
    selectedPlaceGeoids(placeGeoids) {
      this.$store.state.map?.setFilter('acs-places-selected', ['in', 'GEOID', ...placeGeoids])
      this.$store.state.map?.setFilter('acs-places-stroke-selected', ['in', 'GEOID', ...placeGeoids])
    },
    focusedPlaceGeoid(placeGeoid) {
      this.$store.state.map?.setFilter('acs-places-stroke-focused', ['in', 'GEOID', placeGeoid])
    },
    reportVisible() {
      if (this.reportVisible) return null
      // trigger again when coming back from report view
      if (this.selectedCountyFips?.length) {
        this.$store.state.map?.setFilter('counties-selected', ['in', 'GEOID', ...this.selectedCountyFips])
      }
      if (this.selectedPlaceGeoids?.length) {
        this.$store.state.map?.setFilter('acs-places-selected', ['in', 'GEOID', ...this.selectedPlaceGeoids])
        this.$store.state.map?.setFilter('acs-places-stroke-selected', ['in', 'GEOID', ...this.selectedPlaceGeoids])
      }
    },
    async navbarOpen() {
      await new Promise(r => { setTimeout(r, 10); })
      this.$store.state.map?.resize()
    }
  },

  methods: {
    ...mapMutations([
      'setTab',
      'setReportMapViews',
    ]),
    toggleFlows() {
      this.$store.commit('toggleFlowsMode')
    },
  },

  mounted: async function() {
    const query = this.$route.query

    //
    // This is a hack to erase the "reportVisible" query param
    // if the user refreshes the report page before saving.
    // If we refactor the report so it auto-saves, or if vue router
    // implements history.state support, we could remove this.
    //
    if (query?.reportVisible && !query?.reportSaved) {
      let newQuery = Object.assign({}, this.$route.query)
      delete newQuery.reportVisible
      this.$router.replace({ query: newQuery })
    }

    //
    // A little custom routing so that the browser back
    // button closes the report screen.
    //
    this.$watch(() => this.$route.query, (toQuery, previousQuery) => {
      if (toQuery.reportVisible) {
        this.$store.commit("setReportVisible", true)
      } else {
        this.$store.commit("setReportVisible", false)
      }
    })

    await new Promise((resolve) => { this.$store.dispatch('getDisasters').then(() => { resolve() }) })
    await new Promise((resolve) => { this.$store.dispatch('getAboutData').then(() => { resolve() }) })
    await new Promise((resolve) => { this.$store.dispatch('fetchBreaks').then(() => { resolve() }) })

    // get query string parameters
    if (query?.disasterId) { this.$store.commit('setDisaster', query.disasterId) }
    if (query?.vulnerabilityMetric) { this.$store.commit('setVulnerabilityMetric', query.vulnerabilityMetric) }
    if (query?.date) { this.$store.commit('setSelectedDateTime', dayjs(query.date, 'YYYY-MM-DD_hhmm').toDate()) }
    if (query?.sections) {
      const sections = orderReportSectionsFromQuery(query.sections)
      this.$store.commit("setReportSections", sections)
    }

    // // for debugging
    // window.$store = this.$store

    // Stamen temporary key
    mapboxgl.accessToken = settings.mapboxAccessToken

    let mapLoadInterval = setInterval(() => this.$store.commit('bumpLoadProgress', { loadLabel: 'Map' }), 200)
    const map = window.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/stamen/cl5a4kqs0000r14pfpd3xdmfu', // stamen account style
      center: [query?.lng || this.disasterLng, query?.lat || this.disasterLat],
      zoom: query?.zoom || this.disasterZoom || 9,
      boxZoom: false,
      preserveDrawingBuffer: true,  // required for getting map canvas as image
      dragRotate: false
    })

    await new Promise((resolve) => map.on('load', () => resolve()))
    clearInterval(mapLoadInterval)
    this.$store.commit('bumpLoadProgress', { loadLabel: 'Map', complete: true })

    // When the map is in the store, it's ready to use
    this.$store.commit('setMap', map)

    await loadMapData(map, this.$store)
    enableMapInteraction(map, this.$store)

    // set selections after map has loaded, so they can be styled properly
    if (query?.regionTypeSelection && query?.ids) {
      const storeProp = query?.regionTypeSelection  === "places"
        ? "setSelectedPlaceGeoids"
        : "setSelectedCountyFips"
      this.$store.commit("setRegionTypeSelection", query.regionTypeSelection)
      this.$store.commit(storeProp, Array.isArray(query.ids) ? query.ids : [query.ids])
    }

    // generate report
    if (query?.reportSaved) {
      const addReportNotes = (sectionId) => { this.reportNotes[sectionId] = query?.[`notes-${sectionId}`] }
      await generateReportMaps(this.$store.state.disasterConfig, this.$store.state.map, this.setTab, this.setReportMapViews)
      this.setTab('vulnerability')
      addReportNotes('disaster')
      addReportNotes('vulnerability')
      addReportNotes('movement')
      addReportNotes('infrastructure')
      this.$store.commit('setReportCreatedOn', query?.reportCreatedOn)
      this.$store.commit('setReportVisible', true)
    }

    this.loading = false
  }
}
</script>

<style lang="scss" scoped>
#map {
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
}

.map-navbar-closed {
  left: 61px;
}

.map-navbar-open {
  left: 212px;
}

.loading {
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
</style>
