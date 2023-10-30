import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import _ from 'underscore'
import { helpers } from '../helpers'

import { settings } from '../../constants/settings'

// layer containing the difference between two consecutive days of fire,
// so we can render the new burnt area as a fill
export const firePerimeterDifferenceLayer = {

  async loadData(store, disasterBaseUrlData) {
    try {
      const data = await helpers.fetchJson(`${disasterBaseUrlData}/spatial-data/disaster-perimeters/perimeters-difference.geojson`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'Fire perimeter deltas' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'Fire perimeter deltas', complete: true })

      // Parse perimeter dates
      data.features.forEach(f => {
        f.date = dayjs(f.properties['YYYYMMDD'], 'YYYYMMDD').toDate()
      })

      // Sort by date
      data.features = _.sortBy(data.features, f => f.date)

      await helpers.loadMapboxImage(store.state.map, 'img/fire-diff.png', 'fire-diff')

      return data
    } catch (e) {
      console.error(`error loading fire perimeter difference: ${e}`);
      return turf.featureCollection([])
    }
  },

  addLayer(map, data, initialDate) {
    map.addSource('fire-perimeter-difference', {
      'type': 'geojson',
      'data': data
    })

    map.addLayer({
      'id': 'fire-perimeter-difference',
      'type': 'fill',
      'source': 'fire-perimeter-difference',
      'paint': {
        'fill-pattern': 'fire-diff',
      }
    })
  }

}
