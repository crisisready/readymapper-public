<template lang="html">
  <div style="display: flex; align-items: center; flex-wrap: wrap;">
    <div :style="`display: flex; align-items: center; width: ${columnWidth};`" v-for="type in facilityTypes" :key="type.slug">
      <img style="width: 25px; margin-right: 2px" :src="`img/healthcare-icons/${type.slug}.png`">
      <div style="font-size: 13px;">{{type.name}}</div>
    </div>
  </div>
</template>

<script>
import { settings } from '../../constants/settings'

export default {
  name: 'HealthcareFacilitiesLegend',

  props: {
    columnWidth: String
  },

  data() {
    return {
    }
  },

  computed: {
    facilityTypes() {
      return [...new Set(settings.healthcareFacilityTypes.map((t) => {
        return {name: t.general_type, slug: t.slug}
      }))]
    },
  }
}
</script>

<style lang="scss" scoped>

</style>
