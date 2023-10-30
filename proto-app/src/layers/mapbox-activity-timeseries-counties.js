import { helpers } from '../helpers'

export async function loadMapboxActivityTimeseriesCounties(disasterBaseUrlData, store) {
  try {
    let url = `${disasterBaseUrlData}/mapbox-activity/county-timeseries.csv`
    let label = 'Mapbox activity county'
    let data = await helpers.fetchCsv(url, () => {
      store.commit('bumpLoadProgress', { loadLabel: label })
    })
    store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

    return data
  } catch (e) {
    console.warn('Mapbox Activity County Timeseries not found. Ignoring.')
    return []
  }
}
