import _ from 'underscore'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import * as turf from '@turf/turf'

import { helpers } from '../helpers'

export const cycloneTracksLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
        // if not hurricane, label as cyclone and use cyclone data
        let url = `${disasterBaseUrlData}/pdc/cyclone-tracks.geojson`
        let label = "Cyclone tracks"
        
        let forecastCycloneTracks = await helpers.fetchJson(url, () => {
          store.commit('bumpLoadProgress', { loadLabel: label })
        })
        store.commit('bumpLoadProgress', { loadLabel: label, complete: true })
        //var type = "Cyclone"

        forecastCycloneTracks.features.forEach(f => {
            f.properties.advisoryDate = dayjs(f.properties['ADVDATE']).toDate()
            f.properties.maxWindMph = f.properties['MAXWIND']
      })

      forecastCycloneTracks.features = _.sortBy(forecastCycloneTracks.features, f => f.properties.advisoryDate)

      // Grab the first hurricane position from every forecast -- these are the actual recorded hurricane locations
      let tracksByForecast = _.groupBy(forecastCycloneTracks.features, f => f.properties['ADVISNUM'])
      let historicCyclonePositions = turf.featureCollection(
        Object.values(tracksByForecast).map(positions => positions[0])
      )
      historicCyclonePositions.features = _.sortBy(historicCyclonePositions.features, f => f.properties.advisoryDate)

      historicCyclonePositions.features.forEach(f => {
        f.properties.maxWindMph = f.properties['MAXWIND']
      })

      return { forecastCycloneTracks, historicCyclonePositions }
    } catch (e) {
      console.error(`error loading storm tracks: ${e}`);
      const forecastCycloneTracks = turf.featureCollection([])
      const historicCyclonePositions = turf.featureCollection([])
      return { forecastCycloneTracks, historicCyclonePositions }
    }
  }

}
