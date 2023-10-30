<template>
  <router-view/>
</template>

<style lang="scss">
@import './variables.scss';

html, body {
  margin: 0px;

  // This is important for making div background colors show up when printing the report
  -webkit-print-color-adjust: exact !important;
}

#app {
  font-family: Rubik, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.mapboxgl-canvas {
  outline: none !important;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

button {
  background: none;
  border: none;
  color: $vibrant-blue;
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: rgba($vibrant-blue, 0.9);
  }
}

.circle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 100%;
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  &.solid {
    background: $vibrant-blue;
    &:hover {
      background: #0064DA;
    }
  }

  &.empty {
    border: 1px solid $vibrant-blue;
    &:hover {
      background: rgba($vibrant-blue, 0.1);
    }
  }

  &.grey {
    background: $grey;
  }
}

</style>
