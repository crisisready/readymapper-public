<template>

<div>
  <HtmlTitle :title="`${this.siteTitle} - Home`" />
  <!-- Commenting out landing page. For now, this component will redirect to whichever
  disaster is flagged as "default". -->

  <!-- <div class="disaster-menu" v-if="disasters.length > 0">
    <h2>Select an event:</h2>
    <div class="disaster-list">
      <router-link class="disaster-row" v-for="item in publicDisasters" :key="item.id"
                 :to="{ path: '/disaster', query: { disasterId: item.id } }" >
        {{ item.name }}
      </router-link>
    </div>
  </div> -->
</div>

</template>

<script>
import { mapState, mapGetters } from 'vuex'

import { useLocalBackend } from '../../constants/settings'

import HtmlTitle from '../components/HtmlTitle.vue';

export default {
  name: 'LandingPage',

  components: {
    HtmlTitle,
  },

  computed: {
    ...mapState([
      'disasters',
    ]),
    ...mapGetters([
      'siteTitle',
    ]),
    publicDisasters() {
      if (useLocalBackend) return this.disasters
      return this.disasters.filter(d => d.isPublic == true)
    },
  },
  mounted: async function() {
    await new Promise((resolve) => { this.$store.dispatch('getDisasters').then(() => { resolve() }) })
    await new Promise((resolve) => { this.$store.dispatch('getAboutData').then(() => { resolve() }) })

    let defaultDisaster = this.publicDisasters.find(f => f.default)

    // backup in case someone erases the default
    if (!defaultDisaster) defaultDisaster = this.publicDisasters[0]

    this.$router.push({ path: '/disaster', query: { disasterId: defaultDisaster.id } })
  }
}
</script>

<style lang="scss" scoped>
.disaster-menu {
  position: relative;
  top: 200px;
  width: 400px;
  left: 50%;
  transform: translateX(-50%);
}

.disaster-row {
  display: block;
  padding: 20px;
  text-align: left;
  color: black;
  text-decoration: none;
  border: 1px solid;
  border-top: none;

  &:visited {
    color: black;
    text-decoration: none;
  }

  &:first-child {
    border-top: 1px solid;
  }

  &:hover {
    text-decoration: underline;
  }
}
</style>
