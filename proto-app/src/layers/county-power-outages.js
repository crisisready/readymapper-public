import dayjs from 'dayjs'
import _ from 'underscore'
import { helpers } from '../helpers'

export const countyPowerOutagesLayer = {

  async loadData(disasterBaseUrlData, store) {
    try {
      let url = `${disasterBaseUrlData}/power-outages/county-power-outages.csv`
      let label = 'Power outages county'
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

  addLayer(map, powerOutages) {
    map.addLayer({
      'id': 'counties-power-outages',
      'type': 'symbol',
      'source': 'counties-centroids',
      'layout': {
        'icon-allow-overlap': true,
        'icon-size': 1,
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
        // map.addImage('power-outage', image)
        map.setLayoutProperty('counties-power-outages', 'icon-image', 'power-outage')
      }
    })

  }

}
