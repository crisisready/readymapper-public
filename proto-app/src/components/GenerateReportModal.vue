<template>
<div v-if="generateReportModalVisible" class="report-modal-wrapper">
  <div class="report-modal-container">
    <div class="report-modal">
      <h2 class="title">Report options</h2>
      <!-- <div v-if="selectedPlaceGeoids.length > 0">
        <h3>Places included</h3>
        <div class="pills">
          <button class="pill" v-for="place in $store.getters.selectedPlaces" :key="place.properties.GEOID">{{ place.properties.NAME }} x</button>
          <button class="pill add">Add a place +</button>
        </div>
      </div> -->

      <!-- <div v-if="selectedCountyFips.length > 0">
        <h3>Counties included</h3>
        <div class="pills">
          <button class="pill" v-for="county in $store.getters.selectedCounties" :key="county.properties.GEOID">{{ county.properties.NAME }} x</button>
          <button class="pill add">Add a county +</button>
        </div>
      </div> -->

      <div>
        <h3>Sections included</h3>
        <p style="margin: 0 0 0.75em; font-size: 0.9em;">Drag to reorder, click to turn on/off</p>
        <draggable
          :list="reportSections"
          @start="dragging = true"
          @end="dragEnd"
          item-key="id"
        >
          <template #item="{element}">
            <div>
              <button
                :class="`pill pointer ${!element.display ? 'gray' : ''}`"
                :value="element.name"
                @click="toggleSection(element.name)"
              >
                {{ element.name }}
              </button>
            </div>
          </template>
        </draggable>
      </div>

      <div class="buttons">
        <a href="#" class="close" @click.prevent="this.$store.commit('setGenerateReportModalVisible', false)">Close</a>
        <!-- <a href="#" class="primary" @click="this.$store.commit('setGenerateReportModalVisible', false)">Show report</a> -->
      </div>
    </div>
  </div>
</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import draggable from 'vuedraggable'

export default {
  name: 'GenerateReportModal',

  components: {
    draggable,
  },

  computed: {
    ...mapState([
      'generateReportModalVisible',
      'selectedCountyFips',
      'selectedPlaceGeoids',
      'counties',
      'acsPlaces',
      'selectedDateTime',
      'regionTypeSelection',
      'reportSections',
    ]),
    ...mapGetters([
      'selectedPlaces',
    ]),
    selectedCounties() {
      return this.counties.features.filter(f => this.selectedCountyFips.includes(f.properties['GEOID']))
    },
  },

  data() {
    return {
      dragging: false,
    }
  },

  props: {
    title: String,
    href: String,
  },

  methods: {
    ...mapMutations([
      'setReportSections',
    ]),
    dragEnd() {
      this.setReportSections(this.reportSections)
    },
    toggleSection(sectionName) {
      const section = this.reportSections.find(d => d.name === sectionName)
      section.display = !section.display
      this.setReportSections(this.reportSections)
    },
  },
}
</script>

<style lang="scss" scoped>
.report-modal-wrapper {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: #656464bd;
  z-index: 1000;
}

.report-modal-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.report-modal {
  height: fit-content;
  max-width: 600px;
  min-width: 300px;
  background: #fff;
  padding: 2em;
  border-radius: 1em;
  text-align: left;

  .title {
    margin-top: 0;
    padding-bottom: 0.5em;
    border-bottom: 1px solid #333;
  }

  h3 {
    margin-bottom: 0.5em;
  }

  .pills {
    :not(:last-child) {
      margin-right: 0.5em;
    }
  }

  .pill {
    border: none;
    margin-bottom: 1em;
    border-radius: 1em;
    background: #d7e2fd;
    color: #0f2f80;
    padding: 0.5em 1em;
    font-weight: bold;
    font-size: 0.9em;
  }

  .gray {
    background: #c1c1c1;
    color: #8e8e8e;
  }

  .add {
    border: 2px solid #0f2f80;
    background: none !important;
  }

  .buttons {
    flex-direction: row;
    display: flex;
    margin-top: 1em;

    .primary {
      border: 2px solid #0f2f80;
      color: #0f2f80;
    }
    .close {
      border: 2px solid #545454;
      color: #333;
    }

    :not(:last-child) {
      margin-right: 1em;
    }

    a {
      text-decoration: none;
      font-size: 0.9em;
      font-weight: bold;
      width: 100%;
      padding: 0.75em 1em;
      text-align: center;
    }
  }
}

.pointer {
  cursor: pointer;
}
</style>
