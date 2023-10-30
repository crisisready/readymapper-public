import * as turf from '@turf/turf'
import { helpers } from '../helpers'

export const fbMobilityLayer = {

  async loadData(store, disasterBaseUrlData) {
    // Facebook Mobility Data

    //
    // TILE
    //

    let tileFBFlows
    try {
      let tileMobilityData = await helpers.fetchCsv(`${disasterBaseUrlData}/facebook/mobility/tile/data.csv`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'Facebook mobility tile' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'Facebook mobility tile', complete: true })

      // String -> Number
      tileMobilityData.forEach(row => {
        row['percent_change'] = parseFloat(row['percent_change'])
        row['n_crisis'] = parseFloat(row['n_crisis'])
        row['n_baseline'] = parseFloat(row['n_baseline'])
      })

      let tileMobilityDataFeatures = tileMobilityData
        .filter(row => parseFloat(row['length_km']) > 5)
        .map(row => {
          try {
            return turf.lineString([[parseFloat(row.start_lon), parseFloat(row.start_lat)], [parseFloat(row.end_lon), parseFloat(row.end_lat)]], row)
          } catch (e) {
            return null
          }
        })
        .filter(feature => !!feature)

      tileFBFlows = turf.featureCollection(tileMobilityDataFeatures)
    } catch (e) {
      console.warn("Tile mobility flows not found. Ignoring.")
      // failed to fetch tile mobility data
      tileFBFlows = turf.featureCollection([])
    }

    //
    // ADMIN
    //

    let adminFBFlows
    try {
      // The historical mobility data does not appear to use county admin boundaries. Maybe zip codes?
      let adminMobilityData = await helpers.fetchCsv(`${disasterBaseUrlData}/facebook/mobility/admin/data.csv`, () => {
        store.commit('bumpLoadProgress', { loadLabel: 'Facebook mobility admin' })
      })
      store.commit('bumpLoadProgress', { loadLabel: 'Facebook mobility admin', complete: true })

      let adminMobilityDataFeatures = adminMobilityData
        .map(row => {
          try {
            return turf.lineString([[parseFloat(row.start_lon), parseFloat(row.start_lat)], [parseFloat(row.end_lon), parseFloat(row.end_lat)]], row)
          } catch (e) {
            return null
          }
        })
        .filter(feature => !!feature)

      adminFBFlows = turf.featureCollection(adminMobilityDataFeatures)
    } catch (e) {
      console.warn("Admin mobility flows not found. Ignoring.")
      // failed to fetch admin mobility data
      adminFBFlows = turf.featureCollection([])
    }

    return { tileFBFlows, adminFBFlows }
  },

  addLayer() {

  }
}
