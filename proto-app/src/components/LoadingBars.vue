<template lang="html">
  <div class="loading-bars-container">
    <div v-if="selectedDisasterName" class="loading-header">Loading data layers for {{ selectedDisasterName }}</div>
    <div v-for="(progress, name) in loadProgress" :key="name">
      <div class="item">
        <div class="item-name">{{ name }}</div>
        <div class="item-progress">
          <div class="progress-bar" :class="{ complete: progress.complete }"
               :style="{ width: `${(progress.count % 10) / 10 * 100}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'LoadingBars',
  computed: {
    ...mapState([
      'loadProgress',
    ]),
    ...mapGetters([
      'selectedDisasterName',
    ])
  },
}
</script>

<style lang="scss" scoped>
.loading-bars-container {
  height: 300px;
}

.loading-header {
  margin-bottom: 40px;
}

.item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.item-name {
  font-size: 14px;
  margin-right: 10px;
  width: 200px;
  text-align: left;
}

.item-progress {
  position: relative;
  display: flex;
  width: 180px;
}

.progress-bar {
  height: 8px;
  background: #D6DDEB;
  margin: 2px;
  transition: background 1s ease, width 0.2s ease;
}

.progress-bar.complete {
  background: #0F2F80;
  width: 100% !important;
}
</style>
