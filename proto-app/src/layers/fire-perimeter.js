import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import _ from 'underscore'
import { helpers } from '../helpers'

export const firePerimeterLayer = {

  async loadData(store, disasterBaseUrlData) {
    try {
      const data = await helpers.fetchJson(`${disasterBaseUrlData}/spatial-data/disaster-perimeters/perimeters.geojson`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'Fire perimeters' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'Fire perimeters', complete: true })

      // Parse perimeter dates
      data.features.forEach(f => {
        f.date = dayjs(String(f.properties['YYYYMMDD']), 'YYYYMMDD').toDate()
      })

      // Sort by date
      data.features = _.sortBy(data.features, f => f.date)

      await helpers.loadMapboxImage(store.state.map, 'img/fire.png', 'fire')

      return data
    } catch (e) {
      console.error(`error loading fire perimeter: ${e}`);
      return turf.featureCollection([])
    }
  },

  addLayer(map, data) {
    map.addSource('fire-perimeter', {
      'type': 'geojson',
      'data': data
    })

    map.addLayer({
      'id': 'fire-perimeter-previous-fill',
      'type': 'fill',
      'source': 'fire-perimeter',
      'paint': {
        'fill-pattern': 'fire',
        'fill-opacity': 0
      }
    })

    map.addLayer({
      'id': 'fire-perimeter-previous-outline',
      'type': 'line',
      'source': 'fire-perimeter',
      'paint': {
        'line-color': '#EA3323',
        'line-opacity': 0,
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.5,
          8, 1,
          10, 2
        ]
      }
    })
  }

}
