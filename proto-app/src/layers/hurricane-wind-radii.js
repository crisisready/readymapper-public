import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const hurricaneWindRadiiLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
      let url = `${disasterBaseUrlData}/noaa/hurricane-wind-radii.geojson`
      let label = "Hurricane wind radii"
      let data = await helpers.fetchJson(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })
      return data
    } catch (e) {
      console.error(`error loading hurricane wind radii: ${e}`);
      return turf.featureCollection([])
    }
  },

  addLayer(map, data) {
  }

}