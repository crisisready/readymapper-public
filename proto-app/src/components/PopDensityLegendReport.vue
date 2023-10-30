<template lang="html">
  <div>
    <div class="fb-mobility-legend">
      <div className="color-legend">
        <div v-for="(stop, i) in popDensityStops" :key="stop" class="color-key">
          <div :style="{'background': popDensityColorScale(stop)}" className="color-bar">
            &nbsp;
          </div>
          <span>
            {{popDensityStopLabels[i]}}
          </span>
        </div>
      </div>
      <div className="color-bar-labels">

      </div>
    </div>
    <div v-if="mobilityDataNotes" style="font-size: 12px;">
      <p>{{ mobilityDataNotes }}</p>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import { settings } from '../../constants/settings'

export default {
  name: 'PopDensityLegendReport',

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
    },
  }
}
</script>

<style lang="scss" scoped>
.fb-mobility-legend {
  position: relative;
}

.color-legend {
  display: flex-column;
  align-items: center;

  span {
    font-size: 12px;
    text-align: center;
  }
}

.color-key {
  display: flex;
}

.color-bar {
  width: 20px;
  height: 12px;
  margin: 2px 8px 2px 0;
}
</style>
