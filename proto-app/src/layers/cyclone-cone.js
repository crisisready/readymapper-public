import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const cycloneConeLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
      let url = `${disasterBaseUrlData}/pdc/cyclone-5-day-uncertainty.geojson`
      let label = "Cyclone cones"
      let data = await helpers.fetchJson(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })
      
      return data
    } catch (e) {
      console.warn(`Failed to load cyclone cones. Skipping.`);
      return turf.featureCollection([])
    }
  }

}