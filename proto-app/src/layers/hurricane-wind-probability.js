import * as turf from '@turf/turf'
import dayjs from 'dayjs'
import _ from 'underscore'
import { helpers } from '../helpers'

export const hurricaneWindProbabilityLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
      let url = `${disasterBaseUrlData}/noaa/wind-probabilities.geojson`
      let label = "Hurricane wind probability"
      let data = await helpers.fetchJson(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

      // Parse perimeter dates
      data.features.forEach(f => {
        f.date = dayjs(f.properties['dt'], 'YYYY-MM-DD hh:mm').toDate()
      })

      // Sort by date
      data.features = _.sortBy(data.features, f => f.date)

      return data
    } catch (e) {
      console.error(`error loading hurricane wind probability: ${e}`);
      return turf.featureCollection([])
    }
  },

  addLayer(map, data) {
  }

}