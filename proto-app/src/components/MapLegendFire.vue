<template>
  <div class="legend-container">
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/fire-diff.png">
        <div>Fire perimeter</div>
      </div>
    </div>
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;" src="img/fire.png">
        <div>New fire perimeter growth</div>
      </div>
    </div>
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 23px;" src="img/smoke.png">
        <div>Heavy Density Smoke</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MapLegendFire',
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
  display: block;
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
