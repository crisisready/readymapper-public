<template>
  <table class="summary-table">
    <thead>
      <th v-for="col in columnNames" :key="col">{{col}}</th>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.title" :style="rowStyle(row)">
        <td class="title-row" :style="titleStyle">{{row.title}} {{row.placeType && !disasterConfig?.isInternational === 'counties' ? 'County' : ''}}</td>
        <td class="value" v-for="(value, index) in row.values" :key="index">{{value?.toLocaleString()}}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'ReportTable',

  props: {
    title: String,
    columnNames: Array,
    rows: Array,
    titleStyle: String,
  },

  components: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'regionTypeSelection',
      'disasterConfig',
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
    rowStyle(row) {
      return row.placeType === 'counties' && this.regionTypeSelection !== "counties" ? 'background: #dedede;' : ''
    },
  }
}
</script>

<style lang="scss" scoped>

.summary-table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 16px;

  thead {
    border-bottom: 1px solid #D8D8D8;
    font-size: 13px;
    font-weight: 500;

    th {
      color: #000;
      padding: 0 0.15em 0.25em;
    }

    th:first-child {
      padding-right: 50px;
    }
  }

  tr {
    border-bottom: 1px solid #D8D8D8;
    text-transform: capitalize;

    td {
      color: #878787;
      padding: 0.15em 0.15em 0.25em;
    }

    td:first-child {
      color: #000;
    }
  }

  tr:last-child {
    border-bottom: none;
  }

  .value {
    // width: 30%;
  }

  .title-row {
    max-width: 300px;
  }
}

</style>
