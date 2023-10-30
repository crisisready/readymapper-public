<template>
  <div class="wrapper">
    <a @click="toggleMenu">
      <div :class="`open-menu-link ${menuOpen ? 'menu-open' : 'menu-closed'}`">
        <div class="title">
          <div style="display: flex; align-items: center; font-weight: 500;"><img style="height: 20px; width: 20px; margin-right: 0.5em;" :src="disasterIconByType(type)"> {{ namePlural }}</div>
          <span v-if="!menuOpen" style="font-weight: 500;">+</span>
          <span v-if="menuOpen" style="font-weight: 500;">-</span>
        </div>
      </div>
    </a>
    <div v-if="menuOpen" class="disasters-list">
      <a class="disaster-link" v-for="d in disastersInfoLive" :key="d.id"
        @click="goToDisaster(d.id)"
      >
        {{ d.name }} <span class="disaster-date">{{ getDisasterYearStart(d.dateStart) }}</span>
      </a>
      <div v-if="disastersInfoArchived.length" :class="`disasters-separator ${disastersInfoLive.length ? 'disasters-separator-border' : ''}`">Archive</div>
      <a class="disaster-link disaster-link-archived" v-for="d in disastersInfoArchived" :key="d.id"
        @click="goToDisaster(d.id)"
      >
        {{ d.name }} <span class="disaster-date">{{ getDisasterYearStart(d.dateStart) }}</span>
      </a>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import * as d3 from 'd3'
import { mapState, mapGetters, mapMutations } from 'vuex'

// import Legend from '../components/Legend'

import { settings } from '../../constants/settings'

export default {
  name: 'NavbarDisasterSelector',

  components: {
    // Legend,
  },

  props: {
    type: String,
    name: String,
    namePlural: String,
  },

  data() {
    return {
      menuOpen: false,
    }
  },

  computed: {
    ...mapState([
      'disasters',
    ]),
    ...mapGetters([
      'disasterIconByType'
    ]),
    disastersInfo() {
      return this.disasters
        .filter(d => d.isPublic)
        .filter(d => d.type === this.type)
        .sort((a, b) => d3.descending(a?.dateStart, b?.dateStart))
    },
    disastersInfoLive() {
      return this.disastersInfo
        .filter(d => !d?.isArchived)
    },
    disastersInfoArchived() {
      return this.disastersInfo
        .filter(d => d.isArchived)
    },
  },

  watch: {

  },

  methods: {
    ...mapMutations([
    ]),

    toggleMenu() {
      this.menuOpen = !this.menuOpen
    },

    goToDisaster(disasterId) {
      let url = window.location.href.split('?')[0]
      window.location.href = `${url}?disasterId=${disasterId}`
      location.reload()
    },

    getDisasterYearStart(dateStart) {
      return dayjs(dateStart).format("MMM YYYY")
    },
  }
}
</script>

<style lang="scss" scoped>
.wrapper {
  margin-bottom: 0.5em;
}

.title {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
}

.open-menu-link {
  padding: 8px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.open-menu-link.menu-closed:hover {
  background: rgba(214, 221, 235, 0.3);
}

.open-menu-link.menu-open {
  background: rgba(214, 221, 235, 0.3);
  border-radius: 6px 6px 0px 0px;
}

.open-menu-link.menu-open:hover {
  background: rgba(214, 221, 235, 0.5);
}


.disasters-list {
  background: #D6DDEB;
  display: flex;
  flex-direction: column;
  border-radius: 0px 0px 6px 6px;
  padding: 4px 0;
}

.disaster-link {
  color: #0F2F80;
  text-decoration: none;
  font-size: 1em;
  font-weight: 500;
  padding: 6px 12px;
  cursor: pointer;
}
.disaster-link:hover {
  color: #0f2f80a3;
}

.disaster-date {
  font-size: 70%;
  font-weight: normal;
}

.disasters-separator {
  color: #4B63A0;
  font-size: 12px;
  font-weight: normal;
  text-transform: uppercase;
  margin: 0 12px;
  padding-top: 0.5em;
}

.disasters-separator-border {
  border-bottom: 1px solid #4B63A0;
}
</style>
