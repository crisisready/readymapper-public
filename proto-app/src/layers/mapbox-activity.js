import * as d3 from 'd3'
import * as turf from '@turf/turf'
import _ from 'underscore'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'

export const mapboxActivityLayer = {

  async loadData(store, disasterBaseUrlData) {
    try {
      const allMapboxData = await helpers.fetchCsv(`${disasterBaseUrlData}/mapbox-activity/data-normalized.csv`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'Mapbox activity' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'Mapbox activity', complete: true })

      // console.log('mapbox activity extent:', d3.extent(allMapboxData, d => d['percent_change']))
      const mapboxDataByDate = _.groupBy(allMapboxData, (d) => d.agg_day_period)
      const mapboxActivityDates = Object.keys(mapboxDataByDate).sort((a, b) => d3.ascending(a, b))
      return { mapboxActivity: mapboxDataByDate, mapboxActivityDates: mapboxActivityDates }
    } catch (e) {
      console.warn('Mapbox activity data not found. Ignoring.')
      return { mapboxActivity: {}, mapboxActivityDates: [] }
    }
  },

  addLayer(map, mapboxActivityByDate, colorScale) {
    for (const [date, data] of Object.entries(mapboxActivityByDate)) {
      const mapboxData = turf.featureCollection(
          data
            .map(row => {
              try {
                return turf.point([parseFloat(row.xlon), parseFloat(row.xlat)], row)
              } catch (e) {
                return null
              }
            })
            .filter(point => !!point)
        )

        const id = `mapbox-activity-${date}`

        map.addSource(id, {
          'type': 'geojson',
          'data': mapboxData
        })

        map.addLayer({
          'id': id,
          'type': 'circle',
          'source': id,
          'paint': {
            'circle-color':
            [
              "case",
              [
                "!=",
                ["to-number", ["get", "percent_change"]],
                0
              ],
              [
                "step",
                ["to-number", ["get", "percent_change"]],
                ...colorScale
              ],
              "#adadad",  // set empty tiles to a light gray color
            ],
            'circle-radius': [
              "interpolate",
              ["linear"],
              ["zoom"],

              8, 1,
              9, 2,
              10, 2,
              11, 3,
              13, 4
            ],
            'circle-opacity': 0
          }
        })
    }

  }
}
