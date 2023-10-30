<template>
  <section class="section movement">
    <div class="chunk">
      <div class="main-section-title">Movement</div>

      <div class="chunk-title">{{ movementDataSelected?.name }} on {{ dateHeader }}</div>
      <div style="display: flex;">
        <img class="map-img" v-bind:style="reportMapImagesStyle" :src="reportMapViews['movement']" />
        <div class="map-legend">
          <p class="map-legend-title">{{ movementDataSelected?.source }}</p>
          <PopDensityLegendReport />
          <p class="map-legend-subtitle">{{ movementDataSelected?.name }} on {{dateHeader}} with place selections.</p>
        </div>
      </div>
    </div>

    <!-- hide table for now if using Mapbox data -->
    <div class="chunk" v-if="populationDensityRows && mobilityMode === 'facebook'">
      <div class="chunk-title">Population Density on {{ dateHeader }}</div>
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="populationDensityColumns"
        :rows="populationDensityRows"
      />
    </div>

    <div class="chunk" v-if="popDensityTimeseries">
      <div class="chunk-title">{{ movementDataSelected?.name }} Over Time</div>
      <div class="line-chart-container">
        <div style="width: 150px;" class="line-chart-wrapper" v-for="(dataObj, index) in popDensityTimeseries" :key="index">
          <PopDensityLineChart
            :data="dataObj.data"
            :height="80"
            :width="130"
            :circleRadius="2"
            :numTicks="4"
            :displayYTicks="index === 0"
          />
          <p>{{dataObj.polygon_name}}</p>
        </div>
      </div>
    </div>

    <!-- <div class="chunk">
      <div class="chunk-title">Recorded Population Flows</div>
    </div> -->

    <div class="chunk">
      <ReportNotes :id="'movement'"/>
    </div>
  </section>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  import dayjs from 'dayjs'
  import utc from 'dayjs/plugin/utc'
  import timezone from 'dayjs/plugin/timezone'
  import * as d3 from 'd3'

  import { settings } from '../../constants/settings'

  import ReportTable from './ReportTable'
  import PopDensityLineChart from './PopDensityLineChart'
  import PopDensityLegendReport from './PopDensityLegendReport'
  import ReportNotes from './ReportNotes'

  dayjs.extend(utc)
  dayjs.extend(timezone)

  export default {
    name: 'ReportMovementSection',

    components: {
      ReportTable,
      PopDensityLineChart,
      PopDensityLegendReport,
      ReportNotes,
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
        'selectedPopDensityTimeseriesPlaces',
        'selectedPopDensityTimeseriesCounties',
        'movementDataSelected',
      ]),
      ...mapState([
        'selectedDateTime',
        'regionTypeSelection',
        'selectedPlaceGeoids',
        'reportNotes',
        'selectedCountyFips',
        'counties',
        'reportMapViews',
        'mobilityMode',
      ]),

      populationDensityColumns() {
        return ['Location', 'Baseline Pop.', 'Current Crisis Pop.', 'Pop. Density vs. Baseline ▼', 'Confidence Level']
      },

      populationDensityRows() {
        const countyRows = this.generatePopulationDensityRows(this.selectedPopDensityTimeseriesCounties, 'counties')
        if (this.regionTypeSelection === "counties") { return countyRows }

        const placesRows = this.generatePopulationDensityRows(this.selectedPopDensityTimeseriesPlaces, 'places')

        if (Array.isArray(countyRows)) {
          return [
            ...countyRows,
            ...placesRows,
          ]
        }
        return placesRows
      },

      popDensityTimeseries() {
        const timeseries = this.regionTypeSelection === "counties"
          ? this.selectedPopDensityTimeseriesCounties
          : this.selectedPopDensityTimeseriesPlaces

        const currentDate = dayjs(this.selectedDateTime).format('YYYY-MM-DD_HHmm')
        for (const t of timeseries) {
          t['current'] = t.data?.[currentDate]
        }
        return timeseries
          .sort((a, b) => {
            return d3.descending(a.current?.percent_change, b.current?.percent_change)
          })
      },
    },

    methods: {
      ...mapMutations([
      ]),
      generatePopulationDensityRows(timeseries, placeType) {
        if (!timeseries?.length) return null
        const rows = timeseries.map(series => {
          const currentDate = dayjs(this.selectedDateTime).tz('US/Pacific').format('YYYY-MM-DD_HHmm')
          const current = series.data[currentDate]
          const percentChange = current?.percent_change / 100
          const nBaseline = current?.n_baseline
          const currentPop = (percentChange * nBaseline) + nBaseline

          return {
            title: series?.polygon_name,
            placeType: placeType,
            values: [
              nBaseline ? d3.format(".0f")(nBaseline) : 'N/A',
              currentPop ? d3.format(".0f")(currentPop) : 'N/A',
              percentChange ? d3.format(".0%")(percentChange) : 'N/A',
              'N/A'  // TODO: need to know how to calculate
            ],
            rawValues: [
              nBaseline,
              currentPop,
              percentChange,
            ]
          }
        })
        .sort((a, b) => {
          return d3.descending(a.rawValues[2], b.rawValues[2])
        })
        return rows
      },
    }
  }
</script>

<style lang="scss">
</style>