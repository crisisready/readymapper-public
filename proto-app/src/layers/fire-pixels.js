import * as turf from '@turf/turf'
import {
  helpers
} from '../helpers'

export const firePixelsLayer = {

  async loadData(store, disasterBaseUrlData) {
    try {
      const data = await helpers.fetchJson(`${disasterBaseUrlData}/spatial-data/fire/disaster-pixels/data.geojson`, () => {
        store.commit('bumpLoadProgress', {
          loadLabel: 'Fire pixels'
        })
      })
      store.commit('bumpLoadProgress', {
        loadLabel: 'Fire pixels',
        complete: true
      })

      // Do not display MODIS data
      const featuresFiltered = data.features.filter(f => f.properties.instrument !== 'MODIS')
      const dataFiltered = {
        ...data,
        features: featuresFiltered
      }

      return dataFiltered
    } catch (e) {
      console.error(`error loading fire pixels: ${e}`);
      return turf.featureCollection([])
    }
  },

  addLayer(map, data, layerFilter, layerFill) {
    const layerId = 'fire-pixels'
    const layerType = 'fill'

    map.addSource(layerId, {
      'type': 'geojson',
      'data': data
    })

    map.addLayer({
      'id': `${layerId}-${layerType}`,
      'type': layerType,
      'source': layerId,
      'paint': {
        'fill-color': layerFill,
        'fill-opacity': 1,
        'fill-antialias': false,
      },
      'layout': {
        'fill-sort-key': ['get', 'date_time_unix'],
      },
      'filter': layerFilter
    })

  }

}
