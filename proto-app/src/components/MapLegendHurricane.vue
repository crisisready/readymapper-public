<template>
  <div class="legend-container" v-if="disasterType === 'hurricane'">
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-icon.png">
        <div>Storm Category</div>
      </div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-wind-speed-perimeter.png">
        <div>Category 1 wind speed perimeter (> 74mph)</div>
      </div>

      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-storm-surge.png">
        <div>Storm surge alert</div>
      </div>
    </div>
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-pathway.png">
        <div>Forecast Pathway</div>
      </div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-wind-speed-chance.png">
        <div>Chance of category 1 wind speeds (> 74mph)</div>
      </div>

    </div>
  </div>
  <div class="legend-container"  v-if="disasterType === 'cyclone'">
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-icon.png">
        <div>Storm Category</div>
      </div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-wind-speed-perimeter.png">
        <div>Category 1 wind speed perimeter (> 119kph)</div>
      </div>
    </div>
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/hurricane-legend-pathway.png">
        <div>Forecast Pathway</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  name: 'MapLegendHurricane',

  computed: {
      ...mapGetters([
        'disasterType',
      ]),
      },
}
</script>

<style lang="scss" scoped>
.legend-container {
  width: 100%;
  display: flex;
}

.legend-col {
  display: flex;
  flex-direction: column;
  align-items: left;
  width: 50%;
  .legend-item:not(:last-child) {
    margin-bottom: 0.5em;
  }
}

.legend-item {
  display: flex;
  align-items: center;

  div {
    font-size: 12px;
  }
}

.legend-image {
  height: 22px;
  margin-right: 6px;
}
</style>
