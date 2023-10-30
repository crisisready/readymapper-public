<template>
  <table class="summary-table">
    <thead>
      <th>{{title}}</th>
      <th class="light" v-for="col in columnNames" :key="col">{{col}}</th>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.title">
        <td class="light">{{row.title}}</td>
        <td class="value" v-for="(value, index) in row.values" :key="index">{{value?.toLocaleString()}}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'SummaryTable',

  props: {
    title: String,
    columnNames: Array,
    rows: Array,
  },

  components: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
    ]),
    ...mapGetters([
    ]),
  },

  watch: {
    rows() {
    }
  },

  methods: {
    ...mapMutations([
    ]),
  }
}
</script>

<style lang="scss" scoped>
.summary-table {
  font-size: 0.9em;
  margin-bottom: 4px;
  margin-top: 12px;

  .light {
    color: #878787;
  }

  td, th {
    padding: 0 0.5em 0.5em 0;
    // white-space: nowrap;
    // text-overflow: ellipsis;
    // max-width: 100px;
  }

  thead {
    th:first-child {
      padding-right: 50px;
    }
  }
  .value {
    width: 30%;
  }
}
</style>
