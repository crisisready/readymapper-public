import * as turf from '@turf/turf'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'
// import { loadFigmassets, loadStoredFigmassets } from 'figmasset'

export const healthcareFacilitiesLayer = {
  // This is California only healthcare data

  async loadData(store, map) {
    let slugs = settings.healthcareFacilityTypes.map(t => t.slug)
    for (const slug of slugs) {
      helpers.loadMapboxImage(map, `img/healthcare-icons/${slug}.png`, slug, { pixelRatio: 2 })
      helpers.loadMapboxImage(map, `img/healthcare-icons/${slug}-Non-Reporting.png`, `${slug}-Non-Reporting`, { pixelRatio: 2 })
    }
    helpers.loadMapboxImage(map, `img/healthcare-icons/Unknown.png`, 'Unknown')

    // loadFigmassets({
    //   map,
    //   frameNames: ['healthcare-icons'],
    //   fileKey: 'X4JStqjQgyDephexTQuh1B',
    //   personalAccessToken: 'figd_SM3bBRS0iGnKg-FzA2A9GT4MC_oIQXesa0ZDxJvX',
    //   scales: [2], // pixel ratios. [1,2] fetches both @1x and @2x versions of each asset.
    // })

    // Run this command to re-export icons from figma
    // npx figmasset-export --file X4JStqjQgyDephexTQuh1B  --token figd_SM3bBRS0iGnKg-FzA2A9GT4MC_oIQXesa0ZDxJvX --frame 'healthcare-icons'
    // loadStoredFigmassets({ map, path: 'img/assets@2x' })

    let healthcareFacilities

    try {
      // WARNING: this is a California specific dataset, more comprehensive than others
      // in terms of nursing facilities
      healthcareFacilities = await helpers.fetchCsv(`${settings.baseUrlData}/current-california-healthcare-facility-listing.csv`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'CA healthcare' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'CA healthcare', complete: true })
    } catch (e) {
      console.warn("Couldn't find CA healthcare facilities. Ignoring.")
      return turf.featureCollection([])
    }

    // Exclude certain facility types from the dataset
    let typesToExclude = settings.healthcareFacilitySubtypes.filter(t => t.exclude).map(t => t.subtype)
    healthcareFacilities = healthcareFacilities.filter(r => {
      return !typesToExclude.includes(r['License Type'])
    })

    healthcareFacilities = turf.featureCollection(
      healthcareFacilities.slice(1).map(row => {
        let point
        try {
          return turf.point([parseFloat(row.Longitude), parseFloat(row.Latitude)], row)
        } catch (e) {
          return null
        }
      })
      .filter(point => !!point)
    )

    healthcareFacilities.features.forEach(f => {
      let type = settings.healthcareFacilitySubtypes.find(t => t.subtype === f.properties['License Type'])?.general_type
      if (type) {
        f.properties.general_type = type
        f.properties.type = f.properties['License Type']
        f.properties.name = f.properties['Facility Name']
        f.properties.beds = f.properties['Number of Beds']
        f.properties.address = f.properties['Facility Address']
        f.properties.city = f.properties['Facility City']
        // set image field
        f.properties.image = type.replaceAll('/', ' ').replaceAll(/\s+/g, '-') + "-Non-Reporting"
        f.properties.image_sort_key = settings.healthcareFacilityTypes.find(d => d.slug === f.properties.image)?.sort_key
      } else {
        console.warn(`Missing category mapping for CA healthcare facility type ${f.properties['License Type']}. Marking as Unknown.`)
        f.properties.general_type = "Unknown"
        // fallback
        f.properties.image = "Unknown"
        f.properties.image_sort_key = 1000
      }
    })

    return healthcareFacilities

  },

  addLayer(map, healthcareFacilities) {

    map.addSource('healthcare-facilities', {
      'type': 'geojson',
      data: healthcareFacilities,
      cluster: true,
      // Max zoom to cluster points on. Should be one less than the zoom at which you want the clusters to disappear
      // when zooming in.
      clusterMaxZoom: 7,
      clusterRadius: 50 // Radius of each cluster when clustering points
    })

    map.addLayer({
      'id': 'healthcare-facilities',
      'type': 'symbol',
      'source': 'healthcare-facilities',
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
        'symbol-sort-key': ['get', 'image_sort_key'],
      },
      'paint': {
        'icon-opacity': 1
      }
    })

    map.addLayer({
      'id': 'healthcare-clusters',
      'type': 'circle',
      'source': 'healthcare-facilities',
      'minzoom': 6,
      'maxzoom': 8,
      'filter': ['has', 'point_count'],
      'paint': {
        'circle-color': '#FCA923',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          10,
          5,
          15,
          10,
          20,
          20,
          40
        ],
        'circle-opacity': 0.7
      },
    });

    map.addLayer({
      'id': 'healthcare-cluster-count',
      'type': 'symbol',
      'source': 'healthcare-facilities',
      'minzoom': 6,
      'maxzoom': 8,
      'filter': ['has', 'point_count'],
      'paint': {
        'text-color': '#ffffff',
      },
      'layout': {
        'text-field': '{point_count_abbreviated}',
        'text-size': 14,
        'text-font': ['Arial Unicode MS Bold'],
        'text-allow-overlap': true
      }
    });

  }

}
