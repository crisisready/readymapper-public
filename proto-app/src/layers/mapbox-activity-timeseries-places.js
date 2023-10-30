import { helpers } from '../helpers'

export async function loadMapboxActivityTimeseriesPlaces(disasterBaseUrlData, store) {
  try {
    let url = `${disasterBaseUrlData}/mapbox-activity/place-timeseries.csv`
    let label = 'Mapbox activity place'
    let data = await helpers.fetchCsv(url, () => {
      store.commit('bumpLoadProgress', { loadLabel: label })
    })
    store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

    return data
  } catch (e) {
    console.warn('Mapbox Activity Places Timeseries not found. Ignoring.')
    return []
  }
}
