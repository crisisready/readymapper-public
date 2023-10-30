import * as turf from '@turf/turf'
import { dmeLayer } from '../../layers/dme.js'
import { healthcareFacilitiesLayer } from '../../layers/healthcare.js'
import { hifldHealthcareFacilitiesLayer } from '../../layers/hifld-healthcare.js'
import { fqhcHealthcareFacilitiesLayer } from '../../layers/fqhc-healthcare.js'
import { healthcareFacilitiesWithCapacitiesLayer } from '../../layers/healthcare-with-capacities.js'
import { countiesLayer } from '../../layers/counties.js'
import { firePerimeterLayer } from '../../layers/fire-perimeter.js'
import { firePerimeterDifferenceLayer } from '../../layers/fire-perimeter-difference.js'
// we tried using fire pixels from satellite data at one point, but gave up on it
// as client preferred actual fire perimeters
import { firePixelsLayer } from '../../layers/fire-pixels.js'
import { smokePerimeterLayer } from '../../layers/smoke-perimeter.js'
import { fbPopDensityLayer } from '../../layers/fb-pop-density.js'
import { loadFBPopDensityTimeseriesCounties } from '../../layers/fb-pop-density-timeseries-counties.js'
import { loadFBPopDensityTimeseriesPlaces } from '../../layers/fb-pop-density-timeseries-places.js'
import { loadMapboxActivityTimeseriesCounties } from '../../layers/mapbox-activity-timeseries-counties.js'
import { loadMapboxActivityTimeseriesPlaces } from '../../layers/mapbox-activity-timeseries-places.js'
import { isochronesLayer } from '../../layers/isochrones.js'
import { fbMobilityLayer } from '../../layers/fb-mobility.js'
import { loadFBMobilityMatrixCounties } from '../../layers/fb-mobility-matrix-counties.js'
import { loadFBMobilityMatrixPlaces } from '../../layers/fb-mobility-matrix-places.js'
import { acsPlacesLayer } from '../../layers/acs-places.js'
import { cityPowerOutagesLayer } from '../../layers/city-power-outages.js'
import { countyPowerOutagesLayer } from '../../layers/county-power-outages.js'
import { hurricaneTracksLayer } from '../../layers/hurricane-tracks.js'
import { hurricaneWindProbabilityLayer } from '../../layers/hurricane-wind-probability.js'
import { hurricaneWindRadiiLayer } from '../../layers/hurricane-wind-radii.js'
import { hurricaneFloodWarningsLayer } from '../../layers/hurricane-flood-warnings.js'
import { cycloneTracksLayer } from '../../layers/cyclone-tracks.js'
import { cycloneWindRadiiLayer } from '../../layers/cyclone-wind-radii.js'
import { hurricaneConeLayer } from '../../layers/hurricane-cone.js'
import { cycloneConeLayer } from '../../layers/cyclone-cone.js'
import { mapboxActivityLayer } from '../../layers/mapbox-activity.js'
import { convertDisasterBboxToFgbBBox } from './flatgeobuf.js'

