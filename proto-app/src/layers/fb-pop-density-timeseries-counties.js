import { helpers } from '../helpers'

export async function loadFBPopDensityTimeseriesCounties(disasterBaseUrlData, store) {
  try {
    let url = `${disasterBaseUrlData}/facebook/population-density/tile/county-timeseries.csv`
    let label = "Facebook pop. density county"
    let data = await helpers.fetchCsv(url, () => {
      store.commit('bumpLoadProgress', { loadLabel: label })
    })
    store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

    return data
  } catch (e) {
    console.warn('FB County Pop Density Timeseries not found. Ignoring.')
    return []
  }
}
