import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const hurricaneConeLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
      let url = `${disasterBaseUrlData}/noaa/hurricane-cones.geojson`
      let label = "Hurricane cones"
      let data = await helpers.fetchJson(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

      return data
    } catch (e) {
      console.warn(`Failed to load hurricane cones. Skipping.`);
      return turf.featureCollection([])
    }
  }

}
