<template>
  <div>
    <div class="chunk">
      <div class="chunk-title">Storm Path on {{ dateHeader }}</div>

      <div style="display: flex;">
        <img class="map-img" v-bind:style="reportMapImagesStyle" :src="reportMapViews['disaster']" />
        <div class="map-legend">
          <MapLegendHurricane />
          <p class="map-legend-subtitle">On {{ dateHeader }} with place selections.</p>
        </div>
      </div>
    </div>

    <div class="chunk">
      <div class="chunk-title">Wind Speed Over Time</div>
      <h5 class="chunk-subtitle">{{ selectedDisasterName }}</h5>
      <div class="line-chart-container"  v-if="disasterType === 'hurricane'">
        <div style="width: 150px;" class="line-chart-wrapper">
          <HurricaneWindSpeedLineChart
            :data="this.hurricaneWindSpeedTimeseries"
            :height="80"
            :width="130"
            :circleRadius="2"
            :numTicks="4"
            :chartIndex="0"
            :maxType="'global'"
          />
        </div>
      </div>
      <div class="line-chart-container"  v-if="disasterType === 'cyclone'">
        <div style="width: 150px;" class="line-chart-wrapper"> 
          <HurricaneWindSpeedLineChart
            :data="this.cycloneWindSpeedTimeseries"
            :height="80"
            :width="130"
            :circleRadius="2"
            :numTicks="4"
            :chartIndex="0"
            :maxType="'global'"
          />
        </div>
      </div>

    </div>
  </div>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  import dayjs from 'dayjs'
  import * as d3 from 'd3'
  import * as turf from '@turf/turf'

  import { settings } from '../../constants/settings'

  import ReportTable from './ReportTable'
  import HurricaneWindSpeedLineChart from './HurricaneWindSpeedLineChart'
  import MapLegendHurricane from './MapLegendHurricane'

  export default {
    name: 'ReportDisasterSectionHurricane',

    components: {
      HurricaneWindSpeedLineChart,
      MapLegendHurricane,
    },

    props: {
      dateHeader: String,
    },

    data() {
      return {
        reportMapImagesStyle: settings.reportMapImages
      }
    },

    computed: {
      ...mapGetters([
        'selectedDisasterName',
        'reportPlaces',
        'reportCounties',
        'disasterType',
        'hurricaneWindSpeedTimeseries',
        'cycloneWindSpeedTimeseries',
      ]),
      ...mapState([
        'selectedDateTime',
        'reportMapViews',
        'historicHurricanePositions',
        'hurricaneWindRadii',
        'historicCyclonePositions',
        'cycloneWindRadii',
        'disasterConfig'
      ]),

    },

    methods: {
      ...mapMutations([
      ]),
    }
  }
</script>

<style lang="scss">
</style>
