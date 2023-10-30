<template>
<div class="legend">
  <div class="section" v-if="currentTab === 'vulnerability'">
    <select class="custom-select" style="width: 100%;" v-model="vulnerabilityMetricSelected">
      <option v-for="item in vulnerabilityMetrics" :value="item.id" :key="item.id">
        {{ item.name(disasterConfig?.isInternational) }}
      </option>
    </select>

    <VulnerabilityLegend />
    <p class="data-source">{{ vulnerabilityMetric?.source(disasterConfig?.isInternational, disasterCensusVintage) }}</p>
  </div>

  <div class="section" v-if="currentTab === 'infrastructure'">
    <div class="title">Healthcare Facilities</div>
    <HealthcareFacilitiesLegend :columnWidth="'50%'" />
  </div>

  <!-- Travel Time Isochrones Legend -->
  <div class="section" v-if="currentTab === 'infrastructure' && selectedPlaceGeoids.length > 0">
    <div class="isochrones-legend">
      <div class="title isochrones-title">Driving Times</div>
      <div class="isochrones-legend-container">
        <div v-for="(x, i) in isochronesRange" :key="x" class="isochrones-bar" :style="{ background: isochronesColorScale(x) }">
          <div class="isochrones-labels">{{isochronesTicks[i]}}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" v-if="currentTab === 'movement'">
    <!-- Pop Density Legend -->
    <select class="custom-select" style="width: 100%;" v-model="movementDataSelected">
      <option v-for="item in movementDataSources" :value="item.id" :key="item.id">
        {{ item.name }} ({{ item.source }})
      </option>
    </select>
    <!-- <div class="title">Pop. Density Change <span class="data-source">Facebook Mobility Data</span></div> -->
    <PopDensityLegend />

    <div class="title">Movement Trends</div>
    <div style="display: flex; align-items: center">
      <div>
        <div style="display: flex; justify-content: space-between; width: 182px;">
          <span style="font-size: 12px;">Origin</span>
          <img src="img/mobility-arrow-legend.svg">
          <span style="font-size: 12px;">Destination</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-around; font-size: 12px; margin-left: auto">
        <div class="radio-and-label" style="padding-right: 8px">
          <input type="radio" id="movement-to" name="movement-trend-mode" value="to" v-model="flowsDirection" />
          <label for="movement-to">To</label>
        </div>
        <div class="radio-and-label">
          <input type="radio" id="movement-from" name="movement-trend-mode" value="from" v-model="flowsDirection" />
          <label for="movement-from">From</label>
        </div>
        <div class="radio-and-label" style="padding-left: 20px">
          <input type="radio" id="movement-off" name="movement-trend-mode" value="off" v-model="flowsDirection" />
          <label for="movement-off">Off</label>
        </div>
      </div>
    </div>
  </div>

</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import * as d3 from 'd3'
import dayjs from 'dayjs'

import { settings } from '../../constants/settings'

import LineChart from './LineChart'
import PopDensityLegend from './PopDensityLegend'
import VulnerabilityLegend from './VulnerabilityLegend'
import HealthcareFacilitiesLegend from './HealthcareFacilitiesLegend'

export default {
  name: 'Legend',

  components: {
    PopDensityLegend,
    VulnerabilityLegend,
    HealthcareFacilitiesLegend,
  },

  props: {
    disasterDateEnd: Date,
    disasterDateStart: Date,
  },

  data() {
    return {
      acresBurned: false,
      vulnerabilityMetricSelected: settings.vulnerabilityMetrics.find(d => d.default === true).id,
    }
  },

  computed: {
    ...mapState([
      'isochronesData',
      'selectedDateTime',
      'map',
      'currentTab',
      'selectedPlaceGeoids',
      'vulnerabilityMetric',
      'mobilityMode',
      'disasterConfig'
    ]),
    ...mapGetters([
      'currentFirePerimeter',
      'isochronesColorScale',
      'focusedPlace',
      'disasterCensusVintage',
    ]),
    d3() {
      return d3
    },
    dayjs() {
      return dayjs
    },
    vulnerabilityMetrics() {
      return settings.vulnerabilityMetrics
    },
    movementDataSources() {
      return settings.movementDataSources
    },
    movementDataSelected: {
      get() {
        return this.mobilityMode
      },
      set(value) {
        this.setMobilityMode(value)
      }
    },
    isochrones() {
      return this.isochronesData[this.focusedPlace?.properties?.GEOID]
    },
    isochronesRange() {
      if (!this.isochrones) return []

      return this.isochrones.features.map(f => f.properties['contour'])
        .sort((a, b) => d3.ascending(a, b))
    },
    isochronesTicks() {
      if (!this.isochrones) return []

      return this.isochronesRange.map(d => `${d} min`)
    },

    flowsDirection: {
      get() {
        return this.$store.state.flowsDirection
      },
      set(value) {
        this.$store.commit('setFlowsDirection', value)
      }
    }

  },

  watch: {
    currentFirePerimeter(perimeter) {
      this.acresBurned = perimeter?.properties?.acres
    },
    vulnerabilityMetricSelected(selected) {
      this.setVulnerabilityMetric(selected)
    },
  },

  methods: {
    ...mapMutations([
      'setVulnerabilityMetric',
      'setMobilityMode',
    ]),
    layerExists(layerId) {
      return this.map.getLayer(layerId)
    },
  }
}
</script>

<style lang="scss" scoped>
.legend {
  padding: 0px 15px;
}

.isochrones-legend {
  .isochrones-title {
    margin: 0 0 0.5em;
  }

  .isochrones-legend-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    :last-child {
      // color last one white
      .isochrones-labels {
        color: #fff !important;
      }
    }
  }
  .isochrones-labels {
    font-weight: bold;
    text-align: center;
    font-size: 12px;
    width: 100%;
  }
  .isochrones-bar {
    width: 100%;
    height: 17px;
    text-align: center;
    align-items: center;
    display: flex;
  }
}

.custom-select {
  display: flex;
  align-items: center;
  text-align: left;
  font-weight: bold;
  font-size: 14px;
  line-height: 17px;
  color: #000;
  margin: 12px 0 6px 0;
  border: 1px solid #D6DDEB;
  border-radius: 4px;
  height: 27px;
  background: transparent;
  padding: 0 0.5em;
  margin: 1em 0 0.5em;
}

.section {
  margin-bottom: 10px;

  .title {
    display: flex;
    align-items: center;
    text-align: left;
    font-weight: bold;
    font-size: 14px;
    line-height: 17px;
    color: #000;
    margin: 12px 0 6px 0;
  }

  .data-source {
    margin-left: auto;
    font-size: 12px;
    color: #878787;
    font-weight: 400;
  }
}

.colordots {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  height: 60px;
}

.color-category {
  display: flex;
  align-items: center;
  margin-right: 20px;
  margin-bottom: 4px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 20px;
  margin-right: 5px;
}

.dot-label {
  color: black;
  font-size: 12px;
}

.line-chart-placeholder {
  height: 110px;
  background: #efefef;
  display: flex;
  justify-content: center;
  align-items: center;
}

.line-chart-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h4 {
    margin: 0 0 0.75em;
  }
}

.radio-and-label {
  display: flex;
  align-items: center;

  input[type="radio"] {
    margin: 0px 3px;
  }
}
</style>
