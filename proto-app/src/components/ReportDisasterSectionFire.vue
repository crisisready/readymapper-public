<template>
  <div>
    <div class="chunk">
      <div class="chunk-title">Fire Perimeter as of {{ dateHeader }}<b>*</b></div>
      <!---<div class="chunk-subtitle">Latest new fire growth on {{ latestNewFirePerimeterGrowth }}</div> -->
      <div style="display: flex;">
        <img class="map-img" v-bind:style="reportMapImagesStyle" :src="reportMapViews['disaster']" />
        <div class="map-legend">
          <MapLegendFire />
          <p class="map-legend-subtitle"><b>*Note:</b> The fire perimeter data was last updated on  {{ latestNewFirePerimeterGrowth }}. It may not represent the perimeter's current status as of {{ dateHeader }}</p>
        </div>
      </div>
    </div>
    <div class="chunk">
      <div class="chunk-title">Acres Burned as of {{ dateHeader }}</div>
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="acresAffectedColumns"
        :rows="acresAffectedRows"
      />
    </div>

    <div class="chunk">
      <div class="chunk-title">Acres Burned Over Time</div>
      <!-- disaster -->
      <h5 class="chunk-subtitle">{{ selectedDisasterName }}</h5>
      <div class="line-chart-container">
        <div style="width: 150px;" class="line-chart-wrapper">
          <AcresAffectedLineChart
            :data="this.acresBurnedTimeseries"
            :height="80"
            :width="130"
            :circleRadius="2"
            :numTicks="4"
            :chartIndex="0"
            :maxType="'global'"
          />
        </div>
      </div>

      <!-- counties -->
      <h5 class="chunk-subtitle">Counties</h5>
      <div class="line-chart-container">
        <div style="width: 150px;" class="line-chart-wrapper" v-for="(dataObj, index) in acresAffectedTimeseriesCounties" :key="index">
          <AcresAffectedLineChart
            :data="dataObj.data"
            :height="80"
            :width="130"
            :circleRadius="2"
            :numTicks="4"
            :chartIndex="index"
            :maxType="'percentage'"
            :maxValueCustom="this.getMaxValueFromTimeseries(this.acresAffectedTimeseriesCounties)"
          />
          <p>{{dataObj.polygon_name}}</p>
        </div>
      </div>

      <!-- places -->
      <div v-if="reportPlaces?.length">
        <h5 class="chunk-subtitle">Places</h5>
        <div class="line-chart-container">
          <div style="width: 150px;" class="line-chart-wrapper" v-for="(dataObj, index) in acresAffectedTimeseriesPlaces" :key="index">
            <AcresAffectedLineChart
              :data="dataObj.data"
              :height="80"
              :width="130"
              :circleRadius="2"
              :numTicks="4"
              :chartIndex="index"
              :maxType="'percentage'"
              :maxValueCustom="this.getMaxValueFromTimeseries(this.acresAffectedTimeseriesPlaces)"
            />
            <p>{{dataObj.polygon_name}}</p>
          </div>
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
  import { convertArea } from '@turf/helpers'

  import { settings } from '../../constants/settings'

  import ReportTable from './ReportTable'
  import AcresAffectedLineChart from './AcresAffectedLineChart'
  import MapLegendFire from './MapLegendFire'

  export default {
    name: 'ReportDisasterSectionFire',

    components: {
      ReportTable,
      AcresAffectedLineChart,
      MapLegendFire,
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
        'currentFirePerimeter',
        'latestNewFirePerimeterGrowth',
        'acresBurnedTimeseries',
        'getPlaceOverlapWithPolygonArea',
        'acresBurnedByPlaceTimeseries',
      ]),
      ...mapState([
        'selectedDateTime',
        'reportMapViews',
      ]),

      acresAffectedColumns() {
        return ['Location', 'Acres Burned', 'Percentage Burned ▼', '1 Day Change', '7 Day Change']
      },

      acresAffectedRows() {
        const generateAcresBurnedRows = (features, placeType) => {
          return features.map(feature => {
            const {acres, percentage} = this.getPlaceOverlapWithPolygonArea(feature, this.currentFirePerimeter)
            const timeseries = this.acresAffectedTimeseriesPlaces.concat(this.acresAffectedTimeseriesCounties).find(d => d.polygon_name === feature?.properties['NAME'])
            const formatPctChange = (number) => {
              if (!isFinite(number)) return "N/A"
              return `${number > 0 ? "+" : ""}${d3.format(",.0%")(number)}`
            }

            return {
              title: feature?.properties['NAME'],
              placeType: placeType,
              values: [
                acres >= 0 ? d3.format(",.0f")(acres) : "N/A",
                percentage >= 0 ? d3.format(",.0%")(percentage) : "N/A",
                !isNaN(timeseries?.oneDayChange) ? formatPctChange(timeseries.oneDayChange) : "N/A",
                !isNaN(timeseries?.sevenDayChange) ? formatPctChange(timeseries.sevenDayChange) : "N/A",
              ],
              rawValues: [percentage]
            }
          })
          .sort((a, b) => {
            return d3.descending(a.rawValues[0], b.rawValues[0])
          })
        }
        const counties = generateAcresBurnedRows(this.reportCounties, 'counties')
        const places = generateAcresBurnedRows(this.reportPlaces, 'places')

        const currentPerimeterArea = this.currentFirePerimeter
          ? convertArea(turf.area(this.currentFirePerimeter), 'meters', 'acres')
          : null
        return [
          {title: this.selectedDisasterName, values: [
            currentPerimeterArea ? d3.format(",.0f")(currentPerimeterArea) : "N/A",
            "-"
          ]},
          ...counties,
          ...places,
        ]
      },

      acresAffectedTimeseriesCounties() {
        return this.calculateAcresBurnedTimeseries(this.reportCounties)
      },

      acresAffectedTimeseriesPlaces() {
        return this.calculateAcresBurnedTimeseries(this.reportPlaces)
      },

    },

    methods: {
      ...mapMutations([
      ]),
      calculateAcresBurnedTimeseries(places) {
        const currentDate = dayjs(this.selectedDateTime).format('YYYYMMDD')
        const oneDayAgo = dayjs(this.selectedDateTime).subtract(1, 'day').format('YYYYMMDD')
        const sevenDaysAgo = dayjs(this.selectedDateTime).subtract(7, 'day').format('YYYYMMDD')

        const timeseries = places
          .map(feature => {
            const timeseries = this.acresBurnedByPlaceTimeseries(feature, 'percentage')
            return {
              polygon_name: feature?.properties['NAME'],
              data: timeseries,
              max: d3.max(Object.values(timeseries)),
              current: timeseries[currentDate],
              oneDayAgo: timeseries[oneDayAgo],
              sevenDaysAgo: timeseries[sevenDaysAgo],
              oneDayChange: (timeseries[currentDate] - timeseries[oneDayAgo]) / timeseries[oneDayAgo],
              sevenDayChange: (timeseries[currentDate] - timeseries[sevenDaysAgo]) / timeseries[sevenDaysAgo],
            }
          })
        return timeseries
          .sort((a, b) => {
            return d3.descending(a.max, b.max)
          })
      },
      getMaxValueFromTimeseries(timeseries) {
        return d3.max(timeseries.map(d => d.max))
      }
    }
  }
</script>

<style lang="scss">
</style>
