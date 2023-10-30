<template>
  <LineChart
    :data="this.data"
    :height="this.height"
    :width="this.width"
    :xPadding="10"
    :yPadding="10"
    :dateFormat="'YYYY-MM-DD HH:mm:ss'"
    :numTicks="this.numTicks"
    :displayYTicks="this.displayYTicks"
    :pointColor="this.powerOutageColorScale"
    :color="'#0F2F80'"
    :yMin="0"
    :yMax="1"
    :yTicks="this.powerOutageYTicks"
    :displayZeroLine="true"
    :customMinDate="this.disasterDateStart"
    :customMaxDate="this.disasterDateEnd"
    :customCurve="d3.curveStepAfter"
    :gradientStops="[
      { offset: '0%', stopColor: 'rgb(15, 47, 128)', stopOpacity: '0.33' },
      { offset: '100%', stopColor: 'rgb(15, 47, 128)', stopOpacity: '0' }
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
    displayYTicks: Boolean,
    circleRadius: Number,
  },

  components: {
    LineChart,
  },

  data() {
    return {
      powerOutageColorScale: settings.powerOutageColorScale,
      powerOutageYTicks: [
        { label: '100%', value: 0.9 },
        { label: '0%', value: 0.1 }
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
    }
  },
}
</script>

<style lang="css" scoped>
</style>
