<template>
  <div class="logos">
    <a href="https://crisisready.io/">
      <img class="logo" src="img/crisis-ready-logo-lg.png">
    </a>
    <div class="logos-sub">
      <a href="https://datascience.harvard.edu/">
        <img class="logo" src="img/hdsi-logo.png">
      </a>
      <a href="https://www.directrelief.org/">
        <img class="logo" src="img/direct-relief-logo.png">
      </a>
    </div>
  </div>
</template>

<script>
export default {
}
</script>

<style lang="scss" scoped>
.logos {
  display: flex;
  align-items: center;

  a {
    height: 100%;
  }
}

.logos-sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-left: 2px solid #D6DDEB;
  margin-left: 1em;
  padding-left: 1em;

  a {
    &:last-child {
      padding-top: 8px;
    }
  }
}

.logo {
  height: 100%;
}
</style>
