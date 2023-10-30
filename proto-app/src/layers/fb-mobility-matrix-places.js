import { helpers } from '../helpers'

export async function loadFBMobilityMatrixPlaces(disasterBaseUrlData, store) {
  try {
    let url = `${disasterBaseUrlData}/facebook/mobility/tile/place-matrix.csv`
    let label = "Facebook mobility matrix places"
    let data = await helpers.fetchCsv(url, () => {
      store.commit('bumpLoadProgress', { loadLabel: label })
    })
    store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

    return data
  } catch (e) {
    console.warn('FB Place Mobility Matrix not found. Ignoring.')
    return []
  }
}