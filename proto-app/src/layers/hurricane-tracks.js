import _ from 'underscore'
import * as d3 from 'd3'
import dayjs from 'dayjs'
import * as turf from '@turf/turf'

import { helpers } from '../helpers'
import { settings } from '../../constants/settings'

export const hurricaneTracksLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
        let url = `${disasterBaseUrlData}/noaa/hurricane-tracks.geojson`
        let label = "Hurricane tracks"
        let forecastHurricaneTracks = await helpers.fetchJson(url, () => {
          store.commit('bumpLoadProgress', { loadLabel: label })
        })
        store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

        // IMPROVE: should be done in data processing
        const parseADVDATE = (dateString) => {
          // This is possibly the most frustrating date format I have ever encountered
          let [hhmm, A, tz, __, MMM, DD, YYYY] = dateString.split(' ')
          if (hhmm.length === 3) hhmm = '0' + hhmm
          let utcOffsets = {
            'AST': 4,
            'EDT': 4,
            'EST': 5,
            'CDT': 5,
            'CST': 6,
            'MDT': 6,
            'MST': 7,
            'PDT': 7,
            'PST': 8
          }
          let date = dayjs(`${hhmm} ${A} ${MMM} ${DD} ${YYYY}`, 'hhmm A MMM DD YYYY').toDate()

          // Time zone calculation. Blergh.
          let localUTCOffset = date.getTimezoneOffset() / 60
          let targetUTCOffset = utcOffsets[tz]
          date.setUTCHours(date.getUTCHours() - localUTCOffset + targetUTCOffset)

          return date
        }

        forecastHurricaneTracks.features.forEach(f => {
          f.properties.advisoryDate = parseADVDATE(f.properties['ADVDATE'])
          f.properties.maxWindMph = settings.knotToMph(f.properties['MAXWIND'])
        })

        forecastHurricaneTracks.features = _.sortBy(forecastHurricaneTracks.features, f => f.properties.advisoryDate)

        console.log('hurricane date range:', d3.extent(forecastHurricaneTracks.features.map(f => f.properties.advisoryDate)))

        // Grab the first hurricane position from every forecast -- these are the actual recorded hurricane locations
        let tracksByForecast = _.groupBy(forecastHurricaneTracks.features, f => f.properties['ADVISNUM'])
        let historicHurricanePositions = turf.featureCollection(
          Object.values(tracksByForecast).map(positions => positions[0])
        )
        historicHurricanePositions.features = _.sortBy(historicHurricanePositions.features, f => f.properties.advisoryDate)

        historicHurricanePositions.features.forEach(f => {
          f.properties.maxWindMph = settings.knotToMph(f.properties['MAXWIND'])
        })

        return { forecastHurricaneTracks, historicHurricanePositions }
    } catch (e) {
      console.error(`error loading hurricane tracks: ${e}`);
      const forecastHurricaneTracks = turf.featureCollection([])
      const historicHurricanePositions = turf.featureCollection([])
      return { forecastHurricaneTracks, historicHurricanePositions }
    }
  }

}