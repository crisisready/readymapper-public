<template>
<div v-if="aboutModalVisible" class="report-modal-wrapper">
  <div class="report-modal-container">
    <div class="report-modal">
      <div style="float: right;"><button @click.prevent="setAboutModalVisible(false)"><img src="img/close-icon.svg" /></button></div>
      <h2 class="title">About us</h2>
      <div>
        <div v-for="p in compiledParagraphs" :key="p" v-html="p" />
      </div>

      <h3>Get in touch</h3>
      <p>Contact us at <a href="mailto:info@crisisready.io">info@crisisready.io</a>.</p>
      <Logos />
    </div>
  </div>
</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import {marked} from 'marked'

import Logos from './Logos'

export default {
  name: 'AboutModal',

  components: {
    Logos,
  },

  computed: {
    ...mapState([
      'aboutModalVisible',
      'aboutData'
    ]),
    ...mapGetters([
    ]),
    compiledParagraphs: function() {
      if (!this.aboutData?.length) { return }
      return this.aboutData.map(d => marked(d?.paragraph))
    },
  },

  data() {
    return {
    }
  },

  watch: {
    aboutModalVisible() {
    }
  },

  props: {
  },

  methods: {
    ...mapMutations([
      'setAboutModalVisible',
    ]),
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
  background: rgba(15, 47, 128, 0.3);
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
  max-height: 80vh;
  overflow-y: auto;
  background: #F9FCFE;
  box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
  padding: 23px 25px;
  border-radius: 6px;
  text-align: left;

  .title {
    margin-top: 0;
    padding-bottom: 0;
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
