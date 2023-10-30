<template>
  <div
    :class="`map-nav-overlay
      ${navbarOpen ? 'nav-open' : 'nav-closed'}
      ${pickMapViewScreen ? 'hidden' : ''}
    `"
  >

    <div class="flex-section">

      <div class="map-nav-section">
        <DisasterSelection />
        <DisasterLegend />
      </div>

      <div class="map-nav-section bottom-section">
        <TabSelection />
        <Legend
          :disasterDateEnd="disasterDateEnd"
          :disasterDateStart="disasterDateStart"
        />
        <RegionTypeSelection />
        <SelectionSummary />
      </div>

      <div class="map-nav-footer" />

    </div>

  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import Legend from '../components/Legend'
import DisasterLegend from '../components/DisasterLegend'
import SelectionSummary from '../components/SelectionSummary'
import GenerateReportButton from '../components/GenerateReportButton'
import RegionTypeSelection from './RegionTypeSelection'
import DisasterSelection from './DisasterSelection'
import TabSelection from './TabSelection'

import { settings } from '../../constants/settings'

export default {
  name: 'MapMenu',

  components: {
    Legend,
    DisasterLegend,
    SelectionSummary,
    RegionTypeSelection,
    TabSelection,
    DisasterSelection,
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'currentTab',
      'navbarOpen',
      'pickMapViewScreen',
    ]),
    ...mapGetters([
      'disasterDateStart',
      'disasterDateEnd',
    ])
  },

  watch: {

  },

  methods: {
    ...mapMutations([
    ]),
  }
}
</script>

<style lang="scss" scoped>
.nav-open {
  left: 231px;
}

.nav-closed {
  left: 81px;
}

.map-nav-overlay {
  position: absolute;
  z-index: 1;
  top: 20px;
  bottom: 0;
  width: 400px;
  pointer-events: none;

  .flex-section {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .map-nav-section {
    position: relative;
    background: #fff;
    box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
    border-radius: 6px;
    margin-bottom: 15px;
    text-align: left;
    pointer-events: all;

    &.bottom-section {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    &:last-child {
      margin-bottom: 0px;
    }
  }

  .overflow {
    overflow-y: auto;
    overflow-x: hidden;
    pointer-events: all;
  }

  .map-nav-footer {
    height: 26px;
    background: transparent;
  }
}

.hidden {
  visibility: hidden;
}
</style>
