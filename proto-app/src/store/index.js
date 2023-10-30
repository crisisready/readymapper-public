import { createStore } from 'vuex'

import * as turf from '@turf/turf'
import { convertArea } from '@turf/helpers'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import dayjs from 'dayjs'
import * as d3 from 'd3'
import { json } from 'd3-fetch'
import _ from 'underscore'

import { settings, useLocalBackend } from '../../constants/settings'
import { getDisasterData, getRecordsFromData, getAboutData } from './utils/airtable-client'
import { toTitleCase } from '../components/utils/toTitleCase'
import fetchIntlJenksBreaks from './utils/intlJenksBreaks';

dayjs.extend(utc)
dayjs.extend(timezone)

// IMPROVE: break up the store into several files
export default createStore({
  state: {
    loadProgress: {},
    headerCollapsed: false,
    map: null,
    dataLoaded: false,
    disasters: [],
    disasterId: null,
    disasterConfig: null,
    intlJenksBreaks: null,
    fbPopDensityDates: [],
    mapboxActivityDates: [],
    mobilityMode: 'facebook', // mapbox
    sateliteBasemap: false,
    selectedDateTime: null,
    dataReportingIntervalHours: null,
    selectedCountyFips: [],
    focusedCountyFips: null,
    selectedPlaceGeoids: [],
    focusedPlaceGeoid: null,
    selectedLocations: [],
    hoveredZip: null,
    selectedRegion: {
      center: [0, 0],
      radius: 0
    },
    currentLocation: null,
    healthcareFacilities: null,
    dmeDataVisible: false,
    tooltipHTML: null,
    tooltipHTMLHurricane: null,
    tooltipHTMLCyclone: null,
    currentTab: 'vulnerability', // vulnerability, movement, infrastructure, infrastructureReport (for report view), disasterReport
    regionTypeSelection: 'places', // counties, places
    generateReportModalVisible: false,
    aboutModalVisible: false,
    pickMapViewScreen: false,
    disasterSelectionModalVisible: false,
    reportVisible: false,
    reportLoading: false,
    reportNotes: {},
    reportMapViews: {},
    reportSections: settings.defaultReportSections,
    flowsDirection: 'off', // from, to, off
    vulnerabilityMetric: settings.vulnerabilityMetrics.find(d => d.default === true),
    isochronesData: {},
    hoveredCountyId: null,
    hoveredPlaceId: null,
    navbarOpen: false,
    setCurrentHurricanePosition: null,
    setCurrentCyclonePosition: null,
    reportCreatedOn: null,
    aboutData: null,
  },

  getters: {

    disasterId: (state) => {
      return state?.disasterConfig?.id
    },

    selectedDisasterName: (state) => {
      const type = state?.disasterConfig?.type
      const name = state?.disasterConfig?.name
      switch (type) {
        case 'fire':
          return `${name} ${toTitleCase(type)}`
        case 'hurricane':
          return `${toTitleCase(type)} ${name}`
        case 'cyclone':
          return `${toTitleCase(type)} ${name}`
        default:
          return name
      }
    },

    disasterType: (state) => {
      return state?.disasterConfig?.type
    },

    disasterIconByType: (state) => (type) => {
      if (type === 'fire') {
        return `img/wildfire-header-icon.svg`
      }
      if ((type === 'hurricane') || (type === 'cyclone') ) {
        return `img/hurricane-header-icon.svg`
      }
      return ''
    },

    wfigsIncidentName: (state) => {
      return state.disasterConfig?.wfigsIncidentName
    },

    disasterCensusVintage: (state) => {
      return state?.disasterConfig?.censusVintage
    },

    disasterBaseUrlData: (state) => {
      if (!state.disasterConfig) return null
      return `${settings.baseUrlData}/disasters/${state.disasterConfig.id}`
    },

    disasterDateStart: (state, getters) => {
      const dateStart = state?.disasterConfig?.dateStart
      return dayjs.tz(dateStart, 'US/Pacific').toDate()
    },

    disasterDateEnd: (state) => {
      return dayjs(state?.disasterConfig?.dateEnd).toDate()
    },

    disasterLocalTimezone: (state) => {
      return state?.disasterConfig?.localTimezone
    },

    disasterDatesScale: (state, getters) => {
      if(!getters.disasterDateStart || !getters.disasterDateEnd || !state?.disasterConfig?.dataReportingIntervalHours) return null
      // generates a list with the hours between the start and end dates
      // for the disaster scenario

      const dates = [];
      let currentDate = dayjs.tz(getters.disasterDateStart, 'US/Pacific');
      const end = dayjs.tz(getters.disasterDateEnd, 'US/Pacific');

      while (currentDate <= end) {
        const currentDay = currentDate.startOf('day');
        dates.push(currentDay.toDate());
        dates.push(currentDay.add(8, 'hours').toDate());
        dates.push(currentDay.add(16, 'hours').toDate());
        currentDate = currentDay.add(1, 'day');
      }

      return dates
    },

    disasterDatesScaleString: (state, getters) => {
      if (!getters.disasterDatesScale) return null
      const dates = getters.disasterDatesScale.map(d => {
        return d3.timeFormat("%Y-%m-%d_%H%M")(d)
      })
      return dates
    },

    disasterLng: (state) => {
      return state?.disasterConfig?.lng
    },

    disasterLat: (state) => {
      return state?.disasterConfig?.lat
    },

    disasterZoom: (state) => {
      return state?.disasterConfig?.zoom
    },

    fbPopDensityDates: (state) => {
      return state?.fbPopDensityDates
    },

    mapboxActivityDates: (state) => {
      return state?.mapboxActivityDates
    },

    selectedDateString: (state, getters) => {
      if (!getters.disasterDatesScaleString || !state.selectedDateTime) return null
      const nearestDateIndex = d3.bisector(dateString => dayjs(dateString, 'YYYY-MM-DD_hhmm').toDate())
        .right(getters.disasterDatesScaleString, state.selectedDateTime) - 1
      return getters.disasterDatesScaleString[nearestDateIndex]
    },

    closestHealthcare: state => {
      if (state.selectedRegion.radius === 0) {
        return []
      }

      return state.healthcareFacilities.features
        .filter(feature => {
          let distance = turf.distance(feature.geometry, state.selectedRegion.center)
          return distance < 50
        })
        .slice(0, 10)
    },

    selectedCounties: state => {
      if (!state.counties) return []
      // do it this way to preserve order
      return state.selectedCountyFips.map(f => state.counties.features.find(c => c.properties['GEOID'] === f))
    },

    focusedCounty: state => {
      if (!state.counties) return []
      return state.counties.features.find(c => c.properties['GEOID'] === state.focusedCountyFips)
    },

    selectedPlaces: state => {
      if (!state.acsPlaces || !state.selectedPlaceGeoids?.length) return []
      // do it this way to preserve order
      return state.selectedPlaceGeoids.map(f => state.acsPlaces.features.find(c => c.properties['GEOID'] === f))
    },

    focusedPlace: (state, getters) => {
      if (!getters.selectedPlaces || !state.selectedPlaceGeoids?.length) return []
      const geoid = state.selectedPlaceGeoids.find(f => f === state.focusedPlaceGeoid)
      return getters.selectedPlaces.find(f => f.properties['GEOID'] === geoid)
    },

    getCountyForPlace: state => place => {
      return state.counties.features.find(c => {
        return turf.booleanPointInPolygon(turf.centerOfMass(place), c)
      })
    },

    numDMEUsers: state => feature => {
      if (feature.properties.selectionType === 'county') {
        let dmeUsers = state.dmeUsers.filter(row => feature.properties['GEOID'] === row['fips_code'])

        // If dmeUsers array is empty, return "N/A"
        if(dmeUsers.length === 0) {
          return "N/A";
        } 
        // Else, calculate the sum
        return d3.sum(dmeUsers.map(row => row['power_dependent_devices_dme']))
      } else {
        // no DME for places
        return "N/A"
      }
    },

    numTotalPop: state => feature => feature.properties['totalPopulation'],
    
    numVulnerable: state => feature => feature.properties[state.vulnerabilityMetric?.idAbsolute],
    
    selectedHealthcare: (state, getters) => (selectedPolygons) => {
      let polygons
      if (selectedPolygons) {
        polygons = selectedPolygons
      } else if (state.regionTypeSelection === 'counties') {
        polygons = getters.selectedCounties
      } else if (state.regionTypeSelection === 'places') {
        polygons = getters.selectedPlaces
      } else {
        return []
      }

      // pointsWithinPolygon is extremely slow if the shapes are all vue proxy objects, so we
      // use this dirty hack to convert it all to a real object before passing to pointsWithinPolygon.
      polygons = JSON.parse(JSON.stringify(polygons));

      let facilities = turf.pointsWithinPolygon(
        turf.featureCollection(state.healthcareFacilities?.features),
        turf.featureCollection(polygons)
      )

      if (state.acsPlaces) {
        // tag facilities with place name
        facilities = turf.tag(facilities, state.acsPlaces, 'NAME', 'place_name')
      }
      if (state.counties) {
        // tag facilities with county name
        facilities = turf.tag(facilities, state.counties, 'NAME', 'county_name')
        return facilities.features
      }
    },

    fbFlows: (state, getters) => (polygon, flowsDirection, selectedDateTime = null) => {
      if (state.currentTab !== 'movement') {
        return []
      }

      let fbFlows
      if (state.regionTypeSelection === 'counties') {
        fbFlows = state.adminFBFlows.features
      } else if (state.regionTypeSelection === 'places') {
        fbFlows = state.tileFBFlows.features
      } else {
        return []
      }

      if (flowsDirection === 'off') {
        return []
      }

      if (!polygon) {
        return []
      }

      // filter out flows with NaN percent change
      fbFlows = fbFlows.filter(f => f.properties.percent_change && (f.properties.percent_change > 0 || f.properties.percent_change < 0))

      // // Filter by selected date, unless we're at the end date.
      // // The end date is a shortcut to show all flows.
      // if (selectedDateTime && (selectedDateTime.getTime() !== getters.disasterDateEnd.getTime())) {
      //   fbFlows = fbFlows.filter(f => {
      //     return (dayjs(f.properties['date_time']).toDate().getTime() === selectedDateTime.getTime())
      //   })
      // }

      // Filter by selected date
      if (selectedDateTime) {
        fbFlows = fbFlows.filter(f => {
          return (dayjs(f.properties['date_time']).toDate().getTime() === selectedDateTime.getTime())
        })
      }

      fbFlows.forEach(f => {
        f.originIntersectsPlace = turf.pointsWithinPolygon(
          turf.point(f.geometry.coordinates[0]),
          polygon
        ).features.length > 0

        f.destinationIntersectsPlace = turf.pointsWithinPolygon(
          turf.point(f.geometry.coordinates[1]),
          polygon
        ).features.length > 0
      })

      // filter out flows that start and end in the same place
      fbFlows = fbFlows.filter(f => !(f.originIntersectsPlace && f.destinationIntersectsPlace))

      if (flowsDirection === 'from') {
        fbFlows = fbFlows
          .filter(f => f.originIntersectsPlace)
          .map(f => {
            let start
            if (state.regionTypeSelection === 'places') {
              start = polygon.properties.centroid.coordinates
            } else if (state.regionTypeSelection === 'counties') {
              start = f.geometry.coordinates[0]
            }

            return {
              start: start,
              end: f.geometry.coordinates[1],
              feature: f
            }
          })
      } else if (flowsDirection === 'to') {
        fbFlows = fbFlows
          .filter(f => f.destinationIntersectsPlace)
          .map(f => {
            let end
            if (state.regionTypeSelection === 'places') {
              end = polygon.properties.centroid.coordinates
            } else if (state.regionTypeSelection === 'counties') {
              end = f.geometry.coordinates[1]
            }

            return {
              start: f.geometry.coordinates[0],
              end: end,
              feature: f
            }
          })
      }

      return fbFlows
    },

    selectedFBFlows: (state, getters) => {
      return getters.fbFlows(state.currentLocation, state.flowsDirection, state.selectedDateTime)
    },

    selectedFBPopFlowsTimeseriesTo: (state, getters) => {
      if (!state?.selectedDateTime) return null

      let polygons

      if (state.regionTypeSelection === 'counties') {
        if (!getters.selectedCounties?.length || !state?.adminFBFlows) return null
        polygons = getters.selectedCounties
      } else if (state.regionTypeSelection === 'places') {
        if (!getters.selectedPlaces?.length || !state?.tileFBFlows) return null
        polygons = getters.selectedPlaces
      }

      const selectedData = polygons.map(polygon => {
        // Filter by selected feature
        let flowsThatIntersectPolygon = getters.fbFlows(polygon, 'to')

        const timeseries = {}
        for (const f of flowsThatIntersectPolygon) {
          const date = f.feature.properties['date_time']
          const value = 0  // we pass a dummy zero value here just to fill the movement dot chart in PointChart
          timeseries[date] = value
        }
        return {'polygon_name': polygon.properties.NAME, data: timeseries}
      })

      return selectedData
    },

    selectedFBPopFlowsTimeseriesFrom: (state, getters) => {
      if (!state?.selectedDateTime) return null

      let polygons

      if (state.regionTypeSelection === 'counties') {
        if (!getters.selectedCounties?.length || !state?.adminFBFlows) return null
        polygons = getters.selectedCounties
      } else if (state.regionTypeSelection === 'places') {
        if (!getters.selectedPlaces?.length || !state?.tileFBFlows) return null
        polygons = getters.selectedPlaces
      }

      const selectedData = polygons.map(polygon => {
        // Filter by selected feature
        let flowsThatIntersectPolygon = getters.fbFlows(polygon, 'from')

        const timeseries = {}
        for (const f of flowsThatIntersectPolygon) {
          const date = f.feature.properties['date_time']
          const value = 0  // we pass a dummy zero value here just to fill the movement dot chart in PointChart
          timeseries[date] = value
        }
        return {'polygon_name': polygon.properties.NAME, data: timeseries}
      })

      return selectedData
    },

    timeseriesCounties: (state) => {
      if (!state.mobilityMode) return null
      if (state.mobilityMode === "facebook") {
        return state.fbPopDensityTimeseriesCounties
      } else if (state.mobilityMode === "mapbox") {
        return state.mapboxActivityTimeseriesCounties
      } else {
        return null
      }
    },

    timeseriesPlaces: (state) => {
      if (!state.mobilityMode) return null
      if (state.mobilityMode === "facebook") {
        return state.fbPopDensityTimeseriesPlaces
      } else if (state.mobilityMode === "mapbox") {
        return state.mapboxActivityTimeseriesPlaces
      } else {
        return null
      }
    },

    mobilityMatrixCounties: (state) => {
      if (!state.mobilityMode) return null
      if (state.mobilityMode === "facebook") {
        return state.fbMobilityMatrixCounties
      } else {
        return null
      }
    },

    mobilityMatrixPlaces: (state) => {
      if (!state.mobilityMode) return null
      if (state.mobilityMode === "facebook") {
        return state.fbMobilityMatrixPlaces
      } else {
        return null
      }
    },

    selectedPopDensityTimeseriesCounties: (state, getters) => {
      const counties = getters.selectedCounties
      if (!counties?.length || !getters?.timeseriesCounties || !state?.selectedDateTime) return null

      const selectedData = counties.map(c => {
        const selected = getters.timeseriesCounties.filter(s => {
          return c.properties.GEOID === s['GEOID']
        })
        const timeseries = {}
        for (const f of selected) {
          const date = f['dt']
          const value = {
            'percent_change': Number(f['percent_change']),
            'n_baseline': Number(f['n_baseline']),
          }
          timeseries[date] = value
        }
        return {'polygon_name': c.properties.NAME, data: timeseries}
      })
      return selectedData
    },

    selectedPopDensityTimeseriesPlaces: (state, getters) => {
      const places = getters.selectedPlaces
      if (!places?.length || !getters?.timeseriesPlaces || !state?.selectedDateTime) return null

      const selectedData = places.map(c => {
        const selected = getters.timeseriesPlaces.filter(s => {
          return c.properties.GEOID === s['GEOID']
        })
        const timeseries = {}
        for (const f of selected) {
          const date = f['dt']
          const value = {
            'percent_change': Number(f['percent_change']),
            'n_baseline': Number(f['n_baseline']),
          }
          timeseries[date] = value
        }
        return {'polygon_name': c.properties.NAME, data: timeseries}
      })
      return selectedData
    },

    selectedMobilityMatrixCounties: (state, getters) => {
      const counties = getters.selectedCounties
      if (!counties?.length || !getters?.mobilityMatrixCounties || !state?.selectedDateTime) return null

      const selectedData = counties.map(c => {
        const selected = getters.mobilityMatrixCounties.filter(s => {
          return c.properties.GEOID === s['GEOID']
        })

        const timeseries = {}
        for (const f of selected) {
          const date = f['ds']
          const value = {
            'percent_change' : Number(f['percent_change']),
            'n_baseline' : Number(f['n_baseline']),
            'n_crisis' : Number(f['n_crisis']),
            'destination_polygon' : f['destination_polygon'],
            'origin_polygon' : f['origin_polygon'],
          }
          if (!timeseries[date]) {
            timeseries[date] = [];
          }
          timeseries[date].push(value);
        }
        return {'polygon_name': c.properties.NAME, data: timeseries}
      })
      return selectedData
    },

    selectedMobilityMatrixPlaces: (state, getters) => {
      const places = getters.selectedPlaces
      if (!places?.length || !getters?.mobilityMatrixPlaces || !state?.selectedDateTime) return null

      const selectedData = places.map(c => {
        const selected = getters.mobilityMatrixPlaces.filter(s => {
          return c.properties.GEOID === s['GEOID']
        })
        
        const timeseries = {}
        for (const f of selected) {
          const date = f['ds']
          const value = {
            'percent_change' : Number(f['percent_change']),
            'n_baseline' : Number(f['n_baseline']),
            'n_crisis' : Number(f['n_crisis']),
            'destination_polygon' : f['destination_polygon'],
            'origin_polygon' : f['origin_polygon'],
          }
          if (!timeseries[date]) {
            timeseries[date] = [];
          }
          timeseries[date].push(value);
        }
        return {'polygon_name': c.properties.NAME, data: timeseries}
      })
      return selectedData
    },

    selectedPowerOutagesTimeseriesRegions: (state, getters) => (regions, regionType) => {
      // pass it an array of regions plus a region type and it will
      // return timeseries for these regions power outages
      if (!regions?.length || !state?.selectedDateTime || !regionType) return null

      const powerTimeseries = regionType === 'counties' ? state.countyPowerOutagesTimeseries : state.cityPowerOutagesTimeseries

      if (!powerTimeseries) return null

      const selectedData = regions.map(c => {
        const regionTimeseries = powerTimeseries.filter(row => {
          if (regionType === 'counties') {
            return c.properties.GEOID === row['CountyFIPS']
          } else {
            return c.properties.NAME.includes(row['CityName']) && c.properties.COUNTYFP.includes(row['CountyFIPS'].slice(row['CountyFIPS'].length - 3))
          }
        })
        const timeseries = {}
        for (const row of regionTimeseries) {
          const date = row['RecordedDateTime']
          // const value = Number(row['CustomersOut'] / row['CustomersTracked'])
          const value = Number(row?.['CustomersOut'] / c.properties.totalHouseholds)
          timeseries[date] = value
        }
        return {'polygon_name': c.properties.NAME, data: timeseries, max: d3.max(Object.values(timeseries))}
      })

      return selectedData
    },

    currentFirePerimeter: state => {
      if (!state?.firePerimeter || !state?.selectedDateTime) return null

      const currentLayerIndex = d3.bisector(f => f.date).center(state.firePerimeter.features, state.selectedDateTime)
      return state.firePerimeter.features[currentLayerIndex]
    },

    latestNewFirePerimeterGrowth: state => {
      if (!state?.firePerimeter) return null

      return dayjs(state.firePerimeter.features[0].properties['latestPerimDate'],'YYYYMMDD').format('MMM D, YYYY')
    },

    currentSmokePerimeter: state => {
      if (!state?.smokePerimeter || !state?.selectedDateTime) return null

      const currentLayerIndex = d3.bisector(f => f.date).center(state.smokePerimeter.features, state.selectedDateTime)
      return state.smokePerimeter.features[currentLayerIndex]
    },

    acresBurnedTimeseries: (state, getters) => {
      if (!state?.firePerimeter) return null

      // if there are multiple fires, look for the one with the wfigsIncidentName
      // as set in the disaster configs
      const possibleNames = [...new Set(state.firePerimeter.features.map(f => f.properties?.['poly_IncidentName']))]
      if (possibleNames.length > 1 && !getters.wfigsIncidentName) {
        console.warn("There are multiple fires in this bounding box, but no specified wfigsIncidentName");
        return {}
      }
      const mainFireFeatures = state.firePerimeter.features
        .filter(f => getters.wfigsIncidentName
          ? f.properties?.['poly_IncidentName']?.toLowerCase() === getters.wfigsIncidentName?.toLowerCase()
          : f
        )

      const timeseries = {}
      for (const f of mainFireFeatures) {
        const date = f.properties['YYYYMMDD']
        const value = f.properties['acres']
        if (!value) { continue }
        timeseries[date] = value
      }
      return timeseries
    },

    hurricaneWindSpeedTimeseries: (state) => {
      if (!state?.historicHurricanePositions?.features) return null

      const timeseries = {}
      for (const f of state.historicHurricanePositions.features) {
        const date = dayjs(f.properties['advisoryDate'])?.format("YYYYMMDD HH:mm")
        const value = f.properties["maxWindMph"]
        if (!value) { continue }
        timeseries[date] = Number(value)
      }
      return timeseries
    },

    cycloneWindSpeedTimeseries: (state) => {
      if (!state?.historicCyclonePositions?.features) return null

      const timeseries = {}
      for (const f of state.historicCyclonePositions.features) {
        const date = dayjs(f.properties['advisoryDate'])?.format("YYYYMMDD HH:mm")
        const value = f.properties["maxWindMph"]
        if (!value) { continue }
        timeseries[date] = Number(value)
      }
      return timeseries
    },


    acresBurnedByPlaceTimeseries: (state, getters) => (place, type = 'acres') => {
      // type can be 'acres' or 'percentage'
      if (!state?.firePerimeter) return null
      const timeseries = {}
      for (const f of state.firePerimeter.features) {
        const date = f.properties['YYYYMMDD']
        const values = getters.getPlaceOverlapWithPolygonArea(place, f)
        timeseries[date] = values[type]
      }
      return timeseries
    },

    getPlaceOverlapWithPolygonArea: () => (place, polygon) => {
      const zero = {acres: 0, percentage: 0}
      if (!place || !polygon) return zero
      const intersect = turf.intersect(place, polygon)
      if (!intersect) return zero
      const area = turf.area(intersect)
      if (!area) return zero
      const acres = convertArea(area, 'meters', 'acres')
      const percentage = area / turf.area(place)
      return {acres, percentage}
    },

    sumFeatures: () => (features, columnName) => {
      return features.map(d => Number(d.properties?.[columnName])).reduce((s, a) => s + a, 0)
    },

    vulnerabilityColors: () => {
      return settings.vulnerabilityColors
    },

    vulnerabilityColorBreaks: (state) => {
      // If isInternational condition is not met or undefined, return predefined breaks
      if (!state.disasterConfig?.isInternational) {
        const predefinedBreaks = {
          percentPopElderly: [0, 0.13, 0.22, 0.36, 0.65],
          percentPopWomen: null,
          percentPopChildren: null,
          percentPopBelowPoverty: [0, 0.09, 0.19, 0.32, 0.56]
        };
        return predefinedBreaks[state.vulnerabilityMetric?.id] || [];
      }

      if (!state.intlJenksBreaks || !state.vulnerabilityMetric || !state.disasterId) return [];

      const disasterId = state.disasterId;
      const metricId = state.vulnerabilityMetric.id;

      const breaksForDisaster = state.intlJenksBreaks[disasterId];
      if (!breaksForDisaster) {
        console.log("No breaks found for disaster:", disasterId);
        return [];
      }

      const breaksForMetric = breaksForDisaster[metricId];
      if (!breaksForMetric) {
        console.log("No breaks found for metric:", metricId);
        return [];
      }

      return breaksForMetric;
    },

    vulnerabilityColorScaleMap: (state, getters) => {
      // returns a mapbox style expression for the color scale
      if (!state.vulnerabilityMetric?.id || getters.vulnerabilityColorBreaks.length === 0 || !getters.vulnerabilityColors) return "transparent";
      const colorBreaks = [
        getters.vulnerabilityColors[0],
        ..._.zip(getters.vulnerabilityColorBreaks, getters.vulnerabilityColors).flat()
      ]
      return [
        "step",
        ["to-number", ["get", state.vulnerabilityMetric?.id]],
        ...colorBreaks
      ]
    },

    isochronesColorScale: () => {
      return settings.isochronesColorScale()
    },

    facebookPopDensityColorScale: () => {
      const scale = _.flatten(
          _.zip(settings.popDensityColorScale.range(), settings.popDensityColorScale.domain())
        )
        .filter(val => typeof val !== 'undefined')
      return scale
    },

    mapboxPopDensityColorScale: () => {
      const scale = _.flatten(
          _.zip(settings.popDensityColorScale.range(), settings.popDensityColorScale.domain())
        )
        .filter(val => typeof val !== 'undefined')
      return scale
    },

    reportPlaces: (state, getters) => {
      return getters.selectedPlaces
    },

    reportCounties: (state, getters) => {
      if (state.regionTypeSelection === 'counties') { return getters.selectedCounties }

      const counties = _.uniq(getters.selectedPlaces.map(place => {
        return getters.getCountyForPlace(place)
      })).filter(d => d !== undefined)

      const fips = counties.map(d => d?.properties['GEOID'])
      // set selected counties to state, to use in report tables
      if (fips?.length) { state.selectedCountyFips = fips }

      return counties
    },

    firePixelsLayerFilter: (state, getters) => {
      const date = state.selectedDateTime || getters.disasterDateStart
      const currentDate = Number(dayjs(date).format('YYYYMMDDHHMM'))
      // 7 days ago
      const previousDate = Number(dayjs(date).subtract(7, 'day').format('YYYYMMDDHHMM'))
      const filter = [
        "all",
        [
          "<=",
          ["to-number", ["get", "date_time"]],
          currentDate
        ],
        [
          ">",
          ["to-number", ["get", "date_time"]],
          previousDate
        ],
      ]
      return filter
    },

    firePixelsLayerFill: (state, getters) => {
      const date = state.selectedDateTime || getters.disasterDateStart
      const currentTimestamp = Number(dayjs(date).format('X'))
      const fill = [
        'let',
        'time_delta',
        ['-', currentTimestamp, ["to-number", ["get", "date_time_unix"]]],
        [
          "case",
          [
            "<=",
            ['var', 'time_delta'],
            86400
          ],
          "#a80000",
          "#a80000"
        ]
      ]
      return fill
    },

    siteTitle: () => {
      return settings.siteTitle
    },

    movementDataSelected: (state) => {
      if (!settings.movementDataSources || !state.mobilityMode) return null
      return settings.movementDataSources?.find(d => d.id === state.mobilityMode)
    },

    mobilityDataInfo: (state) => {
      if (!state.mobilityMode) return null
      return settings.movementDataSources?.find(d => d.id === state.mobilityMode)
    }
  },

  mutations: {

    setData(state, {
      adminFBFlows,
      tileFBFlows,
      counties,
      dmeUsers,
      healthcareFacilities,
      acsPlaces,
      firePerimeter,
      firePerimeterDifference,
      smokePerimeter,
      //firePixels,
      fbPopDensityTimeseriesCounties,
      fbPopDensityTimeseriesPlaces,
      fbMobilityMatrixCounties,
      fbMobilityMatrixPlaces,
      mapboxActivityTimeseriesCounties,
      mapboxActivityTimeseriesPlaces,
      fbPopDensityDates,
      isochrones,
      cityPowerOutagesTimeseries,
      countyPowerOutagesTimeseries,
      forecastHurricaneTracks,
      historicHurricanePositions,
      hurricaneWindProbability,
      hurricaneWindRadii,
      hurricaneFloodWarnings,
      hurricaneCones,
      forecastCycloneTracks,
      historicCyclonePositions,
      cycloneWindRadii,
      cycloneCones,
      mapboxActivity,
      mapboxActivityDates
    }) {
      state.adminFBFlows = Object.freeze(adminFBFlows)
      state.tileFBFlows = Object.freeze(tileFBFlows)
      state.counties = Object.freeze(counties)
      state.dmeUsers = Object.freeze(dmeUsers)
      state.healthcareFacilities = Object.freeze(healthcareFacilities)
      state.acsPlaces = Object.freeze(acsPlaces)
      state.firePerimeter = Object.freeze(firePerimeter)
      state.smokePerimeter = Object.freeze(smokePerimeter)
      state.firePerimeterDifference = Object.freeze(firePerimeterDifference)
      state.fbPopDensityTimeseriesCounties = Object.freeze(fbPopDensityTimeseriesCounties)
      state.fbPopDensityTimeseriesPlaces = Object.freeze(fbPopDensityTimeseriesPlaces)
      state.fbMobilityMatrixCounties = Object.freeze(fbMobilityMatrixCounties)
      state.fbMobilityMatrixPlaces = Object.freeze(fbMobilityMatrixPlaces)
      state.mapboxActivityTimeseriesCounties = Object.freeze(mapboxActivityTimeseriesCounties)
      state.mapboxActivityTimeseriesPlaces = Object.freeze(mapboxActivityTimeseriesPlaces)
      state.fbPopDensityDates = Object.freeze(fbPopDensityDates)
      state.isochrones = Object.freeze(isochrones)
      state.cityPowerOutagesTimeseries = Object.freeze(cityPowerOutagesTimeseries)
      state.countyPowerOutagesTimeseries = Object.freeze(countyPowerOutagesTimeseries)
      state.forecastHurricaneTracks = Object.freeze(forecastHurricaneTracks)
      state.historicHurricanePositions = Object.freeze(historicHurricanePositions)
      state.hurricaneWindProbability = Object.freeze(hurricaneWindProbability)
      state.hurricaneWindRadii = Object.freeze(hurricaneWindRadii)
      state.hurricaneFloodWarnings = Object.freeze(hurricaneFloodWarnings)
      state.hurricaneCones = Object.freeze(hurricaneCones)
      state.forecastCycloneTracks = Object.freeze(forecastCycloneTracks)
      state.historicCyclonePositions = Object.freeze(historicCyclonePositions)
      state.cycloneWindRadii = Object.freeze(cycloneWindRadii)
      state.cycloneCones = Object.freeze(cycloneCones)
      state.mapboxActivity = Object.freeze(mapboxActivity)
      state.mapboxActivityDates = Object.freeze(mapboxActivityDates)
      state.dataLoaded = true
    },

    toggleHeaderCollapsed(state) {
      state.headerCollapsed = !state.headerCollapsed
    },

    setDisaster(state, disasterId) {
      if (!state?.disasters) return null
      const disaster = state.disasters.find(d => d.id === disasterId)
      if (!disaster) return null

      state.disasterId = disasterId
      state.disasterConfig = disaster
      state.selectedDateTime = dayjs(disaster.dateStart).toDate()
    },

    toggleMobilityMode(state) {
      state.mobilityMode = state.mobilityMode === 'facebook' ? 'mapbox' : 'facebook'
    },

    setMobilityMode(state, source) {
      state.mobilityMode = source
    },

    toggleSatelliteBasemap(state) {
      state.sateliteBasemap = !state.sateliteBasemap
    },

    toggleFlowsMode(state) {
      state.flowsDirection = state.flowsDirection === 'from' ? 'to' : 'from'
    },

    setFlowsDirection(state, value) {
      state.flowsDirection = value
    },

    setMap(state, map) {
      state.map = map
    },

    setSelectedLocations(state, locations) {
      state.selectedLocations = locations
    },

    setSelectedCountyFips(state, fipsList) {
      // clear previous
      for (const id of state.selectedCountyFips) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: false })
      }
      // set new
      for (const id of fipsList) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: true })
      }
      state.selectedCountyFips = fipsList
    },

    addSelectedCountyFips(state, fips) {
      for (const id of fips) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: true })
      }
      state.selectedCountyFips = [...state.selectedCountyFips, fips]
    },

    removeSelectedCountyFips(state, fips) {
      for (const id of fips) {
        state.map?.setFeatureState({ id: id, source: 'counties' }, { selected: false })
      }
      state.selectedCountyFips = state.selectedCountyFips.filter(f => f !== fips)
    },

    focusCounty(state, fips) {
      state.focusedCountyFips = fips
    },

    clearFocusedCounty(state) {
      state.focusedCountyFips = ''
    },

    setHoveredCountyId(state, geoId) {
      state.hoveredCountyId = geoId
    },

    clearHoveredCountyId(state) {
      state.hoveredCountyId = null
    },

    setSelectedPlaceGeoids(state, geoids) {
      // clear previous
      for (const id of state.selectedPlaceGeoids) {
        state.map?.setFeatureState({ id: id, source: 'acs-places' }, { selected: false })
      }
      // set new
      for (const id of geoids) {
        state.map?.setFeatureState({ id: id, source: 'acs-places' }, { selected: true })
      }
      state.selectedPlaceGeoids = geoids
    },

    addSelectedPlaceGeoids(state, geoid) {
      state.map?.setFeatureState({ id: geoid, source: 'acs-places' }, { selected: true })
      state.selectedPlaceGeoids = [...state.selectedPlaceGeoids, geoid]
    },

    removeSelectedPlaceGeoids(state, geoid) {
      state.map?.setFeatureState({ id: geoid, source: 'acs-places' }, { selected: false })
      state.selectedPlaceGeoids = state.selectedPlaceGeoids.filter(f => f !== geoid)
    },

    focusPlace(state, geoid) {
      state.focusedPlaceGeoid = geoid
    },

    clearFocusedPlace(state) {
      state.focusedPlaceGeoid = ''
    },

    setHoveredPlaceId(state, geoId) {
      state.hoveredPlaceId = geoId
    },

    clearHoveredPlaceId(state) {
      state.hoveredPlaceId = null
    },

    setSelectedDateTime(state, datetime) {
      state.selectedDateTime = datetime
    },

    setCurrentLocation(state, location) {
      state.currentLocation = location
    },

    clearCurrentLocation(state) {
      state.currentLocation = null
    },

    setHoveredZip(state, zip) {
      state.hoveredZip = zip
    },

    setDmeDataVisible(state, visible) {
      state.dmeDataVisible = visible
    },

    setTooltipHTML(state, html) {
      state.tooltipHTML = html
    },

    clearTooltipHTML(state) {
      state.tooltipHTML = null
    },

    setTooltipHTMLHurricane(state, html) {
      state.tooltipHTMLHurricane = html
    },

    clearTooltipHTMLHurricane(state) {
      state.tooltipHTMLHurricane = null
    },

    setTooltipHTMLCyclone(state, html) {
      state.tooltipHTMLCyclone = html
    },

    clearTooltipHTMLCyclone(state) {
      state.tooltipHTMLCyclone = null
    },

    setTab(state, tabName) {
      state.currentTab = tabName
    },

    setRegionTypeSelection(state, regionType) {
      state.regionTypeSelection = regionType
    },

    setGenerateReportModalVisible(state, visible) {
      state.generateReportModalVisible = visible
    },

    setAboutModalVisible(state, visible) {
      state.aboutModalVisible = visible
    },

    setPickMapViewScreen(state, visible) {
      state.pickMapViewScreen = visible
    },

    setDisasterSelectionModalVisible(state, visible) {
      state.disasterSelectionModalVisible = visible
    },

    setReportVisible(state, visible) {
      if (!visible && state.regionTypeSelection === 'places') {
        // clean county selection when returning from places report
        state.selectedCountyFips = []
      }
      state.reportVisible = visible
    },

    setReportNotes(state, {id, mdNotes}) {
      state.reportNotes[id] = mdNotes
    },

    setReportSections(state, sections) {
      state.reportSections = sections
    },

    setReportMapViews(state, {id, image}) {
      state.reportMapViews[id] = image
    },

    setReportLoading(state, visible) {
      state.reportLoading = visible
    },

    setReportCreatedOn(state, date) {
      state.reportCreatedOn = date
    },

    setNavbarOpen(state, open) {
      state.navbarOpen = open
    },

    setVulnerabilityMetric(state, metricId) {
      const metric = settings.vulnerabilityMetrics.find(d => d.id === metricId)
      if (!metric) return null
      state.vulnerabilityMetric = metric
    },

    setBreaks(state, data) {
      state.intlJenksBreaks = data; // Store the fetched breaks in the state
    },

    setDisasters(state, disasters) {
      state.disasters = disasters
    },

    setAboutData(state, aboutData) {
      state.aboutData = aboutData
    },

    setIsochronesData(state, {placeId, isochrone}) {
      if (!placeId) return
      state.isochronesData[placeId] = isochrone
    },

    bumpLoadProgress(state, { loadLabel, complete }) {
      if (!state.loadProgress[loadLabel]) {
        // Init new progress state
        state.loadProgress = { ...state.loadProgress, [loadLabel]: { count: 1, complete: complete } }
      } else if (!state.loadProgress[loadLabel].complete) {
        // Update the progress state if it's not already flagged complete
        state.loadProgress[loadLabel].count += 1
        state.loadProgress[loadLabel].complete = complete
      }
    },

    setCurrentHurricanePosition(state, feature) {
      state.currentHurricanePosition = feature
    },

    setCurrentCyclonePosition(state, feature) {
      state.currentCyclonePosition = feature
    },


  },
  actions: {
    async getDisasters({commit}) {
      let disasters
      if (useLocalBackend) {
        try {
          disasters = await json(`${settings.baseUrlData}/disasters/disasters.json`)
        } catch (error) {
          console.error("Could not find a local disasters.json file; using what's on Airtable for now. If you want do download it to your local environment, see 'get_disasters_config.py' file" )
          const data = await getDisasterData()
          disasters = getRecordsFromData(data)
        }
      } else {
        const data = await getDisasterData()
        disasters = getRecordsFromData(data)
      }
      commit('setDisasters', disasters)
    },
    async getAboutData({commit}) {
      const data = await getAboutData()
      const about = getRecordsFromData(data)
      commit('setAboutData', about)
    },
    async fetchBreaks({commit}) {
      fetchIntlJenksBreaks().then(data => {
        commit('setBreaks', data);
      }).catch(error => {
        console.error("An error occurred:", error);
      });
    },
  },
  modules: {
  }
})
