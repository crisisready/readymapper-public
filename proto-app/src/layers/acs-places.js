import * as d3 from 'd3'
import _ from 'underscore'
import { helpers } from '../helpers'
import * as turf from '@turf/turf'
import { deserialize } from "flatgeobuf/lib/mjs/geojson.js"
import Logger, { LogLevel } from "flatgeobuf/lib/mjs/Logger.js"

// set flatgeobuf logLevel to warnings
Logger.logLevel = LogLevel.Warn

import { settings } from '../../constants/settings'
import { addAcsDataToFeature, addIntlVulnerabilityDataToFeature } from './utils/acsData'

export const acsPlacesLayer = {

  async loadData(store, disasterFgbBbox, disasterConfig) {
    try {
      let acsPlaces = {
        type: 'FeatureCollection',
        features: []
      }

      let bumpLoadBar = _.throttle(() => store.commit('bumpLoadProgress', { loadLabel: 'ACS Census Places' }), 200)

      // get flatgeobuf clipped by the disaster's bounding box
      let vintage = store.state.disasterConfig.censusVintage
      const file = disasterConfig?.isInternational
        ? `${settings.baseUrlData}/gadm/adm_2.fgb`  // use GADM data for international disasters
        : `${settings.baseUrlData}/census/${vintage}/all/acs-places.fgb`;
      const iter = deserialize(file, disasterFgbBbox)
      for await (let feature of iter) {
        if (disasterConfig?.isInternational) {
          addIntlVulnerabilityDataToFeature(feature)
          feature.properties.NAME = `${feature.properties.NAME}, ${feature.properties.COUNTRY}`
        } else {
          addAcsDataToFeature(feature)
        }

        feature.properties.centroid = turf.centroid(feature).geometry
        feature.properties.selectionType = 'place'

        acsPlaces.features.push(feature)
        bumpLoadBar()
      }

      store.commit('bumpLoadProgress', { loadLabel: 'ACS Census Places', complete: true })
      
      return acsPlaces
    } catch (e) {
      console.error(`error loading acs places data: ${e}`);
      return turf.featureCollection([])
    }
  },

  preparePowerOutageData(acsPlaces, counties, powerOutagesTimeseries, datetimes) {
    if (!powerOutagesTimeseries?.length) return
    // IMPROVE: should be done in data processing
    // Validate that all the city names in the power outage data match exactly one city name in the places data
    _.uniq(powerOutagesTimeseries.map(row => row['CityName']))
      .forEach(cityName => {
        let matchingPlace = acsPlaces.features.filter(f => f.properties['NAME'] === cityName)
        if (matchingPlace.length === 0) {
          console.warn(`No matching place for ${cityName}`)
        } else if (matchingPlace.length > 1) {
          console.warn(`${matchingPlace.length} matching cities for ${cityName}`)
        }
      })

    // IMPROVE: should be done in data processing
    // Assign a county to each ACS Place. Strangely, Places are not officially in the County hierarchy,
    // so we calculate this manually. I'm guessing this is because ACS Places do not *always* strictly belong to
    // a single County, but they almost always do as far as I can tell.
    console.time('Assigning a county to each ACS Place')
    acsPlaces.features.forEach(place => {
      // Already has the county assigned
      if (place.properties['COUNTYFP']) {
        return
      }

      let placeCentroid = turf.centroid(place.geometry)
      for (let county of counties.features) {
        let intersection
        try {
          intersection = turf.booleanPointInPolygon(placeCentroid, county.geometry)
        } catch (e) {
          console.error(e);
        }
        if (intersection) {
          place.properties['COUNTYFP'] = county.properties['COUNTYFP']
          break
        }
      }
    })
    console.timeEnd('Assigning a county to each ACS Place')

    // IMPROVE: should be done in data processing
    // For each datetime, sample data from the power outages time series and write to ACS places
    console.time('Sampling power outage data')
    let outagesByFIPS_City = _.groupBy(powerOutagesTimeseries, row => `${row['CountyFIPS']}_${row['CityName']}`)
    datetimes.forEach(datetime => {
      let date = helpers.popDensityFilenameToDate(datetime)
      acsPlaces.features.forEach(f => {
        let placeName = f.properties['NAME']
        let countyFips = f.properties['COUNTYFP']
        let stateFips = f.properties['STATEFP']
        let outages = outagesByFIPS_City[`${stateFips}${countyFips}_${placeName}`]
        if (!outages) {
          // No outage data for this city
          return
        }
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

  addLayer(map, acsPlaces, vulnerabilityColorScaleMap, disasterConfig) {
    map.addSource('acs-places', {
      'type': 'geojson',
      'data': acsPlaces,
      'promoteId': 'GEOID'
    })

    let acsPlacesCentroids = turf.featureCollection(
      acsPlaces.features.map(f => turf.centroid(f, { properties: f.properties }))
    )

    map.addSource('acs-places-centroids', {
      'type': 'geojson',
      'data': acsPlacesCentroids
    })

    // Thin stroke, makes ACS places visible in every tab
    map.addLayer({
      'id': 'acs-places-click-target',
      'type': 'fill',
      'source': 'acs-places',
      'minzoom': 3,
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0)'
      }
    })

    map.addLayer({
      'id': 'acs-places-stroke',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'line-width': 1,
        'line-blur': 1,
        'line-color': '#747474',
        'line-opacity': 0.7,
      }
    })

    // Dark fill when selected
    map.addLayer({
      'id': 'acs-places-selected',
      'type': 'fill',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'none'
      },
      'paint': {
        'fill-color': 'rgba(0, 0, 0, 0.1)'
      },
      'filter': ['in', 'GEOID', '']
    })

    // // Data-driven stroke, for vulnerability tab
    // map.addLayer({
    //   'id': 'acs-places-stroke-data-driven',
    //   'type': 'line',
    //   'source': 'acs-places',
    //   'minzoom': 5,
    //   'paint': {
    //     'line-color': vulnerabilityColorScaleMap,
    //     'line-width': [
    //       "interpolate",
    //       ["linear"],
    //       ["zoom"],
    //       6, 0.5,
    //       8, 1,
    //       10, 1.5
    //     ],
    //     'line-opacity': [
    //       "interpolate",
    //       ["linear"],
    //       ["zoom"],
    //       3, 0.5,
    //       10, 1
    //     ]
    //   }
    // })

    // Thick stroke when selected
    map.addLayer({
      'id': 'acs-places-stroke-selected',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 1.25,
          8, 3
        ],
        'line-color': "#0075FF",
        "line-opacity": 0.7,
      },
      'filter': ['in', 'GEOID', '']
    })

    // Thicker stroke when focused
    map.addLayer({
      'id': 'acs-places-stroke-focused',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'layout': {
        'visibility': 'visible'
      },
      'paint': {
        'line-width': [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 2,
          8, 5
        ],
        'line-color': "#0075FF",
        'line-opacity': 0.7,
      },
      'filter': ['in', 'GEOID', '']
    })

    map.addLayer({
      'id': 'acs-places-hovered',
      'type': 'line',
      'source': 'acs-places',
      'minzoom': 5,
      'paint': {
        'line-width': 3,
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          "#0060D0",
          "#878787",
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          0.7,
          0
        ]
      },
    })

    // Data-driven fill, for vulnerability tab
    map.addLayer({
      'id': 'acs-places-fill',
      'type': 'fill',
      'source': 'acs-places',
      'minzoom': 5,
      'paint': {
        'fill-color': vulnerabilityColorScaleMap,
        'fill-opacity': [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0.2,
          9,
          0.6
        ]
      }
    }, helpers.getLayerInsertionPoint(map))

  }

}
