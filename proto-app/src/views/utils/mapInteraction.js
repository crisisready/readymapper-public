import dayjs from 'dayjs'
import * as d3 from 'd3'

import { addMapRectangleSelection } from './addMapRectangleSelection'
import { toTitleCase } from '../../components/utils/toTitleCase'
import { settings } from '../../../constants/settings'

export const enableMapInteraction = (map, store) => {
  // IMPROVE: this whole file could be done in a better way
  //
  // Mouse Interaction
  //
  addMapRectangleSelection(map, store)

  map.on('mousemove', ['acs-places-fill', 'acs-places-click-target'], (e) => {
    if (store.state.regionTypeSelection === 'places') {
      store.commit('setTooltipHTML', locationTooltip(e.features[0]))
      store.commit('setHoveredPlaceId', e.features[0].properties['GEOID'])
      map.getCanvas().parentElement.style.cursor = 'pointer'
    }
  })

  map.on('mouseleave', ['acs-places-fill', 'acs-places-click-target'], () => {
    if (store.state.regionTypeSelection !== 'places') { return null }
    store.commit('clearTooltipHTML')
    store.commit('clearHoveredPlaceId')
    map.getCanvas().parentElement.style.cursor = ''
  })

  map.on('mousemove', ['fire-perimeter-previous-fill', 'fire-perimeter-difference'], (e) => {
    const fireProps = e?.features?.[0]?.properties
    const fireName = fireProps?.poly_IncidentName
    const fireDiscoveredOn = fireProps?.irwin_FireDiscoveryDateTime
    if (!fireName) return
    store.commit('setTooltipHTML', `
    <div class="tooltip-header">${toTitleCase(fireName)} Fire</div>
    ${fireDiscoveredOn
        ? `<div class="tooltip-body" style="display: flex">
          First reported on ${dayjs(fireDiscoveredOn).format("MMM D, YYYY hh:mm")}
        </div>`
        : ""
      }
    `)
    map.getCanvas().parentElement.style.cursor = 'pointer'
  })

  map.on('mouseleave', ['fire-perimeter-previous-fill', 'fire-perimeter-difference'], () => {
    store.commit('clearTooltipHTML')
    map.getCanvas().parentElement.style.cursor = ''
  })

  map.on('mousemove', ['smoke-fill'], (e) => {
    const selectedDisasterName = store.getters.selectedDisasterName
    if (!selectedDisasterName) { return null }
    const smokeProps = e?.features?.[0]?.properties
    const smokeDiscoveredOn = smokeProps?.Date
    const fireName = selectedDisasterName
    store.commit('setTooltipHTML', `
    <div class="tooltip-header">Smoke from ${toTitleCase(fireName)}</div>
    ${smokeDiscoveredOn
        ? `<div class="tooltip-body" style="display: flex">
          Reported on ${dayjs(smokeDiscoveredOn).format("MMM D, YYYY hh:mm A")}
        </div>`
        : ""
      }
    `)
    map.getCanvas().parentElement.style.cursor = 'pointer'
  })

  map.on('mouseleave', ['smoke-fill'], () => {
    store.commit('clearTooltipHTML')
    map.getCanvas().parentElement.style.cursor = ''
  })

  map.on('mousemove', ['isochrones-fill'], (e) => {
    if (!store.getters.selectedPlaces) { return null }
    store.commit('setTooltipHTML', `Area reachable by driving <strong>${e.features[0].properties['contour']} min</strong>
    from ${store.getters.focusedPlace?.properties['NAME']}`)
  })

  map.on('mouseleave', ['isochrones-fill'], () => {
    store.commit(`clearTooltipHTML`)
  })

  map.on('click', ['acs-places-fill', 'acs-places-click-target'], (e) => {
    if (store.state.regionTypeSelection !== 'places') { return null }
    if (e.features.length > 0) {
      let clickedGeoid = e.features[0].properties.GEOID

      if (store.state.selectedPlaceGeoids.includes(clickedGeoid)) {
        store.commit('removeSelectedPlaceGeoids', clickedGeoid)
      } else {
        store.commit('addSelectedPlaceGeoids', clickedGeoid)
        store.commit('focusPlace', clickedGeoid)
      }
    }
  })

  map.on('click', 'counties', (e) => {
    if (store.state.regionTypeSelection !== 'counties') { return null }
    if (e.features.length > 0) {
      let clickedFips = e.features[0].properties.GEOID

      if (store.state.selectedCountyFips.includes(clickedFips)) {
        store.commit('removeSelectedCountyFips', clickedFips)
      } else {
        store.commit('addSelectedCountyFips', clickedFips)
        store.commit('focusCounty', clickedFips)
      }
    }
  })

  function locationTooltip(feature) {
    let displayName = feature.properties['NAME']
    if (feature.properties.selectionType === 'county') {
      displayName += ' County'
    }

    return `
      <div class="tooltip-header">${ displayName }</div>
      <div class="tooltip-body" style="display: flex">
        <div style="width: 50%">
          <div>Total Pop.</div>
          <div style="font-weight: bold">${ d3.format(',')(store.getters.numTotalPop(feature)) }</div>
        </div>
        <div style="width: 50%">
          <div>${ store.state.vulnerabilityMetric?.nameAbsolute(store.state.disasterConfig?.isInternational) }</div>
          <div style="font-weight: bold">${ d3.format(',')(store.getters.numVulnerable(feature)) }</div>
        </div>
      </div>
    `
  }

  map.on('mousemove', 'counties', (e) => {
    if (store.state.regionTypeSelection === 'counties') {
      store.commit('setTooltipHTML', locationTooltip(e.features[0]))
      store.commit('setHoveredCountyId', e.features[0].properties['GEOID'])
      map.getCanvas().parentElement.style.cursor = 'pointer'
    }
  })

  map.on('mouseleave', 'counties', () => {
    if (store.state.regionTypeSelection !== 'counties') { return null }
    map.getCanvas().parentElement.style.cursor = ''
    store.commit(`clearTooltipHTML`)
  })

  const healthcareFacilitiesTemplate = (feature, cityState) => {
    const healthcareColor = settings.getHealthcareGeneralTypeColor(feature.properties['general_type'])
    return `
      <div style="font-weight: bold; text-transform: capitalize; font-size: 16px;">${toTitleCase(feature.properties['name'])}</div>

      <div style="font-size: 12px; margin: 5px 0;">
        <div>${toTitleCase(feature.properties['address'])}</div>
        <div style="margin-bottom: 10px;">${cityState}</div>
      </div>

      <div style="margin: 5px 0;">
        <span
          style="background: ${healthcareColor};
                 padding: 2px 8px;
                 border-radius: 20px;
                 font-weight: bold;
                 text-transform: capitalize;
                 font-size: 12px;
                 color: ${healthcareColor === "#266BF5" ? "#fff" : "#fff"};
                 width: 100%;"
        >
          ${feature.properties['type']}
        </span>
      </div>
      <div style="margin: 10px 0 0; font-size: 14px;">
        ${!feature.properties?.beds || feature.properties['beds'] <= 0
          ? "Bed capacity unknown"
          : `${Math.round(feature.properties['beds'])} bed capacity`}
      </div>
      `
  }

  map.on('mousemove', 'healthcare-facilities', (e) => {
    const cityState = `${toTitleCase(e.features[0].properties['city'])}, CA`
    store.commit('setTooltipHTML', healthcareFacilitiesTemplate(e.features[0], cityState))
  })
  map.on('mouseleave', 'healthcare-facilities', () => {
    store.commit('clearTooltipHTML')
  })

  map.on('mousemove', 'hifld-healthcare-facilities', (e) => {
    const cityState = `${toTitleCase(e.features[0].properties['city'])}, ${e.features[0].properties['STATE']}`
    store.commit('setTooltipHTML', healthcareFacilitiesTemplate(e.features[0], cityState))
  })
  map.on('mouseleave', 'hifld-healthcare-facilities', () => {
    store.commit('clearTooltipHTML')
  })

  map.on('mousemove', 'healthcare-facilities-with-capacities', (e) => {
    const feature = e.features[0]
    const properties = feature.properties
    const healthcareColor = settings.getHealthcareGeneralTypeColor(properties['image'])
    const bedsAvailable = properties['available_beds_7_day_avg'] <= 0 ? "?" : Math.round(properties['available_beds_7_day_avg'])
    const bedsCapacity = properties['inpatient_beds_7_day_avg'] <= 0 ? "?" : Math.round(properties['inpatient_beds_7_day_avg'])
    const bedsPercent = properties['available_beds_7_day_avg'] <= 0 || properties['inpatient_beds_7_day_avg'] <= 0 ? "?" : Math.round(properties['available_beds_7_day_avg_percent']*100)
    const template = `<div style="font-weight: bold; text-transform: capitalize; font-size: 16px;">${toTitleCase(properties['hospital_subtype_singular'])}</div>
      <div style="font-size: 12px; margin: 5px 0;">
        <div>${toTitleCase(properties['address'])}</div>
        <div style="margin-bottom: 10px;">${properties['city']}, ${properties['state']}</div>
      </div>

      <div style="margin: 5px 0;">
        <span
          style="background: ${healthcareColor};
                 padding: 2px 8px;
                 border-radius: 20px;
                 font-weight: bold;
                 text-transform: capitalize;
                 font-size: 12px;
                 color: ${healthcareColor === "#266BF5" ? "#fff" : "#fff"};
                 width: 100%;"
        >
          ${properties['hospital_subtype_singular']}
        </span>
      </div>
      <div style="margin: 10px 0 0; font-size: 14px;">
        ${bedsAvailable} of ${bedsCapacity} beds available (${bedsPercent}%)
      </div>
      <hr/>
      <div style="opacity: 0.6; font-size: 14px;">Updated ${dayjs(e.features[0].properties['collection_week'], 'YYYY-MM-DD').format("MMM D, YYYY")}</div>
      `
    store.commit('setTooltipHTML', template)
  })

  map.on('mouseleave', 'healthcare-facilities-with-capacities', () => {
    store.commit('clearTooltipHTML')
  })

  // document.addEventListener('keyup', (e) => {
  //   // HACK: press S to toggle satellite basemap
  //   if (e.key === 's') {
  //     store.commit('toggleSatelliteBasemap')
  //   }
  // })

  // map.on('mouseleave', 'counties-stroke', () => {
  //   if (hoveredStateId) {
  //     map.setFilter('counties-highlighted', ['in', 'COUNTYFP', ''])
  //   }
  //   hoveredStateId = null
  // })
}
