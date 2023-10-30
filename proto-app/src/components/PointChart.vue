<template>
  <div class="line-chart" :style="{ 'margin-left': -xPadding + 'px' }">
    <svg
      :width="width + xPadding * 2"
      :height="height"
      v-if="timeseries"
      :class="{ dragging }"
      @mouseenter="plotHovered = true"
      @mouseleave="plotHovered = false"
      @mousedown.prevent="startDragging"
      @mousemove.prevent="handleMouseMove"
      @mouseup="stopDragging"
      @touchmove="handleTouchMove"
      @touchstart="startDragging"
    >
      <defs v-if="gradientStops">
        <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
          <stop v-for="(stop, index) in gradientStops" :key="index"
            :offset="stop.offset"
            :stop-color="stop.stopColor"
            :stop-opacity="stop.stopOpacity" />
        </linearGradient>
      </defs>

      <rect
        :x="0"
        :y="0"
        :height="height - yPadding * 2"
        :width="width"
        class="bg"
      />

      <g class="ticks" v-for="t in tickLabels" :key="t.valueOf()">
        <text class="dates" :x="xScale(t)" :y="height" :dy="-2" :dx="-6">
          {{ t.format("D") }}
        </text>
      </g>

      <g>
        <line class="tick-line" v-for="t in tickLabels" :key="t.valueOf()"
              :x1="xScale(t)" :x2="xScale(t)" :y1="0" :y2="height - yPadding * 2 - 2" />
      </g>

      <path v-if="gradientStops" id="area" :d="area" :style="`fill: url(#${gradientId})`" />

      <line
        id="current"
        :x1="xScale(currentMoment)"
        :x2="xScale(currentMoment)"
        :y1="0"
        :y2="height - yPadding * 2 - 2"
      />

      <line
        v-if="displayZeroLine"
        id="zero-line"
        :x1="xScale(minDate)"
        :x2="xScale(maxDate)"
        :y1="yScale(0)"
        :y2="yScale(0)"
      />

      <path id="line" :d="line" :style="'stroke:' + lineColor"/>
      <g
        :key="'clickableDate' + clickableDate"
        v-for="clickableDate in clickableDates"
        :transform="translateDate(clickableDate)"
      >
        <circle
          :r="6"
          class="clickableDate"
          :style="'fill:' + (pointColor ? pointColor(y(clickableDate)) : lineColor)"
        />
        <circle
          :r="2.5"
          class="clicktarget"
          @mouseenter="hovered = clickableDate"
          @mouseleave="hovered = false"
          @mousedown.stop="onDateChange(clickableDate)"
        />
      </g>

      <g class="yTick" :class="{ visible: plotHovered }" :key="'yTick' + tick.value" v-for="tick in yTicks" :transform="translateY(tick.value)">
        <text style="font-size: 11px;" x="4" dominant-baseline="middle">{{ tick.label }}</text>
      </g>

    </svg>

  </div>
</template>

<script>
import * as d3 from "d3"
import dayjs from "dayjs"
import advancedFormat from "dayjs/plugin/advancedFormat"
import customParseFormat from "dayjs/plugin/customParseFormat"

dayjs.extend(advancedFormat)
dayjs.extend(customParseFormat)