export const loadMapData = async (map, store) => {
  //
  // Load Data
  //
  const disasterConfig = store.state.disasterConfig

  //
  // Fire
  //

  let firePerimeter,
      firePerimeterDifference,
      smokePerimeter,
      firePixels
      // ,
      // firePixels
  if (disasterConfig.type === 'fire') {
    [
      firePerimeter,
      firePerimeterDifference,
      smokePerimeter,
      firePixels,
    ] = await Promise.all([
      firePerimeterLayer.loadData(store, store.getters.disasterBaseUrlData),
      firePerimeterDifferenceLayer.loadData(store, store.getters.disasterBaseUrlData),
      smokePerimeterLayer.loadData(store, store.getters.disasterBaseUrlData),
      firePixelsLayer.loadData(store, store.getters.disasterBaseUrlData),
    ])
  }

  //
  // Hurricane
  //

  let forecastHurricaneTracks, historicHurricanePositions, hurricaneWindProbability,
      hurricaneWindRadii, hurricaneFloodWarnings, hurricaneCones
  if (disasterConfig.type === 'hurricane') {
    [
      { forecastHurricaneTracks, historicHurricanePositions },
      hurricaneWindProbability,
      hurricaneWindRadii,
      hurricaneFloodWarnings,
      hurricaneCones,
    ] = await Promise.all([
      hurricaneTracksLayer.loadData(store.getters.disasterBaseUrlData, store),
      hurricaneWindProbabilityLayer.loadData(store.getters.disasterBaseUrlData, store),
      hurricaneWindRadiiLayer.loadData(store.getters.disasterBaseUrlData, store),
      hurricaneFloodWarningsLayer.loadData(store.getters.disasterBaseUrlData, store),
      hurricaneConeLayer.loadData(store.getters.disasterBaseUrlData, store)
    ])
  }

  //
  // Cyclone
  //

  let forecastCycloneTracks, 
      historicCyclonePositions,
      cycloneWindRadii,
      cycloneCones
  if (disasterConfig.type === 'cyclone') {
    [
      { forecastCycloneTracks, historicCyclonePositions },
      cycloneWindRadii, cycloneCones
    ] = await Promise.all([
      cycloneTracksLayer.loadData(store.getters.disasterBaseUrlData, store),
      cycloneWindRadiiLayer.loadData(store.getters.disasterBaseUrlData, store),
      cycloneConeLayer.loadData(store.getters.disasterBaseUrlData, store)
    ])
  }


  //
  // Healthcare
  //

  let healthcareFacilities

  // If this is a California-only disaster, we load the CA healthcare dataset.
  // Otherwise, we load the HIFLD healthcare dataset.
  let disasterIsCaliforniaOnly = disasterConfig?.usStatesAffected?.length === 1 && disasterConfig?.usStatesAffected?.[0] === 'CA'
  if (disasterIsCaliforniaOnly) {
    healthcareFacilities = await healthcareFacilitiesLayer.loadData(store, map)
  } else {
    let hifldFacilities = await hifldHealthcareFacilitiesLayer.loadData(store, map)
    let fqhcHealthcareFacilities = await fqhcHealthcareFacilitiesLayer.loadData(store, map)

    healthcareFacilities = hifldFacilities
    if (fqhcHealthcareFacilities?.features?.length) {
      // add FQHC facilities to list
      healthcareFacilities = {
        ...healthcareFacilities,
        features: [
          ...healthcareFacilities.features,
          ...fqhcHealthcareFacilities.features
        ]
      }
    }
  }

  //
  // Shared
  //

  const disasterFgbBbox = convertDisasterBboxToFgbBBox(disasterConfig)

  // Load all data and map style in parallel
  // let mapLoadReadyPromise
  // mapLoadReadyPromise = new Promise((resolve) => map.on('load', () => resolve()))
  let [
    // mapLoadReady,
    { fbPopDensityData, fbPopDensityDates },
    { mapboxActivity, mapboxActivityDates },
    fbPopDensityTimeseriesCounties,
    fbPopDensityTimeseriesPlaces,
    fbMobilityMatrixCounties,
    fbMobilityMatrixPlaces,
    mapboxActivityTimeseriesCounties,
    mapboxActivityTimeseriesPlaces,
    isochrones,
    acsPlaces,
    counties,
    { dmeUsers },
    healthcareFacilitiesWithCapacities,
    { adminFBFlows, tileFBFlows },
    cityPowerOutagesTimeseries,
    countyPowerOutagesTimeseries,
  ] = await Promise.all([
    // mapLoadReadyPromise,
    fbPopDensityLayer.loadData(store, store.getters.disasterBaseUrlData),
    mapboxActivityLayer.loadData(store, store.getters.disasterBaseUrlData),
    loadFBPopDensityTimeseriesCounties(store.getters.disasterBaseUrlData, store),
    loadFBPopDensityTimeseriesPlaces(store.getters.disasterBaseUrlData, store),
    loadFBMobilityMatrixCounties(store.getters.disasterBaseUrlData, store),
    loadFBMobilityMatrixPlaces(store.getters.disasterBaseUrlData, store),
    loadMapboxActivityTimeseriesCounties(store.getters.disasterBaseUrlData, store),
    loadMapboxActivityTimeseriesPlaces(store.getters.disasterBaseUrlData, store),
    isochronesLayer.loadData(map),
    acsPlacesLayer.loadData(store, disasterFgbBbox, disasterConfig),
    countiesLayer.loadData(store, disasterFgbBbox, disasterConfig),
    dmeLayer.loadData(map, store),
    healthcareFacilitiesWithCapacitiesLayer.loadData(map, store.getters.disasterBaseUrlData, store),
    fbMobilityLayer.loadData(store, store.getters.disasterBaseUrlData),
    cityPowerOutagesLayer.loadData(store.getters.disasterBaseUrlData, store),
    countyPowerOutagesLayer.loadData(store.getters.disasterBaseUrlData, store)
  ])
  
  //
  // Data pre-processing; add helpful rows, sample timeseries data, etc.
  //

  acsPlacesLayer.preparePowerOutageData(acsPlaces, counties, cityPowerOutagesTimeseries, store.getters.disasterDatesScaleString)
  countiesLayer.preparePowerOutageData(counties, countyPowerOutagesTimeseries, store.getters.disasterDatesScaleString)

  let appData = {}

  //
  // Map Layers
  //

  // This is where we order the layers on the map

  //
  // Fire
  //

  if (disasterConfig.type === 'fire') {
    firePerimeterLayer.addLayer(map, firePerimeter)
    firePerimeterDifferenceLayer.addLayer(map, firePerimeterDifference, store.getters.disasterDateStart)
    smokePerimeterLayer.addLayer(map, smokePerimeter)
    firePixelsLayer.addLayer(map, firePixels, store.getters.firePixelsLayerFilter, store.getters.firePixelsLayerFill)

    appData = {
      firePerimeter,
      firePerimeterDifference,
      smokePerimeter,
      firePixels,
      ...appData
    }
  }

  //
  // Hurricane
  //

  // see HurricaneForecastCanvas.vue

  if (disasterConfig.type === 'hurricane') {
    appData = {
      forecastHurricaneTracks,
      historicHurricanePositions,
      hurricaneWindProbability,
      hurricaneWindRadii,
      hurricaneFloodWarnings,
      hurricaneCones,
      ...appData
    }
  }

  //
  // Cyclone
  //

  // see CycloneForecastCanvas.vue

  if (disasterConfig.type === 'cyclone') {
    appData = {
      forecastCycloneTracks,
      historicCyclonePositions,
      cycloneWindRadii,
      cycloneCones,
      ...appData
    }
  }



  //
  // Shared
  //

  isochronesLayer.addLayer(map, isochrones)
  mapboxActivityLayer.addLayer(map, mapboxActivity, store.getters.mapboxPopDensityColorScale)
  fbPopDensityLayer.addLayer(map, fbPopDensityData, fbPopDensityDates, store.getters.facebookPopDensityColorScale)
  acsPlacesLayer.addLayer(map, acsPlaces, store.getters.vulnerabilityColorScaleMap, disasterConfig)
  countiesLayer.addLayer(map, counties, disasterConfig)
  healthcareFacilitiesLayer.addLayer(map, healthcareFacilities)
  healthcareFacilitiesWithCapacitiesLayer.addLayer(map, healthcareFacilitiesWithCapacities)
  fbMobilityLayer.addLayer(map, { adminFBFlows, tileFBFlows })
  cityPowerOutagesLayer.addLayer(map, cityPowerOutagesTimeseries)
  countyPowerOutagesLayer.addLayer(map, countyPowerOutagesTimeseries)

  appData = {
    adminFBFlows,
    tileFBFlows,
    counties,
    dmeUsers,
    healthcareFacilities,
    healthcareFacilitiesWithCapacities,
    acsPlaces,
    fbPopDensityTimeseriesCounties,
    fbPopDensityTimeseriesPlaces,
    fbMobilityMatrixCounties,
    fbMobilityMatrixPlaces,
    mapboxActivityTimeseriesCounties,
    mapboxActivityTimeseriesPlaces,
    fbPopDensityDates,
    mapboxActivityDates,
    isochrones,
    cityPowerOutagesTimeseries,
    countyPowerOutagesTimeseries,
    ...appData
  }

  store.commit('setData', appData)
}
