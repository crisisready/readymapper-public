<template>
<div class="legend" :class="{ collapsed: headerCollapsed }">

  <div class="section" v-if="disasterType === 'fire'">
    <div class="title">Fire Information</div>
    <MapLegendFire />
  </div>

  <div class="section" v-if="disasterType === 'hurricane'">
    <div class="title">Cyclone Information</div>
    <MapLegendHurricane />
  </div>

  <div class="section" v-if="disasterType === 'cyclone'">
    <div class="title">Cyclone Information</div>
    <MapLegendHurricane />
  </div>

  <div class="section bottom-border">
    <div class="title">Power Outages</div>
    <div class="legend-item">
      <img class="legend-image" src="img/power-outage.png">
      <div> > 15% pop. without power</div>
    </div>
  </div>

  <!-- Acres Burned Timeseries -->
  <div class="section" v-if="disasterType === 'fire'">
    <div class="title">Acres Burned: <span style="font-weight: normal">{{ acresBurned }}</span></div>
    <AcresAffectedLineChart
      :data="this.acresBurnedTimeseries"
      :height="80"
      :width="370"
      :maxType="'global'"
    />
  </div>

  <!-- Hurricane Wind Speed Timeseries -->
  <div class="section" v-if="disasterType === 'hurricane'">
    <div class="title">Wind speeds: <span style="font-weight: normal">{{ windCategorySpeed }}</span></div>
    <HurricaneWindSpeedLineChart
      :data="this.hurricaneWindSpeedTimeseries"
      :height="80"
      :width="370"
      :maxType="'global'"
    />
  </div>

    <!-- Cyclone Wind Speed Timeseries -->
    <div class="section" v-if="disasterType === 'cyclone'">
    <div class="title">Wind speeds: <span style="font-weight: normal">{{ windCategorySpeed }}</span></div>
    <HurricaneWindSpeedLineChart
      :data="this.cycloneWindSpeedTimeseries"
      :height="80"
      :width="370"
      :maxType="'global'"
    />
  </div>

</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import * as d3 from 'd3'
import dayjs from 'dayjs'

import { settings } from '../../constants/settings'

import AcresAffectedLineChart from './AcresAffectedLineChart'
import HurricaneWindSpeedLineChart from './HurricaneWindSpeedLineChart'
import MapLegendFire from './MapLegendFire'
import MapLegendHurricane from './MapLegendHurricane'

export default {
  name: 'DisasterLegend',

  components: {
    AcresAffectedLineChart,
    HurricaneWindSpeedLineChart,
    MapLegendFire,
    MapLegendHurricane,
  },

  props: {
    disasterDateEnd: Date,
    disasterDateStart: Date,
  },

  data() {
    return {
      // acresBurned: false,
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
      'headerCollapsed',
      'currentHurricanePosition',
      'currentCyclonePosition',
      'disasterConfig',
    ]),
    ...mapGetters([
      'isochronesColorScale',
      'focusedPlace',
      'disasterType',
      'acresBurnedTimeseries',
      'hurricaneWindSpeedTimeseries',
      'cycloneWindSpeedTimeseries',
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
    isochrones() {
      return this.isochronesData[this.focusedPlace?.properties?.GEOID]
    },
    isochronesRange() {
      if (!this.isochrones) return []

      return this.isochrones.features.map(f => f.properties['contour'])
        .sort((a, b) => d3.descending(a, b))
    },
    isochronesTicks() {
      if (!this.isochrones) return []

      return this.isochronesRange.map(d => `${d} min`)
    },

    acresBurned() {
      const date = dayjs(this.selectedDateTime).format("YYYYMMDD")
      const acres = this.acresBurnedTimeseries?.[date]
      return acres ? d3.format(",.0f")(acres) : "N/A"
    },

    windSpeed() {
      return this?.currentHurricanePosition ? this.currentHurricanePosition?.properties?.["maxWindMph"] : this.currentCyclonePosition?.properties?.["maxWindMph"]
    },

    windSpeedFormatted() {
      if (this.windSpeed) {
        return this?.disasterConfig?.type === 'cyclone' ? `${d3.format(",.0f")(this.windSpeed)} kph` : `${d3.format(",.0f")(this.windSpeed)} mph`
      } else return "N/A"
    },

    windCategory() {
      return this?.currentHurricanePosition ? settings.getHurricaneCategory(this.windSpeed) : settings.getCycloneCategory(this.windSpeed)
    },

    windDamage() {
      return this.windCategory?.damage || "N/A"
    },

    windCategorySpeed() {
      return this.windCategory?.windSpeed || "N/A"
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
    vulnerabilityMetricSelected(selected) {
      this.setVulnerabilityMetric(selected)
    },
  },

  methods: {
    ...mapMutations([
      'setVulnerabilityMetric',
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
  overflow: hidden;
  max-height: 100vh;
  transition: max-height 0.2s ease;

  &.collapsed {
    max-height: 0px;
  }
}

.isochrones-legend {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 1.5em;

  .isochrones-title {
    margin: 0 !important;
    padding-right: 10px;
  }

  .isochrones-legend-container {
    display: flex;
    flex-direction: row;
    align-items: center;

    margin-right: 10px;
    &:last-child {
      margin-right: 0px;
    }
  }
  .isochrones-labels {
    margin: 2px 0 2px 2px;
  }
  .isochrones-number {
    text-align: center;
    font-size: 12px;
  }
  .isochrones-bar {
    width: 20px;
    height: 13px;
    text-align: center;
  }
}

.section {
  margin-bottom: 10px;

  .title {
    text-align: left;
    font-weight: bold;
    font-size: 14px;
    line-height: 17px;
    color: #000;
    margin: 1em 0 0.5em 0;
  }

  .data-source {
    margin: 0;
    font-size: 12px;
    color: #878787;
    text-align: left;
    margin-top: 4px;
  }

  &.bottom-border {
    padding-bottom: 10px;
    border-bottom: 1px solid #D8D8D8;
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

.date-label {
  font-size: 12px;
  color: #878787;
}


.legend-item {
  display: flex;
  align-items: center;

  div {
    font-size: 12px;
  }
}

.legend-image {
  height: 22px;
  margin-right: 6px;
}
</style>
