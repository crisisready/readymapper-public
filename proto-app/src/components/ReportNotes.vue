<template>
  <div v-if="!(!input && reportView)" :class="`chunk-title ${id} ${!input ? 'no-print': ''}`">{{ title }}</div>
  <div id="editor">
    <textarea v-if="!reportView" class="no-print" placeholder="Edit this field to add notes" :value="input" @input="update"></textarea>
    <div class="no-print" v-if="!input && !reportView"><p class="light-gray">Your notes will show up here</p></div>
    <div v-html="compiledMarkdown" />
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import _ from 'underscore'
import {marked} from 'marked'

export default {
  name: 'ReportNotes',

  props: {
    id: String,
    title: {
      type: String,
      default: 'Notes',
    }
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'reportNotes'
    ]),
    compiledMarkdown: function() {
      if (!this.input) { return }
      return marked(this.input)
    },
    input() {
      return this.reportNotes[this.id]
    },
    reportView() {
      return this.$route.query?.reportSaved
    },
  },

  methods: {
    ...mapMutations([
      'setReportNotes'
    ]),
    update: _.debounce(function(e) {
      this.setReportNotes({
        id: this.id,
        mdNotes: e.target.value,
      })
    }, 50)
  },

  watch: {
    reportNotes() {
      this.input = this.reportNotes[this.id]
    }
  }
}
</script>

<style lang="css" scoped>
#editor {
  margin: 0;
  height: 100%;
  color: #333;
}

textarea,
#editor div {
  display: inline-block;
  width: 49%;
  height: 100%;
  vertical-align: top;
  box-sizing: border-box;
  padding: 0 20px;
}

#editor {
  margin-top: 0.5em;
}

.light-gray {
  color: #909090;
}

textarea {
  border: none;
  border-right: 1px solid #ccc;
  resize: none;
  outline: none;
  background-color: #f6f6f6;
  font-size: 14px;
  font-family: monospace;
  padding: 20px;
  min-height: 150px;
}

@media print {
  .no-print {
    display: none !important;
  }
  #editor div {
    width: 100% !important;
    padding: 0 !important;
  }
}
</style>
