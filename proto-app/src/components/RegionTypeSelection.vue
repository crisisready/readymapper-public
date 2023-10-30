<template>
  <div class="region-selection-container">
    <div class="toggle-group">
      <button
        v-for="type in regions.types"
        :key="type.id"
        class="toggle"
        :class="{ toggled: regionTypeSelection === type.id }"
        @click="setRegionType(type.id)"
      >
        {{ type.name }}
      </button>
    </div>
    <div class="selected-locations">
      <img src="img/selected-locations-icon.svg">
      <div>{{selectedLocationsNumber}}</div>
    </div>
    <button @click="clearSelectedLocations()">Clear All</button>
  </div>
</template>


<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import { regions } from '../../constants/regions'

export default {
  name: 'RegionTypeSelection',

  components: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      "regionTypeSelection",
      "selectedCountyFips",
      "selectedPlaceGeoids",
      "selectedLocations",
    ]),
    ...mapGetters([
    ]),
    regions() {
      return regions
    },
    regionType() {
      return regions.types.find(d => d.id === this.regionTypeSelection)
    },
    locationName() {
      if (this.selectedLocationsNumber === 1) { return this.regionType?.nameSingular }
      return this.regionType?.name
    },
    selectedLocationsNumber() {
      return this.selectedLocations?.length || 0
    }
  },

  watch: {
  },

  methods: {
    ...mapMutations([
      'clearCurrentLocation',
      'setSelectedPlaceGeoids',
      'setSelectedCountyFips',
      'setRegionTypeSelection',
      'clearFocusedCounty',
      'clearFocusedPlace',
    ]),

    setRegionType(typeId) {
      this.clearSelectedLocations()
      this.setRegionTypeSelection(typeId)
    },

    clearSelectedLocations() {
      this.clearCurrentLocation()
      this.setSelectedPlaceGeoids([])
      this.setSelectedCountyFips([])
      this.clearFocusedCounty()
      this.clearFocusedPlace()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../variables.scss';

.region-selection-container {
  border-top: 1px solid $light-grey;
  display: flex;
  justify-content: space-between;
  margin: 0px 15px;
  padding: 12px 0px;
}

.toggle-group {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  width: 200px;
}

.toggle {
  font-family: 'Rubik', sans-serif;
  font-weight: 500;

  align-items: center;
  justify-content: center;
  display: flex;
  width: 100%;
  height: 25px;

  border: 1px solid $vibrant-blue;
  background: none;
  cursor: pointer;
  box-sizing: border-box;

  font-size: 14px;
  line-height: 17px;
  text-align: center;
  color: $vibrant-blue;

  border-radius: 4px 0 0 4px;
  &:last-child {
    border-radius: 0 4px 4px 0;
    border-left: none;
  }

  &.toggled {
    background: rgba($vibrant-blue, 0.2);
  }

  &:hover {
    background: rgba($vibrant-blue, 0.1);
  }
}

.selected-locations {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: $light-grey;
  border-radius: 20px;
  width: 80px;
}
</style>