export default {
  name: "LineChart",
  props: {
    // v: Object,
    width: Number,
    height: Number,
    data: Object,
    yPadding: Number,
    xPadding: Number,
    dateFormat: String,
    numTicks: Number,
    color: String,
    pointColor: Function,
    pointSize: Number,
    yMin: Number,
    yMax: Number,
    yTicks: Array,
    displayZeroLine: Boolean,
    customMinDate: Date,
    customMaxDate: Date,
    customCurve: Function,
    gradientStops: Array,
    onDateChange: Function,
  },

  data() {
    return {
      dragging: false,
      hovered: false,
      plotHovered: false,
      gradientId: Math.floor(Math.random() * 1000)
    };
  },

  methods: {
    handleMouseMove(e) {
      if (!this.dragging) return;
      this.onDateChange(dayjs(this.xScale.invert(e.offsetX)));
    },

    handleTouchMove(e) {
      if (!this.dragging) return;
      const touch = e.targetTouches[0];
      let x = touch.clientX - touch.target.getBoundingClientRect().x;

      const [min, max] = this.xScale.range();
      if (x < min) x = min;
      if (x > max) x = max;
      this.onDateChange(dayjs(this.xScale.invert(x)));
    },

    startDragging(e) {
      this.dragging = true;
      this.onDateChange(dayjs(this.xScale.invert(e.offsetX)));
    },

    stopDragging() {
      this.dragging = false;
    },

    parseDate(d) {
      if (typeof d === 'string') {
        return dayjs(d, this.dateFormat)
      } else {
        return dayjs(d)
      }
    },

    translateDate(date) {
      const x = this.xScale(date);
      const y = this.yScale(this.y(date));
      return `translate(${x}, ${y})`;
    },

    translateY(value) {
      return `translate(0, ${this.yScale(value)})`
    },

    y(date) {
      return this.timeseries[date.format(this.dateFormat)]
    }
  },

  computed: {
    date() {
      return this.$store.state.selectedDateTime
    },

    timeseries() {
      if (!this.data) return null
      return this.data
    },

    lineColor() {
      return this.color
    },

    times() {
      return Object.keys(this.timeseries).sort();
    },

    // timeseriesDateField() {
    //   return this.v.timeseriesDateField;
    // },

    currentMoment() {
      return this.parseDate(this.date);
    },

    min() {
      let ts = this.timeseries;
      return d3.min(Object.values(ts).filter((v) => !isNaN(v)));
    },

    max() {
      let ts = this.timeseries;
      return d3.max(Object.values(ts).filter((v) => !isNaN(v)));
    },

    minDate() {
      return this.customMinDate ? this.parseDate(this.customMinDate) : this.parseDate(this.times[0]);
    },

    maxDate() {
      return this.customMaxDate ? this.parseDate(this.customMaxDate) : this.parseDate(this.times.slice(-1)[0]);
    },

    dates() {
      return this.times
        .map(t => this.parseDate(t))
    },

    tickLabels() {
      if (this.numTicks) {
        let min = this.minDate.toDate()
        let max = this.maxDate.toDate()
        return d3.range(min, max, (max - min) / this.numTicks)
          .map(d => this.parseDate(d))
      } else {
        // return this.dates
        const days = [...new Set(this.dates.map(d => dayjs(d).format('YYYY-MM-DD')))]
          .map(d => dayjs(d))
        return days
      }
    },

    clickableDates() {
      let dates = this.dates;
      return dates
        .filter(d => !isNaN(this.timeseries[d.format(this.dateFormat)]));
    },

    xScale() {
      let { minDate, maxDate, width, xPadding } = this;
      const scale = d3
        .scaleLinear()
        .domain([minDate, maxDate])
        .range([2 + xPadding, width - 2 + xPadding])
        .clamp(true)
      return scale;
    },

    yScale() {
      let { min, max, height, yPadding } = this;

      const scale = d3
        .scaleLinear()
        .domain([this.yMin !== undefined ? this.yMin : min, this.yMax !== undefined ? this.yMax : max])
        .range([height - yPadding * 2, 4])
        .clamp(true);
      return scale;
    },

    line() {
      let timeseries = this.timeseries;
      let line = d3
        .line()
        .x(d => this.xScale(this.parseDate(d)))
        .y(d => this.yScale(timeseries[d]));

      if (this.customCurve) {
        line.curve(this.customCurve)
      }

      const validDates = Object.keys(timeseries)
        .sort()
        .filter((k) => !isNaN(timeseries[k]));

      return line(validDates);
    },

    area() {
      let { min, max, height, yPadding } = this;
      let timeseries = this.timeseries;
      let area = d3
        .area()
        .x(d => this.xScale(this.parseDate(d)))
        .y1(d => this.yScale(timeseries[d]))
        .y0(height - yPadding * 2)


      if (this.customCurve) {
        area.curve(this.customCurve)
      }

      const validDates = Object.keys(timeseries)
        .sort()
        .filter((k) => !isNaN(timeseries[k]));

      return area(validDates);
    }

  },
};
</script>

<style scoped lang="scss">
.line-chart {
  margin-bottom: 0.25em;
}

svg {
  margin-bottom: 0.25em;

  line, path {
    pointer-events: none;
  }

  &.dragging {
    g {
      pointer-events: none;
    }
  }
}

path {
  fill: none;
  stroke-width: 1px;
}

#current {
  stroke: #0F2F80;
  stroke-width: 2px;
}

#zero-line {
  stroke: #adadad;
  stroke-width: 1px;
}

.clickableDate {
  stroke-width: 1px;
  fill: white;
}

.clicktarget {
  fill: rgba(0, 0, 0, 0);
  stroke: rgba(0, 0, 0, 0);
  stroke-width: 10px;
  cursor: pointer;
}

.navigation {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  padding-left: 1em;
  padding-right: 1em;

  .left,
  .right {
    width: 16px;
    height: 16px;
    cursor: pointer;

    img {
      height: 100%;
    }
  }
}

line.tick-line {
  stroke: #D8D8D8;
  stroke-width: 1px;
  stroke-dasharray: 2px;
}

text.dates {
  font-size: 11px;
  fill: #878787;
  text-transform: uppercase;
  font-weight: medium;
  user-select: none;
}

.bg {
  fill: none;
}

.yTick {
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  user-select: none;

  &.visible {
    opacity: 1;
  }
}
</style>
