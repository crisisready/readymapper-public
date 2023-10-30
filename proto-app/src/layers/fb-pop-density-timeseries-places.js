import { helpers } from '../helpers'

export async function loadFBPopDensityTimeseriesPlaces(disasterBaseUrlData, store) {
  try {
    let url = `${disasterBaseUrlData}/facebook/population-density/tile/place-estimated-timeseries.csv`
    let label = "Facebook pop. density places"
    let data = await helpers.fetchCsv(url, () => {
      store.commit('bumpLoadProgress', { loadLabel: label })
    })
    store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

    return data
  } catch (e) {
    console.warn('FB Place Pop Density Timeseries not found. Ignoring.')
    return []
  }
}
