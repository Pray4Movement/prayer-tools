<script setup lang="ts">
// Single-series daily bar chart (SVG) with a hover readout and a table view.
const props = defineProps<{
  points: { day: string, value: number }[]
  // Unit for the readout and table, e.g. "minutes".
  unit: string
  title: string
}>()

const W = 720
const H = 160
const PAD_TOP = 8
const fmtDay = (d: string) => ptFormatDate(d, { month: 'short', day: 'numeric' })

const max = computed(() => Math.max(1, ...props.points.map(p => p.value)))
const niceMax = computed(() => {
  const m = max.value
  const pow = 10 ** Math.floor(Math.log10(m))
  return Math.ceil(m / pow) * pow
})
const slot = computed(() => W / Math.max(1, props.points.length))
const barW = computed(() => Math.max(1, slot.value - 2))
const total = computed(() => props.points.reduce((s, p) => s + p.value, 0))

// Bar path with a rounded top and a square base on the baseline.
function barPath(i: number, value: number): string {
  const h = (value / niceMax.value) * (H - PAD_TOP)
  if (h <= 0) return ''
  const x = i * slot.value + 1
  const w = barW.value
  const r = Math.min(4, w / 2, h)
  const y = H - h
  return `M${x},${H} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${H} Z`
}

const hover = ref<number | null>(null)
const readout = computed(() => {
  const p = hover.value !== null ? props.points[hover.value] : null
  if (p) return `${fmtDay(p.day)}: ${p.value.toLocaleString()} ${props.unit}`
  return `${total.value.toLocaleString()} ${props.unit} in total`
})
</script>

<template>
  <figure class="space-y-2">
    <figcaption class="flex flex-wrap items-baseline justify-between gap-2">
      <span class="font-medium">{{ props.title }}</span>
      <span
        class="text-sm text-(--ui-text-muted) tabular-nums"
        aria-live="polite"
      >{{ readout }}</span>
    </figcaption>
    <div
      v-if="props.points.length"
      class="relative"
    >
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="none"
        class="w-full h-40 overflow-visible"
        role="img"
        :aria-label="`${props.title}: ${readout}`"
        @mouseleave="hover = null"
      >
        <line
          :x1="0"
          :x2="W"
          :y1="PAD_TOP"
          :y2="PAD_TOP"
          class="stroke-(--ui-border)"
          stroke-dasharray="2 4"
          vector-effect="non-scaling-stroke"
        />
        <line
          :x1="0"
          :x2="W"
          :y1="H"
          :y2="H"
          class="stroke-(--ui-border-accented)"
          vector-effect="non-scaling-stroke"
        />
        <g
          v-for="(p, i) in props.points"
          :key="p.day"
        >
          <path
            :d="barPath(i, p.value)"
            class="fill-(--ui-primary)"
            :opacity="hover === null || hover === i ? 1 : 0.45"
          />
          <rect
            :x="i * slot"
            y="0"
            :width="slot"
            :height="H"
            fill="transparent"
            @mouseenter="hover = i"
          >
            <title>{{ fmtDay(p.day) }}: {{ p.value.toLocaleString() }} {{ props.unit }}</title>
          </rect>
        </g>
      </svg>
      <span class="absolute -top-1 start-0 text-xs text-(--ui-text-muted) tabular-nums">{{ niceMax.toLocaleString() }}</span>
    </div>
    <p
      v-else
      class="py-10 text-center text-sm text-(--ui-text-muted)"
    >
      No activity yet.
    </p>
    <div
      v-if="props.points.length"
      class="flex justify-between text-xs text-(--ui-text-muted)"
    >
      <span>{{ fmtDay(props.points[0]!.day) }}</span>
      <span>{{ fmtDay(props.points[props.points.length - 1]!.day) }}</span>
    </div>
    <details
      v-if="props.points.length"
      class="text-sm"
    >
      <summary class="cursor-pointer text-(--ui-text-muted)">
        Show as table
      </summary>
      <table class="mt-2 w-full max-w-sm text-sm">
        <thead>
          <tr class="text-(--ui-text-muted)">
            <th class="text-start font-normal">
              Day
            </th>
            <th class="text-end font-normal">
              {{ props.unit }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in props.points"
            :key="p.day"
          >
            <td>{{ fmtDay(p.day) }}</td>
            <td class="text-end tabular-nums">
              {{ p.value.toLocaleString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </details>
  </figure>
</template>
