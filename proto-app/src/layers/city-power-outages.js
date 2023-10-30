import dayjs from 'dayjs'
import _ from 'underscore'
import { helpers } from '../helpers'

export const cityPowerOutagesLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
      let url = `${disasterBaseUrlData}/power-outages/city-power-outages.csv`
      let label = 'Power outages city'
      let powerOutages = await helpers.fetchCsv(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

      powerOutages.forEach(row => {
        // IMPROVE: should be done in data processing
        // Zero pad CountyFIPS to 5 digits if necessary.
        row['CountyFIPS'] = row['CountyFIPS'].length == 4 ? "0" + row['CountyFIPS'] : row['CountyFIPS']
        row['CustomersTracked'] = parseInt(row['CustomersTracked'])
        row['CustomersOut'] = parseInt(row['CustomersOut'])
        row['CustomersOutPercent'] = row['CustomersOut']/row['CustomersTracked']
        // Add date property (handle data field typo)
        if (powerOutages[0]['RecordDateTime'] != null) {
          row['RecordedDateTime'] = row['RecordDateTime']
        }
        row.date = dayjs(row['RecordedDateTime']).toDate()
      })

      // Sort by date
      powerOutages = _.sortBy(powerOutages, row => row.date)

      return powerOutages
    } catch (e) {
      console.warn('Power outage data not found. Ignoring.')
      return null
    }
  },

  // addLayer(map, powerOutages) {
  //   map.addLayer({
  //     'id': 'acs-places-power-outages',
  //     'type': 'fill',
  //     'source': 'acs-places',
  //     'paint': {
  //       'fill-opacity': 1,
  //       'fill-pattern': 'power-outage'
  //     }
  //   })

  //   map.addLayer({
  //     'id': 'counties-power-outages',
  //     'type': 'fill',
  //     'source': 'ca-counties',
  //     'paint': {
  //       'fill-opacity': 1,
  //       'fill-pattern': 'power-outage'
  //     }
  //   })

  addLayer(map, powerOutages) {
    map.addLayer({
      'id': 'acs-places-power-outages',
      'type': 'symbol',
      'source': 'acs-places-centroids',
      'layout': {
        'icon-allow-overlap': true,
        'icon-size': 0.75,
        'icon-anchor': 'bottom'
      },
      'paint': {
        'icon-opacity': 0
      }
    })

    map.loadImage('img/power-outage.png', (error, image) => {
      if (error) {
        console.error(error)
      } else {
        map.addImage('power-outage', image)
        map.setLayoutProperty('acs-places-power-outages', 'icon-image', 'power-outage')
      }
    })

  }

}
