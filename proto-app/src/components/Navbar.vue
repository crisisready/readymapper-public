<template>
  <nav :class="`nav-container ${navbarOpen ? 'nav-open': 'nav-closed'}`">
    <div class="nav-wrapper">
      <div class="content">
        <div :class="`logo-container ${!navbarOpen && 'justify-center'}`" @click="toggleOpen">
          <img style="height: 30px; width: 21px;" src="img/ready-mapper-logo.png">
          <p v-if="navbarOpen" class="nav-title"><span class="b">Ready</span>Mapper</p>
        </div>
        <div v-if="!navbarOpen" class="disaster-icons-container">
          <button class="disaster-button" @click="openDisaster('fire')">
            <img style="height: 20px; width: 20px;" src="img/wildfire-header-icon.svg">
          </button>
          <button class="disaster-button" @click="openDisaster('hurricane')">
            <img style="height: 20px; width: 20px;" src="img/hurricane-header-icon.svg">
          </button>
        </div>
        <div v-if="navbarOpen" class="disaster-selection-container">
          <p class="subtitle">Scenarios</p>
          <div v-for="type in disasterTypes" :key="type.id">
            <NavbarDisasterSelector :type="type.id" :name="type.name" :namePlural="type.namePlural" />
          </div>
        </div>
      </div>
      <div class="footer">
        <div style="margin-bottom: 20px">
          <div class="contact-info" @click="setAboutModalVisible(true)">
            <button><img src="img/info-icon.svg" /></button>
            <a v-if="navbarOpen">About Us</a>
          </div>
        </div>

        <div class="footer-wrapper" :style="navbarOpen ? 'align-self: flex-end;' : ''">
          <button class="toggle-button" @click="toggleOpen">
            <img v-if="!navbarOpen" aria-label="Open navbar" style="height: 20px; width: 20px;" src="img/navbar-arrow.png">
            <img v-if="navbarOpen" aria-label="Close navbar" style="height: 20px; width: 20px;" src="img/navbar-arrow-close.png">
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import NavbarDisasterSelector from '../components/NavbarDisasterSelector'

import { settings } from '../../constants/settings'

export default {
  name: 'Navbar',

  components: {
    NavbarDisasterSelector,
  },

  data() {
    return {
      navbarOpen: false,
    }
  },

  computed: {
    ...mapState([
    ]),
    ...mapGetters([
    ]),
    disasterTypes() {
      return settings.disasterTypes
    },
   },

  watch: {
    navbarOpen(value) {
      this.setNavbarOpen(value)
    },
  },

  methods: {
    ...mapMutations([
      'setNavbarOpen',
      'setAboutModalVisible',
    ]),

    toggleOpen() {
      this.navbarOpen = !this.navbarOpen
    },

    openNavbar() {
      this.navbarOpen = true
    },

    openDisaster(disasterType) {
      this.openNavbar()
    },
  }
}
</script>

<style lang="scss" scoped>
.nav-container {
  top: 0;
  bottom: 0;
  position: fixed;
  z-index: 1000;
  background: #0F2F80;
  transition: width 0.1s ease 0s;

  @media print {
    display: none !important;
  }
}

.nav-closed {
  width: 61px;
}

.nav-open {
  width: 212px;
}

.nav-wrapper {
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 0 1em;
  overflow-y: auto;
}

.content {
  padding-top: 25px;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: left;
  padding-bottom: 25px;
}

.footer-wrapper {
  display: flex;
}

.logo-container {
  display: flex;
  align-items: center;
  margin-bottom: 1em;
  cursor: pointer;
}

.nav-title {
  font-size: 20px;
  margin: 0 0 0 0.5em;
}

.b {
  font-weight: bold;
}

.disaster-icons-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.disaster-button {
  margin: 1em 0;
}

.disaster-selection-container {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.subtitle {
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 500;
}

.justify-center {
  justify-content: center;
}

.contact-info {
  display: flex;
  align-items: center;
  cursor: pointer;

  a {
    margin-left: 10px;
    color: white;
    text-decoration: none;
    font-size: 14px;
  }
}
</style>
