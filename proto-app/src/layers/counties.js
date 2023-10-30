import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";

import * as d3 from 'd3'
import * as turf from '@turf/turf'
import _ from 'underscore'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings'
import { addAcsDataToFeature, addIntlVulnerabilityDataToFeature } from './utils/acsData'

export const countiesLayer = {

  async loadData(store, disasterFgbBbox, disasterConfig) {
    try {
      let countyData = {
        type: 'FeatureCollection',
        features: []
      }

      let label = "Census Counties"
      let bumpLoadBar = _.throttle(() => store.commit('bumpLoadProgress', { loadLabel: label }), 200)

      // get flatgeobuf clipped by the disaster's bounding box
      let vintage = store.state.disasterConfig.censusVintage
      const file = disasterConfig?.isInternational
        ? `${settings.baseUrlData}/gadm/adm_1.fgb`  // use GADM data for international disasters
        : `${settings.baseUrlData}/census/${vintage}/all/acs-counties.fgb`;
      const iter = deserialize(file, disasterFgbBbox)
      for await (let feature of iter) {
        
        if (disasterConfig?.isInternational) {
          addIntlVulnerabilityDataToFeature(feature)
          feature.properties.NAME = `${feature.properties.NAME}, ${feature.properties.COUNTRY}`
        } else {
          addAcsDataToFeature(feature)
        }

        feature.properties.selectionType = 'county'

        countyData.features.push(feature)
        bumpLoadBar()
      }

      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

      return countyData
    } catch (e) {
      console.error(`error loading counties data: ${e}`);
      return turf.featureCollection([])
    }
  },

  preparePowerOutageData(counties, powerOutagesTimeseries, disasterDatetimes) {
    if (!powerOutagesTimeseries) return

    // IMPROVE: should be done in data processing
    // For each datetime, sample data from the power outages time series and write to counties
    console.time('Sampling power outage data')
    let outagesByFIPS = _.groupBy(powerOutagesTimeseries, row => `${row['CountyFIPS']}`)
    disasterDatetimes.forEach(datetime => {
      let date = helpers.popDensityFilenameToDate(datetime)
      counties.features.forEach(f => {
        let geoID = f.properties['GEOID']
        let outages = outagesByFIPS[geoID]
        if (!outages) {
          // No outage data for this county
          return
        }

        let percentWithoutPower = 0
        let outagesTimeDomain = d3.extent(outages.map(o => o.date))

        if (date < outagesTimeDomain[0] || date > outagesTimeDomain[1]) {
          // No data for this place on this date
          return
        }

        let nearestSampleIndexBeforeDate = d3.bisector(d => d.date).right(outages, date) - 1
        let { CustomersOut, CustomersTracked } = outages[nearestSampleIndexBeforeDate]
        f.properties[`percent_without_power_${datetime}`] = CustomersOut / f.properties.totalHouseholds
        f.properties[`customers_without_power_${datetime}`] = CustomersOut
        // f.properties[`percent_without_power_${datetime}`] = CustomersOut / CustomersTracked
        // console.log("f.properties[`percent_without_power_${datetime}`]: "+f.properties[`percent_without_power_${datetime}`])
      })
    })
    console.timeEnd('Sampling power outage data')

    // Debug percent without power calculation
    // console.log(
    //   acsPlaces.features
    //     .filter(f => _.some(Object.keys(f.properties).filter(k => k.startsWith('percent_without_power'))))
    //     .map(f => _.pick(f.properties, (val, prop) => prop === 'NAME' || prop.startsWith('percent_without_power')))
    // )
  },

  addLayer(map, countyData) {
    map.addSource('counties', {
      'type': 'geojson',
      'data': countyData,
      'promoteId': 'GEOID'
    })

    let countyCentroids = turf.featureCollection(
      countyData.features.map(f => turf.centerOfMass(f, { properties: f.properties }))
    )

    map.addSource('counties-centroids', {
      'type': 'geojson',
      'data': countyCentroids
    })

    // No highlight layer
    map.addLayer({
      'id': 'counties',
      'type': 'fill',
      'source': 'counties',
      'minzoom': 3,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0)'
      }
    })

    // Thicker stroke
    map.addLayer({
      'id': 'counties-stroke',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'line-color': '#747474',
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          0.7,
          12,
          1.2
        ],
        'line-dasharray': [
          "step",
          ["zoom"],
          [
            "literal",
            [1, 3.5, 6, 3.5]
          ],
          6,
          ["literal", [1, 4, 7, 4]],
          10,
          ["literal", [0.6, 4, 6, 4]],
          13,
          ["literal", [0.7, 4, 7, 4]]
        ]
      }
    })

    map.addLayer({
      'id': 'counties-hovered',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'paint': {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          "#0060D0",
          "#878787",
        ],
        'line-width': 4,
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          1,
          0
        ]
      },
    })

    // Selected layer
    map.addLayer({
      'id': 'counties-selected',
      'type': 'fill',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0.1)',
        'fill-opacity': 0.5
      },
      'filter': ['in', 'GEOID', '']
    })

    // Thick stroke when selected
    map.addLayer({
      'id': 'counties-stroke-selected',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          1,
          12,
          2
        ],
        'line-color': "#0075FF",
        'line-opacity': 0.7,
      },
      'filter': ['in', 'GEOID', '']
    })

    // Thicker stroke when focused
    map.addLayer({
      'id': 'counties-stroke-focused',
      'type': 'line',
      'source': 'counties',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          2,
          12,
          4
        ],
        'line-color': "#0075FF",
        'line-opacity': 0.7,
      },
      'filter': ['in', 'GEOID', '']
    })
  }
}