import * as turf from '@turf/turf'
import { helpers } from '../helpers'
import { settings } from '../../constants/settings'

export const hifldHealthcareFacilitiesLayer = {

  async loadData(store, map) {
    let slugs = settings.healthcareFacilityTypes.map(t => t.slug)
    for (const slug of slugs) {
      helpers.loadMapboxImage(map, `img/healthcare-icons/${slug}.png`, slug, { pixelRatio: 2 })
      helpers.loadMapboxImage(map, `img/healthcare-icons/${slug}-Non-Reporting.png`, `${slug}-Non-Reporting`, { pixelRatio: 2 })
    }
    
    let healthcareFacilities

    try {
      healthcareFacilities = await helpers.fetchCsv(`${settings.baseUrlData}/hifld/data.csv`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'HIFLD healthcare' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'HIFLD healthcare', complete: true })
    } catch (e) {
      console.warn("Couldn't find HIFLD healthcare facilities. Ignoring.")
      return turf.featureCollection([])
    }

    healthcareFacilities = turf.featureCollection(
      healthcareFacilities.slice(1).map(row => {
        let point
        try {
          return turf.point([parseFloat(row.longitude), parseFloat(row.latitude)], row)
        } catch (e) {
          return null
        }
      })
      .filter(point => !!point)
    )

    healthcareFacilities.features.forEach(f => {
      let type = settings.healthcareFacilitySubtypes.find(t => t.subtype === f.properties['type'])?.general_type
      if (type) {
        f.properties.general_type = type
        // set image field
        f.properties.image = type.replaceAll('/', ' ').replaceAll(/\s+/g, '-') + "-Non-Reporting"
        f.properties.image_sort_key = settings.healthcareFacilityTypes.find(d => d.slug === f.properties.image)?.sort_key
      } else {
        console.warn(`Missing category mapping for HIFLD healthcare facility type ${f.properties['type']}. Marking as Unknown.`)
        f.properties.general_type = "Unknown"
        // fallback
        f.properties.image = "Unknown"
        f.properties.image_sort_key = 1000
      }
    })

    return healthcareFacilities
  },

}
