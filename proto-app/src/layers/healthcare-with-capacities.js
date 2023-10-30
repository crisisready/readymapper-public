import * as turf from '@turf/turf'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'

export const healthcareFacilitiesWithCapacitiesLayer = {

  async loadData(map, disasterBaseUrlData, store) {
    let healthcareFacilitiesWithCapacities
    try {
      let url = `${disasterBaseUrlData}/hhs-bed-capacity/data.csv`
      let label = 'Mapbox activity county'
      healthcareFacilitiesWithCapacities = await helpers.fetchCsv(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })
    } catch (e) {
      console.warn("Couldn't find healthcare capacity data. Ignoring.")
      console.error(e);
      return turf.featureCollection([])
    }
    healthcareFacilitiesWithCapacities = turf.featureCollection(
      healthcareFacilitiesWithCapacities.reverse().map(row => {
        let point
        try {
          return turf.point([row.geocoded_hospital_address_lng, row.geocoded_hospital_address_lat], row)
        } catch (e) {
          return null
        }
      })
      .filter(point => !!point)
    )

    healthcareFacilitiesWithCapacities.features.forEach(f => {
      // calculate available beds field, assuming good data
      f.properties.available_beds_7_day_avg = f.properties.inpatient_beds_7_day_avg - f.properties.inpatient_beds_used_7_day_avg
      // if beds used is unknown, set to -1 (unknown)
      f.properties.available_beds_7_day_avg = f.properties.inpatient_beds_used_7_day_avg < 0 ? -1 : f.properties.available_beds_7_day_avg

      // calculate available beds percentage, avoiding NaN
      f.properties.available_beds_7_day_avg_percent = f.properties.inpatient_beds_7_day_avg <= 0 ? 0 : (f.properties.inpatient_beds_7_day_avg - f.properties.inpatient_beds_used_7_day_avg) / f.properties.inpatient_beds_7_day_avg
      // if beds used is unknown, set to -1
      f.properties.available_beds_7_day_avg_percent = f.properties.inpatient_beds_used_7_day_avg < 0 ? -1 : f.properties.available_beds_7_day_avg_percent

      let type = settings.healthcareFacilitySubtypes.find(t => t.subtype === f.properties.hospital_subtype)?.general_type
      if (!type) {
        console.log("NO TYPE", f.properties.hospital_subtype)
        return
      }
      f.properties.hospital_general_type_singular = type.slice(-1) == "s" ? type.substring(0, type.length - 1) : type
      let subtype = f.properties.hospital_subtype
      f.properties.hospital_subtype_singular = subtype.slice(-1) == "s" ? subtype.substring(0, subtype.length - 1) : subtype
      // set image field
      f.properties.image = type.replaceAll('/', ' ').replaceAll(' ', '-')
      if (f.properties.available_beds_7_day_avg == -1) {
        f.properties.image += "-Non-Reporting"
      }
      f.properties.image_sort_key = settings.healthcareFacilityTypes.find(d => d.slug === f.properties.image)?.sort_key
    })

    return healthcareFacilitiesWithCapacities
  },

  addLayer(map, healthcareFacilitiesWithCapacities) {
    map.addSource('healthcare-facilities-with-capacities', {
      'type': 'geojson',
      data: healthcareFacilitiesWithCapacities,
      cluster: true,
      clusterMaxZoom: 7, // Max zoom to cluster points on
      clusterRadius: 50 // Radius of each cluster when clustering points
    })

    map.addLayer({
      'id': 'healthcare-facilities-with-capacities',
      'type': 'symbol',
      'source': 'healthcare-facilities-with-capacities',
      'minzoom': 8,
      'layout': {
        'icon-allow-overlap': true,
        'icon-size': [
          "interpolate",
          ["linear"],
          ["zoom"],
          8, 0.7,
          10, 1
        ],
        'icon-anchor': 'center',
        'icon-image': ['get', 'image'],
        'visibility': 'none',
        'symbol-sort-key': ['get', 'image_sort_key'],
      },
      'paint': {
        'icon-opacity': 1
      }
    });
  },

}
