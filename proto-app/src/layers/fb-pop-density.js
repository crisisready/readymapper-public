import * as d3 from 'd3'
import * as turf from '@turf/turf'
import _ from 'underscore'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'

export const fbPopDensityLayer = {

  async loadData(store, disasterBaseUrlData) {
    try {
      let allFBData = await helpers.fetchCsv(`${disasterBaseUrlData}/facebook/population-density/tile/data-pivot.csv`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'Facebook pop. density' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'Facebook pop. density', complete: true })

      const fbPopDensityDates = allFBData.columns.filter(d => !['lat', 'lon'].includes(d))
      return { fbPopDensityData: allFBData, fbPopDensityDates: fbPopDensityDates }
    } catch (e) {
      console.warn('FB Tile Pop Density data not found. Ignoring.')
      return { fbPopDensityData: {}, fbPopDensityDates: [] }
    }
  },

  addLayer(map, fbDataRaw, fbPopDensityDates, colorScale) {
    if (!fbDataRaw.length || !fbPopDensityDates.length) return

    // Facebook Population Density Data
    const fbData = turf.featureCollection(
        fbDataRaw
          .map(row => {
            try {
              return turf.point([parseFloat(row.lon), parseFloat(row.lat)], row)
            } catch (e) {
              return null
            }
          })
          .filter(point => !!point)
      )

      const id = `fb-pop-density`

      map.addSource(id, {
        'type': 'geojson',
        'data': fbData
      })

      const valueCol = fbPopDensityDates?.[0]

      map.addLayer({
        'id': id,
        'type': 'circle',
        'source': id,
        'minzoom': 5,
        'paint': {
          'circle-color': [
            "step",
            ["to-number", ["get", valueCol]],
            ...colorScale
          ],
          'circle-radius': [
              "interpolate",
              ["linear"],
              ["zoom"],
              5, 0.4,
              8, 2,
              9, 3.5,
              10, 6,
              11, 6,
              13, 26
            ],
          'circle-opacity': [
              "interpolate",
              ["linear"],
              ["zoom"],
              5, 0.7,
              8, 1
            ]
          },
        'layout': {
            "visibility": "none"
          }
      }, helpers.getLayerInsertionPoint(map))

  }
}
