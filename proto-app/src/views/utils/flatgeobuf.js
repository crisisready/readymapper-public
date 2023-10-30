export const convertDisasterBboxToFgbBBox = (disasterConfig) => {
  const {swLng, swLat, neLng, neLat} = disasterConfig
  return {
      minX: swLng,
      maxX: neLng,
      minY: swLat,
      maxY: neLat,
  }
}
