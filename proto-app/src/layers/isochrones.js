import * as turf from '@turf/turf'
import { json } from 'd3-fetch'
import * as d3 from 'd3'
import _ from 'underscore'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings'

// travel time isochrones
export const isochronesLayer = {
  async loadData() {
    // start with empty data; we'll use the API for now
    return turf.featureCollection([])
  },

  addLayer(map, isochronesData) {
    const id = 'isochrones'

    map.addSource(id, {
      'type': 'geojson',
      'data': isochronesData
    })

    let stops = settings.isochronesColorStops(isochronesData)
    let colorScaleFn = settings.isochronesColorScale(isochronesData)
    let colorStops = stops.map(colorScaleFn)
    let colorScale = [
      colorStops[0],
      ...(_.flatten(_.zip(stops, colorStops)))
    ]

    map.addLayer({
      'id': 'isochrones-fill',
      'type': 'fill',
      'source': 'isochrones',
      'layout': {
        'visibility': 'none',
        'fill-sort-key': ["*", ['to-number', ['get', 'contour']], -1],
      },
      'paint': {
        'fill-color': [
          "step",
          ["to-number", ["get", "contour"]],
          ...colorScale
        ],
        'fill-opacity': 0.5,
        'fill-outline-color': '#fff'
      },
    }, helpers.getLayerInsertionPoint(map))
  }
}
