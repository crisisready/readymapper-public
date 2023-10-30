import dayjs from 'dayjs'
import fetchProgress from 'fetch-progress'
import { csvParse } from 'd3-dsv'

let insertBeforeId

export const helpers = {

  fetchJson: async (path, onProgress) => {
    return helpers.fetch(path, onProgress).then(res => res.json())
  },

  fetchCsv: async (path, onProgress) => {
    let textData = await helpers.fetch(path, onProgress).then(res => res.text())
    return csvParse(textData)
  },

  fetch: async (path, onProgress) => {
    // FIXME: this could be removed once we start setting a proper way to invalidate the cache after data is updated on the backend
    // clear cache
    const hash = crypto.randomUUID()
    let result = await fetch(`${path}?hash=${hash}`, {cache: "no-cache"}).then(fetchProgress({ onProgress }))
    if (result.ok) return result
    else throw new Error('Failed to fetch')
  },

  popDensityFilenameToDate: (popDensityFilename) => {
    return dayjs(popDensityFilename, 'YYYY-MM-DD_hhmm').toDate()
  },

  loadMapboxImage: (map, path, name, opts={}) => {
    return new Promise((resolve, reject) => {
      map.loadImage(path, (error, image) => {
        if (error) {
          console.error(error)
        } else {
          map.addImage(name, image, opts)
        }
        resolve()
      })
    })
  },

  //
  // Useful for inserting mapbox layers below labels + roads
  //
  getLayerInsertionPoint: (map) => {
    // Fetch the id of the layer immediately above the background and store this id
    if (!insertBeforeId) {
      const layers = map.getStyle().layers
      let firstWaterLayer = layers.find(l => l.id.startsWith('water'))
      insertBeforeId = firstWaterLayer.id
    }
    return insertBeforeId
  }
}
