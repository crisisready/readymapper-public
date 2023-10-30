import { helpers } from '../helpers'

import { settings } from '../../constants/settings'

export const dmeLayer = {

  async loadData(map, store) {
    try {
      let url = `${settings.baseUrlData}/dme/dme_all_states_202209.csv`
      let label = 'DME'
      let dmeUsers = await helpers.fetchCsv(url, () => {
        store.commit('bumpLoadProgress', { loadLabel: label })
      })
      store.commit('bumpLoadProgress', { loadLabel: label, complete: true })

      return {
        dmeUsers
      }
    } catch(e) {
      console.warn("Couldn't find dme data. Ignoring.")
      return { dmeUsers: [] }
    }
  },
}
