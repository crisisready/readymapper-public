import { settings } from '../../../constants/settings'

export const generateReportMaps = async (disasterConfig, map, setTab, setReportMapViews) => {

  const generateSVGImage = async (svgId) => {
    return new Promise((resolve, reject) => {
      // Create a data URL for the SVG
      let svg = document.querySelector(`#${svgId}`)
      let data = (new XMLSerializer()).serializeToString(svg)
      let svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" })

      let svgDataUrl = window.URL.createObjectURL(svgBlob)
      // Weirdly, we can't use just this svg data url on its own
      // because it doesn't scale when you scale the image.

      // Create a canvas
      let canvas = document.createElement("canvas")
      canvas.width = map.getCanvas().clientWidth
      canvas.height = map.getCanvas().clientHeight
      let ctx = canvas.getContext("2d")

      // Load svg into image and draw to canvas
      var img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        window.URL.revokeObjectURL(svgDataUrl)
        resolve(canvas)
      }
      img.src = svgDataUrl
    })
  }

  let svgImage

  const generateMapImage = async (tabName, reportSectionName) => {
    setTab(tabName)
    // idle event signifies map is finished rendering the map layers for the desired tab
    await new Promise(resolve => map.once('idle', () => resolve()))

    let mapImageCanvas = document.createElement('canvas')
    mapImageCanvas.width = map.getCanvas().clientWidth
    mapImageCanvas.height = map.getCanvas().clientHeight
    let mapImageCtx = mapImageCanvas.getContext('2d')

    // First draw the mapbox map
    mapImageCtx.drawImage(map.getCanvas(), 0, 0)

    // If it's a hurricane, add the hurricane layer on top
    if (disasterConfig.type === 'hurricane') {
      svgImage = svgImage || (await generateSVGImage('hurricane-forecast-canvas'))
      mapImageCtx.drawImage(svgImage, 0, 0)
    }

    // If it's a cyclone, add the cyclone layer on top
    if (disasterConfig.type === 'cyclone') {
      svgImage = svgImage || (await generateSVGImage('cyclone-forecast-canvas'))
      mapImageCtx.drawImage(svgImage, 0, 0)
    }


    setReportMapViews({ id: reportSectionName, image: mapImageCanvas.toDataURL() })
  }

  // Generating full-size maps for now
  // to prevent changes in zoom from messing
  // with map styling.

  // const previousBounds = map.getBounds()
  // const mapContainer = document.getElementById('map')
  // mapContainer.style.width = settings.reportMapImages.width
  // mapContainer.style.height = settings.reportMapImages.height
  // map.resize()
  // map.fitBounds(previousBounds)

  // generate images
  await generateMapImage('disasterReport', 'disaster')
  await generateMapImage('vulnerability', 'vulnerability')
  await generateMapImage('movement', 'movement')
  await generateMapImage('infrastructureReport', 'infrastructure')
  await generateMapImage('movement', 'mobilityMatrix')

  // restore map dimensions
  // mapContainer.style.width = ''
  // mapContainer.style.height = ''
  // map.resize()
  // map.fitBounds(previousBounds)


}
