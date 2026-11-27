<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, formatNumber } from '../../i18n/format'
import { daysBetween } from '../peso/weight'
import type { TrendPoint } from './trend'

interface Props {
  points: TrendPoint[]
  locale: string
  targetKg?: number
  nextMilestoneKg?: number
}

const props = defineProps<Props>()
const { t } = useI18n()

const height = 200
const left = 38
const right = 12
const top = 16
const bottom = 28
const plotHeight = height - top - bottom

/** RF-08: mantém pelo menos 10 px por ponto; em telas estreitas o gráfico rola. */
const width = computed(() => Math.max(312, 32 + (props.points.length - 1) * 10))
const plotWidth = computed(() => width.value - left - right)

const bounds = computed(() => {
  const values = props.points.flatMap((point) => [point.weightKg, point.average])
  if (props.targetKg !== undefined) values.push(props.targetKg)
  if (props.nextMilestoneKg !== undefined) values.push(props.nextMilestoneKg)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0
    max = 1
  }
  if (max - min < 1) {
    min -= 0.5
    max += 0.5
  }
  const padding = (max - min) * 0.08
  return { min: min - padding, max: max + padding }
})

function scaleY(value: number): number {
  const { min, max } = bounds.value
  return top + ((max - value) / (max - min)) * plotHeight
}

function scaleX(index: number): number {
  if (props.points.length === 1) return left + plotWidth.value / 2
  return left + (index * plotWidth.value) / (props.points.length - 1)
}

const coordinates = computed(() =>
  props.points.map((point, index) => ({
    ...point,
    x: scaleX(index),
    y: scaleY(point.weightKg),
    averageY: scaleY(point.average),
  })),
)

const averageLine = computed(() =>
  coordinates.value.map((point) => `${point.x},${point.averageY}`).join(' '),
)

const averageArea = computed(() => {
  const items = coordinates.value
  if (items.length === 0) return ''
  const first = items[0]
  const last = items.at(-1)
  if (first === undefined || last === undefined) return ''
  return `M ${first.x},${top + plotHeight} L ${averageLine.value.replaceAll(' ', ' L ')} L ${last.x},${top + plotHeight} Z`
})

const yTicks = computed(() => {
  const { min, max } = bounds.value
  return [max, (min + max) / 2, min].map((value) => ({
    value,
    y: scaleY(value),
    label: formatNumber(value, props.locale, 'decimal'),
  }))
})

const dateStyle = computed<'short' | 'monthYear'>(() => {
  const first = props.points[0]
  const last = props.points.at(-1)
  if (first === undefined || last === undefined) return 'short'
  return daysBetween(first.date, last.date) > 90 ? 'monthYear' : 'short'
})

const xTicks = computed(() => {
  const count = props.points.length
  if (count === 0) return []
  // Duas datas nas extremidades: qualquer rótulo central se sobrepõe em 360 px.
  const indexes = [...new Set([0, count - 1])]
  return indexes.map((index) => {
    const point = props.points[index]
    return {
      x: scaleX(index),
      label: point === undefined ? '' : formatDate(point.date, props.locale, dateStyle.value),
    }
  })
})

const targetY = computed(() => (props.targetKg === undefined ? null : scaleY(props.targetKg)))
const milestoneY = computed(() =>
  props.nextMilestoneKg === undefined ? null : scaleY(props.nextMilestoneKg),
)
const baseline = top + plotHeight
</script>

<template>
  <div class="trend-scroll" data-testid="trend-chart-scroll">
    <svg
      class="trend-svg"
      :viewBox="`0 0 ${width} ${height}`"
      :style="{ width: `${width}px`, height: `${height}px` }"
      role="img"
      :aria-label="t('chart.aria', { count: points.length })"
      data-testid="trend-chart"
    >
      <line
        v-for="tick in yTicks"
        :key="`grid-${tick.y}`"
        :x1="left"
        :x2="width - right"
        :y1="tick.y"
        :y2="tick.y"
        stroke="#E5E7EB"
        stroke-width="1"
      />
      <text
        v-for="tick in yTicks"
        :key="`ylabel-${tick.y}`"
        :x="left - 6"
        :y="tick.y + 4"
        class="trend-tick"
        text-anchor="end"
      >
        {{ tick.label }}
      </text>
      <path :d="averageArea" fill="#22C55E" opacity="0.1" />
      <polyline
        :points="averageLine"
        fill="none"
        stroke="#15803D"
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
        data-testid="trend-average-line"
      />
      <g v-if="milestoneY !== null">
        <line
          :x1="left"
          :x2="width - right"
          :y1="milestoneY"
          :y2="milestoneY"
          stroke="#6B7280"
          stroke-width="1"
          stroke-dasharray="5 4"
        />
        <text :x="left + 4" :y="milestoneY - 4" class="trend-reference trend-reference-next">
          {{ t('chart.next') }}
        </text>
      </g>
      <g v-if="targetY !== null">
        <line
          :x1="left"
          :x2="width - right"
          :y1="targetY"
          :y2="targetY"
          stroke="#15803D"
          stroke-width="1"
          stroke-dasharray="5 4"
        />
        <text :x="width - right - 4" :y="targetY - 4" text-anchor="end" class="trend-reference">
          {{ t('chart.target') }}
        </text>
      </g>
      <circle
        v-for="point in coordinates"
        :key="point.date"
        :cx="point.x"
        :cy="point.y"
        r="2.8"
        fill="#9CA3AF"
        data-testid="trend-point"
      >
        <title>
          {{
            `${formatDate(point.date, locale)} · ${formatNumber(point.weightKg, locale, 'weight')}`
          }}
        </title>
      </circle>
      <text
        v-for="tick in xTicks"
        :key="`xlabel-${tick.x}`"
        :x="tick.x"
        :y="baseline + 18"
        class="trend-tick"
        :text-anchor="tick.x < left + 16 ? 'start' : tick.x > width - right - 16 ? 'end' : 'middle'"
      >
        {{ tick.label }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.trend-scroll {
  overflow-x: auto;
  width: 100%;
}

.trend-svg {
  display: block;
}

.trend-tick {
  fill: #6b7280;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 11px;
}

.trend-reference {
  fill: #15803d;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 11px;
}

.trend-reference-next {
  fill: #6b7280;
}

@media (prefers-reduced-motion: reduce) {
  .trend-scroll {
    scroll-behavior: auto;
  }
}
</style>
