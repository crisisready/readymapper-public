<template>
  <div class="disaster-title" :class="{ collapsed: headerCollapsed }" @click="toggleHeaderCollapsed()">
    <img :src="disasterIconByType(disasterType)">
    <h1>{{ selectedDisasterName }}</h1>  
    <img v-if="!headerCollapsed" style="margin-left: auto;" src="img/minus-icon.svg">
    <img v-if="headerCollapsed" style="margin-left: auto;" src="img/plus-icon.svg">
  </div>
  
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'DisasterSelection',

  components: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'headerCollapsed',
      'disasterType'
    ]),
    ...mapGetters([
      'disasterType',
      'selectedDisasterName',
      'disasterIconByType',
    ]),
  },

  watch: {

  },

  methods: {
    ...mapMutations([
      'setDisasterSelectionModalVisible',
      'toggleHeaderCollapsed'
    ]),
  }
}
</script>

<style lang="scss" scoped>
@import '../variables.scss';

.disaster-title {
  border-radius: 6px 6px 0 0;
  height: 46px;
  color: white;
  background: #0F2F80;
  padding: 0px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: border-radius 0.2s ease;

  &.collapsed {
    border-radius: 6px;
  }

  h1 {
    font-size: 20px;
    margin-left: 10px;
  }
}
</style>
