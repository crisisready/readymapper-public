<template>
  <section class="section disaster">
    <div class="chunk">
      <div class="main-section-title">Disaster</div>
    </div>

    <ReportDisasterSectionFire :dateHeader="dateHeader" v-if="disasterType === 'fire'" />
    <ReportDisasterSectionHurricane :dateHeader="dateHeader" v-if="disasterType === 'hurricane' || disasterType === 'cyclone'"  />

    <div class="chunk">
      <ReportNotes :id="'disaster'"/>
    </div>
  </section>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  // import { settings } from '../../constants/settings'

  import ReportDisasterSectionFire from './ReportDisasterSectionFire'
  import ReportDisasterSectionHurricane from './ReportDisasterSectionHurricane'
  import ReportNotes from './ReportNotes'

  export default {
    name: 'ReportDisasterSection',

    components: {
      ReportDisasterSectionFire,
      ReportDisasterSectionHurricane,
      ReportNotes
    },

    props: {
      dateHeader: String,
    },

    data() {
      return {
      }
    },

    computed: {
      ...mapGetters([
      ]),
      ...mapState([
        'disasterConfig',
      ]),
      disasterType() {
        return this.disasterConfig?.type
      }
    },

    methods: {
      ...mapMutations([
      ]),
    },
  }
</script>

<style lang="scss">
</style>
