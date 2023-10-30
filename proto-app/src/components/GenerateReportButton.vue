<template>
<div :class="`link-button-wrapper ${disabled ? 'isDisabled': ''}`" @click="!pickMapViewScreen ? showPickMapView() : generateReport()">
  <div>
    <button :disabled="disabled" :class="`link-button ${disabled ? 'isDisabled': ''}`">
      {{ pickMapViewScreen ? "View Report" : "Generate Report" }}
    </button>
  </div>
</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import { generateReportMaps } from './utils/generateReportMaps'

export default {
  name: 'GenerateReportButton',

  methods: {
    ...mapMutations([
      'setReportVisible',
      'setReportLoading',
      'setTab',
      'setReportMapViews',
      'setPickMapViewScreen',
    ]),

    showPickMapView() {
      if (this.disabled) return

      this.setPickMapViewScreen(true)
    },

    async generateReport() {
      if (this.disabled) return

      this.setPickMapViewScreen(false)

      this.setReportLoading(true)
      const previousTab = this.$store.state.currentTab

      await generateReportMaps(this.$store.state.disasterConfig, this.$store.state.map, this.setTab, this.setReportMapViews)

      this.setTab(previousTab)
      this.setReportLoading(false)

      // Show the report
      this.showReport()
    },

    showReport() {
      // Go through the router so that the back button closes the report
      this.$router.push({ query: { ...this.$route.query, 'reportVisible': true } })
    }
  },

  computed: {
    ...mapState([
      'regionTypeSelection',
      'disasterConfig',
      'pickMapViewScreen',
    ]),
    ...mapGetters([
      'selectedPlaces',
      'selectedCounties',
    ]),
    selectedLocations() {
      if (this.regionTypeSelection === "counties") { return this.selectedCounties }
      return this.selectedPlaces
    },
    disabled() {
      return !this.selectedLocations?.length
    },
  },

  components: {
  },

  props: {
  }
}
</script>

<style lang="scss" scoped>
.link-button-wrapper {
  position: absolute;
  bottom: 26px;
  right: 32px;
  display: flex;
  width: 240px;
  height: 42px;
  align-items: center;
  justify-content: center;
  background: #EA9014;
  box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
  border-radius: 6px;
  cursor: pointer;
}

.link-button {
  color: #fff;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 18px;
  font-weight: bold;
  width: 100%;
  background: none;
  border: none;
}

.isDisabled {
  background: #666;
  cursor: auto;
}
</style>
