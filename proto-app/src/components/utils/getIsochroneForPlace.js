import * as turf from '@turf/turf'
import { json } from 'd3-fetch'
import { settings } from '../../../constants/settings'

const getIsochronesFromApi = async (feature) => {
  if (!feature) return
  const centroid = turf.centroid(feature).geometry?.coordinates
  if (!centroid) return
  const [lng, lat] = centroid
  const data = await json (`https://api.mapbox.com/isochrone/v1/mapbox/driving/${lng}%2C${lat}?contours_minutes=15%2C30%2C45%2C60&polygons=true&denoise=1&access_token=${settings.mapboxAccessToken}`)
  return data
}

export const getIsochroneForPlace = async (placeFeature, placeId, isochronesData, setIsochronesData) => {
  if (placeId in isochronesData) {
    return isochronesData[placeId]
  } else {
    const data = await getIsochronesFromApi(placeFeature)
    setIsochronesData({placeId: placeId, isochrone: data})
    return data
  }
}
