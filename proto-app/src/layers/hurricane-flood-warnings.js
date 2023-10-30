import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const hurricaneFloodWarningsLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
      let url = `${disasterBaseUrlData}/noaa/hurricane-flood-warnings.geojson`
      let label = "Hurricane flood warnings"
      let data = await helpers.fetchJson(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

      return data
    } catch (e) {
      console.warn(`Failed to load flood warnings. Skipping.`);
      return turf.featureCollection([])
    }
  },

  addLayer(map, data) {
    // map.addSource('flood-warnings', {
    //   'type': 'geojson',
    //   'data': data
    // })

    // map.addLayer({
    //   'id': 'flood-warnings',
    //   'type': 'fill',
    //   'source': 'flood-warnings',
    //   'paint': {
    //     'fill-color': '#0F2F80',
    //     'fill-opacity': 0.15,
    //   },
    // })
  }

}