import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const cycloneWindRadiiLayer = {
    
  async loadData(disasterBaseUrlData, store) {
    try {
        let url = `${disasterBaseUrlData}/pdc/cyclone-wind-radii.geojson`
        let label = "Cyclone wind radii"
        let data = await helpers.fetchJson(url, () => {
          store.commit('bumpLoadProgress', { loadLabel: label })
        })
        store.commit('bumpLoadProgress', { loadLabel: label, complete: true })
        
      return data
    } catch (e) {
      console.error(`error loading storm wind radii: ${e}`);
      return turf.featureCollection([])
    }
  },

  addLayer(map, data) {
  }

}
