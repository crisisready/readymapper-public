<template>
  <div class="tab-group">
    <div
      v-for="tab in mapTabs.tabs"
      :key="tab.name"
      class="tab-container"
      :style="{ flexGrow: tab.name === 'Movement' ? 1 : 0 }"
      :class="{ toggled: currentTab === tab.id }"
      @click="setTab(tab.id)">
      <div class="tab">{{ tab.name }}</div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import { mapTabs } from '../../constants/mapTabs'

export default {
  name: 'TabSelection',

  components: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'currentTab',
    ]),
    ...mapGetters([
    ]),
    mapTabs() {
      return mapTabs
    },
  },

  watch: {

  },

  methods: {
    ...mapMutations([
      'setTab',
    ]),
  }
}
</script>

<style lang="scss" scoped>
.tab-group {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  padding: 0px 15px;
}

.tab-container {
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  color: #878787;
  cursor: pointer;
  border-bottom: 1px solid #D8D8D8;

  .tab {
    display: inline-block;
    padding-bottom: 4px;
    padding-top: 12px;
  }

  &.toggled {
    .tab {
      color: #EA9014;
      border-bottom: 2px solid #EA9014;  
    }
  }

  &:hover {
    color: #EA9014;
  }
}
</style>
