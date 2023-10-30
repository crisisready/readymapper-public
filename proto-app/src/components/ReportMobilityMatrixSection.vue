<template>
  <section class="section mobilityMatrix">
    <div class="chunk">
      <div class="main-section-title">Mobility Matrix</div>

      <div class="chunk-title"></div>
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
    <div class="chunk" v-if="mobilityMatrixRows && mobilityMode === 'facebook'">
      <div class="chunk-title">Summarized Origin-Destination Matrix until {{dateHeader}}</div> 
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="mobilityMatrixColumns"
        :rows="mobilityMatrixRows"
      />
    </div>

    <div class="chunk">
      <ReportNotes :id="'mobilityMatrix'"/>
    </div>
  </section>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  import dayjs from 'dayjs'
  import * as d3 from 'd3'

  import { settings } from '../../constants/settings'

  import ReportTable from './ReportTable'
  import PopDensityLegendReport from './PopDensityLegendReport'
  import ReportNotes from './ReportNotes'

  export default {
    name: 'ReportMobilityMatrixSection',

    components: {
      PopDensityLegendReport,
      ReportTable,
      ReportNotes,
    },

    props: {
      dateHeader: String,
      lastUpdatedDateTime: String
    },

    data() {
      return {
        reportMapImagesStyle: settings.reportMapImages
      }
    },

    computed: {
      ...mapGetters([
        'movementDataSelected',
        'selectedMobilityMatrixCounties',
        'selectedMobilityMatrixPlaces',
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

      mobilityMatrixColumns() {
        return ['Origin - Destination', 'Baseline Pop.', 'Current Crisis Pop.', 'Pop. Density vs. Baseline ▼']
      },

      mobilityMatrixRows() {
        const countyRows = this.generateMobilityMatrixRows(this.selectedMobilityMatrixCounties, 'counties')
        if (this.regionTypeSelection === "counties") { return countyRows }

        const placesRows = this.generateMobilityMatrixRows(this.selectedMobilityMatrixPlaces, 'places')

        if (Array.isArray(countyRows)) {
          return [
            ...countyRows,
            ...placesRows,
          ]
        }
        return placesRows
      },

      mobilityMatrix() {
        const timeseries = this.regionTypeSelection === "counties"
          ? this.selectedMobilityMatrixCounties
          : this.selectedMobilityMatrixPlaces

        const currentDate = dayjs(this.selectedDateTime).format('YYYY-MM-DD')
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
      generateMobilityMatrixRows(timeseries, placeType) {
        if (!timeseries?.length) return null

        const rows = []
        const currentDate = dayjs(this.selectedDateTime).format('YYYY-MM-DD')

        for (const series of timeseries) {
          const current = series.data[currentDate]
          if (!current) continue

          for (const f of Object.values(current)) {
            const originName = decodeURIComponent(encodeURIComponent(f.origin_polygon));
            const destinationName = decodeURIComponent(encodeURIComponent(f.destination_polygon));
            rows.push({
              title: `${originName} - ${destinationName}`,
              placeType: placeType,
              values: [
                f.n_baseline ? d3.format(".0f")(f.n_baseline) : 'N/A',
                f.n_crisis ? d3.format(".0f")(f.n_crisis) : 'N/A',
                f.percent_change ? d3.format(".0%")(f.percent_change / 100) : 'N/A'
              ],
              rawValues: [
                f.n_baseline,
                f.n_crisis,
                f.percent_change / 100
              ]
            })
          }
        }
        return rows.sort((a, b) => {
          return d3.descending(a.rawValues[2], b.rawValues[2])
        })
      },
    }
  }
</script>

<style lang="scss">
</style>


    
