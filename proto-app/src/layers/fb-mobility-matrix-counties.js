import { helpers } from '../helpers'

export async function loadFBMobilityMatrixCounties(disasterBaseUrlData, store) {
  try {
    let url = `${disasterBaseUrlData}/facebook/mobility/tile/county-matrix.csv`
    let label = "Facebook mobility matrix county"
    let data = await helpers.fetchCsv(url, () => {
      store.commit('bumpLoadProgress', { loadLabel: label })
    })
    store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

    return data
  } catch (e) {
    console.warn('FB County Mobility Matrix not found. Ignoring.')
    return []
  }
}