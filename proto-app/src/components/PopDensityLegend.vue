<template lang="html">
  <div>
    <div class="fb-mobility-legend">
      <div className="color-bar">
        <div v-for="stop in popDensityStops" :key="stop" :style="{'background': popDensityColorScale(stop)}" class="color-key">
          &nbsp;
        </div>
      </div>
      <div className="color-bar-labels">
        <span v-for="label in popDensityStopLabels" :key="label">
          {{label}}
        </span>
      </div>
    </div>
    <div v-if="mobilityDataNotes" style="font-size: 12px;">
      <p>{{ mobilityDataNotes }}</p>
    </div>
  </div>
</template>

<script>
import { settings } from '../../constants/settings'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'PopDensityLegend',

  props: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'mobilityMode',
    ]),
    ...mapGetters([
      'mobilityDataInfo',
    ]),

    popDensityColorScale() {
      return settings.popDensityColorScale
    },
    popDensityStops() {
      return settings.popDensityStops
    },
    popDensityStopLabels() {
      return settings.popDensityStopLabels
    },
    mobilityDataNotes() {
      return this.mobilityDataInfo?.notes
    }
  }
}
</script>

<style lang="scss" scoped>
.fb-mobility-legend {
  position: relative;
}

.color-bar, .color-bar-labels {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 18px;

  span {
    font-size: 12px;
    text-align: center;
  }
}

.color-bar-labels {
  position: absolute;
  width: 100%;
  height: 18px;
  top: 0px;
  font-weight: 500;
  color: white;

  span {
    width: 25%;
  }
}

.color-key {
  width: 100%;
}
</style>
