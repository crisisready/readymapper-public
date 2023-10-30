<template>
  <div></div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import * as turf from '@turf/turf'

import { getIsochroneForPlace } from './utils/getIsochroneForPlace'

export default {
  name: 'IsochronesLayerController',

  computed: {
    ...mapState([
      'map',
      'currentTab',
      'selectedPlaceGeoids',
      'isochronesData',
      'disasterConfig',
    ]),
    ...mapGetters([
      'selectedPlaces',
      'focusedPlace',
    ])
  },

  watch: {
    async focusedPlace() {
      await this.setIsochronesLayerData()
    },
    async currentTab() {
      await this.setIsochronesLayerData()
    },
  },

  methods: {
    ...mapMutations([
      'setIsochronesData',
    ]),

    layerExists(layerId) {
      return this.map?.getLayer(layerId)
    },

    async setIsochronesLayerData() {
      // reset
      this.map?.getSource('isochrones').setData(turf.featureCollection([]))

      if (this.currentTab === 'infrastructure' && this.selectedPlaces?.length && !this.disasterConfig?.isInternational) {
        const placeId = this.focusedPlace?.properties?.GEOID
        const data = await getIsochroneForPlace(this.focusedPlace, placeId, this.isochronesData, this.setIsochronesData)

        if (placeId === this.focusedPlace?.properties?.GEOID) {
          // we do this check because isochrones take a while to load,
          // so if user has clicked on a bunch of places he'll get the right one
          // to display, fixing this race condition
          this.map?.getSource('isochrones').setData(data)
        }
      }
    },
  }
}
</script>


<style lang="scss" scoped>
</style>
