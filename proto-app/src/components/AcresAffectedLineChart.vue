<template>
  <LineChart
    :data="this.data"
    :height="this.height"
    :width="this.width"
    :xPadding="10"
    :yPadding="10"
    :dateFormat="'YYYYMMDD'"
    :numTicks="this.numTicks"
    :displayYTicks="this.maxType === 'local' ? true : chartIndex === 0"
    :yTicks="this.yTicks"
    :color="'#EA3323'"
    :yMin="0"
    :yMax="this.maxValue === 0 ? 100 : this.maxValue"
    :displayZeroLine="true"
    :customMinDate="this.disasterDateStart"
    :customMaxDate="this.disasterDateEnd"
    :capMaxDateToDay="true"
    :gradientStops="[
      { offset: '0%', stopColor: '#EA3323', stopOpacity: '0.5' },
      { offset: '100%', stopColor: '#D8D8D8', stopOpacity: '0.3' }
    ]"
    :onDateChange="(dayjsDate) => this.$store.commit('setSelectedDateTime', dayjsDate.toDate())"
    :circleRadius="this.circleRadius"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import * as d3 from 'd3'

import { settings } from '../../constants/settings'

import LineChart from './LineChart'

export default {
  props: {
    data: Object,
    height: Number,
    width: Number,
    numTicks: Number,
    circleRadius: Number,
    maxValueCustom: Number,
    maxType: String,  // global (all charts), local (this chart), or percentage
    chartIndex: Number,
  },

  components: {
    LineChart,
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapGetters([
      'acresBurnedTimeseries',
      'disasterDateStart',
      'disasterDateEnd',
    ]),
    ...mapState([
    ]),
    d3() {
      return d3
    },
    maxValueGlobal() {
      if (!this.acresBurnedTimeseries) return null
      return this.d3.max(Object.values(this.acresBurnedTimeseries))
    },
    maxValueLocal() {
      if (!this.data) return null
      return this.d3.max(Object.values(this.data))
    },
    maxValue() {
      if (this.maxType === 'percentage') return 1
      if (this.maxValueCustom) return this.maxValueCustom
      return this.maxType === 'local' ? this.maxValueLocal : this.maxValueGlobal
    },
    yTicks() {
      const nearestMax = this.maxValue * 0.9
      if (this.maxType === 'percentage') return [ { label: "100%", value: 0.9 } ]
      if (nearestMax === 0) return [ { label: "0", value: 10 } ]
      return [ { label: `${d3.format(",.2s")(this.maxValue)} acres`, value: nearestMax } ]
    },
  },
}
</script>

<style lang="css" scoped>
</style>
