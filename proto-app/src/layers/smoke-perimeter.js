import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import _ from 'underscore'
import { helpers } from '../helpers'

export const smokePerimeterLayer = {
	
  async loadData(store, disasterBaseUrlData) {
    try {
      let url = `${disasterBaseUrlData}/noaa/smoke-perimeters.geojson`
      let label = "Smoke Perimeter"
      let data = await helpers.fetchJson(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

      // Filter features by heavy smoke density
      let filteredFeatures = data.features.filter(f => f.properties['Density'] === 'Heavy');
      
      // Parse perimeter dates
      filteredFeatures.forEach(f => {
        let date = dayjs(f.properties['Date'], 'YYYY-MM-DD HH:mm').toDate();
      })

      // Replace data.features with the filtered and processed features
      data.features = filteredFeatures;
      
      // Sort by date
      data.features = _.sortBy(data.features, f => f.startDate)

      await helpers.loadMapboxImage(store.state.map, 'img/smoke.png', 'smoke')

      return data

    } catch (e) {
      console.error(`error loading smoke perimeters: ${e}`);
      return turf.featureCollection([])
    }
  },
  
  addLayer(map, data) {

    map.addSource('smoke-perimeter', {
      'type': 'geojson',
      'data': data
    })

    map.addLayer({
      'id': 'smoke-fill',
      'type': 'fill',
      'source': 'smoke-perimeter',
      'paint': {
        'fill-pattern': 'smoke',
        'fill-opacity': 1
      }
    })
  }
}
