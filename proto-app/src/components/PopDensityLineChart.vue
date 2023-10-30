<template>
  <LineChart
    :data="this.processedData"
    :height="this.height"
    :width="this.width"
    :xPadding="10"
    :yPadding="10"
    :dateFormat="'YYYY-MM-DD_HHmm'"
    :numTicks="this.numTicks"
    :displayYTicks="this.displayYTicks"
    :color="'#1c1b1c'"
    :pointColor="this.popDensityColorScale"
    :yMin="-75"
    :yMax="75"
    :yTicks="this.popDensityYTicks"
    :displayZeroLine="true"
    :customMinDate="this.disasterDateStart"
    :customMaxDate="this.disasterDateEnd"
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
    displayYTicks: Boolean,
    circleRadius: Number,
  },

  components: {
    LineChart,
  },

  data() {
    return {
      popDensityColorScale: settings.popDensityColorScale,
      popDensityYTicks: [
        { label: '-75%', value: -65 },
        { label: ' 0%', value: 0 },
        { label: '+75%', value: 65 }
      ],
    }
  },

  computed: {
    ...mapGetters([
      'disasterDateStart',
      'disasterDateEnd',
    ]),
    d3() {
      return d3
    },
    processedData() {
      const obj = {}
      Object.keys(this.data).forEach(key => {
        obj[key] = this.data[key]['percent_change']
      })
      return obj
    },
  },
}
</script>

<style lang="css" scoped>
</style>
